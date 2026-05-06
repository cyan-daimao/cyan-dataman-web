# 数据加工模块一期完善 PRD

## 1. 竞品调研：阿里 DataWorks 数据开发

### 1.1 产品定位

DataWorks 是阿里云一站式大数据开发与治理平台，核心功能覆盖：
- **数据集成**：异构数据源离线/实时同步
- **数据开发**：SQL / Python / Spark / Flink 任务开发与调度
- **数据建模**：维度建模、指标定义
- **数据质量**：规则监控、异常告警
- **数据服务**：API 化数据服务发布

本文聚焦 **数据开发（DataStudio）** 模块，作为 cyan-dataworks 的直接竞品对标。

### 1.2 DataWorks 数据开发核心交互

| 区域 | 功能 | 说明 |
|------|------|------|
| **左侧导航** | 业务流程树 | 按业务域/文件夹组织任务，支持右键新建/删除/重命名/移动/克隆 |
| | 表查询 | 元数据表浏览，双击生成 SELECT 模板 |
| | 回收站 | 删除的任务 30 天内可恢复 |
| **中央编辑区** | SQL 编辑器 | Monaco 风格，支持语法高亮、代码补全、版本对比 |
| | 工具栏 | 运行、停止、提交（保存）、发布、格式化、参数配置 |
| | 参数面板 | 调度参数、资源引用、变量赋值 |
| **底部结果区** | 查询结果 | 表格展示，支持导出 CSV/Excel |
| | 执行计划 | EXPLAIN 可视化 |
| | 运行日志 | 实时流式日志，按 ERROR/WARN/INFO 过滤 |
| | 血缘分析 | 输入表/输出表、字段级血缘链路图 |
| **右侧属性区** | 基础属性 | 任务名称、描述、责任人、优先级 |
| | 调度配置 | Cron、依赖上游、重试策略、超时、资源组 |
| | 版本管理 | 每次提交生成版本快照，支持对比与回滚 |
| | 报警配置 | 失败/超时/慢任务告警，支持钉钉/短信/邮件 |

### 1.3 DataWorks 执行记录管理

DataWorks 的执行记录（运行日志/运维中心）具备以下能力：

| 能力 | 说明 |
|------|------|
| **列表视图** | 按任务/实例/工作流过滤，展示状态、耗时、开始结束时间 |
| **详情抽屉** | 点击记录弹出 Drawer，展示完整执行参数、结果摘要 |
| **日志实时查看** | WebSocket 推送实时日志，支持关键字搜索、下载 |
| **重试机制** | 失败实例支持"重跑"、"重跑下游"、"置成功" |
| **终止操作** | RUNNING 状态实例支持"终止" |
| **批量操作** | 批量重跑、批量置成功、批量终止 |
| **时间轴视图** | 甘特图展示实例执行时间线 |

---

## 2. 功能对标矩阵

| 功能域 | DataWorks | cyan-dataworks 当前状态 | 优先级 |
|--------|-----------|------------------------|--------|
| **任务树组织** | 业务流程 + 文件夹 + 回收站 | ✅ 按 DRAFT/ONLINE/OFFLINE 分组；✅ Folder 表 + 树形查询 | P0 |
| **任务新建** | 右键/按钮新建 | ✅ 左侧"新建任务"按钮 | P0 |
| **任务删除** | 右键删除 + 回收站 | ❌ **UI 缺失**（后端 API 已就绪） | **P0 ← 本期修复** |
| **任务重命名** | 右键重命名 | ❌ 未实现 | P1 |
| **任务移动** | 拖拽/右键移动到文件夹 | ❌ 未实现（Folder 表已支持） | P1 |
| **SQL 编辑器** | Monaco + 代码补全 | ✅ Monaco Editor，基础补全 | P0 |
| **运行/停止** | 运行按钮 + 停止按钮 | ✅ 运行；❌ 停止（Flink 需支持） | P1 |
| **保存/提交** | 提交生成版本 | ✅ 保存（PUT tasks）；❌ 版本管理 | P2 |
| **发布** | 开发 → 生产跨环境发布 | ❌ 占位按钮 | P2 |
| **格式化** | SQL 格式化 | ✅ 基础格式化 | P0 |
| **执行结果** | 表格 + 导出 | ✅ 表格展示；❌ 导出 | P1 |
| **执行计划** | EXPLAIN 可视化 | ✅ 基础 EXPLAIN 解析 | P0 |
| **运行日志** | 实时流式日志 | ✅ 前端日志面板；❌ 后端实时推送 | P1 |
| **执行历史** | 完整列表 + 详情 + 操作 | ⚠️ **列表仅展示基础信息，无详情/重试/终止** | **P0 ← 本期修复** |
| **调度配置** | Cron + 依赖 + 重试 + 超时 + 资源组 | ✅ Cron + 启用开关；⚠️ 超时/重试 UI 有字段但无后端 | P1 |
| **版本管理** | 提交快照 + 对比 + 回滚 | ❌ 占位面板 | P2 |
| **血缘分析** | 字段级血缘图 | ❌ 占位 Tab | P2 |
| **深度检查** | SQL 语法/规范检查 | ❌ 占位 Tab | P2 |

---

## 3. 本期修复项（已完成）

### 3.1 任务删除功能

**问题**：DataWorks 风格 UI 重构后，旧版任务列表的 `Popconfirm` 删除按钮未迁移到新版 `LeftSidebar` 任务树，`DataWorkWorkspace` 工具栏也未保留删除入口。

