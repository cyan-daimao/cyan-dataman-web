# ChatBI Phase 1 MVP —— 产品需求文档

> 版本：v1.0
> 日期：2026-04-29
> 状态：已评审，待开发

---

## 一、范围定义

### 1.1 目标

在 DATA-CENTER 平台中新增 **ChatBI** 模块，用户通过自然语言对话完成数据分析，支持多轮追问、图表渲染、过程可验证、一键保存图表。

### 1.2 本期范围（MVP）

| 功能 | 包含 | 不包含 |
|------|------|--------|
| 对话式分析 | ✅ 单轮查询 + 多轮追问 | ❌ 语音输入 |
| 图表类型 | ✅ BAR / LINE / TABLE / NUMBER | ❌ PIE / SCATTER / AREA（下期） |
| 过程可验证 | ✅ 展示查询条件自然语言翻译 | ❌ 用户手动调整条件（下期） |
| 一键保存 | ✅ 保存为平台图表 | ❌ 直接加入看板（下期） |
| 知识库 | ✅ 术语表配置 + 生效 | ❌ 用户反馈闭环（下期） |
| 权限 | ❌ —— 暂不处理 | — |

### 1.3 涉及系统

| 系统 | 职责 |
|------|------|
| **Dify** | LLM 推理、Agent 编排、工具调用、对话上下文管理 |
| **cyan-datametric (8080)** | 元数据查询（指标/维度/维度值）、分析执行（DSL→SQL→数据） |
| **cyan-databi (8085)** | 图表保存、图表管理 |
| **cyan-dataman-web (前端)** | ChatBI 对话页面、消息渲染、图表展示 |

---

## 二、Dify 侧配置方案

### 2.1 Dify 应用类型选择

**选择：Agent（助手）模式**

原因：
- ChatBI 需要工具调用（查元数据、执行分析）
- Agent 模式支持 ReAct / Function Call，LLM 可自主决策调用哪些工具
- 支持多轮对话上下文

### 2.2 模型选择

**推荐**：Dify 内置的 **通义千问-Max** 或 **DeepSeek-V3**

- 中文理解能力强
- 支持 Function Call
- 无需额外部署成本

### 2.3 自定义工具配置

Dify 中需创建 5 个自定义工具，每个工具通过 OpenAPI Schema 导入。

#### 工具 1：list_metrics（查指标列表）

```yaml
openapi: 3.0.0
info:
  title: List Metrics API
  version: 1.0.0
servers:
  - url: http://localhost:8080
paths:
  /api/v1/metrics/bi/list:
    get:
      operationId: listMetrics
      summary: 查询可用指标列表
      parameters:
        - name: name
          in: query
          schema:
            type: string
          description: 按指标名称模糊搜索
        - name: subjectCode
          in: query
          schema:
            type: string
          description: 按主题域编码过滤
        - name: metricType
          in: query
          schema:
            type: string
          description: 指标类型（ATOMIC/DERIVED/COMPOSITE）
      responses:
        '200':
          description: 指标列表
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: integer
                  data:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                        metricCode:
                          type: string
                        metricName:
                          type: string
                        metricType:
                          type: string
                        subjectName:
                          type: string
                        statFunc:
                          type: string
                        tableRef:
                          type: string
```

#### 工具 2：list_dimensions（查维度列表）

```yaml
openapi: 3.0.0
info:
  title: List Dimensions API
  version: 1.0.0
servers:
  - url: http://localhost:8080
paths:
  /api/v1/metrics/bi/dimensions:
    get:
      operationId: listDimensions
      summary: 查询可用维度列表
      parameters:
        - name: name
          in: query
          schema:
            type: string
          description: 按维度名称模糊搜索
        - name: categoryId
          in: query
          schema:
            type: string
          description: 按分类ID过滤
      responses:
        '200':
          description: 维度列表
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: integer
                  data:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                        dimCode:
                          type: string
                        dimName:
                          type: string
                        dimType:
                          type: string
                        tableName:
                          type: string
                        columnName:
                          type: string
                        displayColumn:
                          type: string
                        categoryName:
                          type: string
```

