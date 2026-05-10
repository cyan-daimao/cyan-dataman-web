import React from 'react';
import { Card, Tag, Button, Space, Tooltip, Popconfirm } from 'antd';
import {
    EditOutlined,
    DeleteOutlined,
    PlayCircleOutlined,
} from '@ant-design/icons';
import { ChartDTO, ChartType, AnalysisType } from '@/api/DatabiApi';

interface ChartCardProps {
    chart: ChartDTO;
    onEdit: (chart: ChartDTO) => void;
    onDelete: (chart: ChartDTO) => void;
    onExecute: (chart: ChartDTO) => void;
}

const CHART_TYPE_LABELS: Record<string, string> = {
    [ChartType.TABLE]: '表格',
    [ChartType.BAR]: '柱状图',
    [ChartType.LINE]: '折线图',
    [ChartType.PIE]: '饼图',
    [ChartType.SCATTER]: '散点图',
    [ChartType.AREA]: '面积图',
    [ChartType.NUMBER]: '指标卡',
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

const ChartCard: React.FC<ChartCardProps> = ({ chart, onEdit, onDelete, onExecute }) => {
    const filter = isFilterChart(chart.chartType);
    const typeLabel = CHART_TYPE_LABELS[chart.chartType] || chart.chartType;

    return (
        <Card
            hoverable
            size="small"
            style={{
                borderRadius: 8,
                borderColor: filter ? '#b7eb8f' : '#91d5ff',
            }}
            styles={{
                body: { padding: 16 },
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* 名称 */}
                <div
                    style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: '#262626',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                    title={chart.name}
                >
                    {chart.name}
                </div>

                {/* 类型标签 + 分析类型 */}
                <Space size={4} wrap>
                    <Tag color={filter ? 'green' : 'blue'}>{typeLabel}</Tag>
                    {chart.analysisType === AnalysisType.METRICS ? (
                        <Tag color="cyan">指标平台</Tag>
                    ) : (
                        <Tag color="default">数据集</Tag>
                    )}
                </Space>

                {/* 创建时间 */}
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                    {chart.createdAt || '-'}
                </div>

                {/* 操作按钮 */}
                <Space size={4} style={{ marginTop: 4 }}>
                    <Tooltip title={filter ? '筛选框暂不支持编辑' : '编辑'}>
                        <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            disabled={filter}
                            onClick={() => onEdit(chart)}
                        >
                            编辑
                        </Button>
                    </Tooltip>
                    <Button
                        type="text"
                        size="small"
                        icon={<PlayCircleOutlined />}
                        onClick={() => onExecute(chart)}
                    >
                        预览
                    </Button>
                    <Popconfirm
                        title="确认删除"
                        description="删除后无法恢复，是否确认？"
                        onConfirm={() => onDelete(chart)}
                        okText="确认"
                        cancelText="取消"
                    >
                        <Button type="text" danger size="small" icon={<DeleteOutlined />}>
                            删除
                        </Button>
                    </Popconfirm>
                </Space>
            </div>
        </Card>
    );
};

export default ChartCard;
