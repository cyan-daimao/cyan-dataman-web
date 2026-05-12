# cyan-dataauth API 接口契约

> 版本：v1.0
> 服务：cyan-dataauth（数据权限中心）
> 基地址：http://cyan-dataauth:8080

---

## 通用约定

### 响应结构

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

- `code == 200` 表示成功，非 200 表示业务错误
- 分页接口统一使用 `pageNum`（从1开始）/`pageSize`

### 认证

- 所有接口需携带 `Authorization: Bearer {token}`
- Service 间调用需携带 `X-Service-Token: {serviceToken}`

---

## 一、元数据权限接口

### 1.1 校验元数据资源权限

```
POST /api/v1/auth/check
```

**Request Body：**

```json
{
  "passport": "zhangsan",
  "resourceType": "TABLE",
  "resourceId": "iceberg.order_db.orders",
  "action": "SELECT"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| passport | string | 是 | 执行人账号 |
| resourceType | string | 是 | DATASOURCE / DB / TABLE / COLUMN / ROW |
| resourceId | string | 是 | 资源标识，如 `iceberg.order_db.orders` |
| action | string | 是 | SELECT / INSERT / UPDATE / DELETE / ALL |

**Response 200：**

```json
{
  "code": 200,
  "data": {
    "permitted": true,
    "reason": null
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| permitted | boolean | 是否允许 |
| reason | string | 拒绝原因（permitted=false 时返回） |

---

### 1.2 SQL 改写（元数据层）

```
POST /api/v1/auth/filter/sql
```

**Request Body：**

```json
{
  "passport": "zhangsan",
  "sql": "SELECT user_id, name, phone, salary FROM user_db.users WHERE status = 'active'",
  "engine": "STARROCKS"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| passport | string | 是 | 执行人账号 |
| sql | string | 是 | 原始 SQL |
| engine | string | 否 | 目标引擎，默认 STARROCKS |

**Response 200（有权限）：**

```json
{
  "code": 200,
  "data": {
    "permitted": true,
    "originalSql": "SELECT user_id, name, phone, salary FROM user_db.users WHERE status = 'active'",
    "rewrittenSql": "SELECT user_id, CONCAT(SUBSTR(name, 1, 1), '**') AS name, CONCAT(SUBSTR(phone, 1, 3), '****', SUBSTR(phone, 8, 4)) AS phone, NULL AS salary FROM user_db.users WHERE status = 'active' AND region IN ('华东')",
    "rowFilters": ["region IN ('华东')"],
    "columnMasks": [
      { "column": "name", "maskType": "NAME_MASK" },
      { "column": "phone", "maskType": "PHONE_MASK" },
      { "column": "salary", "maskType": "HIDDEN" }
    ]
  }
}
```

**Response 200（无权限）：**

```json
{
  "code": 200,
  "data": {
    "permitted": false,
    "reason": "无权限访问表 user_db.users",
    "originalSql": "...",
    "rewrittenSql": null
  }
}
```

**关键约束：**
- dataauth 只负责根据元数据层规则改写 SQL，不执行 SQL
- 如果用户无表级权限，直接返回 `permitted=false`，不返回改写后 SQL
- SQL 改写 P99 < 30ms

---

### 1.3 获取元数据资源树

```
GET /api/v1/auth/resources
```

**Query Parameters：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| passport | string | 是 | 执行人账号 |
| resourceType | string | 否 | 过滤资源类型，默认全部 |

**Response 200：**

```json
{
  "code": 200,
  "data": [
    {
      "id": "ds-001",
      "name": "MySQL-PROD",
      "type": "DATASOURCE",
      "children": [
        {
          "id": "db-001",
          "name": "order_db",
          "type": "DB",
          "children": [
            { "id": "tbl-001", "name": "orders", "type": "TABLE", "permission": "READ" }
          ]
        }
      ]
    }
  ]
}
```

---

## 二、指标平台权限接口

### 2.1 校验指标/维度权限

```
POST /api/v1/auth/metric/check
```

**Request Body：**

```json
{
  "passport": "zhangsan",
  "checkItems": [
    { "resourceType": "METRIC", "resourceId": "GMV", "action": "USE" },
    { "resourceType": "DIMENSION", "resourceId": "REGION", "action": "USE" },
    { "resourceType": "MODIFIER", "resourceId": "EAST_CHINA", "action": "USE" }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| passport | string | 是 | 执行人账号 |
| checkItems | array | 是 | 待校验项列表 |
| checkItems[].resourceType | string | 是 | SUBJECT / METRIC / DIMENSION / MODIFIER |
| checkItems[].resourceId | string | 是 | 资源编码 |
| checkItems[].action | string | 是 | VIEW / USE / EDIT / PUBLISH / OFFLINE / VALUES |

**Response 200：**

```json
{
  "code": 200,
  "data": {
    "allPermitted": false,
    "results": [
      { "resourceType": "METRIC", "resourceId": "GMV", "permitted": true },
      { "resourceType": "DIMENSION", "resourceId": "REGION", "permitted": true },
      { "resourceType": "MODIFIER", "resourceId": "EAST_CHINA", "permitted": false, "reason": "无权限使用修饰词 EAST_CHINA" }
    ]
  }
}
```

---

### 2.2 获取指标/维度列表（按权限过滤）

```
GET /api/v1/auth/metric/list
```

**Query Parameters：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| passport | string | 是 | 执行人账号 |
| resourceType | string | 是 | METRIC / DIMENSION / MODIFIER |
| subjectCode | string | 否 | 按主题域过滤 |
| action | string | 否 | 默认 USE |

**Response 200：**

```json
{
  "code": 200,
  "data": [
    { "id": "metric-001", "code": "GMV", "name": "成交金额", "subjectCode": "TRADE", "subjectName": "交易" }
  ]
}
```

---

### 2.3 SQL 改写（指标层）

```
POST /api/v1/auth/metric/filter/sql
```

**Request Body：**

```json
{
  "passport": "zhangsan",
  "sql": "SELECT region, SUM(amount) AS gmv FROM iceberg.order_db.orders GROUP BY region",
  "metricCodes": ["GMV"],
  "dimCodes": ["REGION"],
  "engine": "STARROCKS"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| passport | string | 是 | 执行人账号 |
| sql | string | 是 | 原始业务 SQL |
| metricCodes | array | 是 | 本次查询涉及的指标编码列表 |
| dimCodes | array | 是 | 本次查询涉及的维度编码列表 |
| engine | string | 否 | 目标引擎，默认 STARROCKS |

**Response 200（有权限）：**

```json
{
  "code": 200,
  "data": {
    "permitted": true,
    "originalSql": "SELECT region, SUM(amount) AS gmv FROM iceberg.order_db.orders GROUP BY region",
    "rewrittenSql": "SELECT region, SUM(amount) AS gmv FROM iceberg.order_db.orders WHERE region IN ('华东') GROUP BY region",
    "rowFilters": ["region IN ('华东')"]
  }
}
```

**关键约束：**
- dataauth 只负责根据**指标层规则**改写 SQL，不执行 SQL
- 指标层规则与元数据层规则**完全隔离**
- 如果用户无指标/维度权限，直接返回 `permitted=false`

---

## 三、审批接口

### 3.1 提交权限申请

```
POST /api/v1/approval/submit
```

**Request Body：**

```json
{
  "applicantPassport": "zhangsan",
  "approvalType": "METRIC_PERMISSION",
  "resourceType": "METRIC",
  "resourceId": "GMV",
  "action": "USE",
  "reason": "月度复盘需要查看 GMV 指标",
  "expireDays": 90
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| applicantPassport | string | 是 | 申请人账号 |
| approvalType | string | 是 | METRIC_PERMISSION / DATA_PERMISSION / ROLE_CHANGE |
| resourceType | string | 是 | 见各权限类型 |
| resourceId | string | 是 | 资源标识 |
| action | string | 是 | 申请的操作权限 |
| reason | string | 是 | 申请理由（不少于5字） |
| expireDays | int | 否 | 权限有效期（天），默认永久 |

**Response 200：**

```json
{
  "code": 200,
  "data": {
    "approvalId": "APV-20260512-001",
    "status": "PENDING",
    "currentNode": "直属上级审批",
    "submittedAt": "2026-05-12T10:30:00+08:00"
  }
}
```

---

### 3.2 查询审批列表

```
GET /api/v1/approval/list
```

**Query Parameters：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| passport | string | 是 | 查询人账号 |
| status | string | 否 | PENDING / APPROVED / REJECTED |
| type | string | 否 | 审批类型过滤 |
| pageNum | int | 否 | 默认1 |
| pageSize | int | 否 | 默认20 |

---

### 3.3 审批操作

```
POST /api/v1/approval/{approvalId}/action
```

**Request Body：**

```json
{
  "operatorPassport": "lisi",
  "action": "APPROVE",
  "comment": "同意"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| operatorPassport | string | 是 | 审批人账号 |
| action | string | 是 | APPROVE / REJECT / TRANSFER |
| comment | string | 否 | 审批意见 |
| transferTo | string | 否 | action=TRANSFER 时必填，转交目标人 |

---

## 四、审计日志接口

### 4.1 查询审计日志

```
GET /api/v1/audit/logs
```

**Query Parameters：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| passport | string | 否 | 按用户过滤 |
| action | string | 否 | LOGIN / LOGOUT / SQL_EXECUTE / PERMISSION_CHANGE / APPROVAL |
| resourceType | string | 否 | 资源类型过滤 |
| startTime | string | 否 | ISO 8601 格式 |
| endTime | string | 否 | ISO 8601 格式 |
| pageNum | int | 否 | 默认1 |
| pageSize | int | 否 | 默认20 |

**Response 200：**

```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": "AUD-001",
        "userId": "zhangsan",
        "action": "SQL_EXECUTE",
        "resourceType": "TABLE",
        "resourceId": "iceberg.order_db.orders",
        "originalSql": "SELECT * FROM orders",
        "rewrittenSql": "SELECT user_id, name FROM orders WHERE region='华东'",
        "ip": "10.0.1.23",
        "costTimeMs": 125,
        "riskLevel": "LOW",
        "timestamp": "2026-05-12T10:30:00+08:00"
      }
    ],
    "total": 100
  }
}
```

---

## 五、管理接口

### 5.1 角色管理

见功能权限章节，标准 CRUD。

### 5.2 权限策略管理

见数据权限和指标平台权限章节，标准 CRUD + 优先级调整。

---

## 错误码

| 错误码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未登录或 Token 过期 |
| 403 | 无权限（功能权限不足） |
| 403001 | 无元数据权限（表/字段/行/列） |
| 403002 | 无指标权限（指标/维度/修饰词） |
| 404 | 资源不存在 |
| 500 | 系统内部错误 |
