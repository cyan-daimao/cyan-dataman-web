import {createBrowserRouter, Navigate} from "react-router-dom";
import React from 'react'

const Login = React.lazy(() => import((`@/pages/login/index.tsx`)))

const Index = React.lazy(() => import((`@/pages/index.tsx`)))
const HomePage = React.lazy(() => import((`@/pages/home/index.tsx`)))
const Metadata = React.lazy(() => import((`@/pages/metadata/index.tsx`)))
const Datasource = React.lazy(() => import((`@/pages/metadata/datasource/index.tsx`)))
const Subject = React.lazy(() => import((`@/pages/metadata/subject/index.tsx`)))
const MetadataTable = React.lazy(() => import((`@/pages/metadata/metadata_table/index.tsx`)))
const TableEditPage = React.lazy(() => import((`@/pages/metadata/metadata_table/TableEditPage.tsx`)))
const TableDetailPage = React.lazy(() => import((`@/pages/metadata/metadata_table/TableDetailPage.tsx`)))
const Metrics = React.lazy(() => import((`@/pages/metrics/index.tsx`)))

// 指标平台子页面
const MetricsDashboard = React.lazy(() => import((`@/pages/metrics/dashboard/index.tsx`)))
const MetricsDefinition = React.lazy(() => import((`@/pages/metrics/definition/index.tsx`)))
const MetricsDictionary = React.lazy(() => import((`@/pages/metrics/dictionary/index.tsx`)))
const MetricsAnalysis = React.lazy(() => import((`@/pages/metrics/analysis/index.tsx`)))
const MetricsConfig = React.lazy(() => import((`@/pages/metrics/config/index.tsx`)))
const MetricsDimension = React.lazy(() => import((`@/pages/metrics/dimension/index.tsx`)))
const SQLEditor = React.lazy(() => import((`@/pages/sql-editor/index.tsx`)))
const DataWork = React.lazy(() => import((`@/pages/data-work/index.tsx`)))
const JobInstancePage = React.lazy(() => import((`@/pages/data-work/JobInstancePage.tsx`)))


// 业务数据库模块
const BusinessDsDatasource = React.lazy(() => import((`@/pages/metadata/business_db/datasource/index.tsx`)))
const BusinessDsDatabase = React.lazy(() => import((`@/pages/metadata/business_db/database/index.tsx`)))
const BusinessDsTableSchema = React.lazy(() => import((`@/pages/metadata/business_db/table_schema/index.tsx`)))
const TableSchemaEdit = React.lazy(() => import((`@/pages/metadata/business_db/table_schema/TableSchemaEdit.tsx`)))
const TableSchemaDetail = React.lazy(() => import((`@/pages/metadata/business_db/table_schema/TableSchemaDetail.tsx`)))
const BusinessDsSql = React.lazy(() => import((`@/pages/metadata/business_db/sql/index.tsx`)))

// 权限管理模块
const AuthLayout = React.lazy(() => import((`@/pages/auth/index.tsx`)))
const AuthRole = React.lazy(() => import((`@/pages/auth/role/index.tsx`)))
const AuthUser = React.lazy(() => import((`@/pages/auth/user/index.tsx`)))
const AuthMetric = React.lazy(() => import((`@/pages/auth/metric/index.tsx`)))
const AuthApproval = React.lazy(() => import((`@/pages/auth/approval/index.tsx`)))
const AuthAudit = React.lazy(() => import((`@/pages/auth/audit/index.tsx`)))
const AuthMy = React.lazy(() => import((`@/pages/auth/my/index.tsx`)))

// 403 页面
const ForbiddenPage = React.lazy(() => import((`@/pages/auth/ForbiddenPage.tsx`)))

// 智能分析（BI）模块
const BiLayout = React.lazy(() => import((`@/pages/bi/index.tsx`)))
const ChartList = React.lazy(() => import((`@/pages/bi/chart/index.tsx`)))
const ChartAnalyzer = React.lazy(() => import((`@/pages/bi/chart/ChartAnalyzer.tsx`)))
const DashboardList = React.lazy(() => import((`@/pages/bi/dashboard/index.tsx`)))
const DashboardEditor = React.lazy(() => import((`@/pages/bi/dashboard/DashboardEditor.tsx`)))
const DashboardViewer = React.lazy(() => import((`@/pages/bi/dashboard/DashboardViewer.tsx`)))
const ChatBI = React.lazy(() => import((`@/pages/bi/chatbi/index.tsx`)))

// 鉴权组件：拦截未登录的访问
const PrivateRoute = ({children}: { children: React.ReactNode }) => {
    const hasToken = !!localStorage.getItem('token');
    if (!hasToken) {
        // 核心：跳转到登录页时，传递当前页面地址（location.pathname）
        return <Navigate to="/login" state={{from: window.location.pathname}} replace/>;
    }
    return <>{children}</>;
};

