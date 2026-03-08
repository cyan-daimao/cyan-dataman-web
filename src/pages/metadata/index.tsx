import React, { useState } from 'react';
import { LaptopOutlined, UserOutlined, MenuUnfoldOutlined, MenuFoldOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Layout, Menu, theme } from 'antd';
import {Link, Outlet} from "react-router-dom";

const { Sider } = Layout;

const items: MenuProps['items'] = [
    {
        key: '1',
        label: <Link to={'/metadata'}>元数据</Link>,
        icon: <LaptopOutlined />,
        children: [
            {
                key:'1-1',
                label: <Link to='/metadata/subject'>主题管理</Link>,
            },
            {
                label: <Link to={'/metadata/metadata_table'}>元数据表</Link>,
                key: 'metadataTable',
            },
        ]
    },
    {
        label: '数据监控',
        key: 'data',
        icon: <UserOutlined />,
        children: [
            {
                label: '数据同步',
                key: 'async',
            }
        ]
    }
];

const App: React.FC = () => {
    // 正确获取 token，避免类型错误
    const { token } = theme.useToken();

    const [collapsed, setCollapsed] = useState(false);

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
                        defaultSelectedKeys={['1']}
                        defaultOpenKeys={['1']}
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