import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Empty, Spin, message } from 'antd';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { EChartsType } from 'echarts/core';
import {
    metricAssociationApi,
    MetricAssociationGraphEdge,
    MetricAssociationGraphNode,
    MetricAssociationGraphResult,
} from '@/api/MetricBiApi';

interface MetricAssociationGraphProps {
    metricCode: string;
}

const CENTER_COLOR = '#f5222d';
const METRIC_COLOR = '#1890ff';
const DIMENSION_COLOR = '#52c41a';
const EDGE_COLOR: Record<string, string> = {
    SAME_FACT: '#1890ff',
    JOIN: '#52c41a',
    BUILTIN_TIME: '#722ed1',
    SOURCE_TABLE: '#13c2c2',
    LOCAL_EXPRESSION: '#faad14',
};

const MetricAssociationGraph: React.FC<MetricAssociationGraphProps> = ({ metricCode }) => {
    const [data, setData] = useState<MetricAssociationGraphResult | null>(null);
    const [loading, setLoading] = useState(false);
    const chartInstanceRef = useRef<EChartsType | null>(null);

    useEffect(() => {
        if (!metricCode) return;
        setLoading(true);
        metricAssociationApi.graph(metricCode)
            .then((res) => {
                if (res.code === 200 && res.data) {
                    setData(res.data);
                } else {
                    message.error(res.message || '加载可关联图谱失败');
                }
            })
            .catch(() => message.error('加载可关联图谱失败'))
            .finally(() => setLoading(false));
    }, [metricCode]);

    const onEvents = useMemo(() => ({
        dragend: (params: { dataIndex?: number }) => {
            if (chartInstanceRef.current && params.dataIndex != null) {
                chartInstanceRef.current.setOption({
                    series: [{
                        data: {
                            [params.dataIndex]: {
                                fixed: true,
                            },
                        },
                    }],
                });
            }
        },
    }), []);

    const onChartReady = useCallback((instance: EChartsType) => {
        chartInstanceRef.current = instance;
    }, []);

    const option: EChartsOption | null = useMemo(() => {
        if (!data) return null;
        const centerId = data.center?.id;
        const nodes = data.nodes.map((node: MetricAssociationGraphNode) => ({
            id: node.id,
            name: node.name,
            code: node.code,
            nodeType: node.nodeType,
            metricType: node.metricType,
            tableRef: node.tableRef,
            symbolSize: node.id === centerId ? 72 : node.nodeType === 'METRIC' ? 54 : 48,
            itemStyle: {
                color: node.id === centerId ? CENTER_COLOR : node.nodeType === 'METRIC' ? METRIC_COLOR : DIMENSION_COLOR,
                shadowBlur: node.id === centerId ? 20 : 0,
                shadowColor: node.id === centerId ? 'rgba(245, 34, 45, 0.4)' : undefined,
            },
            label: {
                show: true,
                fontSize: node.id === centerId ? 13 : 12,
                fontWeight: node.id === centerId ? 'bold' : 'normal',
                color: '#333',
                formatter: `${node.name}\n${node.code}`,
            },
        }));
        const links = data.edges.map((edge: MetricAssociationGraphEdge) => {
            const color = EDGE_COLOR[edge.relationType] || '#8c8c8c';
            return {
                ...edge,
                lineStyle: {
                    color,
                    width: 2,
                    curveness: 0.16,
                },
                label: {
                    show: true,
                    formatter: edge.joinType || edge.relationType,
                    fontSize: 10,
                    color,
                    backgroundColor: '#fff',
                    borderColor: color,
                    borderWidth: 1,
                    borderRadius: 4,
                    padding: [2, 6],
                },
            };
        });
        return {
            backgroundColor: '#fafafa',
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(255,255,255,0.95)',
                borderColor: '#e8e8e8',
                borderWidth: 1,
                textStyle: { color: '#333' },
                formatter: (params: { dataType?: string; data?: Record<string, string> }) => {
                    const item = params.data || {};
                    if (params.dataType === 'edge') {
                        return `<div style="font-weight:bold;margin-bottom:4px;">${item.relationType || '-'}</div>
                                <div>来源表：${item.sourceTable || '-'}</div>
                                <div>目标表：${item.targetTable || '-'}</div>
                                <div>关联字段：<code>${item.sourceColumn || '-'}</code> = <code>${item.targetColumn || '-'}</code></div>
                                <div>JOIN 类型：${item.joinType || '-'}</div>
                                ${item.description ? `<div style="margin-top:4px;color:#666;">${item.description}</div>` : ''}`;
                    }
                    return `<div style="font-weight:bold;">${item.name || '-'}</div>
                            <div style="color:#666;font-size:12px;">${item.code || '-'}</div>
                            <div>类型：${item.nodeType || '-'}</div>
                            <div>表：${item.tableRef || '-'}</div>`;
                },
            },
            animationDuration: 1200,
            animationEasingUpdate: 'quinticInOut',
            series: [
                {
                    type: 'graph',
                    layout: 'force',
                    data: nodes,
                    links,
                    roam: true,
                    draggable: true,
                    label: {
                        show: true,
                        position: 'bottom',
                        distance: 8,
                    },
                    emphasis: {
                        focus: 'adjacency',
                        lineStyle: {
                            width: 4,
                        },
                    },
                    force: {
                        repulsion: 420,
                        edgeLength: [120, 220],
                        gravity: 0.1,
                        layoutAnimation: true,
                    },
                    edgeSymbol: ['none', 'arrow'],
                    edgeSymbolSize: [0, 10],
                    lineStyle: {
                        opacity: 0.85,
                    },
                },
            ],
        };
    }, [data]);

    if (loading) {
        return <div style={{ textAlign: 'center', padding: 48 }}><Spin tip="加载图谱中..." /></div>;
    }

    if (!data || data.nodes.length <= 1) {
        return <Empty description="暂无可关联图谱" />;
    }

    return (
        <div style={{ width: '100%', height: 'calc(100vh - 260px)', minHeight: 560, background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0', position: 'relative' }}>
            <div style={{
                position: 'absolute',
                top: 12,
                left: 12,
                zIndex: 10,
                background: 'rgba(255,255,255,0.9)',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #e8e8e8',
                fontSize: 12,
                lineHeight: '22px',
            }}>
                <div><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: CENTER_COLOR, marginRight: 6, verticalAlign: 'middle' }} /> 当前指标</div>
                <div><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: METRIC_COLOR, marginRight: 6, verticalAlign: 'middle' }} /> 可关联指标</div>
                <div><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: DIMENSION_COLOR, marginRight: 6, verticalAlign: 'middle' }} /> 可关联维度</div>
                <div><span style={{ display: 'inline-block', width: 20, height: 2, background: EDGE_COLOR.JOIN, marginRight: 6, verticalAlign: 'middle' }} /> JOIN / 同表 / 内置维度</div>
            </div>
            {option && (
                <ReactECharts
                    option={option}
                    style={{ width: '100%', height: '100%' }}
                    opts={{ renderer: 'canvas' }}
                    onChartReady={onChartReady}
                    onEvents={onEvents}
                />
            )}
        </div>
    );
};

export default MetricAssociationGraph;
