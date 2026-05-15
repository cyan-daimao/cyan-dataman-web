# PRD：数据权限平台迭代方案

## 1. 现状调研

### 1.1 前端现状（cyan-dataman-web）

已上线 6 个页面：

| 页面 | 路由 | 状态 |
|------|------|------|
| 角色管理 | `/auth/role` | ✅ 已对接真实后端 |
| 审批管理 | `/auth/approval` | ✅ 已对接真实后端 |
| 审计日志 | `/auth/audit` | ✅ 已对接真实后端 |
| 用户权限 | `/auth/user` | ⚠️ 全 Mock |
| 指标平台权限 | `/auth/metric` | ⚠️ 全 Mock |
| 我的权限 | `/auth/my` | ⚠️ 全 Mock |

已对接真实后端接口（10 个）：
- `GET /api/v1/auth/roles` — 角色列表
- `POST/PUT/DELETE /api/v1/auth/roles` — 角色增删改
- `GET/POST /api/v1/approval/*` — 审批列表/提交/操作
- `GET /api/v1/audit/logs` — 审计日志
- `POST /api/v1/auth/check` — 权限校验
- `POST /api/v1/auth/filter/sql` — SQL 过滤
- `GET /api/v1/auth/resources` — 资源树
- `POST/GET /api/v1/auth/metric/*` — 指标权限校验/列表/SQL过滤

仍为 Mock 的接口（13 个）：
- 角色成员管理（listRoleMembers / addRoleMembers / removeRoleMember）
- 用户权限（listUserPermissions / getUserPermission / grantUserPermission / revokeUserPermission）
- 指标平台权限配置（listSubjectPermissions / saveSubjectPermission / listMetricPermissions / batchUpdateMetricVisibility / listDimensionPermissions / saveDimensionPermission）
- 我的权限（getMyPermissions）
- 功能权限查询（getUserFunctionPermissions）

### 1.2 后端现状（cyan-dataauth）

已实现的模块：
- **角色管理**：CRUD、角色-权限关联分配
- **审批管理**：提交、分页查询、通过/驳回
- **审计日志**：分页查询（按操作类型/资源类型/时间范围筛选）
- **权限校验**：单资源校验、SQL 表级校验、资源树查询、用户最高密级
- **指标权限校验**：批量校验、指标资源列表、指标 SQL 校验

数据库表（5 张）：
- `auth_role` — 角色
- `auth_permission` — 权限项（统一存储功能/数据/指标权限）
- `auth_role_permission` — 角色-权限关联
- `auth_user_role` — 用户-角色关联
- `auth_approval` — 审批单
- `auth_audit_log` — 审计日志

缺失的后端能力：
- 用户-角色关联的 HTTP API（只有 Mapper，无 Controller/Service 暴露）
- 用户权限聚合查询（角色+直接权限+数据权限+指标权限一站式返回）
- 功能权限树动态构建 API
- 指标平台权限配置管理 API（主题域/指标/维度的可见范围与授权对象）
- 我的权限聚合查询 API
- SQL 真正改写（当前仅做表级校验，未实现行过滤/列脱敏后的 SQL 重写）

---

## 2. 竞品分析

### 2.1 阿里云 DataWorks

- **双权限体系**：RAM Policy（产品级/控制台级）+ RBAC（功能模块级）
- **空间级 vs 全局级**：工作空间内角色与租户级角色分离
- **预设角色 + 自定义角色**：降低配置成本，同时支持精细化
- **与计算引擎映射**：DataWorks RBAC 与 MaxCompute 角色体系天然映射

**可借鉴**：功能权限按模块分层（空间级/全局级），预设角色模板。

### 2.2 Apache Ranger

- **策略驱动（Policy-based）**：以策略为核心，而非以角色为核心
- **细粒度控制**：库 → 表 → 列 → 行四级粒度
- **数据脱敏（Masking）**：Redact、Partial mask、Hash、Nullify、Custom 等策略
- **行级过滤（Row Filter）**：通过 WHERE 条件表达式过滤数据
- **审计与报告**：全面审计日志 + 丰富报告
- **插件架构**：Hive、Spark、Presto 等 17+ 组件集成

