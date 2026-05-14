import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Button,
    Card,
    Input,
    Select,
    Space,
    Tag,
    Tooltip,
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
    CopyOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { format } from 'sql-formatter';
import {
    chartApi,
    ChartCmd,
    ChartDataDTO,
    ChartType,
    FilterConfig,
    OrderConfig,
    AggregateType,
    FilterOperator,
    OrderDirection,
    MetricBiAnalysisCmd,
} from '@/api/DatabiApi';
import {
    metricBiApi,
    metricBiListApi,
    dimensionBiListApi,
    dimensionValueApi,
    MetricBiListItem,
    DimensionBiListItem,
    DimensionValueItem,
} from '@/api/MetricBiApi';
import EChartsChart from '@/pages/bi/components/EChartsChart';

// ==================== 主组件 ====================

const ChartAnalyzer: React.FC = () => {
    const navigate = useNavigate();
    const { chartId } = useParams<{ chartId?: string }>();

    // ========== 指标/维度列表 ==========
    const [metricsList, setMetricsList] = useState<MetricBiListItem[]>([]);
    const [dimensionsList, setDimensionsList] = useState<DimensionBiListItem[]>([]);
    const [listLoading, setListLoading] = useState(false);

    const [selectedMetrics, setSelectedMetrics] = useState<MetricBiListItem[]>([]);
    const [selectedDimensions, setSelectedDimensions] = useState<DimensionBiListItem[]>([]);

    // ========== 分析配置状态 ==========
    const [chartName, setChartName] = useState('');
    const [chartType, setChartType] = useState<ChartType>(ChartType.TABLE);
    const [filters, setFilters] = useState<FilterConfig[]>([]);
    const [orders, setOrders] = useState<OrderConfig[]>([]);
    const [dimValueMap, setDimValueMap] = useState<Record<string, DimensionValueItem[]>>({});
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

                    if (c.metricAnalysisCmd) {
                        setPendingMetricCmd(c.metricAnalysisCmd);
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
        if (selectedMetrics.length === 0) {
            message.warning('请至少选择一个指标');
            return;
        }
        const tableRefs = new Set(selectedMetrics.map((m) => m.tableRef).filter(Boolean));
        if (tableRefs.size >= 2 && selectedDimensions.length === 0) {
            message.warning('多事实表分析需要至少选择一个维度');
            return;
        }
        setLoading(true);
        try {
            const res = await metricBiApi.execute(buildMetricCmd());
            if (res.code === 200) {
                setResult({ ...res.data, rows: res.data.rows.map((row, idx) => ({ ...row, __key: `row-${idx}` })) });
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
    };

    // ========== SQL 预览 ==========
    const handlePreviewSql = async () => {
        if (selectedMetrics.length === 0) {
            message.warning('请至少选择一个指标');
            return;
        }
        setPreviewOpen(true);
        setPreviewLoading(true);
        try {
            const res = await metricBiApi.previewSql(buildMetricCmd());
            if (res.code === 200) {
                setPreviewSql(format(res.data));
            } else {
                message.error(res.message || '预览 SQL 失败');
            }
        } catch {
            message.error('预览 SQL 失败');
        } finally {
            setPreviewLoading(false);
        }
    };

    // ========== 保存图表 ==========
    const handleSave = async () => {
        if (!chartName.trim()) {
            message.warning('请输入图表名称');
            return;
        }

        if (selectedMetrics.length === 0) {
            message.warning('请至少选择一个指标');
            return;
        }

        const cmd: ChartCmd = {
            name: chartName.trim(),
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

    // ========== 维度值加载 ==========
    const loadDimValues = async (dimCode: string) => {
        if (dimValueMap[dimCode]) return;
        try {
            const res = await dimensionValueApi.list(dimCode);
            if (res.code === 200 && res.data) {
                setDimValueMap((prev) => ({ ...prev, [dimCode]: res.data }));
            }
        } catch {
            // 静默失败，回退到手动输入
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
        if (key === 'field') {
            const fieldName = value as string;
            const dim = selectedDimensions.find((d) => d.dimName === fieldName);
            if (dim) {
                loadDimValues(dim.dimCode);
            }
            // 切换字段时重置值
            next[index] = { ...next[index], [key]: value, values: [''] } as FilterConfig;
        }
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
    }, [selectedDimensions, selectedMetrics]);

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

    // 多事实表判断
    const multiTableInfo = useMemo(() => {
        const refs = selectedMetrics.map((m) => m.tableRef).filter(Boolean) as string[];
        const uniqueRefs = [...new Set(refs)];
        return {
            isMultiTable: uniqueRefs.length >= 2,
            tableCount: uniqueRefs.length,
        };
    }, [selectedMetrics]);

    // ========== 结果表格列 ==========
    const resultColumns = useMemo(() => {
        if (!result || result.status !== 'SUCCESS') return [];
        return result.columns.map((col) => ({
            title: col,
            dataIndex: col,
            key: col,
            render: (value: unknown) => (value === null || value === undefined ? '-' : value),
        }));
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
            {/* 顶部栏 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
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
                    title="指标库 / 维度库"
                    size="small"
                    style={{ width: 240, flexShrink: 0, overflow: 'auto' }}
                    styles={{ body: { padding: 8 } }}
                >
                    {listLoading && (
                        <div style={{ textAlign: 'center', padding: 20 }}>
                            <Spin size="small" />
                        </div>
                    )}

                    {/* 指标模式：指标库 + 维度库 */}
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
                                        title={m.tableRef ? `${m.metricName} · 来源：${m.tableRef}` : m.description || m.metricName}
                                    >
                                        {m.metricName}
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
                                title={`${d.dimName}\n表：${d.tableName || '-'}\n字段：${d.columnName || '-'}\n显示字段：${d.displayColumn || '-'}`}
                            >
                                {d.dimName}
                            </div>
                        ))}
                    </>
                </Card>

                {/* 中间配置区 */}
                <Card
                    title="分析配置"
                    size="small"
                    style={{ flex: 1, minWidth: 280, overflow: 'auto' }}
                    styles={{ body: { padding: 12 } }}
                >
                    {/* 多事实表提示条 */}
                    {multiTableInfo.isMultiTable && (
                        <Alert
                            type="info"
                            showIcon
                            message="多事实表关联分析"
                            description={`当前选择了来自 ${multiTableInfo.tableCount} 个事实表的指标，系统将自动按公共维度关联分析。请确保已选择的维度是所有事实表的公共维度。`}
                            style={{ marginBottom: 12 }}
                        />
                    )}

                    {/* 指标区域 */}
                    <div
                        onDrop={handleDropSelectedMetric}
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
                        <Space wrap>
                            {selectedMetrics.map((m, i) => (
                                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Tooltip title={`${m.metricName}${m.statFunc ? ` (${m.statFunc})` : ''}${m.tableRef ? ` · 来源：${m.tableRef}` : ''}`}>
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
                                        </Tag>
                                    </Tooltip>
                                </div>
                            ))}
                            {selectedMetrics.length === 0 && (
                                <span style={{ color: '#999', fontSize: 12 }}>
                                    拖拽指标到此处
                                </span>
                            )}
                        </Space>
                    </div>

                    {/* 多事实表维度提示 */}
                    {multiTableInfo.isMultiTable && (
                        <Alert
                            type="warning"
                            showIcon
                            message="请选择公共维度"
                            description="多事实表分析需要选择所有事实表都支持的公共维度。如果选择非公共维度，查询可能会失败。"
                            style={{ marginBottom: 12 }}
                        />
                    )}

                    {/* 维度区域 */}
                    <div
                        onDrop={handleDropSelectedDimension}
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
                            {selectedDimensions.map((d, i) => (
                                <Tooltip key={d.id} title={`${d.dimName}\n表：${d.tableName || '-'}\n字段：${d.columnName || '-'}\n显示字段：${d.displayColumn || '-'}`}>
                                    <Tag
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
                                </Tooltip>
                            ))}
                            {selectedDimensions.length === 0 && (
                                <span style={{ color: '#999', fontSize: 12 }}>
                                    拖拽维度到此处
                                </span>
                            )}
                        </Space>
                    </div>

                    {/* 过滤条件 */}
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 13 }}>过滤条件</div>
                        {filters.map((f, i) => {
                            const isDimField = selectedDimensions.some((d) => d.dimName === f.field);
                            const dim = selectedDimensions.find((d) => d.dimName === f.field);
                            const dimValues = dim ? (dimValueMap[dim.dimCode] || []) : [];
                            const showValueInput = f.operator !== FilterOperator.IS_NULL && f.operator !== FilterOperator.IS_NOT_NULL;
                            return (
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
                                        style={{ width: 100 }}
                                        value={f.operator}
                                        onChange={(v) => updateFilter(i, 'operator', v)}
                                        options={[
                                            { label: '=', value: FilterOperator.EQ },
                                            { label: '!=', value: FilterOperator.NE },
                                            { label: '>', value: FilterOperator.GT },
                                            { label: '>=', value: FilterOperator.GTE },
                                            { label: '<', value: FilterOperator.LT },
                                            { label: '<=', value: FilterOperator.LTE },
                                            { label: '包含', value: FilterOperator.LIKE },
                                            { label: '不包含', value: FilterOperator.NOT_LIKE },
                                            { label: '在列表', value: FilterOperator.IN },
                                            { label: '不在列表', value: FilterOperator.NOT_IN },
                                            { label: '为空', value: FilterOperator.IS_NULL },
                                            { label: '不为空', value: FilterOperator.IS_NOT_NULL },
                                            { label: '范围', value: FilterOperator.BETWEEN },
                                        ]}
                                    />
                                    {showValueInput && (
                                        isDimField && dimValues.length > 0 ? (
                                            <Select
                                                mode="tags"
                                                size="small"
                                                style={{ width: 200 }}
                                                placeholder="选择或输入值"
                                                value={f.values}
                                                onChange={(v) => updateFilter(i, 'values', v as string[])}
                                                options={dimValues.map((d) => ({ label: d.label, value: d.value }))}
                                                showSearch
                                                filterOption={(input, option) =>
                                                    (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                                                }
                                            />
                                        ) : (
                                            <Input
                                                size="small"
                                                style={{ width: 200 }}
                                                placeholder="值（多个用逗号分隔）"
                                                value={f.values.join(',')}
                                                onChange={(e) =>
                                                    updateFilter(i, 'values', e.target.value.split(',').filter(Boolean))
                                                }
                                            />
                                        )
                                    )}
                                    <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeFilter(i)} />
                                </Space>
                            );
                        })}
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
                            <Spin size="large" />
                            <div style={{ marginTop: 12, color: '#999' }}>执行中...</div>
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
                            {chartType === ChartType.NUMBER && selectedMetrics.length > 0 && (
                                <div style={{ textAlign: 'center', padding: 24 }}>
                                    <Statistic
                                        title={selectedMetrics[0].metricName}
                                        value={Number(
                                            result.rows[0]?.[selectedMetrics[0].metricName] ?? 0
                                        )}
                                    />
                                </div>
                            )}

                            {chartType !== ChartType.TABLE && chartType !== ChartType.NUMBER && result.rows.length > 0 && (
                                <div style={{ height: 'calc(100vh - 380px)', minHeight: 400 }}>
                                    <EChartsChart
                                        chartType={chartType}
                                        columns={result.columns}
                                        rows={result.rows}
                                        dimensions={selectedDimensions.map((d) => ({
                                            field: d.dimName,
                                            alias: d.dimName,
                                        }))}
                                        metrics={selectedMetrics.map((m) => ({
                                            field: m.metricName,
                                            aggregate: AggregateType.SUM,
                                            alias: m.metricName,
                                        }))}
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
                                    rowKey="__key"
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
                width={1200}
                onCancel={() => setPreviewOpen(false)}
                footer={null}
            >
                {previewLoading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                        <Spin size="large" />
                        <div style={{ marginTop: 12, color: '#999' }}>生成中...</div>
                    </div>
                ) : (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                            <Button
                                icon={<CopyOutlined />}
                                onClick={() => {
                                    navigator.clipboard.writeText(previewSql).then(() => {
                                        message.success('SQL 已复制到剪贴板');
                                    }).catch(() => {
                                        message.error('复制失败');
                                    });
                                }}
                            >
                                复制 SQL
                            </Button>
                        </div>
                        <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, overflow: 'hidden' }}>
                            <Editor
                                height={500}
                                defaultLanguage="sql"
                                value={previewSql}
                                options={{ readOnly: true, minimap: { enabled: false }, wordWrap: 'on' }}
                            />
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default ChartAnalyzer;
