# ChatBI 调研报告 —— 基于 Dify 的对话式数据分析方案

> 调研人：AI 产品经理
> 日期：2026-04-29
> 状态：**已评审，决策已确认**

---

## 一、背景与目标

### 1.1 现状

DATA-CENTER 平台已完成以下核心能力：

| 模块 | 能力 | 状态 |
|------|------|------|
| 指标平台 | 原子/衍生/复合指标定义、主题域管理、指标血缘 | ✅ 已上线 |
| 维度管理 | 公共维度定义、分类管理、维度值查询 | ✅ 已上线 |
| 图表分析 | 拖拽式配置、DSL 驱动、ECharts 可视化（BAR/LINE/AREA/PIE/SCATTER/NUMBER/TABLE） | ✅ 已上线 |
| 看板管理 | 网格布局、图表嵌入、看板 CRUD | ✅ 已上线 |
| SQL 查询 | Monaco Editor、多标签页、执行计划 | ✅ 已上线 |
| 数据加工 | SparkSQL/FlinkSQL 任务编辑 | ✅ 已上线 |

**核心资产 —— 图表 DSL**：

```json
{
  "chartType": "BAR",
  "metrics": [{"metricCode": "M001", "alias": "销售额"}],
  "dimensions": [{"dimCode": "D001", "alias": "省份"}],
  "filters": [{"dimCode": "D001", "operator": "EQ", "values": ["北京"]}],
  "orders": [{"metricCode": "M001", "direction": "DESC"}],
  "limitValue": 1000
}
```

### 1.2 目标

引入 **ChatBI** 能力，让用户通过自然语言对话完成数据分析，降低使用门槛。

**典型用户场景**：
- 销售总监："近 30 天各省份销售额排名"
- 运营经理："对比本周和上周的活跃用户数趋势"
- 财务专员："Q3 各部门费用占比"
- 数据分析师（追问）："只看华东区，按城市拆分"

---

## 二、竞品调研

### 2.1 网易有数 ChatBI

**官网**：https://sf.163.com/product/ChatBi

| 能力项 | 说明 |
|--------|------|
| 自然语言问答 | 自研大模型，支持中文语义理解 |
| 自动图表绘制 | 对话结果自动出图，图表类型可切换 |
| 过程可验证 | 将生成的 SQL 转成自然语言展示，用户可核对取数逻辑 |
| 用户可干预 | 结构化展示查询条件，用户可手动调整 |
| 知识库配置 | 上传业务术语表（如 GMV、滞销率），让大模型学习行业黑话 |
| 产品可运营 | 用户标记正确/错误回答，运营模块让 AI 越用越聪明 |
| 安全 | 大模型私有化部署，行列级权限控制 |
| 多轮对话 | 支持上下文追问 |

**技术路线**：NL → 语义解析 → 指标/维度匹配 → SQL 生成 → 执行 → 可视化

**亮点**："需求可理解、过程可验证、用户可干预、产品可运营"四可原则。

### 2.2 阿里 Quick BI — 小Q问数

**文档**：https://help.aliyun.com/zh/quick-bi/user-guide/user-guide-for-smart-q-a

| 能力项 | 说明 |
|--------|------|
| 数据来源 | 数据集（需预先配置"问数配置"） |
| 推理模型 | 官方推理 / 千问-Max / DeepSeek-R1 可选 |
| 问题澄清 | 缺失时间/指标时自动反问确认 |
| 数据解读 | AI 自动生成分析结论文字 |
| 快捷提问 | 推荐问题、收藏问题、最近使用 |
| 语音输入 | 支持语音对话 |
| 多轮追问 | 支持追加提问，基于上下文深入分析 |
| 移动端 | PC + 移动端双端支持 |

**注意**：小Q问数依赖**预先配置的数据集**，不是所有表都能直接问。

### 2.3 观远数据 — 观远问数 Agent

