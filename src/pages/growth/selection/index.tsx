import React, { useEffect, useMemo, useState } from 'react';
import { Button, Col, Descriptions, Form, Input, InputNumber, Modal, Row, Select, Space, Table, Tag, message } from 'antd';
import { PlayCircleOutlined, SaveOutlined, TagsOutlined, TeamOutlined } from '@ant-design/icons';
import { DimensionBiListItem, MetricBiListItem, dimensionBiListApi, metricBiListApi } from '@/api/MetricBiApi';
import { FilterOperator, MetricRef, DimensionRef, FilterRef } from '@/api/DatabiApi';
import { MetricAudienceSelectionCmd, audienceApi, growthSelectionApi, tagApi } from '@/api/GrowthApi';

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

const GrowthSelectionPage: React.FC = () => {
    const [metrics, setMetrics] = useState<MetricBiListItem[]>([]);
    const [dimensions, setDimensions] = useState<DimensionBiListItem[]>([]);
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
        Promise.all([metricBiListApi.list(), dimensionBiListApi.list()])
            .then(([metricRes, dimRes]) => {
                setMetrics(metricRes.data || []);
                setDimensions(dimRes.data || []);
            })
            .catch(() => message.error('加载指标维度失败'));
    }, []);

    const selectedMetrics = useMemo(() => metrics.filter(item => metricCodes.includes(item.metricCode)), [metrics, metricCodes]);
    const selectedDimensions = useMemo(() => dimensions.filter(item => dimCodes.includes(item.dimCode)), [dimensions, dimCodes]);

    const fieldOptions = useMemo(() => [
        ...selectedDimensions.map(item => ({ label: item.dimName, value: `D:${item.dimCode}` })),
        ...selectedMetrics.map(item => ({ label: item.metricName, value: `M:${item.metricCode}` })),
    ], [selectedDimensions, selectedMetrics]);

    const buildSelection = (): MetricAudienceSelectionCmd => {
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
            entityType: 'USER',
            entityIdDimCode: 'DIM_USER_ID',
            metrics: metricRefs,
            dimensions: dimensionRefs,
            filters: filterRefs,
            orders: [],
            limitValue,
        };
    };

    const handleEstimate = async () => {
        if (selectedMetrics.length === 0) {
            message.warning('请选择指标');
            return;
        }
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
        const values = await audienceForm.validateFields();
        await audienceApi.create({ ...values, selection: buildSelection() });
        message.success('人群包已创建');
        setAudienceOpen(false);
        audienceForm.resetFields();
    };

    const handleCreateTag = async () => {
        const values = await tagForm.validateFields();
        await tagApi.create({ ...values, selection: buildSelection() });
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
                        onChange={setMetricCodes}
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
                <Descriptions.Item label="实体ID">DIM_USER_ID</Descriptions.Item>
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
                <Form form={tagForm} layout="vertical" initialValues={{ tagValue: 'true' }}>
                    <Form.Item name="tagCode" label="标签编码" rules={[{ required: true, message: '请输入标签编码' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="tagName" label="标签名称" rules={[{ required: true, message: '请输入标签名称' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="tagValue" label="命中值">
                        <Input />
                    </Form.Item>
                    <Form.Item name="tagDesc" label="描述">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default GrowthSelectionPage;
