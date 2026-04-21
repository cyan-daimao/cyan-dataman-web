# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

数据资产管理平台前端（DATA-CENTER），基于 React 18 + Vite + TypeScript + Ant Design 5 构建。提供元数据管理、指标平台、SQL 编辑器、数据加工等功能模块。

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（dev 模式） |
| `npm run build:pre` | 构建预发环境包 |
| `npm run build:prod` | 构建生产环境包 |
| `npm run build:local` | 构建本地环境包 |
| `npm run preview` | 预览生产构建 |
| `npx eslint .` | 运行 ESLint 检查 |

## 技术栈

- **构建工具**: Vite 4 + `@vitejs/plugin-react`
- **UI 框架**: Ant Design 5 + `@ant-design/icons`
- **状态管理**: Zustand（未在代码中显式使用，但已安装）
- **路由**: `react-router-dom` v7（BrowserRouter）
- **HTTP 客户端**: Axios（封装在 `src/api/Request.ts`）
- **代码编辑器**: Monaco Editor（`@monaco-editor/react` + `monaco-editor`）
- **样式**: Less + CSS-in-JS（Ant Design 默认）
- **类型检查**: TypeScript 5.7（严格模式，启用 `noUnusedLocals` / `noUnusedParameters`）

## 项目架构

### 路由结构

应用采用 `createBrowserRouter` 定义路由，顶层布局为 `src/pages/layout/index.tsx`（顶部导航栏 + 内容区），各模块使用嵌套布局：

- `/` → 首页欢迎页（PrivateRoute 鉴权）
- `/login` → 登录页（独立页面，无布局）
- `/meta` → 元数据平台（嵌套 `Metadata` 侧边栏布局）
  - `/meta/business-ds/*` → 业务数据库（数据源 / 数据库 / 表结构 / SQL执行）
  - `/meta/metadata/*` → 元数据管理（数据源 / 主题管理 / 元数据表）
- `/metrics` → 指标平台（嵌套 `Metrics` 侧边栏布局）
  - `/metrics/dashboard` → 指标概览
  - `/metrics/definition` → 指标定义
  - `/metrics/dictionary` → 指标字典
  - `/metrics/analysis` → 指标分析
  - `/metrics/config` → 指标配置
- `/sql-editor` → SQL 查询编辑器
- `/data-work` → 数据加工（SparkSQL / FlinkSQL）

路由懒加载：所有页面组件均使用 `React.lazy()` 动态导入。

### API 请求架构

`src/api/Request.ts` 封装了多业务线的 Axios 实例：

- **默认导出**: `dataman` 业务线请求实例
- **命名导出**: `employeeRequest`（员工服务）、`datagatewayRequest`（数据网关）
- **环境配置**: `envURL` 对象按 `import.meta.env.MODE` 区分 dev/pre/prod/production 四组后端地址
- **拦截器**: 请求自动附加 `Bearer token`（从 localStorage 读取）；响应统一处理 401 跳转登录、全局错误提示（Ant Design `message.error`）

各 API 模块按业务域拆分：

| 文件 | 业务域 | 请求实例 |
|------|--------|----------|
| `DataSourceApi.ts` | Gravitino 目录/Schema/表 | `datamanRequest` |
| `MetadataTableAPI.ts` | 元数据表 CRUD、主题-表树、快照管理 | `datamanRequest` |
| `MetadataSubjectAPI.ts` | 主题域管理 | `datamanRequest` |
| `DSApi.ts` | 业务数据源配置、数据库、表结构、SQL 执行 | `datamanRequest` |
| `DatagawayApi.ts` | StarRocks SQL 执行、SparkSQL 执行 | `datagatewayRequest` |
| `EmployeeApi.ts` | 员工信息 | `employeeRequest` |
| `LoginApi.ts` | 登录（独立 axios，不经过拦截器） | 独立 axios |

### 布局组件模式

元数据平台（`src/pages/metadata/index.tsx`）和指标平台（`src/pages/metrics/index.tsx`）采用相同的侧边栏布局模式：

- 使用 `createContext`（`MetadataLevelContext` / `MetricsLevelContext`）追踪嵌套层级
- 第一层渲染 `Layout.Sider + Layout.Content`，嵌套层直接渲染 `<Outlet />`
- 侧边栏支持折叠，折叠按钮悬浮在侧边栏右边缘

### SQL 编辑器组件复用

`sql-editor` 和 `data-work` 两个页面共享以下组件：

- `src/pages/sql-editor/components/Sidebar.tsx` — 左侧数据源/表/历史/收藏侧边栏
- `src/pages/sql-editor/components/SQLEditor.tsx` — Monaco SQL 编辑器
- `src/pages/sql-editor/components/ResultPanel.tsx` — 结果/执行计划/错误展示面板

`data-work` 额外包含 `ScheduleSidebar.tsx` 用于任务调度配置。

### 状态持久化

SQL 编辑器和数据加工页面使用 localStorage 持久化标签页状态：

- `sql_editor_tabs` / `sql_editor_active_tab` — SQL 编辑器
- `data_work_tabs` / `data_work_active_tab` / `data_work_engine` — 数据加工
- `sql_history` / `data_work_history` — 查询历史（各保留最近 50 条）

### 通用组件

- `src/component/employee/EmployeeSelect.tsx` — 员工下拉选择器（适配 Ant Design Form，从员工服务加载数据）

### 工具函数

- `src/utils/storage.ts` — localStorage 封装（`setStorage` / `getStorage` / `removeStorage`），自动 JSON 序列化/反序列化

## 重要配置

### Vite 配置（`vite.config.ts`）

- 路径别名: `@/` → `./src`
- `global` polyfill: 通过 `define` + `rollupOptions.output.intro` 注入，**禁止**使用 `define: { global: 'globalThis' }`（会导致对象属性名也被替换，破坏 axios）
- 构建目标: `esnext`

### TypeScript 配置（`tsconfig.app.json`）

- 严格模式开启
- `noUnusedLocals: true` / `noUnusedParameters: true` — 未使用的变量/参数会报错
- 路径映射: `@/*` → `src/*`

### ESLint 配置（`eslint.config.js`）

- 使用 `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`
- 忽略 `dist` 目录

## 开发注意事项

- 所有页面组件默认通过 `PrivateRoute` 鉴权，未登录自动跳转 `/login`；登录接口独立使用 axios，不经过请求拦截器
- Monaco Editor 使用本地包（`loader.config({ monaco })`），首次加载需要初始化时间
- 响应拦截器已将 `response.data` 直接返回，API 函数中拿到的就是后端 `Response<T>` 结构，无需再取 `.data`
- 新增页面路由需在 `src/router/index.tsx` 中注册，并采用 `React.lazy()` 懒加载
- 新增 API 模块参考现有模式：定义接口类型 + 导出请求函数，按业务域选择正确的请求实例