**可借鉴**：
1. 引入**策略（Policy）**作为权限配置的一等公民，角色只是策略的赋权对象之一
2. 数据脱敏和行级过滤从"校验"升级为"SQL 改写"，真正在查询层生效
3. 审计日志与权限策略联动，自动记录策略命中情况

### 2.3 Azure Data Catalog

- **元数据权限四维度**：所有权 / 批注权 / 注册权 / 可见性
- **数据资产专家关联**：人与资产直接关联，形成知识网络
- **Data Profile**：自动收集数据统计信息，辅助权限决策

**可借鉴**：元数据权限与数据质量/血缘打通，权限配置时能看到数据敏感度标签。

### 2.4 网易基于 Ranger 的实践

- **权限检索模型**：基于 Ranger change log 的只读视图，30 秒异步同步，保证查询性能
- **权限生命周期**：精细化设置权限有效期，自动过期回收
- **Spark 动态脱敏**：在 analyzed 执行计划阶段注入 UDF，实现无感知脱敏

**可借鉴**：权限查询性能优化（缓存+异步同步），权限生命周期管理。

---

## 3. 改进方案

### 3.1 总体架构演进

```
当前：RBAC 基础版
    用户 → 角色 → 权限项（resourceType + resourceId + action）

目标：RBAC + Policy 混合模型
    用户 → 角色 / 直接授权
         ↓
    策略（Policy）：资源范围 + 操作 + 条件（行过滤/列脱敏/有效期）
         ↓
    权限生效层：校验 / SQL 改写 / 脱敏 UDF 注入
```

### 3.2 分阶段实施计划

#### 阶段一：基础联调（当前迭代）
**目标**：将所有 Mock 接口替换为真实后端调用，权限管理模块基础功能可用。

| 优先级 | 任务 | 后端工作 | 前端工作 |
|--------|------|---------|---------|
| P0 | 角色成员管理 | 新增 `GET/POST/DELETE /api/v1/auth/roles/{id}/members` | 替换 `listRoleMembers` / `addRoleMembers` / `removeRoleMember` 为真实调用 |
| P0 | 用户权限聚合查询 | 新增 `GET /api/v1/auth/users/permissions`（聚合角色+直接权限+数据权限+指标权限） | 替换 `listUserPermissions` 为真实调用 |
| P0 | 用户权限分配 | 新增 `POST /api/v1/auth/users/{passport}/permissions` | 替换 `grantUserPermission` 为真实调用 |
| P0 | 指标平台权限配置 | 新增主题域/指标/维度权限配置的 CRUD API | 替换 `listSubjectPermissions` / `listMetricPermissions` / `listDimensionPermissions` 等 |
| P1 | 我的权限聚合 | 新增 `GET /api/v1/auth/my/permissions` | 替换 `getMyPermissions` 为真实调用 |
| P1 | 功能权限树 | 新增 `GET /api/v1/auth/function-permissions/tree` | 替换前端硬编码的 `FUNCTION_PERMISSION_TREE` |

#### 阶段二：策略驱动 + SQL 改写（下一迭代）
**目标**：引入 Policy 模型，实现真正的行级过滤和列脱敏。

| 任务 | 说明 |
|------|------|
| Policy 模型设计 | 新增 `auth_policy` 表：资源范围（通配符支持）、操作、授权对象（用户/角色/部门）、条件表达式 |
| SQL 改写引擎 | `filterSql` 从简单校验升级为：解析 SQL AST → 匹配 Policy → 注入 WHERE 条件 / 替换列表达式 |
| 数据脱敏 | 支持 Masking 策略：手机号掩码、身份证掩码、Hash、Nullify、自定义 UDF |
| 行级过滤 | 支持 Row Filter 策略：通过 Policy 条件表达式注入 WHERE 子句 |

#### 阶段三：权限生命周期 + 全景图（未来迭代）
**目标**：权限治理闭环。

| 任务 | 说明 |
|------|------|
| 权限有效期 | 支持设置权限过期时间，自动回收 |
| 权限全景图 | 权限总览页面：按人/按角色/按资源三个维度展示权限分布 |
| 审批流程配置 | 支持自定义审批节点、审批人、条件分支 |
| 敏感数据自动识别 | 对接数据质量/血缘，自动推荐脱敏策略 |

