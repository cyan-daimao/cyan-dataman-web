import React, { useEffect, useState, useCallback } from 'react';
import {
    Card, Table, Button, Space, Modal, Form, Input, Select, TreeSelect, message,
    Empty, Tag, Popconfirm, Typography, Divider, Row, Col, Drawer,
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, PlayCircleOutlined,
    RocketOutlined, DownOutlined, HistoryOutlined,
} from '@ant-design/icons';
import {
    MetricApi, MetricListItem, MetricType, MetricStatus, StatFunc, AtomicMetricCmd,
    DerivedMetricCmd, CompositeMetricCmd, MetricVersionItem,
    PageResult,
} from '@/api/MetricApi';
import { ModifierApi, ModifierDTO, TimePeriodApi, TimePeriodDTO, DimensionApi, DimensionDTO, DimType, MetadataTableSelectorApi, MetadataColumnDTO } from '@/api/MetricConfigApi';
import { MetricSubjectApi, MetricSubject } from '@/api/MetricSubjectApi';
import { executeSql } from '@/api/DatagawayApi';
import { ApiResponse } from '@/api/Response';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const typeTagMap: Record<string, { color: string; label: string }> = {
    ATOMIC: { color: 'blue', label: '原子' },
    DERIVED: { color: 'green', label: '派生' },
    COMPOSITE: { color: 'purple', label: '复合' },
};

const statusTagMap: Record<string, { color: string; label: string }> = {
    DRAFT: { color: 'default', label: '草稿' },
    PUBLISHED: { color: 'success', label: '已发布' },
    OFFLINE: { color: 'error', label: '已下线' },
};

// ==================== 数仓表选择器 ====================

interface MetadataTableSelectorValue {
    dsName?: string;
    dbName?: string;
    tblName?: string;
    colName?: string;
}

interface MetadataTableSelectorProps {
    value?: MetadataTableSelectorValue;
    onChange?: (value: MetadataTableSelectorValue) => void;
}

const MetadataTableSelector: React.FC<MetadataTableSelectorProps> = ({ value, onChange }) => {
    const [tableOptions, setTableOptions] = useState<{ id: string; name: string; layerCode?: string; catalog?: string; schema?: string;comment?: string }[]>([]);
    const [tableLoading, setTableLoading] = useState(false);
    const [columns, setColumns] = useState<MetadataColumnDTO[]>([]);
    const [columnsLoading, setColumnsLoading] = useState(false);

    const current = value || {};
    const currentTableName = current.tblName || '';

    // 加载数仓表列表
    useEffect(() => {
        setTableLoading(true);
        MetadataTableSelectorApi.list()
            .then(res => {
                if (res.code === 200 && res.data) {
                    setTableOptions((res.data.data || []).map(item => ({
                        id: item.id,
                        name: item.name,
                        comment: item.comment,
                        layerCode: item.layerCode,
                        catalog: item.table?.catalog,
                        schema: item.table?.schema,
                    })));
                }
            })
            .catch(() => message.error('加载数仓表列表失败'))
            .finally(() => setTableLoading(false));
    }, []);

    // 根据当前表名加载字段列表
    useEffect(() => {
        const selected = tableOptions.find(t => t.name === currentTableName);
        if (!selected) {
            setColumns([]);
            return;
        }
        setColumnsLoading(true);
        MetadataTableSelectorApi.columns(selected.id)
            .then(res => {
                if (res.code === 200 && res.data) {
                    setColumns(res.data);
                } else {
                    setColumns([]);
                }
            })
            .catch(() => {
                message.error('加载字段列表失败');
                setColumns([]);
            })
            .finally(() => setColumnsLoading(false));
    }, [currentTableName, tableOptions]);

    const handleTableChange = (tableName: string | undefined) => {
        const selected = tableOptions.find(t => t.name === tableName);
        onChange?.({
            dsName: selected?.catalog || '',
            dbName: selected?.schema || '',
            tblName: tableName || '',
            colName: '',
        });
    };

    const handleColumnChange = (colName: string | undefined) => {
        onChange?.({ ...current, colName: colName || '' });
    };

    return (
        <Space direction="vertical" style={{ width: '100%' }}>
            <Select
                showSearch
                placeholder="选择数仓表"
                value={currentTableName}
                onChange={handleTableChange}
                loading={tableLoading}
                style={{ width: '100%' }}
                allowClear
                optionFilterProp="label"
                options={tableOptions.map(t => ({
                    value: t.name,
                    label: `${t.name} - ${t.comment}`,
                }))}
            />
            <Select
                showSearch
                placeholder={currentTableName ? '选择字段' : '请先选择数仓表'}
                value={current.colName}
                onChange={handleColumnChange}
                loading={columnsLoading}
                style={{ width: '100%' }}
                allowClear
                disabled={!currentTableName || columnsLoading}
                optionFilterProp="label"
                options={columns.map(c => ({
                    value: c.col,
                    label: `${c.col}${c.comment ? ' - ' + c.comment : ''}`,
                }))}
            />
        </Space>
    );
};

