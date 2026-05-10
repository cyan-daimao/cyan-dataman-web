import React, { useEffect, useState } from 'react';
import { Select, DatePicker, Spin, Empty } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { chartApi, ChartDTO, ChartDataDTO, ChartType } from '@/api/DatabiApi';

interface FilterChartProps {
    chart: ChartDTO;
    onChange?: (values: string[]) => void;
    style?: React.CSSProperties;
    data?: ChartDataDTO; // 可选：外部传入的执行结果（用于首次加载统一 execute 场景）
}

/** 是否为日期类筛选框 */
const isDateFilter = (chartType?: ChartType) =>
    chartType === ChartType.FILTER_DATE || chartType === ChartType.FILTER_DATE_RANGE;

const FilterChart: React.FC<FilterChartProps> = ({ chart, onChange, style, data: externalData }) => {
    const [loading, setLoading] = useState(false);
    const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
    const [selectedValues, setSelectedValues] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    // 获取筛选框的维度字段名
    const dimField = chart.metricAnalysisCmd?.dimensions?.[0]?.dimCode
        || chart.dimensions?.[0]?.field
        || '';

    const dateFilter = isDateFilter(chart.chartType);

    // 外部传入 data 时直接解析选项（仅单选/多选需要）
    // 支持 displayValue 列作为显示标签，dimCode 列作为实际值
    useEffect(() => {
        if (!externalData || dateFilter) return;
        if (externalData.status !== 'SUCCESS') {
            setError(externalData.errorMessage || '获取选项失败');
            return;
        }
        const hasDisplayValue = externalData.columns.includes('displayValue');
        const opts = externalData.rows.map((row) => {
            const val = hasDisplayValue
                ? String(row['dimCode'] ?? row[dimField] ?? '')
                : String(row[dimField] ?? '');
            const label = hasDisplayValue
                ? String(row['displayValue'] ?? val)
                : val;
            return { value: val, label };
        }).filter((o) => o.value !== '');
        setOptions(opts);
        setError(null);
    }, [externalData, dimField, dateFilter]);

    // 无外部 data 时自主 execute 获取选项（仅单选/多选需要）
    useEffect(() => {
        if (externalData || !chart.id || dateFilter) return;
        setLoading(true);
        setError(null);
        chartApi
            .execute(chart.id)
            .then((res) => {
                if (res.code === 200) {
                    const data: ChartDataDTO = res.data;
                    if (data.status !== 'SUCCESS') {
                        setError(data.errorMessage || '获取选项失败');
                        return;
                    }
                    // 选项数据：execute 返回的 rows
                    // 支持 displayValue 列作为显示标签（维度字段分离场景）
                    const hasDisplayValue = data.columns.includes('displayValue');
                    const opts = data.rows.map((row) => {
                        const val = hasDisplayValue
                            ? String(row['dimCode'] ?? row[dimField] ?? '')
                            : String(row[dimField] ?? '');
                        const label = hasDisplayValue
                            ? String(row['displayValue'] ?? val)
                            : val;
                        return { value: val, label };
                    }).filter((o) => o.value !== '');
                    setOptions(opts);
                } else {
                    setError(res.message || '获取选项失败');
                }
            })
            .catch((e: unknown) => {
                const msg = e instanceof Error ? e.message : '获取选项失败';
                setError(msg);
            })
            .finally(() => setLoading(false));
    }, [chart.id, dimField, externalData, dateFilter]);

    const handleChange = (vals: string[]) => {
        setSelectedValues(vals);
        onChange?.(vals);
    };

    const handleDateChange = (date: Dayjs | null) => {
        const vals = date ? [date.format('YYYY-MM-DD')] : [];
        setSelectedValues(vals);
        onChange?.(vals);
    };

    const handleRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
        const vals = dates && dates[0] && dates[1]
            ? [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')]
            : [];
        setSelectedValues(vals);
        onChange?.(vals);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', ...style }}>
                <Spin size="small" />
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ color: '#cf1322', fontSize: 12, padding: 8, ...style }}>
                {error}
            </div>
        );
    }

    // 单选/多选必须配置维度字段，日期类不需要
    if (!dimField && !dateFilter) {
        return (
            <div style={{ padding: 8, ...style }}>
                <Empty description="维度配置缺失" imageStyle={{ height: 40 }} />
            </div>
        );
    }

    const commonSelectStyle: React.CSSProperties = { width: '100%' };

    switch (chart.chartType) {
        case ChartType.FILTER_SELECT:
            return (
                <Select
                    style={{ ...commonSelectStyle, ...style }}
                    placeholder={`请选择${chart.name || ''}`}
                    allowClear
                    options={options}
                    value={selectedValues[0] || undefined}
                    onChange={(val) => handleChange(val ? [val] : [])}
                />
            );
        case ChartType.FILTER_MULTI:
            return (
                <Select
                    mode="multiple"
                    style={{ ...commonSelectStyle, ...style }}
                    placeholder={`请选择${chart.name || ''}`}
                    allowClear
                    options={options}
                    value={selectedValues}
                    onChange={handleChange}
                />
            );
        case ChartType.FILTER_DATE:
            return (
                <DatePicker
                    style={{ ...commonSelectStyle, ...style }}
                    placeholder={`请选择日期${chart.name || ''}`}
                    allowClear
                    value={selectedValues[0] ? dayjs(selectedValues[0]) : null}
                    onChange={handleDateChange}
                />
            );
        case ChartType.FILTER_DATE_RANGE:
            return (
                <DatePicker.RangePicker
                    style={{ ...commonSelectStyle, ...style }}
                    placeholder={['开始日期', '结束日期']}
                    allowClear
                    value={
                        selectedValues.length >= 2
                            ? [dayjs(selectedValues[0]), dayjs(selectedValues[1])]
                            : [null, null]
                    }
                    onChange={handleRangeChange}
                />
            );
        default:
            return (
                <div style={{ padding: 8, color: '#999', fontSize: 12, ...style }}>
                    不支持的筛选框类型: {chart.chartType}
                </div>
            );
    }
};

export default FilterChart;
