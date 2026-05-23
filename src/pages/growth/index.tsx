import React, { createContext, useContext, useMemo, useState } from 'react';
import { AppstoreOutlined, MenuFoldOutlined, MenuUnfoldOutlined, TagsOutlined, TeamOutlined } from '@ant-design/icons';
import { Button, Layout, Menu, MenuProps, theme } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const { Sider } = Layout;
const GrowthLevelContext = createContext(0);

const keyToPathMap: Record<string, string> = {
    'growth-selection': '/growth/selection',
    'growth-audience': '/growth/audience',
    'growth-tag': '/growth/tag',
};

const GrowthPage: React.FC = () => {
    const level = useContext(GrowthLevelContext);
    const isNestedLayer = level > 0;
    const { token } = theme.useToken();
    const location = useLocation();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);

    const selectedKeys = useMemo(() => {
        if (location.pathname.startsWith('/growth/audience')) return ['growth-audience'];
        if (location.pathname.startsWith('/growth/tag')) return ['growth-tag'];
        return ['growth-selection'];
    }, [location.pathname]);

    const items: MenuProps['items'] = [
        { key: 'growth-selection', label: '自助圈选', icon: <AppstoreOutlined /> },
        { key: 'growth-audience', label: '人群包', icon: <TeamOutlined /> },
        { key: 'growth-tag', label: '标签管理', icon: <TagsOutlined /> },
    ];

    const handleMenuClick: MenuProps['onClick'] = (info) => {
        const path = keyToPathMap[info.key];
        if (path) navigate(path);
    };

    if (isNestedLayer) {
        return (
            <GrowthLevelContext.Provider value={level + 1}>
                <Outlet />
            </GrowthLevelContext.Provider>
        );
    }

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <Layout style={{ background: token.colorBgContainer, width: '100%', height: '100%', borderRadius: token.borderRadiusLG }}>
                <Sider trigger={null} collapsible collapsed={collapsed} width={200} style={{ background: '#fff', height: '100%', boxShadow: '2px 0 8px rgba(29,35,51,0.04)' }}>
                    <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', padding: collapsed ? '0 8px' : '0 16px', borderBottom: '1px solid #F4F6FA' }}>
                        {!collapsed && <span style={{ fontSize: 14, fontWeight: 600, color: '#1D2333' }}>用户增长</span>}
                        <Button type="text" size="small" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} />
                    </div>
                    <Menu mode="inline" style={{ height: 'calc(100% - 56px)', borderRight: 0, paddingTop: 8 }} items={items} selectedKeys={selectedKeys} inlineCollapsed={collapsed} onClick={handleMenuClick} />
                </Sider>
                <Layout.Content style={{ padding: 16, height: '100%', overflow: 'auto', background: '#F8F9FA' }}>
                    <GrowthLevelContext.Provider value={level + 1}>
                        <Outlet />
                    </GrowthLevelContext.Provider>
                </Layout.Content>
            </Layout>
        </div>
    );
};

export default GrowthPage;
