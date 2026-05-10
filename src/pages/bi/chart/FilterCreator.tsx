import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, message, Row, Col, Card, DatePicker } from 'antd';
import {
    chartApi,
    ChartCmd,
    ChartType,
    AnalysisType,
} from '@/api/DatabiApi';
import { dimensionBiListApi, DimensionBiListItem, dimensionValueApi, DimensionValueItem } from '@/api/MetricBiApi';

interface FilterCreatorProps {
    open: boolean;
    onCancel: () => void;
    onSuccess: () => void;
}

const FILTER_TYPE_OPTIONS = [
    { label: '单选下拉框', value: ChartType.FILTER_SELECT },
    { label: '多选下拉框', value: ChartType.FILTER_MULTI },
    { label: '日期选择器', value: ChartType.FILTER_DATE },
    { label: '日期范围', value: ChartType.FILTER_DATE_RANGE },
];

const ANALYSIS_TYPE_OPTIONS = [
    { label: '指标平台', value: AnalysisType.METRICS },
    { label: '数据集', value: AnalysisType.DATASET },
];

/** 日期类筛选框不需要从维度平台获取选项值 */
const isDateFilter = (chartType?: ChartType) =>
    chartType === ChartType.FILTER_DATE || chartType === ChartType.FILTER_DATE_RANGE;