---

## 4. 阶段一详细设计（本期执行）

### 4.1 新增后端接口

#### 4.1.1 角色成员管理

```
GET    /api/v1/auth/roles/{roleId}/members     → RoleMemberDTO[]
POST   /api/v1/auth/roles/{roleId}/members     → { passports: string[] }
DELETE /api/v1/auth/roles/{roleId}/members/{passport}
```

**数据库**：复用 `auth_user_role` 表。

**实现要点**：
- 成员查询需要从员工服务获取用户信息（cnName, deptName, jobTitle），当前前端 MOCK 了这些字段
- 方案 A：dataauth 服务只存 passport，前端通过 EmployeeApi 批量查询用户信息
- 方案 B：dataauth 服务内缓存员工信息（推荐 B，减少前端复杂度）

#### 4.1.2 用户权限聚合查询

```
GET /api/v1/auth/users/permissions?pageNum=1&pageSize=20&keyword=
```

**返回**：`PageResult<UserPermissionDTO>`

**聚合逻辑**：
1. 查询所有有角色的用户（去重）+ 有直接权限的用户（去重）
2. 对每个用户：
   - 角色列表：通过 `auth_user_role` + `auth_role` 关联
   - 直接权限：通过 `auth_permission` 查询该用户的直接授权（本期暂不支持直接授权，可先返回空）
   - 数据权限：`resourceType` 为 DATASOURCE/DB/TABLE/COLUMN/ROW 的权限
   - 指标权限：`resourceType` 为 SUBJECT/METRIC/DIMENSION/MODIFIER 的权限

**注意**：当前 `auth_permission` 表没有 `passport` 字段，权限是通过 `role → permission` 间接关联的。要实现"用户直接权限"，需要新增 `auth_user_permission` 表，或本期先只支持角色继承的权限。

**建议本期实现**：
- `listUserPermissions`：查询所有有角色的用户，聚合其角色和通过角色继承的权限
- 直接权限留空，待二期支持

#### 4.1.3 用户权限分配

```
POST /api/v1/auth/users/{passport}/permissions
Body: { permissions: [{ resourceType, resourceId, action }] }
```

**实现**：
- 本期暂不支持直接给用户分配权限（需要 `auth_user_permission` 表）
- 可以改为给用户分配角色的接口：
```
POST /api/v1/auth/users/{passport}/roles     → { roleIds: string[] }
```
- 前端"分配权限"按钮可以先改为"分配角色"，用 Transfer 组件选择角色

#### 4.1.4 指标平台权限配置

**主题域权限**：
```
GET  /api/v1/auth/metric/subject-permissions
POST /api/v1/auth/metric/subject-permissions
Body: { subjectCode, actions[], targets[{targetType, targetId}] }
```

**指标权限**：
```
GET    /api/v1/auth/metric/metric-permissions?pageNum=&pageSize=&subjectCode=
POST   /api/v1/auth/metric/metric-permissions/batch-update
Body: { metricIds[], visibility, allowedRoles[] }
```

**维度权限**：
```
GET  /api/v1/auth/metric/dimension-permissions
POST /api/v1/auth/metric/dimension-permissions
Body: { dimensionCode, actions[], allowValuesQuery, targets[] }
```

**实现说明**：
- 当前 `auth_permission` 表存储的是底层权限项，不适合直接存储"指标可见范围"这种业务配置
- 建议新增业务配置表：
  - `auth_metric_visibility`（metric_code, visibility, allowed_roles）
  - `auth_dimension_permission`（dimension_code, allow_values_query, actions）
- 或者复用 `auth_permission` + `auth_role_permission`，将"指标可见范围"转换为底层权限项

**推荐方案**：复用 `auth_permission` 表，将指标/维度的可见性配置转换为权限项：
- `resourceType=METRIC, resourceId=GMV, action=VIEW` → 授权给指定角色
- `resourceType=DIMENSION, resourceId=REGION, action=VALUES` → 授权给指定角色
- 前端配置页面负责将业务操作（设置可见范围、开关维度值查询）转换为底层权限项的增删改

#### 4.1.5 我的权限聚合

