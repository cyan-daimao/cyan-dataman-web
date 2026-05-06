# 前端 BI 模块 —— 接口契约汇总

本文档汇总前端 BI 模块在本次迭代中需要调用的所有接口。

---

## 1. 调用指标服务（cyan-datametric）

### 1.1 指标列表

- **Method**: GET
- **Base URL**: `http://cyan-datametric:8080`
- **Path**: `/api/v1/metrics/bi/list`
- **Query**:
  - `name` (可选): 模糊搜索
  - `subjectCode` (可选): 主题域筛选
  - `metricType` (可选): ATOMIC/DERIVED/COMPOSITE
- **前端封装**: `src/api/MetricApi.ts` 新增 `MetricApi.biList(params)`
- **返回类型**:
  ```typescript
  interface MetricBiListItem {
    id: string;
    metricCode: string;
    metricName: string;
    metricType: MetricType;
    subjectCode: string;
    subjectName: string;
    statFunc?: StatFunc;
    dataType: string;
    description?: string;
  }
  ```

### 1.2 维度列表

- **Method**: GET
- **Base URL**: `http://cyan-datametric:8080`
- **Path**: `/api/v1/metrics/bi/dimensions`
- **Query**:
  - `name` (可选): 模糊搜索
  - `categoryId` (可选): 分类筛选
- **前端封装**: `src/api/MetricConfigApi.ts` 新增 `DimensionApi.biList(params)`
- **返回类型**:
  ```typescript
  interface DimensionBiListItem {
    id: string;
    dimCode: string;
    dimName: string;
    dimType: DimType;
    dataType: DataType;
    tableName?: string;
    columnName: string;
    categoryName?: string;
  }
  ```

### 1.3 指标分析执行

- **Method**: POST
- **Base URL**: `http://cyan-datametric:8080`
- **Path**: `/api/v1/metrics/bi/analysis/execute`
- **前端封装**: 新增 `src/api/MetricBiApi.ts`
- **请求类型**:
  ```typescript
  interface MetricBiAnalysisCmd {
    chartType: ChartType;
    metrics: MetricRef[];
    dimensions: DimensionRef[];
    filters: FilterRef[];
    orders: OrderRef[];
    limitValue?: number;
  }

  interface MetricRef {
    metricId: string;
    alias?: string;
  }

  interface DimensionRef {
    dimId: string;
    alias?: string;
  }

  interface FilterRef {
    metricId?: string;
    dimId?: string;
    operator: FilterOperator;
    values: string[];
  }

  interface OrderRef {
    metricId?: string;
    dimId?: string;
    direction: OrderDirection;
  }
  ```
- **返回类型**: `Response<ChartDataDTO>`（复用现有类型）

### 1.4 指标分析 SQL 预览

- **Method**: POST
- **Base URL**: `http://cyan-datametric:8080`
- **Path**: `/api/v1/metrics/bi/analysis/preview-sql`
- **前端封装**: `src/api/MetricBiApi.ts`
- **请求类型**: 同 1.3
- **返回类型**: `Response<string>`

---

## 2. 调用 BI 服务（cyan-databi）

### 2.1 图表 CRUD（兼容改造）

以下接口的请求/响应体需要适配新的 `analysisType` 和 `metricAnalysisCmd` 字段：

| 接口 | 方法 | 路径 | 变更说明 |
|------|------|------|---------|
| 图表分页 | GET | `/api/v1/charts` | 响应增加 analysisType 字段 |
| 图表列表 | GET | `/api/v1/charts/list` | 同上 |
| 图表详情 | GET | `/api/v1/charts/{id}` | 同上 |
| 创建图表 | POST | `/api/v1/charts` | 请求体增加 analysisType + metricAnalysisCmd |
| 更新图表 | PUT | `/api/v1/charts/{id}` | 同上 |
| 删除图表 | DELETE | `/api/v1/charts/{id}` | 不变 |
| 执行图表 | POST | `/api/v1/charts/{id}/execute` | 后端自动路由到对应执行链路 |
| 预览SQL | GET | `/api/v1/charts/{id}/preview-sql` | 同上 |

- **前端封装**: `src/api/DatabiApi.ts` 中 `ChartDTO` / `ChartCmd` 增加字段
- **新增类型**:
  ```typescript
  interface ChartDTO {
    id: string;
    name: string;
    description?: string;
    datasetId?: string;              // 存量兼容，可选
    analysisType: AnalysisType;      // 新增
    metricAnalysisCmd?: MetricBiAnalysisCmd; // 新增
    chartType: ChartType;
    dimensions?: DimensionConfig[];
    metrics?: MetricConfig[];
    filters?: FilterConfig[];
    orders?: OrderConfig[];
    limitValue?: number;
    sqlContent?: string;
    createdBy?: string;
    updatedAt?: string;
    createdAt?: string;
  }

  enum AnalysisType {
    DATASET = 'DATASET',
    METRICS = 'METRICS'
  }
  ```

### 2.2 看板 CRUD

