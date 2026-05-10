import React from 'react';
import { Tabs, InputNumber, Switch, Select, ColorPicker, Space, Divider } from 'antd';
import { LayoutOutlined, EyeOutlined, LinkOutlined } from '@ant-design/icons';
import { ChartRef, ChartDTO } from '@/api/DatabiApi';

interface PanelOptionsProps {
    chartRef: ChartRef;
    chart?: ChartDTO;
    allChartRefs: ChartRef[];
    allCharts: ChartDTO[];
    onChange: (key: keyof ChartRef, value: unknown) => void;
}

const PanelOptions: React.FC<PanelOptionsProps> = ({
    chartRef,
    chart,
    allChartRefs,
    allCharts,
    onChange,
}) => {
    const cascadeOptions = allChartRefs
        .filter((ref) => ref.chartId !== chartRef.chartId)
        .map((ref) => {
            const c = allCharts.find((ch) => ch.id === ref.chartId);
            return {
                label: c?.name || ref.chartId,
                value: ref.chartId,
            };
        });

    const items = [
        {
            key: 'layout',
            label: (
                <span>
                    <LayoutOutlined style={{ marginRight: 4 }} />
                    布局
                </span>
            ),
            children: (
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>X 位置</div>
                            <InputNumber
                                size="small"
                                min={0}
                                max={11}
                                value={chartRef.x}
                                onChange={(v) => onChange('x', v ?? 0)}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Y 位置</div>
                            <InputNumber
                                size="small"
                                min={0}
                                value={chartRef.y}
                                onChange={(v) => onChange('y', v ?? 0)}
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>宽度（列）</div>
                            <InputNumber
                                size="small"
                                min={1}
                                max={12}
                                value={chartRef.w}
                                onChange={(v) => onChange('w', v ?? 1)}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>高度（行）</div>
                            <InputNumber
                                size="small"
                                min={1}
                                max={30}
                                value={chartRef.h}
                                onChange={(v) => onChange('h', v ?? 1)}
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>
                </Space>
            ),
        },
        {
            key: 'display',
            label: (
                <span>
                    <EyeOutlined style={{ marginRight: 4 }} />
                    显示
                </span>
            ),
            children: (
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13 }}>显示标题</span>
                        <Switch
                            size="small"
                            checked={chartRef.titleVisible !== false}
                            onChange={(v) => onChange('titleVisible', v)}
                        />
                    </div>
                    <Divider style={{ margin: '4px 0' }} />
                    <div>
                        <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>边框样式</div>
                        <Select
                            size="small"
                            value={chartRef.borderStyle || 'default'}
                            onChange={(v) => onChange('borderStyle', v)}
                            style={{ width: '100%' }}
                            options={[
                                { label: '默认边框', value: 'default' },
                                { label: '无边框', value: 'none' },
                                { label: '实线边框', value: 'solid' },
                                { label: '阴影效果', value: 'shadow' },
                            ]}
                        />
                    </div>
                    <div>
                        <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>背景色</div>
                        <ColorPicker
                            size="small"
                            value={chartRef.bgColor || '#ffffff'}
                            onChange={(color) => onChange('bgColor', color.toHexString())}
                            showText
                        />
                    </div>
                </Space>
            ),
        },
        {
            key: 'cascade',
            label: (
                <span>
                    <LinkOutlined style={{ marginRight: 4 }} />
                    联动
                </span>
            ),
            children: (
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                        <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
                            受以下图表筛选影响
                        </div>
                        <Select
                            mode="multiple"
                            size="small"
                            placeholder="选择筛选框图表"
                            value={chartRef.cascadeFrom || []}
                            onChange={(v) => onChange('cascadeFrom', v)}
                            style={{ width: '100%' }}
                            options={cascadeOptions}
                            allowClear
                            maxTagCount="responsive"
                        />
                        <div style={{ fontSize: 11, color: '#999', marginTop: 6, lineHeight: 1.5 }}>
                            当被选择的图表筛选值变化时，本图表会自动刷新
                        </div>
                    </div>
                </Space>
            ),
        },
    ];

    return (
        <div>
            {/* 面板标题 */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>
                    {chart?.name || chartRef.chartId}
                </div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                    {chart?.chartType || '未知类型'}
                </div>
            </div>

            {/* Tab 配置 */}
            <Tabs
                size="small"
                items={items}
                style={{ padding: '0 12px' }}
            />
        </div>
    );
};

export default PanelOptions;
