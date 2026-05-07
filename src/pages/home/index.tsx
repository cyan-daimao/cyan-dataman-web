import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Card,
    Row,
    Col,
    Typography,
    Space,
    Divider,
    Tag,
    Button,
} from 'antd';
import {
    FileTextOutlined,
    DatabaseOutlined,
    BarChartOutlined,
    CodeOutlined,
    BuildOutlined,
    PieChartOutlined,
    DashboardOutlined,
    AppstoreOutlined,
    ApartmentOutlined,
    TableOutlined,
    SearchOutlined,
    SettingOutlined,
    BulbOutlined,
    BookOutlined,
    ThunderboltOutlined,
    LineChartOutlined,
    ContainerOutlined,
    EditOutlined,
    EyeOutlined,
    CloudServerOutlined,
    BranchesOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

// ==================== 文档链接配置 ====================

interface DocLink {
    title: string;
    icon: React.ReactNode;
    path?: string;
}

const docLinks: DocLink[] = [
    { title: '业务数据库使用文档', icon: <DatabaseOutlined /> },
    { title: '元数据管理使用文档', icon: <AppstoreOutlined /> },
    { title: '指标平台使用文档', icon: <BarChartOutlined /> },
    { title: 'SQL编辑器使用文档', icon: <CodeOutlined /> },
    { title: '数据加工使用文档', icon: <BuildOutlined /> },
    { title: '智能分析使用文档', icon: <PieChartOutlined /> },
    { title: '主题域管理指南', icon: <ApartmentOutlined /> },
    { title: '数据看板使用文档', icon: <DashboardOutlined /> },
];

// ==================== 功能模块配置 ====================

interface FeatureItem {
    title: string;
    desc: string;
    icon: React.ReactNode;
    path?: string;
}

interface FeatureModule {
    title: string;
    icon: React.ReactNode;
    color: string;
    features: FeatureItem[];
}

const featureModules: FeatureModule[] = [
    {
        title: '元数据平台',
        icon: <AppstoreOutlined />,
        color: '#4F6DF5',
        features: [
            { title: '业务数据库', desc: '管理MySQL/PostgreSQL/Iceberg等业务数据源与表结构', icon: <DatabaseOutlined />, path: '/meta/business-ds' },
            { title: '数据源管理', desc: '管理Gravitino目录、Schema与元数据表', icon: <CloudServerOutlined />, path: '/meta/metadata/datasource' },
            { title: '主题域管理', desc: '构建主题域体系，组织元数据资产', icon: <ApartmentOutlined />, path: '/meta/metadata/subject' },
            { title: '元数据表', desc: '查看表结构、字段信息、数据预览与血缘', icon: <TableOutlined />, path: '/meta/metadata/metadata_table' },
        ],
    },
    {
        title: '指标平台',
        icon: <BarChartOutlined />,
        color: '#52C41A',
        features: [
            { title: '指标概览', desc: '查看指标全景与核心指标监控', icon: <DashboardOutlined />, path: '/metrics/dashboard' },
            { title: '指标定义', desc: '定义原子指标、派生指标与复合指标', icon: <EditOutlined />, path: '/metrics/definition' },
            { title: '指标字典', desc: '浏览与搜索全量指标，快速定位', icon: <BookOutlined />, path: '/metrics/dictionary' },
            { title: '指标分析', desc: '基于指标进行多维分析', icon: <LineChartOutlined />, path: '/metrics/analysis' },
            { title: '指标配置', desc: '管理修饰词、时间周期与公共维度', icon: <SettingOutlined />, path: '/metrics/config' },
        ],
    },
    {
        title: '数据探索与加工',
        icon: <CodeOutlined />,
        color: '#FA8C16',
        features: [
            { title: 'SQL查询编辑器', desc: '基于Monaco Editor的在线SQL编辑器，支持多标签页与执行计划', icon: <CodeOutlined />, path: '/sql-editor' },
            { title: '数据加工', desc: 'SparkSQL / FlinkSQL任务编辑与调度配置', icon: <BuildOutlined />, path: '/data-work' },
        ],
    },
    {
        title: '智能分析',
        icon: <PieChartOutlined />,
        color: '#722ED1',
        features: [
            { title: '图表分析', desc: '拖拽式图表分析，支持指标模式与数据集模式', icon: <BarChartOutlined />, path: '/bi/chart' },
            { title: '数据看板', desc: '构建可视化数据看板，实时展示业务数据', icon: <DashboardOutlined />, path: '/bi/dashboard' },
        ],
    },
];

// ==================== 常用功能快捷入口 ====================

const quickLinks = [
    { title: 'SQL编辑器', icon: <CodeOutlined />, path: '/sql-editor' },
    { title: '图表分析', icon: <BarChartOutlined />, path: '/bi/chart' },
    { title: '指标字典', icon: <BookOutlined />, path: '/metrics/dictionary' },
    { title: '数据加工', icon: <BuildOutlined />, path: '/data-work' },
    { title: '业务数据库', icon: <DatabaseOutlined />, path: '/meta/business-ds' },
    { title: '元数据表', icon: <TableOutlined />, path: '/meta/metadata/metadata_table' },
];

// ==================== 平台公告 ====================

const notices = [
    { title: '智能分析-图表分析新增搜索与样式优化', date: '2026-04-29' },
    { title: '指标平台BI分析引擎正式上线', date: '2026-04-28' },
    { title: 'SQL编辑器支持查询历史与收藏功能', date: '2026-04-20' },
    { title: '元数据表管理新增数据血缘与质量模块', date: '2026-04-15' },
];

// ==================== 子组件 ====================

const FeatureCard: React.FC<{ item: FeatureItem }> = ({ item }) => {
    const navigate = useNavigate();
    return (
        <div
            onClick={() => item.path && navigate(item.path)}
            style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: '#FAFBFC',
                border: '1px solid transparent',
                cursor: item.path ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                height: '100%',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#DEE3FC';
                e.currentTarget.style.background = '#F4F6FA';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 109, 245, 0.08)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.background = '#FAFBFC';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            <Space align="start" size={12}>
                <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: '#EEF1FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    color: '#4F6DF5',
                    flexShrink: 0,
                }}>
                    {item.icon}
                </div>
                <div>
                    <Text strong style={{ fontSize: 13, color: '#1D2333' }}>{item.title}</Text>
                    <Paragraph ellipsis={{ rows: 1 }} style={{ fontSize: 11, color: '#8B909A', marginBottom: 0, marginTop: 2, lineHeight: 1.4 }}>
                        {item.desc}
                    </Paragraph>
                </div>
            </Space>
        </div>
    );
};

