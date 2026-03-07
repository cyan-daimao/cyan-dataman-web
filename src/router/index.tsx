import {createBrowserRouter, Navigate} from "react-router-dom";
import React from 'react'

const Login = React.lazy(() => import((`@/pages/login/index.tsx`)))

const Index = React.lazy(() => import((`@/pages/index.tsx`)))
const Metadata = React.lazy(() => import((`@/pages/metadata/index.tsx`)))
const Subject = React.lazy(() => import((`@/pages/metadata/subject/index.tsx`)))
const MetadataTable = React.lazy(() => import((`@/pages/metadata/metadata_table/index.tsx`)))
const Metrics = React.lazy(() => import((`@/pages/metrics/index.tsx`)))

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
                        path: "subject",
                        element: <Subject/>
                    },
                    {
                        path: "metadata_table",
                        element: <MetadataTable/>
                    }
                ]
            },{
                path: "metrics",
                element: <Metrics/>,
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