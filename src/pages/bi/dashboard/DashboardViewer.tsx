import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Button, Space, message, Spin, Empty, DatePicker } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined, EditOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { dashboardApi, chartApi, DashboardDTO, DashboardChartItem, ChartDataDTO, ChartType, MetricBiAnalysisCmd, FilterOperator } from '@/api/DatabiApi';
import GridLayoutImport from 'react-grid-layout';
const GridLayout = GridLayoutImport as any;
import 'react-grid-layout/css/styles.css';
import EChartsChart from '@/pages/bi/components/EChartsChart';
import FilterBar from './components/FilterBar';
import PanelCard from './components/PanelCard';

interface ChartResult { data?: ChartDataDTO; loading: boolean; error?: string; }

const isFilterChartType = (chartType?: ChartType) => {
    return chartType === ChartType.FILTER_SELECT || chartType === ChartType.FILTER_MULTI ||
        chartType === ChartType.FILTER_DATE || chartType === ChartType.FILTER_DATE_RANGE;
};

/** 日期类筛选框且无绑定维度时，不需要后端 execute */
const needsExecute = (item: DashboardChartItem) => {
    const dimCode = item.chart.metricAnalysisCmd?.dimensions?.[0]?.dimCode || item.chart.dimensions?.[0]?.field;
    const isDate = item.chart.chartType === ChartType.FILTER_DATE || item.chart.chartType === ChartType.FILTER_DATE_RANGE;
    return !(isDate && !dimCode);
};

const ROW_HEIGHT = 50;

