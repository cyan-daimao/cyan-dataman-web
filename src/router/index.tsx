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
const SQLEditor = React.lazy(() => import((`@/pages/sql-editor/index.tsx`)))
const DataWork = React.lazy(() => import((`@/pages/data-work/index.tsx`)))

// 鉴权组件：拦截未登录的访问
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
    const hasToken = !!localStorage.getItem('token');
    if (!hasToken) {
        // 核心：跳转到登录页时，传递当前页面地址（location.pathname）
        return <Navigate to="/login" state={{ from: window.location.pathname }} replace />;
    }
    return <>{children}</>;
};


const routes = createBrowserRouter([
    {
        path: '/',
        element: <PrivateRoute><Index/></PrivateRoute>,
        children: [
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
            },{
                path: "metrics",
                element: <Metrics/>,
            },{
                path: "sql-editor",
                element: <SQLEditor/>,
            },{
                path: "data-work",
                element: <DataWork/>,
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