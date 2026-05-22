import React from 'react';
import {Avatar, Badge, Dropdown, Layout, MenuProps, Space, theme, Tooltip} from 'antd';
import Logo from "./logo";
import {Outlet, useLocation, useNavigate} from "react-router-dom";
import {
    BellOutlined,
    DownOutlined,
    LogoutOutlined,
    UserOutlined
} from '@ant-design/icons';
import {getStorage, KEY, removeStorage} from "@/utils/storage";

const {Header, Content, Footer} = Layout;

const routeKeyMap: Record<string, string> = {
    '/meta': '1',
    '/metrics': '2',
    '/sql-editor': '3',
    '/data-work': '4',
    '/bi': '5',
    '/auth': '6',
    '/data-collection': '7',
};

interface NavItem {
    label: string;
    key: string;
    permission?: string;
}

const allNavItems: NavItem[] = [
    { label: '元数据平台', key: '1', permission: 'meta' },
    { label: '指标平台', key: '2', permission: 'metric' },
    { label: 'SQL查询', key: '3', permission: 'sql-editor' },
    { label: '数据加工', key: '4', permission: 'data-work' },
    { label: '智能分析', key: '5', permission: 'bi' },
    { label: '权限管理', key: '6', permission: 'auth' },
    { label: '数据采集', key: '7', permission: 'data-collection' },
];

// Phase 1：根据本地缓存的功能权限动态过滤导航项，无缓存则显示全部
const getVisibleNavItems = (): NavItem[] => {
    const cached = localStorage.getItem('user_function_permissions');
    if (!cached) return allNavItems;
    try {
        const permissions = JSON.parse(cached) as string[];
        if (permissions.includes('*')) return allNavItems;
        return allNavItems.filter(item => {
            if (!item.permission) return true;
            return permissions.includes(item.permission);
        });
    } catch {
        return allNavItems;
    }
};

const App: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const keyToRoute = Object.fromEntries(Object.entries(routeKeyMap).map(([k, v]) => [v, k]));

    // 获取当前登录用户信息
    const currentUser = React.useMemo(() => {
        try {
            return getStorage(KEY.CURRENT, null);
        } catch {
            return null;
        }
    }, []);

    // 获取当前选中的菜单 key（支持子路径匹配）
    const getSelectedKey = () => {
        const pathname = location.pathname;
        if (routeKeyMap[pathname]) {
            return routeKeyMap[pathname];
        }
        for (const route of Object.keys(routeKeyMap)) {
            if (pathname.startsWith(route)) {
                return routeKeyMap[route];
            }
        }
        return '1';
    };

    const activeKey = getSelectedKey();

    // 智能问数只在 SQL查询和数据加工页面显示
    React.useEffect(() => {
        const shouldShow = location.pathname.startsWith('/sql-editor') || location.pathname.startsWith('/data-work');
        const btn = document.getElementById('dify-chatbot-bubble-button');
        const win = document.getElementById('dify-chatbot-bubble-window');
        if (shouldShow) {
            if (btn) btn.style.setProperty('display', 'inline-flex', 'important');
        } else {
            if (btn) btn.style.setProperty('display', 'none', 'important');
            if (win) win.style.setProperty('display', 'none', 'important');
        }
    }, [location.pathname]);

    const handleNavClick = (key: string) => {
        const route = keyToRoute[key];
        if (route) {
            navigate(route);
        }
    };

    const handleLogout = () => {
        removeStorage(KEY.TOKEN);
        removeStorage(KEY.CURRENT);
        localStorage.removeItem('user_function_permissions');
        localStorage.removeItem('user_function_permissions_tree');
        navigate('/login', { replace: true });
    };

    const userMenuItems: MenuProps['items'] = [
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: '退出登录',
            onClick: handleLogout,
            danger: true,
        },
    ];

    const {
        token: {colorBgContainer, borderRadiusLG},
    } = theme.useToken();

    return (
        <Layout style={{height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
            <Header
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: colorBgContainer,
                    color: '#333',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(29, 35, 51, 0.06)',
                    zIndex: 10,
                    padding: '0 24px',
                }}
            >
                <div
                    style={{display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, cursor: 'pointer'}}
                    onClick={() => navigate('/')}
                >
                    <Logo/>
                </div>

                {/* 自定义顶部导航 - flex 平铺，永不折叠 */}
                <nav
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        marginLeft: 32,
                        overflow: 'auto',
                    }}
                >
                    {getVisibleNavItems().map(item => {
                        const isActive = activeKey === item.key;
                        return (
                            <div
                                key={item.key}
                                onClick={() => handleNavClick(item.key)}
                                style={{
                                    padding: '6px 16px',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    fontSize: 14,
                                    fontWeight: isActive ? 600 : 400,
                                    color: isActive ? '#4F6DF5' : '#4E5566',
                                    background: 'transparent',
                                    transition: 'all 0.2s ease',
                                    whiteSpace: 'nowrap',
                                    userSelect: 'none',
                                    position: 'relative',
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.color = '#4F6DF5';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.color = '#4E5566';
                                    }
                                }}
                            >
                                {item.label}
                            </div>
                        );
                    })}
                </nav>

                {/* 右侧用户操作区 */}
                <Space size={20} style={{marginLeft: 'auto', flexShrink: 0}}>
                    <Tooltip title="消息通知">
                        <Badge count={0} size="small">
                            <BellOutlined
                                style={{
                                    fontSize: 18,
                                    color: '#8B909A',
                                    cursor: 'pointer',
                                    transition: 'color 0.2s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#4F6DF5')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = '#8B909A')}
                            />
                        </Badge>
                    </Tooltip>

                    <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                        <Space
                            style={{
                                cursor: 'pointer',
                                padding: '4px 8px',
                                borderRadius: 8,
                                transition: 'background 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLElement).style.background = '#F4F6FA';
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.background = 'transparent';
                            }}
                        >
                            <Avatar
                                size="small"
                                icon={<UserOutlined />}
                                style={{
                                    background: '#EEF1FF',
                                    color: '#4F6DF5',
                                }}
                            />
                            <span style={{color: '#4E5566', fontSize: 14, fontWeight: 500}}>
                                {currentUser?.name || currentUser?.username || '用户'}
                            </span>
                            <DownOutlined style={{fontSize: 10, color: '#8B909A'}} />
                        </Space>
                    </Dropdown>
                </Space>
            </Header>
            <Content
                style={{
                    flex: 1,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                    padding: 16,
                    background: '#F8F9FA',
                }}
            >
                <div
                    style={{
                        background: colorBgContainer,
                        flex: 1,
                        height: '100%',
                        borderRadius: borderRadiusLG,
                        boxSizing: 'border-box',
                        display: 'flex',
                        minHeight: 0,
                        overflow: 'hidden',
                        boxShadow: '0 2px 12px rgba(29, 35, 51, 0.04)',
                    }}
                >
                    <Outlet/>
                </div>
            </Content>
            <Footer
                style={{
                    textAlign: 'center',
                    flexShrink: 0,
                    padding: '8px 16px',
                    background: '#F8F9FA',
                    color: '#8B909A',
                    fontSize: 12,
                }}
            >
                DATA-CENTER ©{new Date().getFullYear()} Created by cyan
            </Footer>
        </Layout>
    );
};

export default App;