| 能力项 | 说明 |
|--------|------|
| 自然语言提问 | 中文提问，自动生成图表 |
| 多轮追问 | 基于上下文继续深入 |
| 权限匹配 | 问数结果自动匹配行列级权限 |
| 移动端 | 手机端随时问数 |

### 2.4 技术路线对比

| 路线 | 原理 | 优点 | 缺点 | 适用场景 |
|------|------|------|------|----------|
| **NL2SQL** | LLM 直接生成 SQL | 实现简单，通用性强 | 准确率 60-70%；难以理解企业业务术语；SQL 注入风险；权限控制困难 | 单表简单查询 |
| **NL2DSL2SQL** | LLM 生成结构化 DSL，由已有引擎转 SQL | 利用语义层，准确率高；安全性好；权限天然可控 | 需要预先定义 DSL 和语义层 | 有指标/维度语义层的 BI 平台 |
| **NL2API** | LLM 生成 API 调用参数 | 完全利用现有后端能力；零新增 SQL 风险 | 需要预先暴露元数据和执行 API | 已有完善 API 的平台 |

**结论**：DATA-CENTER 已有完善的 DSL（`MetricBiAnalysisCmd`）和指标/维度语义层，**NL2DSL2SQL（或 NL2API）是最优路线**，远优于直接 NL2SQL。

---

## 三、Dify 平台能力评估

### 3.1 Dify 自定义工具（Custom Tool）

- **接口规范**：支持标准 OpenAPI (Swagger) 格式解析
- **接入方式**：将后端 API 的 OpenAPI Schema 导入 Dify
- **调用机制**：AI Agent 根据用户意图自动选择工具、提取参数、调用 API
- **认证支持**：API Key、OAuth、Basic Auth
- **返回处理**：工具返回结构化 JSON，AI 继续推理或展示给用户

### 3.2 关键能力 —— Tool Calling

Dify 的 Agent 模式支持 **ReAct / Function Call** 范式：

1. 用户输入自然语言
2. LLM 判断需要调用哪些工具
3. LLM 提取工具参数
4. Dify 执行 HTTP 调用
5. 工具返回结果
6. LLM 基于结果继续推理或输出最终答案

**这正是 ChatBI 所需的核心能力**。

### 3.3 已有案例 —— Dify + 数据分析

参考案例（知乎）："基于 Paimon + Doris + Dify 构建实时数据分析智能体"
- Dify 自定义工具接入数据库查询 API
- LLM 从"对话模型"升级为能操作数据库的"执行者"
- 通过 Function Call 实现自然语言到数据查询的转换

---

## 四、方案设计（已确认）

### 4.1 总体架构

```
┌─────────────────────────────────────────────────────────────┐
│  用户（自然语言提问）                                         │
│  "近30天各省份销售额排名"                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Dify Agent（ChatBI 智能助手）                                │
│  - 系统 Prompt：定义角色、可用工具、DSL 格式规范              │
│  - 工具调用：                                                  │
│    1. get_metadata（查可用指标/维度）                          │
│    2. execute_analysis（执行分析，入参 DSL JSON）               │
│    3. get_dimension_values（查维度可选值）                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  后端服务（cyan-datametric / cyan-databi）                    │
│  - 元数据接口：指标列表、维度列表、维度值列表                   │
│  - 分析执行接口：接收 DSL → 生成 SQL → 数据网关执行 → 返回数据  │
│  - 图表保存接口：DSL + 图表名称 → 保存为图表                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  前端（cyan-dataman-web）                                     │
│  自建对话 UI，调用 Dify Chat API，消息渲染 + ECharts 图表展示   │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 技术路线：NL2DSL2SQL（两阶段）

**第一阶段 —— 意图理解与 DSL 生成（在 Dify 中完成）**：

```
用户提问 → LLM 理解意图 → 调用元数据工具（获取可用指标/维度）
         → LLM 匹配指标/维度 → 生成 DSL JSON
```

**第二阶段 —— DSL 执行与可视化（在现有后端完成）**：

```
DSL JSON → 后端校验 → 生成 SQL → 数据网关执行 → 返回 ChartDataDTO
         → 前端渲染 EChartsChart
