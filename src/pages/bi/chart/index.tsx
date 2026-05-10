import React, { useEffect, useState, useCallback } from 'react';
import {
    Button,
    Input,
    message,
    Card,
    Modal,
    Statistic,
    Empty,
    Tabs,
    Pagination,
    Spin,
    Select,
    DatePicker,
} from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
    chartApi,
    ChartDTO,
    ChartDataDTO,
    ChartType,
} from '@/api/DatabiApi';
import EChartsChart from '@/pages/bi/components/EChartsChart';
import ChartCard from './components/ChartCard';
import FilterCreator from './FilterCreator';

type TabKey = 'data' | 'filter';

const isFilterChart = (chartType?: ChartType) => {
    return (
        chartType === ChartType.FILTER_SELECT ||
        chartType === ChartType.FILTER_MULTI ||
        chartType === ChartType.FILTER_DATE ||
        chartType === ChartType.FILTER_DATE_RANGE
    );
};

/** 筛选框预览组件（图表列表中点击预览时使用） */
const FilterPreview: React.FC<{ chart?: ChartDTO; data?: ChartDataDTO }> = ({ chart, data }) => {
    if (!chart) return <Empty description="无图表数据" />;

    const dimField = chart.metricAnalysisCmd?.dimensions?.[0]?.dimCode || chart.dimensions?.[0]?.field || '';

    // 单选/多选：从 execute 结果中解析选项
    // 支持 displayValue 列作为显示标签（维度字段分离场景）
    const options = React.useMemo(() => {
        if (!data || data.status !== 'SUCCESS' || !dimField) return [];
        const hasDisplayValue = data.columns.includes('displayValue');
        return data.rows.map((row) => {
            const val = hasDisplayValue
                ? String(row['dimCode'] ?? row[dimField] ?? '')
                : String(row[dimField] ?? '');
            const label = hasDisplayValue
                ? String(row['displayValue'] ?? val)
                : val;
            return { value: val, label };
        }).filter((o) => o.value !== '');
    }, [data, dimField]);

    const commonStyle: React.CSSProperties = { width: '100%', maxWidth: 320 };

    switch (chart.chartType) {
        case ChartType.FILTER_SELECT:
            return (
                <div style={{ padding: 24 }}>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>{chart.name}</div>
                    <Select
                        style={commonStyle}
                        placeholder={`请选择${chart.name || ''}`}
                        allowClear
                        options={options.length > 0 ? options : [{ value: '', label: '暂无选项数据', disabled: true }]}
                    />
                </div>
            );
        case ChartType.FILTER_MULTI:
            return (
                <div style={{ padding: 24 }}>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>{chart.name}</div>
                    <Select
                        mode="multiple"
                        style={commonStyle}
                        placeholder={`请选择${chart.name || ''}`}
                        allowClear
                        options={options.length > 0 ? options : [{ value: '', label: '暂无选项数据', disabled: true }]}
                    />
                </div>
            );
        case ChartType.FILTER_DATE:
            return (
                <div style={{ padding: 24 }}>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>{chart.name}</div>
                    <DatePicker
                        style={commonStyle}
                        placeholder={`请选择${chart.name || ''}`}
                        allowClear
                    />
                </div>
            );
        case ChartType.FILTER_DATE_RANGE:
            return (
                <div style={{ padding: 24 }}>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>{chart.name}</div>
                    <DatePicker.RangePicker
                        style={commonStyle}
                        placeholder={['开始日期', '结束日期']}
                        allowClear
                    />
                </div>
            );
        default:
            return <Empty description={`不支持的筛选框类型: ${chart.chartType}`} />;
    }
};

