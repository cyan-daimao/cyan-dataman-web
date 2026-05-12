# cyan-datagateway 调整说明

> 版本：v1.0
> 服务：cyan-datagateway（SQL 网关）

## 调整背景

cyan-datagateway 当前职责：接收 SQL → 执行 → 返回结果。

cyan-datagateway **原有的数据权限校验逻辑（`DataPermissionRepositoryImpl`）本次不做实际对接**，保留空实现作为占位。真正的权限校验和 SQL 改写全部上移到 `cyan-dataauth`。

## 调整后职责

- **纯 SQL 执行网关**：只负责接收 SQL 并下发到 StarRocks / Spark 执行，**不做任何权限校验，不做任何 SQL 改写**。
- 保留 HTTP 入口和 RPC 入口，供不同调用方使用。

## 接口调整

### 1. 现有入口保持不变

```
POST /api/v1/starrocks/sql/execute   —— SQL 编辑器、数据加工调用
POST /rpc/v1/datagateway/starrocks/execute  —— RPC 调用
```

以上入口继续存在，但内部逻辑简化为：
1. 接收 SQL
2. 记录执行日志
3. 下发 StarRocks 执行
4. 返回结果

（不再调用 `DataPermissionRepositoryImpl.checkPermission`）

### 2. 新增 Metric 执行入口（HTTP）

```
POST /api/v1/starrocks/metric/execute
```

**Request Body：** 与现有 `SqlExecuteCmd` 相同

```json
{
  "sql": "改写后的业务 SQL",
  "passport": "zhangsan"
}
```

**Response：** 与现有 `SqlExecuteResultDTO` 相同

**与现有入口的区别：**
- 路径不同，便于审计区分来源
- 内部执行逻辑完全相同（都是纯执行）
- 日志中标记 `source=METRIC`，便于区分指标分析和 SQL 查询

### 3. RPC 客户端调整（cyan-datagateway-client）

在 `SqlGatewayClient` 中新增方法：

```java
@FeignClient(name = "cyan-datagateway", path = "/rpc/v1/datagateway")
public interface SqlGatewayClient {

    @PostMapping("/starrocks/execute")
    Response<SqlExecuteResultDTO> executeStarRocksSql(@RequestBody SqlExecuteCmd cmd);

    @PostMapping("/spark/execute")
    Response<SqlExecuteResultDTO> executeSparkSql(@RequestBody SqlExecuteCmd cmd);

    /**
     * 新增：指标分析 SQL 执行入口
     * 与 starrocks/execute 内部逻辑相同，仅路径不同便于区分来源
     */
    @PostMapping("/starrocks/metric/execute")
    Response<SqlExecuteResultDTO> executeMetricSql(@RequestBody SqlExecuteCmd cmd);
}
```

## 实现要点

1. `StarRocksSqlController` 新增 `executeMetric` 方法，映射到 `/api/v1/starrocks/metric/execute`
2. `SqlGatewayRPC` 新增 `executeMetricSql` 方法，映射到 `/rpc/v1/datagateway/starrocks/metric/execute`
3. 两者共用现有的 `SqlExecuteService.execute()` 逻辑
4. 执行日志中增加 `source` 字段标记来源（SQL / METRIC / SPARK）