看板接口**无需改造**，`DashboardDTO` / `DashboardCmd` 保持不变。

| 接口 | 方法 | 路径 | 变更说明 |
|------|------|------|---------|
| 看板分页 | GET | `/api/v1/dashboards` | 不变 |
| 看板列表 | GET | `/api/v1/dashboards/list` | 不变 |
| 看板详情 | GET | `/api/v1/dashboards/{id}` | 不变 |
| 创建看板 | POST | `/api/v1/dashboards` | 不变 |
| 更新看板 | PUT | `/api/v1/dashboards/{id}` | 不变 |
| 删除看板 | DELETE | `/api/v1/dashboards/{id}` | 不变 |

### 2.3 分析执行（存量保留）

- **Method**: POST
- **Path**: `/api/v1/analysis/execute`
- **说明**: 此接口继续服务存量 DATASET 类型的实时分析。前端新图表不再调用此接口。
- **前端封装**: `src/api/DatabiApi.ts` 中 `analysisApi.execute` 保留，但新图表走 `MetricBiApi`

### 2.4 数据集接口（前端一期移除调用）

以下接口后端保留，但前端不再调用：

| 接口 | 方法 | 路径 | 前端处理 |
|------|------|------|---------|
| 数据集分页 | GET | `/api/v1/datasets` | 移除 datasetApi 调用 |
| 数据集列表 | GET | `/api/v1/datasets/list` | 移除 |
| 数据集详情 | GET | `/api/v1/datasets/{id}` | 移除 |
| 创建数据集 | POST | `/api/v1/datasets` | 移除 |
| 更新数据集 | PUT | `/api/v1/datasets/{id}` | 移除 |
| 删除数据集 | DELETE | `/api/v1/datasets/{id}` | 移除 |

---

## 3. 前端类型定义汇总

### 3.1 新增文件

| 文件 | 内容 |
|------|------|
| `src/api/MetricBiApi.ts` | 指标分析执行、SQL预览接口封装 |

### 3.2 改造文件

| 文件 | 改造内容 |
|------|---------|
| `src/api/DatabiApi.ts` | ChartDTO/ChartCmd 增加 analysisType 和 metricAnalysisCmd |
| `src/api/MetricApi.ts` | 新增 `biList()` 方法 |
| `src/api/MetricConfigApi.ts` | DimensionApi 新增 `biList()` 方法 |

### 3.3 类型定义

```typescript
// src/api/DatabiApi.ts

export enum AnalysisType {
  DATASET = 'DATASET',
  METRICS = 'METRICS'
}

export interface ChartDTO {
  id: string;
  name: string;
  description?: string;
  datasetId?: string;
  analysisType: AnalysisType;
  metricAnalysisCmd?: MetricBiAnalysisCmd;
  chartType: ChartType;
  dimensions?: DimensionConfig[];
  metrics?: MetricConfig[];
  filters?: FilterConfig[];
  orders?: OrderConfig[];
  limitValue?: number;
  sqlContent?: string;
  createdBy?: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface ChartCmd {
  name: string;
  description?: string;
  datasetId?: string;
  analysisType: AnalysisType;
  metricAnalysisCmd?: MetricBiAnalysisCmd;
  chartType: ChartType;
  dimensions?: DimensionConfig[];
  metrics?: MetricConfig[];
  filters?: FilterConfig[];
  orders?: OrderConfig[];
  limitValue?: number;
  sqlContent?: string;
}
```

```typescript
// src/api/MetricBiApi.ts

import { ChartType, FilterOperator, OrderDirection } from './DatabiApi';

export interface MetricBiAnalysisCmd {
  chartType: ChartType;
  metrics: MetricRef[];
  dimensions: DimensionRef[];
  filters: FilterRef[];
  orders: OrderRef[];
  limitValue?: number;
}

export interface MetricRef {
  metricId: string;
  alias?: string;
}

export interface DimensionRef {
  dimId: string;
  alias?: string;
}

export interface FilterRef {
  metricId?: string;
  dimId?: string;
  operator: FilterOperator;
  values: string[];
}

export interface OrderRef {
  metricId?: string;
  dimId?: string;
  direction: OrderDirection;
}
```

---

## 4. 前端页面改造清单

| 页面/组件 | 改造内容 |
|----------|---------|
| `src/pages/bi/index.tsx` | 侧边栏菜单移除"数据集"入口 |
| `src/pages/bi/dataset/` | **整个目录移除**（或保留但不打包） |
| `src/pages/bi/chart/ChartAnalyzer.tsx` | 重构：数据源从数据集字段改为指标库+维度库 |
| `src/pages/bi/chart/index.tsx` | 图表列表显示 analysisType 标记，按指标名称过滤 |
| `src/pages/bi/dashboard/DashboardEditor.tsx` | 不变 |
| `src/pages/bi/dashboard/DashboardViewer.tsx` | 不变（后端已处理执行路由） |
| `src/router/index.tsx` | 移除 `/bi/dataset/*` 路由 |
