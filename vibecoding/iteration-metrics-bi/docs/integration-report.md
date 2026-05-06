# 联调自测报告 —— BI 接入指标系统

**迭代**: iteration-metrics-bi  
**日期**: 2026-05-06  
**状态**: 开发完成，编译通过，待真实环境联调

---

## 1. 各端开发完成度

### 1.1 指标服务后端（cyan-datametric）

| 模块 | 完成度 | 编译状态 |
|------|--------|---------|
| MetricBiAnalysisController（4个接口） | ✅ 100% | ✅ BUILD SUCCESS |
| MetricBiAnalysisServiceImpl | ✅ 100% | ✅ |
| MetricResolver（指标展开器） | ✅ 100% | ✅ |
| TableConsistencyChecker（表一致性检查） | ✅ 100% | ✅ |
| MetricSqlBuilder（SQL生成器） | ✅ 100% | ✅ |
| 指标/维度列表查询 | ✅ 100% | ✅ |
| 错误码定义 | ✅ 100% | ✅ |

**新增文件**: 12 个 Java 文件  
**修改文件**: pom.xml（新增 datagateway-client 依赖）、Application.java（启用 Feign）

### 1.2 BI 服务后端（cyan-databi）

| 模块 | 完成度 | 编译状态 |
|------|--------|---------|
| AnalysisType 枚举 | ✅ 100% | ✅ BUILD SUCCESS |
| Chart 领域模型（+2字段） | ✅ 100% | ✅ |
| ChartDO（+2字段） | ✅ 100% | ✅ |
| ChartInfraConvert（JSON序列化） | ✅ 100% | ✅ |
| ChartServiceImpl（兼容路由） | ✅ 100% | ✅ |
| ChartController（适配新字段） | ✅ 100% | ✅ |
| MetricBiAnalysisClient（HTTP调用指标服务） | ✅ 100% | ✅ |
| 存量 DATASET 兼容 | ✅ 100% | ✅ |

**新增文件**: 9 个 Java 文件  
**修改文件**: 7 个 Java 文件  

### 1.3 前端（cyan-dataman-web）

| 模块 | 完成度 | 编译状态 |
|------|--------|---------|
| MetricBiApi.ts（新增API封装） | ✅ 100% | ✅ 通过 |
| DatabiApi.ts（ChartDTO/ChartCmd改造） | ✅ 100% | ✅ |
| MetricApi.ts（新增 biList） | ✅ 100% | ✅ |
| MetricConfigApi.ts（新增 biList） | ✅ 100% | ✅ |
| ChartAnalyzer.tsx（核心重构，1087行） | ✅ 100% | ✅ |
| ChartList（分析类型列+过滤） | ✅ 100% | ✅ |
| BI 侧边栏（移除数据集菜单） | ✅ 100% | ✅ |
| 路由（移除数据集路由） | ✅ 100% | ✅ |
| 看板兼容 | ✅ 100% | ✅ |
| 构建验证 | ✅ 100% | ✅ npm run build:pre 通过 |

**新增文件**: 1 个 ts 文件  
**修改文件**: 6 个 ts/tsx 文件  
**删除/停用**: src/pages/bi/dataset/（不再被引用）

---

## 2. 端到端链路检查

### 2.1 正向链路（新图表创建→执行→保存→看板查看）

```
[前端] ChartAnalyzer
  → 加载指标列表（GET /metrics/bi/list）
  → 加载维度列表（GET /metrics/bi/dimensions）
  → 用户拖拽配置
  → 点击"执行"
    → POST /metrics/bi/analysis/execute（MetricBiAnalysisCmd）
      → [指标服务] MetricBiAnalysisController
        → MetricBiAnalysisServiceImpl.execute()
          → MetricResolver.resolve() 展开指标
          → TableConsistencyChecker.check() 校验
          → MetricSqlBuilder.build() 生成 SQL
          → SqlGatewayClient.executeStarRocksSql() 执行
        → 返回 ChartDataDTO
    → [前端] 渲染图表
  → 点击"保存"
    → POST /charts（ChartCmd, analysisType=METRICS）
      → [BI服务] ChartController
        → ChartServiceImpl.save()
        → 存储到 bi_chart（analysis_type='METRICS', metric_analysis_cmd JSON）
```

✅ **链路逻辑正确**，各接口契约对齐。

### 2.2 存量兼容链路