// ==================== 主组件 ====================

const HomePage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div style={{ padding: '16px 24px', background: '#F8F9FA', minHeight: '100%' }}>
            {/* 平台标题 */}
            <div style={{ marginBottom: 16 }}>
                <Title level={5} style={{ marginBottom: 2, color: '#1D2333', fontSize: 16 }}>
                    <BulbOutlined style={{ marginRight: 6, color: '#4F6DF5' }} />
                    平台介绍
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    DATA-CENTER 数据资产管理平台，面向数据分析师、BI工程师、业务运营人员，提供元数据管理、指标平台、SQL查询、数据加工与智能分析等核心能力
                </Text>
            </div>

            <Row gutter={[16, 16]}>
                {/* 左侧主要内容 */}
                <Col xs={24} lg={18}>
                    {/* 使用文档 */}
                    <Card
                        title={<Text strong style={{ fontSize: 15 }}><BookOutlined style={{ marginRight: 8 }} />使用文档</Text>}
                        extra={<Button type="link" size="small">查看更多 &gt;</Button>}
                        style={{ marginBottom: 16, borderRadius: 12 }}
                        bodyStyle={{ padding: '12px 20px' }}
                    >
                        <Row gutter={[16, 12]}>
                            {docLinks.map((doc, i) => (
                                <Col xs={24} sm={12} md={8} key={i}>
                                    <Space
                                        size={8}
                                        style={{
                                            cursor: 'pointer',
                                            padding: '8px 12px',
                                            borderRadius: 6,
                                            width: '100%',
                                            transition: 'background 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                            (e.currentTarget as HTMLElement).style.background = '#F4F6FA';
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                                        }}
                                    >
                                        <FileTextOutlined style={{ color: '#8B909A', fontSize: 14 }} />
                                        <Text style={{ fontSize: 13, color: '#4E5566' }}>{doc.title}</Text>
                                        {i === 0 && <Tag color="blue" style={{ fontSize: 11, lineHeight: '16px', height: 18, padding: '0 4px' }}>置顶</Tag>}
                                    </Space>
                                </Col>
                            ))}
                        </Row>
                    </Card>

                    {/* 功能模块 — 两两一行 */}
                    <Row gutter={[16, 16]}>
                        {featureModules.map((module) => (
                            <Col xs={24} md={12} key={module.title}>
                                <Card
                                    title={
                                        <Space size={6}>
                                            <span style={{ color: module.color, fontSize: 15 }}>{module.icon}</span>
                                            <Text strong style={{ fontSize: 14, color: '#1D2333' }}>{module.title}</Text>
                                        </Space>
                                    }
                                    style={{ borderRadius: 12, height: '100%' }}
                                    bodyStyle={{ padding: '10px 12px' }}
                                >
                                    <Row gutter={[8, 8]}>
                                        {module.features.map((feature) => (
                                            <Col xs={24} sm={12} key={feature.title}>
                                                <FeatureCard item={feature} />
                                            </Col>
                                        ))}
                                    </Row>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </Col>

                {/* 右侧边栏 */}
                <Col xs={24} lg={6}>
                    {/* 常用功能 */}
                    <Card
                        title={<Text strong style={{ fontSize: 15 }}><ThunderboltOutlined style={{ marginRight: 8 }} />常用功能</Text>}
                        style={{ marginBottom: 16, borderRadius: 12 }}
                        bodyStyle={{ padding: '10px 14px' }}
                    >
                        <Row gutter={[8, 8]}>
                            {quickLinks.map((link) => (
                                <Col span={8} key={link.title}>
                                    <div
                                        onClick={() => navigate(link.path)}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '8px 4px',
                                            borderRadius: 8,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            background: '#FAFBFC',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = '#EEF1FF';
                                            e.currentTarget.style.color = '#4F6DF5';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = '#FAFBFC';
                                            e.currentTarget.style.color = 'inherit';
                                        }}
                                    >
                                        <div style={{ fontSize: 20, marginBottom: 6, color: '#4F6DF5' }}>{link.icon}</div>
                                        <Text style={{ fontSize: 12, color: '#4E5566' }}>{link.title}</Text>
                                    </div>
                                </Col>
                            ))}
                        </Row>
                    </Card>

                    {/* 平台公告 */}
                    <Card
                        title={<Text strong style={{ fontSize: 15 }}><ContainerOutlined style={{ marginRight: 8 }} />平台公告</Text>}
                        extra={<Button type="link" size="small">查看更多 &gt;</Button>}
                        style={{ borderRadius: 12 }}
                        bodyStyle={{ padding: '8px 16px' }}
                    >
                        <Space direction="vertical" style={{ width: '100%' }} split={<Divider style={{ margin: '8px 0' }} />}>
                            {notices.map((notice, i) => (
                                <div key={i} style={{ padding: '4px 0' }}>
                                    <Text ellipsis style={{ fontSize: 13, color: '#4E5566', display: 'block' }}>
                                        {notice.title}
                                    </Text>
                                    <Text style={{ fontSize: 11, color: '#B0B5BF' }}>{notice.date}</Text>
                                </div>
                            ))}
                        </Space>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default HomePage;
