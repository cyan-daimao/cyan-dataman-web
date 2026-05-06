# cyan-databi BI 服务 —— 改造接口契约

## 1. 通用约定

- **Base URL**: `http://cyan-databi:8080`
- **统一响应格式**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": { ... }
  }
  ```
- **认证**: Bearer Token
- **分页参数**: `current`, `size`

---

## 2. 改造接口

### 2.1 保存图表（兼容改造）

支持同时保存 `datasetId`（存量）和 `metricAnalysisCmd`（新增）。

- **Method**: POST
- **Path**: `/api/v1/charts`
- **Request Body**:
  ```json
  {
    "name": "各渠道GMV趋势",
    "description": "",
    "datasetId": null,
    "analysisType": "METRICS",
    "metricAnalysisCmd": {
      "chartType": "BAR",
      "metrics": [{ "metricId": "M001", "alias": "GMV" }],
      "dimensions": [{ "dimId": "D001", "alias": "渠道" }],
      "filters": [],
      "orders": [],
      "limitValue": 100
    },
    "chartType": "BAR",
    "dimensions": [{ "field": "渠道", "alias": "渠道" }],
    "metrics": [{ "field": "GMV", "aggregate": "SUM", "alias": "GMV" }],
    "filters": [],
    "orders": [],
    "limitValue": 100,
    "sqlContent": ""
  }
  ```

- **字段变更说明**:

  | 字段 | 类型 | 必填 | 说明 |
  |------|------|------|------|
  | `datasetId` | string | 条件必填 | `analysisType=DATASET` 时必填 |
  | `analysisType` | string | 是 | DATASET / METRICS |
  | `metricAnalysisCmd` | object | 条件必填 | `analysisType=METRICS` 时必填 |
  | `chartType` | string | 是 | 复用现有枚举 |
  | `dimensions` | array | 否 | 复用现有结构，用于展示 |
  | `metrics` | array | 否 | 复用现有结构，用于展示 |
  | `filters` | array | 否 | 复用现有结构 |
  | `orders` | array | 否 | 复用现有结构 |
  | `limitValue` | integer | 否 | 复用现有结构 |
  | `sqlContent` | string | 否 | 保存时自动填充 |

- **校验规则**:
  - `analysisType=METRICS` 时，`datasetId` 必须为 null，`metricAnalysisCmd` 必须非空
  - `analysisType=DATASET` 时，`datasetId` 必须非空，`metricAnalysisCmd` 必须为 null
  - 二者互斥

- **Response 200**: 同现有 ChartDTO

---

### 2.2 更新图表（兼容改造）

- **Method**: PUT
- **Path**: `/api/v1/charts/{id}`
- **Request Body**: 同 2.1
- **说明**: 存量 DATASET 类型图表可更新为 METRICS 类型（迁移场景）

---

### 2.3 图表详情（兼容改造）

- **Method**: GET
- **Path**: `/api/v1/charts/{id}`
- **Response 200**:
  ```json
  {
    "code": 200,
    "data": {
      "id": "C001",
      "name": "各渠道GMV趋势",
      "description": "",
      "datasetId": null,
      "analysisType": "METRICS",
      "metricAnalysisCmd": {
        "chartType": "BAR",
        "metrics": [{ "metricId": "M001", "alias": "GMV" }],
        "dimensions": [{ "dimId": "D001", "alias": "渠道" }],
        "filters": [],
        "orders": [],
        "limitValue": 100
      },
      "chartType": "BAR",
      "dimensions": [{ "field": "渠道", "alias": "渠道" }],
      "metrics": [{ "field": "GMV", "aggregate": "SUM", "alias": "GMV" }],
      "filters": [],
      "orders": [],
      "limitValue": 100,
      "sqlContent": "SELECT ...",
      "createdBy": "张三",
      "createdAt": "2024-01-01T00:00:00",
      "updatedAt": "2024-01-01T00:00:00"
    }
  }
  ```

---

### 2.4 执行图表分析（兼容改造）

- **Method**: POST
- **Path**: `/api/v1/charts/{id}/execute`
- **说明**:
  - 如果图表 `analysisType=DATASET`，走现有 `AnalysisService` 逻辑
  - 如果图表 `analysisType=METRICS`，将 `metricAnalysisCmd` 转发到指标服务的 `/api/v1/metrics/bi/analysis/execute`
  - 返回格式统一为 `ChartDataDTO`

- **Response 200**: 同现有 ChartDataDTO

---

### 2.5 预览图表 SQL（兼容改造）

- **Method**: GET
- **Path**: `/api/v1/charts/{id}/preview-sql`
- **说明**:
  - `analysisType=DATASET` → 走现有 SqlBuilder
  - `analysisType=METRICS` → 转发到指标服务的 `/api/v1/metrics/bi/analysis/preview-sql`

- **Response 200**:
  ```json
  {
    "code": 200,
    "data": "SELECT channel AS `渠道`, SUM(amount) AS `GMV` FROM ..."
  }
  ```

---

### 2.6 执行分析（兼容改造）

- **Method**: POST
- **Path**: `/api/v1/analysis/execute`
- **Request Body**:
  ```json
  {
    "datasetId": "DS001",
    "chartType": "BAR",
    "dimensions": [...],
    "metrics": [...],
    "filters": [...],
    "orders": [...],
    "limitValue": 100
  }
  ```
- **说明**: 此接口保持不变，继续服务存量 DATASET 类型的实时分析需求。新 METRICS 类型不走此接口，直接调指标服务。

---

### 2.7 数据集接口（保留但标记废弃）

以下接口一期保留，供存量图表使用，但前端不再调用：

| 接口 | 方法 | 路径 | 状态 |
|------|------|------|------|
| 数据集分页 | GET | `/api/v1/datasets` | 保留 |
| 数据集列表 | GET | `/api/v1/datasets/list` | 保留 |
| 数据集详情 | GET | `/api/v1/datasets/{id}` | 保留 |
| 创建数据集 | POST | `/api/v1/datasets` | 保留（但前端移除入口） |
| 更新数据集 | PUT | `/api/v1/datasets/{id}` | 保留 |
| 删除数据集 | DELETE | `/api/v1/datasets/{id}` | 保留 |

---

## 3. 新增内部调用

### 3.1 BI 服务 → 指标服务

BI 服务需要调用指标服务的分析接口。

**方式**: 通过 HTTP 调用（或 Feign Client，如果已有依赖）。

检查现有依赖: `cyan-databi-application/pom.xml` 中是否有 `cyan-datametric-client` 依赖。

- 如果有: 直接注入 Feign Client
- 如果没有: 新增 HTTP 调用工具类，调用指标服务的 `/api/v1/metrics/bi/analysis/execute` 和 `/api/v1/metrics/bi/analysis/preview-sql`

### 3.2 调用示例

```java
// MetricBiAnalysisClient（新增）
public interface MetricBiAnalysisClient {
    Response<ChartDataDTO> execute(MetricBiAnalysisCmd cmd);
    Response<String> previewSql(MetricBiAnalysisCmd cmd);
}

