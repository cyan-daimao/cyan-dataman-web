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
}) => {
    const option: EChartsOption = useMemo(() => {
        if (!rows || rows.length === 0) {
            return {
                title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#999' } },
            };
        }

        const dimFields = dimensions.map((d) => d.alias || d.field);
        const metricFields = metrics.map((m) => m.alias || m.field);

        // 如果没有指定维度/指标，用 columns 推导
        const xField = dimFields[0] || columns[0];
        const yFields = metricFields.length > 0 ? metricFields : [columns[1] || columns[0]];

        const xData = rows.map((r) => String(r[xField] ?? ''));

        if (chartType === ChartType.PIE) {
            const yField = yFields[0];
            const pieData = rows.map((r) => ({
                name: String(r[xField] ?? ''),
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
            const scatterData = rows.map((r) => [
                Number(r[xField] ?? 0),
                Number(r[yField] ?? 0),
            ]);
            return {
                color: CHART_COLORS,
                tooltip: { trigger: 'item' },
                grid: { left: '10%', right: '10%', bottom: '15%', top: '15%', containLabel: true },
                xAxis: { type: 'value', name: xField, splitLine: { lineStyle: { type: 'dashed' } } },
                yAxis: { type: 'value', name: yField, splitLine: { lineStyle: { type: 'dashed' } } },
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
            name: yField,
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
            legend: { type: 'scroll', bottom: 0, data: yFields },
            grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
            xAxis: {
                type: 'category',
                data: xData,
                axisLabel: { interval: 0, rotate: xData.length > 10 ? 30 : 0, overflow: 'truncate', width: 80 },
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
            style={{ width: '100%', height: 420 }}
            opts={{ renderer: 'canvas' }}
            notMerge
        />
    );
};

export default EChartsChart;
