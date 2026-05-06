# PRD：智能分析（BI）接入指标系统 —— 取消自建数据集，指标即数据源

## 1. 背景与目标

### 1.1 现状问题

当前智能分析（BI）模块采用**自建数据集**模式：
- 用户先创建数据集（选物理表或写自定义SQL，再手动配置字段的维度/指标角色）
- 再基于数据集拖拽字段做图表分析
- 数据集与平台的指标系统完全割裂，导致：
  - **口径不统一**：同一个"订单金额"，指标系统有一个定义，BI 数据集里又有一个定义
  - **维护成本高**：数据集字段变更后，所有关联图表都要人工检查
  - **血缘断裂**：BI 图表无法追溯到指标平台的指标定义和血缘

### 1.2 目标

取消 BI 自建数据集，让 BI 直接对接指标系统：
- **指标即数据源**：用户在 BI 中直接选用指标平台已定义的指标和维度
- **前端 DSL**：图表分析器生成描述性 DSL，后端解析 DSL 生成并执行 SQL
- **口径统一**：BI 使用的指标 = 指标平台定义的指标，一处变更全局生效
- **血缘打通**：BI 图表天然关联指标，可通过指标血缘追溯到物理表字段

---

## 2. 用户故事

### 故事 1：分析师创建指标图表
> 作为数据分析师，我想在 BI 中直接选择"GMV"指标和"日期""渠道"维度，拖拽生成柱状图，而不需要先去创建数据集。

**验收标准**：
- 进入图表分析器，无需先选择数据集
- 左侧显示指标库列表和维度库列表
- 拖拽指标到指标区、维度到维度区即可配置图表
- 执行后返回正确数据

### 故事 2：产品经理查看看板
> 作为产品经理，我想在看板中看到基于标准化指标的统计卡片和趋势图，确保数据口径与指标平台一致。

**验收标准**：
- 看板中的图表基于指标系统生成
- 图表数据与指标平台试算结果一致
- 可查看图表关联的指标定义和血缘

### 故事 3：指标口径变更自动生效
> 作为数据治理人员，当我在指标平台修改了"GMV"的过滤条件（如排除退款订单）后，BI 中所有使用该指标的图表自动使用新口径。

**验收标准**：
- 指标平台修改原子指标后，BI 图表下次执行时自动使用新 SQL
- 无需人工去 BI 中逐个修改数据集

---

## 3. 功能设计

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端 (cyan-dataman-web)                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              图表分析器 (ChartAnalyzer)                    │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │  │
│  │  │ 指标库    │  │ 维度库    │  │  配置区               │   │  │
│  │  │ ·GMV     │  │ ·日期     │  │  维度: [渠道] [日期]  │   │  │
│  │  │ ·订单数   │  │ ·渠道     │  │  指标: [GMV] [订单数] │   │  │
│  │  │ ·客单价   │  │ ·地区     │  │  过滤 / 排序 / 限制   │   │  │
│  │  └──────────┘  └──────────┘  └──────────────────────┘   │  │
│  │                          ↓ build MetricAnalysisCmd        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│                    POST /api/v1/metrics/bi/analysis/execute      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    指标服务 (cyan-datametric)                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  MetricBiAnalysisController                                │  │
│  │      ↓                                                      │  │
│  │  MetricBiAnalysisService                                   │  │
│  │      ↓                                                      │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  DSL 解析器                                          │  │  │
│  │  │  1. 加载指标元数据（原子/派生/复合）                  │  │  │
│  │  │  2. 展开复合指标公式                                  │  │  │
│  │  │  3. 收集所有原子指标及其物理表字段                    │  │  │
│  │  │  4. 检查多指标表一致性（是否同事实表或可JOIN）        │  │  │
│  │  │  5. 生成联合查询 SQL                                  │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │      ↓                                                      │  │
│  │  调用 datagateway 执行 SQL                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 前端 DSL 设计（MetricAnalysisCmd）

前端图表分析器生成的 DSL，取代原有的 `AnalysisCmd`（基于 datasetId）：

```json
{
  "chartType": "BAR",
  "metrics": [
    { "metricId": "M001", "alias": "GMV" },
    { "metricId": "M002", "alias": "订单数" }
  ],
  "dimensions": [
    { "dimId": "D001", "alias": "渠道" }
  ],
  "filters": [
    { "dimId": "D002", "operator": "BETWEEN", "values": ["2024-01-01", "2024-01-07"] }
  ],
  "orders": [
    { "metricId": "M001", "direction": "DESC" }
  ],
  "limitValue": 20
}
```

