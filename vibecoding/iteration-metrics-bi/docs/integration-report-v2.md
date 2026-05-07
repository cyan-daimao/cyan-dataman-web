# 联调自测报告 V2 —— 元数据表关系管理 + 指标跨表 JOIN

**迭代**: iteration-metrics-bi V2  
**日期**: 2026-05-07  
**状态**: 开发完成，三端编译全部通过

---

## 1. 各端开发完成度

### 1.1 元数据平台后端（cyan-dataman）

| 模块 | 完成度 | 编译状态 |
|------|--------|---------|
| MetadataTableRelationDO | ✅ 100% | ✅ BUILD SUCCESS |
| MetadataTableRelationMapper | ✅ 100% | ✅ |
| TableRelationRepository | ✅ 100% | ✅ |
| TableRelationServiceImpl | ✅ 100% | ✅ |
| TableRelationController（4个接口） | ✅ 100% | ✅ |
| DTO / Cmd | ✅ 100% | ✅ |

**新增文件**: 12 个 Java 文件  
**新增表**: `metadata_table_relation`

**新增 API**：
- `GET /api/v1/metadata/tables/{catalog}/{schema}/{table}/relations`
- `POST /api/v1/metadata/tables/relations`
- `DELETE /api/v1/metadata/tables/relations/{id}`
- `POST /api/v1/metadata/tables/relations/join-paths`

### 1.2 指标平台后端（cyan-datametric）

| 模块 | 完成度 | 编译状态 |
|------|--------|---------|
| 删除 Phase 3 代码 | ✅ 100% | ✅ BUILD SUCCESS |
| MetadataTableRelationClient | ✅ 100% | ✅ |
| BiAnalysisServiceImpl 改造 | ✅ 100% | ✅ |
| buildJoinSql 方法 | ✅ 100% | ✅ |

**删除文件/目录**: `application/semantic/`、`domain/semantic/`、`infra/persistence/semantic/`、`adapter/semantic/`

**新增文件**: `infra/client/MetadataTableRelationClient.java`、`infra/client/dto/TableRelationDTO.java`、`infra/client/dto/FindJoinPathsRequest.java`

### 1.3 前端（cyan-dataman-web）

| 模块 | 完成度 | 编译状态 |
|------|--------|---------|
| MetadataTableAPI 新增类型 | ✅ 100% | ✅ tsc --noEmit 通过 |
| TableRelations.tsx 组件 | ✅ 100% | ✅ |
| TableDetailPage 改造 | ✅ 100% | ✅ |

**新增文件**: `src/pages/metadata/metadata_table/detail/TableRelations.tsx`  
**修改文件**: `src/api/MetadataTableAPI.ts`、`src/pages/metadata/metadata_table/TableDetailPage.tsx`

---

## 2. 端到端链路

```
[前端] 元数据平台 → 表详情页 → 关联关系 Tab
  → 配置：ods_user_info.city_id = dim_public_cn_city.id
  → POST /api/v1/metadata/tables/relations
  → [dataman] 存入 metadata_table_relation

[前端] BI 图表分析器
  → 选指标：用户数（来自 ods_user_info）
  → 选维度：城市维度（来自 dim_public_cn_city）
  → POST /api/v1/metrics/bi/analysis/execute
    → [datametric] BiAnalysisServiceImpl
      → 解析指标 → 事实表 ods_user_info
      → 解析维度 → 维度表 dim_public_cn_city
      → 发现不同表 → 调用 dataman /api/v1/metadata/tables/relations/join-paths
      → 获取 JOIN 关系：ods_user_info.city_id = dim_public_cn_city.id
      → 生成 SQL：
        SELECT t1.city_name AS `城市维度`, COUNT(DISTINCT t0.user_id) AS `用户数`
        FROM ods.ods_user_info t0
        LEFT JOIN dim_public_cn_city t1 ON t0.city_id = t1.id
        GROUP BY t1.city_name
        LIMIT 1000
      → 调用 datagateway 执行
      → 返回 ChartDataDTO
```

---

## 3. 数据库迁移

```sql
CREATE TABLE IF NOT EXISTS metadata_table_relation (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    source_catalog  VARCHAR(128) NOT NULL,
    source_schema   VARCHAR(128) NOT NULL,
    source_table    VARCHAR(128) NOT NULL,
    source_column   VARCHAR(128) NOT NULL,
    target_catalog  VARCHAR(128) NOT NULL,
    target_schema   VARCHAR(128) NOT NULL,
    target_table    VARCHAR(128) NOT NULL,
    target_column   VARCHAR(128) NOT NULL,
    join_type       VARCHAR(20)  DEFAULT 'LEFT',
    description     VARCHAR(500),
    created_by      VARCHAR(100),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_source (source_catalog, source_schema, source_table),
    INDEX idx_target (target_catalog, target_schema, target_table)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='元数据-表关系';
```

---

## 4. 配置变更

### datametric application.yml

```yaml
cyan:
  dataman:
    base-url: http://cyan-dataman:8080
```

---

## 5. 下一步行动

| 序号 | 任务 | 说明 |
|------|------|------|
| 1 | 执行数据库迁移 | 在 cyan_dataman 库创建 metadata_table_relation 表 |
| 2 | 配置 datametric → dataman 地址 | application.yml 或 Nacos |
| 3 | 部署 dataman 后端 | 验证表关系 CRUD 接口 |
| 4 | 部署 datametric 后端 | 验证 JOIN SQL 生成 |
| 5 | 前端构建部署 | 验证表关系 Tab 页面 |
| 6 | 配置 JOIN 关系 | 在元数据平台配置事实表和维度表的关联 |
| 7 | 端到端联调 | 完整链路测试 |
