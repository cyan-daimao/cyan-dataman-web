import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { TableRelationDTO } from "../../../../api/MetadataTableAPI";

interface TableRelationGraphProps {
    catalog: string;
    schema: string;
    table: string;
    tableComment?: string;
    outgoing: TableRelationDTO[];
    incoming: TableRelationDTO[];
    layerCode?: string;
}

// 数据分层颜色映射（与 TableDetailPage 保持一致）
const LAYER_COLOR: Record<string, string> = {
    ODS: '#13c2c2',
    DWD: '#1890ff',
    DWM: '#722ed1',
    DWS: '#eb2f96',
    ADS: '#faad14',
    DIM: '#52c41a',
};

const DEFAULT_LAYER_COLOR = '#8c8c8c';
const CENTER_COLOR = '#f5222d';

const TableRelationGraph: React.FC<TableRelationGraphProps> = ({
    catalog,
    schema,
    table,
    tableComment,
    outgoing,
    incoming,
    layerCode,
}) => {
    const centerFullName = `${catalog}.${schema}.${table}`;

    const option: EChartsOption = useMemo(() => {
        const nodes: Record<string, unknown>[] = [];
        const links: Record<string, unknown>[] = [];
        const nodeMap = new Map<string, Record<string, unknown>>();

        // 中心节点（当前表）
        const centerNode = {
            id: centerFullName,
            name: table,
            fullName: centerFullName,
            symbolSize: 70,
            itemStyle: {
                color: CENTER_COLOR,
                shadowBlur: 20,
                shadowColor: 'rgba(245, 34, 45, 0.4)',
            },
            label: {
                show: true,
                fontSize: 13,
                fontWeight: 'bold',
                color: '#333',
                formatter: () => buildNodeLabel(table, tableComment || '当前表'),
            },
            // 中心节点连接数最多，force 布局会自然把它拉向中心
        };
        nodes.push(centerNode);
        nodeMap.set(centerFullName, centerNode);

        // 辅助函数：构建节点显示文本（表名 + 注释）
        const buildNodeLabel = (tableName: string, comment?: string) => {
            if (comment && comment.trim()) {
                return `${tableName}\n${comment.trim()}`;
            }
            return tableName;
        };

        // 辅助函数：添加节点
        const addNode = (fullName: string, tableName: string, comment?: string) => {
            if (nodeMap.has(fullName)) return;
            const node = {
                id: fullName,
                name: tableName,
                fullName,
                symbolSize: 50,
                itemStyle: {
                    color: LAYER_COLOR[layerCode || ''] || DEFAULT_LAYER_COLOR,
                },
                label: {
                    show: true,
                    fontSize: 12,
                    color: '#333',
                    formatter: buildNodeLabel(tableName, comment),
                },
            };
            nodes.push(node);
            nodeMap.set(fullName, node);
        };

        // 出向关联：本表 → 其他表
        outgoing.forEach((r) => {
            const targetFull = `${r.targetCatalog}.${r.targetSchema}.${r.targetTable}`;
            addNode(targetFull, r.targetTable, r.targetTableComment);
            links.push({
                source: centerFullName,
                target: targetFull,
                relationType: 'outgoing',
                joinType: r.joinType,
                sourceColumn: r.sourceColumn,
                targetColumn: r.targetColumn,
                description: r.description,
                lineStyle: {
                    color: '#52c41a',
                    width: 2,
                    curveness: 0.15,
                },
                label: {
                    show: true,
                    formatter: r.joinType,
                    fontSize: 10,
                    color: '#52c41a',
                    backgroundColor: '#f6ffed',
                    borderColor: '#b7eb8f',
                    borderWidth: 1,
                    borderRadius: 4,
                    padding: [2, 6],
                },
            });
        });

        // 入向关联：其他表 → 本表
        incoming.forEach((r) => {
            const sourceFull = `${r.sourceCatalog}.${r.sourceSchema}.${r.sourceTable}`;
            addNode(sourceFull, r.sourceTable, r.sourceTableComment);
            links.push({
                source: sourceFull,
                target: centerFullName,
                relationType: 'incoming',
                joinType: r.joinType,
                sourceColumn: r.sourceColumn,
                targetColumn: r.targetColumn,
                description: r.description,
                lineStyle: {
                    color: '#fa8c16',
                    width: 2,
                    curveness: 0.15,
                },
                label: {
                    show: true,
                    formatter: r.joinType,
                    fontSize: 10,
                    color: '#fa8c16',
                    backgroundColor: '#fff7e6',
                    borderColor: '#ffd591',
                    borderWidth: 1,
                    borderRadius: 4,
                    padding: [2, 6],
                },
            });
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
                    if (params.dataType === 'edge') {
                        const d = params.data;
                        const dir = d.relationType === 'outgoing'
                            ? `${d.source} → ${d.target}`
                            : `${d.source} → ${d.target}`;
                        return `<div style="font-weight:bold;margin-bottom:4px;">${dir}</div>
                                <div>关联字段：<code>${d.sourceColumn}</code> = <code>${d.targetColumn}</code></div>
                                <div>JOIN 类型：${d.joinType}</div>
                                ${d.description ? `<div style="margin-top:4px;color:#666;">${d.description}</div>` : ''}`;
                    }
                    const d = params.data;
                    return `<div style="font-weight:bold;">${d.name}</div>
                            <div style="color:#666;font-size:12px;">${d.fullName}</div>
                            ${d.id === centerFullName ? '<div style="color:#f5222d;font-size:12px;">★ 当前表</div>' : ''}`;
                },
            },
            animationDuration: 1500,
            animationEasingUpdate: 'quinticInOut',
            series: [
                {
                    type: 'graph',
                    layout: 'force',
                    data: nodes,
                    links: links,
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
                        repulsion: 400,
                        edgeLength: [120, 200],
                        gravity: 0.1,
                        layoutAnimation: true,
                    },
                    edgeSymbol: ['none', 'arrow'],
                    edgeSymbolSize: [0, 10],
                    lineStyle: {
                        opacity: 0.8,
                    },
                },
            ],
        } as EChartsOption;
    }, [outgoing, incoming, centerFullName, table, tableComment, layerCode]);

    return (
        <div style={{ width: '100%', height: 'calc(100vh - 320px)', minHeight: 600, background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0', position: 'relative' }}>
            {/* 图例 */}
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
                <div><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: CENTER_COLOR, marginRight: 6, verticalAlign: 'middle' }} /> 当前表</div>
                <div><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: DEFAULT_LAYER_COLOR, marginRight: 6, verticalAlign: 'middle' }} /> 关联表</div>
                <div><span style={{ display: 'inline-block', width: 20, height: 2, background: '#52c41a', marginRight: 6, verticalAlign: 'middle' }} /> 出向关联（本表→其他）</div>
                <div><span style={{ display: 'inline-block', width: 20, height: 2, background: '#fa8c16', marginRight: 6, verticalAlign: 'middle' }} /> 入向关联（其他→本表）</div>
            </div>
            <ReactECharts
                option={option}
                style={{ width: '100%', height: '100%' }}
                opts={{ renderer: 'canvas' }}
            />
        </div>
    );
};

export default TableRelationGraph;
