import React from 'react';
import {Layout, Menu, MenuProps, theme} from 'antd';
import Logo from "./logo";
import {Outlet, useLocation, useNavigate} from "react-router-dom";

const {Header, Content, Footer} = Layout;

const routeKeyMap: Record<string, string> = {
    '/meta': '1',
    '/metrics': '2',
    '/sql-editor': '3',
    '/data-work': '4',
    '/bi': '5',
};

const items: MenuProps['items'] = [
    {
        label: '元数据平台',
        key: '1',
    },
    {
        label: '指标平台',
        key: '2',
    },
    {
        label: 'SQL查询',
        key: '3',
    },
    {
        label: '数据加工',
        key: '4',
    },{
        label: '智能分析',
        key: '5',
    }
]

const App: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const keyToRoute = Object.fromEntries(Object.entries(routeKeyMap).map(([k, v]) => [v, k]));

    // 获取当前选中的菜单 key（支持子路径匹配）
    const getSelectedKey = () => {
        const pathname = location.pathname;
        // 先尝试精确匹配
        if (routeKeyMap[pathname]) {
            return routeKeyMap[pathname];
        }
        // 再尝试前缀匹配
        for (const route of Object.keys(routeKeyMap)) {
            if (pathname.startsWith(route)) {
                return routeKeyMap[route];
            }
        }
        return '1';
    };

    const handleMenuClick: MenuProps['onClick'] = (e) => {
        const route = keyToRoute[e.key];
        if (route) {
            navigate(route);
        }
    };

    const {
        token: {colorBgContainer, borderRadiusLG},
    } = theme.useToken();

    return (
        <Layout style={{height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
            <Header style={{display: 'flex', alignItems: 'center', background: "#fff", color: '#333', flexShrink: 0}}>
                <div style={{background: "#fff"}}>
                    <Logo/>
                </div>
                <Menu
                    theme="light"
                    mode="horizontal"
                    selectedKeys={[getSelectedKey()]}
                    items={items}
                    onClick={handleMenuClick}
                    style={{flex: 1, minWidth: 0, marginLeft: 24}}
                />
            </Header>
            <Content style={{flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0}}>
                <div
                    style={{
                        background: colorBgContainer,
                        flex: 1,
                        padding: 24,
                        borderRadius: borderRadiusLG,
                        boxSizing: 'border-box',
                        display: 'flex',
                        minHeight: 0,
                        overflow: 'hidden',
                    }}
                >
                    <Outlet/>
                </div>
            </Content>
            <Footer style={{textAlign: 'center', flexShrink: 0, padding: '8px 16px',}}>
                Dataman-System ©{new Date().getFullYear()} Created by cyan
            </Footer>

        </Layout>
    );
};

export default App;