const ChartList: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabKey>('data');
    const [data, setData] = useState<ChartDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchName, setSearchName] = useState('');
    const [pagination, setPagination] = useState({ current: 1, pageSize: 12, total: 0 });
    const [resultModal, setResultModal] = useState<{
        open: boolean;
        title: string;
        chart?: ChartDTO;
        data?: ChartDataDTO;
    }>({ open: false, title: '' });
    const [filterCreatorOpen, setFilterCreatorOpen] = useState(false);

    const fetchData = useCallback(
        async (current = 1, pageSize = 12, name?: string, tab: TabKey = 'data') => {
            setLoading(true);
            try {
                // 数据图表 Tab 过滤掉筛选框类型；筛选框 Tab 只展示筛选框类型
                // 由于后端 chartType 参数只支持单个类型，前端无法一次查出多种排除类型，
                // 这里利用 chartType 参数传入具体类型，但 API 目前只支持精确匹配。
                // 实际上，如果后端支持按 chartType 精确匹配，我们可以分别调用；
                // 为了兼容当前后端可能仅支持单类型过滤，我们先不带 chartType 参数查询全部，
                // 再由前端过滤（分页信息会不准确）。更好的做法是后端支持按 chartType 模糊或 IN 查询。
                // 鉴于当前后端契约写明支持 chartType 筛选，我们先直接调用 page，前端过滤兜底。
                const res = await chartApi.page({ current, size: pageSize, name });
                if (res.code === 200) {
                    let list = res.data.data;
                    if (tab === 'data') {
                        list = list.filter((c) => !isFilterChart(c.chartType));
                    } else if (tab === 'filter') {
                        list = list.filter((c) => isFilterChart(c.chartType));
                    }
                    setData(list);
                    setPagination({
                        current: res.data.current,
                        pageSize: res.data.size,
                        total: list.length,
                    });
                } else {
                    message.error(res.message || '获取图表列表失败');
                }
            } catch {
                message.error('获取图表列表失败');
            } finally {
                setLoading(false);
            }
        },
        []
    );

    useEffect(() => {
        fetchData(1, pagination.pageSize, searchName || undefined, activeTab);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const handleSearch = () => {
        fetchData(1, pagination.pageSize, searchName || undefined, activeTab);
    };

    const handleDelete = async (chart: ChartDTO) => {
        try {
            const res = await chartApi.delete(chart.id);
            if (res.code === 200) {
                message.success('删除成功');
                fetchData(pagination.current, pagination.pageSize, searchName || undefined, activeTab);
            } else {
                message.error(res.message || '删除失败');
            }
        } catch {
            message.error('删除失败');
        }
    };

    const handleExecute = async (chart: ChartDTO) => {
        try {
            const res = await chartApi.execute(chart.id);
            if (res.code === 200) {
                setResultModal({
                    open: true,
                    title: `执行结果 - ${chart.name}`,
                    chart,
                    data: res.data,
                });
            } else {
                message.error(res.message || '执行失败');
            }
        } catch {
            message.error('执行失败');
        }
    };

    const handleEdit = (chart: ChartDTO) => {
        if (isFilterChart(chart.chartType)) {
            message.info('筛选框暂不支持编辑，请删除后重新创建');
            return;
        }
        navigate(`/bi/chart/analyzer/${chart.id}`);
    };

    const handlePageChange = (page: number, pageSize?: number) => {
        fetchData(page, pageSize || pagination.pageSize, searchName || undefined, activeTab);
    };

    const handleFilterCreatorSuccess = () => {
        setFilterCreatorOpen(false);
        if (activeTab === 'filter') {
            fetchData(1, pagination.pageSize, searchName || undefined, 'filter');
        } else {
            // 如果当前在数据图表 Tab，切换到筛选框 Tab 以展示新创建的筛选框
            setActiveTab('filter');
        }
    };

    const resultColumns = resultModal.data?.columns.map((col) => ({
        title: col,
        dataIndex: col,
        key: col,
    })) || [];

    const tabItems = [
        { key: 'data' as TabKey, label: '数据图表' },
        { key: 'filter' as TabKey, label: '筛选框' },
    ];

    return (
        <Card
            title="图表管理"
            extra={
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                        if (activeTab === 'data') {
                            navigate('/bi/chart/analyzer');
                        } else {
                            setFilterCreatorOpen(true);
                        }
                    }}
                >
                    {activeTab === 'data' ? '新建图表' : '新建筛选框'}
                </Button>
            }
        >
            {/* Tab + 搜索 */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                    flexWrap: 'wrap',
                    gap: 12,
                }}
            >
                <Tabs
                    activeKey={activeTab}
                    onChange={(k) => {
                        setActiveTab(k as TabKey);
                        setPagination((p) => ({ ...p, current: 1 }));
                    }}
                    items={tabItems}
                />
                <Input
                    placeholder="按名称搜索"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    onPressEnter={handleSearch}
                    style={{ width: 240 }}
                    prefix={<SearchOutlined />}
                    allowClear
                />
            </div>

            {/* 卡片列表 */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                    <Spin size="large" />
                </div>
            ) : data.length === 0 ? (
                <Empty description={activeTab === 'data' ? '暂无数据图表' : '暂无筛选框'} style={{ marginTop: 40 }} />
            ) : (
                <>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                            gap: 16,
                        }}
                    >
                        {data.map((chart) => (
                            <ChartCard
                                key={chart.id}
                                chart={chart}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onExecute={handleExecute}
                            />
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
                        <Pagination
                            current={pagination.current}
                            pageSize={pagination.pageSize}
                            total={pagination.total}
                            showSizeChanger
                            showTotal={(total) => `共 ${total} 条`}
                            onChange={handlePageChange}
                        />
                    </div>
                </>
            )}

            {/* 执行结果弹窗 */}
            <Modal
                open={resultModal.open}
                title={resultModal.title}
                width={900}
                onCancel={() => setResultModal({ open: false, title: '' })}
                footer={null}
            >
                {resultModal.data?.status === 'FAILED' ? (
                    <div
                        style={{
                            color: '#cf1322',
                            padding: 16,
                            background: '#fff1f0',
                            borderRadius: 4,
                        }}
                    >
                        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>执行失败</div>
                        <div>{resultModal.data.errorMessage || '未知错误'}</div>
                    </div>
                ) : (
                    <div>
                        {isFilterChart(resultModal.chart?.chartType) ? (
                            /* 筛选框预览：渲染对应的 AntD 组件 */
                            <FilterPreview chart={resultModal.chart} data={resultModal.data} />
                        ) : (
                            <>
                                {resultModal.chart?.chartType === ChartType.NUMBER &&
                                    resultModal.chart?.metrics &&
                                    resultModal.chart.metrics.length > 0 && (
                                        <div style={{ textAlign: 'center', padding: 24 }}>
                                            <Statistic
                                                title={
                                                    resultModal.chart.metrics[0].alias ||
                                                    resultModal.chart.metrics[0].field
                                                }
                                                value={Number(
                                                    resultModal.data?.rows?.[0]?.[
                                                        resultModal.chart.metrics[0].field
                                                    ] ?? 0
                                                )}
                                            />
                                        </div>
                                    )}
                                {resultModal.chart?.chartType !== ChartType.NUMBER &&
                                    resultModal.chart?.chartType !== ChartType.TABLE &&
                                    (resultModal.data?.rows?.length || 0) > 0 && (
                                        <EChartsChart
                                            chartType={resultModal.chart?.chartType || ChartType.TABLE}
                                            columns={resultModal.data?.columns || []}
                                            rows={resultModal.data?.rows || []}
                                            dimensions={resultModal.chart?.dimensions || []}
                                            metrics={resultModal.chart?.metrics || []}
                                        />
                                    )}
                                {(resultModal.chart?.chartType === ChartType.TABLE ||
                                    (resultModal.data?.rows?.length || 0) === 0) && (
                                    <table
                                        style={{
                                            width: '100%',
                                            fontSize: 13,
                                            borderCollapse: 'collapse',
                                        }}
                                    >
                                        <thead>
                                            <tr>
                                                {resultColumns.map((col) => (
                                                    <th
                                                        key={col.key}
                                                        style={{
                                                            borderBottom: '1px solid #f0f0f0',
                                                            padding: '8px 12px',
                                                            textAlign: 'left',
                                                            fontWeight: 500,
                                                            background: '#fafafa',
                                                        }}
                                                    >
                                                        {col.title}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(resultModal.data?.rows || []).map((row, idx) => (
                                                <tr key={idx}>
                                                    {resultColumns.map((col) => (
                                                        <td
                                                            key={col.key}
                                                            style={{
                                                                borderBottom: '1px solid #f0f0f0',
                                                                padding: '8px 12px',
                                                            }}
                                                        >
                                                            {String(row[col.dataIndex] ?? '')}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </>
                        )}
                        <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                            耗时: {resultModal.data?.costTimeMs}ms | 返回{' '}
                            {resultModal.data?.rows?.length || 0} 行
                        </div>
                    </div>
                )}
            </Modal>

            {/* 筛选框创建弹窗 */}
            <FilterCreator
                open={filterCreatorOpen}
                onCancel={() => setFilterCreatorOpen(false)}
                onSuccess={handleFilterCreatorSuccess}
            />
        </Card>
    );
};

export default ChartList;
