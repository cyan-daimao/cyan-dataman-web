import React, { useState, useMemo, createContext, useContext } from 'react';
import {
    LaptopOutlined,
    MenuUnfoldOutlined,
    MenuFoldOutlined,
    DatabaseOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Button, Layout, Menu, theme } from 'antd';
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
                                元数据平台
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