**字段说明**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `chartType` | string | 是 | TABLE / BAR / LINE / PIE / SCATTER / AREA / NUMBER |
| `metrics` | array | 是 | 指标列表，至少1个 |
| `metrics[].metricId` | string | 是 | 指标平台指标ID |
| `metrics[].alias` | string | 否 | 前端显示别名 |
| `dimensions` | array | 否 | 维度列表，最多3个 |
| `dimensions[].dimId` | string | 是 | 公共维度ID |
| `dimensions[].alias` | string | 否 | 前端显示别名 |
| `filters` | array | 否 | 过滤条件 |
| `filters[].metricId` | string | 否 | 对某个指标过滤（默认全局过滤） |
| `filters[].dimId` | string | 否 | 对某个维度过滤 |
| `filters[].operator` | string | 是 | EQ/NE/GT/GTE/LT/LTE/IN/NOT_IN/BETWEEN/IS_NULL/IS_NOT_NULL/LIKE/NOT_LIKE |
| `filters[].values` | array | 是 | 过滤值列表 |
| `orders` | array | 否 | 排序配置 |
| `orders[].metricId` | string | 否 | 按指标排序 |
| `orders[].dimId` | string | 否 | 按维度排序 |
| `orders[].direction` | string | 是 | ASC / DESC |
| `limitValue` | integer | 否 | 限制条数，默认1000 |

### 3.3 后端 SQL 生成规则

#### 3.3.1 单指标 + 多维度（最简场景）

输入：
- 指标 `M001`（原子指标，SUM(amount)，表 `order_db.order_table`）
- 维度 `D001`（渠道，columnName=`channel`）

输出 SQL：
```sql
SELECT 
  channel AS `渠道`,
  SUM(amount) AS `GMV`
FROM order_db.order_table
GROUP BY channel
```

#### 3.3.2 多指标 + 多维度（同事实表）

输入：
- 指标 `M001`（SUM(amount)，表 `order_table`）
- 指标 `M002`（COUNT(order_id)，表 `order_table`）
- 维度 `D001`（channel）

输出 SQL：
```sql
SELECT 
  channel AS `渠道`,
  SUM(amount) AS `GMV`,
  COUNT(order_id) AS `订单数`
FROM order_db.order_table
GROUP BY channel
```

#### 3.3.3 派生指标（带修饰词和时间周期）

输入：
- 派生指标 `M003`（基于 `M001`，修饰词"APP渠道"，时间周期"近7天"）
- 维度 `D001`（channel）

输出 SQL：
```sql
SELECT 
  channel AS `渠道`,
  SUM(amount) AS `APP渠道近7天GMV`
FROM order_db.order_table
WHERE channel IN ('APP')
  AND dt >= date_sub(current_date, 7)
GROUP BY channel
```

#### 3.3.4 复合指标（公式计算）

输入：
- 复合指标 `M005`，公式 `${M003} / ${M004}`
- 维度 `D001`（channel）

展开逻辑：
1. 解析公式，发现依赖 `M003` 和 `M004`
2. `M003` 是派生指标 → 展开为原子 `SUM(amount) WHERE ...`
3. `M004` 是派生指标 → 展开为原子 `COUNT(order_id) WHERE ...`
4. 如果两者同事实表，生成联合查询：

```sql
SELECT 
  channel AS `渠道`,
  SUM(CASE WHEN channel IN ('APP') AND dt >= date_sub(current_date, 7) THEN amount END) 
    / COUNT(CASE WHEN channel IN ('APP') AND dt >= date_sub(current_date, 7) THEN order_id END) 
    AS `转化率`
FROM order_db.order_table
GROUP BY channel
```

> **注意**：复合指标多指标联合查询涉及复杂的条件聚合（CASE WHEN），一期可先限制为"同事实表指标组合"。

### 3.4 一期范围限制

为保证一期可交付，以下限制需要在 PRD 中明确：

