import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Button,
    Card,
    Input,
    Select,
    Space,
    Tag,
    message,
    Table,
    Statistic,
    Modal,
    Empty,
    Spin,
    InputNumber,
} from 'antd';
import {
    SaveOutlined,
    PlayCircleOutlined,
    EyeOutlined,
    PlusOutlined,
    DeleteOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
    analysisApi,
    chartApi,
    datasetApi,
    ChartCmd,
    ChartDataDTO,
    ChartType,
    DatasetDTO,
    DimensionConfig,
    MetricConfig,
    FilterConfig,
    OrderConfig,
    AggregateType,
    FilterOperator,
    OrderDirection,
    FieldRole,
} from '@/api/DatabiApi';
import SimpleCanvasChart from '@/pages/bi/components/SimpleCanvasChart';

// ==================== 主组件 ====================

const ChartAnalyzer: React.FC = () => {
    const navigate = useNavigate();
    const { datasetId: urlDatasetId, chartId } = useParams<{ datasetId?: string; chartId?: string }>();

    // 数据集列表
    const [datasets, setDatasets] = useState<DatasetDTO[]>([]);
    const [currentDataset, setCurrentDataset] = useState<DatasetDTO | null>(null);

    // 分析配置状态
    const [datasetId, setDatasetId] = useState<string>('');
    const [chartName, setChartName] = useState('');
    const [chartType, setChartType] = useState<ChartType>(ChartType.TABLE);
    const [dimensions, setDimensions] = useState<DimensionConfig[]>([]);
    const [metrics, setMetrics] = useState<MetricConfig[]>([]);
    const [filters, setFilters] = useState<FilterConfig[]>([]);
    const [orders, setOrders] = useState<OrderConfig[]>([]);
    const [limitValue, setLimitValue] = useState<number | undefined>(1000);

    // 执行结果与交互
    const [result, setResult] = useState<ChartDataDTO | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewSql, setPreviewSql] = useState('');
    const [previewLoading, setPreviewLoading] = useState(false);

    // 加载数据集列表
    useEffect(() => {
        datasetApi.list().then((res) => {
            if (res.code === 200) {
                setDatasets(res.data);
            }
        });
    }, []);

    // 加载图表配置或选中数据集
    useEffect(() => {
        if (chartId) {
            chartApi.getById(chartId).then((res) => {
                if (res.code === 200) {
                    const c = res.data;
                    setChartName(c.name);
                    setDatasetId(c.datasetId);
                    setChartType(c.chartType);
                    setDimensions(c.dimensions || []);
                    setMetrics(c.metrics || []);
                    setFilters(c.filters || []);
                    setOrders(c.orders || []);
                    setLimitValue(c.limitValue);
                    // 加载数据集详情以获取字段
                    datasetApi.getById(c.datasetId).then((dsRes) => {
                        if (dsRes.code === 200) setCurrentDataset(dsRes.data);
                    });
                } else {
                    message.error(res.message || '加载图表失败');
                }
            });
        } else if (urlDatasetId) {
            setDatasetId(urlDatasetId);
            datasetApi.getById(urlDatasetId).then((res) => {
                if (res.code === 200) setCurrentDataset(res.data);
            });
        }
    }, [chartId, urlDatasetId]);

    // 切换数据集时加载字段
    const handleDatasetChange = (id: string) => {
        setDatasetId(id);
        setDimensions([]);
        setMetrics([]);
        const ds = datasets.find((d) => d.id === id);
        if (ds) {
            setCurrentDataset(ds);
        } else {
            datasetApi.getById(id).then((res) => {
                if (res.code === 200) setCurrentDataset(res.data);
            });
        }
    };

    // 拖拽相关
    const handleDragStart = (e: React.DragEvent, field: { name: string; role: FieldRole }) => {
        e.dataTransfer.setData('field', JSON.stringify(field));
    };

    const handleDropDimension = (e: React.DragEvent) => {
        e.preventDefault();
        const data = e.dataTransfer.getData('field');
        if (!data) return;
        const field = JSON.parse(data) as { name: string; role: FieldRole };
        if (field.role !== FieldRole.DIMENSION) {
            message.warning('该字段为指标类型，请拖入指标区域');
            return;
        }
        if (dimensions.length >= 3) {
            message.warning('最多支持 3 个维度');
            return;
        }
        if (!dimensions.find((d) => d.field === field.name)) {
            setDimensions([...dimensions, { field: field.name }]);
        }
    };

    const handleDropMetric = (e: React.DragEvent) => {
        e.preventDefault();
        const data = e.dataTransfer.getData('field');
        if (!data) return;
        const field = JSON.parse(data) as { name: string; role: FieldRole };
        if (field.role !== FieldRole.METRIC) {
            message.warning('该字段为维度类型，请拖入维度区域');
            return;
        }
        if (!metrics.find((m) => m.field === field.name)) {
            setMetrics([...metrics, { field: field.name, aggregate: AggregateType.SUM }]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    // 构建请求体
    const buildCmd = (): AnalysisCmd => {
        return {
            datasetId,
            chartType,
            dimensions: dimensions.length ? dimensions : undefined,
            metrics: metrics.length ? metrics : undefined,
            filters: filters.length ? filters : undefined,
            orders: orders.length ? orders : undefined,
            limitValue,
        };
    };

    // 执行分析
    const handleExecute = async () => {
        if (!datasetId) {
            message.warning('请先选择数据集');
            return;
        }
        setLoading(true);
        try {
            const res = await analysisApi.execute(buildCmd());
            if (res.code === 200) {
                setResult(res.data);
                if (res.data.status === 'FAILED') {
                    message.error(res.data.errorMessage || '执行失败');
                }
            } else {
                message.error(res.message || '执行失败');
            }
        } catch (e) {
            message.error('执行失败');
        } finally {
            setLoading(false);
        }
    };

    // SQL 预览
    const handlePreviewSql = async () => {
        if (!datasetId) {
            message.warning('请先选择数据集');
            return;
        }
        setPreviewOpen(true);
        setPreviewLoading(true);
        try {
            const res = await analysisApi.previewSql(buildCmd());
            if (res.code === 200) {
                setPreviewSql(res.data);
            } else {
                message.error(res.message || '预览 SQL 失败');
            }
        } catch (e) {
            message.error('预览 SQL 失败');
        } finally {
            setPreviewLoading(false);
        }
    };

    // 保存图表
    const handleSave = async () => {
        if (!datasetId) {
            message.warning('请先选择数据集');
            return;
        }
        if (!chartName.trim()) {
            message.warning('请输入图表名称');
            return;
        }
        const cmd: ChartCmd = {
            name: chartName.trim(),
            datasetId,
            chartType,
            dimensions: dimensions.length ? dimensions : undefined,
            metrics: metrics.length ? metrics : undefined,
            filters: filters.length ? filters : undefined,
            orders: orders.length ? orders : undefined,
            limitValue,
            sqlContent: result?.sql,
        };
        setSaving(true);
        try {
            let res;
            if (chartId) {
                res = await chartApi.update(chartId, cmd);
            } else {
                res = await chartApi.create(cmd);
            }
            if (res.code === 200) {
                message.success(chartId ? '更新成功' : '保存成功');
                navigate('/bi/chart');
            } else {
                message.error(res.message || '保存失败');
            }
        } catch (e) {
            message.error('保存失败');
        } finally {
            setSaving(false);
        }
    };

    // 过滤条件操作
    const addFilter = () => {
        setFilters([...filters, { field: '', operator: FilterOperator.EQ, values: [''] }]);
    };
    const removeFilter = (index: number) => {
        const next = [...filters];
        next.splice(index, 1);
        setFilters(next);
    };
    const updateFilter = (index: number, key: keyof FilterConfig, value: unknown) => {
        const next = [...filters];
        next[index] = { ...next[index], [key]: value } as FilterConfig;
        setFilters(next);
    };

    // 排序操作
    const addOrder = () => {
        setOrders([...orders, { field: '', direction: OrderDirection.ASC }]);
    };
    const removeOrder = (index: number) => {
        const next = [...orders];
        next.splice(index, 1);
        setOrders(next);
    };
    const updateOrder = (index: number, key: keyof OrderConfig, value: string) => {
        const next = [...orders];
        next[index] = { ...next[index], [key]: value } as OrderConfig;
        setOrders(next);
    };

    // 字段选项
    const fieldOptions = useMemo(() => {
        return (currentDataset?.fields || []).map((f) => ({ label: `${f.comment || f.name} (${f.name})`, value: f.name }));
    }, [currentDataset]);

    const dimensionFields = currentDataset?.fields?.filter((f) => f.role === FieldRole.DIMENSION) || [];
    const metricFields = currentDataset?.fields?.filter((f) => f.role === FieldRole.METRIC) || [];

    // 结果表格列
    const resultColumns = useMemo(() => {
        if (!result || result.status !== 'SUCCESS') return [];
        return result.columns.map((col) => ({ title: col, dataIndex: col, key: col }));
    }, [result]);

    // 图表类型选项
    const chartTypeOptions = [
        { label: '表格', value: ChartType.TABLE },
        { label: '指标卡', value: ChartType.NUMBER },
        { label: '柱状图', value: ChartType.BAR },
        { label: '折线图', value: ChartType.LINE },
        { label: '饼图', value: ChartType.PIE },
        { label: '散点图', value: ChartType.SCATTER },
        { label: '面积图', value: ChartType.AREA },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* 顶部栏 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                <Select
                    placeholder="选择数据集"
                    style={{ width: 240 }}
                    value={datasetId || undefined}
                    onChange={handleDatasetChange}
                    options={datasets.map((d) => ({ label: d.name, value: d.id }))}
                    showSearch
                    optionFilterProp="label"
                />
                <Input
                    placeholder="图表名称"
                    value={chartName}
                    onChange={(e) => setChartName(e.target.value)}
                    style={{ width: 240 }}
                />
                <Space>
                    <Button icon={<EyeOutlined />} onClick={handlePreviewSql}>
                        预览 SQL
                    </Button>
                    <Button type="primary" icon={<PlayCircleOutlined />} loading={loading} onClick={handleExecute}>
                        执行
                    </Button>
                    <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
                        保存
                    </Button>
                </Space>
            </div>

            {/* 三栏布局 */}
            <div style={{ display: 'flex', flex: 1, gap: 12, minHeight: 0, overflow: 'hidden' }}>
                {/* 左侧面板：字段列表 */}
                <Card
                    title="字段列表"
                    size="small"
                    style={{ width: 220, flexShrink: 0, overflow: 'auto' }}
                    styles={{ body: { padding: 8 } }}
                >
                    <div style={{ marginBottom: 8, fontWeight: 'bold', color: '#1890ff' }}>维度</div>
                    {dimensionFields.length === 0 && <div style={{ color: '#999', fontSize: 12 }}>暂无维度字段</div>}
                    {dimensionFields.map((f) => (
                        <div
                            key={f.name}
                            draggable
                            onDragStart={(e) => handleDragStart(e, { name: f.name, role: f.role })}
                            style={{
                                padding: '6px 8px',
                                marginBottom: 4,
                                background: '#e6f7ff',
                                borderRadius: 4,
                                cursor: 'grab',
                                fontSize: 13,
                            }}
                        >
                            {f.comment || f.name}
                        </div>
                    ))}
                    <div style={{ marginTop: 12, marginBottom: 8, fontWeight: 'bold', color: '#52c41a' }}>指标</div>
                    {metricFields.length === 0 && <div style={{ color: '#999', fontSize: 12 }}>暂无指标字段</div>}
                    {metricFields.map((f) => (
                        <div
                            key={f.name}
                            draggable
                            onDragStart={(e) => handleDragStart(e, { name: f.name, role: f.role })}
                            style={{
                                padding: '6px 8px',
                                marginBottom: 4,
                                background: '#f6ffed',
                                borderRadius: 4,
                                cursor: 'grab',
                                fontSize: 13,
                            }}
                        >
                            {f.comment || f.name}
                        </div>
                    ))}
                </Card>

                {/* 中间配置区 */}
                <Card
                    title="分析配置"
                    size="small"
                    style={{ flex: 1, minWidth: 280, overflow: 'auto' }}
                    styles={{ body: { padding: 12 } }}
                >
                    {/* 维度区域 */}
                    <div
                        onDrop={handleDropDimension}
                        onDragOver={handleDragOver}
                        style={{
                            border: '1px dashed #91d5ff',
                            borderRadius: 4,
                            padding: 8,
                            marginBottom: 12,
                            minHeight: 48,
                            background: '#f0faff',
                        }}
                    >
                        <div style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 13 }}>维度（X轴）</div>
                        <Space wrap>
                            {dimensions.map((d, i) => (
                                <Tag
                                    key={d.field}
                                    closable
                                    onClose={() => {
                                        const next = [...dimensions];
                                        next.splice(i, 1);
                                        setDimensions(next);
                                    }}
                                >
                                    {d.field}
                                </Tag>
                            ))}
                            {dimensions.length === 0 && (
                                <span style={{ color: '#999', fontSize: 12 }}>拖拽维度字段到此处</span>
                            )}
                        </Space>
                    </div>

                    {/* 指标区域 */}
                    <div
                        onDrop={handleDropMetric}
                        onDragOver={handleDragOver}
                        style={{
                            border: '1px dashed #b7eb8f',
                            borderRadius: 4,
                            padding: 8,
                            marginBottom: 12,
                            minHeight: 48,
                            background: '#f6ffed',
                        }}
                    >
                        <div style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 13 }}>指标（Y轴）</div>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            {metrics.map((m, i) => (
                                <div key={m.field} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Tag
                                        closable
                                        onClose={() => {
                                            const next = [...metrics];
                                            next.splice(i, 1);
                                            setMetrics(next);
                                        }}
                                    >
                                        {m.field}
                                    </Tag>
                                    <Select
                                        size="small"
                                        style={{ width: 140 }}
                                        value={m.aggregate}
                                        onChange={(v) => {
                                            const next = [...metrics];
                                            next[i] = { ...next[i], aggregate: v };
                                            setMetrics(next);
                                        }}
                                        options={Object.values(AggregateType).map((a) => ({ label: a, value: a }))}
                                    />
                                </div>
                            ))}
                            {metrics.length === 0 && (
                                <span style={{ color: '#999', fontSize: 12 }}>拖拽指标字段到此处</span>
                            )}
                        </Space>
                    </div>

                    {/* 过滤条件 */}
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 13 }}>过滤条件</div>
                        {filters.map((f, i) => (
                            <Space key={i} style={{ marginBottom: 8, display: 'flex' }}>
                                <Select
                                    size="small"
                                    style={{ width: 140 }}
                                    placeholder="字段"
                                    value={f.field || undefined}
                                    onChange={(v) => updateFilter(i, 'field', v)}
                                    options={fieldOptions}
                                />
                                <Select
                                    size="small"
                                    style={{ width: 140 }}
                                    value={f.operator}
                                    onChange={(v) => updateFilter(i, 'operator', v)}
                                    options={Object.values(FilterOperator).map((op) => ({ label: op, value: op }))}
                                />
                                <Input
                                    size="small"
                                    style={{ width: 160 }}
                                    placeholder="值（多个用逗号分隔）"
                                    value={f.values.join(',')}
                                    onChange={(e) => updateFilter(i, 'values', e.target.value.split(',').filter(Boolean))}
                                />
                                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeFilter(i)} />
                            </Space>
                        ))}
                        <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={addFilter}>
                            添加过滤
                        </Button>
                    </div>

                    {/* 排序 & 限制 */}
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 13 }}>排序配置</div>
                        {orders.map((o, i) => (
                            <Space key={i} style={{ marginBottom: 8, display: 'flex' }}>
                                <Select
                                    size="small"
                                    style={{ width: 140 }}
                                    placeholder="字段"
                                    value={o.field || undefined}
                                    onChange={(v) => updateOrder(i, 'field', v)}
                                    options={fieldOptions}
                                />
                                <Select
                                    size="small"
                                    style={{ width: 100 }}
                                    value={o.direction}
                                    onChange={(v) => updateOrder(i, 'direction', v)}
                                    options={[
                                        { label: '升序', value: OrderDirection.ASC },
                                        { label: '降序', value: OrderDirection.DESC },
                                    ]}
                                />
                                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeOrder(i)} />
                            </Space>
                        ))}
                        <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={addOrder}>
                            添加排序
                        </Button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13 }}>限制条数：</span>
                        <InputNumber
                            size="small"
                            min={1}
                            max={10000}
                            value={limitValue}
                            onChange={(v) => setLimitValue(v ?? undefined)}
                            style={{ width: 120 }}
                        />
                    </div>
                </Card>

                {/* 右侧可视化区 */}
                <Card
                    title="可视化"
                    size="small"
                    style={{ flex: 1.5, minWidth: 320, overflow: 'auto' }}
                    styles={{ body: { padding: 12 } }}
                    extra={
                        <Select
                            size="small"
                            style={{ width: 120 }}
                            value={chartType}
                            onChange={(v) => setChartType(v)}
                            options={chartTypeOptions}
                        />
                    }
                >
                    {loading && (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                            <Spin tip="执行中..." />
                        </div>
                    )}

                    {!loading && result?.status === 'FAILED' && (
                        <div style={{ color: '#cf1322', padding: 16, background: '#fff1f0', borderRadius: 4 }}>
                            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>执行失败</div>
                            <div>{result.errorMessage || '未知错误'}</div>
                            <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>SQL: {result.sql}</div>
                        </div>
                    )}

                    {!loading && result?.status === 'SUCCESS' && (
                        <div>
                            {chartType === ChartType.NUMBER && metrics.length > 0 && (
                                <div style={{ textAlign: 'center', padding: 24 }}>
                                    <Statistic
                                        title={metrics[0].alias || metrics[0].field}
                                        value={Number(result.rows[0]?.[metrics[0].field] ?? 0)}
                                    />
                                </div>
                            )}

                            {chartType !== ChartType.TABLE && chartType !== ChartType.NUMBER && result.rows.length > 0 && (
                                <div style={{ marginBottom: 16 }}>
                                    <SimpleCanvasChart
                                        chartType={chartType}
                                        columns={result.columns}
                                        rows={result.rows}
                                        dimensions={dimensions}
                                        metrics={metrics}
                                    />
                                </div>
                            )}

                            {(chartType === ChartType.TABLE || result.rows.length === 0) && (
                                <Table
                                    size="small"
                                    scroll={{ x: 'max-content' }}
                                    dataSource={result.rows}
                                    columns={resultColumns}
                                    pagination={{ pageSize: 10 }}
                                />
                            )}

                            <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                                耗时: {result.costTimeMs}ms | 返回 {result.rows.length} 行
                            </div>
                        </div>
                    )}

                    {!loading && !result && (
                        <Empty description="点击「执行」按钮查看分析结果" />
                    )}
                </Card>
            </div>

            {/* SQL 预览弹窗 */}
            <Modal
                open={previewOpen}
                title="SQL 预览"
                width={800}
                onCancel={() => setPreviewOpen(false)}
                footer={null}
            >
                {previewLoading ? (
                    <Spin tip="生成中..." />
                ) : (
                    <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, overflow: 'hidden' }}>
                        <Editor
                            height={300}
                            defaultLanguage="sql"
                            value={previewSql}
                            options={{ readOnly: true, minimap: { enabled: false } }}
                        />
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default ChartAnalyzer;
