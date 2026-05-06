# cyan-datametric 指标服务 —— BI 分析接口契约

## 1. 通用约定

- **Base URL**: `http://cyan-datametric:8080`
- **统一响应格式**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": { ... }
  }
  ```
- **认证**: Bearer Token，通过 Header `Authorization: Bearer {token}` 传递
- **分页参数**: `current` (页码，从1开始), `size` (每页大小)
- **时间格式**: ISO 8601

---

## 2. 接口列表

### 2.1 指标分析执行

执行指标分析查询，后端解析 DSL 生成 SQL 并通过数据网关执行。

- **Method**: POST
- **Path**: `/api/v1/metrics/bi/analysis/execute`
- **Request Body**:
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

- **字段说明**:

  | 字段 | 类型 | 必填 | 说明 |
  |------|------|------|------|
  | `chartType` | string | 是 | TABLE / BAR / LINE / PIE / SCATTER / AREA / NUMBER |
  | `metrics` | array | 是 | 至少1个 |
  | `metrics[].metricId` | string | 是 | 指标ID |
  | `metrics[].alias` | string | 否 | 别名，默认使用指标名称 |
  | `dimensions` | array | 否 | 最多3个 |
  | `dimensions[].dimId` | string | 是 | 维度ID |
  | `dimensions[].alias` | string | 否 | 别名，默认使用维度名称 |
  | `filters` | array | 否 | |
  | `filters[].metricId` | string | 否 | 指标级过滤（与dimId二选一） |
  | `filters[].dimId` | string | 否 | 维度级过滤（与metricId二选一） |
  | `filters[].operator` | string | 是 | EQ/NE/GT/GTE/LT/LTE/IN/NOT_IN/BETWEEN/IS_NULL/IS_NOT_NULL/LIKE/NOT_LIKE |
  | `filters[].values` | array[string] | 是 | 过滤值 |
  | `orders` | array | 否 | |
  | `orders[].metricId` | string | 否 | |
  | `orders[].dimId` | string | 否 | |
  | `orders[].direction` | string | 是 | ASC / DESC |
  | `limitValue` | integer | 否 | 默认1000，最大10000 |

- **Response 200**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "status": "SUCCESS",
      "costTimeMs": 123,
      "columns": ["渠道", "GMV", "订单数"],
      "rows": [
        { "渠道": "APP", "GMV": 100000, "订单数": 500 },
        { "渠道": "小程序", "GMV": 85000, "订单数": 420 }
      ],
      "sql": "SELECT channel AS `渠道`, SUM(amount) AS `GMV`, COUNT(order_id) AS `订单数` FROM ..."
    }
  }
  ```

- **Error Codes**:
  | Code | 说明 |
  |------|------|
  | 400 | 参数校验失败 |
  | 400001 | 指标不存在或已下线 |
  | 400002 | 维度不存在 |
  | 400003 | 多指标事实表不一致（不支持跨表） |
  | 400004 | 复合指标公式解析失败 |
  | 500 | SQL 生成或执行失败 |

---

### 2.2 指标分析 SQL 预览

仅生成 SQL，不执行。

- **Method**: POST
- **Path**: `/api/v1/metrics/bi/analysis/preview-sql`
- **Request Body**: 同 2.1
- **Response 200**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": "SELECT channel AS `渠道`, SUM(amount) AS `GMV` FROM ..."
  }
  ```

---

### 2.3 指标列表（BI 用）

返回简化字段的指标列表，供图表分析器侧边栏使用。

- **Method**: GET
- **Path**: `/api/v1/metrics/bi/list`
- **Query Parameters**:
  | 参数 | 类型 | 必填 | 说明 |
  |------|------|------|------|
  | `name` | string | 否 | 按名称模糊搜索 |
  | `subjectCode` | string | 否 | 按主题域筛选 |
  | `metricType` | string | 否 | ATOMIC/DERIVED/COMPOSITE |

- **Response 200**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": [
      {
        "id": "M001",
        "metricCode": "M001",
        "metricName": "GMV",
        "metricType": "ATOMIC",
        "subjectCode": "S001",
        "subjectName": "交易主题",
        "statFunc": "SUM",
        "dataType": "DECIMAL",
        "description": "订单成交金额"
      }
    ]
  }
  ```