#### 工具 3：execute_analysis（执行分析）

```yaml
openapi: 3.0.0
info:
  title: Execute Analysis API
  version: 1.0.0
servers:
  - url: http://localhost:8080
paths:
  /api/v1/metrics/bi/analysis/execute:
    post:
      operationId: executeAnalysis
      summary: 执行指标分析，返回图表数据
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                chartType:
                  type: string
                  enum: [TABLE, BAR, LINE, AREA, PIE, SCATTER, NUMBER]
                  description: 图表类型
                metrics:
                  type: array
                  items:
                    type: object
                    properties:
                      metricCode:
                        type: string
                      alias:
                        type: string
                dimensions:
                  type: array
                  items:
                    type: object
                    properties:
                      dimCode:
                        type: string
                      alias:
                        type: string
                filters:
                  type: array
                  items:
                    type: object
                    properties:
                      metricCode:
                        type: string
                      dimCode:
                        type: string
                      operator:
                        type: string
                      values:
                        type: array
                        items:
                          type: string
                orders:
                  type: array
                  items:
                    type: object
                    properties:
                      metricCode:
                        type: string
                      dimCode:
                        type: string
                      direction:
                        type: string
                        enum: [ASC, DESC]
                limitValue:
                  type: integer
                  default: 1000
      responses:
        '200':
          description: 分析结果
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: integer
                  data:
                    type: object
                    properties:
                      status:
                        type: string
                        enum: [SUCCESS, FAILED]
                      columns:
                        type: array
                        items:
                          type: string
                      rows:
                        type: array
                        items:
                          type: object
                      sql:
                        type: string
                      costTimeMs:
                        type: integer
                      errorMessage:
                        type: string
```

#### 工具 4：preview_sql（预览 SQL）

```yaml
openapi: 3.0.0
info:
  title: Preview SQL API
  version: 1.0.0
servers:
  - url: http://localhost:8080
paths:
  /api/v1/metrics/bi/analysis/preview-sql:
    post:
      operationId: previewSql
      summary: 预览生成的 SQL 语句（不执行）
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                chartType:
                  type: string
                metrics:
                  type: array
                  items:
                    type: object
                dimensions:
                  type: array
                  items:
                    type: object
                filters:
                  type: array
                  items:
                    type: object
                orders:
                  type: array
                  items:
                    type: object
                limitValue:
                  type: integer
      responses:
        '200':
          description: SQL 字符串
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: integer
                  data:
                    type: string
```

#### 工具 5：save_chart（保存图表）

```yaml
openapi: 3.0.0
info:
  title: Save Chart API
  version: 1.0.0
servers:
  - url: http://localhost:8085
paths:
  /api/v1/charts:
    post:
      operationId: saveChart
      summary: 将分析结果保存为图表
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                  description: 图表名称
                description:
                  type: string
                analysisType:
                  type: string
                  enum: [METRICS, DATASET]
                metricAnalysisCmd:
                  type: object
                  description: DSL JSON（同 execute_analysis 入参）
                chartType:
                  type: string
                dimensions:
                  type: array
                  items:
                    type: object
                metrics:
                  type: array
                  items:
                    type: object
                filters:
                  type: array
                  items:
                    type: object
                orders:
                  type: array
                  items:
                    type: object
                limitValue:
                  type: integer
      responses:
        '200':
          description: 保存结果
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: integer
                  data:
                    type: object
                    properties:
                      id:
                        type: string
                      name:
                        type: string
```

### 2.4 系统 Prompt（Agent 指令）

