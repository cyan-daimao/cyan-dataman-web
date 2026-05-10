import React, { useEffect, useState, useCallback } from 'react';
import { Button, Input, Space, message, Spin, Empty } from 'antd';
import { SaveOutlined, ArrowLeftOutlined, EyeOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { dashboardApi, chartApi, DashboardCmd, ChartDTO, ChartRef, ChartDataDTO, ChartType } from '@/api/DatabiApi';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import ChartLibrary from './components/ChartLibrary';
import PanelCard from './components/PanelCard';
import PanelOptions from './components/PanelOptions';
import FilterChart from './components/FilterChart';
import EChartsChart from '@/pages/bi/components/EChartsChart';

const GRID_COLS = 12;
const ROW_HEIGHT = 50;
const SIDEBAR_WIDTH = 260;
const DEFAULT_W = 6;
const DEFAULT_H = 5;

const isFilterChartType = (chartType?: ChartType) => {
    return chartType === ChartType.FILTER_SELECT || chartType === ChartType.FILTER_MULTI ||
        chartType === ChartType.FILTER_DATE || chartType === ChartType.FILTER_DATE_RANGE;
};

// 找第一个不重叠的位置
const findFreePosition = (refs: ChartRef[], w: number, h: number): { x: number; y: number } => {
    for (let y = 0; y < 100; y += h) {
        for (let x = 0; x + w <= GRID_COLS; x += w) {
            const overlap = refs.some(ref =>
                ref.x < x + w && ref.x + ref.w > x &&
                ref.y < y + h && ref.y + ref.h > y
            );
            if (!overlap) return { x, y };
        }
    }
    return { x: 0, y: Math.max(0, ...refs.map(r => r.y + r.h), 0) };
};

// 检测同一行宽度是否溢出
const checkRowOverflow = (refs: ChartRef[]): string | null => {
    const rows: Record<number, number> = {};
    for (const ref of refs) {
        for (let y = ref.y; y < ref.y + ref.h; y++) {
            rows[y] = (rows[y] || 0) + ref.w;
        }
    }
    for (const [y, total] of Object.entries(rows)) {
        if (total > GRID_COLS) {
            return `第 ${Number(y) + 1} 行图表总宽度(${total})超出限制(${GRID_COLS})，请调整布局`;
        }
    }
    return null;
};

const DashboardEditor: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id?: string }>();
    const isEdit = !!id;

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [chartRefs, setChartRefs] = useState<ChartRef[]>([]);
    const [charts, setCharts] = useState<ChartDTO[]>([]);
    const [chartDataMap, setChartDataMap] = useState<Record<string, ChartDataDTO>>({});
    const [chartLoadingMap, setChartLoadingMap] = useState<Record<string, boolean>>({});
    const [, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [layout, setLayout] = useState<{ i: string; x: number; y: number; w: number; h: number }[]>([]);
    const [leftCollapsed, setLeftCollapsed] = useState(false);
    const [rightCollapsed, setRightCollapsed] = useState(false);
    const [canvasWidth, setCanvasWidth] = useState(960);

    // 加载
    useEffect(() => {
        chartApi.list().then(res => { if (res.code === 200) setCharts(res.data); });
        if (isEdit && id) {
            setLoading(true);
            dashboardApi.getById(id)
                .then(res => {
                    if (res.code === 200) {
                        setName(res.data.name);
                        setDescription(res.data.description || '');
                        const refs = res.data.chartRefs || [];
                        setChartRefs(refs);
                        setLayout(refs.map((ref, idx) => ({ i: String(idx), x: ref.x, y: ref.y, w: ref.w, h: ref.h })));
                        executeAllCharts(refs);
                    } else {
                        message.error(res.message || '加载看板失败');
                    }
                })
                .catch(() => message.error('加载看板失败'))
                .finally(() => setLoading(false));
        }
    }, [isEdit, id]);

    useEffect(() => {
        const updateWidth = () => {
            setCanvasWidth(Math.max(600, window.innerWidth - (leftCollapsed ? 0 : SIDEBAR_WIDTH) - (rightCollapsed ? 0 : SIDEBAR_WIDTH) - 64));
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, [leftCollapsed, rightCollapsed]);

    // 执行所有图表（无维度日期筛选框跳过 execute）
    const executeAllCharts = async (refs: ChartRef[]) => {
        const loadingMap: Record<string, boolean> = {};
        refs.forEach(r => loadingMap[r.chartId] = true);
        setChartLoadingMap(loadingMap);
        const dataMap: Record<string, ChartDataDTO> = {};
        await Promise.all(refs.map(async ref => {
            const chart = charts.find(c => c.id === ref.chartId);
            const dimCode = chart?.metricAnalysisCmd?.dimensions?.[0]?.dimCode || chart?.dimensions?.[0]?.field;
            const isDate = chart?.chartType === ChartType.FILTER_DATE || chart?.chartType === ChartType.FILTER_DATE_RANGE;
            if (isDate && !dimCode) return;
            try {
                const res = await chartApi.execute(ref.chartId);
                if (res.code === 200 && res.data.status === 'SUCCESS') dataMap[ref.chartId] = res.data;
            } catch { /* ignore */ }
        }));
        setChartDataMap(dataMap);
        setChartLoadingMap({});
    };

    const handleLayoutChange = useCallback((newLayout: { i: string; x: number; y: number; w: number; h: number }[]) => {
        setLayout(newLayout);
        const nextRefs = chartRefs.map((ref, idx) => {
            const l = newLayout.find(item => item.i === String(idx));
            return l ? { ...ref, x: l.x, y: l.y, w: l.w, h: l.h } : ref;
        });
        setChartRefs(nextRefs);
        // 布局变化后检测溢出
        const overflowMsg = checkRowOverflow(nextRefs);
        if (overflowMsg) message.warning(overflowMsg);
    }, [chartRefs]);

    const handleAddChart = (chartId: string) => {
        if (chartRefs.find(c => c.chartId === chartId)) {
            message.warning('该图表已添加');
            return;
        }
        const pos = findFreePosition(chartRefs, DEFAULT_W, DEFAULT_H);
        const newRef: ChartRef = { chartId, x: pos.x, y: pos.y, w: DEFAULT_W, h: DEFAULT_H, titleVisible: true, borderStyle: 'default', cascadeFrom: [] };
        const nextRefs = [...chartRefs, newRef];
        setChartRefs(nextRefs);
        setLayout(nextRefs.map((ref, idx) => ({ i: String(idx), x: ref.x, y: ref.y, w: ref.w, h: ref.h })));
        setSelectedIndex(nextRefs.length - 1);
        // 执行新图表（无维度日期筛选框跳过）
        const chart = charts.find(c => c.id === chartId);
        const dimCode = chart?.metricAnalysisCmd?.dimensions?.[0]?.dimCode || chart?.dimensions?.[0]?.field;
        const isDate = chart?.chartType === ChartType.FILTER_DATE || chart?.chartType === ChartType.FILTER_DATE_RANGE;
        if (!(isDate && !dimCode)) {
            setChartLoadingMap(p => ({ ...p, [chartId]: true }));
            chartApi.execute(chartId).then(res => {
                if (res.code === 200 && res.data.status === 'SUCCESS') setChartDataMap(p => ({ ...p, [chartId]: res.data }));
                setChartLoadingMap(p => ({ ...p, [chartId]: false }));
            });
        }
    };

    const handleDuplicateChart = (index: number) => {
        const ref = chartRefs[index];
        const pos = findFreePosition(chartRefs, ref.w, ref.h);
        const newRef: ChartRef = { ...ref, x: pos.x, y: pos.y };
        const nextRefs = [...chartRefs, newRef];
        setChartRefs(nextRefs);
        setLayout(nextRefs.map((r, idx) => ({ i: String(idx), x: r.x, y: r.y, w: r.w, h: r.h })));
        setSelectedIndex(nextRefs.length - 1);
    };

    const handleRemoveChart = (index: number) => {
        const next = [...chartRefs];
        const removedId = next[index]?.chartId;
        next.splice(index, 1);
        setChartRefs(next);
        setLayout(next.map((ref, idx) => ({ i: String(idx), x: ref.x, y: ref.y, w: ref.w, h: ref.h })));
        if (removedId) setChartDataMap(p => { const m = { ...p }; delete m[removedId]; return m; });
        if (selectedIndex === index) setSelectedIndex(null);
        else if (selectedIndex !== null && selectedIndex > index) setSelectedIndex(selectedIndex - 1);
    };

    const handleUpdateRef = (index: number, key: keyof ChartRef, value: unknown) => {
        const next = [...chartRefs];
        next[index] = { ...next[index], [key]: value };
        setChartRefs(next);
        if (key === 'w' || key === 'h') {
            setLayout(next.map((ref, idx) => ({ i: String(idx), x: ref.x, y: ref.y, w: ref.w, h: ref.h })));
        }
    };

    const handleSave = async (andPreview = false) => {
        if (!name.trim()) { message.warning('请输入看板名称'); return null; }
        const overflowMsg = checkRowOverflow(chartRefs);
        if (overflowMsg) { message.warning(`布局有误：${overflowMsg}，请修正后再保存`); return null; }
        const cmd: DashboardCmd = {
            name: name.trim(), description: description || undefined,
            chartRefs: chartRefs.length ? chartRefs : undefined,
            layoutConfig: JSON.stringify({ cols: GRID_COLS, rowHeight: ROW_HEIGHT, compact: true, version: 2 }),
        };
        setSaving(true);
        try {
            let res;
            if (isEdit && id) res = await dashboardApi.update(id, cmd);
            else res = await dashboardApi.create(cmd);
            if (res.code === 200) {
                message.success(isEdit ? '更新成功' : '创建成功');
                const dashboardId = isEdit && id ? id : String(res.data);
                if (andPreview) navigate(`/bi/dashboard/view/${dashboardId}`);
                else if (!isEdit) navigate(`/bi/dashboard/edit/${dashboardId}`);
                return dashboardId;
            } else { message.error(res.message || '保存失败'); return null; }
        } catch { message.error('保存失败'); return null; }
        finally { setSaving(false); }
    };

    const handlePreview = async () => {
        if (isEdit && id) navigate(`/bi/dashboard/view/${id}`);
        else { const did = await handleSave(true); if (!did) message.warning('请先保存看板'); }
    };

    const existingChartIds = chartRefs.map(r => r.chartId);

    // 渲染面板内容
    const renderContent = (chartId: string, chart?: ChartDTO) => {
        const isLoading = chartLoadingMap[chartId];
        const data = chartDataMap[chartId];
        if (isLoading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><Spin size="small" /></div>;
        if (!data || data.status !== 'SUCCESS') return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><Empty description="无预览数据" imageStyle={{ height: 40 }} /></div>;
        if (!chart) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#d9d9d9' }}>未知图表</div>;
        if (isFilterChartType(chart.chartType)) {
            return (
                <div style={{ padding: '8px 12px', height: '100%' }}>
                    <FilterChart chart={chart} data={data} />
                </div>
            );
        }
        if (chart.chartType === ChartType.NUMBER && chart.metrics?.length) {
            return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: 28, fontWeight: 600, color: '#4F6DF5' }}>{Number(data.rows[0]?.[chart.metrics[0].field] ?? 0).toLocaleString()}</div><div style={{ fontSize: 12, color: '#999' }}>{chart.metrics[0].alias || chart.metrics[0].field}</div></div></div>;
        }
        if (chart.chartType === ChartType.TABLE) {
            return <div style={{ height: '100%', overflow: 'auto' }}><table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}><thead><tr>{data.columns.map(col => <th key={col} style={{ borderBottom: '1px solid #f0f0f0', padding: '3px 6px', textAlign: 'left', fontWeight: 500, background: '#fafafa', fontSize: 10 }}>{col}</th>)}</tr></thead><tbody>{data.rows.slice(0, 20).map((row, idx) => <tr key={idx}>{data.columns.map(col => <td key={col} style={{ borderBottom: '1px solid #f0f0f0', padding: '3px 6px' }}>{String(row[col] ?? '')}</td>)}</tr>)}</tbody></table></div>;
        }
        if (data.rows.length > 0) {
            return <div style={{ width: '100%', height: '100%' }}><EChartsChart chartType={chart.chartType} columns={data.columns} rows={data.rows} dimensions={chart.dimensions || []} metrics={chart.metrics || []} /></div>;
        }
        return <Empty description="暂无数据" imageStyle={{ height: 40 }} />;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f0f2f5' }}>
            {/* 顶部工具栏 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid #e8e8e8', background: '#fff', flexShrink: 0 }}>
                <Space>
                    <Button icon={<ArrowLeftOutlined />} size="small" onClick={() => navigate('/bi/dashboard')}>返回</Button>
                    <Input placeholder="看板名称" value={name} onChange={e => setName(e.target.value)} style={{ width: 200 }} variant="borderless" />
                    <Input placeholder="描述（可选）" value={description} onChange={e => setDescription(e.target.value)} style={{ width: 240 }} variant="borderless" />
                </Space>
                <Space>
                    <Button icon={<EyeOutlined />} size="small" onClick={handlePreview}>预览</Button>
                    <Button type="primary" icon={<SaveOutlined />} size="small" loading={saving} onClick={() => handleSave()}>保存</Button>
                </Space>
            </div>

            {/* 主体 */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* 左侧 */}
                <div style={{ width: leftCollapsed ? 40 : SIDEBAR_WIDTH, flexShrink: 0, borderRight: '1px solid #e8e8e8', background: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'width 0.2s' }}>
                    {leftCollapsed ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0', cursor: 'pointer' }} onClick={() => setLeftCollapsed(false)}><MenuUnfoldOutlined style={{ color: '#666' }} /></div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #f0f0f0' }}>
                                <span style={{ fontSize: 13, fontWeight: 500 }}>组件库</span>
                                <MenuFoldOutlined style={{ color: '#999', cursor: 'pointer' }} onClick={() => setLeftCollapsed(true)} />
                            </div>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <ChartLibrary charts={charts} onAddChart={handleAddChart} existingChartIds={existingChartIds} onRefreshCharts={() => chartApi.list().then(res => { if (res.code === 200) setCharts(res.data); })} />
                            </div>
                        </>
                    )}
                </div>

                {/* 画布 */}
                <div style={{ flex: 1, overflow: 'auto', padding: 16, background: '#f0f2f5' }}>
                    <div style={{ background: '#fff', minHeight: 600, border: '1px dashed #d9d9d9', position: 'relative', padding: 8 }}>
                        {chartRefs.length === 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: '#999', fontSize: 14, border: '2px dashed #e8e8e8', borderRadius: 8, margin: 16 }}>请从左侧组件库添加图表到画布</div>
                        ) : (
                            <GridLayout className="layout" layout={layout} cols={GRID_COLS} rowHeight={ROW_HEIGHT} width={canvasWidth} onLayoutChange={handleLayoutChange} margin={[12, 12]} isBounded={false}>
                                {chartRefs.map((ref, idx) => {
                                    const chart = charts.find(c => c.id === ref.chartId);
                                    const isSelected = selectedIndex === idx;
                                    return (
                                        <div key={String(idx)}>
                                            <PanelCard title={chart?.name || ref.chartId} selected={isSelected} bgColor={ref.bgColor || undefined} borderStyle={ref.borderStyle} titleVisible={ref.titleVisible} onClick={() => setSelectedIndex(idx)} onDuplicate={() => handleDuplicateChart(idx)} onDelete={() => handleRemoveChart(idx)} dragHandleProps={{ className: 'drag-handle' }}>
                                                {renderContent(ref.chartId, chart)}
                                            </PanelCard>
                                        </div>
                                    );
                                })}
                            </GridLayout>
                        )}
                    </div>
                </div>

                {/* 右侧 */}
                <div style={{ width: rightCollapsed ? 40 : SIDEBAR_WIDTH, flexShrink: 0, borderLeft: '1px solid #e8e8e8', background: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'width 0.2s' }}>
                    {rightCollapsed ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0', cursor: 'pointer' }} onClick={() => setRightCollapsed(false)}><MenuUnfoldOutlined style={{ color: '#666' }} /></div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #f0f0f0' }}>
                                <span style={{ fontSize: 13, fontWeight: 500 }}>属性设置</span>
                                <MenuFoldOutlined style={{ color: '#999', cursor: 'pointer' }} onClick={() => setRightCollapsed(true)} />
                            </div>
                            <div style={{ flex: 1, overflow: 'auto' }}>
                                {selectedIndex !== null && chartRefs[selectedIndex] ? (
                                    <PanelOptions chartRef={chartRefs[selectedIndex]} chart={charts.find(c => c.id === chartRefs[selectedIndex].chartId)} allChartRefs={chartRefs} allCharts={charts} onChange={(key, value) => handleUpdateRef(selectedIndex, key as keyof ChartRef, value)} />
                                ) : (
                                    <div style={{ color: '#999', textAlign: 'center', paddingTop: 60, fontSize: 13 }}>点击画布中的面板<br />进行配置</div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardEditor;
