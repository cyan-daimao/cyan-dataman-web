import React from 'react';
import { Button,  Divider } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { DashboardChartItem, ChartType } from '@/api/DatabiApi';
import FilterChart from './FilterChart';

interface FilterBarProps {
    chartItems: DashboardChartItem[];
    filterValuesMap: Record<string, string[]>;
    onFilterChange: (chartId: string, values: string[]) => void;
    onReset: () => void;
}

const isFilterChartType = (chartType?: ChartType) => {
    return (
        chartType === ChartType.FILTER_SELECT ||
        chartType === ChartType.FILTER_MULTI ||
        chartType === ChartType.FILTER_DATE ||
        chartType === ChartType.FILTER_DATE_RANGE
    );
};

const FilterBar: React.FC<FilterBarProps> = ({
    chartItems,
    filterValuesMap,
    onFilterChange,
    onReset,
}) => {
    const filterItems = chartItems.filter((item) => isFilterChartType(item.chart.chartType));

    if (filterItems.length === 0) return null;

    const hasAnyValue = Object.values(filterValuesMap).some((v) => v.length > 0);

    return (
        <div
            style={{
                background: '#fafafa',
                borderBottom: '1px solid #e8e8e8',
                padding: '10px 16px',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#999', fontWeight: 500, flexShrink: 0 }}>
                    筛选条件
                </span>
                <Divider type="vertical" style={{ height: 20, margin: 0 }} />
                {filterItems.map((item) => (
                    <div
                        key={item.chartId}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            minWidth: 160,
                        }}
                    >
                        <span
                            style={{
                                fontSize: 12,
                                color: '#666',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                            }}
                        >
                            {item.chart.name}
                        </span>
                        <FilterChart
                            chart={item.chart}
                            onChange={(vals) => onFilterChange(item.chartId, vals)}
                            style={{ minWidth: 140 }}
                        />
                    </div>
                ))}
                {hasAnyValue && (
                    <>
                        <Divider type="vertical" style={{ height: 20, margin: 0 }} />
                        <Button
                            size="small"
                            icon={<ReloadOutlined />}
                            onClick={onReset}
                        >
                            重置
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
};

export default FilterBar;
