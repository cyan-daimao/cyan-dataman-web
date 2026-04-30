import {createBrowserRouter, Navigate} from "react-router-dom";
import React from 'react'

const Login = React.lazy(() => import((`@/pages/login/index.tsx`)))

const Index = React.lazy(() => import((`@/pages/index.tsx`)))
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

// 业务数据库模块
const BusinessDsDatasource = React.lazy(() => import((`@/pages/metadata/business_db/datasource/index.tsx`)))
const BusinessDsDatabase = React.lazy(() => import((`@/pages/metadata/business_db/database/index.tsx`)))
const BusinessDsTableSchema = React.lazy(() => import((`@/pages/metadata/business_db/table_schema/index.tsx`)))
const TableSchemaEdit = React.lazy(() => import((`@/pages/metadata/business_db/table_schema/TableSchemaEdit.tsx`)))
const TableSchemaDetail = React.lazy(() => import((`@/pages/metadata/business_db/table_schema/TableSchemaDetail.tsx`)))
const BusinessDsSql = React.lazy(() => import((`@/pages/metadata/business_db/sql/index.tsx`)))

// 智能分析（BI）模块
const BiLayout = React.lazy(() => import((`@/pages/bi/index.tsx`)))
const DatasetList = React.lazy(() => import((`@/pages/bi/dataset/index.tsx`)))
const DatasetForm = React.lazy(() => import((`@/pages/bi/dataset/DatasetForm.tsx`)))
const ChartList = React.lazy(() => import((`@/pages/bi/chart/index.tsx`)))
const ChartAnalyzer = React.lazy(() => import((`@/pages/bi/chart/ChartAnalyzer.tsx`)))
const DashboardList = React.lazy(() => import((`@/pages/bi/dashboard/index.tsx`)))
const DashboardEditor = React.lazy(() => import((`@/pages/bi/dashboard/DashboardEditor.tsx`)))
const DashboardViewer = React.lazy(() => import((`@/pages/bi/dashboard/DashboardViewer.tsx`)))

// 鉴权组件：拦截未登录的访问
const PrivateRoute = ({children}: { children: React.ReactNode }) => {
    const hasToken = !!localStorage.getItem('token');
    if (!hasToken) {
        // 核心：跳转到登录页时，传递当前页面地址（location.pathname）
        return <Navigate to="/login" state={{from: window.location.pathname}} replace/>;
    }
    return <>{children}</>;
};


// 首页欢迎组件
const HomeWelcome: React.FC = () => {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: '100%',
        }}>
            <h1 style={{fontSize: 32, color: '#1890ff', marginBottom: 16}}>
                欢迎使用数据资产管理平台
            </h1>
            <p style={{fontSize: 16, color: '#666', marginBottom: 24}}>
                管理企业数据资产、元数据、主题域和指标的综合平台
            </p>
        </div>
    );
};

const routes = createBrowserRouter([
    {
        path: '/',
        element: <PrivateRoute><Index/></PrivateRoute>,
        children: [
            {
                index: true,
                element: <HomeWelcome/>
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
                path: "bi",
                element: <BiLayout/>,
                children: [
                    {
                        index: true,
                        element: <DatasetList/>
                    },
                    {
                        path: "dataset",
                        element: <DatasetList/>
                    },
                    {
                        path: "dataset/create",
                        element: <DatasetForm/>
                    },
                    {
                        path: "dataset/edit/:id",
                        element: <DatasetForm/>
                    },
                    {
                        path: "chart",
                        element: <ChartList/>
                    },
                    {
                        path: "chart/analyzer/:datasetId?/:chartId?",
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
                ]
            }
        ]
    },
    {
        path: "/login",
        element: <Login/>
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
