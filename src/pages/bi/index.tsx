import React, { useState, useMemo, createContext, useContext, useCallback } from 'react';
import {
    LineChartOutlined,
    DashboardOutlined,
    MessageOutlined,
    MenuUnfoldOutlined,
    MenuFoldOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Menu, theme } from 'antd';
import { Outlet, useLocation, useNavigate } from "react-router-dom";

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
        <div style={{ width: '100%', height: '100%', display: 'flex', background: token.colorBgContainer, borderRadius: token.borderRadiusLG }}>
            <aside
                style={{
                    width: collapsed ? 80 : 200,
                    minWidth: collapsed ? 80 : 200,
                    background: token.colorBgContainer,
                    height: '100%',
                    position: 'relative',
                    flexShrink: 0,
                    transition: 'width 0.2s',
                    borderRight: `1px solid ${token.colorBorder}`,
                    overflow: 'hidden',
                }}
            >
                {/* 折叠按钮 */}
                <div
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '-12px',
                        zIndex: 10,
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
                        <MenuUnfoldOutlined style={{ color: token.colorPrimary, fontSize: 12 }} /> :
                        <MenuFoldOutlined style={{ color: token.colorPrimary, fontSize: 12 }} />
                    }
                </div>

                <Menu
                    mode="inline"
                    style={{ height: '100%', borderRight: 0, paddingTop: '16px' }}
                    items={items}
                    selectedKeys={selectedKeys}
                    inlineCollapsed={collapsed}
                    onClick={handleMenuClick}
                />
            </aside>

            <main style={{ flex: 1, height: '100%', overflow: 'auto', padding: 16 }}>
                <BiLevelContext.Provider value={level + 1}>
                    <Outlet />
                </BiLevelContext.Provider>
            </main>
        </div>
    );
};

export default BiPage;