// 权限守卫组件：检查功能权限（Phase 1 使用本地 mock，后续切换为真实 API）
const PermissionGuard = ({ permission, children }: { permission: string; children: React.ReactNode }) => {
    // Phase 1：从 localStorage 获取用户功能权限缓存，若无缓存则默认放行（避免阻塞）
    const cachedPermissions = localStorage.getItem('user_function_permissions');
    if (cachedPermissions) {
        try {
            const permissions = JSON.parse(cachedPermissions) as string[];
            // 超级管理员通配符
            if (permissions.includes('*')) {
                return <>{children}</>;
            }
            if (!permissions.includes(permission)) {
                return <Navigate to="/403" replace />;
            }
        } catch {
            // parse 失败默认放行
        }
    }
    return <>{children}</>;
};




const routes = createBrowserRouter([
    {
        path: '/',
        element: <PrivateRoute><Index/></PrivateRoute>,
        children: [
            {
                index: true,
                element: <HomePage/>
            },
            {
                path: "meta",
                element: <Metadata/>,
                children: [
                    {
                        path: "business-ds",
                        element: <Metadata/>,
                        children: [
                            {
                                path: "",
                                element: <BusinessDsDatasource/>
                            },
                            {
                                path: "datasource",
                                element: <BusinessDsDatasource/>
                            },
                            {
                                path: "database",
                                element: <BusinessDsDatabase/>
                            },
                            {
                                path: "table-schema",
                                element: <BusinessDsTableSchema/>
                            },
                            {
                                path: "table-schema/edit",
                                element: <TableSchemaEdit/>
                            },
                            {
                                path: "table-schema/detail",
                                element: <TableSchemaDetail/>
                            },
                            {
                                path: "sql",
                                element: <BusinessDsSql/>
                            },
                        ]
                    },
                    {
                        path: "metadata",
                        element: <Metadata/>,
                        children: [
                            {
                                path: "datasource",
                                element: <Datasource/>
                            },
                            {
                                path: "subject",
                                element: <Subject/>
                            },
                            {
                                path: "metadata_table",
                                element: <MetadataTable/>
                            },
                            {
                                path: "metadata_table/detail",
                                element: <TableDetailPage/>
                            },
                            {
                                path: "metadata_table/edit",
                                element: <TableEditPage/>
                            },
                        ]
                    },
                ]
            },
            {
                path: "metrics",
                element: <Metrics/>,
                children: [
                    {
                        index: true,
                        element: <MetricsDashboard/>
                    },
                    {
                        path: "dashboard",
                        element: <MetricsDashboard/>
                    },
                    {
                        path: "definition",
                        element: <MetricsDefinition/>
                    },
                    {
                        path: "dictionary",
                        element: <MetricsDictionary/>
                    },
                    {
                        path: "analysis",
                        element: <MetricsAnalysis/>
                    },
                    {
                        path: "config",
                        element: <MetricsConfig/>
                    },
                    {
                        path: "dimension",
                        element: <MetricsDimension/>
                    },
                ]
            }, {
                path: "sql-editor",
                element: <SQLEditor/>,
            }, {
                path: "data-work",
                element: <DataWork/>,
            }, {
                path: "data-work/jobs/:jobId/instances",
                element: <JobInstancePage/>,
            }, {
                path: "bi",
                element: <BiLayout/>,
                children: [
                    {
                        index: true,
                        element: <ChartList/>
                    },
                    {
                        path: "chart",
                        element: <ChartList/>
                    },
                    {
                        path: "chart/analyzer/:chartId?",
                        element: <ChartAnalyzer/>
                    },
                    {
                        path: "dashboard",
                        element: <DashboardList/>
                    },
                    {
                        path: "dashboard/edit/:id?",
                        element: <DashboardEditor/>
                    },
                    {
                        path: "dashboard/view/:id",
                        element: <DashboardViewer/>
                    },
                    {
                        path: "chatbi",
                        element: <ChatBI/>
                    },
                ]
            },
            {
                path: "auth",
                element: <PermissionGuard permission="auth"><AuthLayout/></PermissionGuard>,
                children: [
                    {
                        index: true,
                        element: <Navigate to="/auth/role" replace />
                    },
                    {
                        path: "role",
                        element: <PermissionGuard permission="auth:role"><AuthRole/></PermissionGuard>,
                    },
                    {
                        path: "user",
                        element: <PermissionGuard permission="auth:user"><AuthUser/></PermissionGuard>,
                    },
                    {
                        path: "metric",
                        element: <PermissionGuard permission="auth:metric"><AuthMetric/></PermissionGuard>,
                    },
                    {
                        path: "approval",
                        element: <PermissionGuard permission="auth:approval"><AuthApproval/></PermissionGuard>,
                    },
                    {
                        path: "audit",
                        element: <PermissionGuard permission="auth:audit"><AuthAudit/></PermissionGuard>,
                    },
                    {
                        path: "my",
                        element: <AuthMy/>,
                    },
                ]
            }
        ]
    },
    {
        path: "/login",
        element: <Login/>
    },
    {
        path: "/403",
        element: <ForbiddenPage/>
    },
    {
        path: "/about",
        element: <div>About</div>
    },
    {
        path: "*",
        element: <div>页面不存在</div>
    }
])

export default routes
