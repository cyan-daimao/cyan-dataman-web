import React, { useEffect, useState, useCallback } from 'react';
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
    Drawer,
    Form,
    Select,
    Cascader,
    Input,
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
    submitApproval,
    listRoles,
    ApprovalSubmitCmd,
} from '@/api/DataAuthApi';
import { DSApi, databaseApi, tableApi } from '@/api/DSApi';
import { metricBiListApi, dimensionBiListApi } from '@/api/MetricBiApi';

const { Title, Text } = Typography;
const { TextArea } = Input;

// Round1: ready
// 从 localStorage 解析当前用户 passport
const getCurrentPassport = (): string => {
    try {
        const currentRaw = localStorage.getItem('current');
        if (currentRaw) {
            const current = JSON.parse(currentRaw) as { passport?: string };
            return current.passport || '';
        }
    } catch {
        // ignore
    }
    return '';
};

type ResourceTypeOption = 'TABLE' | 'METRIC' | 'DIMENSION' | 'ROLE';

const resourceTypeOptions = [
    { label: '数据表', value: 'TABLE' },
    { label: '指标', value: 'METRIC' },
    { label: '维度', value: 'DIMENSION' },
    { label: '角色', value: 'ROLE' },
];

const actionOptions = [
    { label: '查看 (VIEW)', value: 'VIEW' },
    { label: '使用 (USE)', value: 'USE' },
    { label: '编辑 (EDIT)', value: 'EDIT' },
    { label: '执行 (EXECUTE)', value: 'EXECUTE' },
];

const approvalTypeMap: Record<ResourceTypeOption, 'DATA_PERMISSION' | 'METRIC_PERMISSION' | 'ROLE_CHANGE'> = {
    TABLE: 'DATA_PERMISSION',
    METRIC: 'METRIC_PERMISSION',
    DIMENSION: 'METRIC_PERMISSION',
    ROLE: 'ROLE_CHANGE',
};

interface CascaderOption {
    value: string;
    label: string;
    children?: CascaderOption[];
    isLeaf?: boolean;
    loading?: boolean;
}

