# cyan-databi API 接口契约 — 看板布局与联动

## 通用约定

- BaseURL: `http://localhost:8085`
- 时间格式: `yyyy-MM-dd HH:mm:ss`
- 错误格式: `{ "code": 500, "message": "错误信息", "data": null }`
- 响应成功: `{ "code": 200, "message": "success", "data": ... }`

---

## 一、看板接口

### 1.1 分页查询看板

- **Method**: GET
- **Path**: `/api/v1/dashboards`
- **Query**:
  - `name` (string, optional): 看板名称模糊查询
  - `current` (int, optional, default=1): 页码
  - `size` (int, optional, default=10): 页大小
- **Response 200**:
```json
{
  "code": 200,
  "data": {
    "records": [
      {
        "id": "1",
        "name": "销售分析看板",
        "description": "",
        "layoutConfig": "{\"cols\":12,\"rowHeight\":40}",
        "chartRefs": [
          { "chartId": "101", "x": 0, "y": 0, "w": 6, "h": 8 }
        ],
        "createdBy": "user1",
        "createdAt": "2026-05-01 10:00:00",
        "updatedAt": "2026-05-01 10:00:00"
      }
    ],
    "total": 1,
    "size": 10,
    "current": 1
  }
}
```

### 1.2 根据ID查询看板

- **Method**: GET
- **Path**: `/api/v1/dashboards/{id}`
- **Response 200**:
```json
{
  "code": 200,
  "data": {
    "id": "1",
    "name": "销售分析看板",
    "description": "",
    "layoutConfig": "{\"cols\":12,\"rowHeight\":40,\"compact\":true,\"theme\":\"default\"}",
    "chartRefs": [
      {
        "chartId": "101",
        "x": 0, "y": 0, "w": 6, "h": 8,
        "titleVisible": true,
        "borderStyle": "default",
        "bgColor": null,
        "cascadeFrom": ["102", "103"]
      },
      {
        "chartId": "102",
        "x": 6, "y": 0, "w": 3, "h": 2,
        "titleVisible": true,
        "borderStyle": "default",
        "bgColor": null,
        "cascadeFrom": []
      }
    ],
    "createdBy": "user1",
    "createdAt": "2026-05-01 10:00:00",
    "updatedAt": "2026-05-01 10:00:00"
  }
}
```

**chartRefs 字段说明**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| chartId | string | 是 | 引用的图表ID |
| x | int | 是 | 网格列位置（0-11） |
| y | int | 是 | 网格行位置 |
| w | int | 是 | 占多少列 |
| h | int | 是 | 占多少行 |
| titleVisible | boolean | 否，默认true | 是否显示标题 |
| borderStyle | string | 否，默认"default" | 边框样式 |
| bgColor | string | 否 | 背景色（hex） |
| cascadeFrom | string[] | 否，默认[] | 本图表受哪些图表的筛选值影响 |

### 1.3 保存看板

- **Method**: POST
- **Path**: `/api/v1/dashboards`
- **Request Body**:
```json
{
  "name": "销售分析看板",
  "description": "",
  "layoutConfig": "{\"cols\":12,\"rowHeight\":40,\"compact\":true}",
  "chartRefs": [
    {
      "chartId": "101",
      "x": 0, "y": 0, "w": 6, "h": 8,
      "titleVisible": true,
      "borderStyle": "default",
      "bgColor": null,
      "cascadeFrom": ["102"]
    },
    {
      "chartId": "102",
      "x": 6, "y": 0, "w": 3, "h": 2,
      "titleVisible": true,
      "borderStyle": "default",
      "bgColor": null,
      "cascadeFrom": []
    }
  ]
}
```
- **Response 200**:
```json
{ "code": 200, "data": "1" }
```

### 1.4 更新看板

- **Method**: PUT
- **Path**: `/api/v1/dashboards/{id}`
- **Request Body**: 同 1.3
- **Response 200**:
```json
{ "code": 200, "data": true }
```

### 1.5 删除看板

- **Method**: DELETE
- **Path**: `/api/v1/dashboards/{id}`
- **Response 200**:
```json
{ "code": 200, "data": true }
```

### 1.6 【新增】查询看板内图表详情列表

- **Method**: GET
- **Path**: `/api/v1/dashboards/{id}/charts`
- **Response 200**:
```json
{
  "code": 200,
  "data": [
    {
      "chartId": "101",
      "x": 0, "y": 0, "w": 6, "h": 8,
      "titleVisible": true,
      "borderStyle": "default",
      "bgColor": null,
      "cascadeFrom": ["102"],
      "chart": {
        "id": "101",
        "name": "区域销售额",
        "description": "",
        "datasetId": null,
        "analysisType": "METRICS",
        "metricAnalysisCmd": {
          "chartType": "BAR",
          "metrics": [{"metricCode": "M_SALE_AMT", "alias": "销售额"}],
          "dimensions": [{"dimCode": "D_REGION", "alias": "地区"}],
          "filters": [],
          "orders": [],
          "limitValue": 1000
        },
        "chartType": "BAR",
        "dimensions": [{"field": "D_REGION", "alias": "地区"}],
        "metrics": [{"field": "M_SALE_AMT", "aggregate": "SUM", "alias": "销售额"}],
        "filters": [],
        "orders": [],
        "limitValue": 1000,
        "sqlContent": null,
        "createdBy": "user1",
        "createdAt": "2026-05-01 10:00:00",
        "updatedAt": "2026-05-01 10:00:00"
      }
    },
    {
      "chartId": "102",
      "x": 6, "y": 0, "w": 3, "h": 2,
      "titleVisible": true,
      "borderStyle": "default",
      "bgColor": null,
      "cascadeFrom": [],
      "chart": { ... }
    }
  ]
}
```