- **字段说明**:

  | 字段 | 说明 |
  |------|------|
  | `id` | 指标ID |
  | `metricCode` | 指标编码 |
  | `metricName` | 指标名称 |
  | `metricType` | 指标类型 |
  | `subjectCode` | 主题域编码 |
  | `subjectName` | 主题域名称 |
  | `statFunc` | 聚合函数（原子/派生指标有值） |
  | `dataType` | 数据类型（来自原子指标的col类型） |
  | `description` | 描述 |

---

### 2.4 维度列表（BI 用）

返回简化字段的维度列表，供图表分析器侧边栏使用。

- **Method**: GET
- **Path**: `/api/v1/metrics/bi/dimensions`
- **Query Parameters**:
  | 参数 | 类型 | 必填 | 说明 |
  |------|------|------|------|
  | `name` | string | 否 | 按名称模糊搜索 |
  | `categoryId` | string | 否 | 按分类筛选 |

- **Response 200**:
  ```json
  {
    "code": 200,
    "message": "success",
    "data": [
      {
        "id": "D001",
        "dimCode": "D001",
        "dimName": "渠道",
        "dimType": "ENUM",
        "dataType": "STRING",
        "tableName": "dim_channel",
        "columnName": "channel_name",
        "categoryName": "交易维度"
      }
    ]
  }
  ```

- **字段说明**:

  | 字段 | 说明 |
  |------|------|
  | `id` | 维度ID |
  | `dimCode` | 维度编码 |
  | `dimName` | 维度名称 |
  | `dimType` | 维度类型 |
  | `dataType` | 数据类型 |
  | `tableName` | 关联维表（如有） |
  | `columnName` | 物理字段名 |
  | `categoryName` | 所属分类名称 |

---

## 3. 后端内部调用

### 3.1 指标服务 → 数据网关

指标服务生成 SQL 后，需要通过 `cyan-datagateway-client` 调用数据网关执行。

```java
SqlExecuteCmd executeCmd = new SqlExecuteCmd()
    .setSql(sql)
    .setPassport(executor);

Response<SqlExecuteResultDTO> response = 
    sqlGatewayClient.executeStarRocksSql(executeCmd);
```

依赖: `cyan-datagateway-client`（已存在于 cyan-datametric 的 pom.xml 中）。

---

## 4. 核心领域逻辑

### 4.1 DSL 解析流程

```
MetricBiAnalysisCmd
  ↓
MetricResolver.resolve(metrics)
  ├─ 复合指标: 展开 formula，递归解析引用的指标
  ├─ 派生指标: 加载原子指标 + 修饰词 + 时间周期
  └─ 原子指标: 直接使用
  ↓
TableConsistencyChecker.check(resolvedMetrics, dimensions)
  └─ 校验所有原子指标是否来自同一事实表（dbName.tblName）
  ↓
MetricSqlBuilder.build(cmd, resolvedMetrics)
  ├─ SELECT: 维度列 + 聚合指标列（含别名）
  ├─ FROM: 事实表
  ├─ WHERE: 原子指标过滤 + 修饰词过滤 + 时间周期过滤 + 用户过滤
  ├─ GROUP BY: 维度列
  ├─ ORDER BY: 排序列
  └─ LIMIT: limitValue
  ↓
SqlGatewayClient.executeStarRocksSql(sql)
  ↓
ChartDataDTO
```

### 4.2 复合指标展开规则

复合指标公式示例: `${M001} / ${M002} * 100`

展开步骤:
1. 正则提取 `${Mxxx}` → 得到 [M001, M002]
2. 递归解析 M001 和 M002（可能是原子/派生/复合）
3. 最终全部展开为原子指标
4. 如果所有原子指标同事实表 → 生成单表联合查询
5. 如果跨事实表 → 一期返回错误 `400003`

### 4.3 过滤条件合并规则

| 过滤来源 | 优先级 | 说明 |
|----------|--------|------|
| 原子指标自带 filterCondition | 1 | 指标定义时固化的过滤 |
| 派生指标的 modifierIds | 2 | 修饰词定义的过滤 |
| 派生指标的 timePeriodId | 3 | 时间周期过滤 |
| 用户传入的 filters | 4 | 图表分析时的动态过滤 |

合并方式: 所有过滤条件以 `AND` 连接。如果同一字段有多层过滤，也是 `AND` 关系。
