import React, { useEffect, useMemo, useState } from 'react';
import { AutoComplete, Button, Col, Descriptions, Form, Input, InputNumber, Modal, Row, Select, Space, Table, Tag, message } from 'antd';
import { PlayCircleOutlined, SaveOutlined, TagsOutlined, TeamOutlined } from '@ant-design/icons';
import { DimensionBiListItem, MetricBiListItem, dimensionBiListApi, metricBiListApi } from '@/api/MetricBiApi';
import { FilterOperator, MetricRef, DimensionRef, FilterRef } from '@/api/DatabiApi';
import { MetricAudienceSelectionCmd, TagGroupDTO, audienceApi, growthSelectionApi, tagApi, tagGroupApi } from '@/api/GrowthApi';

interface FilterRow {
    field?: string;
    operator: FilterOperator;
    values: string;
}

const operatorOptions = [
    { label: '=', value: FilterOperator.EQ },
    { label: '!=', value: FilterOperator.NE },
    { label: '>', value: FilterOperator.GT },
    { label: '>=', value: FilterOperator.GTE },
    { label: '<', value: FilterOperator.LT },
    { label: '<=', value: FilterOperator.LTE },
    { label: 'IN', value: FilterOperator.IN },
    { label: 'BETWEEN', value: FilterOperator.BETWEEN },
    { label: 'LIKE', value: FilterOperator.LIKE },
    { label: 'IS NULL', value: FilterOperator.IS_NULL },
    { label: 'IS NOT NULL', value: FilterOperator.IS_NOT_NULL },
];

const splitValues = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean);
const USER_ENTITY_TYPE = 'USER';
const USER_ENTITY_ID_COLUMN = 'user_id';

const entityTypeOptions = [
    { label: 'USER', value: 'USER' },
    { label: 'PRODUCT', value: 'PRODUCT' },
];