**修复方案**：
- **后端**：`DELETE /api/v1/data-work/tasks/{id}` 已就绪，无需改动。
- **前端**：
  - `RightSidebar` 属性面板底部操作区增加红色"删除任务"按钮（`Popconfirm` 二次确认）
  - `DataWorkWorkspace` 增加 `handleDelete`：调用 `deleteDataWorkTask` → 成功后清空编辑器（`handleNewTask`）
  - 仅对已保存任务（`taskId` 存在）展示删除按钮

**变更文件**：
- `src/pages/data-work/components/RightSidebar.tsx` — 增加 `onDelete` / `deleting` props 及删除按钮
- `src/pages/data-work/index.tsx` — 增加 `handleDelete` 及状态 `deleting`

### 3.2 执行记录全局查询

**问题**：`LeftSidebar` "执行历史" Tab 仅在选择了具体任务时才能加载记录；未选择任务时显示"请先选择或创建任务"，用户无法查看全局执行历史。

**修复方案**：
- **后端**：新增 `GET /api/v1/data-work/executions` 全局执行记录分页接口（不带 `taskId` 过滤）
  - `ExecutionController` 新增 `page()` 方法
  - `ExecutionRecordRepositoryImpl.page()` 已支持 `taskId == null` 时全量查询
- **前端**：
  - `DataworksApi.ts` 新增 `pageAllExecutions()`
  - `LeftSidebar` 的 `loadHistory`：有 `currentTaskId` 时按任务查询，无任务 ID 时调用全局接口

**变更文件**：
- `cyan-dataworks-application/.../ExecutionController.java` — 新增全局查询接口
- `src/api/DataworksApi.ts` — 新增 `pageAllExecutions`
- `src/pages/data-work/components/LeftSidebar.tsx` — 执行历史加载逻辑调整

---

## 4. 二期功能规划

### 4.1 执行记录详情 Drawer（P1）

在 `LeftSidebar` 执行历史列表点击记录时，弹出 Ant Design `Drawer` 展示：
- 执行基本信息（任务名、引擎、起止时间、耗时、状态）
- SQL 内容（只读，带语法高亮）
- 结果数据预览（成功时展示）
- 错误信息（失败时高亮展示）
- 操作按钮：重试（重新执行同一条 SQL）、终止（RUNNING 状态）

后端依赖：
- `GET /api/v1/data-work/executions/{id}` 已就绪
- 需新增：`POST /api/v1/data-work/executions/{id}/retry`（复用 `executeTask` 逻辑）
- 需新增：`POST /api/v1/data-work/executions/{id}/terminate`（更新状态为 FAILED）

### 4.2 任务右键菜单（P1）

`LeftSidebar` 任务树节点支持右键菜单：
- 新建任务（同级）
- 重命名（`Modal` 输入新名称 → `PUT tasks/{id}`）
- 移动到文件夹（`Modal` 选择目标 folder → 更新 `folder_id`）
- 删除（复用本期删除逻辑）
- 克隆（复制任务 + SQL + 调度配置，名称后缀加 `-副本`）

后端依赖：
- 重命名：复用现有 `updateDataWorkTask`
- 移动：Task 表已有 `folder_id`，复用 `updateDataWorkTask`
- 克隆：新增 `POST /api/v1/data-work/tasks/{id}/clone`

### 4.3 运行停止（P1）

- SparkSQL：通过 datagateway 的异步任务 ID 支持终止
- FlinkSQL：通过 Flink REST API `/jobs/{jobId}/yarn-cancel` 终止
- 前端工具栏增加"停止"按钮（仅 RUNNING 状态可用）

### 4.4 版本管理（P2）

- 每次"提交"（保存）生成版本快照（`task_version` 表）
- `RightSidebar` 版本面板展示版本时间线
- 支持版本对比（Monaco diff editor）与回滚

### 4.5 血缘分析（P2）

- SQL 解析：提取 `FROM` / `JOIN` / `INSERT INTO` 中的表名
- 构建表级血缘关系（`task_lineage` 表）
- `DataWorkResultPanel` 血缘 Tab 展示有向图（D3 / AntV G6）

### 4.6 深度检查（P2）

- SQL 语法预检查：提交前调用 datagateway `EXPLAIN`
- 规范检查：表名规范、分区字段检查、大表扫描告警
- 结果展示在"深度检查"Tab

### 4.7 结果导出（P1）

- `DataWorkResultPanel` 查询结果 Tab 增加"导出 CSV" / "导出 Excel" 按钮
- 后端新增 `POST /api/v1/data-work/executions/{id}/export` 接口

---

## 5. 接口变更清单

### 5.1 本期新增

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/data-work/executions` | 全局执行记录分页查询 |

### 5.2 二期规划新增

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/data-work/executions/{id}/retry` | 重试执行记录 |
| POST | `/api/v1/data-work/executions/{id}/terminate` | 终止运行中实例 |
| POST | `/api/v1/data-work/tasks/{id}/clone` | 克隆任务 |
| POST | `/api/v1/data-work/executions/{id}/export` | 导出执行结果 |

---

## 6. 前端状态映射修正

当前 `DataWorkTaskDTO.status` 使用业务状态枚举（`'DRAFT'|'ONLINE'|'OFFLINE'`），而 `ExecutionRecordDTO.status` 使用执行状态枚举（`'RUNNING'|'SUCCESS'|'FAILED'`）。两者语义不同，不应混用。

| 状态域 | 枚举值 | 用途 |
|--------|--------|------|
| 任务业务状态 | `DRAFT` / `ONLINE` / `OFFLINE` | 任务生命周期管理 |
| 执行状态 | `RUNNING` / `SUCCESS` / `FAILED` | 单次执行结果 |

`DataWorkResultPanel` 底部 Tab 的 `executionStatusConfig` 应保持使用执行状态，与 `ExecutionRecordDTO.status` 保持一致。

---

*文档版本：v1.0*  
*更新日期：2026-04-29*
