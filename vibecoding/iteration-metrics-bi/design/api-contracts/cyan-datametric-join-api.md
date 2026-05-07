# cyan-datametric 指标平台 —— 跨表 JOIN 分析接口契约

## 1. 通用约定

- **Base URL**: `http://cyan-datametric:8080`
- **统一响应格式**: `Response<T>`（code/message/data）
- **认证**: Bearer Token

---

## 2. 接口列表（无新增接口，改造现有接口执行逻辑）

### 2.1 指标分析执行（逻辑改造）

- **Method**: POST
- **Path**: `/api/v1/metrics/bi/analysis/execute`
- **Request Body**: 不变（同 V1）
- **Response 200**: 不变（同 V1）
- **改造说明**:
  - `BiAnalysisServiceImpl.execute()` 内部逻辑改造
  - 当维度表 ≠ 指标事实表时，调用 dataman `/api/v1/metadata/tables/relations/join-paths` 获取 JOIN 关系
  - 生成带 JOIN 的 SQL
  - 未找到 JOIN 关系时返回友好错误：
    > "维度 '{dimName}' 所在表 '{dimTable}' 与指标事实表 '{factTable}' 之间未配置关联关系，请在元数据平台的表详情页配置。"

### 2.2 指标分析 SQL 预览（逻辑改造）

- **Method**: POST
- **Path**: `/api/v1/metrics/bi/analysis/preview-sql`
- **改造说明**: 同上，仅生成 SQL 不执行

---

## 3. 内部调用

### 3.1 指标平台 → 元数据平台

```java
// 新增内部调用
@Component
public class MetadataTableRelationClient {
    
    @Value("${cyan.dataman.base-url}")
    private String datamanBaseUrl;
    
    public List<TableRelationDTO> findJoinPaths(String factCatalog, String factSchema, String factTable,
                                                 List<String[]> dimensionTables) {
        // POST /api/v1/metadata/tables/relations/join-paths
    }
    
    public List<TableRelationDTO> getTableRelations(String catalog, String schema, String table) {
        // GET /api/v1/metadata/tables/{catalog}/{schema}/{table}/relations
    }
}
```

### 3.2 SQL 生成改造

```java
// BiAnalysisServiceImpl.buildSql() 核心逻辑

private String buildSql(MetricBiAnalysisCmd cmd) {
    // 1. 解析指标
    List<MetricInfo> metricInfos = resolveMetrics(cmd.getMetrics());
    String factTableRef = metricInfos.get(0).tableRef; // "ods.ods_user_info"
    
    // 2. 解析维度
    List<DimensionInfo> dimensionInfos = resolveDimensions(cmd.getDimensions());
    
    // 3. 收集需要 JOIN 的维度表
    Set<String> dimTableRefs = new HashSet<>();
    for (DimensionInfo dim : dimensionInfos) {
        if (dim.tableName != null && !dim.tableName.equals(factTableRef)) {
            dimTableRefs.add(dim.tableName);
        }
    }
    
    // 4. 单表直接生成（兼容存量）
    if (dimTableRefs.isEmpty()) {
        return buildSingleTableSql(metricInfos, dimensionInfos, cmd);
    }
    
    // 5. 跨表：查询 JOIN 关系
    String[] factParts = factTableRef.split("\\.");
    List<TableRelationDTO> joins = metadataClient.findJoinPaths(factParts[0], factParts[1], factParts[2], dimTableRefs);
    
    if (joins.isEmpty()) {
        throw new BusinessException("未找到 JOIN 关系...");
    }
    
    // 6. 生成带 JOIN 的 SQL
    return buildJoinSql(metricInfos, dimensionInfos, joins, cmd);
}
```

---

## 4. 删除清单

以下 Phase 3 代码全部删除：

| 文件/目录 | 说明 |
|-----------|------|
| `application/semantic/` | SemanticQueryEngine、JoinPathResolver、SemanticSqlBuilder、QueryRouter |
| `domain/semantic/` | LogicalTable、TableRelationship、SemanticMetric、MaterializedView、QueryPlan 及 Repository |
| `infra/persistence/semantic/` | DO、Mapper、RepositoryImpl、Convert |
| `adapter/semantic/` | SemanticController、DTO、Convert |
| `src/main/resources/db/migration/V*_semantic_*.sql` | 语义层表迁移脚本 |
