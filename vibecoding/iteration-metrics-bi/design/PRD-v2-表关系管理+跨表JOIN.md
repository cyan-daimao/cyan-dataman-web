# PRD V2：元数据平台表关系管理 + 指标平台跨表 JOIN 分析

## 1. 背景与目标

### 1.1 现状

**元数据平台（dataman）** 已管理物理表（catalog.schema.table）、字段信息、数据血缘、数据质量等，但**缺少表与表之间的关联关系管理**。

**指标平台（datametric）** 的 BI 分析当前仅支持单表查询。当用户选择指标（来自事实表）+ 维度（来自维度表）时，由于两表不同，分析直接失败。

**Phase 3 语义层** 尝试在指标平台自建 `semantic_logical_table` + `semantic_table_relationship` + `semantic_metric`，导致：
- 同一套物理表在两个系统重复定义
- JOIN 关系也要在两个系统重复维护
- 元数据平台已有的表管理能力被架空

### 1.2 目标

1. **元数据平台**：增加表关系管理功能，统一管理所有物理表的 JOIN 关系
2. **指标平台**：基于元数据平台的表关系，实现指标+维度的跨表 JOIN 分析
3. **删除重复建设**：移除 Phase 3 语义层的 `LogicalTable`、`TableRelationship`、`SemanticMetric` 等无用代码

---

## 2. 用户故事

### 故事 1：元数据管理员配置表关系
> 作为数据架构师，我在元数据平台看到 `ods_user_info` 表的 `city_id` 字段关联 `dim_public_cn_city` 表的 `id` 字段，我可以在表详情页配置这条关联关系。

**验收标准**：
- 在表详情页新增「关联关系」Tab
- 可添加关联：选择目标表、目标字段、关联类型（LEFT/INNER）
- 可查看当前表的所有入向和出向关联

### 故事 2：分析师跨表分析
> 作为数据分析师，我选「用户数」指标（事实表 `ods_user_info`）+「城市维度」（维度表 `dim_public_cn_city`），系统自动 JOIN 两张表返回数据。

**验收标准**：
- 无需关心表是否相同，系统自动查找 JOIN 路径
- 生成的 SQL 包含正确的 JOIN 条件和表别名
- 支持多维度多指标组合

---

## 3. 功能设计

### 3.1 元数据平台 — 表关系管理

#### 数据模型

```sql
CREATE TABLE metadata_table_relation (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
    source_catalog  VARCHAR(128) NOT NULL COMMENT '源表 catalog',
    source_schema   VARCHAR(128) NOT NULL COMMENT '源表 schema',
    source_table    VARCHAR(128) NOT NULL COMMENT '源表名',
    source_column   VARCHAR(128) NOT NULL COMMENT '源表字段',
    target_catalog  VARCHAR(128) NOT NULL COMMENT '目标表 catalog',
    target_schema   VARCHAR(128) NOT NULL COMMENT '目标表 schema',
    target_table    VARCHAR(128) NOT NULL COMMENT '目标表名',
    target_column   VARCHAR(128) NOT NULL COMMENT '目标表字段',
    join_type       VARCHAR(20)  DEFAULT 'LEFT' COMMENT 'JOIN类型：LEFT/INNER/RIGHT',
    description     VARCHAR(500) COMMENT '描述',
    created_by      VARCHAR(100) COMMENT '创建人',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_source (source_catalog, source_schema, source_table),
    INDEX idx_target (target_catalog, target_schema, target_table)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='元数据-表关系';
```

#### API 设计

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取表的所有关联 | GET | `/api/v1/metadata/tables/{catalog}/{schema}/{table}/relations` |
| 创建关联 | POST | `/api/v1/metadata/tables/relations` |
| 删除关联 | DELETE | `/api/v1/metadata/tables/relations/{id}` |

#### 前端页面

在表详情页 `TableDetailPage.tsx` 新增第 8 个 Tab：「关联关系」

