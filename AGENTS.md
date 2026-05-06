# cyan-dataman-web

本文件为 AI 编码助手提供项目背景、架构约定和开发指南。阅读者应对本项目一无所知。

## 项目概述

**cyan-dataman-web**（页面标题：DATA-CENTER）是一个企业级数据资产管理平台的前端系统，基于 React 18 + Vite + TypeScript + Ant Design 5 构建。面向数据分析师、BI 工程师、业务运营人员、数据产品经理和数据治理人员，提供元数据管理、指标平台、SQL 查询编辑器、数据加工（SparkSQL / FlinkSQL）、智能分析（BI）等核心能力。

核心功能模块：
- **业务数据库**：业务数据源管理、数据库管理、表结构管理（支持 MySQL / PostgreSQL / Iceberg）、SQL 执行
- **元数据管理**：Gravitino 数据源管理、主题域管理、元数据表管理（含字段信息、数据预览、数据血缘、数据质量、快照、异步任务）
- **指标平台**：指标概览、指标定义、指标字典、指标分析、维度管理、指标配置
- **SQL 查询编辑器**：基于 Monaco Editor 的在线 SQL 编辑器，支持多标签页、执行计划、查询历史、收藏
- **数据加工**：SparkSQL / FlinkSQL 任务编辑、保存、执行与调度配置
- **智能分析（BI）**：数据集管理、图表分析、看板管理（支持拖拽式画布编辑与查看）

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | React 18.2.0 |
| 开发语言 | TypeScript ~5.7.2（严格模式） |
| 构建工具 | Vite 4.5.2 + `@vitejs/plugin-react` |
| UI 组件库 | Ant Design 5.24.2 + `@ant-design/icons` |
| 路由 | react-router-dom 7.2.0（`createBrowserRouter`） |
| 状态管理 | Zustand 5.0.3（已安装，当前代码中未显式使用） |
| HTTP 客户端 | Axios 1.13.2 |
| 代码编辑器 | Monaco Editor 0.55.1（`@monaco-editor/react` 封装，使用本地包 `loader.config({ monaco })`） |
| 样式方案 | Less 4.2.2 + Ant Design CSS-in-JS |
| 代码规范 | ESLint 9.21.0 + `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` |
| E2E 测试 | Playwright 1.59.1（已安装，无已编写用例） |
| 图表渲染 | Puppeteer 24.40.0（已安装，用于 BI 模块服务端渲染场景） |

## 构建与运行命令

项目使用 `npm` 和 `yarn` 混合管理（`package-lock.json` 和 `yarn.lock` 均存在，流水线使用 `yarn`）。

```bash
# 安装依赖
npm install
# 或
yarn install

# 开发服务器（dev 模式，默认 http://localhost:5173）
npm run dev
# 或
yarn dev

# 构建（按环境区分）
npm run build:pre    # 预发环境
npm run build:prod   # 生产环境
npm run build:local  # 本地环境

# 预览生产构建
npm run preview

# 代码检查
npx eslint .
```

## 项目结构

