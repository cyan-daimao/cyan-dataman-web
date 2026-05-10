# 联调报告 — BI 看板布局与图表联动

## 一、各端完成情况

### 1.1 后端 cyan-databi

| 任务 | 状态 | 文件 |
|------|------|------|
| 扩展 ChartType 枚举 | ✅ | `domain/chart/ChartType.java` |
| 扩展 ChartRefValObj | ✅ | `domain/dashboard/valobj/ChartRefValObj.java` |
| 存量数据兼容 | ✅ | `infra/persistence/dashboard/convert/DashboardInfraConvert.java` |
| 新增 GET /dashboards/{id}/charts | ✅ | `adapter/dashboard/http/DashboardController.java` + `DashboardChartRefDTO.java` |
| 改造 execute 支持自定义 DSL | ✅ | `adapter/chart/http/ChartController.java` + `ChartExecuteCmd.java` + `ChartServiceImpl.java` |
| 编译验证 | ✅ | `mvn compile -DskipTests` 通过 |

### 1.2 后端 cyan-datametric

| 任务 | 状态 | 文件 |
|------|------|------|
| 新建 ChartType 枚举 | ✅ | `cyan-datametric-client/.../enums/ChartType.java` |
| 筛选框图表 SQL 生成 | ✅ | `application/analysis/impl/BiAnalysisServiceImpl.java`（新增 `buildFilterSql`） |
| 维度字段返回（columnName AS dimCode） | ✅ | 同上 |
| 编译验证 | ✅ | `mvn compile -DskipTests` 通过 |

### 1.3 前端 cyan-dataman-web

| 任务 | 状态 | 文件 |
|------|------|------|
| 类型定义更新 | ✅ | `src/api/DatabiApi.ts` |
| 看板编辑器（拖拽布局 + 级联配置） | ✅ | `src/pages/bi/dashboard/DashboardEditor.tsx` |
| 看板查看器（筛选框渲染 + 级联逻辑） | ✅ | `src/pages/bi/dashboard/DashboardViewer.tsx` |
| 筛选框组件 | ✅ | `src/pages/bi/dashboard/components/FilterChart.tsx` |
| 路由配置 | ✅ | `src/router/index.tsx` |
| 构建验证 | ✅ | `vite build --mode pre` 通过 |

---

## 二、接口对齐检查

| 接口 | 前端实现 | 后端实现 | 状态 |
|------|---------|---------|------|
| `GET /api/v1/dashboards/{id}` | `dashboardApi.getById` | `DashboardController.getById` | ✅ 对齐（chartRefs 扩展字段） |
| `GET /api/v1/dashboards/{id}/charts` | `dashboardApi.getDashboardCharts` | `DashboardController.findDashboardCharts` | ✅ 对齐 |
| `POST /api/v1/dashboards` | `dashboardApi.create` | `DashboardController.save` | ✅ 对齐 |
| `PUT /api/v1/dashboards/{id}` | `dashboardApi.update` | `DashboardController.update` | ✅ 对齐 |
| `POST /api/v1/charts/{id}/execute` | `chartApi.execute(id, body?)` | `ChartController.execute` | ✅ 对齐（支持传入自定义 DSL） |
| ChartType 枚举 | `FILTER_SELECT/MULTI/DATE/DATE_RANGE` | 同上 | ✅ 对齐 |
| ChartRef 结构 | `chartId/x/y/w/h/titleVisible/borderStyle/bgColor/cascadeFrom` | 同上 | ✅ 对齐 |

---

## 三、发现问题

### 问题1：日期范围筛选框的级联 operator 处理

**描述**：FILTER_DATE_RANGE 筛选框选择日期范围后，传给数据图表的 filter 中，operator 应该用 `BETWEEN` 而不是 `IN`。

**当前代码**：`DashboardViewer.tsx` 中，values.length > 1 时统一使用 `FilterOperator.IN`。

**影响**：FILTER_DATE_RANGE 的级联可能无法正确过滤。

**修复方案**：在 `buildMergedDsl` 中，根据 sourceChart 的 chartType 判断 operator：
- FILTER_DATE_RANGE → `BETWEEN`
- FILTER_MULTI → `IN`
- FILTER_SELECT / FILTER_DATE → `EQ`

**状态**：🔧 已修复（见下方提交）

### 问题2：筛选框选项的 label/value 区分

**描述**：当前 FilterChart 组件中，options 的 label 和 value 都用了 execute 返回的物理字段值。指标平台的维度有 `columnName`（物理字段）和 `displayColumn`（显示字段）的区分。

**影响**：筛选框下拉选项展示的是物理字段值，而不是用户友好的显示名称。

**修复方案**：
- 方案A：后端 execute 返回两列（物理值 + 显示值），前端用显示值做 label
- 方案B：前端额外调用维度元数据接口获取 displayColumn 映射

**建议**：方案A更优，需要后端 `buildFilterSql` 返回 `SELECT columnName AS dimCode, displayColumn AS dimCodeLabel FROM ...`。

**状态**：⏸️ 待后续迭代优化（MVP 可用）

### 问题3：DashboardEditor 筛选框控件不能直接创建

**描述**：编辑器左侧的筛选框控件按钮点击后只提示用户去外部创建，没有直接在看板编辑器内创建筛选框图表的能力。

**影响**：用户体验不佳，需要跳转到图表分析页面创建后再回来添加。

**修复方案**：在编辑器内集成图表创建弹窗，或简化流程允许直接配置维度生成筛选框图表。

**状态**：⏸️ 待后续迭代优化（MVP 可用）

---

## 四、测试建议

1. **创建筛选框图表**：在图表分析页面创建 FILTER_MULTI 类型图表（维度 = D_REGION）
2. **创建数据图表**：创建 BAR 类型图表（维度 = D_REGION，指标 = M_SALE_AMT）
3. **创建看板**：在看板编辑器中添加筛选框图表和数据图表，配置数据图表的 cascadeFrom 包含筛选框图表
4. **查看看板**：在查看器中选择筛选框的值，观察数据图表是否自动刷新
5. **多选测试**：选择多个地区，观察 filter operator 是否为 IN
6. **取消测试**：取消全部选择，观察数据图表是否恢复原始数据

---

## 五、变更文件汇总

### 后端 cyan-databi
```
domain/chart/ChartType.java
application/chart/cmd/ChartExecuteCmd.java
application/chart/ChartService.java
application/chart/impl/ChartServiceImpl.java
adapter/chart/http/ChartController.java
adapter/dashboard/http/DashboardController.java
adapter/dashboard/http/dto/DashboardChartRefDTO.java
domain/dashboard/valobj/ChartRefValObj.java
infra/persistence/dashboard/convert/DashboardInfraConvert.java
```

### 后端 cyan-datametric
```
cyan-datametric-client/.../enums/ChartType.java
cyan-datametric-application/.../analysis/impl/BiAnalysisServiceImpl.java
```

### 前端 cyan-dataman-web
```
src/api/DatabiApi.ts
src/pages/bi/dashboard/index.tsx
src/pages/bi/dashboard/DashboardEditor.tsx
src/pages/bi/dashboard/DashboardViewer.tsx
src/pages/bi/dashboard/components/FilterChart.tsx
src/router/index.tsx
```
