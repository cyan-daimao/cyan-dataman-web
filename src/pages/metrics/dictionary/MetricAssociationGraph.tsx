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

interface GraphNode extends MetricAssociationGraphNode {
    x: number;
    y: number;
    symbolSize: number | [number, number];
    virtualType?: 'TIME_GROUP';
    dimCount?: number;
    metricCount?: number;
    relationSource?: string;
    columnPair?: string;
}

interface GraphLink extends MetricAssociationGraphEdge {
    isActive?: boolean;
    isMuted?: boolean;
}

const CENTER_COLOR = '#f5222d';
const METRIC_COLOR = '#1677ff';
const DIMENSION_COLOR = '#52c41a';
const SECOND_METRIC_COLOR = '#91caff';
const TIME_GROUP_COLOR = '#13c2c2';
const MUTED_EDGE_COLOR = '#bfbfbf';
const TIME_GROUP_ID = 'D:__TIME_GROUP__';
const CENTER_X = 0;
const DIMENSION_X = -360;
const METRIC_X = 360;
const SECOND_METRIC_X = 560;
const NODE_GAP = 92;

const EDGE_COLOR: Record<string, string> = {
    SAME_FACT: '#1677ff',
    JOIN: '#52c41a',
    BUILTIN_TIME: '#722ed1',
    SOURCE_TABLE: '#13c2c2',
    LOCAL_EXPRESSION: '#faad14',
    PLANNED: '#8c8c8c',
    DIMENSION_ASSOCIATED_METRIC: '#fa8c16',
    TIME_GROUP: '#13c2c2',
    TIME_DETAIL: '#13c2c2',
};

const RELATION_LABEL: Record<string, string> = {
    SAME_FACT: '同事实表',
    JOIN: 'JOIN',
    BUILTIN_TIME: '时间字段维度',
    SOURCE_TABLE: '事实表本地维度',
    LOCAL_EXPRESSION: '事实表本地表达式',
    PLANNED: '可执行绑定计划',
    DIMENSION_ASSOCIATED_METRIC: '维度可关联指标',
    TIME_GROUP: '时间维度',
    TIME_DETAIL: '时间粒度',
};

const isTimeDimension = (node?: MetricAssociationGraphNode) =>
    Boolean(node && /^DIM_(DATE|TIME)_/.test(node.code));

const escapeHtml = (value?: string) => (value || '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const shortText = (value?: string, max = 18) => {
    if (!value) return '-';
    return value.length > max ? `${value.slice(0, max)}...` : value;
};

const nodeLabel = (node: GraphNode) => {
    if (node.virtualType === 'TIME_GROUP') {
        return `时间维度\n${node.dimCount || 0} 个粒度`;
    }
    return `${shortText(node.name, 12)}\n${shortText(node.code, 20)}`;
};

const stackY = (index: number, total: number, gap = NODE_GAP) => {
    if (total <= 1) return 0;
    return (index - (total - 1) / 2) * gap;
};

const relationLabel = (relationType?: string, joinType?: string) =>
    joinType || RELATION_LABEL[relationType || ''] || relationType || '-';