const FilterCreator: React.FC<FilterCreatorProps> = ({ open, onCancel, onSuccess }) => {
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [dimensions, setDimensions] = useState<DimensionBiListItem[]>([]);
    const [dimLoading, setDimLoading] = useState(false);
    const [previewOptions, setPreviewOptions] = useState<DimensionValueItem[]>([]);
    const [previewLoading, setPreviewLoading] = useState(false);

    // 使用 Form.useWatch 实时监听表单值变化（用于预览）
    const chartType = Form.useWatch('chartType', form) as ChartType | undefined;
    const filterName = Form.useWatch('name', form) as string | undefined;
    const dimCode = Form.useWatch('dimCode', form) as string | undefined;

    // 选择维度后加载真实维度值（用于预览）
    useEffect(() => {
        if (!dimCode || isDateFilter(chartType)) {
            setPreviewOptions([]);
            return;
        }
        setPreviewLoading(true);
        dimensionValueApi
            .list(dimCode)
            .then((res) => {
                if (res.code === 200) {
                    setPreviewOptions(res.data || []);
                } else {
                    setPreviewOptions([]);
                }
            })
            .catch(() => setPreviewOptions([]))
            .finally(() => setPreviewLoading(false));
    }, [dimCode, chartType]);

    // 加载维度列表
    useEffect(() => {
        if (!open) return;
        setDimLoading(true);
        dimensionBiListApi
            .list()
            .then((res) => {
                if (res.code === 200) {
                    setDimensions(res.data);
                } else {
                    message.error(res.message || '加载维度列表失败');
                }
            })
            .catch(() => message.error('加载维度列表失败'))
            .finally(() => setDimLoading(false));
    }, [open]);

    // 关闭时重置表单
    useEffect(() => {
        if (!open) {
            form.resetFields();
        }
    }, [open, form]);

    const handleSubmit = async () => {
        const values = await form.validateFields().catch(() => null);
        if (!values) return;

        const selectedDim = dimensions.find((d) => d.dimCode === values.dimCode);
        const dateFilter = isDateFilter(values.chartType);

        // 单选/多选必须选了维度
        if (!dateFilter && !selectedDim) {
            message.error('所选维度不存在');
            return;
        }

        const dimensionList = selectedDim
            ? [{ field: selectedDim.dimCode, alias: selectedDim.dimName }]
            : [];

        const cmd: ChartCmd = {
            name: values.name,
            description: values.description,
            analysisType: values.analysisType,
            chartType: values.chartType,
            metricAnalysisCmd: {
                chartType: values.chartType,
                metrics: [],
                dimensions: selectedDim
                    ? [{ dimCode: selectedDim.dimCode, alias: selectedDim.dimName }]
                    : [],
                filters: [],
                orders: [],
                limitValue: 1000,
            },
            dimensions: dimensionList,
            metrics: [],
            filters: [],
            orders: [],
            limitValue: 1000,
        };

        setSubmitting(true);
        try {
            const res = await chartApi.create(cmd);
            if (res.code === 200) {
                message.success('筛选框创建成功');
                onSuccess();
            } else {
                message.error(res.message || '创建失败');
            }
        } catch {
            message.error('创建失败');
        } finally {
            setSubmitting(false);
        }
    };

    const dateFilter = isDateFilter(chartType);
    const selectedDim = dimensions.find((d) => d.dimCode === dimCode);

    // 预览区渲染
    const renderPreview = () => {
        const label = filterName || '筛选框';
        const commonStyle: React.CSSProperties = { width: '100%' };

        // 单选/多选：用真实维度值渲染
        if (chartType === ChartType.FILTER_SELECT || chartType === ChartType.FILTER_MULTI) {
            if (previewLoading) {
                return (
                    <Select
                        style={commonStyle}
                        placeholder="加载选项中..."
                        loading
                        disabled
                    />
                );
            }
            const opts = previewOptions.length > 0
                ? previewOptions.map((o) => ({ value: o.value, label: o.label || o.value }))
                : selectedDim
                    ? [{ value: '', label: '暂无选项数据', disabled: true }]
                    : [];

            if (chartType === ChartType.FILTER_SELECT) {
                return (
                    <Select
                        style={commonStyle}
                        placeholder={selectedDim ? `请选择${label}` : '请选择'}
                        allowClear
                        options={opts}
                    />
                );
            }
            return (
                <Select
                    mode="multiple"
                    style={commonStyle}
                    placeholder={selectedDim ? `请选择${label}` : '请选择'}
                    allowClear
                    options={opts}
                />
            );
        }

        switch (chartType) {
            case ChartType.FILTER_DATE:
                return (
                    <DatePicker
                        style={commonStyle}
                        placeholder={`请选择${label}`}
                        allowClear
                    />
                );
            case ChartType.FILTER_DATE_RANGE:
                return (
                    <DatePicker.RangePicker
                        style={commonStyle}
                        placeholder={['开始日期', '结束日期']}
                        allowClear
                    />
                );
            default:
                return (
                    <div style={{ color: '#999', fontSize: 12, textAlign: 'center', padding: 24 }}>
                        请选择筛选类型以预览组件效果
                    </div>
                );
        }
    };

    // 预览区下方显示选项统计
    const renderPreviewStats = () => {
        if (!isDateFilter(chartType) && selectedDim) {
            if (previewLoading) return <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>加载中...</div>;
            if (previewOptions.length > 0) {
                return <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>共 {previewOptions.length} 个选项</div>;
            }
            return <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>暂无选项数据</div>;
        }
        return null;
    };

    return (
        <Modal
            title="新建筛选框"
            open={open}
            onCancel={onCancel}
            onOk={handleSubmit}
            confirmLoading={submitting}
            destroyOnClose
            width={720}
        >
            <Row gutter={24}>
                {/* 左侧表单 */}
                <Col span={14}>
                    <Form form={form} layout="vertical" autoComplete="off">
                        <Form.Item
                            name="name"
                            label="筛选框名称"
                            rules={[{ required: true, message: '请输入筛选框名称' }]}
                        >
                            <Input placeholder="请输入筛选框名称" maxLength={50} showCount />
                        </Form.Item>

                        <Form.Item
                            name="chartType"
                            label="筛选类型"
                            rules={[{ required: true, message: '请选择筛选类型' }]}
                            initialValue={ChartType.FILTER_SELECT}
                        >
                            <Select
                                placeholder="请选择筛选类型"
                                options={FILTER_TYPE_OPTIONS}
                            />
                        </Form.Item>

                        <Form.Item
                            name="analysisType"
                            label="分析类型"
                            rules={[{ required: true, message: '请选择分析类型' }]}
                            initialValue={AnalysisType.METRICS}
                        >
                            <Select placeholder="请选择分析类型" options={ANALYSIS_TYPE_OPTIONS} />
                        </Form.Item>

                        <Form.Item
                            name="dimCode"
                            label={dateFilter ? '选择维度（可选）' : '选择维度'}
                            rules={[{ required: !dateFilter, message: '请选择维度' }]}

                        >
                            <Select
                                placeholder={dateFilter ? '请选择维度（可选）' : '请选择维度'}
                                loading={dimLoading}
                                options={dimensions.map((d) => ({
                                    label: `${d.dimCode} (${d.dimName})`,
                                    value: d.dimCode,
                                }))}
                                showSearch
                                filterOption={(input, option) =>
                                    (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                                }
                            />
                        </Form.Item>

                        <Form.Item name="description" label="描述">
                            <Input.TextArea placeholder="请输入描述（可选）" rows={2} maxLength={200} showCount />
                        </Form.Item>
                    </Form>
                </Col>

                {/* 右侧预览 */}
                <Col span={10}>
                    <Card
                        title="组件预览"
                        size="small"
                        style={{ height: '100%', background: '#fafafa' }}
                        styles={{ body: { padding: 16 } }}
                    >
                        <div style={{ marginBottom: 12 }}>
                            <div
                                style={{
                                    fontSize: 12,
                                    color: '#666',
                                    marginBottom: 6,
                                    fontWeight: 500,
                                }}
                            >
                                {filterName || '筛选框名称'}
                            </div>
                            {renderPreview()}
                            {renderPreviewStats()}
                        </div>
                        <div
                            style={{
                                marginTop: 16,
                                padding: '8px 12px',
                                background: '#f0f0f0',
                                borderRadius: 4,
                                fontSize: 11,
                                color: '#888',
                                lineHeight: 1.6,
                            }}
                        >
                            <div style={{ fontWeight: 600, marginBottom: 4, color: '#666' }}>
                                当前配置
                            </div>
                            <div>类型：{FILTER_TYPE_OPTIONS.find((o) => o.value === chartType)?.label || '未选择'}</div>
                            {selectedDim && <div>维度：{selectedDim.dimName} ({selectedDim.dimCode})</div>}
                            {!selectedDim && chartType && (
                                <div>维度：{isDateFilter(chartType) ? '未绑定（可选）' : '未选择'}</div>
                            )}
                        </div>
                    </Card>
                </Col>
            </Row>
        </Modal>
    );
};

export default FilterCreator;
