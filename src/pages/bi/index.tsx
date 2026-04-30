import React, { useState, useMemo, createContext, useContext } from 'react';
import {
    DatabaseOutlined,
    LineChartOutlined,
    DashboardOutlined,
    MenuUnfoldOutlined,
    MenuFoldOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Layout, Menu, theme } from 'antd';
import { Link, Outlet, useLocation } from "react-router-dom";

const { Sider } = Layout;

// 用于追踪组件嵌套层级的 Context
const BiLevelContext = createContext(0);

// 路由到菜单 key 的映射
const pathToKeyMap: Record<string, string> = {
    '/bi': 'bi-dataset',
    '/bi/dataset': 'bi-dataset',
    '/bi/dataset/create': 'bi-dataset',
    '/bi/chart': 'bi-chart',
    '/bi/dashboard': 'bi-dashboard',
};

const items: MenuProps['items'] = [
    {
        key: 'bi-dataset',
        label: <Link to={'/bi/dataset'}>数据集管理</Link>,
        icon: <DatabaseOutlined />,
    },
    {
        key: 'bi-chart',
        label: <Link to={'/bi/chart'}>图表分析</Link>,
        icon: <LineChartOutlined />,
    },
    {
        key: 'bi-dashboard',
        label: <Link to={'/bi/dashboard'}>看板管理</Link>,
        icon: <DashboardOutlined />,
    },
];

const BiPage: React.FC = () => {
    // 获取当前嵌套层级
    const level = useContext(BiLevelContext);
    const isNestedLayer = level > 0;

    const { token } = theme.useToken();
    const location = useLocation();

    const [collapsed, setCollapsed] = useState(false);
    const [openKeys, setOpenKeys] = useState<string[]>(['bi-dataset']);

    // 根据路径计算选中的菜单 key
    const selectedKeys = useMemo(() => {
        const key = pathToKeyMap[location.pathname];
        return key ? [key] : ['bi-dataset'];
    }, [location.pathname]);

    // 处理菜单展开/收起
    const handleOpenChange: MenuProps['onOpenChange'] = (keys) => {
        setOpenKeys(keys as string[]);
    };

    // 如果是嵌套层，直接渲染 Outlet
    if (isNestedLayer) {
        return (
            <BiLevelContext.Provider value={level + 1}>
                <Outlet />
            </BiLevelContext.Provider>
        );
    }

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <Layout
                style={{
                    background: token.colorBgContainer,
                    borderRadius: token.colorBorderRadiusLG,
                    width: '100%',
                    height: '100%'
                }}
            >
                <Sider
                    trigger={null}
                    collapsible
                    collapsed={collapsed}
                    width={200}
                    style={{
                        background: token.colorBgContainer,
                        height: '100vh',
                        position: 'relative'
                    }}
                >
                    {/* 折叠按钮 */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '-12px',
                            zIndex: 1,
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: token.colorBgContainer,
                            border: `1px solid ${token.colorBorder}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            transition: 'all 0.2s'
                        }}
                        onClick={() => setCollapsed(!collapsed)}
                    >
                        {collapsed ?
                            <MenuUnfoldOutlined style={{ color: token.colorPrimary }} /> :
                            <MenuFoldOutlined style={{ color: token.colorPrimary }} />
                        }
                    </div>

                    <Menu
                        mode="inline"
                        style={{ height: '100%', borderRight: 0, paddingTop: '16px' }}
                        items={items}
                        selectedKeys={selectedKeys}
                        openKeys={openKeys}
                        onOpenChange={handleOpenChange}
                        inlineCollapsed={collapsed}
                    />
                </Sider>

                <Layout.Content style={{ padding: 16, height: '100vh', overflow: 'auto' }}>
                    <BiLevelContext.Provider value={level + 1}>
                        <Outlet />
                    </BiLevelContext.Provider>
                </Layout.Content>
            </Layout>
        </div>
    );
};

export default BiPage;
