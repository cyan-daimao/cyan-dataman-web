import React, { useState, useMemo, createContext, useContext, useCallback } from 'react';
import {
    LineChartOutlined,
    DashboardOutlined,
    MessageOutlined,
    MenuUnfoldOutlined,
    MenuFoldOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Button, Layout, Menu, theme } from 'antd';
import { Outlet, useLocation, useNavigate } from "react-router-dom";

const { Sider } = Layout;

// 用于追踪组件嵌套层级的 Context
const BiLevelContext = createContext(0);

// 路由到菜单 key 的映射
const pathToKeyMap: Record<string, string> = {
    '/bi': 'bi-chart',
    '/bi/chart': 'bi-chart',
    '/bi/chatbi': 'bi-chatbi',
    '/bi/dashboard': 'bi-dashboard',
};

const keyToPathMap: Record<string, string> = {
    'bi-chart': '/bi/chart',
    'bi-chatbi': '/bi/chatbi',
    'bi-dashboard': '/bi/dashboard',
};

const BiPage: React.FC = () => {
    // 获取当前嵌套层级
    const level = useContext(BiLevelContext);
    const isNestedLayer = level > 0;

    const { token } = theme.useToken();
    const location = useLocation();
    const navigate = useNavigate();

    const [collapsed, setCollapsed] = useState(false);

    // 根据路径计算选中的菜单 key
    const selectedKeys = useMemo(() => {
        const key = pathToKeyMap[location.pathname];
        return key ? [key] : ['bi-chart'];
    }, [location.pathname]);

    // 菜单项定义（放在组件内部，确保响应式更新）
    const items: MenuProps['items'] = useMemo(() => [
        {
            key: 'bi-chart',
            label: '图表分析',
            icon: <LineChartOutlined />,
        },
        {
            key: 'bi-chatbi',
            label: 'ChatBI',
            icon: <MessageOutlined />,
        },
        {
            key: 'bi-dashboard',
            label: '看板管理',
            icon: <DashboardOutlined />,
        },
    ], []);

    // 菜单点击事件
    const handleMenuClick: MenuProps['onClick'] = useCallback((info) => {
        const path = keyToPathMap[info.key];
        if (path) {
            navigate(path);
        }
    }, [navigate]);

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
                    borderRadius: token.borderRadiusLG,
                    width: '100%',
                    height: '100%',
                }}
            >
                <Sider
                    trigger={null}
                    collapsible
                    collapsed={collapsed}
                    width={200}
                    style={{
                        background: '#FFFFFF',
                        height: '100%',
                        boxShadow: '2px 0 8px rgba(29, 35, 51, 0.04)',
                        zIndex: 2,
                    }}
                >
                    {/* 侧边栏标题 */}
                    <div
                        style={{
                            height: 56,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: collapsed ? 'center' : 'space-between',
                            padding: collapsed ? '0 8px' : '0 16px',
                            borderBottom: '1px solid #F4F6FA',
                            flexShrink: 0,
                        }}
                    >
                        {!collapsed && (
                            <span
                                style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: '#1D2333',
                                    letterSpacing: 0.5,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                智能分析
                            </span>
                        )}
                        <Button
                            type="text"
                            size="small"
                            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                            onClick={() => setCollapsed(!collapsed)}
                            style={{ color: '#8B909A', padding: '4px 8px' }}
                        />
                    </div>

                    <Menu
                        mode="inline"
                        style={{
                            height: 'calc(100% - 56px)',
                            borderRight: 0,
                            paddingTop: 8,
                            background: 'transparent',
                        }}
                        items={items}
                        selectedKeys={selectedKeys}
                        inlineCollapsed={collapsed}
                        onClick={handleMenuClick}
                    />
                </Sider>

                <Layout.Content
                    style={{
                        padding: 16,
                        height: '100%',
                        overflow: 'auto',
                        background: '#F8F9FA',
                    }}
                >
                    <BiLevelContext.Provider value={level + 1}>
                        <Outlet />
                    </BiLevelContext.Provider>
                </Layout.Content>
            </Layout>
        </div>
    );
};

export default BiPage;