const GrowthSelectionPage: React.FC = () => {
    const [metrics, setMetrics] = useState<MetricBiListItem[]>([]);
    const [dimensions, setDimensions] = useState<DimensionBiListItem[]>([]);
    const [tagGroups, setTagGroups] = useState<TagGroupDTO[]>([]);
    const [metricCodes, setMetricCodes] = useState<string[]>([]);
    const [dimCodes, setDimCodes] = useState<string[]>([]);
    const [filters, setFilters] = useState<FilterRow[]>([]);
    const [limitValue, setLimitValue] = useState<number>(10000);
    const [estimatedCount, setEstimatedCount] = useState<number>();
    const [countSql, setCountSql] = useState<string>();
    const [loading, setLoading] = useState(false);
    const [audienceOpen, setAudienceOpen] = useState(false);
    const [tagOpen, setTagOpen] = useState(false);
    const [audienceForm] = Form.useForm();
    const [tagForm] = Form.useForm();

    useEffect(() => {
        Promise.all([metricBiListApi.list(), dimensionBiListApi.list(), tagGroupApi.list()])
            .then(([metricRes, dimRes, groupRes]) => {
                setMetrics(metricRes.data || []);
                setDimensions(dimRes.data || []);
                setTagGroups(groupRes.data || []);
            })
            .catch(() => message.error('加载指标维度或标签组失败'));
    }, []);

    const selectedMetrics = useMemo(() => metrics.filter(item => metricCodes.includes(item.metricCode)), [metrics, metricCodes]);
    const selectedDimensions = useMemo(() => dimensions.filter(item => dimCodes.includes(item.dimCode)), [dimensions, dimCodes]);

    const fieldOptions = useMemo(() => {
        const dimensionOptions = selectedDimensions.map(item => ({ label: item.dimName, value: `D:${item.dimCode}` }));
        if (selectedMetrics.length === 0) {
            return dimensionOptions;
        }
        return [
            ...dimensionOptions,
            ...selectedMetrics.map(item => ({ label: item.metricName, value: `M:${item.metricCode}` })),
        ];
    }, [selectedDimensions, selectedMetrics]);

    const buildSelection = (entityType = USER_ENTITY_TYPE, entityIdColumn = USER_ENTITY_ID_COLUMN): MetricAudienceSelectionCmd => {
        const metricRefs: MetricRef[] = selectedMetrics.map(item => ({
            metricCode: item.metricCode,
            alias: item.metricName,
            metricName: item.metricName,
        }));
        const dimensionRefs: DimensionRef[] = selectedDimensions.map(item => ({
            dimCode: item.dimCode,
            alias: item.dimName,
            dimName: item.dimName,
        }));
        const filterRefs: FilterRef[] = filters
            .filter(item => item.field)
            .map(item => {
                const values = item.operator === FilterOperator.IS_NULL || item.operator === FilterOperator.IS_NOT_NULL ? [] : splitValues(item.values);
                if (item.field?.startsWith('M:')) {
                    return { metricCode: item.field.slice(2), operator: item.operator, values };
                }
                return { dimCode: item.field?.slice(2), operator: item.operator, values };
            });
        return {
            entityType,
            entityIdColumn,
            metrics: metricRefs,
            dimensions: dimensionRefs,
            filters: filterRefs,
            orders: [],
            limitValue,
        };
    };

    const validateSelection = () => {
        const selectedFilterRows = filters.filter(item => item.field);
        if (selectedMetrics.length === 0) {
            if (!selectedFilterRows.some(item => item.field?.startsWith('D:'))) {
                message.warning('无指标圈选至少需要一个维度过滤条件');
                return false;
            }
            if (selectedFilterRows.some(item => item.field?.startsWith('M:'))) {
                message.warning('无指标圈选不支持指标过滤');
                return false;
            }
        }
        return true;
    };

    const handleMetricChange = (values: string[]) => {
        setMetricCodes(values);
        if (values.length === 0) {
            setFilters(prev => prev.filter(item => !item.field?.startsWith('M:')));
        }
    };

    const handleEstimate = async () => {
        if (!validateSelection()) return;
        setLoading(true);
        try {
            const res = await growthSelectionApi.estimate(buildSelection());
            setEstimatedCount(res.data.estimatedCount);
            setCountSql(res.data.countSql);
            message.success('预估完成');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAudience = async () => {
        if (!validateSelection()) return;
        const values = await audienceForm.validateFields();
        await audienceApi.create({ ...values, selection: buildSelection() });
        message.success('人群包已创建');
        setAudienceOpen(false);
        audienceForm.resetFields();
    };

    const handleCreateTag = async () => {
        if (!validateSelection()) return;
        const values = await tagForm.validateFields();
        await tagApi.create({ ...values, selection: buildSelection(values.entityType, values.entityIdColumn) });
        message.success('标签已创建');
        setTagOpen(false);
        tagForm.resetFields();
    };

    const filterColumns = [
        {
            title: '字段',
            dataIndex: 'field',
            render: (_: string, row: FilterRow, index: number) => (
                <Select value={row.field} placeholder="字段" options={fieldOptions} style={{ width: 180 }} onChange={(value) => updateFilter(index, { field: value })} />
            ),
        },
        {
            title: '条件',
            dataIndex: 'operator',
            render: (_: FilterOperator, row: FilterRow, index: number) => (
                <Select value={row.operator} options={operatorOptions} style={{ width: 120 }} onChange={(value) => updateFilter(index, { operator: value })} />
            ),
        },
        {
            title: '值',
            dataIndex: 'values',
            render: (_: string, row: FilterRow, index: number) => (
                <Input value={row.values} placeholder="多值用逗号分隔" onChange={(event) => updateFilter(index, { values: event.target.value })} />
            ),
        },
        {
            title: '操作',
            width: 90,
            render: (_: unknown, __: FilterRow, index: number) => (
                <Button type="link" danger onClick={() => setFilters(filters.filter((_, i) => i !== index))}>删除</Button>
            ),
        },
    ];

    const updateFilter = (index: number, patch: Partial<FilterRow>) => {
        setFilters(prev => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Row gutter={16}>
                <Col span={8}>
                    <Select
                        mode="multiple"
                        allowClear
                        showSearch
                        value={metricCodes}
                        placeholder="指标"
                        optionFilterProp="label"
                        style={{ width: '100%' }}
                        options={metrics.map(item => ({ label: item.metricName, value: item.metricCode }))}
                        onChange={handleMetricChange}
                    />
                </Col>
                <Col span={8}>
                    <Select
                        mode="multiple"
                        allowClear
                        showSearch
                        value={dimCodes}
                        placeholder="维度"
                        optionFilterProp="label"
                        style={{ width: '100%' }}
                        options={dimensions.map(item => ({ label: item.dimName, value: item.dimCode }))}
                        onChange={setDimCodes}
                    />
                </Col>
                <Col span={4}>
                    <InputNumber min={1} max={1000000} value={limitValue} style={{ width: '100%' }} onChange={(value) => setLimitValue(value || 10000)} />
                </Col>
                <Col span={4}>
                    <Space>
                        <Button icon={<PlayCircleOutlined />} type="primary" loading={loading} onClick={handleEstimate}>预估</Button>
                        <Button icon={<TeamOutlined />} onClick={() => setAudienceOpen(true)}>人群</Button>
                        <Button icon={<TagsOutlined />} onClick={() => setTagOpen(true)}>标签</Button>
                    </Space>
                </Col>
            </Row>

            <Space wrap>
                {selectedMetrics.map(item => <Tag color="processing" key={item.metricCode}>{item.metricName}</Tag>)}
                {selectedDimensions.map(item => <Tag color="success" key={item.dimCode}>{item.dimName}</Tag>)}
            </Space>

            <div>
                <Space style={{ marginBottom: 8 }}>
                    <Button icon={<SaveOutlined />} onClick={() => setFilters([...filters, { operator: FilterOperator.EQ, values: '' }])}>添加条件</Button>
                </Space>
                <Table rowKey={(_, index) => String(index)} size="small" pagination={false} columns={filterColumns} dataSource={filters} />
            </div>

            <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="预估人数">{estimatedCount ?? '-'}</Descriptions.Item>
                <Descriptions.Item label="实体ID">{USER_ENTITY_ID_COLUMN}</Descriptions.Item>
                <Descriptions.Item label="SQL" span={2}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{countSql || '-'}</pre>
                </Descriptions.Item>
            </Descriptions>

            <Modal title="保存人群包" open={audienceOpen} onOk={handleCreateAudience} onCancel={() => setAudienceOpen(false)}>
                <Form form={audienceForm} layout="vertical">
                    <Form.Item name="audienceName" label="人群包名称" rules={[{ required: true, message: '请输入人群包名称' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="audienceDesc" label="描述">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal title="创建标签" open={tagOpen} onOk={handleCreateTag} onCancel={() => setTagOpen(false)}>
                <Form
                    form={tagForm}
                    layout="vertical"
                    initialValues={{ entityType: 'USER', entityIdColumn: 'user_id', valueCode: 'hit', valueName: '命中' }}
                    onValuesChange={(changedValues) => {
                        if (changedValues.entityType === 'USER') {
                            tagForm.setFieldValue('entityIdColumn', 'user_id');
                        }
                        if (changedValues.entityType === 'PRODUCT') {
                            tagForm.setFieldValue('entityIdColumn', 'product_id');
                        }
                    }}
                >
                    <Form.Item name="groupId" label="标签组">
                        <Select
                            allowClear
                            showSearch
                            placeholder="选择已有标签组"
                            optionFilterProp="label"
                            options={tagGroups.map(item => ({ label: `${item.groupName} (${item.groupCode})`, value: item.id }))}
                        />
                    </Form.Item>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="groupCode" label="新标签组编码" rules={[({ getFieldValue }) => ({
                                validator: async (_, value) => {
                                    if (getFieldValue('groupId') || value) return;
                                    throw new Error('请选择标签组或输入新标签组编码');
                                },
                            })]}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="groupName" label="新标签组名称" rules={[({ getFieldValue }) => ({
                                validator: async (_, value) => {
                                    if (getFieldValue('groupId') || value) return;
                                    throw new Error('请选择标签组或输入新标签组名称');
                                },
                            })]}>
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="tagCode" label="标签编码" rules={[{ required: true, message: '请输入标签编码' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="tagName" label="标签名称" rules={[{ required: true, message: '请输入标签名称' }]}>
                        <Input />
                    </Form.Item>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="entityType" label="实体类型" rules={[{ required: true, message: '请输入实体类型' }]}>
                                <AutoComplete options={entityTypeOptions} placeholder="USER / PRODUCT" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="entityIdColumn" label="实体ID物理字段" rules={[{ required: true, message: '请输入实体ID物理字段' }]}>
                                <Input placeholder="user_id / product_id" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="valueCode" label="标签值编码" rules={[{ required: true, message: '请输入标签值编码' }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="valueName" label="标签值名称" rules={[{ required: true, message: '请输入标签值名称' }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="tagDesc" label="描述">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default GrowthSelectionPage;
