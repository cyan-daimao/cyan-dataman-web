# 联调报告 — 图表管理中心与筛选框创建

## 一、各端完成情况

### 1.1 后端 cyan-databi

| 任务 | 状态 | 文件 |
|------|------|------|
| ChartPageQuery 新增 chartType | ✅ | `domain/chart/query/ChartPageQuery.java` |
| ChartListQuery 新增 chartType | ✅ | `domain/chart/query/ChartListQuery.java` |
| ChartController 接收 chartType | ✅ | `adapter/chart/http/ChartController.java` |
| ChartRepositoryImpl chartType 筛选 | ✅ | `infra/persistence/chart/repository/ChartRepositoryImpl.java` |
| 编译验证 | ✅ | `mvn compile -DskipTests` 通过 |

### 1.2 前端 cyan-dataman-web

| 任务 | 状态 | 文件 |
|------|------|------|
| API 封装更新（chartType 参数） | ✅ | `src/api/DatabiApi.ts` |
| ChartCard 卡片组件 | ✅ | `src/pages/bi/chart/components/ChartCard.tsx` |
| FilterCreator 筛选框创建弹窗 | ✅ | `src/pages/bi/chart/FilterCreator.tsx` |
| 图表列表页重构（Tab + 卡片） | ✅ | `src/pages/bi/chart/index.tsx` |
| ChartLibrary 新增「新建筛选框」按钮 | ✅ | `src/pages/bi/dashboard/components/ChartLibrary.tsx` |
| DashboardEditor 传入刷新回调 | ✅ | `src/pages/bi/dashboard/DashboardEditor.tsx` |
| 构建验证 | ✅ | `vite build --mode pre` 通过 |
| ESLint | ✅ | 无错误 |

---

## 二、接口对齐检查

| 接口 | 前端实现 | 后端实现 | 状态 |
|------|---------|---------|------|
| `GET /api/v1/charts?chartType=xxx` | `chartApi.page({ chartType })` | Controller + Repository 支持 | ✅ 对齐 |
| `GET /api/v1/charts/list?chartType=xxx` | `chartApi.list(undefined, undefined, undefined, chartType)` | Controller + Repository 支持 | ✅ 对齐 |
| `POST /api/v1/charts` | `chartApi.create(cmd)` | 已有，chartType 传 FILTER_* | ✅ 对齐 |
| 维度列表接口 | `dimensionBiListApi.list()` | `MetricBiApi.ts` 已有 | ✅ 对齐 |

---

## 三、测试步骤

1. **图表管理中心**：进入「图表分析」→ 点击「筛选框」Tab → 点击「新建筛选框」→ 填写表单 → 创建成功 → 出现在列表中
2. **看板编辑器快捷创建**：进入看板编辑 → 左侧组件库「筛选框」Tab → 点击「+ 新建筛选框」→ 创建后自动出现在组件库中 → 添加到画布
3. **筛选框执行**：创建筛选框后 → 点击预览 → execute 返回维度选项列表 → FilterChart 正确渲染
4. **Tab 切换**：「数据图表」Tab 只展示 BAR/LINE/PIE 等；「筛选框」Tab 只展示 FILTER_*

---

## 四、已知问题

| 问题 | 说明 | 状态 |
|------|------|------|
| 分页总数前端过滤 | 图表列表页前端过滤后 total 为过滤后长度，非后端真实总数 | ✅ 已修复 |
| 筛选框暂不支持编辑 | ChartCard 中筛选框的编辑按钮 disabled | ⏸️ 已知，后续支持 |
| 数据集模式维度选择 | FilterCreator 当前只加载指标平台维度列表，数据集模式未实现 | ⏸️ 已知，后续支持 |