```
src/
├── api/                    # API 接口层
│   ├── Request.ts          # Axios 多业务线请求封装
│   ├── Response.ts         # 统一响应类型定义
│   ├── DataSourceApi.ts    # Gravitino 目录/Schema/表 API
│   ├── DSApi.ts            # 业务数据源/数据库/表结构/SQL 执行 API
│   ├── EmployeeApi.ts      # 员工信息 API
│   ├── LoginApi.ts         # 登录 API（独立 axios，不走拦截器）
│   ├── MetadataSubjectAPI.ts  # 主题域管理 API
│   ├── MetadataTableAPI.ts    # 元数据表 CRUD、快照管理 API
│   ├── DatagawayApi.ts     # 数据网关 API（StarRocks / SparkSQL 执行）
│   ├── DataworksApi.ts     # 数据加工任务/调度/执行记录 API
│   ├── DatabiApi.ts        # 智能分析（BI）数据集/图表/看板 API
│   ├── MetricApi.ts        # 指标平台指标定义/字典/血缘/分析 API
│   ├── MetricConfigApi.ts  # 指标配置 API
│   ├── MetricSubjectApi.ts # 指标主题域 API
│   ├── DimensionCategoryApi.ts  # 维度分类 API
│   └── ManualUploadApi.ts  # 手动上传 API
├── component/              # 公共组件（目前仅 employee/EmployeeSelect.tsx）
├── pages/                  # 页面组件（按业务模块划分）
│   ├── layout/             # 顶层布局（顶部导航栏 + Content + Footer）
│   ├── login/              # 登录页（独立页面，无布局）
│   ├── index.tsx           # 主页（ConfigProvider 包裹 Layout，定义全局主题）
│   ├── metadata/           # 元数据平台（含侧边栏布局）
│   │   ├── business_db/    # 业务数据库（数据源/数据库/表结构/SQL）
│   │   ├── datasource/     # 元数据数据源
│   │   ├── subject/        # 主题域管理
│   │   └── metadata_table/ # 元数据表（列表/导入/详情/编辑/子组件）
│   ├── metrics/            # 指标平台（含侧边栏布局）
│   │   ├── dashboard/      # 指标概览
│   │   ├── definition/     # 指标定义
│   │   ├── dictionary/     # 指标字典
│   │   ├── analysis/       # 指标分析
│   │   ├── dimension/      # 维度管理
│   │   └── config/         # 指标配置
│   ├── sql-editor/         # SQL 查询编辑器
│   │   └── components/     # Sidebar / SQLEditor / ResultPanel
│   ├── data-work/          # 数据加工
│   │   └── components/     # LeftSidebar / RightSidebar / DataWorkResultPanel
│   └── bi/                 # 智能分析（BI）
│       ├── dataset/        # 数据集管理
│       ├── chart/          # 图表分析
│       ├── dashboard/      # 看板管理（编辑/查看）
│       └── components/     # SimpleCanvasChart 等
├── router/
│   └── index.tsx           # createBrowserRouter 路由定义
├── utils/
│   └── storage.ts          # localStorage 封装（自动 JSON 序列化）
├── App.tsx                 # 根组件（RouterProvider）
├── App.less                # 全局样式（仅重置 body/html margin/padding/height）
├── main.tsx                # 应用入口（React StrictMode + createRoot）
└── vite-env.d.ts           # Vite 客户端类型声明
```

## 代码组织与架构约定

### 1. 路由与布局

- 路由定义在 `src/router/index.tsx`，所有页面组件使用 `React.lazy(() => import('@/pages/xxx'))` 懒加载。
- 鉴权通过 `PrivateRoute` 组件实现：检查 `localStorage.getItem('token')`，无 token 则跳转 `/login` 并携带原页面地址 `state={{from: window.location.pathname}}`。
- `/login` 和 `/about` 为独立页面，不使用 `layout` 布局。
- 顶层布局 `src/pages/layout/index.tsx`：顶部水平导航栏（元数据平台 / 指标平台 / SQL查询 / 数据加工 / 智能分析）+ Content 区域 + Footer。
- 元数据平台、指标平台和智能分析（BI）采用相同的**嵌套侧边栏布局模式**：
  - `src/pages/metadata/index.tsx` 使用 `MetadataLevelContext`（`createContext`）追踪嵌套层级。
  - `src/pages/metrics/index.tsx` 使用 `MetricsLevelContext` 追踪嵌套层级。
  - `src/pages/bi/index.tsx` 使用 `BiLevelContext` 追踪嵌套层级。
  - 第一层渲染 `Layout.Sider + Layout.Content`，嵌套层直接渲染 `<Outlet />`。
  - 侧边栏支持折叠，折叠按钮悬浮在侧边栏右边缘（metadata 布局的折叠按钮在标题栏内）。

### 2. API 请求架构

`src/api/Request.ts` 封装了多业务线的 Axios 实例：

- **默认导出**：`dataman` 业务线请求实例
- **命名导出**：
  - `employeeRequest`（员工服务）
  - `datamanRequest`（数据管理）
  - `datagatewayRequest`（数据网关）
  - `datametricRequest`（指标平台）
  - `databiRequest`（智能分析 BI）
  - `dataworksRequest`（数据加工）
- **环境配置**：`envURL` 对象按 `import.meta.env.MODE` 区分 `dev` / `pre` / `prod` / `production` 四组后端地址
- **拦截器**：
  - 请求拦截器：自动附加 `Bearer token`（从 `localStorage` 读取 `KEY.TOKEN`）。无 token 时直接跳转 `/login`。
  - 响应拦截器：统一处理非 200 code（`message.error`）、401（清除 token 跳转登录）、403、500 等状态。
  - **关键约定**：响应拦截器已将 `response.data` 直接返回，API 函数中拿到的就是后端 `Response<T>` 结构，**无需再取 `.data`**。

各 API 模块按业务域拆分：