**说明**：此接口合并返回布局信息和图表完整元数据，减少前端请求次数。

---

## 二、图表接口

### 2.1 分页查询图表

- **Method**: GET
- **Path**: `/api/v1/charts`
- **Query**:
  - `name` (string, optional)
  - `datasetId` (string, optional)
  - `chartType` (string, optional): 图表类型筛选
  - `current` (int, optional, default=1)
  - `size` (int, optional, default=10)
- **Response**: 分页 ChartDTO 列表

### 2.2 根据ID查询图表

- **Method**: GET
- **Path**: `/api/v1/charts/{id}`
- **Response 200**:
```json
{
  "code": 200,
  "data": {
    "id": "101",
    "name": "区域销售额",
    "description": "",
    "datasetId": null,
    "analysisType": "METRICS",
    "metricAnalysisCmd": {
      "chartType": "BAR",
      "metrics": [{"metricCode": "M_SALE_AMT", "alias": "销售额"}],
      "dimensions": [{"dimCode": "D_REGION", "alias": "地区"}],
      "filters": [],
      "orders": [],
      "limitValue": 1000
    },
    "chartType": "BAR",
    "dimensions": [{"field": "D_REGION", "alias": "地区"}],
    "metrics": [{"field": "M_SALE_AMT", "aggregate": "SUM", "alias": "销售额"}],
    "filters": [],
    "orders": [],
    "limitValue": 1000,
    "sqlContent": null,
    "createdBy": "user1",
    "createdAt": "2026-05-01 10:00:00",
    "updatedAt": "2026-05-01 10:00:00"
  }
}
```

### 2.3 保存图表

- **Method**: POST
- **Path**: `/api/v1/charts`
- **Request Body** (ChartCmd):
```json
{
  "name": "区域筛选",
  "description": "",
  "datasetId": null,
  "analysisType": "METRICS",
  "metricAnalysisCmd": {
    "chartType": "FILTER_MULTI",
    "metrics": [],
    "dimensions": [{"dimCode": "D_REGION", "alias": "地区"}],
    "filters": [],
    "orders": [],
    "limitValue": 1000
  },
  "chartType": "FILTER_MULTI",
  "dimensions": [{"field": "D_REGION", "alias": "地区"}],
  "metrics": [],
  "filters": [],
  "orders": [],
  "limitValue": 1000,
  "sqlContent": null
}
```
- **Response 200**:
```json
{ "code": 200, "data": "101" }
```

### 2.4 更新图表

- **Method**: PUT
- **Path**: `/api/v1/charts/{id}`
- **Request Body**: 同 2.3
- **Response 200**:
```json
{ "code": 200, "data": true }
```

### 2.5 删除图表

- **Method**: DELETE
- **Path**: `/api/v1/charts/{id}`
- **Response 200**:
```json
{ "code": 200, "data": true }
```

### 2.6 执行图表分析（已有，不变）

- **Method**: POST
- **Path**: `/api/v1/charts/{id}/execute`
- **Request Body**: 无（后端根据图表ID查询DSL后执行）
- **Response 200**:
```json
{
  "code": 200,
  "data": {
    "status": "SUCCESS",
    "costTimeMs": 120,
    "columns": ["地区", "销售额"],
    "rows": [
      { "地区": "华东", "销售额": 100000 },
      { "地区": "华北", "销售额": 80000 }
    ],
    "sql": "SELECT ...",
    "errorMessage": null
  }
}
```

### 2.7 【新增】执行图表分析（传入自定义DSL）

- **Method**: POST
- **Path**: `/api/v1/charts/{id}/execute`
- **Request Body** (可选，用于级联场景):
```json
{
  "metricAnalysisCmd": {
    "chartType": "BAR",
    "metrics": [{"metricCode": "M_SALE_AMT", "alias": "销售额"}],
    "dimensions": [{"dimCode": "D_REGION", "alias": "地区"}],
    "filters": [
      { "dimCode": "D_REGION", "operator": "IN", "values": ["华东", "华北"] }
    ],
    "orders": [],
    "limitValue": 1000
  }
}
```

**说明**：
- 当 Request Body 为空时，后端使用图表存储的原始 DSL 执行
- 当 Request Body 包含 `metricAnalysisCmd` 时，后端使用传入的 DSL 执行（用于级联时前端传入合并了筛选条件的 DSL）
- 响应格式同 2.6

---

## 三、ChartType 枚举值

| code | desc | 类型 |
|------|------|------|
| TABLE | 表格 | 数据图表 |
| BAR | 柱状图 | 数据图表 |
| LINE | 折线图 | 数据图表 |
| PIE | 饼图 | 数据图表 |
| SCATTER | 散点图 | 数据图表 |
| AREA | 面积图 | 数据图表 |
| NUMBER | 指标卡 | 数据图表 |
| **FILTER_SELECT** | 单选下拉框 | 筛选框图表（新增） |
| **FILTER_MULTI** | 多选下拉框 | 筛选框图表（新增） |
| **FILTER_DATE** | 日期选择器 | 筛选框图表（新增） |
| **FILTER_DATE_RANGE** | 日期范围选择器 | 筛选框图表（新增） |

---

## 四、维度字段约定

筛选框图表 execute 返回的数据中：
- `columnName`（物理字段名）：用于 filter 传值
- `displayColumn`（显示字段名）：用于前端展示

筛选框控件渲染时：
- `options` 的 `value` = 物理字段值（传给 filter 用）
- `options` 的 `label` = 显示字段值（展示用）

FilterRef 中的 `values` 始终传物理字段值。
