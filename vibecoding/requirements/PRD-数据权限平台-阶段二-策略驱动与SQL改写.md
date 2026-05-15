# PRD：数据权限平台阶段二 — 策略驱动与 SQL 改写

## 1. 背景与目标

### 1.1 现状痛点

阶段一完成后，权限管理已具备基础 RBAC + 审批 + 审计能力，但数据权限控制仍停留在**"校验层"**：

- `authCheck` 只能回答"用户有没有权限查这张表"，**不能阻止用户看到不该看的数据**
- `authFilterSql` 只做了表级校验，**没有真正改写 SQL** 注入行过滤条件或替换脱敏列
- 权限配置粒度只到表级，**无法精确到列和行**

### 1.2 目标

引入 **Policy（策略）模型**，实现：

1. **策略驱动**：以策略为一等公民，角色/用户只是策略的赋权对象
2. **行级过滤（Row Filter）**：根据策略条件自动注入 WHERE 子句
3. **列级脱敏（Column Masking）**：根据策略自动替换 SELECT 列表达式
4. **SQL 改写引擎**：在查询执行前解析 SQL → 匹配策略 → 生成改写后的安全 SQL
5. **审计增强**：记录策略命中情况，支持权限使用分析

---

## 2. 竞品参考

### 2.1 Apache Ranger

- **Policy = 资源范围 + 操作 + 授权对象 + 条件**
- **Row Filter**：策略中配置 Filter 表达式（如 `region = '华东'`），查询时注入 WHERE
- **Column Masking**：策略中配置 Mask Type（Redact / Partial mask / Hash / Nullify / Custom）
- **插件架构**：各计算引擎（Hive/Spark/Presto）集成 Ranger 插件，在执行计划阶段注入过滤/脱敏

### 2.2 网易 Ranger 实践

- **Spark 动态脱敏**：在 analyzed 执行计划阶段添加 UDF，实现无感知脱敏
- **权限检索模型**：基于 change log 的异步只读视图，30 秒同步，保证查询性能
- **权限生命周期**：精细化设置权限有效期，自动过期回收

### 2.3 阿里云 DataWorks

- **数据保护伞**：敏感数据识别 + 自动脱敏规则推荐
- **行列级权限**：数据表授权时可设置字段可见性和行过滤条件

---

## 3. 总体架构设计

### 3.1 架构演进

```
阶段一（当前）：
    用户 → 角色 → 权限项（resourceType + resourceId + action）
                        ↓
                    校验层（check / filterSql）

阶段二（目标）：
    用户 → 角色/直接授权
            ↓
    策略（Policy）：资源范围 + 操作 + 条件（行过滤/列脱敏/有效期）
            ↓
    SQL 改写引擎：解析 → 匹配策略 → 注入 WHERE / 替换列表达式
            ↓
    安全 SQL → 执行引擎
```

### 3.2 核心组件