```
你是 DATA-CENTER 平台的智能数据分析助手（ChatBI）。你的任务是将用户的自然语言数据分析需求，转换为结构化的 DSL JSON，然后调用后端工具执行分析，并将结果以友好的方式展示给用户。

## 工作原则
1. 始终使用中文回复用户。
2. 回复前先展示本次查询的「取数逻辑」自然语言翻译（过程可验证）。
3. 如果用户意图不明确，主动反问澄清（如缺失时间范围、指标歧义等）。
4. 多轮对话时继承上下文，用户的追问基于当前分析状态调整。

## 可用工具
- list_metrics(name?, subjectCode?, metricType?) —— 查询可用指标列表
- list_dimensions(name?, categoryId?) —— 查询可用维度列表
- execute_analysis(dsl) —— 执行分析，返回数据
- preview_sql(dsl) —— 预览 SQL（用于展示给用户）
- save_chart(chart) —— 保存图表到平台

## DSL 格式规范（execute_analysis 入参）
{
  "chartType": "BAR | LINE | TABLE | NUMBER",
  "metrics": [{"metricCode": "指标编码", "alias": "展示名称"}],
  "dimensions": [{"dimCode": "维度编码", "alias": "展示名称"}],
  "filters": [{"metricCode?": "", "dimCode?": "", "operator": "=|!=|>|>=|<|<=|IN|LIKE", "values": ["值"]}],
  "orders": [{"metricCode?": "", "dimCode?": "", "direction": "ASC|DESC"}],
  "limitValue": 1000
}

## 图表类型推荐规则
- 1个指标 + 1个维度（非时间）→ BAR（排名对比）
- 1个指标 + 时间维度 → LINE（趋势）
- 纯数值 → NUMBER（指标卡）
- 用户未指定且不确定 → TABLE（表格，最通用）

## 时间处理规则
- "近7天" → 过滤条件：dt >= date_sub(current_date, 7)
- "近30天" → 过滤条件：dt >= date_sub(current_date, 30)
- "本月" → 过滤条件：dt 在当月范围内
- "本季度" → 过滤条件：dt 在当季度范围内
- "今年" / "2026年" → 过滤条件：year(dt) = 2026
- 时间字段统一使用维度编码 "D_DATE" 或 "D_DT"，如不存在则不添加时间过滤

## 知识库术语（关键业务概念映射）
以下术语在对话中可能以别名出现，请正确映射：
- GMV / 成交额 / 交易金额 → metricCode: "M_GMV"
- DAU / 日活 / 日活跃用户 → metricCode: "M_DAU"
- 留存率 → metricCode: "M_RETENTION"
- 转化率 → metricCode: "M_CONVERSION"
- 客单价 → metricCode: "M_ARPU"
- （更多术语通过知识库配置动态加载）

## 回复格式示例
用户：近30天各省份销售额排名

【取数逻辑】
- 指标：销售额（M_SALE_AMT），聚合方式：SUM
- 维度：省份（D_PROVINCE）
- 时间：近30天（dt >= 2026-03-30）
- 排序：销售额降序
- 限制：TOP 10

（调用 execute_analysis 后）

近30天各省份销售额排名 TOP 10 如下：
[数据摘要文字描述]

如需要，您可以直接说"保存为图表"将本次分析保存到平台。
```

### 2.5 知识库配置方案

在 Dify 中创建 **知识库（Knowledge）**，用于存储业务术语映射：

**文档格式（Markdown）**：
```markdown
# 业务术语表

## 销售相关
- GMV = 商品交易总额 = metricCode: M_GMV
- 销售额 = 成交金额 = metricCode: M_SALE_AMT
- 订单量 = 订单数 = metricCode: M_ORDER_CNT
- 客单价 = 平均每单金额 = metricCode: M_ARPU

## 用户相关
- DAU = 日活跃用户 = 日活 = metricCode: M_DAU
- MAU = 月活跃用户 = 月活 = metricCode: M_MAU
- 新增用户 = metricCode: M_NEW_USER
- 留存率 = metricCode: M_RETENTION

## 维度
- 省份 = dimCode: D_PROVINCE
- 城市 = dimCode: D_CITY
- 日期 = 时间 = dt = dimCode: D_DATE
- 渠道 = dimCode: D_CHANNEL
- 品类 = 商品分类 = dimCode: D_CATEGORY
```