```
┌─────────────────────────────────────────────────────────────┐
│ 返回  ods_user_info    [ODS] [L1]                            │
├─────────────────────────────────────────────────────────────┤
│ 基本信息 | 字段信息 | 数据预览 | 时间旅行 | 数据血缘 | 数据质量 | 同步任务 | 【关联关系】│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  【添加关联】                                                │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 出向关联（本表字段 → 其他表）                          │  │
│  │  ┌──────────────┬────────────┬──────────────┬──────┐  │  │
│  │  │ 本表字段      │ 目标表      │ 目标字段      │ 类型  │  │  │
│  │  │ city_id      │ dim_city   │ id           │ LEFT │  │  │
│  │  │ user_type    │ dim_user_type│ type_code   │ LEFT │  │  │
│  │  └──────────────┴────────────┴──────────────┴──────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 入向关联（其他表 → 本表）                              │  │
│  │  ┌──────────────┬────────────┬──────────────┬──────┐  │  │
│  │  │ 来源表        │ 来源字段    │ 本表字段      │ 类型  │  │  │
│  │  │ order_detail │ user_id    │ id           │ LEFT │  │  │
│  │  └──────────────┴────────────┴──────────────┴──────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

添加关联弹窗：
- 方向选择：出向 / 入向
- 目标表选择器（从 metadata_table 列表选）
- 本表字段下拉（从当前表字段选）
- 目标字段下拉（从目标表字段选）
- JOIN 类型：LEFT / INNER / RIGHT

---

### 3.2 指标平台 — 跨表 JOIN 分析

#### 架构调整

**删除以下 Phase 3 无用代码**：
| 文件/目录 | 说明 |
|-----------|------|
| `application/semantic/` 目录 | SemanticQueryEngine、JoinPathResolver、SemanticSqlBuilder、QueryRouter |
| `domain/semantic/` 目录 | LogicalTable、TableRelationship、SemanticMetric、MaterializedView、QueryPlan |
| `infra/persistence/semantic/` 目录 | DO、Mapper、RepositoryImpl |
| `adapter/semantic/http/` 目录 | SemanticController、DTO |
| `semantic_*.sql` 相关表 | 数据库表 |

**保留并改造 `BiAnalysisServiceImpl`**：

```java
// BiAnalysisServiceImpl.buildSql() 新逻辑
private String buildSql(MetricBiAnalysisCmd cmd) {
    // 1. 解析指标 → 事实表
    List<MetricInfo> metricInfos = resolveMetrics(cmd.getMetrics());
    String factTable = metricInfos.get(0).tableRef; // 如 "ods.ods_user_info"
    
    // 2. 解析维度
    List<DimensionInfo> dimensionInfos = resolveDimensions(cmd.getDimensions());
    
    // 3. 收集所有需要 JOIN 的维度表
    Set<String> dimTables = dimensionInfos.stream()
        .map(d -> d.tableName) // 如 "dim_public_cn_city"
        .filter(t -> t != null && !t.equals(factTable))
        .collect(Collectors.toSet());
    
    // 4. 调用元数据平台 API 获取 JOIN 关系
    List<TableRelationDTO> joins = metadataClient.findJoinPaths(factTable, dimTables);
    
    // 5. 生成带 JOIN 的 SQL
    return buildJoinSql(metricInfos, dimensionInfos, joins, cmd);
}
```

#### SQL 生成规则

**单表（无 JOIN）**：
```sql
SELECT city_id, COUNT(DISTINCT user_id) AS 用户数
FROM ods.ods_user_info
GROUP BY city_id
```

**跨表（有 JOIN）**：
```sql
SELECT 
    t1.city_name AS `城市维度`,
    COUNT(DISTINCT t0.user_id) AS `用户数`
FROM ods.ods_user_info t0
LEFT JOIN dim_public_cn_city t1 ON t0.city_id = t1.id
GROUP BY t1.city_name
LIMIT 1000
```

**多维度多 JOIN**：
```sql
SELECT 
    t1.city_name AS `城市`,
    t2.type_name AS `用户类型`,
    COUNT(DISTINCT t0.user_id) AS `用户数`