const MetricAssociationGraph: React.FC<MetricAssociationGraphProps> = ({ metricCode }) => {
    const [data, setData] = useState<MetricAssociationGraphResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedDimensionId, setSelectedDimensionId] = useState<string | null>(null);
    const [timeExpanded, setTimeExpanded] = useState(false);
    const chartInstanceRef = useRef<EChartsType | null>(null);
    const blankClickHandlerRef = useRef<((event: { target?: unknown }) => void) | null>(null);

    useEffect(() => {
        if (!metricCode) return;
        setLoading(true);
        setSelectedDimensionId(null);
        setTimeExpanded(false);
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

    const graphData = useMemo(() => {
        if (!data) return null;
        const center = data.center;
        const centerId = center?.id;
        const nodeMap = new Map(data.nodes.map((node) => [node.id, node]));
        const directMetricEdges = data.edges.filter((edge) => (
            edge.source === centerId
            && nodeMap.get(edge.target)?.nodeType === 'METRIC'
            && edge.relationType !== 'DIMENSION_ASSOCIATED_METRIC'
        ));
        const dimensionEdges = data.edges.filter((edge) => (
            edge.source === centerId && nodeMap.get(edge.target)?.nodeType === 'DIMENSION'
        ));
        const secondHopEdges = data.edges.filter((edge) => edge.relationType === 'DIMENSION_ASSOCIATED_METRIC');
        const directMetricIds = new Set(directMetricEdges.map((edge) => edge.target));
        const normalDimensionEdges = dimensionEdges.filter((edge) => !isTimeDimension(nodeMap.get(edge.target)));
        const timeDimensionEdges = dimensionEdges.filter((edge) => isTimeDimension(nodeMap.get(edge.target)));
        const activeSecondHopEdges = selectedDimensionId
            ? secondHopEdges.filter((edge) => edge.source === selectedDimensionId)
            : [];

        return {
            center,
            centerId,
            nodeMap,
            directMetricEdges,
            directMetricIds,
            normalDimensionEdges,
            timeDimensionEdges,
            secondHopEdges,
            activeSecondHopEdges,
        };
    }, [data, selectedDimensionId]);

    const selectedDimension = useMemo(() => {
        if (!graphData || !selectedDimensionId || selectedDimensionId === TIME_GROUP_ID) return null;
        return graphData.nodeMap.get(selectedDimensionId) || null;
    }, [graphData, selectedDimensionId]);

    const selectedDimensionEdge = useMemo(() => {
        if (!graphData || !selectedDimensionId) return null;
        return graphData.normalDimensionEdges
            .concat(graphData.timeDimensionEdges)
            .find((edge) => edge.target === selectedDimensionId) || null;
    }, [graphData, selectedDimensionId]);

    const option: EChartsOption | null = useMemo(() => {
        if (!graphData) return null;
        const {
            center,
            centerId,
            nodeMap,
            directMetricEdges,
            directMetricIds,
            normalDimensionEdges,
            timeDimensionEdges,
            activeSecondHopEdges,
        } = graphData;

        const visibleNodes = new Map<string, GraphNode>();
        const links: GraphLink[] = [];
        const addNode = (node: GraphNode) => visibleNodes.set(node.id, node);
        const addLink = (edge: GraphLink) => links.push(edge);
        const extraSecondHopEdges = activeSecondHopEdges.filter((edge) => !directMetricIds.has(edge.target));

        addNode({
            ...center,
            x: CENTER_X,
            y: 0,
            symbolSize: 76,
        });

        const dimensionSlots: Array<{ node: MetricAssociationGraphNode; edge: MetricAssociationGraphEdge; isTimeDetail?: boolean }> =
            normalDimensionEdges
                .map((edge) => ({ node: nodeMap.get(edge.target), edge }))
                .filter((item): item is { node: MetricAssociationGraphNode; edge: MetricAssociationGraphEdge } => Boolean(item.node));

        if (timeDimensionEdges.length > 0) {
            dimensionSlots.unshift({
                node: {
                    id: TIME_GROUP_ID,
                    code: 'TIME_DIMENSIONS',
                    name: '时间维度',
                    nodeType: 'DIMENSION',
                    tableRef: `${timeDimensionEdges.length} 个时间粒度`,
                },
                edge: {
                    source: centerId,
                    target: TIME_GROUP_ID,
                    relationType: 'TIME_GROUP',
                    description: '点击展开或收起具体时间粒度',
                },
            });
        }

        const expandedTimeSlots = timeExpanded
            ? timeDimensionEdges
                .map((edge) => ({ node: nodeMap.get(edge.target), edge, isTimeDetail: true }))
                .filter((item): item is { node: MetricAssociationGraphNode; edge: MetricAssociationGraphEdge; isTimeDetail: true } => Boolean(item.node))
            : [];
        const allDimensionSlots = dimensionSlots.concat(expandedTimeSlots);

        allDimensionSlots.forEach((item, index) => {
            const selected = selectedDimensionId === item.node.id;
            const timeGroup = item.node.id === TIME_GROUP_ID;
            const timeDetail = Boolean(item.isTimeDetail);
            addNode({
                ...item.node,
                x: timeDetail ? DIMENSION_X - 18 : DIMENSION_X,
                y: stackY(index, allDimensionSlots.length),
                symbolSize: timeGroup ? [118, 46] : selected ? 58 : 50,
                virtualType: timeGroup ? 'TIME_GROUP' : undefined,
                dimCount: timeDimensionEdges.length,
                metricCount: activeSecondHopEdges.length,
                relationSource: relationLabel(item.edge.relationType, item.edge.joinType),
                columnPair: `${item.edge.sourceColumn || '-'} = ${item.edge.targetColumn || '-'}`,
            });

            if (timeDetail) {
                addLink({
                    ...item.edge,
                    source: TIME_GROUP_ID,
                    target: item.node.id,
                    relationType: 'TIME_DETAIL',
                    description: '时间维度具体粒度',
                    isActive: selected,
                    isMuted: !selected,
                });
            } else {
                addLink({
                    ...item.edge,
                    target: item.node.id,
                    isActive: selected,
                    isMuted: Boolean(selectedDimensionId && !selected && item.node.id !== TIME_GROUP_ID),
                });
            }
        });

        directMetricEdges.forEach((edge, index) => {
            const metric = nodeMap.get(edge.target);
            if (!metric) return;
            addNode({
                ...metric,
                x: METRIC_X,
                y: stackY(index, directMetricEdges.length),
                symbolSize: 54,
            });
            addLink({
                ...edge,
                isMuted: Boolean(selectedDimensionId),
            });
        });

        activeSecondHopEdges.forEach((edge, index) => {
            const metric = nodeMap.get(edge.target);
            if (!metric) return;
            if (!visibleNodes.has(metric.id)) {
                const extraIndex = extraSecondHopEdges.findIndex((item) => item.target === edge.target);
                addNode({
                    ...metric,
                    x: SECOND_METRIC_X,
                    y: stackY(extraIndex >= 0 ? extraIndex : index, extraSecondHopEdges.length || activeSecondHopEdges.length, 74),
                    symbolSize: 50,
                });
            }
            addLink({
                ...edge,
                isActive: true,
                isMuted: false,
            });
        });

        const nodes = Array.from(visibleNodes.values()).map((node) => {
            const centerNode = node.id === centerId;
            const timeGroup = node.virtualType === 'TIME_GROUP';
            const selected = node.id === selectedDimensionId;
            const directMetric = directMetricIds.has(node.id);
            const secondMetric = node.nodeType === 'METRIC' && !directMetric && !centerNode;
            return {
                ...node,
                fixed: true,
                draggable: false,
                symbol: timeGroup ? 'roundRect' : 'circle',
                itemStyle: {
                    color: centerNode
                        ? CENTER_COLOR
                        : timeGroup
                            ? TIME_GROUP_COLOR
                            : node.nodeType === 'DIMENSION'
                                ? DIMENSION_COLOR
                                : secondMetric
                                    ? SECOND_METRIC_COLOR
                                    : METRIC_COLOR,
                    borderColor: selected || secondMetric ? '#fa8c16' : '#fff',
                    borderWidth: selected || secondMetric ? 3 : 1,
                    shadowBlur: centerNode || selected ? 18 : 0,
                    shadowColor: centerNode ? 'rgba(245, 34, 45, 0.35)' : 'rgba(250, 140, 22, 0.25)',
                },
                label: {
                    show: true,
                    position: centerNode || timeGroup ? 'inside' : 'bottom',
                    distance: 6,
                    color: timeGroup || centerNode ? '#fff' : '#262626',
                    fontSize: centerNode ? 13 : 11,
                    fontWeight: centerNode || selected || timeGroup ? 'bold' : 'normal',
                    lineHeight: 16,
                    formatter: () => nodeLabel(node),
                },
            };
        });

        const chartLinks = links.map((edge) => {
            const color = edge.isMuted ? MUTED_EDGE_COLOR : EDGE_COLOR[edge.relationType] || '#8c8c8c';
            const active = Boolean(edge.isActive);
            const showRelationLabel = active && edge.relationType === 'DIMENSION_ASSOCIATED_METRIC';
            return {
                ...edge,
                lineStyle: {
                    color,
                    width: active ? 3 : 1.4,
                    opacity: edge.isMuted ? 0.14 : active ? 0.88 : 0.58,
                    curveness: edge.relationType === 'DIMENSION_ASSOCIATED_METRIC' ? 0.08 : 0,
                    type: edge.relationType === 'TIME_DETAIL' ? 'dashed' : 'solid',
                },
                label: {
                    show: showRelationLabel,
                    formatter: relationLabel(edge.relationType, edge.joinType),
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
                backgroundColor: 'rgba(255,255,255,0.96)',
                borderColor: '#e8e8e8',
                borderWidth: 1,
                textStyle: { color: '#262626' },
                formatter: (params: { dataType?: string; data?: Record<string, string | number> }) => {
                    const item = params.data || {};
                    if (params.dataType === 'edge') {
                        return `<div style="font-weight:bold;margin-bottom:4px;">${escapeHtml(relationLabel(String(item.relationType || ''), String(item.joinType || '')))}</div>
                                <div>来源表：${escapeHtml(String(item.sourceTable || '-'))}</div>
                                <div>目标表：${escapeHtml(String(item.targetTable || '-'))}</div>
                                <div>关联字段：<code>${escapeHtml(String(item.sourceColumn || '-'))}</code> = <code>${escapeHtml(String(item.targetColumn || '-'))}</code></div>
                                <div>关系来源：${escapeHtml(String(item.joinType || item.relationType || '-'))}</div>
                                ${item.description ? `<div style="margin-top:4px;color:#666;">${escapeHtml(String(item.description))}</div>` : ''}`;
                    }
                    return `<div style="font-weight:bold;">${escapeHtml(String(item.name || '-'))}</div>
                            <div style="color:#666;font-size:12px;">${escapeHtml(String(item.code || '-'))}</div>
                            <div>类型：${escapeHtml(String(item.nodeType || '-'))}</div>
                            <div>表：${escapeHtml(String(item.tableRef || '-'))}</div>
                            ${item.relationSource ? `<div>关系：${escapeHtml(String(item.relationSource))}</div>` : ''}`;
                },
            },
            animationDuration: 500,
            animationEasingUpdate: 'cubicOut',
            series: [
                {
                    type: 'graph',
                    layout: 'none',
                    data: nodes,
                    links: chartLinks,
                    roam: true,
                    draggable: false,
                    edgeSymbol: ['none', 'arrow'],
                    edgeSymbolSize: [0, 9],
                    emphasis: {
                        focus: 'adjacency',
                        lineStyle: {
                            width: 3,
                        },
                    },
                    lineStyle: {
                        opacity: 0.72,
                    },
                },
            ],
        };
    }, [graphData, selectedDimensionId, timeExpanded]);

    const handleChartClick = useCallback((params: { dataType?: string; data?: GraphNode }) => {
        const node = params.data;
        if (params.dataType !== 'node' || !node) return;
        if (node.id === data?.center?.id) {
            setSelectedDimensionId(null);
            return;
        }
        if (node.virtualType === 'TIME_GROUP') {
            setTimeExpanded((value) => !value);
            setSelectedDimensionId(null);
            return;
        }
        if (node.nodeType === 'DIMENSION') {
            setSelectedDimensionId((current) => current === node.id ? null : node.id);
        }
    }, [data?.center?.id]);

    const onEvents = useMemo(() => ({
        click: handleChartClick,
    }), [handleChartClick]);

    const onChartReady = useCallback((instance: EChartsType) => {
        chartInstanceRef.current = instance;
        const zr = instance.getZr();
        if (blankClickHandlerRef.current) {
            zr.off('click', blankClickHandlerRef.current);
        }
        const handler = (event: { target?: unknown }) => {
            if (!event.target) {
                setSelectedDimensionId(null);
            }
        };
        blankClickHandlerRef.current = handler;
        zr.on('click', handler);
    }, []);

    const selectedMetricCount = graphData?.activeSecondHopEdges.length || 0;
    const totalDirectMetrics = graphData?.directMetricEdges.length || 0;
    const totalDimensions = (graphData?.normalDimensionEdges.length || 0) + (graphData?.timeDimensionEdges.length ? 1 : 0);

    if (loading) {
        return <div style={{ textAlign: 'center', padding: 48 }}><Spin tip="加载图谱中..." /></div>;
    }

    if (!data || data.nodes.length <= 1) {
        return <Empty description="暂无可关联图谱" />;
    }

    return (
        <div style={{ width: '100%', height: 'calc(100vh - 260px)', minHeight: 560, background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0', position: 'relative', overflow: 'hidden' }}>
            <div style={{
                position: 'absolute',
                top: 12,
                left: 12,
                right: 12,
                zIndex: 10,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                pointerEvents: 'none',
                gap: 12,
            }}>
                <div style={{
                    background: 'rgba(255,255,255,0.94)',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #e8e8e8',
                    fontSize: 12,
                    lineHeight: '22px',
                    color: '#595959',
                }}>
                    <span style={{ color: '#8c8c8c' }}>维度</span>
                    <b style={{ color: '#262626', margin: '0 8px' }}>{totalDimensions}</b>
                    <span style={{ color: '#d9d9d9' }}>|</span>
                    <span style={{ color: '#8c8c8c', marginLeft: 8 }}>直接指标</span>
                    <b style={{ color: '#262626', margin: '0 8px' }}>{totalDirectMetrics}</b>
                    <span style={{ color: '#d9d9d9' }}>|</span>
                    <span style={{ color: timeExpanded ? '#13c2c2' : '#8c8c8c', marginLeft: 8 }}>时间维度{timeExpanded ? '已展开' : '已聚合'}</span>
                </div>
                <div style={{
                    background: 'rgba(255,255,255,0.94)',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #e8e8e8',
                    fontSize: 12,
                    lineHeight: '22px',
                    minWidth: 220,
                    maxWidth: 300,
                    color: '#595959',
                }}>
                    {selectedDimension ? (
                        <>
                            <div style={{ fontWeight: 600, color: '#262626' }}>{selectedDimension.name}</div>
                            <div>{selectedDimension.code}</div>
                            <div>关系：{relationLabel(selectedDimensionEdge?.relationType, selectedDimensionEdge?.joinType)}</div>
                            <div>可带出指标：<b style={{ color: '#fa8c16' }}>{selectedMetricCount}</b></div>
                        </>
                    ) : (
                        <>
                            <div style={{ fontWeight: 600, color: '#262626' }}>选择一个维度</div>
                            <div>点击左侧维度后展示该维度可关联的其他指标</div>
                        </>
                    )}
                </div>
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
