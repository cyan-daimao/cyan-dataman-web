import React, { useState, useMemo } from 'react';
import { Input, Tabs, Empty, Button } from 'antd';
import {
    SearchOutlined,
    BarChartOutlined,
    FilterOutlined,
    TableOutlined,
    LineChartOutlined,
    PieChartOutlined,
    NumberOutlined,
    PlusOutlined,
} from '@ant-design/icons';
import { ChartDTO, ChartType } from '@/api/DatabiApi';
import FilterCreator from '@/pages/bi/chart/FilterCreator';

interface ChartLibraryProps {
    charts: ChartDTO[];
    onAddChart: (chartId: string) => void;
    existingChartIds: string[];
    onRefreshCharts?: () => void;
}

type TabKey = 'all' | 'data' | 'filter';

const CHART_TYPE_ICONS: Record<string, React.ReactNode> = {
    [ChartType.BAR]: <BarChartOutlined />,
    [ChartType.LINE]: <LineChartOutlined />,
    [ChartType.PIE]: <PieChartOutlined />,
    [ChartType.TABLE]: <TableOutlined />,
    [ChartType.NUMBER]: <NumberOutlined />,
    [ChartType.AREA]: <LineChartOutlined />,
    [ChartType.SCATTER]: <BarChartOutlined />,
    [ChartType.FILTER_SELECT]: <FilterOutlined />,
    [ChartType.FILTER_MULTI]: <FilterOutlined />,
    [ChartType.FILTER_DATE]: <FilterOutlined />,
    [ChartType.FILTER_DATE_RANGE]: <FilterOutlined />,
};

const CHART_TYPE_LABELS: Record<string, string> = {
    [ChartType.BAR]: '柱状图',
    [ChartType.LINE]: '折线图',
    [ChartType.PIE]: '饼图',
    [ChartType.TABLE]: '表格',
    [ChartType.NUMBER]: '指标卡',
    [ChartType.AREA]: '面积图',
    [ChartType.SCATTER]: '散点图',
    [ChartType.FILTER_SELECT]: '单选筛选',
    [ChartType.FILTER_MULTI]: '多选筛选',
    [ChartType.FILTER_DATE]: '日期筛选',
    [ChartType.FILTER_DATE_RANGE]: '日期范围',
};

const isFilterChart = (chartType?: ChartType) => {
    return (
        chartType === ChartType.FILTER_SELECT ||
        chartType === ChartType.FILTER_MULTI ||
        chartType === ChartType.FILTER_DATE ||
        chartType === ChartType.FILTER_DATE_RANGE
    );
};

const ChartLibrary: React.FC<ChartLibraryProps> = ({ charts, onAddChart, existingChartIds, onRefreshCharts }) => {
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<TabKey>('all');
    const [filterCreatorOpen, setFilterCreatorOpen] = useState(false);

    const filteredCharts = useMemo(() => {
        let list = charts;
        if (activeTab === 'data') {
            list = charts.filter((c) => !isFilterChart(c.chartType));
        } else if (activeTab === 'filter') {
            list = charts.filter((c) => isFilterChart(c.chartType));
        }
        if (search.trim()) {
            const kw = search.trim().toLowerCase();
            list = list.filter((c) => c.name.toLowerCase().includes(kw));
        }
        return list;
    }, [charts, activeTab, search]);

    const filterCount = charts.filter((c) => isFilterChart(c.chartType)).length;
    const dataCount = charts.length - filterCount;

    const handleFilterCreatorSuccess = () => {
        setFilterCreatorOpen(false);
        onRefreshCharts?.();
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* 搜索 */}
            <div style={{ padding: '12px 12px 8px' }}>
                <Input
                    size="small"
                    placeholder="搜索图表..."
                    prefix={<SearchOutlined style={{ color: '#999' }} />}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    allowClear
                />
            </div>

            {/* Tab */}
            <Tabs
                size="small"
                activeKey={activeTab}
                onChange={(k) => setActiveTab(k as TabKey)}
                style={{ padding: '0 12px' }}
                items={[
                    { key: 'all', label: `全部 (${charts.length})` },
                    { key: 'data', label: `图表 (${dataCount})` },
                    { key: 'filter', label: `筛选框 (${filterCount})` },
                ]}
            />

            {/* 列表 */}
            <div style={{ flex: 1, overflow: 'auto', padding: '0 12px 12px' }}>
                {filteredCharts.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无匹配图表" style={{ marginTop: 40 }} />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {filteredCharts.map((chart) => {
                            const isAdded = existingChartIds.includes(chart.id);
                            const isFilter = isFilterChart(chart.chartType);
                            return (
                                <div
                                    key={chart.id}
                                    onClick={() => !isAdded && onAddChart(chart.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '10px 12px',
                                        borderRadius: 6,
                                        border: '1px solid #e8e8e8',
                                        background: isAdded ? '#f5f5f5' : '#fff',
                                        cursor: isAdded ? 'not-allowed' : 'pointer',
                                        opacity: isAdded ? 0.6 : 1,
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isAdded) {
                                            e.currentTarget.style.borderColor = '#4F6DF5';
                                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(79,109,245,0.15)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = '#e8e8e8';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: 6,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: isFilter ? '#f0f5ff' : '#f6ffed',
                                            color: isFilter ? '#4F6DF5' : '#52c41a',
                                            fontSize: 16,
                                            flexShrink: 0,
                                        }}
                                    >
                                        {CHART_TYPE_ICONS[chart.chartType] || <BarChartOutlined />}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            style={{
                                                fontSize: 13,
                                                fontWeight: 500,
                                                color: '#333',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        >
                                            {chart.name}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                                            {CHART_TYPE_LABELS[chart.chartType] || chart.chartType}
                                            {isAdded && <span style={{ color: '#999', marginLeft: 8 }}>已添加</span>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 筛选框 Tab 底部快捷创建 */}
            {activeTab === 'filter' && (
                <div style={{ padding: '8px 12px', borderTop: '1px solid #f0f0f0' }}>
                    <Button
                        type="dashed"
                        block
                        icon={<PlusOutlined />}
                        onClick={() => setFilterCreatorOpen(true)}
                    >
                        新建筛选框
                    </Button>
                </div>
            )}

            <FilterCreator
                open={filterCreatorOpen}
                onCancel={() => setFilterCreatorOpen(false)}
                onSuccess={handleFilterCreatorSuccess}
            />
        </div>
    );
};

export default ChartLibrary;