在 Dify Agent 配置中，将该知识库关联到应用，实现 RAG（检索增强生成）。

---

## 三、前端设计方案

### 3.1 页面布局

```
┌─────────────────────────────────────────────────────────────┐
│  顶部导航栏（元数据平台 / 数据资产 / 指标平台 / SQL查询 /      │
│  数据加工 / 【ChatBI】）                                      │
├─────────────────────────────────────────────────────────────┤
│  ChatBI 对话页面                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  消息列表（可滚动）                                   │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  🤖 欢迎使用 ChatBI！您可以这样问我：                 │   │
│  │     "近30天各省份销售额排名"                          │   │
│  │     "对比本月和上月的新增用户数"                       │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  👤 近30天各省份销售额排名                            │   │
│  │  🤖 【取数逻辑】                                      │   │
│  │      • 指标：销售额（SUM）                            │   │
│  │      • 维度：省份                                     │   │
│  │      • 时间：2026-03-30 ~ 2026-04-29                  │   │
│  │      • 排序：销售额降序，TOP 10                       │   │
│  │     [ECharts BAR 图表]                                │   │
│  │     [💾 保存为图表]                                   │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  👤 只看华东区                                        │   │
│  │  🤖 【取数逻辑】... [ECharts BAR 图表] [💾 保存为图表] │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  快捷提问栏：「近7天销售额」 「各渠道DAU」 「本月TOP10」 │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  [输入框]                            [发送] [语音]   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 消息类型设计

每条消息包含以下类型之一或组合：

| 类型 | 说明 | 展示方式 |
|------|------|----------|
| `text` | 纯文本回复 | Markdown 渲染 |
| `query_logic` | 取数逻辑卡片 | 结构化卡片（指标/维度/过滤/排序） |
| `chart` | 图表 | `EChartsChart` 组件渲染 |
| `table` | 数据表格 | Ant Design `Table` 组件 |
| `number` | 指标卡 | Ant Design `Statistic` 组件 |
| `save_button` | 保存图表按钮 | 点击调用 save_chart API |
| `error` | 错误提示 | 红色警告框 |
| `loading` | 工具调用中 | Skeleton / Spin |

**消息结构（前端内部）**：
```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;           // 原始文本
  queryLogic?: QueryLogic;   // 取数逻辑卡片
  chartData?: ChartDataDTO;  // 图表数据
  chartType?: ChartType;     // 图表类型
  sql?: string;              // SQL（可展开查看）
  saveable?: boolean;        // 是否可保存
  loading?: boolean;         // 是否加载中
}
```

### 3.3 Dify Chat API 调用方案

**API 端点**：`POST {DIFY_BASE_URL}/v1/chat-messages`

**请求头**：
```
Authorization: Bearer {DIFY_API_KEY}
Content-Type: application/json
```

**请求体**：
```json
{
  "inputs": {},
  "query": "近30天各省份销售额排名",
  "response_mode": "streaming",
  "conversation_id": "",
  "user": "当前用户 Passport",
  "files": []
}
```

**流式响应解析**：

Dify 的 streaming 响应包含多种事件类型，前端需要区分处理：

| event 类型 | 说明 | 前端处理 |
|-----------|------|----------|
| `agent_message` | AI 正在生成的文本 | 实时追加到消息文本 |
| `agent_thought` | AI 思考过程 | 可展示为"思考中..."（可选） |
| `tool_calls` | 工具调用开始 | 展示工具调用状态（"正在查询指标..."） |
| `tool_call_done` | 工具调用完成 | 隐藏 loading 状态 |
| `message_end` | 消息结束 | 完成渲染，展示保存按钮 |
| `error` | 出错 | 展示错误提示 |

**关键问题**：Dify 的 Agent 模式下，工具返回结果后，LLM 会基于结果继续生成回复。前端需要在 `message_end` 时拿到完整的回复内容。

**图表数据传递方式**：

由于 Dify 的文本回复中无法直接嵌入复杂对象，建议采用以下方案：

1. **方案 A（推荐）**：在 Agent Prompt 中约定，当需要展示图表时，LLM 在回复中输出一个**特殊标记**，如：
   ```
   [CHART_DATA]{"columns": [...], "rows": [...], "chartType": "BAR"}[/CHART_DATA]
   ```
   前端通过正则解析标记，提取数据后用 EChartsChart 渲染。

2. 工具返回的数据在 Dify 中会被注入到 LLM 的上下文，LLM 基于数据生成文字摘要，但原始数据结构不会自动传给前端。

**实际上，更合理的方案是**：

前端除了调用 Dify Chat API 外，**同时直接调用后端 execute_analysis API**。

**推荐交互流程**：

```
用户输入 → 前端发送到 Dify Chat API（流式）
        → Dify Agent 解析意图，调用工具
        → 工具调用 execute_analysis（Dify 服务端→后端）
        → 后端返回 ChartDataDTO
        → Dify LLM 基于数据生成文字回复
        → 前端收到 message_end，展示文字
        
