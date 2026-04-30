import React, { useState, useMemo, createContext, useContext } from 'react';
import {
    LaptopOutlined,
    MenuUnfoldOutlined,
    MenuFoldOutlined,
    DatabaseOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Layout, Menu, theme } from 'antd';
import {Link, Outlet, useLocation} from "react-router-dom";

const { Sider } = Layout;

// 用于追踪 Metadata 组件嵌套层级的 Context
const MetadataLevelContext = createContext(0);

// 路由到菜单 key 的映射
const pathToKeyMap: Record<string, string> = {
    '/meta/business-ds': 'bd-datasource',
    '/meta/business-ds/datasource': 'bd-datasource',
    '/meta/business-ds/database': 'bd-database',
    '/meta/business-ds/table-schema': 'bd-table-schema',
    '/meta/business-ds/sql': 'bd-table-sql',
    '/meta/metadata/datasource': 'datasource',
    '/meta/metadata/subject': 'subjectManage',
    '/meta/metadata/metadata_table': 'metadataTable',
};

const items: MenuProps['items'] = [
    {
        key: 'business-ds',
        label: '业务数据库',
        icon: <DatabaseOutlined />,
        children: [
            {
                key:'bd-datasource',
                label: <Link to='/meta/business-ds/datasource'>数据源</Link>,
            },
            {
                key:'bd-database',
                label: <Link to='/meta/business-ds/database'>数据库</Link>,
            },
            {
                key: 'bd-table-schema',
                label: <Link to={'/meta/business-ds/table-schema'}>表结构</Link>,
            },
            {
                key: 'bd-table-sql',
                label: <Link to={'/meta/business-ds/sql'}>SQL执行</Link>,
            },
        ]
    },
    {
        key: 'metadata',
        label: '元数据',
        icon: <LaptopOutlined />,
        children: [
            {
                key:'datasource',
                label: <Link to='/meta/metadata/datasource'>数据源</Link>,
            },
            {
                key:'subjectManage',
                label: <Link to='/meta/metadata/subject'>主题管理</Link>,
            },
            {
                key: 'metadataTable',
                label: <Link to={'/meta/metadata/metadata_table'}>元数据表</Link>,
            },
        ]
    }
];

const App: React.FC = () => {
    const level = useContext(MetadataLevelContext);
    const isNestedLayer = level > 0;

    const { token } = theme.useToken();
    const location = useLocation();

    const [collapsed, setCollapsed] = useState(false);
    const [openKeys, setOpenKeys] = useState<string[]>(['business-ds', 'metadata']);

    const selectedKeys = useMemo(() => {
        const key = pathToKeyMap[location.pathname];
        return key ? [key] : ['bd-datasource'];
    }, [location.pathname]);

    const handleOpenChange: MenuProps['onOpenChange'] = (keys) => {
        setOpenKeys(keys as string[]);
    };

    if (isNestedLayer) {
        return (
            <MetadataLevelContext.Provider value={level + 1}>
                <Outlet />
            </MetadataLevelContext.Provider>
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
                    width={220}
                    style={{
                        background: '#FFFFFF',
                        height: '100%',
                        position: 'relative',
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
                            justifyContent: collapsed ? 'center' : 'flex-start',
                            padding: collapsed ? 0 : '0 20px',
                            borderBottom: '1px solid #F4F6FA',
                            marginBottom: 8,
                        }}
                    >
                        {!collapsed && (
                            <span
                                style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: '#1D2333',
                                    letterSpacing: 0.5,
                                }}
                            >
                                元数据平台
                            </span>
                        )}
                        {collapsed && (
                            <DatabaseOutlined style={{ fontSize: 18, color: '#4F6DF5' }} />
                        )}
                    </div>

                    {/* 悬浮折叠按钮 */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '68px',
                            right: '-12px',
                            zIndex: 10,
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: '#FFFFFF',
                            border: `1px solid ${token.colorBorder}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            transition: 'all 0.2s',
                        }}
                        onClick={() => setCollapsed(!collapsed)}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                        }}
                    >
                        {collapsed ?
                            <MenuUnfoldOutlined style={{ color: '#4F6DF5', fontSize: 12 }} /> :
                            <MenuFoldOutlined style={{ color: '#4F6DF5', fontSize: 12 }} />
                        }
                    </div>

                    <Menu
                        mode="inline"
                        style={{
                            height: 'calc(100% - 64px)',
                            borderRight: 0,
                            paddingTop: 4,
                            background: 'transparent',
                        }}
                        items={items}
                        selectedKeys={selectedKeys}
                        openKeys={openKeys}
                        onOpenChange={handleOpenChange}
                        inlineCollapsed={collapsed}
                    />
                </Sider>

                <Layout.Content
                    style={{
                        padding: 0,
                        height: '100%',
                        overflow: 'auto',
                        background: '#F8F9FA',
                    }}
                >
                    <MetadataLevelContext.Provider value={level + 1}>
                        <Outlet />
                    </MetadataLevelContext.Provider>
                </Layout.Content>
            </Layout>
        </div>
    );
};

export default App;