| 限制项 | 一期行为 | 二期优化 |
|--------|---------|---------|
| 多指标联合查询 | 仅支持同事实表（同一 `dbName.tblName`） | 支持跨事实表 JOIN |
| 复合指标 | 仅支持同事实表的原子/派生指标组合 | 支持跨表复合指标（子查询或CTE） |
| 维度来源 | 仅支持物理表字段维度（维度库中的 `columnName`） | 支持维表 JOIN（维度库中的 `tableName`） |
| 过滤条件 | 支持全局过滤和维度过滤 | 支持指标级过滤覆盖 |
| 图表类型 | 复用现有全部图表类型 | 增加高级图表 |

---

## 4. 业务流程

### 4.1 创建指标图表

```
用户进入 BI → 图表分析器
  → 左侧加载指标列表（来自指标平台）
  → 左侧加载维度列表（来自指标平台）
  → 用户拖拽指标到指标区（无需选聚合函数）
  → 用户拖拽维度到维度区
  → 用户配置过滤/排序/限制
  → 点击"执行"
    → 前端生成 MetricAnalysisCmd
    → 调用 POST /api/v1/metrics/bi/analysis/execute
    → 后端解析 DSL → 生成 SQL → 调用 datagateway 执行
    → 返回 ChartDataDTO
  → 前端渲染图表
  → 用户输入图表名称，点击"保存"
    → 前端保存 ChartDTO（chartType + metricAnalysisCmd JSON）
    → 后端存储到 bi_chart 表
```

### 4.2 查看看板

```
用户进入看板查看
  → 加载看板详情，获取 chartRefs
  → 并行加载每个图表的 ChartDTO
  → 并行执行每个图表（调用 /metrics/bi/analysis/execute）
  → 渲染所有图表到画布
```

### 4.3 指标口径变更

```
数据治理人员在指标平台修改原子指标 M001 的过滤条件
  → 指标平台保存新版本
  → BI 中所有使用 M001（及基于 M001 的派生/复合指标）的图表
  → 下次执行时自动使用新 SQL（无状态，实时生成）
```

---

## 5. 涉及的后端服务改造

### 5.1 cyan-datametric（指标服务）

**新增模块/接口**：

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 指标分析执行 | POST | `/api/v1/metrics/bi/analysis/execute` | 接收 MetricAnalysisCmd，生成SQL并执行 |
| SQL预览 | POST | `/api/v1/metrics/bi/analysis/preview-sql` | 仅生成SQL，不执行 |
| 指标列表（BI用） | GET | `/api/v1/metrics/bi/list` | 简化字段的指标列表 |
| 维度列表（BI用） | GET | `/api/v1/metrics/bi/dimensions` | 简化字段的维度列表 |

**新增领域逻辑**：
- `MetricBiAnalysisService`：DSL 解析核心
- `MetricSqlBuilder`：多指标联合 SQL 生成
- `MetricResolver`：指标展开（复合→派生→原子）
- `TableConsistencyChecker`：多指标事实表一致性检查

**改造现有逻辑**：
- `MetricServiceImpl.previewSql` 的逻辑可复用为单指标 SQL 生成基础

### 5.2 cyan-databi（BI服务）

**改造内容**：

| 改造点 | 说明 |
|--------|------|
| `Chart` 领域模型 | 新增 `metricAnalysisCmd` JSON 字段，替代 `datasetId` |
| `ChartController` | 图表 CRUD 适配新模型 |
| `AnalysisService` | 改造执行链路：如果传入的是指标DSL，转发到指标服务；如果仍是 datasetId，保留现有逻辑 |
| 数据集相关接口 | 一期保留但标记废弃，二期移除 |

**兼容性策略**：
- 一期图表同时支持 `datasetId`（存量）和 `metricAnalysisCmd`（新增）
- 新创建的图表使用 `metricAnalysisCmd`，不再关联 dataset
- 存量图表继续可用，逐步迁移

### 5.3 cyan-datagateway（数据网关）

**无需改造**，指标服务直接复用现有的 StarRocks SQL 执行能力。

---

## 6. 前端改造

### 6.1 页面结构调整

| 当前页面 | 改造后 |
|----------|--------|
| `/bi/dataset`（数据集列表） | **移除**，或改为指标浏览页 |
| `/bi/dataset/create` | **移除** |
| `/bi/dataset/edit/:id` | **移除** |
| `/bi/chart`（图表列表） | 保留，列表中显示关联的指标名称而非数据集名称 |
| `/bi/chart/analyzer` | 重构：左侧从"数据集字段"改为"指标库+维度库" |
| `/bi/dashboard/*` | 保留，执行链路改为调用指标服务 |