```
┌─────────────────────────────────────────────────────────────┐
│                     SQL 改写引擎（SQLRewriteEngine）           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ SQL Parser  │→ │ Policy Match│→ │ SQL Generator       │  │
│  │ (JSqlParser)│  │ (策略匹配)   │  │ (生成改写后 SQL)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↑
                              │ 拉取策略
┌─────────────────────────────────────────────────────────────┐
│                     策略管理中心（Policy Admin）               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Policy CRUD │  │ 资源范围管理 │  │ 条件表达式管理       │  │
│  │ (前端页面)   │  │ (库/表/列)  │  │ (行过滤/列脱敏)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↑
                              │ 存储/查询
┌─────────────────────────────────────────────────────────────┐
│                     策略存储层                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ auth_policy │  │auth_policy_ │  │ auth_policy_        │  │
│  │ (策略主表)   │  │  role (角色 │  │  condition (条件)   │  │
│  │              │  │  关联)      │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 数据库设计

### 4.1 策略主表 `auth_policy`

```sql
CREATE TABLE IF NOT EXISTS auth_policy (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    policy_name VARCHAR(200) NOT NULL COMMENT '策略名称',
    policy_type VARCHAR(50) NOT NULL COMMENT '策略类型: ACCESS(访问策略)/MASKING(脱敏策略)/ROW_FILTER(行过滤策略)',
    resource_type VARCHAR(50) NOT NULL COMMENT '资源类型: TABLE/COLUMN',
    resource_pattern VARCHAR(500) NOT NULL COMMENT '资源范围模式(支持通配符): db.table / db.table.column / db.table.*',
    action VARCHAR(50) NOT NULL COMMENT '操作: SELECT/INSERT/UPDATE/DELETE/ALL',
    priority INT DEFAULT 0 COMMENT '优先级(数字越大优先级越高)',
    status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
    description VARCHAR(500) COMMENT '策略描述',
    created_by VARCHAR(100) COMMENT '创建人',
    updated_by VARCHAR(100) COMMENT '更新人',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted_at DATETIME COMMENT '删除时间（逻辑删除）',
    INDEX idx_resource (resource_type, resource_pattern),
    INDEX idx_type_status (policy_type, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='策略主表';
```

### 4.2 策略-角色关联表 `auth_policy_role`

```sql
CREATE TABLE IF NOT EXISTS auth_policy_role (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    policy_id BIGINT NOT NULL COMMENT '策略ID',
    role_id BIGINT NOT NULL COMMENT '角色ID',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE KEY uk_policy_role (policy_id, role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='策略-角色关联表';
```

### 4.3 策略条件表 `auth_policy_condition`

```sql
CREATE TABLE IF NOT EXISTS auth_policy_condition (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    policy_id BIGINT NOT NULL COMMENT '策略ID',
    condition_type VARCHAR(50) NOT NULL COMMENT '条件类型: ROW_FILTER(行过滤)/COLUMN_MASK(列脱敏)',
    column_name VARCHAR(200) COMMENT '列名(列脱敏时必填)',
    mask_type VARCHAR(50) COMMENT '脱敏类型: REDACT/PARTIAL_LAST4/PARTIAL_FIRST4/HASH/NULLIFY/MASK_YEAR/CUSTOM',
    mask_expression VARCHAR(500) COMMENT '脱敏表达式(CUSTOM时使用)',
    filter_expression VARCHAR(2000) COMMENT '过滤表达式(行过滤时使用): WHERE 子句条件',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_policy (policy_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='策略条件表';
```

---

## 5. 核心模块设计

### 5.1 策略管理模块（后端）

#### 5.1.1 Domain 模型

```java
// AuthPolicy.java
@Data
public class AuthPolicy {
    private String id;
    private String policyName;
    private PolicyType policyType; // ACCESS / MASKING / ROW_FILTER
    private ResourceType resourceType; // TABLE / COLUMN
    private String resourcePattern; // 支持通配符: db.table.*
    private ActionType action;
    private Integer priority;
    private Integer status;
    private String description;
    private List<AuthPolicyCondition> conditions;
    private List<String> roleCodes; // 授权角色编码列表
    
    // 业务方法
    public boolean matches(String resourceId, String action) {
        // 通配符匹配 resourcePattern 与 resourceId
        // 支持 * 通配符
    }
    
    public boolean isApplicableTo(String roleCode) {
        // 检查角色是否在授权列表中
    }
}

// AuthPolicyCondition.java
@Data
public class AuthPolicyCondition {
    private String id;
    private String policyId;
    private ConditionType conditionType; // ROW_FILTER / COLUMN_MASK
    private String columnName; // 列脱敏时
    private MaskType maskType; // REDACT / PARTIAL_LAST4 / HASH / etc.
    private String maskExpression; // CUSTOM 表达式
    private String filterExpression; // 行过滤 WHERE 条件
}
```

#### 5.1.2 API 接口

```yaml
# 策略 CRUD
GET    /api/v1/auth/policies?pageNum=&pageSize=&policyType=&resourceType=
GET    /api/v1/auth/policies/{id}
POST   /api/v1/auth/policies
PUT    /api/v1/auth/policies/{id}
DELETE /api/v1/auth/policies/{id}

# 策略条件管理
GET    /api/v1/auth/policies/{id}/conditions
POST   /api/v1/auth/policies/{id}/conditions
DELETE /api/v1/auth/policies/{id}/conditions/{conditionId}

# SQL 改写（核心接口）
POST   /api/v1/auth/rewrite/sql
Body:
  passport: string
  sql: string
  engine: string  # MySQL / StarRocks / SparkSQL / FlinkSQL
Response:
  permitted: boolean
  originalSql: string
  rewrittenSql: string  # 改写后的安全 SQL
  appliedPolicies: AppliedPolicyDTO[]  # 命中的策略列表
  reason: string
```

### 5.2 SQL 改写引擎（后端核心）

#### 5.2.1 技术选型

- **SQL 解析器**：JSqlParser（Java，支持 MySQL/PostgreSQL/StarRocks 语法）
- **执行流程**：
  1. 解析原始 SQL → AST（抽象语法树）
  2. 提取查询的表和列
  3. 根据用户角色匹配适用的策略
  4. 对 AST 进行改写：
     - **行过滤**：在 SELECT 语句的 WHERE 子句中注入策略条件
     - **列脱敏**：将 SELECT 列表中的列表达式替换为脱敏函数
  5. 将改写后的 AST 转回 SQL 字符串

#### 5.2.2 行过滤示例

```sql
-- 原始 SQL
SELECT user_id, phone, amount FROM orders WHERE dt = '2024-01-01'

-- 用户角色: 业务运营 (只允许查看华东区域)
-- 策略: ROW_FILTER on orders, filter_expression = "region = '华东'"

-- 改写后 SQL
SELECT user_id, phone, amount FROM orders 
WHERE dt = '2024-01-01' AND (region = '华东')
```

#### 5.2.3 列脱敏示例

```sql
-- 原始 SQL
SELECT user_id, phone, email, amount FROM orders

-- 策略 1: MASKING on orders.phone, mask_type = PARTIAL_LAST4
-- 策略 2: MASKING on orders.email, mask_type = REDACT

-- 改写后 SQL
SELECT 
    user_id,
    CONCAT(LEFT(phone, 3), '****', RIGHT(phone, 4)) AS phone,
    'xxxx@xxxx.com' AS email,
    amount 
FROM orders
```

#### 5.2.4 脱敏类型映射

| Mask Type | 说明 | SQL 改写示例（MySQL） |
|-----------|------|----------------------|
| REDACT | 完全屏蔽 | `'***'` |
| PARTIAL_LAST4 | 显示后 4 位 | `CONCAT(LEFT(col, 3), '****', RIGHT(col, 4))` |
| PARTIAL_FIRST4 | 显示前 4 位 | `CONCAT(LEFT(col, 4), '****')` |
| HASH | MD5/SHA 哈希 | `MD5(col)` |
| NULLIFY | 返回 NULL | `NULL` |
| MASK_YEAR | 日期只显示年份 | `DATE_FORMAT(col, '%Y-01-01')` |
| CUSTOM | 自定义表达式 | 用户配置的 UDF/表达式 |

#### 5.2.5 引擎差异处理

不同 SQL 引擎的语法差异：

| 引擎 | 字符串拼接 | 日期函数 | 哈希函数 |
|------|-----------|---------|---------|
| MySQL | `CONCAT(a, b)` | `DATE_FORMAT(dt, '%Y')` | `MD5(col)` |
| StarRocks | `CONCAT(a, b)` | `DATE_FORMAT(dt, '%Y')` | `MD5(col)` |
| PostgreSQL | `a \|\| b` | `TO_CHAR(dt, 'YYYY')` | `MD5(col)` |
| SparkSQL | `CONCAT(a, b)` | `DATE_FORMAT(dt, 'yyyy')` | `MD5(col)` |

SQL 改写引擎需要根据 `engine` 参数选择对应的方言生成器。

### 5.3 前端策略管理页面

#### 5.3.1 新增页面

| 页面 | 路由 | 功能 |
|------|------|------|
| 策略管理列表 | `/auth/policy` | 展示所有策略，支持按类型/资源筛选 |
| 策略新增/编辑 | `/auth/policy/edit/:id?` | 表单：名称、类型、资源范围、操作、优先级、授权角色、条件配置 |
| 策略详情 | `/auth/policy/detail/:id` | 展示策略完整信息、命中统计 |

#### 5.3.2 策略编辑表单

```
基本信息
├── 策略名称 [输入框]
├── 策略类型 [单选: 访问策略 / 行过滤策略 / 脱敏策略]
├── 资源类型 [单选: 数据表 / 列]
├── 资源范围 [输入框，支持通配符: db.table.*]
├── 操作权限 [多选: SELECT / INSERT / UPDATE / DELETE / ALL]
├── 优先级 [数字输入，越大越优先]
├── 授权角色 [Transfer 穿梭框，从角色列表选择]
└── 状态 [开关: 启用/禁用]

条件配置（根据策略类型动态显示）
├── 行过滤策略
│   └── 过滤表达式 [SQL WHERE 条件输入框，如: region = '华东']
└── 脱敏策略
    └── 脱敏规则列表 [动态表单]
        ├── 列名 [下拉选择/输入]
        ├── 脱敏类型 [下拉: REDACT/PARTIAL_LAST4/HASH/NULLIFY/MASK_YEAR/CUSTOM]
        └── 自定义表达式 [输入框，CUSTOM 时显示]
```

---

## 6. 与现有系统的集成

### 6.1 SQL 查询编辑器（sql-editor）

当前 `sql-editor` 调用 `authFilterSql` 做表级校验。阶段二需要：

1. 将 `authFilterSql` 替换为 `auth/rewrite/sql`
2. 执行改写后的 SQL（而非原始 SQL）
3. 在结果面板展示"已应用的策略"提示

### 6.2 数据加工（data-work）

数据加工的 SparkSQL/FlinkSQL 执行同样需要策略保护：

1. 调用 `auth/rewrite/sql?engine=sparksql`
2. 执行改写后的 SQL

### 6.3 智能分析（BI）

BI 的指标 SQL 已通过 `authMetricFilterSql` 校验。阶段二：

1. 在 `MetricBiAnalysisServiceImpl.execute()` 中调用 dataauth 的 SQL 改写服务
2. 对生成的指标 SQL 注入行过滤/列脱敏
3. 将改写后的 SQL 提交给数据网关执行

### 6.4 审计日志增强

当前审计日志只记录操作类型和资源。阶段二需要：

1. 在 `auth/rewrite/sql` 返回的 `appliedPolicies` 中记录命中的策略
2. 审计日志新增 `applied_policy_ids` 字段
3. 支持按策略维度统计查询量

---

## 7. 接口契约

### 7.1 策略 CRUD

```yaml
GET /api/v1/auth/policies:
  Query: pageNum, pageSize, policyType, resourceType, keyword
  Response:
    code: 200
    data:
      list:
        - id: "1"
          policyName: "订单表-华东区域可见"
          policyType: "ROW_FILTER"
          resourceType: "TABLE"
          resourcePattern: "order_db.orders"
          action: "SELECT"
          priority: 100
          status: 1
          roleCodes: ["BUSINESS_OPS", "DATA_ANALYST"]
          conditions:
            - conditionType: "ROW_FILTER"
              filterExpression: "region = '华东'"
      total: 10

POST /api/v1/auth/policies:
  Body:
    policyName: "手机号脱敏"
    policyType: "MASKING"
    resourceType: "COLUMN"
    resourcePattern: "order_db.orders.phone"
    action: "SELECT"
    priority: 50
    status: 1
    roleCodes: ["BUSINESS_OPS"]
    conditions:
      - conditionType: "COLUMN_MASK"
        columnName: "phone"
        maskType: "PARTIAL_LAST4"

PUT /api/v1/auth/policies/{id}:
  Body: (同 POST)

DELETE /api/v1/auth/policies/{id}
```

### 7.2 SQL 改写（核心）

```yaml
POST /api/v1/auth/rewrite/sql:
  Body:
    passport: "zhangsan"
    sql: "SELECT user_id, phone, amount FROM order_db.orders WHERE dt = '2024-01-01'"
    engine: "mysql"
  Response:
    code: 200
    data:
      permitted: true
      originalSql: "SELECT user_id, phone, amount FROM order_db.orders WHERE dt = '2024-01-01'"
      rewrittenSql: "SELECT user_id, CONCAT(LEFT(phone, 3), '****', RIGHT(phone, 4)) AS phone, amount FROM order_db.orders WHERE dt = '2024-01-01' AND (region = '华东')"
      appliedPolicies:
        - policyId: "1"
          policyName: "订单表-华东区域可见"
          policyType: "ROW_FILTER"
        - policyId: "2"
          policyName: "手机号脱敏"
          policyType: "MASKING"
      reason: null
```

---

## 8. 实施计划

### 8.1 任务拆分

| 优先级 | 任务 | 后端工作量 | 前端工作量 |
|--------|------|-----------|-----------|
| P0 | 数据库表创建（Flyway 迁移） | 小 | 无 |
| P0 | Policy Domain 模型 + Repository | 中 | 无 |
| P0 | Policy CRUD API | 中 | 中（策略管理页面） |
| P0 | SQL 解析器集成（JSqlParser） | 中 | 无 |
| P0 | 行过滤 SQL 改写 | 大 | 无 |
| P1 | 列脱敏 SQL 改写 | 大 | 无 |
| P1 | SQL 改写引擎多方言支持 | 中 | 无 |
| P1 | sql-editor 对接改写后的 SQL | 小 | 小 |
| P1 | data-work 对接改写后的 SQL | 小 | 小 |
| P2 | BI 指标 SQL 改写集成 | 中 | 无 |
| P2 | 审计日志策略命中记录 | 小 | 小 |

### 8.2 建议实施顺序

1. **第 1 轮**：数据库迁移 + Policy CRUD API + 前端策略管理页面
2. **第 2 轮**：SQL 解析器 + 行过滤改写 + sql-editor 对接
3. **第 3 轮**：列脱敏改写 + 多方言支持 + data-work 对接
4. **第 4 轮**：BI 集成 + 审计增强 + 回归测试

---

## 9. 风险与注意事项

1. **SQL 解析器限制**：JSqlParser 对某些复杂 SQL（如 CTE、窗口函数）的解析可能不完整。建议：
   - 先支持常见 SELECT 语句
   - 对无法解析的 SQL 回退到"拒绝执行"策略

2. **性能影响**：SQL 改写增加了解析和生成开销。建议：
   - 对策略做缓存（按用户+资源缓存适用的策略列表）
   - 对改写后的 SQL 做缓存（LRU 缓存）

3. **条件表达式安全**：用户输入的 `filterExpression` 必须是纯 WHERE 条件，不能包含恶意 SQL。建议：
   - 前端限制输入格式
   - 后端对表达式做语法校验（只允许列名、常量、比较运算符、AND/OR/IN）
   - 禁止子查询、UNION、DDL 等危险语法

4. **多引擎语法差异**：不同引擎的函数名和语法不同。建议：
   - 抽象一个 `SqlDialect` 接口
   - 每种引擎实现各自的函数映射

---

## 10. 验收标准

- [ ] 策略管理页面可完整增删改查策略（含行过滤和脱敏条件）
- [ ] SQL 改写接口能正确解析 SELECT 语句并注入行过滤条件
- [ ] SQL 改写接口能正确替换列表达式为脱敏函数
- [ ] sql-editor 执行的是改写后的安全 SQL
- [ ] 不同引擎（MySQL/StarRocks/SparkSQL）使用对应方言生成脱敏表达式
- [ ] 审计日志记录命中的策略 ID 列表
- [ ] 无策略命中时，SQL 原样返回（无性能损耗）