```

### 4.3 后端需暴露的接口（供 Dify 自定义工具调用）

| 工具名 | Method | Path | 说明 |
|--------|--------|------|------|
| `list_metrics` | GET | `/api/v1/metrics/bi/list` | 获取可用指标列表（含 metricCode, metricName, statFunc, subjectName, tableRef） |
| `list_dimensions` | GET | `/api/v1/metrics/bi/dimensions` | 获取可用维度列表（含 dimCode, dimName, tableName, columnName, displayColumn） |
| `list_dim_values` | GET | `/api/v1/metrics/bi/dimensions/{dimCode}/values` | 获取维度可选值（value=物理字段, label=显示字段） |
| `execute_analysis` | POST | `/api/v1/metrics/bi/analysis/execute` | 执行分析，入参 `MetricBiAnalysisCmd`，返回 `ChartDataDTO` |
| `preview_sql` | POST | `/api/v1/metrics/bi/analysis/preview-sql` | 预览 SQL（用于过程可验证） |
| `save_chart` | POST | `/api/v1/charts` | 保存图表（将对话生成的 DSL 保存为图表） |

**注意**：以上接口大部分已存在，仅需补充 `save_chart` 和可能的权限适配。

### 4.4 Dify Agent Prompt 设计（核心）

```
你是 DATA-CENTER 的智能数据分析助手（ChatBI）。

你的任务是将用户的自然语言数据分析需求，转换为结构化的 DSL JSON，
然后调用后端工具执行分析，并将结果以友好的方式展示给用户。

## 可用工具
1. list_metrics(name?) —— 查询可用指标
2. list_dimensions(name?, categoryId?) —— 查询可用维度
3. list_dim_values(dimCode) —— 查询维度可选值
4. execute_analysis(dslJson) —— 执行分析，返回数据
5. preview_sql(dslJson) —— 预览 SQL

## DSL 格式规范
{
  "chartType": "BAR | LINE | AREA | PIE | SCATTER | NUMBER | TABLE",
  "metrics": [{"metricCode": "...", "alias": "..."}],
  "dimensions": [{"dimCode": "...", "alias": "..."}],
  "filters": [{"dimCode|metricCode": "...", "operator": "=|!=|>|>=|<|<=|IN|LIKE", "values": ["..."]}],
  "orders": [{"dimCode|metricCode": "...", "direction": "ASC|DESC"}],
  "limitValue": 1000
}

## 工作流
1. 理解用户意图，确定需要的指标、维度、过滤条件
2. 如不确定指标/维度名称，先调用 list_metrics / list_dimensions 查询
3. 构建 DSL JSON
4. 调用 execute_analysis 执行分析
5. 向用户展示结果摘要（文字描述 + 建议的图表类型）

## 多轮对话
- 记住当前对话上下文（已选指标、维度、过滤条件）
- 用户的追问基于当前上下文进行调整
- 例如用户说"只看华东区"，在上文基础上追加过滤条件

## 图表类型推荐规则
- 1个指标 + 1个维度 → 推荐 BAR（排名/对比）或 PIE（占比）
- 1个指标 + 时间维度 → 推荐 LINE（趋势）
- 多个指标 → 推荐 BAR/LINE 多系列
- 纯数值展示 → 推荐 NUMBER
```

### 4.5 前端接入方案

**已确认：前端自建 UI 调 Dify Chat API**

Dify 的 Chat API 响应格式支持 **streaming + agent_message + tool_calls**，前端可以：
1. 实时展示 AI 思考过程
2. 展示工具调用状态（"正在查询指标..."）
3. 工具返回数据后，前端用 `EChartsChart` 组件渲染图表

### 4.6 关键交互流程（多轮对话示例）

```
用户：近30天各省份销售额排名