```
GET /api/v1/auth/my/permissions
Headers: 从 token 解析当前用户 passport
```

**返回**：`MyPermissionDTO`

**聚合逻辑**：
1. 功能权限：查询用户的所有角色 → 角色的所有权限 → 按模块分组
2. 数据权限：查询 TABLE/DB/DATASOURCE 类型权限 → 按数据源→数据库→表层级聚合
3. 指标权限：查询 METRIC/DIMENSION 类型权限 → 按主题域分组
4. 审批进度：查询 `auth_approval` 中 applicantPassport=当前用户且 status=PENDING 的记录

#### 4.1.6 功能权限树

```
GET /api/v1/auth/function-permissions/tree
```

**返回**：`FunctionPermissionNode[]`

**实现**：后端返回树形结构，前端不再硬编码。树节点数据可存储在 `auth_permission` 表中（resourceType=MENU/BUTTON）。

---

### 4.2 前端调整

| 页面 | 调整内容 |
|------|---------|
| 角色管理 | 成员管理：Transfer 数据源从 `MOCK_ALL_USERS` 改为调用员工服务 `EmployeeApi` 获取用户列表 |
| 用户权限 | 1. 列表接口替换为真实调用<br>2. "分配权限"改为"分配角色"（Transfer 选择角色）<br>3. 查看权限抽屉展示真实聚合数据 |
| 指标平台权限 | 1. 主题域树从 `MOCK_SUBJECT_TREE` 改为调用 `MetadataSubjectAPI` 获取真实主题域<br>2. 指标/维度权限接口替换为真实调用<br>3. 批量修改可见范围时角色选择从硬编码改为调用 `listRoles` |
| 我的权限 | 接口替换为真实调用，展示真实聚合数据 |
| 审批管理 | 增加"我发起的"Tab |

---

## 5. 接口契约（阶段一）

### 5.1 角色成员管理

```yaml
GET /api/v1/auth/roles/{roleId}/members:
  Response:
    code: 200
    data:
      - id: "u1"
        passport: "zhangsan"
        cnName: "张三"
        deptName: "数据平台"
        jobTitle: "数据分析师"

POST /api/v1/auth/roles/{roleId}/members:
  Body:
    passports: ["zhangsan", "lisi"]
  Response:
    code: 200

DELETE /api/v1/auth/roles/{roleId}/members/{passport}:
  Response:
    code: 200
```

### 5.2 用户权限

```yaml
GET /api/v1/auth/users/permissions:
  Query:
    pageNum: 1
    pageSize: 20
    keyword: "张三"  # 按姓名/账号模糊搜索
  Response:
    code: 200
    data:
      list:
        - passport: "zhangsan"
          cnName: "张三"
          roles:
            - id: "3"
              name: "数据分析师"
              code: "DATA_ANALYST"
          directPermissions: []  # 本期留空
          dataPermissions:
            - resourceType: "TABLE"
              resourceId: "iceberg.order_db.orders"
              action: "SELECT"
          metricPermissions:
            - permissionType: "METRIC"
              resourceId: "GMV"
              actions: ["VIEW", "USE"]
      total: 1
      pageNum: 1
      pageSize: 20

POST /api/v1/auth/users/{passport}/roles:
  Body:
    roleIds: ["3", "5"]
  Response:
    code: 200
```

### 5.3 指标平台权限配置