// ==================== SQL 预览与试算 ====================

const SqlPreviewPanel: React.FC<{
    metricType: MetricType;
}> = ({ metricType }) => {
    const form = Form.useFormInstance();
    const [sql, setSql] = useState<string>('');
    const [previewLoading, setPreviewLoading] = useState(false);
    const [trialLoading, setTrialLoading] = useState(false);
    const [sqlResult, setSqlResult] = useState<any>(null);

    const buildDefinitionBody = (): Record<string, unknown> => {
        const values = form.getFieldsValue();
        if (metricType === MetricType.ATOMIC) {
            return {
                statFunc: values.statFunc,
                dsName: values.dsSelector?.dsName,
                dbName: values.dsSelector?.dbName,
                tblName: values.dsSelector?.tblName,
                colName: values.dsSelector?.colName,
                filterCondition: values.filterCondition || [],
            };
        }
        if (metricType === MetricType.DERIVED) {
            return {
                atomicMetricId: values.atomicMetricId,
                timePeriodId: values.timePeriodId,
                modifierIds: values.modifierIds || [],
                dimensionIds: values.dimensionIds || [],
                groupByFields: values.groupByFields || [],
            };
        }
        if (metricType === MetricType.COMPOSITE) {
            return {
                formula: values.formula,
                metricRefs: values.metricRefs || [],
            };
        }
        return {};
    };

    const handlePreview = async () => {
        setPreviewLoading(true);
        try {
            const definitionBody = buildDefinitionBody();
            const res = await MetricApi.previewSql({ metricType, definitionBody });
            if (res.code === 200 && res.data) {
                setSql(res.data);
            } else {
                message.error(res.message || '预览失败');
            }
        } catch {
            message.error('SQL预览失败');
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleTrial = async () => {
        setTrialLoading(true);
        try {
            // 先获取 SQL（如果还没有预览过）
            let currentSql = sql;
            if (!currentSql) {
                const definitionBody = buildDefinitionBody();
                const previewRes = await MetricApi.previewSql({ metricType, definitionBody });
                if (previewRes.code === 200 && previewRes.data) {
                    currentSql = previewRes.data;
                    setSql(currentSql);
                } else {
                    message.error(previewRes.message || 'SQL生成失败');
                    return;
                }
            }
            // 直接调用 datagateway 执行 SQL
            const res = await executeSql(currentSql);
            if (res.code === 200 && res.data) {
                setSqlResult(res.data);
            } else {
                message.error(res.message || '试算失败');
            }
        } catch (err: any) {
            message.error(err?.message || 'SQL试算失败');
        } finally {
            setTrialLoading(false);
        }
    };

    return (
        <div style={{ marginTop: 16, padding: 16, background: '#f6f8fa', borderRadius: 6 }}>
            <Space style={{ marginBottom: 8 }}>
                <Button icon={<EyeOutlined />} loading={previewLoading} onClick={handlePreview}>SQL预览</Button>
                <Button icon={<PlayCircleOutlined />} loading={trialLoading} onClick={handleTrial}>试算</Button>
            </Space>
            {sql && (
                <pre style={{ background: '#fff', padding: 12, borderRadius: 4, overflow: 'auto' }}>{sql}</pre>
            )}
            {sqlResult && (
                <div style={{ marginTop: 8 }}>
                    <Text type="secondary">执行耗时: {sqlResult.costTimeMs}ms</Text>
                    <Table
                        size="small"
                        dataSource={sqlResult.data || []}
                        columns={sqlResult.data && sqlResult.data.length > 0 ? Object.keys(sqlResult.data[0]).map(key => ({
                            title: key,
                            dataIndex: key,
                            key: key,
                        })) : []}
                        pagination={false}
                    />
                </div>
            )}
        </div>
    );
};

// ==================== 主页面 ====================

const MetricsDefinition: React.FC = () => {
    const [data, setData] = useState<MetricListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [pageNum, setPageNum] = useState(1);
    const [pageSize] = useState(20);
    const [total, setTotal] = useState(0);

    const [filters, setFilters] = useState({ metricName: '', metricType: undefined as MetricType | undefined, subjectCode: undefined as string | undefined, status: undefined as MetricStatus | undefined });
    const [subjects, setSubjects] = useState<MetricSubject[]>([]);

    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<MetricType | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form] = Form.useForm();

    const [historyDrawerVisible, setHistoryDrawerVisible] = useState(false);
    const [historyList, setHistoryList] = useState<MetricVersionItem[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [currentHistoryMetric, setCurrentHistoryMetric] = useState<MetricListItem | null>(null);

    // 派生/复合指标依赖数据
    const [atomicMetrics, setAtomicMetrics] = useState<MetricListItem[]>([]);
    const [timePeriods, setTimePeriods] = useState<TimePeriodDTO[]>([]);
    const [modifiers, setModifiers] = useState<ModifierDTO[]>([]);
    const [dimensions, setDimensions] = useState<DimensionDTO[]>([]);
    const [refMetrics, setRefMetrics] = useState<MetricListItem[]>([]);

    const fetchList = useCallback(async (page = 1, query = filters) => {
        setLoading(true);
        try {
            const res: ApiResponse<PageResult<MetricListItem>> = await MetricApi.page({
                pageNum: page,
                pageSize,
                ...query,
            });
            if (res.code === 200 && res.data) {
                setData(res.data.list);
                setTotal(res.data.total);
            }
        } catch {
            message.error('获取指标列表失败');
        } finally {
            setLoading(false);
        }
    }, [filters, pageSize]);

    useEffect(() => {
        fetchList(1);
        MetricSubjectApi.tree().then(res => setSubjects(res)).catch(() => {/**/});
    }, [fetchList]);

    const handleFilterChange = (changed: Partial<typeof filters>) => {
        const next = { ...filters, ...changed };
        setFilters(next);
        setPageNum(1);
        fetchList(1, next);
    };

    const buildSubjectTree = (list: MetricSubject[]): React.ComponentProps<typeof TreeSelect>['treeData'] => {
        return list.map(item => ({
            title: item.subjectName,
            value: item.subjectCode,
            key: item.subjectCode,
            children: item.children ? buildSubjectTree(item.children) : undefined,
        }));
    };

    const openCreateModal = async (type: MetricType) => {
        setModalType(type);
        setEditingId(null);
        form.resetFields();
        // load dimension list

        if (type === MetricType.DERIVED) {
            MetricApi.page({ pageNum: 1, pageSize: 1000, metricType: MetricType.ATOMIC }).then(res => {
                if (res.code === 200 && res.data) setAtomicMetrics(res.data.list);
            }).catch(() => {/**/});
            TimePeriodApi.list().then(res => {
                if (res.code === 200 && res.data) setTimePeriods(res.data);
            }).catch(() => {/**/});
            ModifierApi.page({ pageNum: 1, pageSize: 1000 }).then(res => {
                if (res.code === 200 && res.data) setModifiers(res.data.list);
            }).catch(() => {/**/});
            DimensionApi.page({ pageNum: 1, pageSize: 1000 }).then(res => {
                if (res.code === 200 && res.data) setDimensions(res.data.list);
            }).catch(() => {/**/});
        }
        if (type === MetricType.COMPOSITE) {
            MetricApi.page({ pageNum: 1, pageSize: 1000 }).then(res => {
                if (res.code === 200 && res.data) setRefMetrics(res.data.list);
            }).catch(() => {/**/});
        }

        setModalVisible(true);
    };

    const openEditModal = (record: MetricListItem) => {
        setModalType(record.metricType);
        setEditingId(record.id);
        form.resetFields();
        setModalVisible(true);
        // load dimension list

        // 异步加载详情填充表单
        MetricApi.detail(record.id).then(res => {
            if (res.code === 200 && res.data) {
                const detail = res.data;
                const base = {
                    metricName: detail.metricName,
                    bizCaliber: detail.bizCaliber,
                    techCaliber: detail.techCaliber,
                    subjectCode: detail.subjectCode,
                };
                if (detail.metricType === MetricType.ATOMIC && detail.atomic) {
                    form.setFieldsValue({
                        ...base,
                        statFunc: detail.atomic.statFunc,
                        dsSelector: {
                            dsName: detail.atomic.dsName,
                            dbName: detail.atomic.dbName,
                            tblName: detail.atomic.tblName,
                            colName: detail.atomic.colName,
                        },
                        filterCondition: detail.atomic.filterCondition || [],
                    });
                } else if (detail.metricType === MetricType.DERIVED && detail.derived) {
                    form.setFieldsValue({
                        ...base,
                        atomicMetricId: detail.derived.atomicMetricId,
                        timePeriodId: detail.derived.timePeriodId,
                        modifierIds: detail.derived.modifierIds || [],
                        dimensionIds: detail.derived.dimensionIds || [],
                        groupByFields: detail.derived.groupByFields || [],
                    });
                } else if (detail.metricType === MetricType.COMPOSITE && detail.composite) {
                    form.setFieldsValue({
                        ...base,
                        formula: detail.composite.formula,
                        metricRefs: detail.composite.metricRefs,
                    });
                }
            }
        }).catch(() => {/**/});

        if (record.metricType === MetricType.DERIVED) {
            MetricApi.page({ pageNum: 1, pageSize: 1000, metricType: MetricType.ATOMIC }).then(res => {
                if (res.code === 200 && res.data) setAtomicMetrics(res.data.list);
            }).catch(() => {/**/});
            TimePeriodApi.list().then(res => {
                if (res.code === 200 && res.data) setTimePeriods(res.data);
            }).catch(() => {/**/});
            ModifierApi.page({ pageNum: 1, pageSize: 1000 }).then(res => {
                if (res.code === 200 && res.data) setModifiers(res.data.list);
            }).catch(() => {/**/});
            DimensionApi.page({ pageNum: 1, pageSize: 1000 }).then(res => {
                if (res.code === 200 && res.data) setDimensions(res.data.list);
            }).catch(() => {/**/});
        }
        if (record.metricType === MetricType.COMPOSITE) {
            MetricApi.page({ pageNum: 1, pageSize: 1000 }).then(res => {
                if (res.code === 200 && res.data) setRefMetrics(res.data.list);
            }).catch(() => {/**/});
        }
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            const base = {
                metricName: values.metricName,
                bizCaliber: values.bizCaliber,
                techCaliber: values.techCaliber,
                subjectCode: values.subjectCode,
            };
            if (modalType === MetricType.ATOMIC) {
                const cmd: AtomicMetricCmd = {
                    ...base,
                    statFunc: values.statFunc,
                    dsName: values.dsSelector.dsName,
                    dbName: values.dsSelector.dbName,
                    tblName: values.dsSelector.tblName,
                    colName: values.dsSelector.colName,
                    filterCondition: values.filterCondition,
                };
                if (editingId) {
                    await MetricApi.updateAtomic(editingId, cmd);
                } else {
                    await MetricApi.createAtomic(cmd);
                }
            } else if (modalType === MetricType.DERIVED) {
                const cmd: DerivedMetricCmd = {
                    ...base,
                    atomicMetricId: values.atomicMetricId,
                    timePeriodId: values.timePeriodId,
                    modifierIds: values.modifierIds,
                    dimensionIds: values.dimensionIds,
                    groupByFields: values.groupByFields,
                };
                if (editingId) {
                    await MetricApi.updateDerived(editingId, cmd);
                } else {
                    await MetricApi.createDerived(cmd);
                }
            } else if (modalType === MetricType.COMPOSITE) {
                const cmd: CompositeMetricCmd = {
                    ...base,
                    formula: values.formula,
                    metricRefs: values.metricRefs,
                };
                if (editingId) {
                    await MetricApi.updateComposite(editingId, cmd);
                } else {
                    await MetricApi.createComposite(cmd);
                }
            }
            message.success('保存成功');
            setModalVisible(false);
            form.resetFields();
            setEditingId(null);
            fetchList(pageNum);
        } catch {
            // validation or api error
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await MetricApi.delete(id);
            message.success('删除成功');
            fetchList(pageNum);
        } catch {
            message.error('删除失败');
        }
    };

    const handleStatusChange = async (id: string, status: MetricStatus) => {
        try {
            await MetricApi.updateStatus(id, { status });
            message.success('状态更新成功');
            fetchList(pageNum);
        } catch {
            message.error('状态更新失败');
        }
    };

    const openVersionHistory = (record: MetricListItem) => {
        setCurrentHistoryMetric(record);
        setHistoryDrawerVisible(true);
        setHistoryLoading(true);
        MetricApi.listVersions(record.id)
            .then(res => {
                if (res.code === 200 && res.data) {
                    setHistoryList(res.data);
                }
            })
            .catch(() => message.error('加载版本历史失败'))
            .finally(() => setHistoryLoading(false));
    };

    const handleRollback = async (version: number) => {
        if (!currentHistoryMetric) return;
        try {
            await MetricApi.rollback(currentHistoryMetric.id, version);
            message.success('回退成功');
            setHistoryDrawerVisible(false);
            fetchList(pageNum);
        } catch {
            message.error('回退失败');
        }
    };

    const columns = [
        { title: '指标编码', dataIndex: 'metricCode', key: 'metricCode', },
        { title: '指标名称', dataIndex: 'metricName', key: 'metricName' },
        {
            title: '类型',
            dataIndex: 'metricType',
            key: 'metricType',
            width: 100,
            render: (v: MetricType) => <Tag color={typeTagMap[v]?.color}>{typeTagMap[v]?.label}</Tag>,
        },
        { title: '主题域', dataIndex: 'subjectName', key: 'subjectName', width: 120 },
        {
            title: '统计函数',
            dataIndex: 'statFunc',
            key: 'statFunc',
            width: 100,
            render: (v: StatFunc | undefined) => v || '-',
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (v: MetricStatus) => <Tag color={statusTagMap[v]?.color}>{statusTagMap[v]?.label}</Tag>,
        },
        {
            title: '版本',
            dataIndex: 'version',
            key: 'version',
            width: 80,
            render: (v: number) => `V${v}`,
        },
        { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 180 },
        {
            title: '操作',
            key: 'action',
            width: 240,
            fixed: 'right',
            render: (_: unknown, record: MetricListItem) => (
                <Space size="small">
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>编辑</Button>
                    <Button type="link" size="small" icon={<HistoryOutlined />} onClick={() => openVersionHistory(record)}>版本历史</Button>
                    {record.status !== MetricStatus.PUBLISHED && (
                        <Button type="link" size="small" icon={<RocketOutlined />} onClick={() => handleStatusChange(record.id, MetricStatus.PUBLISHED)}>发布</Button>
                    )}
                    {record.status === MetricStatus.PUBLISHED && (
                        <Button type="link" size="small" danger icon={<DownOutlined />} onClick={() => handleStatusChange(record.id, MetricStatus.OFFLINE)}>下线</Button>
                    )}
                    <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '0 8px' }}>
            <Title level={4} style={{ marginBottom: 16 }}>指标定义</Title>

            {/* 筛选区 */}
            <Card style={{ marginBottom: 16 }}>
                <Space wrap>
                    <Input.Search
                        placeholder="指标名称模糊搜索"
                        allowClear
                        onSearch={v => handleFilterChange({ metricName: v })}
                        style={{ width: 220 }}
                    />
                    <Select
                        placeholder="指标类型"
                        allowClear
                        style={{ width: 140 }}
                        value={filters.metricType}
                        onChange={v => handleFilterChange({ metricType: v })}
                    >
                        <Option value={MetricType.ATOMIC}>原子指标</Option>
                        <Option value={MetricType.DERIVED}>派生指标</Option>
                        <Option value={MetricType.COMPOSITE}>复合指标</Option>
                    </Select>
                    <TreeSelect
                        placeholder="主题域"
                        allowClear
                        treeData={buildSubjectTree(subjects)}
                        style={{ width: 200 }}
                        value={filters.subjectCode}
                        onChange={v => handleFilterChange({ subjectCode: v })}
                        treeDefaultExpandAll
                    />
                    <Select
                        placeholder="状态"
                        allowClear
                        style={{ width: 140 }}
                        value={filters.status}
                        onChange={v => handleFilterChange({ status: v })}
                    >
                        <Option value={MetricStatus.DRAFT}>草稿</Option>
                        <Option value={MetricStatus.PUBLISHED}>已发布</Option>
                        <Option value={MetricStatus.OFFLINE}>已下线</Option>
                    </Select>
                </Space>
            </Card>

            {/* 操作按钮 */}
            <div style={{ marginBottom: 16 }}>
                <Space>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreateModal(MetricType.ATOMIC)}>新建原子指标</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreateModal(MetricType.DERIVED)}>新建派生指标</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreateModal(MetricType.COMPOSITE)}>新建复合指标</Button>
                </Space>
            </div>

            {/* 表格 */}
            <Table
                rowKey="id"
                columns={columns}
                dataSource={data}
                loading={loading}
                pagination={{ current: pageNum, pageSize, total, onChange: setPageNum }}
                scroll={{ x: 1200 }}
                locale={{ emptyText: <Empty description="暂无指标数据" /> }}
            />

            {/* 新建/编辑弹窗 */}
            <Modal
                title={editingId ? (() => {
                    const record = data.find(item => item.id === editingId);
                    if (record && record.status === 'PUBLISHED') {
                        return `编辑指标（将生成 V${record.version + 1} 草稿）`;
                    }
                    return '编辑指标';
                })() : modalType === MetricType.ATOMIC ? '新建原子指标' : modalType === MetricType.DERIVED ? '新建派生指标' : '新建复合指标'}
                open={modalVisible}
                onOk={handleSave}
                onCancel={() => { setModalVisible(false); form.resetFields(); setEditingId(null); }}
                width={800}
                destroyOnClose
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="metricName" label="指标名称" rules={[{ required: true }]}>
                        <Input placeholder="请输入指标名称" />
                    </Form.Item>
                    <Form.Item name="bizCaliber" label="业务口径" rules={[{ required: true }]}>
                        <TextArea rows={2} placeholder="请输入业务口径" />
                    </Form.Item>
                    <Form.Item name="techCaliber" label="技术口径">
                        <TextArea rows={2} placeholder="请输入技术口径（选填）" />
                    </Form.Item>
                    <Form.Item name="subjectCode" label="所属主题域" rules={[{ required: true }]}>
                        <TreeSelect
                            treeData={buildSubjectTree(subjects)}
                            placeholder="选择主题域"
                            treeDefaultExpandAll
                        />
                    </Form.Item>

                    {modalType === MetricType.ATOMIC && (
                        <>
                            <Form.Item name="statFunc" label="统计函数" rules={[{ required: true }]}>
                                <Select placeholder="选择统计函数">
                                    {Object.values(StatFunc).map(f => <Option key={f} value={f}>{f}</Option>)}
                                </Select>
                            </Form.Item>
                            <Form.Item name="dsSelector" label="数据来源" rules={[{ required: true, validator: (_, val) => val?.dsName && val?.dbName && val?.tblName && val?.colName ? Promise.resolve() : Promise.reject(new Error('请选择数仓表和字段')) }]}>
                                <MetadataTableSelector />
                            </Form.Item>
                            <Form.List name="filterCondition">
                                {(fields, { add, remove }) => (
                                    <>
                                        {fields.map(({ key, name, ...restField }) => (
                                            <Row key={key} gutter={8} align="middle">
                                                <Col span={7}>
                                                    <Form.Item {...restField} name={[name, 'field']} rules={[{ required: true }]}>
                                                        <Input placeholder="字段" />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={5}>
                                                    <Form.Item {...restField} name={[name, 'op']} rules={[{ required: true }]}>
                                                        <Select placeholder="运算符">
                                                            <Option value="=">=</Option>
                                                            <Option value="!=">!=</Option>
                                                            <Option value=">">&gt;</Option>
                                                            <Option value="<">&lt;</Option>
                                                            <Option value="IN">IN</Option>
                                                        </Select>
                                                    </Form.Item>
                                                </Col>
                                                <Col span={9}>
                                                    <Form.Item {...restField} name={[name, 'value']} rules={[{ required: true }]}>
                                                        <Input placeholder="值" />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={3}>
                                                    <Button type="link" danger onClick={() => remove(name)}>删除</Button>
                                                </Col>
                                            </Row>
                                        ))}
                                        <Button type="dashed" onClick={() => add()} block>添加过滤条件</Button>
                                    </>
                                )}
                            </Form.List>
                        </>
                    )}

                    {modalType === MetricType.DERIVED && (
                        <>
                            <Form.Item name="atomicMetricId" label="原子指标" rules={[{ required: true }]}>
                                <Select placeholder="选择原子指标" showSearch optionFilterProp="children">
                                    {atomicMetrics.map(m => <Option key={m.id} value={m.id}>{m.metricName} ({m.metricCode})</Option>)}
                                </Select>
                            </Form.Item>
                            <Form.Item name="timePeriodId" label="时间周期" rules={[{ required: true }]}>
                                <Select placeholder="选择时间周期">
                                    {timePeriods.map(t => <Option key={t.id} value={t.id}>{t.periodName}</Option>)}
                                </Select>
                            </Form.Item>
                            <Form.Item name="modifierIds" label="修饰词">
                                <Select mode="multiple" placeholder="选择修饰词">
                                    {modifiers.map(m => <Option key={m.id} value={m.id}>{m.modifierName}</Option>)}
                                </Select>
                            </Form.Item>
                            <Form.Item name="dimensionIds" label="维度">
                                <Select mode="multiple" placeholder="选择维度">
                                    {dimensions.map(d => (
                                        <Option key={d.id} value={d.id}>
                                            <span>{d.dimName}</span>
                                            <Tag color="blue" style={{ marginLeft: 8, fontSize: 12 }}>{d.dimType === DimType.DATE ? 'DATE' : d.dimType}</Tag>
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <Form.List name="groupByFields">
                                {(fields, { add, remove }) => (
                                    <>
                                        {fields.map(({ key, name, ...restField }) => (
                                            <Row key={key} gutter={8} align="middle">
                                                <Col span={20}>
                                                    <Form.Item {...restField} name={[name, 'col']} rules={[{ required: true }]}>
                                                        <Input placeholder="分组字段" />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={4}>
                                                    <Button type="link" danger onClick={() => remove(name)}>删除</Button>
                                                </Col>
                                            </Row>
                                        ))}
                                        <Button type="dashed" onClick={() => add()} block>添加分组字段</Button>
                                    </>
                                )}
                            </Form.List>
                        </>
                    )}

                    {modalType === MetricType.COMPOSITE && (
                        <>
                            <Form.Item name="formula" label="计算公式" rules={[{ required: true }]}>
                                <Input placeholder="如：${M001} / ${M002} * 100" />
                            </Form.Item>
                            <Form.Item name="metricRefs" label="引用指标" rules={[{ required: true }]}>
                                <Select mode="multiple" placeholder="选择引用的指标">
                                    {refMetrics.map(m => <Option key={m.id} value={m.id}>{m.metricName} ({m.metricCode})</Option>)}
                                </Select>
                            </Form.Item>
                        </>
                    )}

                    <Divider />
                    {modalType && (
                        <SqlPreviewPanel metricType={modalType} />
                    )}
                </Form>
            </Modal>

            <Drawer
                title={`${currentHistoryMetric?.metricName} - 版本历史`}
                width={600}
                open={historyDrawerVisible}
                onClose={() => setHistoryDrawerVisible(false)}
            >
                <Table
                    rowKey="version"
                    dataSource={historyList}
                    loading={historyLoading}
                    pagination={false}
                    columns={[
                        { title: '版本', dataIndex: 'version', render: (v: number) => `V${v}`, width: 80 },
                        { title: '名称', dataIndex: 'metricName' },
                        { title: '状态', dataIndex: 'status', render: (v: MetricStatus) => <Tag color={statusTagMap[v]?.color}>{statusTagMap[v]?.label}</Tag> },
                        { title: '快照时间', dataIndex: 'snapshotTime', width: 180 },
                        { title: '操作人', dataIndex: 'updateBy', width: 120 },
                        {
                            title: '操作',
                            key: 'action',
                            width: 120,
                            render: (_: unknown, record: MetricVersionItem) => (
                                <Popconfirm
                                    title={`确认回退到 V${record.version}？`}
                                    description="回退后将覆盖当前指标状态"
                                    onConfirm={() => handleRollback(record.version)}
                                >
                                    <Button type="link" size="small">回退到此版本</Button>
                                </Popconfirm>
                            ),
                        },
                    ]}
                />
            </Drawer>
        </div>
    );
};

export default MetricsDefinition;
