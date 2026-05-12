import React, { useEffect, useState } from 'react';
import {
    Card,
    Table,
    Tree,
    Button,
    Space,
    Tag,
    Switch,
    message,
    Spin,
    Empty,
    Tabs,
    Select,
    Modal,
    Form,
    Typography,
} from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import {
    listSubjectPermissions,
    listMetricPermissions,
    listDimensionPermissions,
    saveSubjectPermission,
    batchUpdateMetricVisibility,
    saveDimensionPermission,
    SubjectPermissionDTO,
    MetricPermissionConfigDTO,
    DimensionPermissionConfigDTO,
    PermissionTargetDTO,
} from '@/api/DataAuthApi';

const { Title } = Typography;

const MOCK_SUBJECT_TREE = [
    {
        title: '电商',
        key: 'EC',
        children: [
            { title: '交易', key: 'TRADE', children: [
                { title: '订单', key: 'ORDER' },
                { title: '支付', key: 'PAY' },
            ]},
            { title: '商品', key: 'PRODUCT' },
            { title: '用户', key: 'USER' },
        ],
    },
    {
        title: '供应链',
        key: 'SUPPLY',
        children: [
            { title: '采购', key: 'PROCUREMENT' },
            { title: '库存', key: 'INVENTORY' },
            { title: '物流', key: 'LOGISTICS' },
        ],
    },
];

const MetricPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('subject');
    const [, setSubjectPermissions] = useState<SubjectPermissionDTO[]>([]);
    const [metricPermissions, setMetricPermissions] = useState<MetricPermissionConfigDTO[]>([]);
    const [dimensionPermissions, setDimensionPermissions] = useState<DimensionPermissionConfigDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [metricModalVisible, setMetricModalVisible] = useState(false);
    const [selectedMetricIds, setSelectedMetricIds] = useState<string[]>([]);
    const [metricForm] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [subRes, metRes, dimRes] = await Promise.all([
                listSubjectPermissions(),
                listMetricPermissions(),
                listDimensionPermissions(),
            ]);
            if (subRes.code === 200 && subRes.data) setSubjectPermissions(subRes.data);
            if (metRes.code === 200 && metRes.data) setMetricPermissions(metRes.data);
            if (dimRes.code === 200 && dimRes.data) setDimensionPermissions(dimRes.data);
        } catch {
            message.error('获取权限数据失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSaveSubjectPermission = async (subjectCode: string, actions: string[], targets: PermissionTargetDTO[]) => {
        try {
            await saveSubjectPermission({ subjectCode, subjectName: subjectCode, actions: actions as SubjectPermissionDTO['actions'], targets });
            message.success('保存成功');
            fetchData();
        } catch {
            message.error('保存失败');
        }
    };

    const handleBatchUpdateMetric = async (values: { visibility: string; allowedRoles?: string[] }) => {
        try {
            await batchUpdateMetricVisibility(
                selectedMetricIds,
                values.visibility as 'PUBLIC' | 'ROLE' | 'PRIVATE',
                values.allowedRoles,
            );
            message.success('批量更新成功');
            setMetricModalVisible(false);
            fetchData();
        } catch {
            message.error('批量更新失败');
        }
    };

    const handleToggleDimensionValues = async (record: DimensionPermissionConfigDTO) => {
        try {
            await saveDimensionPermission({ ...record, allowValuesQuery: !record.allowValuesQuery });
            message.success('更新成功');
            fetchData();
        } catch {
            message.error('更新失败');
        }
    };

    const metricColumns = [
        { title: '指标编码', dataIndex: 'metricCode', key: 'metricCode' },
        { title: '指标名称', dataIndex: 'metricName', key: 'metricName' },
        { title: '主题域', dataIndex: 'subjectName', key: 'subjectName' },
        { title: '状态', dataIndex: 'status', key: 'status', render: (text: string) => <Tag color="green">{text}</Tag> },
        {
            title: '可见范围',
            dataIndex: 'visibility',
            key: 'visibility',
            render: (text: string) => {
                const map: Record<string, string> = { PUBLIC: '公开', ROLE: '指定角色', PRIVATE: '私有' };
                return <Tag color={text === 'PUBLIC' ? 'green' : text === 'ROLE' ? 'blue' : 'default'}>{map[text] || text}</Tag>;
            },
        },
    ];

    const dimensionColumns = [
        { title: '维度编码', dataIndex: 'dimensionCode', key: 'dimensionCode' },
        { title: '维度名称', dataIndex: 'dimensionName', key: 'dimensionName' },
        { title: '分类', dataIndex: 'category', key: 'category' },
        { title: '关联字段', dataIndex: 'relatedField', key: 'relatedField' },
        {
            title: '使用权限',
            key: 'actions',
            render: (_: unknown, record: DimensionPermissionConfigDTO) => (
                <Space>
                    {record.actions.map(action => (
                        <Tag key={action}>{action}</Tag>
                    ))}
                </Space>
            ),
        },
        {
            title: '维度值查询',
            key: 'allowValuesQuery',
            render: (_: unknown, record: DimensionPermissionConfigDTO) => (
                <Switch
                    checked={record.allowValuesQuery}
                    onChange={() => handleToggleDimensionValues(record)}
                />
            ),
        },
        {
            title: '授权对象',
            key: 'targets',
            render: (_: unknown, record: DimensionPermissionConfigDTO) => (
                <Space wrap>
                    {record.targets.map(t => (
                        <Tag key={t.targetId}>{t.targetName}</Tag>
                    ))}
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '0 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>指标平台权限</Title>
            </div>

            <Tabs activeKey={activeTab} onChange={setActiveTab}>
                <Tabs.TabPane tab="主题域权限" key="subject">
                    <div style={{ display: 'flex', gap: 16 }}>
                        <Card title="主题域" style={{ width: 280, flexShrink: 0 }}>
                            <Tree
                                treeData={MOCK_SUBJECT_TREE}
                                onSelect={(keys) => setSelectedSubject(keys[0] as string)}
                            />
                        </Card>
                        <Card title="授权配置" style={{ flex: 1 }}>
                            {selectedSubject ? (
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <div>已选主题域: <Tag color="blue">{selectedSubject}</Tag></div>
                                    <div>
                                        <Button type="primary" icon={<SaveOutlined />} onClick={() => handleSaveSubjectPermission(selectedSubject, ['VIEW', 'USE'], [{ targetType: 'ROLE', targetId: 'DATA_ANALYST', targetName: '数据分析师' }])}>
                                            保存授权
                                        </Button>
                                    </div>
                                </Space>
                            ) : (
                                <Empty description="请选择左侧主题域" />
                            )}
                        </Card>
                    </div>
                </Tabs.TabPane>

                <Tabs.TabPane tab="指标权限" key="metric">
                    {loading ? (
                        <Spin />
                    ) : (
                        <>
                            <div style={{ marginBottom: 16 }}>
                                <Button onClick={() => {
                                    setSelectedMetricIds([]);
                                    setMetricModalVisible(true);
                                    metricForm.resetFields();
                                }}>
                                    批量修改可见范围
                                </Button>
                            </div>
                            <Table
                                columns={metricColumns}
                                dataSource={metricPermissions}
                                rowKey="metricId"
                                pagination={{ pageSize: 10 }}
                                rowSelection={{
                                    type: 'checkbox',
                                    onChange: (keys) => setSelectedMetricIds(keys as string[]),
                                }}
                            />
                        </>
                    )}
                </Tabs.TabPane>

                <Tabs.TabPane tab="维度权限" key="dimension">
                    {loading ? (
                        <Spin />
                    ) : (
                        <Table
                            columns={dimensionColumns}
                            dataSource={dimensionPermissions}
                            rowKey="dimensionId"
                            pagination={{ pageSize: 10 }}
                        />
                    )}
                </Tabs.TabPane>
            </Tabs>

            <Modal
                title="批量修改可见范围"
                open={metricModalVisible}
                onOk={() => metricForm.submit()}
                onCancel={() => setMetricModalVisible(false)}
            >
                <Form form={metricForm} layout="vertical" onFinish={handleBatchUpdateMetric}>
                    <Form.Item name="visibility" label="可见范围" rules={[{ required: true }]}>
                        <Select placeholder="请选择可见范围">
                            <Select.Option value="PUBLIC">公开</Select.Option>
                            <Select.Option value="ROLE">指定角色</Select.Option>
                            <Select.Option value="PRIVATE">私有</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="allowedRoles" label="允许的角色">
                        <Select mode="multiple" placeholder="请选择角色">
                            <Select.Option value="DATA_ANALYST">数据分析师</Select.Option>
                            <Select.Option value="DATA_GOVERNANCE">数据治理员</Select.Option>
                            <Select.Option value="BUSINESS_OPS">业务运营</Select.Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default MetricPage;
