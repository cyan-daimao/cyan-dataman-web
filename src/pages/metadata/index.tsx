import React, { useState, useMemo, createContext, useContext } from 'react';
import {LaptopOutlined, UserOutlined, MenuUnfoldOutlined, MenuFoldOutlined, DatabaseOutlined} from '@ant-design/icons';
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
        label: <Link to={'/meta/business-ds'}>业务数据库</Link>,
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
        label: <Link to={'/meta/metadata/datasource'}>元数据</Link>,
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
    // 获取当前嵌套层级（0 表示第一层，1 表示第二层嵌套）
    const level = useContext(MetadataLevelContext);
    const isNestedLayer = level > 0;
    
    // 正确获取 token，避免类型错误
    const { token } = theme.useToken();
    const location = useLocation();

    const [collapsed, setCollapsed] = useState(false);
    // 默认展开所有一级菜单
    const [openKeys, setOpenKeys] = useState<string[]>(['business-ds', 'metadata', 'data']);

    // 根据路径计算选中的菜单 key
    const selectedKeys = useMemo(() => {
        const key = pathToKeyMap[location.pathname];
        return key ? [key] : ['bd-datasource'];
    }, [location.pathname]);

    // 处理菜单展开/收起
    const handleOpenChange: MenuProps['onOpenChange'] = (keys) => {
        setOpenKeys(keys as string[]);
    };

    // 如果是嵌套层，直接渲染 Outlet，不渲染侧边栏
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
                        openKeys={openKeys}
                        onOpenChange={handleOpenChange}
                        inlineCollapsed={collapsed}
                    />
                </Sider>

                <Layout.Content style={{ padding: 16, height: '100vh', overflow: 'auto' }}>
                    <MetadataLevelContext.Provider value={level + 1}>
                        <Outlet />
                    </MetadataLevelContext.Provider>
                </Layout.Content>
            </Layout>
        </div>
    );
};

export default App;