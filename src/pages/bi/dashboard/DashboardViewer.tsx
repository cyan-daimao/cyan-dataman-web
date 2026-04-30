import React, { useEffect, useState } from 'react';
import {
    Button,
    Card,
    Space,
    message,
    Table,
    Statistic,
    Spin,
    Empty,
} from 'antd';
import {
    ArrowLeftOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import {
    dashboardApi,
    chartApi,
    DashboardDTO,
    ChartDTO,
    ChartDataDTO,
    ChartType,
} from '@/api/DatabiApi';
import SimpleCanvasChart from '@/pages/bi/components/SimpleCanvasChart';

interface ChartResult {
    chart: ChartDTO;
    data?: ChartDataDTO;
    loading: boolean;
}

const DashboardViewer: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [dashboard, setDashboard] = useState<DashboardDTO | null>(null);
    const [charts, setCharts] = useState<Record<string, ChartDTO>>({});
    const [results, setResults] = useState<Record<string, ChartResult>>({});
    const [loading, setLoading] = useState(false);

    const loadDashboard = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await dashboardApi.getById(id);
            if (res.code === 200) {
                setDashboard(res.data);
                const refs = res.data.chartRefs || [];
                // 预加载图表元数据
                const chartMap: Record<string, ChartDTO> = {};
                const resultMap: Record<string, ChartResult> = {};
                await Promise.all(
                    refs.map(async (ref) => {
                        try {
                            const cRes = await chartApi.getById(ref.chartId);
                            if (cRes.code === 200) {
                                chartMap[ref.chartId] = cRes.data;
                                resultMap[ref.chartId] = { chart: cRes.data, loading: true };
                            }
                        } catch {
                            // ignore
                        }
                    })
                );
                setCharts(chartMap);
                setResults(resultMap);
                // 并行执行所有图表
                await Promise.all(
                    refs.map(async (ref) => {
                        if (!chartMap[ref.chartId]) return;
                        try {
                            const eRes = await chartApi.execute(ref.chartId);
                            if (eRes.code === 200) {
                                resultMap[ref.chartId] = {
                                    chart: chartMap[ref.chartId],
                                    data: eRes.data,
                                    loading: false,
                                };
                            } else {
                                resultMap[ref.chartId] = {
                                    chart: chartMap[ref.chartId],
                                    data: { status: 'FAILED', costTimeMs: 0, columns: [], rows: [], sql: '', errorMessage: eRes.message },
                                    loading: false,
                                };
                            }
                        } catch (e: unknown) {
                            const msg = e instanceof Error ? e.message : '执行失败';
                            resultMap[ref.chartId] = {
                                chart: chartMap[ref.chartId],
                                data: { status: 'FAILED', costTimeMs: 0, columns: [], rows: [], sql: '', errorMessage: msg },
                                loading: false,
                            };
                        }
                    })
                );
                setResults({ ...resultMap });
            } else {
                message.error(res.message || '加载看板失败');
            }
        } catch (e) {
            message.error('加载看板失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, [id]);

    const handleRefresh = () => {
        loadDashboard();
    };

    const chartRefs = dashboard?.chartRefs || [];

    return (
        <div style={{ height: '100%', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>{dashboard?.name || '看板详情'}</h2>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
                        刷新
                    </Button>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/bi/dashboard')}>
                        返回
                    </Button>
                </Space>
            </div>

            {loading && chartRefs.length === 0 && (
                <div style={{ textAlign: 'center', padding: 60 }}>
                    <Spin tip="加载中..." />
                </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
                {chartRefs.map((ref) => {
                    const result = results[ref.chartId];
                    const chart = result?.chart;
                    const data = result?.data;
                    const widthPct = `${(ref.w / 24) * 100}%`;

                    return (
                        <div
                            key={ref.chartId}
                            style={{
                                width: widthPct,
                                height: ref.h,
                                padding: 8,
                                boxSizing: 'border-box',
                            }}
                        >
                            <Card
                                size="small"
                                title={chart?.name || ref.chartId}
                                style={{ height: '100%', overflow: 'auto' }}
                                extra={
                                    result?.loading ? (
                                        <Spin size="small" />
                                    ) : (
                                        <span style={{ fontSize: 12, color: '#999' }}>
                                            {data ? `${data.costTimeMs}ms` : ''}
                                        </span>
                                    )
                                }
                            >
                                {result?.loading && <Spin size="small" tip="加载中..." />}
                                {!result?.loading && data?.status === 'FAILED' && (
                                    <div style={{ color: '#cf1322', fontSize: 12 }}>
                                        {data.errorMessage || '加载失败'}
                                    </div>
                                )}
                                {!result?.loading && data?.status === 'SUCCESS' && (
                                    <div>
                                        {chart?.chartType === ChartType.NUMBER && chart?.metrics && chart.metrics.length > 0 && (
                                            <Statistic
                                                title={chart.metrics[0].alias || chart.metrics[0].field}
                                                value={Number(data.rows[0]?.[chart.metrics[0].field] ?? 0)}
                                            />
                                        )}
                                        {chart?.chartType !== ChartType.NUMBER && chart?.chartType !== ChartType.TABLE && data.rows.length > 0 && (
                                            <SimpleCanvasChart
                                                chartType={chart.chartType}
                                                columns={data.columns}
                                                rows={data.rows}
                                                dimensions={chart.dimensions || []}
                                                metrics={chart.metrics || []}
                                            />
                                        )}
                                        {(chart?.chartType === ChartType.TABLE || !chart?.chartType || data.rows.length === 0) && (
                                            <Table
                                                size="small"
                                                scroll={{ x: 'max-content' }}
                                                dataSource={data.rows}
                                                columns={data.columns.map((col) => ({ title: col, dataIndex: col, key: col }))}
                                                pagination={{ pageSize: 10 }}
                                            />
                                        )}
                                    </div>
                                )}
                                {!result && !result?.loading && <Empty description="无数据" imageStyle={{ height: 40 }} />}
                            </Card>
                        </div>
                    );
                })}
            </div>

            {chartRefs.length === 0 && !loading && (
                <Empty description="该看板尚未添加图表" />
            )}
        </div>
    );
};

export default DashboardViewer;
