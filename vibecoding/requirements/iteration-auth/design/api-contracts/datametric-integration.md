# cyan-datametric 集成说明

> 版本：v1.0
> 服务：cyan-datametric（指标服务）

## 集成背景

cyan-datametric 当前指标 BI 分析链路：
1. `MetricBiAnalysisServiceImpl.execute()` 接收 DSL
2. `MetricResolver` 展开指标
3. `MetricSqlBuilder` 生成业务 SQL
4. `SqlGatewayClient.executeStarRocksSql()` 调用 datagateway 执行

**调整后链路**（指标权限线完全独立）：
1. `MetricBiAnalysisServiceImpl.execute()` 接收 DSL
2. **新增：调用 `cyan-dataauth` 校验指标/维度/修饰词权限**
   - 无权限 → 直接返回 403
3. `MetricResolver` 展开指标
4. `MetricSqlBuilder` 生成业务 SQL
5. **新增：调用 `cyan-dataauth` `/auth/metric/filter/sql` 进行指标层 SQL 改写**
   - 无权限 → 返回拒绝
   - 有权限 → 返回改写后 SQL（含指标层行过滤）
6. **调整：调用 `SqlGatewayClient.executeMetricSql()`（新增入口）**
   - 传入改写后的 SQL
   - datagateway 纯执行，不再做权限校验
7. 返回查询结果

## 集成点清单

### 1. 新增 dataauth-client 依赖

在 `cyan-datametric-application` 的 `pom.xml` 中引入 `cyan-dataauth-client`（待 dataauth 提供 client 包）。

Phase 1 可先通过 HTTP 调用（RestTemplate / WebClient）对接，后续替换为 FeignClient。

### 2. 指标/维度列表查询过滤

在 `MetricBiAnalysisServiceImpl.listMetrics()` 和 `listDimensions()` 中：
- 查询全量指标/维度后，调用 `cyan-dataauth` 过滤掉用户无 VIEW 权限的项
- 或直接调用 `cyan-dataauth` 的 `/auth/metric/list` 接口获取已过滤的列表

### 3. 维度值查询权限校验

在 `MetricBiAnalysisServiceImpl.listDimensionValues()` 中：
- 查询维度值前，调用 `cyan-dataauth` 校验该用户是否有该维度的 `VALUES` 权限
- 无权限 → 返回空列表或 403

### 4. BI 分析执行前权限校验

在 `MetricBiAnalysisServiceImpl.execute()` 开头：
- 提取 `cmd` 中的 `metricCodes` 和 `dimCodes`
- 调用 `cyan-dataauth /auth/metric/check`
- 任一指标/维度无 USE 权限 → 直接返回 403，不生成 SQL

### 5. SQL 改写调用

在 `MetricSqlBuilder.build()` 生成 SQL 后：
- 调用 `cyan-dataauth /auth/metric/filter/sql`
- 传入原始 SQL + metricCodes + dimCodes
- 接收改写后 SQL，替换原始 SQL 继续执行

### 6. 调用 datagateway 调整

将 `SqlGatewayClient.executeStarRocksSql()` 替换为 `SqlGatewayClient.executeMetricSql()`：
- 两者接口参数完全相同
- 只是路径不同，便于 datagateway 审计区分来源

## 接口调用示例

```java
// 1. 权限校验
MetricPermissionCheckCmd checkCmd = new MetricPermissionCheckCmd()
    .setPassport(executor)
    .setCheckItems(Arrays.asList(
        new CheckItem("METRIC", "GMV", "USE"),
        new CheckItem("DIMENSION", "REGION", "USE")
    ));
Response<MetricPermissionCheckResult> checkResp = dataauthClient.checkMetricPermission(checkCmd);
if (!checkResp.getData().isAllPermitted()) {
    throw new BusinessException("无权限使用指定指标或维度");
}

// 2. 生成 SQL
String sql = metricSqlBuilder.build(cmd, resolvedMetrics, tableName);

// 3. SQL 改写（指标层）
MetricFilterSqlCmd filterCmd = new MetricFilterSqlCmd()
    .setPassport(executor)
    .setSql(sql)
    .setMetricCodes(Arrays.asList("GMV"))
    .setDimCodes(Arrays.asList("REGION"));
Response<MetricFilterSqlResult> filterResp = dataauthClient.filterMetricSql(filterCmd);
if (!filterResp.getData().isPermitted()) {
    throw new BusinessException(filterResp.getData().getReason());
}
String rewrittenSql = filterResp.getData().getRewrittenSql();

// 4. 执行（通过 metric 入口）
SqlExecuteCmd executeCmd = new SqlExecuteCmd()
    .setSql(rewrittenSql)
    .setPassport(executor);
Response<SqlExecuteResultDTO> executeResp = sqlGatewayClient.executeMetricSql(executeCmd);
```
