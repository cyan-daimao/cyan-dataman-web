import React, { useState, useMemo } from 'react';
import {LaptopOutlined, UserOutlined, MenuUnfoldOutlined, MenuFoldOutlined, DatabaseOutlined} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Layout, Menu, theme } from 'antd';
import {Link, Outlet, useLocation} from "react-router-dom";

const { Sider } = Layout;

// 路由到菜单 key 的映射
const pathToKeyMap: Record<string, string> = {
    '/business-ds': 'bd-datasource',
    '/business-ds/datasource': 'bd-datasource',
    '/business-ds/database': 'bd-database',
    '/business-ds/table-schema': 'bd-table-schema',
    '/metadata': '',
    '/metadata/datasource': 'datasource',
    '/metadata/subject': 'subjectManage',
    '/metadata/metadata_table': 'metadataTable',
};

const items: MenuProps['items'] = [
    {
        key: 'business-ds',
        label: <Link to={'/business-ds'}>业务数据库</Link>,
        icon: <DatabaseOutlined />,
        children: [
            {
                key:'bd-datasource',
                label: <Link to='/business-ds/datasource'>数据源</Link>,
            },
            {
                key:'bd-database',
                label: <Link to='/business-ds/database'>数据库</Link>,
            },
            {
                key: 'bd-table-schema',
                label: <Link to={'/business-ds/table-schema'}>表结构</Link>,
            },
        ]
    },
    {
        key: '1',
        label: <Link to={'/metadata'}>元数据</Link>,
        icon: <LaptopOutlined />,
        children: [
            {
                key:'',
                label: <Link to=''>业务库管理</Link>,
            },
            {
                key:'datasource',
                label: <Link to='/metadata/datasource'>数据源</Link>,
            },
            {
                key:'subjectManage',
                label: <Link to='/metadata/subject'>主题管理</Link>,
            },
            {
                key: 'metadataTable',
                label: <Link to={'/metadata/metadata_table'}>元数据表</Link>,
            },
        ]
    },
    {
        key: 'data',
        label: '数据监控',
        icon: <UserOutlined />,
        children: [
            {
                key: 'async',
                label: '数据同步',
            }
        ]
    }
];

const App: React.FC = () => {
    // 正确获取 token，避免类型错误
    const { token } = theme.useToken();
    const location = useLocation();

    const [collapsed, setCollapsed] = useState(false);

    // 根据路径计算选中的菜单 key
    const selectedKeys = useMemo(() => {
        const key = pathToKeyMap[location.pathname];
        return key ? [key] : ['1'];
    }, [location.pathname]);

    // 根据路径计算展开的菜单 key
    const openKeys = useMemo(() => {
        if (location.pathname.startsWith('/business-ds')) {
            return ['business-ds'];
        }
        return ['1'];
    }, [location.pathname]);

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <Layout
                style={{
                    background: token.colorBgContainer,
                    borderRadius: token.borderRadiusLG,
                    width: '100%',
                    height: '100%'
                }}
            >
                <Sider
                    trigger={null}
                    collapsible
                    collapsed={collapsed}
                    style={{
                        background: token.colorBgContainer,
                        height: '100vh',
                        position: 'relative' // 为绝对定位的按钮提供参考
                    }}
                >
                    {/* 悬浮在侧边栏边缘的折叠按钮 - 修复 Token 类型问题 */}
                    <div style={{
                        position: 'absolute',
                        top: '20px',
                        right: '-12px', // 一半在侧边栏内，一半在外
                        zIndex: 1,
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: token.colorBgContainer,
                        // 使用兼容的 border 颜色属性
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
                        defaultOpenKeys={openKeys}
                        inlineCollapsed={collapsed}
                    />
                </Sider>

                <Layout.Content style={{ padding: 16, height: '100vh', overflow: 'auto' }}>
                    <Outlet />
                </Layout.Content>
            </Layout>
        </div>
    );
};

export default App;