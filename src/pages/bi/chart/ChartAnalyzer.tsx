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
    Alert,
} from 'antd';
import {
    SaveOutlined,
    PlayCircleOutlined,
    EyeOutlined,
    PlusOutlined,
    DeleteOutlined,
    SearchOutlined,
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
    AnalysisType,
} from '@/api/DatabiApi';
import {
    metricBiApi,
    metricBiListApi,
    dimensionBiListApi,
    MetricBiListItem,
    DimensionBiListItem,
    MetricBiAnalysisCmd,
} from '@/api/MetricBiApi';
import EChartsChart from '@/pages/bi/components/EChartsChart';

// ==================== 主组件 ====================

const ChartAnalyzer: React.FC = () => {
    const navigate = useNavigate();
    const { chartId } = useParams<{ chartId?: string }>();

    // ========== 指标/维度列表（新模式） ==========
    const [metricsList, setMetricsList] = useState<MetricBiListItem[]>([]);
    const [dimensionsList, setDimensionsList] = useState<DimensionBiListItem[]>([]);
    const [listLoading, setListLoading] = useState(false);

    const [selectedMetrics, setSelectedMetrics] = useState<MetricBiListItem[]>([]);
    const [selectedDimensions, setSelectedDimensions] = useState<DimensionBiListItem[]>([]);

    // ========== 数据集（兼容模式） ==========
    const [datasets, setDatasets] = useState<DatasetDTO[]>([]);
    const [currentDataset, setCurrentDataset] = useState<DatasetDTO | null>(null);
    const [datasetId, setDatasetId] = useState<string>('');

    // ========== 兼容模式标记 ==========
    const [compatMode, setCompatMode] = useState(false);
    const [compatMessageShown, setCompatMessageShown] = useState(false);

    // ========== 分析配置状态（共享） ==========
    const [chartName, setChartName] = useState('');
    const [chartType, setChartType] = useState<ChartType>(ChartType.TABLE);
    const [dimensions, setDimensions] = useState<DimensionConfig[]>([]);
    const [metrics, setMetrics] = useState<MetricConfig[]>([]);
    const [filters, setFilters] = useState<FilterConfig[]>([]);
    const [orders, setOrders] = useState<OrderConfig[]>([]);
    const [limitValue, setLimitValue] = useState<number | undefined>(1000);

    // ========== 执行结果与交互 ==========
    const [result, setResult] = useState<ChartDataDTO | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewSql, setPreviewSql] = useState('');
    const [previewLoading, setPreviewLoading] = useState(false);

    // 用于编辑模式恢复（等待列表加载完成）
    const [pendingMetricCmd, setPendingMetricCmd] = useState<MetricBiAnalysisCmd | null>(null);

    // 搜索状态
    const [metricSearch, setMetricSearch] = useState('');
    const [dimSearch, setDimSearch] = useState('');
    const metricSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dimSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ========== 初始化加载指标/维度列表 ==========
    useEffect(() => {
        setListLoading(true);
        Promise.all([
            metricBiListApi.list().then((res) => {
                if (res.code === 200) {
                    setMetricsList(res.data);
                } else {
                    message.error(res.message || '加载指标库失败');
                }
            }).catch(() => message.error('加载指标库失败')),
            dimensionBiListApi.list().then((res) => {
                if (res.code === 200) {
                    setDimensionsList(res.data);
                } else {
                    message.error(res.message || '加载维度库失败');
                }
            }).catch(() => message.error('加载维度库失败')),
        ]).finally(() => setListLoading(false));
    }, []);

    // ========== 加载数据集列表（兼容模式备用） ==========
    useEffect(() => {
        datasetApi.list().then((res) => {
            if (res.code === 200) {
                setDatasets(res.data);
            }
        });
    }, []);

    // ========== 加载图表配置（编辑模式） ==========
    useEffect(() => {
        if (chartId) {
            chartApi.getById(chartId).then((res) => {
                if (res.code === 200) {
                    const c = res.data;
                    setChartName(c.name);
                    setChartType(c.chartType);
                    setFilters(c.filters || []);
                    setOrders(c.orders || []);
                    setLimitValue(c.limitValue);

                    if (c.analysisType === AnalysisType.DATASET || !c.analysisType) {
                        // 存量兼容模式
                        setCompatMode(true);
                        setCompatMessageShown(true);
                        setDatasetId(c.datasetId || '');
                        setDimensions(c.dimensions || []);
                        setMetrics(c.metrics || []);
                        if (c.datasetId) {
                            datasetApi.getById(c.datasetId).then((dsRes) => {
                                if (dsRes.code === 200) setCurrentDataset(dsRes.data);
                            });
                        }
                    } else if (c.analysisType === AnalysisType.METRICS && c.metricAnalysisCmd) {
                        // 指标模式
                        setCompatMode(false);
                        setPendingMetricCmd(c.metricAnalysisCmd);
                        // 其他字段从 metricAnalysisCmd 恢复
                        if (c.metricAnalysisCmd.limitValue !== undefined) {
                            setLimitValue(c.metricAnalysisCmd.limitValue);
                        }
                    }
                } else {
                    message.error(res.message || '加载图表失败');
                }
            });
        }
    }, [chartId]);

    // 当指标/维度列表加载完成后，恢复编辑状态的选中项
    useEffect(() => {
        if (pendingMetricCmd && metricsList.length > 0 && dimensionsList.length > 0) {
            const cmd = pendingMetricCmd;
            const restoredMetrics = cmd.metrics
                .map((m) => metricsList.find((ml) => ml.metricCode === m.metricCode))
                .filter(Boolean) as MetricBiListItem[];
            const restoredDimensions = cmd.dimensions
                .map((d) => dimensionsList.find((dl) => dl.dimCode === d.dimCode))
                .filter(Boolean) as DimensionBiListItem[];
            setSelectedMetrics(restoredMetrics);
            setSelectedDimensions(restoredDimensions);

            // 恢复过滤条件（字段名映射回名称）
            if (cmd.filters && cmd.filters.length > 0) {
                const restoredFilters = cmd.filters.map((f) => {
                    if (f.metricCode) {
                        const m = metricsList.find((ml) => ml.metricCode === f.metricCode);
                        return { field: m?.metricName || f.metricCode, operator: f.operator, values: f.values };
                    }
                    if (f.dimCode) {
                        const d = dimensionsList.find((dl) => dl.dimCode === f.dimCode);
                        return { field: d?.dimName || f.dimCode, operator: f.operator, values: f.values };
                    }
                    return { field: '', operator: f.operator, values: f.values };
                });
                setFilters(restoredFilters);
            }

            // 恢复排序
            if (cmd.orders && cmd.orders.length > 0) {
                const restoredOrders = cmd.orders.map((o) => {
                    if (o.metricCode) {
                        const m = metricsList.find((ml) => ml.metricCode === o.metricCode);
                        return { field: m?.metricName || o.metricCode, direction: o.direction };
                    }
                    if (o.dimCode) {
                        const d = dimensionsList.find((dl) => dl.dimCode === o.dimCode);
                        return { field: d?.dimName || o.dimCode, direction: o.direction };
                    }
                    return { field: '', direction: o.direction };
                });
                setOrders(restoredOrders);
            }

            setPendingMetricCmd(null);
        }
    }, [pendingMetricCmd, metricsList, dimensionsList]);

    // ========== 搜索 ==========
    const doSearchMetrics = async (keyword: string) => {
        setListLoading(true);
        try {
            const res = await metricBiListApi.list({ name: keyword || undefined });
            if (res.code === 200) {
                setMetricsList(res.data);
            } else {
                message.error(res.message || '搜索指标失败');
            }
        } catch {
            message.error('搜索指标失败');
        } finally {
            setListLoading(false);
        }
    };

    const doSearchDimensions = async (keyword: string) => {
        setListLoading(true);
        try {
            const res = await dimensionBiListApi.list({ name: keyword || undefined });
            if (res.code === 200) {
                setDimensionsList(res.data);
            } else {
                message.error(res.message || '搜索维度失败');
            }
        } catch {
            message.error('搜索维度失败');
        } finally {
            setListLoading(false);
        }
    };

    // ========== 兼容模式：切换数据集 ==========
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

    // ========== 拖拽相关（兼容模式） ==========
    const handleDragStartField = (e: React.DragEvent, field: { name: string; role: FieldRole }) => {
        e.dataTransfer.setData('field', JSON.stringify(field));
    };

    const handleDropDimensionCompat = (e: React.DragEvent) => {
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

    const handleDropMetricCompat = (e: React.DragEvent) => {
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

    // ========== 拖拽相关（指标模式） ==========
    const handleDragStartMetric = (e: React.DragEvent, metric: MetricBiListItem) => {
        e.dataTransfer.setData('metric', JSON.stringify(metric));
    };

    const handleDragStartDimension = (e: React.DragEvent, dimension: DimensionBiListItem) => {
        e.dataTransfer.setData('dimension', JSON.stringify(dimension));
    };

    const handleDropSelectedDimension = (e: React.DragEvent) => {
        e.preventDefault();
        const data = e.dataTransfer.getData('dimension');
        if (!data) return;
        const dim = JSON.parse(data) as DimensionBiListItem;
        if (selectedDimensions.length >= 3) {
            message.warning('最多支持 3 个维度');
            return;
        }
        if (!selectedDimensions.find((d) => d.id === dim.id)) {
            setSelectedDimensions([...selectedDimensions, dim]);
        }
    };

    const handleDropSelectedMetric = (e: React.DragEvent) => {
        e.preventDefault();
        const data = e.dataTransfer.getData('metric');
        if (!data) return;
        const metric = JSON.parse(data) as MetricBiListItem;
        if (!selectedMetrics.find((m) => m.id === metric.id)) {
            setSelectedMetrics([...selectedMetrics, metric]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    // ========== 构建请求体（兼容模式） ==========
    const buildCompatCmd = (): import('@/api/DatabiApi').AnalysisCmd => {
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

    // ========== 构建请求体（指标模式） ==========
    const buildMetricCmd = (): MetricBiAnalysisCmd => {
        return {
            chartType,
            metrics: selectedMetrics.map((m) => ({ metricCode: m.metricCode, alias: m.metricName })),
            dimensions: selectedDimensions.map((d) => ({ dimCode: d.dimCode, alias: d.dimName })),
            filters: filters.map((f) => {
                const metric = selectedMetrics.find((m) => m.metricName === f.field);
                if (metric) return { metricCode: metric.metricCode, operator: f.operator, values: f.values };
                const dim = selectedDimensions.find((d) => d.dimName === f.field);
                if (dim) return { dimCode: dim.dimCode, operator: f.operator, values: f.values };
                return { operator: f.operator, values: f.values };
            }),
            orders: orders.map((o) => {
                const metric = selectedMetrics.find((m) => m.metricName === o.field);
                if (metric) return { metricCode: metric.metricCode, direction: o.direction };
                const dim = selectedDimensions.find((d) => d.dimName === o.field);
                if (dim) return { dimCode: dim.dimCode, direction: o.direction };
                return { direction: o.direction };
            }),
            limitValue,
        };
    };

    // ========== 执行分析 ==========
    const handleExecute = async () => {
        if (compatMode) {
            if (!datasetId) {
                message.warning('请先选择数据集');
                return;
            }
            setLoading(true);
            try {
                const res = await analysisApi.execute(buildCompatCmd());
                if (res.code === 200) {
                    setResult(res.data);
                    if (res.data.status === 'FAILED') {
                        message.error(res.data.errorMessage || '执行失败');
                    }
                } else {
                    message.error(res.message || '执行失败');
                }
            } catch {
                message.error('执行失败');
            } finally {
                setLoading(false);
            }
        } else {
            if (selectedMetrics.length === 0) {
                message.warning('请至少选择一个指标');
                return;
            }
            setLoading(true);
            try {
                const res = await metricBiApi.execute(buildMetricCmd());
                if (res.code === 200) {
                    setResult(res.data);
                    if (res.data.status === 'FAILED') {
                        message.error(res.data.errorMessage || '执行失败');
                    }
                } else {
                    message.error(res.message || '执行失败');
                }
            } catch {
                message.error('执行失败');
            } finally {
                setLoading(false);
            }
        }
    };

    // ========== SQL 预览 ==========
    const handlePreviewSql = async () => {
        if (compatMode) {
            if (!datasetId) {
                message.warning('请先选择数据集');
                return;
            }
            setPreviewOpen(true);
            setPreviewLoading(true);
            try {
                const res = await analysisApi.previewSql(buildCompatCmd());
                if (res.code === 200) {
                    setPreviewSql(res.data);
                } else {
                    message.error(res.message || '预览 SQL 失败');
                }
            } catch {
                message.error('预览 SQL 失败');
            } finally {
                setPreviewLoading(false);
            }
        } else {
            if (selectedMetrics.length === 0) {
                message.warning('请至少选择一个指标');
                return;
            }
            setPreviewOpen(true);
            setPreviewLoading(true);
            try {
                const res = await metricBiApi.previewSql(buildMetricCmd());
                if (res.code === 200) {
                    setPreviewSql(res.data);
                } else {
                    message.error(res.message || '预览 SQL 失败');
                }
            } catch {
                message.error('预览 SQL 失败');
            } finally {
                setPreviewLoading(false);
            }
        }
    };

    // ========== 保存图表 ==========
    const handleSave = async () => {
        if (!chartName.trim()) {
            message.warning('请输入图表名称');
            return;
        }

        let cmd: ChartCmd;
        if (compatMode) {
            if (!datasetId) {
                message.warning('请先选择数据集');
                return;
            }
            cmd = {
                name: chartName.trim(),
                analysisType: AnalysisType.DATASET,
                datasetId,
                chartType,
                dimensions: dimensions.length ? dimensions : undefined,
                metrics: metrics.length ? metrics : undefined,
                filters: filters.length ? filters : undefined,
                orders: orders.length ? orders : undefined,
                limitValue,
                sqlContent: result?.sql,
            };
        } else {
            if (selectedMetrics.length === 0) {
                message.warning('请至少选择一个指标');
                return;
            }
            cmd = {
                name: chartName.trim(),
                analysisType: AnalysisType.METRICS,
                metricAnalysisCmd: buildMetricCmd(),
                chartType,
                dimensions: selectedDimensions.map((d) => ({ field: d.dimName, alias: d.dimName })),
                metrics: selectedMetrics.map((m) => ({
                    field: m.metricName,
                    aggregate: AggregateType.SUM,
                    alias: m.metricName,
                })),
                filters: filters.length ? filters : undefined,
                orders: orders.length ? orders : undefined,
                limitValue,
                sqlContent: result?.sql,
            };
        }

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
        } catch {
            message.error('保存失败');
        } finally {
            setSaving(false);
        }
    };

    // ========== 过滤条件操作 ==========
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

    // ========== 排序操作 ==========
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

    // ========== 字段选项 ==========
    const fieldOptions = useMemo(() => {
        if (compatMode) {
            return (currentDataset?.fields || []).map((f) => ({
                label: `${f.comment || f.name} (${f.name})`,
                value: f.name,
            }));
        }
        const opts = [];
        for (const d of selectedDimensions) {
            opts.push({ label: d.dimName, value: d.dimName });
        }
        for (const m of selectedMetrics) {
            opts.push({
                label: `${m.metricName}${m.statFunc ? ` (${m.statFunc})` : ''}`,
                value: m.metricName,
            });
        }
        return opts;
    }, [compatMode, currentDataset, selectedDimensions, selectedMetrics]);

    const dimensionFields = currentDataset?.fields?.filter((f) => f.role === FieldRole.DIMENSION) || [];
    const metricFields = currentDataset?.fields?.filter((f) => f.role === FieldRole.METRIC) || [];

    // 指标按主题域分组
    const metricsBySubject = useMemo(() => {
        const map: Record<string, MetricBiListItem[]> = {};
        for (const m of metricsList) {
            const subject = m.subjectName || '未分组';
            if (!map[subject]) map[subject] = [];
            map[subject].push(m);
        }
        return map;
    }, [metricsList]);

    // ========== 结果表格列 ==========
    const resultColumns = useMemo(() => {
        if (!result || result.status !== 'SUCCESS') return [];
        return result.columns.map((col) => ({ title: col, dataIndex: col, key: col }));
    }, [result]);

    // ========== 图表类型选项 ==========
    const chartTypeOptions = [
        { label: '表格', value: ChartType.TABLE },
        { label: '指标卡', value: ChartType.NUMBER },
        { label: '柱状图', value: ChartType.BAR },
        { label: '折线图', value: ChartType.LINE },
        { label: '饼图', value: ChartType.PIE },
        { label: '散点图', value: ChartType.SCATTER },
        { label: '面积图', value: ChartType.AREA },
    ];

    // ========== 渲染 ==========
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* 兼容模式提示 */}
            {compatMode && compatMessageShown && (
                <Alert
                    message="此图表基于数据集，正在使用兼容模式"
                    type="info"
                    showIcon
                    closable
                    onClose={() => setCompatMessageShown(false)}
                    style={{ marginBottom: 12 }}
                />
            )}

            {/* 顶部栏 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                {compatMode && (
                    <Select
                        placeholder="选择数据集"
                        style={{ width: 240 }}
                        value={datasetId || undefined}
                        onChange={handleDatasetChange}
                        options={datasets.map((d) => ({ label: d.name, value: d.id }))}
                        showSearch
                        optionFilterProp="label"
                    />
                )}
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
                {/* 左侧面板 */}
                <Card
                    title={compatMode ? '字段列表' : '指标库 / 维度库'}
                    size="small"
                    style={{ width: 240, flexShrink: 0, overflow: 'auto' }}
                    styles={{ body: { padding: 8 } }}
                >
                    {listLoading && !compatMode && (
                        <div style={{ textAlign: 'center', padding: 20 }}>
                            <Spin size="small" />
                        </div>
                    )}

                    {compatMode ? (
                        // 兼容模式：数据集字段
                        <>
                            <div style={{ marginBottom: 8, fontWeight: 'bold', color: '#1890ff' }}>维度</div>
                            {dimensionFields.length === 0 && <div style={{ color: '#999', fontSize: 12 }}>暂无维度字段</div>}
                            {dimensionFields.map((f) => (
                                <div
                                    key={f.name}
                                    draggable
                                    onDragStart={(e) => handleDragStartField(e, { name: f.name, role: f.role })}
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
                            <div style={{ marginTop: 12, marginBottom: 8, fontWeight: 'bold', color: '#52c41a' }}>指标</div>
                            {metricFields.length === 0 && <div style={{ color: '#999', fontSize: 12 }}>暂无指标字段</div>}
                            {metricFields.map((f) => (
                                <div
                                    key={f.name}
                                    draggable
                                    onDragStart={(e) => handleDragStartField(e, { name: f.name, role: f.role })}
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
                        </>
                    ) : (
                        // 指标模式：指标库 + 维度库
                        <>
                            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 'bold', color: '#1890ff' }}>指标库</span>
                                <Input
                                    size="small"
                                    placeholder="搜索"
                                    value={metricSearch}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setMetricSearch(value);
                                        if (metricSearchTimer.current) {
                                            clearTimeout(metricSearchTimer.current);
                                        }
                                        metricSearchTimer.current = setTimeout(() => {
                                            doSearchMetrics(value);
                                        }, 300);
                                    }}
                                    prefix={<SearchOutlined />}
                                    allowClear
                                    style={{ width: 90 }}
                                />
                            </div>
                            {metricsList.length === 0 && !listLoading && (
                                <div style={{ color: '#999', fontSize: 12 }}>暂无指标</div>
                            )}
                            {Object.entries(metricsBySubject).map(([subject, items]) => (
                                <div key={subject} style={{ marginBottom: 8 }}>
                                    <div
                                        style={{
                                            fontSize: 11,
                                            color: '#666',
                                            padding: '2px 4px',
                                            background: '#f5f5f5',
                                            borderRadius: 2,
                                            marginBottom: 4,
                                        }}
                                    >
                                        {subject}
                                    </div>
                                    {items.map((m) => (
                                        <div
                                            key={m.id}
                                            draggable
                                            onDragStart={(e) => handleDragStartMetric(e, m)}
                                            style={{
                                                padding: '6px 8px',
                                                marginBottom: 4,
                                                background: '#e6f7ff',
                                                borderRadius: 4,
                                                cursor: 'grab',
                                                fontSize: 13,
                                            }}
                                            title={m.description || `${m.metricName}${m.statFunc ? ` (${m.statFunc})` : ''}`}
                                        >
                                            {m.metricName}
                                            {m.statFunc && <span style={{ color: '#999', fontSize: 11 }}> ({m.statFunc})</span>}
                                        </div>
                                    ))}
                                </div>
                            ))}

                            <div style={{ marginTop: 12, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 'bold', color: '#52c41a' }}>维度库</span>
                                <Input
                                    size="small"
                                    placeholder="搜索"
                                    value={dimSearch}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setDimSearch(value);
                                        if (dimSearchTimer.current) {
                                            clearTimeout(dimSearchTimer.current);
                                        }
                                        dimSearchTimer.current = setTimeout(() => {
                                            doSearchDimensions(value);
                                        }, 300);
                                    }}
                                    prefix={<SearchOutlined />}
                                    allowClear
                                    style={{ width: 90 }}
                                />
                            </div>
                            {dimensionsList.length === 0 && !listLoading && (
                                <div style={{ color: '#999', fontSize: 12 }}>暂无维度</div>
                            )}
                            {dimensionsList.map((d) => (
                                <div
                                    key={d.id}
                                    draggable
                                    onDragStart={(e) => handleDragStartDimension(e, d)}
                                    style={{
                                        padding: '6px 8px',
                                        marginBottom: 4,
                                        background: '#f6ffed',
                                        borderRadius: 4,
                                        cursor: 'grab',
                                        fontSize: 13,
                                    }}
                                    title={`${d.dimName}${d.categoryName ? ` · ${d.categoryName}` : ''}`}
                                >
                                    {d.dimName}
                                </div>
                            ))}
                        </>
                    )}
                </Card>

                {/* 中间配置区 */}
                <Card
                    title="分析配置"
                    size="small"
                    style={{ flex: 1, minWidth: 280, overflow: 'auto' }}
                    styles={{ body: { padding: 12 } }}
                >
                    {/* 指标区域 */}
                    <div
                        onDrop={compatMode ? handleDropMetricCompat : handleDropSelectedMetric}
                        onDragOver={handleDragOver}
                        style={{
                            border: '1px dashed #b7eb8f',
                            borderRadius: 4,
                            padding: 8,
                            marginBottom: 12,
                            minHeight: 48,
                            background: '#e6f7ff',
                        }}
                    >
                        <div style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 13 }}>指标（Y轴）</div>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            {compatMode
                                ? metrics.map((m, i) => (
                                      <div key={m.field} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                          <Tag
                                              closable
                                              onClose={() => {
                                                  const next = [...metrics];
                                                  next.splice(i, 1);
                                                  setMetrics(next);
                                              }}
                                          style={{ backgroundColor: '#e6f7ff', borderColor: 'transparent' }}
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
                                  ))
                                : selectedMetrics.map((m, i) => (
                                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                          <Tag
                                              closable
                                              onClose={() => {
                                                  const next = [...selectedMetrics];
                                                  next.splice(i, 1);
                                                  setSelectedMetrics(next);
                                              }}
                                          style={{ backgroundColor: '#e6f7ff', borderColor: 'transparent' }}
                                          >
                                              {m.metricName}
                                              {m.statFunc && (
                                                  <span style={{ color: '#999', fontSize: 11 }}> ({m.statFunc})</span>
                                              )}
                                          </Tag>
                                      </div>
                                  ))}
                            {(compatMode ? metrics : selectedMetrics).length === 0 && (
                                <span style={{ color: '#999', fontSize: 12 }}>
                                    {compatMode ? '拖拽指标字段到此处' : '拖拽指标到此处'}
                                </span>
                            )}
                        </Space>
                    </div>

                    {/* 维度区域 */}
                    <div
                        onDrop={compatMode ? handleDropDimensionCompat : handleDropSelectedDimension}
                        onDragOver={handleDragOver}
                        style={{
                            border: '1px dashed #91d5ff',
                            borderRadius: 4,
                            padding: 8,
                            marginBottom: 12,
                            minHeight: 48,
                            background: '#f6ffed',
                        }}
                    >
                        <div style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 13 }}>维度（X轴）</div>
                        <Space wrap>
                            {compatMode
                                ? dimensions.map((d, i) => (
                                      <Tag
                                          key={d.field}
                                          closable
                                          onClose={() => {
                                              const next = [...dimensions];
                                              next.splice(i, 1);
                                              setDimensions(next);
                                          }}
                                          style={{ backgroundColor: '#f6ffed', borderColor: 'transparent' }}
                                      >
                                          {d.field}
                                      </Tag>
                                  ))
                                : selectedDimensions.map((d, i) => (
                                      <Tag
                                          key={d.id}
                                          closable
                                          onClose={() => {
                                              const next = [...selectedDimensions];
                                              next.splice(i, 1);
                                              setSelectedDimensions(next);
                                          }}
                                          style={{ backgroundColor: '#f6ffed', borderColor: 'transparent' }}
                                      >
                                          {d.dimName}
                                      </Tag>
                                  ))}
                            {(compatMode ? dimensions : selectedDimensions).length === 0 && (
                                <span style={{ color: '#999', fontSize: 12 }}>
                                    {compatMode ? '拖拽维度字段到此处' : '拖拽维度到此处'}
                                </span>
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
                                    onChange={(e) =>
                                        updateFilter(i, 'values', e.target.value.split(',').filter(Boolean))
                                    }
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
                            {chartType === ChartType.NUMBER &&
                                (compatMode ? metrics.length > 0 : selectedMetrics.length > 0) && (
                                    <div style={{ textAlign: 'center', padding: 24 }}>
                                        <Statistic
                                            title={
                                                compatMode
                                                    ? metrics[0].alias || metrics[0].field
                                                    : selectedMetrics[0].metricName
                                            }
                                            value={Number(
                                                result.rows[0]?.[
                                                    compatMode
                                                        ? metrics[0].field
                                                        : selectedMetrics[0].metricName
                                                ] ?? 0
                                            )}
                                        />
                                    </div>
                                )}

                            {chartType !== ChartType.TABLE && chartType !== ChartType.NUMBER && result.rows.length > 0 && (
                                <div style={{ marginBottom: 16 }}>
                                    <EChartsChart
                                        chartType={chartType}
                                        columns={result.columns}
                                        rows={result.rows}
                                        dimensions={
                                            compatMode
                                                ? dimensions
                                                : selectedDimensions.map((d) => ({
                                                      field: d.dimName,
                                                      alias: d.dimName,
                                                  }))
                                        }
                                        metrics={
                                            compatMode
                                                ? metrics
                                                : selectedMetrics.map((m) => ({
                                                      field: m.metricName,
                                                      aggregate: AggregateType.SUM,
                                                      alias: m.metricName,
                                                  }))
                                        }
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