const MyPage: React.FC = () => {
    const [data, setData] = useState<MyPermissionDTO | null>(null);
    const [loading, setLoading] = useState(false);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form] = Form.useForm();
    const [resourceType, setResourceType] = useState<ResourceTypeOption | undefined>();

    // 级联选择状态
    const [cascaderOptions, setCascaderOptions] = useState<CascaderOption[]>([]);
    const [cascaderLoading, setCascaderLoading] = useState(false);

    // 指标/维度/角色搜索状态
    const [searchOptions, setSearchOptions] = useState<{ label: string; value: string }[]>([]);
    const [searchFetching, setSearchFetching] = useState(false);

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

    // 加载数据源列表（级联第一级）
    const loadDatasourceOptions = useCallback(async () => {
        setCascaderLoading(true);
        try {
            const res = await DSApi.list();
            if (res.code === 200 && res.data) {
                setCascaderOptions(
                    res.data.map(ds => ({
                        value: ds.name,
                        label: ds.name,
                        isLeaf: false,
                    }))
                );
            }
        } catch {
            message.error('加载数据源失败');
        } finally {
            setCascaderLoading(false);
        }
    }, []);

    // 级联加载子级
    const loadCascaderData = async (selectedOptions: CascaderOption[]) => {
        const targetOption = selectedOptions[selectedOptions.length - 1];
        targetOption.loading = true;
        setCascaderOptions([...cascaderOptions]);

        try {
            if (selectedOptions.length === 1) {
                // 加载数据库
                const dsName = targetOption.value;
                const res = await databaseApi.list(dsName);
                if (res.code === 200 && res.data) {
                    targetOption.children = res.data.map(db => ({
                        value: db.name,
                        label: db.name,
                        isLeaf: false,
                    }));
                }
            } else if (selectedOptions.length === 2) {
                // 加载表
                const dsName = selectedOptions[0].value;
                const dbName = targetOption.value;
                const res = await tableApi.list(dsName, dbName);
                if (res.code === 200 && res.data) {
                    targetOption.children = res.data.map(t => ({
                        value: t.tableName,
                        label: t.tableName,
                        isLeaf: true,
                    }));
                }
            }
        } catch {
            message.error('加载失败');
        } finally {
            targetOption.loading = false;
            setCascaderOptions([...cascaderOptions]);
        }
    };

    // 指标搜索
    const handleMetricSearch = async (value: string) => {
        if (!value) {
            setSearchOptions([]);
            return;
        }
        setSearchFetching(true);
        try {
            const res = await metricBiListApi.list({ name: value });
            if (res.code === 200 && res.data) {
                setSearchOptions(
                    res.data.map(m => ({
                        label: `${m.metricName} (${m.metricCode})`,
                        value: m.id,
                    }))
                );
            }
        } catch {
            // ignore
        } finally {
            setSearchFetching(false);
        }
    };

    // 维度搜索
    const handleDimensionSearch = async (value: string) => {
        if (!value) {
            setSearchOptions([]);
            return;
        }
        setSearchFetching(true);
        try {
            const res = await dimensionBiListApi.list({ name: value });
            if (res.code === 200 && res.data) {
                setSearchOptions(
                    res.data.map(d => ({
                        label: `${d.dimName} (${d.dimCode})`,
                        value: d.id,
                    }))
                );
            }
        } catch {
            // ignore
        } finally {
            setSearchFetching(false);
        }
    };

    // 角色加载
    const loadRoles = async () => {
        if (searchOptions.length > 0) return;
        setSearchFetching(true);
        try {
            const res = await listRoles();
            if (res.code === 200 && res.data) {
                setSearchOptions(
                    res.data.map(r => ({
                        label: `${r.name} (${r.code})`,
                        value: r.id,
                    }))
                );
            }
        } catch {
            message.error('加载角色失败');
        } finally {
            setSearchFetching(false);
        }
    };

    const handleResourceTypeChange = (value: ResourceTypeOption) => {
        setResourceType(value);
        form.setFieldsValue({ resourceId: undefined });
        setSearchOptions([]);
        setCascaderOptions([]);

        if (value === 'TABLE') {
            loadDatasourceOptions();
        } else if (value === 'ROLE') {
            loadRoles();
        }
    };

    const handleDrawerOpen = () => {
        setDrawerVisible(true);
        setResourceType(undefined);
        setSearchOptions([]);
        setCascaderOptions([]);
        form.resetFields();
    };

    const handleSubmit = async (values: {
        resourceType: ResourceTypeOption;
        resourceId: string | string[];
        actions: string[];
        reason: string;
    }) => {
        const passport = getCurrentPassport();
        if (!passport) {
            message.error('无法获取当前用户信息');
            return;
        }

        let resourceId: string;
        if (values.resourceType === 'TABLE' && Array.isArray(values.resourceId)) {
            resourceId = values.resourceId.join('.');
        } else {
            resourceId = values.resourceId as string;
        }

        const approvalType = approvalTypeMap[values.resourceType];
        const actions = values.actions;

        if (!actions || actions.length === 0) {
            message.error('请选择操作权限');
            return;
        }

        setSubmitting(true);
        try {
            // 多选 action 时分别提交审批单
            const promises = actions.map(action =>
                submitApproval({
                    applicantPassport: passport,
                    approvalType,
                    resourceType: values.resourceType,
                    resourceId,
                    action: action as ApprovalSubmitCmd['action'],
                    reason: values.reason,
                })
            );
            await Promise.all(promises);
            message.success('申请提交成功');
            setDrawerVisible(false);
            form.resetFields();
            await fetchData(); // 刷新审批进度列表
        } catch {
            message.error('申请提交失败');
        } finally {
            setSubmitting(false);
        }
    };

    // 动态资源选择组件
    const renderResourceSelector = () => {
        if (!resourceType) {
            return (
                <Select placeholder="请先选择资源类型" disabled />
            );
        }

        if (resourceType === 'TABLE') {
            return (
                <Cascader
                    options={cascaderOptions}
                    loadData={loadCascaderData as unknown as (selectedOptions: unknown[]) => void}
                    placeholder="请选择数据源 / 数据库 / 表"
                    changeOnSelect={false}
                    style={{ width: '100%' }}
                    loading={cascaderLoading}
                />
            );
        }

        if (resourceType === 'ROLE') {
            return (
                <Select
                    placeholder="请选择角色"
                    options={searchOptions}
                    loading={searchFetching}
                    showSearch
                    filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    style={{ width: '100%' }}
                />
            );
        }

        // METRIC 或 DIMENSION
        return (
            <Select
                placeholder={resourceType === 'METRIC' ? '请输入指标名称搜索' : '请输入维度名称搜索'}
                showSearch
                filterOption={false}
                onSearch={resourceType === 'METRIC' ? handleMetricSearch : handleDimensionSearch}
                notFoundContent={searchFetching ? <Spin size="small" /> : null}
                options={searchOptions}
                style={{ width: '100%' }}
            />
        );
    };

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
                <Button type="primary" icon={<PlusOutlined />} onClick={handleDrawerOpen}>
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

            {/* 申请新权限 Drawer */}
            <Drawer
                title="申请新权限"
                width={480}
                open={drawerVisible}
                onClose={() => setDrawerVisible(false)}
                destroyOnClose
                footer={
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <Button onClick={() => setDrawerVisible(false)}>取消</Button>
                        <Button type="primary" loading={submitting} onClick={() => form.submit()}>
                            提交申请
                        </Button>
                    </div>
                }
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item
                        name="resourceType"
                        label="资源类型"
                        rules={[{ required: true, message: '请选择资源类型' }]}
                    >
                        <Select
                            placeholder="请选择资源类型"
                            options={resourceTypeOptions}
                            onChange={handleResourceTypeChange}
                        />
                    </Form.Item>

                    <Form.Item
                        name="resourceId"
                        label="资源选择"
                        rules={[{ required: true, message: '请选择资源' }]}
                    >
                        {renderResourceSelector()}
                    </Form.Item>

                    <Form.Item
                        name="actions"
                        label="操作权限"
                        rules={[{ required: true, message: '请选择操作权限' }]}
                    >
                        <Select
                            mode="multiple"
                            placeholder="请选择操作权限"
                            options={actionOptions}
                        />
                    </Form.Item>

                    <Form.Item
                        name="reason"
                        label="申请理由"
                        rules={[{ required: true, message: '请填写申请理由' }]}
                    >
                        <TextArea rows={4} placeholder="请说明申请该权限的业务理由" maxLength={500} showCount />
                    </Form.Item>
                </Form>
            </Drawer>
        </div>
    );
};

export default MyPage;