// 在 ChartServiceImpl 中使用
public ChartDataBO executeChart(String chartId, String executor) {
    Chart chart = chartRepository.findById(chartId);
    
    if (chart.getAnalysisType() == AnalysisType.DATASET) {
        // 存量逻辑
        return analysisService.execute(buildAnalysisCmd(chart), executor);
    } else {
        // 新增逻辑：转发到指标服务
        return metricBiAnalysisClient.execute(chart.getMetricAnalysisCmd());
    }
}
```

---

## 4. 数据模型变更

### 4.1 bi_chart 表

```sql
-- 新增字段
ALTER TABLE bi_chart 
ADD COLUMN analysis_type VARCHAR(20) DEFAULT 'DATASET' COMMENT '分析类型：DATASET/METRICS' 
AFTER dataset_id;

ALTER TABLE bi_chart 
ADD COLUMN metric_analysis_cmd JSON COMMENT '指标分析DSL' 
AFTER analysis_type;
```

### 4.2 Chart 领域对象变更

```java
public class Chart {
    // ... 现有字段 ...
    
    private String datasetId;              // 存量兼容
    private AnalysisType analysisType;     // 新增：DATASET / METRICS
    private MetricBiAnalysisCmd metricAnalysisCmd; // 新增：指标分析DSL
    
    // ... 现有字段 ...
}

public enum AnalysisType {
    DATASET,    // 基于自建数据集
    METRICS     // 基于指标系统
}
```

### 4.3 ChartDO 变更

```java
@TableName("bi_chart")
public class ChartDO {
    // ... 现有字段 ...
    
    private String datasetId;
    private String analysisType;
    private String metricAnalysisCmd;  // JSON 字符串存储
    
    // ... 现有字段 ...
}
```

---

## 5. 兼容性策略

| 场景 | 处理方式 |
|------|---------|
| 存量 DATASET 图表 | 完全兼容，继续使用现有执行链路 |
| 新创建 METRICS 图表 | 使用新 DSL 执行链路，不关联 dataset |
| 存量图表迁移到 METRICS | 支持更新 `analysisType` 和 `metricAnalysisCmd` |
| 看板混合引用 | 看板可同时包含 DATASET 和 METRICS 类型的图表 |
| 数据集管理页面 | 前端一期移除入口，但后端接口保留 |
