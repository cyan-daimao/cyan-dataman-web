import React, { useEffect, useState } from 'react';
import {
    Card,
    Button,
    Space,
    Tag,
    List,
    message,
    Spin,
    Empty,
    Typography,
    Timeline,
    Table,
} from 'antd';
import {
    SafetyOutlined,
    DatabaseOutlined,
    BarChartOutlined,
    FileTextOutlined,
    PlusOutlined,
} from '@ant-design/icons';
import {
    getMyPermissions,
    MyPermissionDTO,
} from '@/api/DataAuthApi';

const { Title, Text } = Typography;

const MyPage: React.FC = () => {
    const [data, setData] = useState<MyPermissionDTO | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await getMyPermissions();
            if (res.code === 200 && res.data) {
                setData(res.data);
            }
        } catch {
            message.error('获取我的权限失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const approvalColumns = [
        { title: '审批单号', dataIndex: 'approvalId', key: 'approvalId' },
        { title: '类型', dataIndex: 'approvalType', key: 'approvalType' },
        { title: '资源', dataIndex: 'resourceName', key: 'resourceName' },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (text: string) => {
                const map: Record<string, { color: string; text: string }> = {
                    PENDING: { color: 'orange', text: '待审批' },
                    APPROVED: { color: 'green', text: '已通过' },
                    REJECTED: { color: 'red', text: '已驳回' },
                };
                const s = map[text] || { color: 'default', text };
                return <Tag color={s.color}>{s.text}</Tag>;
            },
        },
        { title: '当前节点', dataIndex: 'currentNode', key: 'currentNode' },
        { title: '提交时间', dataIndex: 'submittedAt', key: 'submittedAt', render: (text: string) => text?.split('T')[0] },
    ];

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Spin size="large" tip="加载中..." />
            </div>
        );
    }

    if (!data) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Empty description="暂无数据" />
            </div>
        );
    }

    return (
        <div style={{ padding: '0 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>我的权限</Title>
                <Button type="primary" icon={<PlusOutlined />}>
                    申请新权限
                </Button>
            </div>

            <Space direction="vertical" style={{ width: '100%' }} size="large">
                {/* 功能权限 */}
                <Card
                    title={
                        <Space>
                            <SafetyOutlined style={{ color: '#1890ff' }} />
                            <span>功能权限</span>
                        </Space>
                    }
                    size="small"
                >
                    {data.functionPermissions.length === 0 ? (
                        <Empty description="暂无功能权限" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                        <Space wrap>
                            {data.functionPermissions.map((module, idx) => (
                                <Card key={idx} size="small" style={{ minWidth: 200 }} title={module.moduleName}>
                                    <Space wrap>
                                        {module.permissions.map((p, i) => (
                                            <Tag key={i}>{p}</Tag>
                                        ))}
                                    </Space>
                                </Card>
                            ))}
                        </Space>
                    )}
                </Card>

                {/* 数据权限 */}
                <Card
                    title={
                        <Space>
                            <DatabaseOutlined style={{ color: '#52c41a' }} />
                            <span>数据权限</span>
                        </Space>
                    }
                    size="small"
                >
                    {data.dataPermissions.length === 0 ? (
                        <Empty description="暂无数据权限" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                        <Timeline>
                            {data.dataPermissions.map((ds, idx) => (
                                <Timeline.Item key={idx}>
                                    <Text strong>{ds.datasourceName}</Text>
                                    {ds.databases.map((db, dIdx) => (
                                        <div key={dIdx} style={{ marginLeft: 16, marginTop: 4 }}>
                                            <Text type="secondary">{db.databaseName}</Text>
                                            <List
                                                size="small"
                                                dataSource={db.tables}
                                                renderItem={item => (
                                                    <List.Item>
                                                        <Space>
                                                            <span>{item.tableName}</span>
                                                            <Tag color="blue">{item.action}</Tag>
                                                            {item.rowFilter && <Tag color="orange">行过滤</Tag>}
                                                            {item.columnMasks && item.columnMasks.length > 0 && <Tag color="purple">脱敏</Tag>}
                                                        </Space>
                                                    </List.Item>
                                                )}
                                            />
                                        </div>
                                    ))}
                                </Timeline.Item>
                            ))}
                        </Timeline>
                    )}
                </Card>

                {/* 指标平台权限 */}
                <Card
                    title={
                        <Space>
                            <BarChartOutlined style={{ color: '#722ed1' }} />
                            <span>指标平台权限</span>
                        </Space>
                    }
                    size="small"
                >
                    {data.metricPermissions.length === 0 ? (
                        <Empty description="暂无指标平台权限" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                        <Space wrap>
                            {data.metricPermissions.map((mp, idx) => (
                                <Card key={idx} size="small" style={{ minWidth: 200 }} title={mp.subjectName}>
                                    <div>
                                        <Text type="secondary">指标:</Text>
                                        <Space wrap style={{ marginLeft: 8 }}>
                                            {mp.metrics.map(m => <Tag key={m} color="blue">{m}</Tag>)}
                                        </Space>
                                    </div>
                                    <div style={{ marginTop: 8 }}>
                                        <Text type="secondary">维度:</Text>
                                        <Space wrap style={{ marginLeft: 8 }}>
                                            {mp.dimensions.map(d => <Tag key={d} color="green">{d}</Tag>)}
                                        </Space>
                                    </div>
                                </Card>
                            ))}
                        </Space>
                    )}
                </Card>

                {/* 审批进度 */}
                <Card
                    title={
                        <Space>
                            <FileTextOutlined style={{ color: '#faad14' }} />
                            <span>审批进度</span>
                        </Space>
                    }
                    size="small"
                >
                    {data.pendingApprovals.length === 0 ? (
                        <Empty description="暂无进行中的审批" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                        <Table
                            columns={approvalColumns}
                            dataSource={data.pendingApprovals}
                            rowKey="approvalId"
                            pagination={false}
                            size="small"
                        />
                    )}
                </Card>
            </Space>
        </div>
    );
};

export default MyPage;
