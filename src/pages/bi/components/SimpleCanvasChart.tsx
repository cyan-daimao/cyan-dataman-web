import React, { useEffect, useRef } from 'react';
import { ChartType, DimensionConfig, MetricConfig } from '@/api/DatabiApi';

const SimpleCanvasChart: React.FC<{
    chartType: ChartType;
    columns: string[];
    rows: Record<string, unknown>[];
    dimensions: DimensionConfig[];
    metrics: MetricConfig[];
}> = ({ chartType, columns, rows, dimensions, metrics }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || rows.length === 0) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);

        const dimFields = dimensions.map((d) => d.field);
        const metricFields = metrics.map((m) => m.field);
        const hasMultiDim = dimFields.length > 1;
        const labelKey = dimFields[0] || columns[0];
        const valueKey = metricFields[0] || columns[1] || columns[0];

        const labels = rows.map((r) => {
            if (hasMultiDim) {
                return dimFields.map(f => String(r[f] ?? '')).join(' - ');
            }
            return String(r[labelKey] ?? '');
        });
        const values = rows.map((r) => Number(r[valueKey] ?? 0));
        const maxVal = Math.max(...values, 1);

        const padding = 40;
        const chartW = width - padding * 2;
        const chartH = height - padding * 2;

        if (chartType === ChartType.BAR) {
            const barWidth = (chartW / values.length) * 0.6;
            const gap = (chartW / values.length) * 0.4;
            values.forEach((v, i) => {
                const h = (v / maxVal) * chartH;
                const x = padding + i * (barWidth + gap) + gap / 2;
                const y = padding + chartH - h;
                ctx.fillStyle = '#1890ff';
                ctx.fillRect(x, y, barWidth, h);
                ctx.fillStyle = '#333';
                ctx.font = '12px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(labels[i] || '', x + barWidth / 2, height - 10);
            });
        } else if (chartType === ChartType.LINE || chartType === ChartType.AREA) {
            const stepX = values.length > 1 ? chartW / (values.length - 1) : chartW;
            ctx.beginPath();
            values.forEach((v, i) => {
                const x = padding + i * stepX;
                const y = padding + chartH - (v / maxVal) * chartH;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.strokeStyle = '#1890ff';
            ctx.lineWidth = 2;
            ctx.stroke();
            if (chartType === ChartType.AREA) {
                const lastX = padding + (values.length - 1) * stepX;
                ctx.lineTo(lastX, padding + chartH);
                ctx.lineTo(padding, padding + chartH);
                ctx.closePath();
                ctx.fillStyle = 'rgba(24,144,255,0.2)';
                ctx.fill();
            }
            values.forEach((v, i) => {
                const x = padding + i * stepX;
                const y = padding + chartH - (v / maxVal) * chartH;
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fillStyle = '#1890ff';
                ctx.fill();
            });
        } else if (chartType === ChartType.PIE) {
            const total = values.reduce((a, b) => a + b, 0) || 1;
            let startAngle = 0;
            const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96'];
            values.forEach((v, i) => {
                const angle = (v / total) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(width / 2, height / 2);
                ctx.arc(width / 2, height / 2, Math.min(width, height) / 2 - padding, startAngle, startAngle + angle);
                ctx.closePath();
                ctx.fillStyle = colors[i % colors.length];
                ctx.fill();
                startAngle += angle;
            });
        } else if (chartType === ChartType.SCATTER) {
            const xKey = dimFields[0] || columns[0];
            const yKey = metricFields[0] || columns[1] || columns[0];
            const xVals = rows.map((r) => Number(r[xKey] ?? 0));
            const yVals = rows.map((r) => Number(r[yKey] ?? 0));
            const maxX = Math.max(...xVals, 1);
            const maxY = Math.max(...yVals, 1);
            rows.forEach(() => {
                // noop, loop below
            });
            rows.forEach((r) => {
                const x = padding + (Number(r[xKey] ?? 0) / maxX) * chartW;
                const y = padding + chartH - (Number(r[yKey] ?? 0) / maxY) * chartH;
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#1890ff';
                ctx.fill();
            });
        }
    }, [chartType, columns, rows, dimensions, metrics]);

    return <canvas ref={canvasRef} width={600} height={320} style={{ width: '100%', maxWidth: 600, height: 320 }} />;
};

export default SimpleCanvasChart;
