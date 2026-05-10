# BI 看板布局与图表联动 — 产品需求文档

## 一、背景与目标

### 1.1 背景
当前 BI 模块已支持图表管理和基础的看板功能，但看板仅支持简单的图表引用列表（`chart_refs` 存 chartId + 位置），缺乏：
- 拖拽式布局编辑
- 筛选框图表（Filter Chart）能力
- 图表间的级联联动

### 1.2 目标
- 支持看板内图表的拖拽布局（12列网格）
- 支持筛选框图表（下拉选择、多选、日期选择等）
- 支持筛选框图表与数据图表之间的级联联动
- 筛选框图表选择值后，受影响的数据图表自动重新执行 DSL 并刷新

## 二、用户故事

### US-1：作为数据分析师，我希望在看板编辑器中拖拽调整图表位置和大小
-  Acceptance：看板编辑器支持拖拽布局，12列网格，图表可调整位置和大小

### US-2：作为数据分析师，我希望在看板中添加筛选框图表
-  Acceptance：可以添加筛选框图表（地区多选、时间范围等），筛选框参与布局，有独立的 x/y/w/h

### US-3：作为数据分析师，我希望配置筛选框与数据图表的联动关系
-  Acceptance：在属性面板中用多选输入框配置"本图表受哪些筛选框影响"

### US-4：作为业务人员，我希望在看板中操作筛选框后，相关图表自动刷新
-  Acceptance：选择/取消筛选值后，受影响的图表自动重新执行并展示过滤后的数据

## 三、功能列表

| 优先级 | 功能 | 说明 |
|--------|------|------|
| P0 | 看板布局表改造 | 扩展 chart_refs 或新建中间表，存储布局+UI+联动关系 |
| P0 | 筛选框图表类型 | ChartType 新增 FILTER_SELECT/FILTER_MULTI/FILTER_DATE/FILTER_DATE_RANGE |
| P0 | 看板编辑器-拖拽布局 | 12列网格，拖拽调整位置/大小 |
| P0 | 看板编辑器-联动配置 | 属性面板多选输入框配置 cascade_from |
| P0 | 看板查看器-渲染 | 画布渲染筛选框控件和数据图表 |
| P0 | 看板查看器-级联逻辑 | 筛选框值变化 → 查 cascade_from → 合并 filters → 重新 execute |
| P1 | 筛选框图表 execute | 筛选框图表执行 DSL 返回选项列表（distinct values） |
| P1 | 看板详情接口 | GET /dashboards/{id}/charts 返回完整图表列表 |

## 四、数据模型

### 4.1 图表表（bi_chart）— 扩展

新增 chartType：
- `FILTER_SELECT` — 单选下拉框
- `FILTER_MULTI` — 多选下拉框
- `FILTER_DATE` — 日期选择器
- `FILTER_DATE_RANGE` — 日期范围选择器

筛选框图表的 DSL（MetricBiAnalysisCmd）：
- `dimensions`：至少一个元素，表示筛选维度（如 D_REGION）
- `metrics`：空数组
- `filters/orders`：可选

筛选框图表 execute 返回 ChartDataDTO，前端用 rows 填充选项列表。

### 4.2 看板表（bi_dashboard）— 改造

`chart_refs` JSON 字段扩展，每个元素包含：
```json
{
  "chartId": "123",
  "x": 0, "y": 0, "w": 6, "h": 8,
  "titleVisible": true,
  "borderStyle": "default",
  "bgColor": null,
  "cascadeFrom": ["filter-chart-1", "filter-chart-2"]
}
```

**决策**：后端可选择扩展 JSON 字段或新建 `bi_dashboard_chart` 中间表。若建中间表，字段对应上述 JSON 结构。

## 五、核心流程

### 5.1 看板加载
1. GET /dashboards/{id} → 获取看板元数据 + chartRefs（含 cascadeFrom）
2. 根据 chartRefs 中的 chartId 列表，并行 GET /charts/{id} 获取各图表 DSL
3. 并行 POST /charts/{id}/execute 执行所有图表（筛选框和数据图表统一调用）
4. 渲染画布

### 5.2 级联触发
1. 用户在筛选框图表 A 中选择值（支持多选）
2. 前端更新筛选框 A 的本地选中值状态
3. 前端遍历看板内所有其他图表，检查其 `cascadeFrom` 是否包含图表 A 的 chartId
4. 对受影响的图表：
   a. 取出原始 DSL（首次加载时的缓存副本）
   b. 在 DSL.filters 中追加/更新 filter：
      - dimCode = 筛选框维度的 dimCode
      - operator = 多选时 "IN"，单选时 "EQ"
      - values = 选中的物理字段值数组
   c. POST /charts/{id}/execute（Body = 合并后的 DSL）
   d. 更新渲染

### 5.3 级联取消
用户去除某个选项或全部取消 → 更新选中值 → 重新走级联流程 → 若全部取消则移除该 dimCode 的 filter。

## 六、前端交互设计

### 6.1 看板编辑器
- 顶部：看板名称 + 保存/预览按钮
- 左侧：组件库（数据图表列表、筛选框控件）
- 中间：画布（12列网格，拖拽吸附）
- 右侧：属性面板（选中图表后显示）
  - 布局：x, y, w, h
  - UI：标题显示、边框样式、背景色
  - 联动设置：antd Select mode="multiple"，选择"受以下图表筛选影响"

### 6.2 看板查看器
- 顶部：筛选栏（所有筛选框图表按布局渲染）
- 中间：画布（数据图表按布局渲染）
- 筛选框操作后，目标图表显示 loading 状态，完成后刷新

## 七、关键约束

1. **无看板级执行接口**：前端直接并行调用各图表的 execute 接口
2. **无全局筛选器表**：筛选条件来自筛选框图表的 DSL 执行结果
3. **维度字段区分**：filter 传物理字段值（columnName），展示用显示字段（displayColumn）
4. **筛选框多选支持**：antd Select mode="multiple"，支持去除元素
5. **代码隔离**：前后端通过 API 契约交互，不直接读写对方代码

## 八、非功能性需求

1. 看板内图表 execute 并行调用，单个图表失败不影响其他图表
2. 筛选框选项列表 execute 应该有缓存或限制数据量
3. 级联重新 execute 时应该有 debounce（300ms）避免频繁请求
