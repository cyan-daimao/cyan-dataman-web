import React, { useEffect, useState } from 'react';
import {
    Button,
    Card,
    Input,
    Space,
    message,
    Table,
    InputNumber,
    Popconfirm,
} from 'antd';
import {
    SaveOutlined,
    ArrowLeftOutlined,
    PlusOutlined,
    DeleteOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { dashboardApi, chartApi, DashboardCmd, ChartDTO, ChartRef } from '@/api/DatabiApi';

const DashboardEditor: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id?: string }>();
    const isEdit = !!id;

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [chartRefs, setChartRefs] = useState<ChartRef[]>([]);
    const [charts, setCharts] = useState<ChartDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // 加载看板详情（编辑模式）
    useEffect(() => {
        chartApi.list().then((res) => {
            if (res.code === 200) setCharts(res.data);
        });
        if (isEdit && id) {
            setLoading(true);
            dashboardApi
                .getById(id)
                .then((res) => {
                    if (res.code === 200) {
                        setName(res.data.name);
                        setDescription(res.data.description || '');
                        setChartRefs(res.data.chartRefs || []);
                    } else {
                        message.error(res.message || '加载看板失败');
                    }
                })
                .catch(() => message.error('加载看板失败'))
                .finally(() => setLoading(false));
        }
    }, [isEdit, id]);

    const handleAddChart = (chartId: string) => {
        if (chartRefs.find((c) => c.chartId === chartId)) {
            message.warning('该图表已添加');
            return;
        }
        setChartRefs([...chartRefs, { chartId, x: 0, y: 0, w: 8, h: 240 }]);
    };

    const handleRemoveChart = (index: number) => {
        const next = [...chartRefs];
        next.splice(index, 1);
        setChartRefs(next);
    };

    const handleUpdateRef = (index: number, key: keyof ChartRef, value: number) => {
        const next = [...chartRefs];
        next[index] = { ...next[index], [key]: value };
        setChartRefs(next);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            message.warning('请输入看板名称');
            return;
        }
        const cmd: DashboardCmd = {
            name: name.trim(),
            description: description || undefined,
            chartRefs: chartRefs.length ? chartRefs : undefined,
            layoutConfig: JSON.stringify({ version: 1 }),
        };
        setSaving(true);
        try {
            let res;
            if (isEdit && id) {
                res = await dashboardApi.update(id, cmd);
            } else {
                res = await dashboardApi.create(cmd);
            }
            if (res.code === 200) {
                message.success(isEdit ? '更新成功' : '创建成功');
                navigate('/bi/dashboard');
            } else {
                message.error(res.message || '保存失败');
            }
        } catch (e) {
            message.error('保存失败');
        } finally {
            setSaving(false);
        }
    };

    const chartColumns = [
        {
            title: '图表名称',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: '类型',
            dataIndex: 'chartType',
            key: 'chartType',
        },
        {
            title: '操作',
            key: 'action',
            render: (_: unknown, record: ChartDTO) => (
                <Button size="small" icon={<PlusOutlined />} onClick={() => handleAddChart(record.id)}>
                    添加
                </Button>
            ),
        },
    ];

    const refColumns = [
        {
            title: '图表',
            key: 'chartName',
            render: (_: unknown, record: ChartRef) => {
                const c = charts.find((ch) => ch.id === record.chartId);
                return c?.name || record.chartId;
            },
        },
        {
            title: '宽度(列)',
            key: 'w',
            render: (_: unknown, record: ChartRef, index: number) => (
                <InputNumber
                    size="small"
                    min={1}
                    max={24}
                    value={record.w}
                    onChange={(v) => handleUpdateRef(index, 'w', v ?? 8)}
                />
            ),
        },
        {
            title: '高度(px)',
            key: 'h',
            render: (_: unknown, record: ChartRef, index: number) => (
                <InputNumber
                    size="small"
                    min={100}
                    max={800}
                    value={record.h}
                    onChange={(v) => handleUpdateRef(index, 'h', v ?? 240)}
                />
            ),
        },
        {
            title: '操作',
            key: 'action',
            render: (_: unknown, __: ChartRef, index: number) => (
                <Popconfirm title="确认移除？" onConfirm={() => handleRemoveChart(index)}>
                    <Button size="small" danger icon={<DeleteOutlined />}>
                        移除
                    </Button>
                </Popconfirm>
            ),
        },
    ];

    return (
        <Card
            loading={loading}
            title={isEdit ? '编辑看板' : '创建看板'}
            extra={
                <Space>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/bi/dashboard')}>
                        返回
                    </Button>
                    <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
                        保存
                    </Button>
                </Space>
            }
        >
            <Space direction="vertical" style={{ width: '100%' }}>
                <Input
                    placeholder="看板名称"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ maxWidth: 400 }}
                />
                <Input.TextArea
                    placeholder="描述"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    style={{ maxWidth: 600 }}
                />

                <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
                    <Card title="图表库" size="small" style={{ width: 300, flexShrink: 0 }}>
                        <Table
                            size="small"
                            rowKey="id"
                            dataSource={charts}
                            columns={chartColumns}
                            pagination={false}
                            locale={{ emptyText: '暂无可用图表' }}
                        />
                    </Card>

                    <Card title="画布配置" size="small" style={{ flex: 1 }}>
                        <Table
                            size="small"
                            rowKey={(record) => record.chartId}
                            dataSource={chartRefs}
                            columns={refColumns}
                            pagination={false}
                            locale={{ emptyText: '请点击左侧「添加」按钮添加图表' }}
                        />
                        <div style={{ marginTop: 12, color: '#999', fontSize: 12 }}>
                            提示：宽度基于 24 列网格，高度为像素值。查看模式下按此配置排列。
                        </div>
                    </Card>
                </div>
            </Space>
        </Card>
    );
};

export default DashboardEditor;
