# cyan-dataman-web 项目文档

## 项目概述

**cyan-dataman-web** 是一个基于 React + TypeScript 的数据资产管理前端系统，用于管理企业的数据资产、元数据、主题域和指标平台。

### 核心功能模块

- **元数据管理**：数据源管理、主题域管理、元数据表管理
- **指标平台**：指标管理和配置
- **SQL 编辑器**：在线 SQL 查询和编辑
- **数据加工**：数据处理和调度管理

### 技术栈

- **前端框架**：React 18.2.0
- **开发语言**：TypeScript 5.7.2
- **构建工具**：Vite 4.5.2
- **UI 组件库**：Ant Design 5.24.2
- **路由管理**：React Router 7.2.0
- **状态管理**：Zustand 5.0.3
- **HTTP 客户端**：Axios 1.13.2
- **代码编辑器**：Monaco Editor 0.55.1
- **样式方案**：Less 4.2.2
- **代码规范**：ESLint 9.21.0

## 项目结构

```
src/
├── api/                          # API 接口层
│   ├── Request.ts                # Axios 请求封装
│   ├── Response.ts               # 响应类型定义
│   ├── DataSourceApi.ts          # 数据源 API
│   ├── EmployeeApi.ts            # 员工 API
│   ├── LoginApi.ts               # 登录 API
│   ├── MetadataSubjectAPI.ts     # 主题域 API
│   ├── MetadataTableAPI.ts       # 元数据表 API
│   └── DatagawayApi.ts           # 数据网关 API
├── component/                    # 公共组件
│   └── employee/
│       └── EmployeeSelect.tsx    # 员工选择器组件
├── pages/                        # 页面组件
│   ├── index.tsx                 # 主页
│   ├── layout/                   # 布局组件
│   │   ├── index.tsx             # 主布局
│   │   ├── index.less            # 布局样式
│   │   └── logo/                 # Logo 组件
│   ├── login/                    # 登录页
│   ├── metadata/                 # 元数据管理模块
│   │   ├── index.tsx             # 元数据主页
│   │   ├── datasource/           # 数据源管理
│   │   ├── subject/              # 主题域管理
│   │   └── metadata_table/       # 元数据表管理
│   │       ├── index.tsx         # 表管理主页
│   │       ├── ImportTableForm.tsx  # 导入表表单
│   │       ├── TableEditPage.tsx    # 表编辑页面
│   │       ├── TableDetailPage.tsx  # 表详情页面
│   │       └── detail/              # 详情子组件
│   │           ├── BasicInfo.tsx       # 基本信息
│   │           ├── FieldInfo.tsx       # 字段信息
│   │           ├── DataPreview.tsx     # 数据预览
│   │           ├── DataLineage.tsx     # 数据血缘
│   │           ├── DataQuality.tsx     # 数据质量
│   │           ├── ScheduleInfo.tsx    # 调度信息
│   │           └── Snapshot.tsx        # 快照
│   ├── metrics/                  # 指标平台
│   ├── sql-editor/               # SQL 编辑器
│   │   ├── index.tsx             # 编辑器主页
│   │   ├── types.ts              # 类型定义
│   │   └── components/
│   │       ├── SQLEditor.tsx     # SQL 编辑器组件
│   │       ├── Sidebar.tsx       # 侧边栏
│   │       └── ResultPanel.tsx   # 结果面板
│   └── data-work/                # 数据加工
│       ├── index.tsx             # 主页面
│       ├── types.ts              # 类型定义
│       └── components/
│           └── ScheduleSidebar.tsx # 调度侧边栏
├── router/                       # 路由配置
│   └── index.tsx
├── utils/                        # 工具函数
│   └── storage.ts                # 本地存储工具
├── App.tsx                       # 应用根组件
├── App.less                      # 全局样式
└── main.tsx                      # 应用入口
```

## 构建和运行

### 安装依赖

```bash
npm install
# 或
yarn install
```

### 开发环境

```bash
npm run dev
# 或
yarn dev
```

开发服务器默认运行在 `http://localhost:5173`

### 生产构建

根据不同环境构建：

```bash
# 预发环境构建
npm run build:pre

# 生产环境构建
npm run build:prod

# 本地环境构建
npm run build:local
```

### 预览构建结果

```bash
npm run preview
```

## 环境配置

项目支持多环境配置，通过 Vite 的 mode 参数区分不同环境：

| 环境 | mode | 说明 |
|------|------|------|
| 开发环境 | dev | 本地开发使用 |
| 预发环境 | pre | 预发布测试 |
| 生产环境 | prod | 正式环境 |
| 本地环境 | local | 本地构建 |

各环境的 API 基础 URL 配置在 `src/api/Request.ts` 中：

```typescript
const envURL = {
    "dev": {
        dataman: "http://cyan-dataman.cyan.com/",
        employee: "http://cyan-employee.cyan.com/",
        datagateway: "http://cyan-datagateway.cyan.com/"
    },
    "pre": {
        dataman: "http://cyan-dataman.cyan.com/",
        employee: "http://cyan-employee.cyan.com/",
        datagateway: "http://cyan-datagateway.cyan.com/"
    },
    "prod": {
        dataman: "http://cyan-dataman-prod.cyan.com/",
        employee: "http://cyan-employee-prod.cyan.com/",
        datagateway: "http://cyan-datagateway-prod.cyan.com/"
    }
}
```