| 文件 | 业务域 | 请求实例 |
|------|--------|----------|
| `DataSourceApi.ts` | Gravitino 目录/Schema/表 | `datamanRequest` |
| `MetadataTableAPI.ts` | 元数据表 CRUD、主题-表树、快照管理 | `datamanRequest` |
| `MetadataSubjectAPI.ts` | 主题域管理 | `datamanRequest` |
| `DSApi.ts` | 业务数据源配置、数据库、表结构、SQL 执行 | `datamanRequest` |
| `DatagawayApi.ts` | StarRocks SQL 执行、SparkSQL 执行 | `datagatewayRequest` |
| `DataworksApi.ts` | 数据加工任务、调度配置、执行记录 | `dataworksRequest` |
| `DatabiApi.ts` | BI 数据集、图表、看板、分析执行 | `databiRequest` |
| `MetricApi.ts` | 指标定义、字典、血缘、Dashboard 统计、分析 | `datametricRequest` |
| `MetricConfigApi.ts` | 指标配置 | `datametricRequest` |
| `MetricSubjectApi.ts` | 指标主题域 | `datametricRequest` |
| `DimensionCategoryApi.ts` | 维度分类 | `datametricRequest` |
| `EmployeeApi.ts` | 员工信息 | `employeeRequest` |
| `LoginApi.ts` | 登录（独立 axios，不经过拦截器） | 独立 axios |

### 3. 组件复用模式

`sql-editor` 和 `data-work` 两个页面共享以下组件（均位于 `src/pages/sql-editor/components/`）：

- `Sidebar.tsx` / `LeftSidebar.tsx` — 左侧数据源/表/历史/收藏侧边栏
- `SQLEditor.tsx` — Monaco SQL 编辑器
- `ResultPanel.tsx` / `DataWorkResultPanel.tsx` — 结果/执行计划/错误/日志展示面板

`data-work` 额外包含 `RightSidebar.tsx` 用于任务属性、调度配置、版本、运行配置的右侧面板。

### 4. 状态持久化

SQL 编辑器和数据加工页面使用 localStorage 持久化标签页状态：

- `sql_editor_tabs` / `sql_editor_active_tab` — SQL 编辑器
- `data_work_tabs` / `data_work_active_tab` / `data_work_engine` — 数据加工
- `sql_history` / `data_work_history` — 查询历史（各保留最近 50 条）

通用存储工具为 `src/utils/storage.ts`，提供 `setStorage` / `getStorage` / `removeStorage` / `clearStorage` / `hasStorage`，自动 JSON 序列化/反序列化。

### 5. 路径别名

Vite 和 TypeScript 均配置路径别名 `@/` 指向 `./src`：

- `vite.config.ts`：`resolve.alias['@'] = path.resolve(__dirname, './src')`
- `tsconfig.app.json`：`paths: { "@/*": ["src/*"] }`

## 代码风格指南

- **TypeScript 严格模式**：`tsconfig.app.json` 中 `strict: true`，且开启 `noUnusedLocals: true` / `noUnusedParameters: true`，未使用的变量/参数会编译报错。
- **组件风格**：函数式组件 + Hooks，组件命名 PascalCase，文件命名与组件名保持一致。
- **样式**：全局样式在 `src/App.less`；组件级样式使用同目录 `.less` 文件（如 `src/pages/layout/index.less`）；Ant Design 主题通过 `theme.useToken()` 获取 token。
- **注释**：代码注释和文档使用中文。
- **Ant Design 中文**：`src/pages/index.tsx` 中通过 `ConfigProvider locale={zhCN}` 全局配置中文，并设置 `dayjs.locale('zh-cn')`。
- **主题定制**：全局主题色为 `#4F6DF5`（现代靛蓝），圆角统一 8px，背景色柔和，参考 `src/pages/index.tsx` 中的 `themeConfig`。

## 关键配置与陷阱

### Vite 配置（`vite.config.ts`）

- **禁止**使用 `define: { global: 'globalThis' }`，这会导致对象属性名 `global` 也被替换为 `globalThis`，破坏 axios 的 `utils.global`。
- 正确做法：通过 `define: { 'typeof global': JSON.stringify('object') }` + `rollupOptions.output.intro` 注入 polyfill：
  ```js
  if (typeof global === 'undefined') { var global = globalThis; }
  ```
- `index.html` 中也内联了同样的 polyfill script。
- 构建目标：`esnext`。

### ESLint 配置（`eslint.config.js`）

