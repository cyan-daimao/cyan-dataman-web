import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { ChartType, DimensionConfig, MetricConfig } from '@/api/DatabiApi';

interface EChartsChartProps {
    chartType: ChartType;
    columns: string[];
    rows: Record<string, unknown>[];
    dimensions: DimensionConfig[];
    metrics: MetricConfig[];
    style?: React.CSSProperties;
}

const CHART_COLORS = [
    '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
    '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#37A2DA',
];

const EChartsChart: React.FC<EChartsChartProps> = ({
    chartType,
    columns,
    rows,
    dimensions,
    metrics,
    style,
}) => {
    const option: EChartsOption = useMemo(() => {
        if (!rows || rows.length === 0) {
            return {
                title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#999' } },
            };
        }

        // 后端返回的数据列名可能是 alias（JOIN查询）或 field（单表查询/筛选框）
        // 优先用 alias 匹配，fallback 到 field
        const resolveColumnName = (field: string, alias?: string): string => {
            if (alias && columns.includes(alias)) return alias;
            if (columns.includes(field)) return field;
            return alias || field;
        };

        const dimFields = dimensions.map((d) => resolveColumnName(d.field, d.alias));
        const dimLabels = dimensions.map((d) => d.alias || d.field);
        const metricFields = metrics.map((m) => resolveColumnName(m.field, m.alias));
        const metricLabels = metrics.map((m) => m.alias || m.field);

        // 多维度支持：当维度数>1时，拼接所有维度值作为X轴标签
        const hasMultiDim = dimFields.length > 1;

        // 如果没有指定维度/指标，用 columns 推导
        const xField = dimFields[0] || columns[0];
        const xLabel = hasMultiDim ? dimLabels.join(' / ') : (dimLabels[0] || columns[0]);
        const yFields = metricFields.length > 0 ? metricFields : [columns[1] || columns[0]];
        const yLabels = metricLabels.length > 0 ? metricLabels : [columns[1] || columns[0]];

        // 生成X轴数据：单维度直接用字段值，多维度拼接所有维度值
        const xData = rows.map((r) => {
            if (hasMultiDim) {
                return dimFields.map(f => String(r[f] ?? '')).join(' - ');
            }
            return String(r[xField] ?? '');
        });

        if (chartType === ChartType.PIE) {
            const yField = yFields[0];
            const pieData = rows.map((r) => ({
                name: hasMultiDim
                    ? dimFields.map(f => String(r[f] ?? '')).join(' - ')
                    : String(r[xField] ?? ''),
                value: Number(r[yField] ?? 0),
            }));
            return {
                color: CHART_COLORS,
                tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
                legend: { type: 'scroll', bottom: 0, data: xData },
                series: [{
                    type: 'pie',
                    radius: ['40%', '70%'],
                    avoidLabelOverlap: false,
                    itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
                    label: { show: true, formatter: '{b}\n{c}' },
                    emphasis: {
                        label: { show: true, fontSize: 14, fontWeight: 'bold' },
                    },
                    data: pieData,
                }],
            };
        }

        if (chartType === ChartType.SCATTER) {
            const yField = yFields[0];
            const yLabel = yLabels[0];
            const scatterData = rows.map((r) => [
                Number(r[xField] ?? 0),
                Number(r[yField] ?? 0),
            ]);
            return {
                color: CHART_COLORS,
                tooltip: { trigger: 'item' },
                grid: { left: '10%', right: '10%', bottom: '15%', top: '15%', containLabel: true },
                xAxis: { type: 'value', name: xLabel, splitLine: { lineStyle: { type: 'dashed' } } },
                yAxis: { type: 'value', name: yLabel, splitLine: { lineStyle: { type: 'dashed' } } },
                series: [{
                    type: 'scatter',
                    symbolSize: 12,
                    data: scatterData,
                }],
            };
        }

        // BAR / LINE / AREA
        const isBar = chartType === ChartType.BAR;
        const isArea = chartType === ChartType.AREA;

        const series = yFields.map((yField, idx) => ({
            name: yLabels[idx] || yField,
            type: isBar ? 'bar' : 'line',
            stack: undefined as string | undefined,
            smooth: !isBar,
            areaStyle: isArea ? { opacity: 0.3 } : undefined,
            barMaxWidth: 40,
            data: rows.map((r) => Number(r[yField] ?? 0)),
            itemStyle: { color: CHART_COLORS[idx % CHART_COLORS.length] },
        }));

        return {
            color: CHART_COLORS,
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: isBar ? 'shadow' : 'line' },
            },
            legend: { type: 'scroll', bottom: 0, data: yLabels },
            grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
            xAxis: {
                type: 'category',
                data: xData,
                axisLabel: { interval: 0, rotate: xData.length > 10 ? 30 : 0 },
                axisTick: { alignWithLabel: true },
            },
            yAxis: { type: 'value' },
            series,
            dataZoom: xData.length > 20 ? [{ type: 'slider', start: 0, end: 50, bottom: 30 }] : undefined,
        };
    }, [chartType, columns, rows, dimensions, metrics]);

    return (
        <ReactECharts
            option={option}
            style={{ width: '100%', height: '100%', ...style }}
            opts={{ renderer: 'canvas' }}
            notMerge
        />
    );
};

export default EChartsChart;