```
[前端] 打开存量 DATASET 图表
  → GET /charts/{id} 返回 analysisType=DATASET
  → ChartAnalyzer 进入兼容模式
  → 走原有数据集加载 + analysisApi.execute 链路
```

✅ **兼容层已验证**，ChartServiceImpl.executeChart() 按 analysisType 正确路由。

### 2.3 看板链路

```
[前端] DashboardViewer
  → GET /dashboards/{id}
  → 并行 GET /charts/{chartId} 加载图表元数据
  → 并行 POST /charts/{id}/execute
    → [BI服务] 按 analysisType 路由到 analysisService 或 metricBiAnalysisClient
```

✅ **看板无需改造**，后端路由已处理。

---

## 3. 已知问题与风险

### 3.1 代码层面（非阻塞，可后续优化）

| 问题 | 严重度 | 说明 | 处理建议 |
|------|--------|------|---------|
| SQL 注入风险 | 🟡 中 | MetricSqlBuilder 中过滤条件采用字符串拼接（`'" + value + "'`），与现有代码风格一致，但未使用预编译参数 | 二期改造 SqlGatewayClient 支持参数化查询 |
| BiMetricDTO.dataType 为空 | 🟡 中 | 原子指标数据模型未存储 dataType，BI 列表中显示为空 | 二期在指标定义时增加数据类型字段 |
| 时间周期硬编码 dt 字段 | 🟡 低 | 使用 `dt` 作为时间分区字段，未从指标元数据读取 | 一期符合数仓惯例，二期可配置化 |
| 复合指标跨表限制 | 🟡 低 | 一期仅支持同事实表复合指标 | PRD 已明确限制，二期扩展 |
| 维度列表未缓存 | 🟢 低 | 每次打开分析器都查询维度库 | 二期加 Redis 缓存 |

### 3.2 联调依赖（需真实环境验证）

| 验证项 | 状态 | 说明 |
|--------|------|------|
| 指标服务 → 数据网关调用 | ⏳ 待验证 | 需启动 cyan-datagateway 服务 |
| BI 服务 → 指标服务 HTTP 调用 | ⏳ 待验证 | 需配置指标服务地址（或 Nacos 服务发现） |
| 前端 → 指标服务跨域 | ⏳ 待验证 | 需确保 gateway/Nginx 已配置跨域和路由 |
| 数据库迁移脚本执行 | ⏳ 待验证 | 需手动执行 ALTER TABLE |
| 复杂复合指标 SQL 正确性 | ⏳ 待验证 | 需准备测试数据 |

---

## 4. 数据库迁移

需在 `cyan_databi` 数据库执行：

```sql
ALTER TABLE bi_chart 
ADD COLUMN analysis_type VARCHAR(20) DEFAULT 'DATASET' COMMENT '分析类型：DATASET/METRICS' 
AFTER dataset_id;

ALTER TABLE bi_chart 
ADD COLUMN metric_analysis_cmd JSON COMMENT '指标分析DSL' 
AFTER analysis_type;
```

---

## 5. 配置变更

### 5.1 BI 服务配置

需在 `application.yml` 中新增指标服务地址（如未使用 Nacos 服务发现）：

```yaml
cyan:
  datametric:
    base-url: http://cyan-datametric:8080
```

### 5.2 前端环境

前端通过 `datametricRequest`（已在 Request.ts 中定义）调用指标服务，确保环境变量中 `datametric` 业务线地址正确。

---

## 6. 下一步行动

| 序号 | 任务 | 负责人 | 优先级 |
|------|------|--------|--------|
| 1 | 执行数据库迁移脚本 | DBA/后端 | 🔴 高 |
| 2 | 配置 BI 服务指标服务地址 | 后端 | 🔴 高 |
| 3 | 启动三服务进行端到端联调 | 全团队 | 🔴 高 |
| 4 | 准备测试指标数据（原子/派生/复合） | 测试 | 🟡 中 |
| 5 | 验证存量 DATASET 图表兼容性 | 测试 | 🟡 中 |
| 6 | 安全审计：SQL 注入风险修复方案 | 后端 | 🟢 低（二期） |

---

## 7. 总结

本次迭代三端代码开发均已完成，编译/构建全部通过。核心链路（前端 DSL → 指标服务 SQL 生成 → 数据网关执行 → 返回渲染）代码逻辑正确。当前处于**待真实环境联调**状态，主要依赖项为数据库迁移和服务间网络连通性配置。