问题：前端拿不到 ChartDataDTO 原始数据！
```

**解决方案**：

前端采用**双通道**架构：
1. **对话通道**：调 Dify Chat API，负责自然语言交互
2. **数据通道**：前端自行调后端 execute_analysis，负责获取图表数据

具体流程：
```
用户输入 → 前端发送到 Dify Chat API
        → Dify Agent 返回 DSL JSON（在回复中以代码块或特殊标记输出）
        → 前端解析 DSL JSON
        → 前端直接调 /api/v1/metrics/bi/analysis/execute（带 DSL）
        → 后端返回 ChartDataDTO
        → 前端用 EChartsChart 渲染
```

这样前端可以拿到完整的 columns/rows，ECharts 才能正确渲染。

在 Agent Prompt 中明确要求 LLM 在回复中输出 DSL JSON：
```
当分析执行完成后，请在回复的最后以如下格式输出 DSL：

[DSL]
{"chartType": "BAR", "metrics": [...], "dimensions": [...]}
[/DSL]
```

前端通过正则 `[DSL](.*?)[/DSL]` 提取 DSL，然后自行调用后端执行获取数据。

**但如果 Dify 已经调用了 execute_analysis，数据已经在 Dify 服务端了，前端再调一次会浪费。**

**替代方案**：

在 Dify 的自定义工具返回中，将 ChartDataDTO 完整返回给 Dify，然后在 Prompt 中要求 LLM 将数据以 base64 或特定格式编码后输出。但这会让回复很臃肿。

**最简方案（推荐）**：

1. Dify Agent 负责理解意图、生成 DSL、调用 preview_sql（可选，用于过程可验证）
2. Dify Agent 在回复中输出 DSL JSON（以代码块形式）
3. 前端解析 DSL，**自己调用 execute_analysis** 获取数据
4. 前端渲染图表

这样 Dify 侧不需要配置 execute_analysis 工具，只需要配置 list_metrics / list_dimensions / preview_sql。
execute_analysis 由前端直接调用。

但这样多轮对话的上下文管理会有问题——Dify 不知道前端已经执行了分析。

**最终推荐方案**：

保留 execute_analysis 作为 Dify 工具，用于让 LLM 验证 DSL 是否正确生成（看返回状态）。
前端在收到 message_end 后，如果检测到回复中包含 DSL 标记，自行调用 execute_analysis 获取完整数据并渲染图表。

即：Dify 执行一次（验证），前端再执行一次（获取完整数据渲染）。这是可以接受的（分析查询通常很快）。

或者更好的方案：让 Dify 工具 execute_analysis 返回的数据足够完整（columns/rows），LLM 在回复中将关键数据摘要输出，前端从工具调用结果中提取完整数据？

Dify 的 tool_calls 事件中不包含返回数据，返回数据在 tool_call_done 后注入到 LLM 上下文。前端无法直接从流中获取工具返回值。

**结论**：

**最终方案：前端双通道**
- 通道 1：Dify Chat API → 自然语言交互、DSL 生成
- 通道 2：前端直接调后端 execute_analysis → 获取图表数据

Dify 侧配置 list_metrics、list_dimensions、preview_sql 三个工具即可。
execute_analysis 不配置为 Dify 工具，由前端直接调用。

Agent Prompt 要求 LLM 在回复末尾输出 DSL JSON（用特殊标记包裹）。
前端解析 DSL → 调 execute_analysis → 渲染图表。

### 3.4 前端状态管理

```typescript
interface ChatBIState {
  messages: ChatMessage[];
  conversationId: string;       // Dify 对话ID
  isLoading: boolean;
  currentDsl?: MetricBiAnalysisCmd;  // 当前对话生成的 DSL
}
```

### 3.5 取数逻辑卡片设计

```
┌─────────────────────────────────────┐
│  📋 取数逻辑                         │
│  ─────────────────────────────────  │
│  指标：销售额（SUM）                  │
│  维度：省份                           │
│  过滤：dt >= 2026-03-30              │
│  排序：销售额 降序                    │
│  限制：TOP 10                        │
│  ─────────────────────────────────  │
│  [查看SQL ▼]                         │
└─────────────────────────────────────┘
```

点击"查看SQL"展开显示 `preview_sql` 返回的 SQL 语句。

### 3.6 快捷提问栏

预设快捷提问按钮，降低用户输入门槛：
- "近7天销售额趋势"
- "各渠道DAU对比"
- "本月销售额TOP10"
- "Q1各部门费用占比"

### 3.7 保存图表交互

当分析结果展示后，消息底部显示「💾 保存为图表」按钮：

点击后弹出表单：
- 图表名称：（默认自动生成，如"华东区近30天销售额排名"）
- 描述：（可选）
- [确认保存]

保存成功后，消息中显示「✅ 已保存到图表管理」+ 跳转链接。

---

## 四、后端接口变更清单

### 4.1 现有接口（无需改动）

| 接口 | 路径 | 说明 |
|------|------|------|
| 指标列表 | `GET /api/v1/metrics/bi/list` | Dify 工具调用 |
| 维度列表 | `GET /api/v1/metrics/bi/dimensions` | Dify 工具调用 |
| 维度值列表 | `GET /api/v1/metrics/bi/dimensions/{dimCode}/values` | 扩展用 |
| 执行分析 | `POST /api/v1/metrics/bi/analysis/execute` | 前端直接调用 |
| 预览 SQL | `POST /api/v1/metrics/bi/analysis/preview-sql` | Dify 工具调用 |
| 保存图表 | `POST /api/v1/charts` | 前端直接调用 |

### 4.2 需新增/调整的接口

| 接口 | 变更 | 说明 |
|------|------|------|
| `POST /api/v1/charts` | **调整** | 当前 `ChartCmd` 要求 `analysisType` 和 `metricAnalysisCmd`。ChatBI 保存时需支持仅传 DSL 的简化模式 |
| 知识库管理 | **新增** | 业务术语表的 CRUD 接口（如需要动态配置） |

**建议**：Phase 1 中知识库以静态 Markdown 文件管理，通过 Dify 知识库功能直接上传，暂不开发管理界面。

---

## 五、开发计划

### 5.1 任务拆分

| # | 任务 | 负责人 | 预估工时 | 依赖 |
|---|------|--------|----------|------|
| 1 | 输出后端 OpenAPI Schema（5个工具） | 后端 | 1d | — |
| 2 | Dify 侧配置：创建应用、导入工具、编写 Prompt、上传知识库 | 后端/运维 | 2d | #1 |
| 3 | 前端：ChatBI 页面框架（对话 UI、消息列表、输入框） | 前端 | 2d | — |
| 4 | 前端：对接 Dify Chat API（流式响应、消息解析） | 前端 | 2d | #2,#3 |
| 5 | 前端：DSL 解析 + execute_analysis 调用 + 图表渲染 | 前端 | 2d | #4 |
| 6 | 前端：取数逻辑卡片 + SQL 预览展开 | 前端 | 1d | #5 |
| 7 | 前端：保存图表功能（弹窗表单 + save_chart 调用） | 前端 | 1d | #5 |
| 8 | 前端：快捷提问栏 | 前端 | 0.5d | #3 |
| 9 | 联调测试：端到端对话 → DSL → 数据 → 图表 | 全链路 | 2d | #2,#5,#7 |
| 10 | 知识库配置：整理业务术语表 Markdown | 产品 | 1d | — |
| | **总计** | | **~14.5d** | |

### 5.2 里程碑

| 里程碑 | 交付物 | 验收标准 |
|--------|--------|----------|
| M1（第3天） | Dify 配置完成 | 在 Dify 中成功完成一次端到端对话测试 |
| M2（第7天） | 前端页面可用 | 用户可在 ChatBI 页面输入自然语言，看到文字回复和图表 |
| M3（第11天） | MVP 完整功能 | 支持多轮对话、过程可验证、一键保存图表 |
| M4（第14天） | 联调完成 | 5组以上典型查询场景测试通过 |

---

## 六、验收标准

### 6.1 功能验收

| 场景 | 用户输入 | 期望结果 |
|------|----------|----------|
| 单轮查询 | "近30天各省份销售额排名" | 展示取数逻辑卡片 + BAR 图 + 保存按钮 |
| 多轮追问 | "只看华东区" | 基于上文追加过滤，展示新图表 |
| 意图澄清 | "销售额" | AI 反问"请问您想查看哪个时间范围的销售额？" |
| 过程可验证 | "近30天销售额" | 展示取数逻辑，点击查看 SQL 可看到完整 SQL |
| 保存图表 | 点击"保存为图表" | 弹出表单，确认后保存成功，提示跳转 |
| 指标卡 | "本月总销售额" | 展示 NUMBER 类型指标卡 |
| 表格 | "本月所有订单明细" | 展示 TABLE 类型表格 |

### 6.2 非功能验收

| 项 | 标准 |
|----|------|
| 响应时间 | Dify 推理 + 后端执行 < 5s（P95） |
| 并发 | 支持 10 人同时对话 |
| 准确率 | 20组标准测试查询，DSL 正确生成率 >= 80% |

---

## 七、附录

### 7.1 Dify API 参考

**Chat Messages API**：
```bash
curl -X POST '{DIFY_BASE_URL}/v1/chat-messages' \
  -H 'Authorization: Bearer {API_KEY}' \
  -H 'Content-Type: application/json' \
  -d '{
    "inputs": {},
    "query": "近30天各省份销售额排名",
    "response_mode": "streaming",
    "conversation_id": "",
    "user": "user-passport"
  }'
```

**Conversations API**（获取历史对话列表）：
```bash
curl -X GET '{DIFY_BASE_URL}/v1/conversations?user={user}' \
  -H 'Authorization: Bearer {API_KEY}'
```

### 7.2 前端技术栈

- React 18 + TypeScript
- Ant Design 5（对话 UI、表单、卡片）
- EChartsChart（已有组件，复用）
- EventSource（接收 Dify 流式响应）

### 7.3 知识库术语表模板

见 `chatbi-knowledge-base-template.md`
