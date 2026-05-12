import React, { useState, useMemo, createContext, useContext } from 'react';
import {
    SafetyCertificateOutlined,
    TeamOutlined,
    BarChartOutlined,
    AuditOutlined,
    FileTextOutlined,
    IdcardOutlined,
    DashboardOutlined,
    MenuUnfoldOutlined,
    MenuFoldOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Button, Layout, Menu, theme } from 'antd';
import { Link, Outlet, useLocation } from "react-router-dom";

const { Sider } = Layout;

// 用于追踪 Auth 组件嵌套层级的 Context
const AuthLevelContext = createContext(0);

// 路由到菜单 key 的映射
const pathToKeyMap: Record<string, string> = {
    '/auth': 'auth-overview',
    '/auth/role': 'auth-role',
    '/auth/user': 'auth-user',
    '/auth/metric': 'auth-metric',
    '/auth/approval': 'auth-approval',
    '/auth/audit': 'auth-audit',
    '/auth/my': 'auth-my',
};

const items: MenuProps['items'] = [
    {
        key: 'auth-overview',
        label: <Link to={'/auth/role'}>权限总览</Link>,
        icon: <DashboardOutlined />,
    },
    {
        key: 'auth-role',
        label: <Link to={'/auth/role'}>角色管理</Link>,
        icon: <SafetyCertificateOutlined />,
    },
    {
        key: 'auth-user',
        label: <Link to={'/auth/user'}>用户权限</Link>,
        icon: <TeamOutlined />,
    },
    {
        key: 'auth-metric',
        label: <Link to={'/auth/metric'}>指标平台权限</Link>,
        icon: <BarChartOutlined />,
    },
    {
        key: 'auth-approval',
        label: <Link to={'/auth/approval'}>审批管理</Link>,
        icon: <AuditOutlined />,
    },
    {
        key: 'auth-audit',
        label: <Link to={'/auth/audit'}>审计日志</Link>,
        icon: <FileTextOutlined />,
    },
    {
        key: 'auth-my',
        label: <Link to={'/auth/my'}>我的权限</Link>,
        icon: <IdcardOutlined />,
    },
];

const AuthPage: React.FC = () => {
    const level = useContext(AuthLevelContext);
    const isNestedLayer = level > 0;

    const { token } = theme.useToken();
    const location = useLocation();

    const [collapsed, setCollapsed] = useState(false);

    const selectedKeys = useMemo(() => {
        const key = pathToKeyMap[location.pathname];
        return key ? [key] : ['auth-role'];
    }, [location.pathname]);

    if (isNestedLayer) {
        return (
            <AuthLevelContext.Provider value={level + 1}>
                <Outlet />
            </AuthLevelContext.Provider>
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
                    width={220}
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
                                权限管理
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
                    <AuthLevelContext.Provider value={level + 1}>
                        <Outlet />
                    </AuthLevelContext.Provider>
                </Layout.Content>
            </Layout>
        </div>
    );
};

export default AuthPage;