### 6.2 ChartAnalyzer 重构要点

1. **左侧数据源面板**：
   - 上半部分：指标库（来自 `/api/v1/metrics/bi/list`）
   - 下半部分：维度库（来自 `/api/v1/metrics/bi/dimensions`）
   - 指标按主题域分组展示

2. **拖拽交互**：
   - 指标拖到"指标区"：显示指标名称 + 聚合方式提示（如 SUM(amount)），不可修改聚合
   - 维度拖到"维度区"：显示维度名称
   - 过滤条件：支持维度过滤和全局过滤

3. **执行与保存**：
   - 执行：生成 `MetricAnalysisCmd`，调用 `/metrics/bi/analysis/execute`
   - 保存：`ChartCmd` 中存储 `metricAnalysisCmd` JSON

### 6.3 新增 API 封装

- `src/api/MetricBiApi.ts`：封装指标分析相关接口
- 扩展 `src/api/MetricApi.ts`：增加 `biList()` 方法

---

## 7. 数据模型变更

### 7.1 bi_chart 表（cyan-databi）

新增字段：
```sql
ALTER TABLE bi_chart ADD COLUMN metric_analysis_cmd JSON COMMENT '指标分析DSL' AFTER dataset_id;
ALTER TABLE bi_chart ADD COLUMN analysis_type VARCHAR(20) DEFAULT 'DATASET' COMMENT '分析类型：DATASET/Metrics' AFTER metric_analysis_cmd;
```

兼容性：`dataset_id` 保留，`analysis_type` 区分存量（DATASET）和新图表（METRICS）。

### 7.2 新增接口 DTO（cyan-datametric）

```java
// MetricBiAnalysisCmd.java
public class MetricBiAnalysisCmd {
    private String chartType;
    private List<MetricRef> metrics;
    private List<DimensionRef> dimensions;
    private List<FilterRef> filters;
    private List<OrderRef> orders;
    private Integer limitValue;
}

public class MetricRef {
    private String metricId;
    private String alias;
}

public class DimensionRef {
    private String dimId;
    private String alias;
}

public class FilterRef {
    private String metricId;  // 可选，默认全局
    private String dimId;
    private String operator;
    private List<String> values;
}

public class OrderRef {
    private String metricId;  // 可选
    private String dimId;     // 可选
    private String direction;
}
```

---

## 8. 非功能性需求

### 8.1 性能
- 指标分析执行响应时间 P99 < 3s（依赖 datagateway 执行时间）
- 指标列表和维度列表需要缓存（Redis），避免每次打开分析器都查询数据库

### 8.2 兼容性
- 存量基于数据集的图表和看板必须继续可用
- 新图表使用新 DSL，存量图表保留旧 datasetId 模式
- 二期再全面迁移存量数据

### 8.3 安全
- 指标分析接口需要校验用户对该指标/维度的查看权限（一期可先不做细粒度权限，复用现有登录校验）
- SQL 注入防护：所有过滤值必须通过预编译参数传递，禁止字符串拼接

### 8.4 可观测性
- 指标分析执行记录日志：谁、查了哪些指标、哪些维度、耗时多少
- 错误日志：DSL 解析失败、SQL 生成失败、执行失败的详细原因

---

## 9. 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 复合指标 SQL 生成复杂度高 | 延期 | 一期限制为同事实表，复杂场景二期支持 |
| 存量数据集图表迁移成本高 | 用户体验 | 一期保留兼容，提供迁移工具或引导 |
| 多指标事实表不一致 | 查询报错 | 后端严格校验，不一致时返回清晰错误信息 |
| 前端重构 ChartAnalyzer 工作量大 | 前端延期 | 保持现有图表渲染组件不变，只改造数据流 |

---

## 10. 里程碑

| 阶段 | 交付物 | 时间（参考） |
|------|--------|-------------|
| M1 | PRD + 接口契约 | T+1 |
| M2 | 指标服务后端：DSL解析 + SQL生成 + 新接口 | T+5 |
| M3 | BI服务后端：Chart模型改造 + 兼容层 | T+7 |
| M4 | 前端：ChartAnalyzer重构 + API封装 | T+10 |
| M5 | 联调 + 测试 + 验收 | T+14 |