## 开发约定

### 代码风格

- 使用 TypeScript 严格模式
- 使用函数式组件和 Hooks
- 遵循 React 最佳实践
- 使用 Ant Design 组件库保持 UI 一致性
- 使用 Less 进行样式管理

### API 接口规范

所有 API 请求通过 `src/api/Request.ts` 封装的 Axios 实例进行：

```typescript
// 导入请求实例
import datamanRequest from '@/api/Request';

// 发起 GET 请求
const data = await datamanRequest.get('/api/v1/xxx');

// 发起 POST 请求
const result = await datamanRequest.post('/api/v1/xxx', { ... });
```

支持多业务线的请求实例：
- `datamanRequest` - 数据管理业务线（默认）
- `employeeRequest` - 员工管理业务线
- `datagatewayRequest` - 数据网关业务线

### 路由规范

- 使用 `React.lazy()` 实现路由懒加载
- 使用 `PrivateRoute` 组件进行路由守卫
- 使用 `Outlet` 渲染子路由

```typescript
const Component = React.lazy(() => import('@/pages/xxx/index.tsx'))

const routes = [
    {
        path: '/path',
        element: <PrivateRoute><Component/></PrivateRoute>,
        children: [...]
    }
]
```

### 组件规范

- 公共组件放在 `src/component/` 目录
- 页面组件放在 `src/pages/` 对应模块目录
- 组件命名使用 PascalCase
- 文件命名与组件名保持一致

### 认证机制

- Token 存储在 localStorage 中
- 请求时通过 Authorization header 携带 Token
- 401 状态码自动跳转到登录页

```typescript
// 存储和获取 Token
import { getStorage, KEY } from '@/utils/storage';
const token = getStorage(KEY.TOKEN, '');
```

## 开发流程

### 1. 添加新页面

1. 在 `src/pages/` 对应模块下创建页面组件
2. 在 `src/router/index.tsx` 中添加路由配置
3. 如需认证，使用 `PrivateRoute` 包裹

### 2. 添加新 API

1. 在 `src/api/` 目录下创建对应的 API 文件
2. 导入合适的请求实例（`datamanRequest`、`employeeRequest` 或 `datagatewayRequest`）
3. 定义 TypeScript 接口类型
4. 导出 API 函数

```typescript
// src/api/ExampleApi.ts
import datamanRequest from './Request';
import { ApiResponse } from './Response';

export interface ExampleDTO {
    id: string;
    name: string;
}

export const getExample = async (): Promise<ApiResponse<ExampleDTO[]>> => {
    return await datamanRequest.get('/api/v1/examples');
}
```

### 3. 添加公共组件

1. 在 `src/component/` 对应目录下创建组件
2. 使用 TypeScript 定义 Props 类型
3. 保持组件的独立性和可复用性

## 路由结构

```
/                           # 主页（需认证）
├── /metadata               # 元数据管理
│   ├── /datasource         # 数据源管理
│   ├── /subject            # 主题域管理
│   └── /metadata_table     # 元数据表管理
│       ├── /detail         # 表详情
│       └── /edit           # 表编辑
├── /metrics                # 指标平台
├── /sql-editor             # SQL 编辑器
└── /data-work              # 数据加工
/login                      # 登录页
```

## 常见任务

### 添加新的环境配置

在 `src/api/Request.ts` 中的 `envURL` 对象添加新的环境配置：

```typescript
const envURL = {
    "new-env": {
        dataman: "your-api-url",
        employee: "your-employee-url",
        datagateway: "your-datagateway-url"
    }
}
```

然后在 `package.json` 中添加对应的构建脚本：

```json
{
    "scripts": {
        "build:new-env": "vite build --mode new-env"
    }
}
```

### 修改主题或样式

- 全局样式修改：`src/App.less`
- 组件样式修改：在组件同目录下创建对应的 `.less` 文件
- Ant Design 主题定制：参考 Ant Design 官方文档

### 调试 API 请求

在浏览器开发者工具的 Network 标签中查看请求详情。请求拦截器和响应拦截器的日志输出可以在控制台查看。

## 注意事项

1. **Token 管理**：确保所有需要认证的接口都携带 Token
2. **环境切换**：开发和部署时注意使用正确的环境模式
3. **路由守卫**：新增路由时根据是否需要认证决定是否使用 `PrivateRoute`
4. **类型安全**：充分利用 TypeScript 类型检查，避免使用 `any`
5. **性能优化**：合理使用路由懒加载和组件懒加载
6. **错误处理**：API 调用失败时需要适当的错误提示和处理

## 相关资源

- [React 官方文档](https://react.dev/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
- [Vite 官方文档](https://vitejs.dev/)
- [Ant Design 官方文档](https://ant.design/)
- [React Router 官方文档](https://reactrouter.com/)
- [Monaco Editor 官方文档](https://microsoft.github.io/monaco-editor/)
