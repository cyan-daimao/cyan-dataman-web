import {createBrowserRouter, Navigate} from "react-router-dom";
import React, { useEffect, useState } from 'react'
import { Spin } from 'antd';
import { getUserFunctionPermissions, FunctionPermissionNode } from '@/api/DataAuthApi';

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
const MetricsAiChat = React.lazy(() => import((`@/pages/metrics/ai-chat/index.tsx`)))
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

// 从功能权限树中提取所有权限 key
export const extractPermissionKeys = (nodes: FunctionPermissionNode[]): string[] => {
    const keys: string[] = [];
    for (const node of nodes) {
        keys.push(node.key);
        if (node.children) {
            keys.push(...extractPermissionKeys(node.children));
        }
    }
    return keys;
};

// 权限守卫组件：检查功能权限
const PermissionGuard = ({ permission, children }: { permission: string; children: React.ReactNode }) => {
    const [checked, setChecked] = useState<boolean | null>(null);

    useEffect(() => {
        const check = async () => {
            const cached = localStorage.getItem('user_function_permissions');
            if (cached) {
                try {
                    const permissions = JSON.parse(cached) as string[];
                    if (permissions.includes('*') || permissions.includes(permission)) {
                        setChecked(true);
                    } else {
                        setChecked(false);
                    }
                    return;
                } catch {
                    // parse 失败，继续请求
                }
            }

            try {
                const res = await getUserFunctionPermissions();
                if (res.code === 200 && res.data) {
                    const keys = extractPermissionKeys(res.data);
                    localStorage.setItem('user_function_permissions', JSON.stringify(keys));
                    if (keys.includes('*') || keys.includes(permission)) {
                        setChecked(true);
                    } else {
                        setChecked(false);
                    }
                } else {
                    setChecked(false); // Round1: ready — 接口异常时拒绝，fail-closed
                }
            } catch {
                setChecked(false); // Round1: ready — 请求失败时拒绝，fail-closed
            }
        };
        check();
    }, [permission]);

    if (checked === null) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Spin size="large" tip="权限校验中..." />
            </div>
        );
    }
    if (!checked) {
        return <Navigate to="/403" replace />;
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
                    {
                        path: "ai-chat",
                        element: <MetricsAiChat/>
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