const DashboardViewer: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [dashboard, setDashboard] = useState<DashboardDTO | null>(null);
    const [chartItems, setChartItems] = useState<DashboardChartItem[]>([]);
    const [results, setResults] = useState<Record<string, ChartResult>>({});
    const [filterValuesMap, setFilterValuesMap] = useState<Record<string, string[]>>({});
    const filterValuesMapRef = useRef<Record<string, string[]>>({});
    const [loading, setLoading] = useState(false);
    const originalDslMap = useRef<Record<string, MetricBiAnalysisCmd>>({});

    useEffect(() => {
        filterValuesMapRef.current = filterValuesMap;
    }, [filterValuesMap]);
    const [canvasWidth, setCanvasWidth] = useState(1200);

    useEffect(() => {
        const updateWidth = () => setCanvasWidth(Math.max(800, window.innerWidth - 48));
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    const buildMergedDsl = useCallback((chartId: string): MetricBiAnalysisCmd | null => {
        const originalDsl = originalDslMap.current[chartId];
        if (!originalDsl) return null;
        const chartItem = chartItems.find(c => c.chartId === chartId);
        if (!chartItem) return originalDsl;
        // 收集所有影响该图表的筛选器来源：
        // 1. 图表自身的 cascadeFrom（正向配置：图表依赖哪些筛选器）
        // 2. 哪些筛选器的 cascadeFrom 包含该图表（反向配置：筛选器绑定了哪些图表）
        const sourceIds = new Set<string>(chartItem.cascadeFrom || []);
        chartItems.filter(item => isFilterChartType(item.chart.chartType)).forEach(filterItem => {
            if ((filterItem.cascadeFrom || []).includes(chartId)) {
                sourceIds.add(filterItem.chartId);
            }
        });
        const newFilters = [...(originalDsl.filters || [])];
        for (const sourceChartId of sourceIds) {
            const sourceChartItem = chartItems.find(c => c.chartId === sourceChartId);
            if (!sourceChartItem || !isFilterChartType(sourceChartItem.chart.chartType)) continue;
            const values = filterValuesMapRef.current[sourceChartId] || [];
            const dimCode = sourceChartItem.chart.metricAnalysisCmd?.dimensions?.[0]?.dimCode || sourceChartItem.chart.dimensions?.[0]?.field || '';
            if (!dimCode) continue;
            if (values.length === 0) {
                const idx = newFilters.findIndex(f => f.dimCode === dimCode);
                if (idx >= 0) newFilters.splice(idx, 1);
                continue;
            }
            let operator: FilterOperator;
            if (sourceChartItem.chart.chartType === ChartType.FILTER_DATE_RANGE) operator = FilterOperator.BETWEEN;
            else if (values.length > 1) operator = FilterOperator.IN;
            else operator = FilterOperator.EQ;
            const idx = newFilters.findIndex(f => f.dimCode === dimCode);
            if (idx >= 0) newFilters[idx] = { dimCode, operator, values };
            else newFilters.push({ dimCode, operator, values });
        }
        return { ...originalDsl, filters: newFilters };
    }, [chartItems]);

    const executeChart = useCallback(async (chartId: string, dsl?: MetricBiAnalysisCmd) => {
        setResults(prev => ({ ...prev, [chartId]: { ...prev[chartId], loading: true, error: undefined } }));
        try {
            const body = dsl ? { metricAnalysisCmd: dsl } : undefined;
            const res = await chartApi.execute(chartId, body);
            if (res.code === 200) {
                setResults(prev => ({ ...prev, [chartId]: { data: res.data, loading: false } }));
            } else {
                setResults(prev => ({ ...prev, [chartId]: { data: { status: 'FAILED', costTimeMs: 0, columns: [], rows: [], sql: '', errorMessage: res.message }, loading: false } }));
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : '执行失败';
            setResults(prev => ({ ...prev, [chartId]: { data: { status: 'FAILED', costTimeMs: 0, columns: [], rows: [], sql: '', errorMessage: msg }, loading: false } }));
        }
    }, []);

    const loadDashboard = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const dashRes = await dashboardApi.getById(id);
            if (dashRes.code !== 200) { message.error(dashRes.message || '加载看板失败'); return; }
            setDashboard(dashRes.data);
            const chartsRes = await dashboardApi.getDashboardCharts(id);
            if (chartsRes.code !== 200) { message.error(chartsRes.message || '加载图表失败'); return; }
            const items = chartsRes.data || [];
            setChartItems(items);
            const dslMap: Record<string, MetricBiAnalysisCmd> = {};
            const resultMap: Record<string, ChartResult> = {};
            for (const item of items) {
                if (item.chart.metricAnalysisCmd) dslMap[item.chartId] = JSON.parse(JSON.stringify(item.chart.metricAnalysisCmd));
                if (needsExecute(item)) {
                    resultMap[item.chartId] = { loading: true };
                } else {
                    resultMap[item.chartId] = { loading: false, data: { status: 'SUCCESS', costTimeMs: 0, columns: [], rows: [], sql: '', errorMessage: '' } };
                }
            }
            originalDslMap.current = dslMap;
            setResults(resultMap);
            await Promise.all(items.filter(needsExecute).map(async item => { await executeChart(item.chartId); }));
        } catch { message.error('加载看板失败'); }
        finally { setLoading(false); }
    }, [id, executeChart]);

    useEffect(() => { loadDashboard(); }, [loadDashboard]);

    const handleFilterChange = useCallback((chartId: string, values: string[]) => {
        setFilterValuesMap(prev => ({ ...prev, [chartId]: values }));
        const sourceItem = chartItems.find(c => c.chartId === chartId);
        const isSourceFilter = sourceItem ? isFilterChartType(sourceItem.chart.chartType) : false;
        // 查找受影响图表：
        // 1. 图表的 cascadeFrom 包含当前筛选器（正向配置）
        // 2. 当前筛选器的 cascadeFrom 包含该图表，且该图表不是筛选器（反向配置）
        const affected = chartItems.filter(item => {
            const forward = (item.cascadeFrom || []).includes(chartId);
            const reverse = isSourceFilter && !isFilterChartType(item.chart.chartType) && (sourceItem!.cascadeFrom || []).includes(item.chartId);
            return forward || reverse;
        });
        const affectedChartIds = affected.map(item => item.chartId);
        if (affectedChartIds.length === 0) return;
        const timer = setTimeout(() => {
            affectedChartIds.forEach(targetId => {
                const mergedDsl = buildMergedDsl(targetId);
                if (mergedDsl) executeChart(targetId, mergedDsl);
            });
        }, 300);
        return () => clearTimeout(timer);
    }, [chartItems, buildMergedDsl, executeChart]);

    const handleReset = () => {
        setFilterValuesMap({});
        chartItems.filter(item => !isFilterChartType(item.chart.chartType)).forEach(item => {
            const originalDsl = originalDslMap.current[item.chartId];
            if (originalDsl) executeChart(item.chartId, { ...originalDsl, filters: originalDsl.filters || [] });
        });
    };

    const handleRefresh = () => { setFilterValuesMap({}); loadDashboard(); };

    const dataChartItems = chartItems.filter(item => !isFilterChartType(item.chart.chartType));
    const gridLayout = dataChartItems.map(item => ({ i: item.chartId, x: item.x, y: item.y, w: item.w, h: item.h }));

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f0f2f5' }}>
            {/* 顶部工具栏 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: '#fff', borderBottom: '1px solid #e8e8e8', flexShrink: 0 }}>
                <Space>
                    <Button icon={<ArrowLeftOutlined />} size="small" onClick={() => navigate('/bi/dashboard')}>返回</Button>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{dashboard?.name || '看板详情'}</h2>
                </Space>
                <Space>
                    <DatePicker.RangePicker size="small" placeholder={['开始时间', '结束时间']} style={{ width: 240 }} />
                    <Button icon={<ReloadOutlined />} size="small" onClick={handleRefresh} loading={loading}>刷新</Button>
                    {id && <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/bi/dashboard/edit/${id}`)}>编辑</Button>}
                </Space>
            </div>

            {/* 筛选栏 */}
            <FilterBar chartItems={chartItems} filterValuesMap={filterValuesMap} onFilterChange={handleFilterChange} onReset={handleReset} />

            {/* 画布 */}
            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                {loading && dataChartItems.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}><Spin size="large" tip="加载中..." /></div>
                ) : dataChartItems.length === 0 ? (
                    <Empty description="该看板尚未添加数据图表" style={{ marginTop: 100 }} />
                ) : (
                    <GridLayout className="layout" layout={gridLayout} cols={12} rowHeight={ROW_HEIGHT} width={canvasWidth} margin={[12, 12]} isDraggable={false} isResizable={false}>
                        {dataChartItems.map(item => {
                            const result = results[item.chartId];
                            const chart = item.chart;
                            const data = result?.data;
                            const ref = dashboard?.chartRefs?.find(r => r.chartId === item.chartId);
                            return (
                                <div key={item.chartId}>
                                    <PanelCard title={chart.name} titleVisible={ref?.titleVisible !== false} bgColor={ref?.bgColor || undefined} borderStyle={ref?.borderStyle} extra={result?.loading ? undefined : data ? `${data.costTimeMs}ms` : undefined}>
                                        {result?.loading && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><Spin size="small" tip="加载中..." /></div>}
                                        {!result?.loading && data?.status === 'FAILED' && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><div style={{ color: '#cf1322', fontSize: 12, textAlign: 'center' }}><div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>{data.errorMessage || '加载失败'}</div></div>}
                                        {!result?.loading && data?.status === 'SUCCESS' && (
                                            <div style={{ width: '100%', height: '100%' }}>
                                                {chart.chartType === ChartType.NUMBER && chart.metrics?.length ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: 36, fontWeight: 600, color: '#4F6DF5' }}>{Number(data.rows[0]?.[chart.metrics[0].field] ?? 0).toLocaleString()}</div><div style={{ fontSize: 14, color: '#999', marginTop: 4 }}>{chart.metrics[0].alias || chart.metrics[0].field}</div></div></div>
                                                ) : chart.chartType === ChartType.TABLE ? (
                                                    (() => {
                                                        const aliasMap: Record<string, string> = {};
                                                        chart.dimensions?.forEach(d => { if (d.field) aliasMap[d.field] = d.alias || d.field; });
                                                        chart.metrics?.forEach(m => { if (m.field) aliasMap[m.field] = m.alias || m.field; });
                                                        return <div style={{ height: '100%', overflow: 'auto' }}><table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}><thead><tr>{data.columns.map(col => <th key={col} style={{ borderBottom: '1px solid #f0f0f0', padding: '4px 8px', textAlign: 'left', fontWeight: 500, background: '#fafafa' }}>{aliasMap[col] || col}</th>)}</tr></thead><tbody>{data.rows.map((row, idx) => <tr key={idx}>{data.columns.map(col => <td key={col} style={{ borderBottom: '1px solid #f0f0f0', padding: '4px 8px' }}>{String(row[col] ?? '')}</td>)}</tr>)}</tbody></table></div>;
                                                    })()
                                                ) : data.rows.length > 0 ? (
                                                    <EChartsChart chartType={chart.chartType} columns={data.columns} rows={data.rows} dimensions={chart.dimensions || []} metrics={chart.metrics || []} />
                                                ) : (
                                                    <Empty description="暂无数据" imageStyle={{ height: 40 }} />
                                                )}
                                            </div>
                                        )}
                                    </PanelCard>
                                </div>
                            );
                        })}
                    </GridLayout>
                )}
            </div>
        </div>
    );
};

export default DashboardViewer;
