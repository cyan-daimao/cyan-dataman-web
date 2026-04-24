import React, { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, List, Progress, Spin, Empty, Typography, Tag, Space } from 'antd';
import {
    DatabaseOutlined,
    FileTextOutlined,
    AppstoreOutlined,
    BranchesOutlined,
    ClockCircleOutlined,
    UserOutlined,
    EditOutlined,
} from '@ant-design/icons';
import { MetricDashboardApi, DashboardStats } from '@/api/MetricApi';

const { Title, Text } = Typography;

const MetricsDashboard: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await MetricDashboardApi.stats();
            if (res.code === 200 && res.data) {
                setStats(res.data);
            } else {
                setError(res.message || '获取数据失败');
            }
        } catch {
            setError('获取Dashboard数据失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Spin size="large" tip="加载中..." />
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Empty description={error || '暂无数据'} />
            </div>
        );
    }

    const maxSubjectCount = Math.max(...stats.subjectDistribution.map(s => s.count), 1);

    return (
        <div style={{ padding: '0 8px' }}>
            <Title level={4} style={{ marginBottom: 24 }}>指标概览</Title>

            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8} lg={4}>
                    <Card>
                        <Statistic
                            title="指标总量"
                            value={stats.totalMetrics}
                            prefix={<DatabaseOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={4}>
                    <Card>
                        <Statistic
                            title="原子指标"
                            value={stats.atomicCount}
                            prefix={<FileTextOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={4}>
                    <Card>
                        <Statistic
                            title="派生指标"
                            value={stats.derivedCount}
                            prefix={<BranchesOutlined />}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={4}>
                    <Card>
                        <Statistic
                            title="复合指标"
                            value={stats.compositeCount}
                            prefix={<AppstoreOutlined />}
                            valueStyle={{ color: '#722ed1' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={4}>
                    <Card>
                        <Statistic
                            title="已发布"
                            value={stats.publishedCount}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={4}>
                    <Card>
                        <Statistic
                            title="草稿"
                            value={stats.draftCount}
                            valueStyle={{ color: '#faad14' }}
                        />
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} lg={12}>
                    <Card title="主题域分布" bordered={false}>
                        {stats.subjectDistribution.length === 0 ? (
                            <Empty description="暂无主题域分布数据" />
                        ) : (
                            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                {stats.subjectDistribution.map(item => (
                                    <div key={item.subjectCode}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <Text strong>{item.subjectName}</Text>
                                            <Text type="secondary">{item.count} 个</Text>
                                        </div>
                                        <Progress
                                            percent={Math.round((item.count / maxSubjectCount) * 100)}
                                            format={() => `${item.count}`}
                                            strokeColor={{ from: '#108ee9', to: '#87d068' }}
                                        />
                                    </div>
                                ))}
                            </Space>
                        )}
                    </Card>
                </Col>

                <Col xs={24} lg={12}>
                    <Card title="最近更新动态" bordered={false}>
                        {stats.recentUpdates.length === 0 ? (
                            <Empty description="暂无更新动态" />
                        ) : (
                            <List
                                dataSource={stats.recentUpdates}
                                renderItem={item => (
                                    <List.Item>
                                        <List.Item.Meta
                                            avatar={<EditOutlined style={{ color: '#1890ff', fontSize: 18 }} />}
                                            title={
                                                <Space>
                                                    <Text strong>{item.metricName}</Text>
                                                    <Tag color="blue">{item.action}</Tag>
                                                </Space>
                                            }
                                            description={
                                                <Space>
                                                    <UserOutlined />
                                                    <Text type="secondary">{item.operator}</Text>
                                                    <ClockCircleOutlined />
                                                    <Text type="secondary">{item.time}</Text>
                                                </Space>
                                            }
                                        />
                                    </List.Item>
                                )}
                            />
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default MetricsDashboard;