```yaml
GET /api/v1/auth/metric/subject-permissions:
  Response:
    code: 200
    data:
      - subjectCode: "TRADE"
        subjectName: "交易"
        actions: ["VIEW", "USE"]
        targets:
          - targetType: "ROLE"
            targetId: "DATA_ANALYST"
            targetName: "数据分析师"

POST /api/v1/auth/metric/subject-permissions:
  Body:
    subjectCode: "TRADE"
    actions: ["VIEW", "USE"]
    targets:
      - targetType: "ROLE"
        targetId: "DATA_ANALYST"

GET /api/v1/auth/metric/metric-permissions:
  Query:
    pageNum: 1
    pageSize: 20
    subjectCode: "TRADE"  # 可选筛选
  Response:
    code: 200
    data:
      list:
        - metricId: "m1"
          metricCode: "GMV"
          metricName: "成交金额"
          subjectCode: "TRADE"
          subjectName: "交易"
          status: "PUBLISHED"
          visibility: "PUBLIC"
          allowedRoles: []
      total: 1

POST /api/v1/auth/metric/metric-permissions/batch-update:
  Body:
    metricIds: ["m1", "m2"]
    visibility: "ROLE"
    allowedRoles: ["DATA_ANALYST"]

GET /api/v1/auth/metric/dimension-permissions:
  Response:
    code: 200
    data:
      - dimensionId: "d1"
        dimensionCode: "REGION"
        dimensionName: "地区"
        category: "地理"
        relatedField: "region"
        actions: ["VIEW", "USE"]
        allowValuesQuery: true
        targets:
          - targetType: "ROLE"
            targetId: "DATA_ANALYST"
            targetName: "数据分析师"

POST /api/v1/auth/metric/dimension-permissions:
  Body:
    dimensionCode: "REGION"
    actions: ["VIEW", "USE"]
    allowValuesQuery: true
    targets:
      - targetType: "ROLE"
        targetId: "DATA_ANALYST"
```

### 5.4 我的权限

```yaml
GET /api/v1/auth/my/permissions:
  Response:
    code: 200
    data:
      functionPermissions:
        - moduleName: "元数据平台"
          permissions: ["业务数据库-查看", "表结构管理-查看"]
      dataPermissions:
        - datasourceName: "MySQL-PROD"
          databases:
            - databaseName: "order_db"
              tables:
                - tableName: "orders"
                  action: "SELECT"
                  rowFilter: null
                  columnMasks: null
      metricPermissions:
        - subjectName: "交易"
          metrics: ["GMV", "订单量"]
          dimensions: ["地区", "品类"]
      pendingApprovals:
        - approvalId: "APV-20260512-001"
          approvalType: "METRIC_PERMISSION"
          resourceName: "成交金额"
          status: "PENDING"
          currentNode: "直属上级审批"
          submittedAt: "2026-05-12T10:30:00+08:00"
```

### 5.5 功能权限树

```yaml
GET /api/v1/auth/function-permissions/tree:
  Response:
    code: 200
    data:
      - key: "meta"
        name: "元数据平台"
        type: "MENU"
        children:
          - key: "meta:business-ds"
            name: "业务数据库"
            type: "MENU"
            children:
              - key: "meta:business-ds:datasource"
                name: "数据源管理"
                type: "MENU"
```

---

## 6. 风险与注意事项

1. **员工信息获取**：角色成员列表需要展示用户姓名、部门、职位，dataauth 服务不存储这些信息。建议：
   - 后端只返回 passport 列表
   - 前端调用 `EmployeeApi` 批量查询用户信息（或后端通过 RPC 调用员工服务聚合）

2. **权限查询性能**：`listUserPermissions` 需要关联多张表，数据量大时可能慢。建议：
   - 先按用户分页，再逐个聚合
   - 或本期先做简单实现，二期引入权限检索模型缓存

3. **指标/维度权限配置的数据来源**：指标和维度信息存储在 `cyan-datametric` 服务，dataauth 不存储。建议：
   - dataauth 只存权限配置（resourceType + resourceId + action + role）
   - 前端展示时从 datametric 查询指标/维度元数据，与 dataauth 的权限配置合并展示

4. **直接授权 vs 角色授权**：当前模型只有角色授权，用户权限页面的"分配权限"（直接给用户分配资源权限）需要新增 `auth_user_permission` 表。建议本期简化为"分配角色"。

---

## 7. 验收标准

- [ ] 角色成员管理：可查看角色成员、添加成员、移除成员，数据持久化到数据库
- [ ] 用户权限：可查看所有用户的权限聚合列表，可为用户分配/回收角色
- [ ] 指标平台权限：主题域/指标/维度三个 Tab 的数据均来自真实后端，配置可保存
- [ ] 我的权限：当前登录用户可查看自己的功能权限、数据权限、指标权限、审批进度
- [ ] 功能权限树：后端返回动态树，前端角色编辑时功能权限选择使用动态树
- [ ] 前端所有 Mock 接口已替换为真实 HTTP 调用，无残留 `mockResponse`
