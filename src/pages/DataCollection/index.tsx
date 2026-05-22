import React, { useState } from 'react';
import { Layout, Menu } from 'antd';
import {
    DashboardOutlined,
    FileTextOutlined,
    ProjectOutlined,
    ThunderboltOutlined,
    TagOutlined,
    BugOutlined,
    AppstoreOutlined,
    CheckCircleOutlined,
    CloudUploadOutlined,
    LineChartOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const { Sider, Content } = Layout;

interface MenuItem {
    key: string;
    icon: React.ReactNode;
    label: string;
    path: string;
}

const menuItems: MenuItem[] = [
    { key: 'workbench', icon: <DashboardOutlined />, label: '采集工作台', path: '/data-collection/workbench' },
    { key: 'demands', icon: <FileTextOutlined />, label: '埋点需求', path: '/data-collection/demands' },
    { key: 'plans', icon: <ProjectOutlined />, label: '埋点方案', path: '/data-collection/plans' },
    { key: 'events', icon: <ThunderboltOutlined />, label: '事件管理', path: '/data-collection/events' },
    { key: 'properties', icon: <TagOutlined />, label: '属性管理', path: '/data-collection/properties' },
    { key: 'debug', icon: <BugOutlined />, label: 'Debug 控制台', path: '/data-collection/debug' },
    { key: 'apps', icon: <AppstoreOutlined />, label: '接入配置', path: '/data-collection/apps' },
    { key: 'acceptance', icon: <CheckCircleOutlined />, label: '验收中心', path: '/data-collection/acceptance' },
    { key: 'release', icon: <CloudUploadOutlined />, label: '发布中心', path: '/data-collection/release' },
    { key: 'quality', icon: <LineChartOutlined />, label: '质量监控', path: '/data-collection/quality' },
];

const DataCollectionLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);

    const getSelectedKey = () => {
        const pathname = location.pathname;
        for (const item of menuItems) {
            if (pathname.startsWith(item.path)) {
                return item.key;
            }
        }
        return 'workbench';
    };

    const handleMenuClick = (key: string) => {
        const item = menuItems.find(i => i.key === key);
        if (item) {
            navigate(item.path);
        }
    };

    return (
        <Layout style={{ height: '100%', display: 'flex', flexDirection: 'row' }}>
            <Sider
                collapsible
                collapsed={collapsed}
                onCollapse={setCollapsed}
                theme="light"
                style={{
                    boxShadow: '2px 0 8px rgba(29, 35, 51, 0.04)',
                    zIndex: 5,
                }}
            >
                <Menu
                    mode="inline"
                    selectedKeys={[getSelectedKey()]}
                    items={menuItems.map(item => ({
                        key: item.key,
                        icon: item.icon,
                        label: item.label,
                    }))}
                    onClick={({ key }) => handleMenuClick(key)}
                    style={{ borderRight: 0 }}
                />
            </Sider>
            <Content style={{ padding: 16, overflow: 'auto', background: '#F8F9FA' }}>
                <Outlet />
            </Content>
        </Layout>
    );
};

export default DataCollectionLayout;