- 使用 `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`。
- `react-refresh/only-export-components` 规则允许常量导出（`allowConstantExport: true`）。
- 忽略 `dist` 目录。

### Dify 智能问数集成（`index.html`）

- 页面内嵌了 Dify Chatbot 配置和样式，用于 SQL 查询页面的智能问答助手。
- 悬浮按钮默认隐藏（`display: none`），由 `sql-editor/index.tsx` 中的 MutationObserver 控制显示。
- 相关配置硬编码在 `index.html` 的 `<script>` 标签中，包括 `token` 和 `baseUrl`。

## 测试策略

- 项目已安装 Playwright（`@playwright/test`），但当前代码库中**没有已编写的测试用例文件**。
- 未安装单元测试框架（如 Jest / Vitest）。
- 代码检查依赖 ESLint：`npx eslint .`

## 安全与认证

- **Token 存储**：JWT token 存储在 `localStorage`（`KEY.TOKEN`），登录成功后写入，401 时清除。
- **当前登录用户信息**：存储在 `localStorage`（`KEY.CURRENT`），由 `EmployeeApi.currentEmployee()` 获取。
- **登录流程**：`LoginApi.ts` 使用独立 axios 实例（不经过 `Request.ts` 的拦截器），调用员工服务登录接口获取 token。
- **路由守卫**：除 `/login` 和 `/about` 外，主要路由默认通过 `PrivateRoute` 鉴权。
- **密码硬编码**：`src/pages/login/index.tsx` 中表单存在初始默认值 `username: 'cyan1', password: '12345'`，这是开发调试用的硬编码凭据。

## 部署与发布

### 构建产物

Vite 构建输出到 `dist/` 目录，为纯静态文件（SPA）。

### Nginx 配置（`nginx.conf`）

- 监听 80 端口，root 指向 `/usr/share/nginx/html`。
- **SPA 路由支持**：`location / { try_files $uri $uri/ /index.html; }`
- 静态资源缓存：`js/css/png/ico/svg/woff/ttf` 等缓存 1 年，`Cache-Control: public, immutable`。

### CI/CD 流水线（`script/pipeline`）

Jenkins Pipeline（Kubernetes Agent），支持 dev / pre / prod / local 四环境：

1. **拉取代码**：从 GitHub 克隆指定分支。
2. **Vite 构建**：使用 `yarn install --frozen-lockfile` 安装依赖，执行 `yarn build:${params.env}`。
3. **构建并推送镜像**：使用 Kaniko 构建多阶段 Dockerfile（Node 构建 -> Nginx Alpine 运行），推送到 Harbor（`harbor.cyan.com`）。
4. **部署到 K8s**：生成 Deployment + Service + Ingress，部署到对应 namespace（按环境参数），域名格式为 `${APP_NAME}-${K8S_NAMESPACE}.cyan.com`。

流水线容器：
- `node:lts-bullseye` — 构建
- `gcr.io/kaniko-project/executor:debug` — 镜像构建与推送
- `gcr.io/cloud-builders/kubectl` — K8s 部署

## 开发注意事项

1. **新增页面路由**：在 `src/router/index.tsx` 中注册，采用 `React.lazy()` 懒加载，需要鉴权的用 `PrivateRoute` 包裹。
2. **新增 API 模块**：参考现有模式（如 `DSApi.ts` 或 `DatabiApi.ts`），定义 TypeScript 接口类型 + 导出请求函数，按业务域选择正确的请求实例（`datamanRequest` / `employeeRequest` / `datagatewayRequest` / `datametricRequest` / `databiRequest` / `dataworksRequest`）。
3. **Monaco Editor**：首次加载需要初始化时间，页面中通过 `loader.config({ monaco })` 预加载本地包，需处理 `editorInitializing` 状态显示加载动画。
4. **响应拦截器**：API 函数拿到的就是后端 `Response<T>`，不要 `.data.data` 这种双重取值。
5. **环境变量**：前端环境通过 `import.meta.env.MODE` 区分，后端地址在 `src/api/Request.ts` 中硬编码配置。
6. **BI 模块图表**：BI 模块使用 `SimpleCanvasChart.tsx` 进行客户端图表渲染，同时后端支持 Puppeteer 服务端渲染。

## 相关文档

- `vibecoding/AGENTS.md` — 项目基础文档（含常见任务指南）
- `vibecoding/requirements/PRD-数据资产平台.md` — 产品需求文档
- `vibecoding/requirements/ds/ds需求一期.md` — 业务数据库模块需求文档