FROM ods.ods_user_info t0
LEFT JOIN dim_public_cn_city t1 ON t0.city_id = t1.id
LEFT JOIN dim_user_type t2 ON t0.user_type = t2.type_code
GROUP BY t1.city_name, t2.type_name
```

#### 多事实表场景（一期不做）

如果多个指标来自不同事实表（星座模型），一期返回错误：
> "暂不支持多事实表关联分析"

#### 调用元数据平台 API

指标平台新增 HTTP Client：
```java
// 调用 dataman 获取表关系
GET /api/v1/metadata/tables/{catalog}/{schema}/{table}/relations
```

---

## 4. 业务流程

### 4.1 配置表关系

```
数据架构师进入元数据平台
  → 打开表详情页（如 ods_user_info）
  → 切换到「关联关系」Tab
  → 点击「添加关联」
    → 选择方向：出向
    → 选择目标表：dim_public_cn_city
    → 选择本表字段：city_id
    → 选择目标字段：id
    → 选择 JOIN 类型：LEFT
    → 保存
  → 关联关系存入 metadata_table_relation
```

### 4.2 跨表分析

```
分析师进入 BI 图表分析器
  → 选择指标：用户数（来自 ods_user_info）
  → 选择维度：城市维度（来自 dim_public_cn_city）
  → 点击「执行」
    → 前端发送 MetricBiAnalysisCmd 到 /metrics/bi/analysis/execute
    → BiAnalysisServiceImpl 解析指标 → 事实表 ods.ods_user_info
    → 解析维度 → 维度表 dim_public_cn_city
    → 发现两表不同，调用 dataman API 查 JOIN 关系
    → 找到：ods.ods_user_info.city_id = dim_public_cn_city.id
    → 生成带 JOIN 的 SQL
    → 通过 datagateway 执行
    → 返回结果
```

---

## 5. 涉及后端服务改造

### 5.1 cyan-dataman（元数据平台）

**新增模块**：
- `domain/metadata/TableRelation.java` — 领域对象
- `infra/persistence/metadata/dos/MetadataTableRelationDO.java` — DO
- `infra/persistence/metadata/mappers/MetadataTableRelationMapper.java` — Mapper
- `infra/persistence/metadata/repository/TableRelationRepositoryImpl.java` — Repository
- `application/metadata/TableRelationService.java` — Service
- `adapter/metadata/http/TableRelationController.java` — Controller
- `adapter/metadata/http/dto/TableRelationDTO.java` — DTO

**改造模块**：
- `TableDetailPage.tsx` — 新增「关联关系」Tab

### 5.2 cyan-datametric（指标平台）

**删除模块**（Phase 3 无用代码）：
- `application/semantic/` 整个目录
- `domain/semantic/` 整个目录
- `infra/persistence/semantic/` 整个目录
- `adapter/semantic/` 整个目录

**改造模块**：
- `BiAnalysisServiceImpl` — 增加跨表 JOIN 逻辑
- 新增 `infra/client/MetadataTableRelationClient.java` — 调用 dataman API
- 删除 `semantic_*.sql` 迁移脚本

---

## 6. 前端改造

### 6.1 元数据平台

| 文件 | 改造内容 |
|------|---------|
| `src/pages/metadata/metadata_table/TableDetailPage.tsx` | Tab items 新增「关联关系」 |
| `src/pages/metadata/metadata_table/detail/TableRelations.tsx` | 新增：关联关系列表 + 添加弹窗 |
| `src/api/MetadataTableAPI.ts` | 新增 `getTableRelations`、`createRelation`、`deleteRelation` |

### 6.2 指标平台/BI

| 文件 | 改造内容 |
|------|---------|
| `src/api/MetricBiApi.ts` | 无需改造（请求体不变） |
| `src/pages/bi/chart/ChartAnalyzer.tsx` | 无需改造（交互不变） |

---

## 7. 非功能性需求

### 7.1 性能
- 元数据平台表关系查询需缓存（Caffeine），避免每次分析都查库
- JOIN 路径计算复杂度：O(V+E)，单事实表+多维度表场景通常 < 10ms

### 7.2 安全
- 表关系配置权限：仅数据架构师/管理员可操作
- 指标平台调用 dataman API 需走内部服务认证

### 7.3 兼容性
- 存量单表分析完全兼容
- 未配置 JOIN 关系的跨表查询返回友好错误提示

---

## 8. 里程碑

| 阶段 | 交付物 |
|------|--------|
| M1 | PRD + 接口契约（本文档） |
| M2 | dataman：表关系 CRUD + 前端 Tab |
| M3 | datametric：删除 Phase 3 代码 + 改造 BiAnalysisServiceImpl |
| M4 | 联调测试 |
| M5 | 验收 |
