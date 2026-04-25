import React, { useState, useMemo, createContext, useContext } from 'react';
import {
    DashboardOutlined,
    LineChartOutlined,
    PieChartOutlined,
    SettingOutlined,
    MenuUnfoldOutlined,
    MenuFoldOutlined,
    AppstoreOutlined,
    TagOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Layout, Menu, theme } from 'antd';
import { Link, Outlet, useLocation } from "react-router-dom";

const { Sider } = Layout;

// 用于追踪组件嵌套层级的 Context
const MetricsLevelContext = createContext(0);

// 路由到菜单 key 的映射
const pathToKeyMap: Record<string, string> = {
    '/metrics': 'metrics-dashboard',
    '/metrics/dashboard': 'metrics-dashboard',
    '/metrics/definition': 'metrics-definition',
    '/metrics/dictionary': 'metrics-dictionary',
    '/metrics/analysis': 'metrics-analysis',
    '/metrics/config': 'metrics-config',
    '/metrics/dimension': 'metrics-dimension',
};

const items: MenuProps['items'] = [
    {
        key: 'metrics-overview',
        label: <Link to={'/metrics/dashboard'}>指标概览</Link>,
        icon: <DashboardOutlined />,
    },
    {
        key: 'metrics-definition',
        label: <Link to={'/metrics/definition'}>指标定义</Link>,
        icon: <AppstoreOutlined />,
    },
    {
        key: 'metrics-dictionary',
        label: <Link to={'/metrics/dictionary'}>指标字典</Link>,
        icon: <PieChartOutlined />,
    },
    {
        key: 'metrics-analysis',
        label: <Link to={'/metrics/analysis'}>指标分析</Link>,
        icon: <LineChartOutlined />,
    },
    {
        key: 'metrics-dimension',
        label: <Link to={'/metrics/dimension'}>维度管理</Link>,
        icon: <TagOutlined />,
    },
    {
        key: 'metrics-config',
        label: <Link to={'/metrics/config'}>指标配置</Link>,
        icon: <SettingOutlined />,
    },
];

const MetricsPage: React.FC = () => {
    // 获取当前嵌套层级
    const level = useContext(MetricsLevelContext);
    const isNestedLayer = level > 0;

    const { token } = theme.useToken();
    const location = useLocation();

    const [collapsed, setCollapsed] = useState(false);
    const [openKeys, setOpenKeys] = useState<string[]>(['metrics-overview']);

    // 根据路径计算选中的菜单 key
    const selectedKeys = useMemo(() => {
        const key = pathToKeyMap[location.pathname];
        return key ? [key] : ['metrics-dashboard'];
    }, [location.pathname]);

    // 处理菜单展开/收起
    const handleOpenChange: MenuProps['onOpenChange'] = (keys) => {
        setOpenKeys(keys as string[]);
    };

    // 如果是嵌套层，直接渲染 Outlet
    if (isNestedLayer) {
        return (
            <MetricsLevelContext.Provider value={level + 1}>
                <Outlet />
            </MetricsLevelContext.Provider>
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
                    <MetricsLevelContext.Provider value={level + 1}>
                        <Outlet />
                    </MetricsLevelContext.Provider>
                </Layout.Content>
            </Layout>
        </div>
    );
};

export default MetricsPage;