AI：
[思考] 用户需要：指标=销售额，维度=省份，时间过滤=近30天，排序=销售额降序
[工具调用] list_metrics(name="销售额")
[工具调用] list_dimensions(name="省份")
[工具调用] execute_analysis({
  chartType: "BAR",
  metrics: [{metricCode: "M_SALE_AMT", alias: "销售额"}],
  dimensions: [{dimCode: "D_PROVINCE", alias: "省份"}],
  filters: [{dimCode: "D_DATE", operator: ">=", values: ["2026-03-30"]}],
  orders: [{metricCode: "M_SALE_AMT", direction: "DESC"}],
  limitValue: 10
})

AI：近 30 天各省份销售额排名如下（TOP 10）：
[前端渲染 BAR 图]

用户：只看华东区

AI：
[思考] 在上文基础上追加过滤条件：省份 IN ["上海","江苏","浙江","安徽","福建","江西","山东"]
[工具调用] execute_analysis({...filters 追加省份过滤...})

AI：华东区近 30 天销售额排名如下：
[前端渲染 BAR 图]

用户：保存为图表

AI：
[工具调用] save_chart({name: "华东区近30天销售额排名", ...dsl...})

AI：图表已保存！您可以在「图表管理」中查看和编辑。
```

---

## 五、已确认的关键决策

| # | 决策点 | 确认方案 |
|---|--------|----------|
| 1 | LLM 服务 | ✅ 使用 Dify 内置模型（通义/DeepSeek 等） |
| 2 | 前端接入 | ✅ 自建对话 UI，调用 Dify Chat API |
| 3 | 过程可验证 | ✅ 在 AI 回复中展示查询条件自然语言翻译 |
| 4 | 一键保存图表 | ✅ 支持将对话分析结果保存为平台图表 |
| 5 | 知识库配置 | ✅ 支持上传业务术语表，让大模型学习行业黑话 |
| 6 | 数据权限 | ❌ 暂不处理，后续统一权限中心再接入 |

---

## 六、风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| LLM DSL 生成准确率不足 | 高 | 充分的 Prompt Engineering；元数据工具辅助；人工标注反馈闭环 |
| 多轮对话上下文丢失 | 中 | Dify 内置上下文管理；关键参数显式传递 |
| 数据权限绕过 | 高 | DSL 执行前校验用户权限；不暴露底层表结构给 LLM **（待权限中心完成后实施）** |
| 响应延迟 | 中 | 元数据缓存；DSL 执行异步化；流式输出 |
| 业务术语歧义 | 中 | 知识库配置；同义词映射；反问澄清 |

---

## 七、附录：现有接口清单

### cyan-datametric (端口 8080)

| 接口 | 路径 | 用途 |
|------|------|------|
| 执行分析 | `POST /api/v1/metrics/bi/analysis/execute` | 核心分析执行 |
| 预览 SQL | `POST /api/v1/metrics/bi/analysis/preview-sql` | SQL 预览 |
| 指标列表 | `GET /api/v1/metrics/bi/list` | 查可用指标 |
| 维度列表 | `GET /api/v1/metrics/bi/dimensions` | 查可用维度 |
| 维度值列表 | `GET /api/v1/metrics/bi/dimensions/{dimCode}/values` | 查维度可选值 |

### cyan-databi (端口 8085)

| 接口 | 路径 | 用途 |
|------|------|------|
| 图表分页 | `GET /api/v1/charts` | 图表列表 |
| 图表详情 | `GET /api/v1/charts/{id}` | 查图表 DSL |
| 保存图表 | `POST /api/v1/charts` | 保存图表 |
| 更新图表 | `PUT /api/v1/charts/{id}` | 更新图表 |
| 执行图表 | `POST /api/v1/charts/{id}/execute` | 按图表配置执行 |
| 看板 CRUD | `/api/v1/dashboards/*` | 看板管理 |

---

## 八、下一步行动

1. **输出 Phase 1 MVP 详细 PRD**，进入开发阶段
2. **确认 Dify 部署信息**（版本、访问地址、可用模型、API Key）
3. **补充缺失接口**（如时间解析工具、知识库管理接口等）
