import React, { useEffect, useState, useCallback } from 'react';
import {
    Card, Table, Button, Space, Modal, Form, Input, Select, TreeSelect, message,
    Empty, Tag, Popconfirm, Typography, Divider, Row, Col,
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, PlayCircleOutlined,
    RocketOutlined, DownOutlined,
} from '@ant-design/icons';
import {
    MetricApi, MetricListItem, MetricType, MetricStatus, StatFunc, AtomicMetricCmd,
    DerivedMetricCmd, CompositeMetricCmd, TrialResult,
    PageResult,
} from '@/api/MetricApi';
import { ModifierApi, ModifierDTO, TimePeriodApi, TimePeriodDTO, DimensionApi, DimensionDTO } from '@/api/MetricConfigApi';
import { DSApi, databaseApi, tableApi } from '@/api/DSApi';
import { treeSubjects, SubjectDTO } from '@/api/MetadataSubjectAPI';
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

// ==================== 级联数据源选择器 ====================

interface CascadeDsSelectorProps {
    value?: { dsName?: string; dbName?: string; tblName?: string; colName?: string };
    onChange?: (value: { dsName: string; dbName: string; tblName: string; colName: string }) => void;
    form?: ReturnType<typeof Form.useForm>[0];
}

const CascadeDsSelector: React.FC<CascadeDsSelectorProps> = ({ value, onChange }) => {
    const [dsList, setDsList] = useState<{ name: string }[]>([]);
    const [dbList, setDbList] = useState<{ name: string }[]>([]);
    const [tblList, setTblList] = useState<{ tableName: string }[]>([]);
    const [colList, setColList] = useState<{ name: string }[]>([]);
    const [loadingDs, setLoadingDs] = useState(false);
    const [loadingDb, setLoadingDb] = useState(false);
    const [loadingTbl, setLoadingTbl] = useState(false);
    const [loadingCol, setLoadingCol] = useState(false);

    const current = value || {};

    useEffect(() => {
        setLoadingDs(true);
        DSApi.list()
            .then(res => { if (res.code === 200 && res.data) setDsList(res.data); })
            .finally(() => setLoadingDs(false));
    }, []);

    useEffect(() => {
        if (current.dsName) {
            setLoadingDb(true);
            databaseApi.list(current.dsName)
                .then(res => { if (res.code === 200 && res.data) setDbList(res.data); })
                .finally(() => setLoadingDb(false));
        } else {
            setDbList([]);
            setTblList([]);
            setColList([]);
        }
    }, [current.dsName]);

    useEffect(() => {
        if (current.dsName && current.dbName) {
            setLoadingTbl(true);
            tableApi.list(current.dsName, current.dbName)
                .then(res => { if (res.code === 200 && res.data) setTblList(res.data); })
                .finally(() => setLoadingTbl(false));
        } else {
            setTblList([]);
            setColList([]);
        }
    }, [current.dsName, current.dbName]);

    useEffect(() => {
        if (current.dsName && current.dbName && current.tblName) {
            setLoadingCol(true);
            tableApi.getSchema(current.dsName, current.dbName, current.tblName)
                .then(res => {
                    if (res.code === 200 && res.data) {
                        setColList(res.data.columns.map(c => ({ name: c.name })));
                    }
                })
                .finally(() => setLoadingCol(false));
        } else {
            setColList([]);
        }
    }, [current.dsName, current.dbName, current.tblName]);

    const triggerChange = (changedValue: Partial<{ dsName: string; dbName: string; tblName: string; colName: string }>) => {
        const next = { dsName: current.dsName || '', dbName: current.dbName || '', tblName: current.tblName || '', colName: current.colName || '', ...changedValue };
        onChange?.(next);
    };

    return (
        <Space direction="vertical" style={{ width: '100%' }}>
            <Select
                placeholder="选择数据源"
                value={current.dsName}
                onChange={v => triggerChange({ dsName: v, dbName: '', tblName: '', colName: '' })}
                loading={loadingDs}
                style={{ width: '100%' }}
                allowClear
            >
                {dsList.map(ds => <Option key={ds.name} value={ds.name}>{ds.name}</Option>)}
            </Select>
            <Select
                placeholder="选择数据库"
                value={current.dbName}
                onChange={v => triggerChange({ dbName: v, tblName: '', colName: '' })}
                loading={loadingDb}
                style={{ width: '100%' }}
                allowClear
                disabled={!current.dsName}
            >
                {dbList.map(db => <Option key={db.name} value={db.name}>{db.name}</Option>)}
            </Select>
            <Select
                placeholder="选择数据表"
                value={current.tblName}
                onChange={v => triggerChange({ tblName: v, colName: '' })}
                loading={loadingTbl}
                style={{ width: '100%' }}
                allowClear
                disabled={!current.dbName}
            >
                {tblList.map(t => <Option key={t.tableName} value={t.tableName}>{t.tableName}</Option>)}
            </Select>
            <Select
                placeholder="选择字段"
                value={current.colName}
                onChange={v => triggerChange({ colName: v })}
                loading={loadingCol}
                style={{ width: '100%' }}
                allowClear
                disabled={!current.tblName}
            >
                {colList.map(c => <Option key={c.name} value={c.name}>{c.name}</Option>)}
            </Select>
        </Space>
    );
};

// ==================== SQL 预览与试算 ====================

const SqlPreviewPanel: React.FC<{
    metricType: MetricType;
    definitionBody: Record<string, unknown>;
}> = ({ metricType, definitionBody }) => {
    const [sql, setSql] = useState<string>('');
    const [previewLoading, setPreviewLoading] = useState(false);
    const [trialLoading, setTrialLoading] = useState(false);
    const [trialResult, setTrialResult] = useState<TrialResult | null>(null);

    const handlePreview = async () => {
        setPreviewLoading(true);
        try {
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
            const res = await MetricApi.trial({ metricType, definitionBody, limit: 100 });
            if (res.code === 200 && res.data) {
                setTrialResult(res.data);
            } else {
                message.error(res.message || '试算失败');
            }
        } catch {
            message.error('SQL试算失败');
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
            {trialResult && (
                <div style={{ marginTop: 8 }}>
                    <Text type="secondary">执行耗时: {trialResult.costTime}ms</Text>
                    <Table
                        size="small"
                        dataSource={trialResult.rows.map((row, idx) => {
                            const obj: Record<string, unknown> = { key: idx };
                            trialResult.columns.forEach((col, cidx) => {
                                obj[col.name] = row[cidx];
                            });
                            return obj;
                        })}
                        columns={trialResult.columns.map(col => ({ title: col.name, dataIndex: col.name, key: col.name }))}
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
    const [subjects, setSubjects] = useState<SubjectDTO[]>([]);

    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<MetricType | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form] = Form.useForm();

    // 派生/复合指标依赖数据
    const [atomicMetrics, setAtomicMetrics] = useState<MetricListItem[]>([]);
    const [timePeriods, setTimePeriods] = useState<TimePeriodDTO[]>([]);
    const [modifiers, setModifiers] = useState<ModifierDTO[]>([]);
    const [dimensions, setDimensions] = useState<DimensionDTO[]>([]);
    const [refMetrics, setRefMetrics] = useState<MetricListItem[]>([]);
    const [dimensionLoadFailed, setDimensionLoadFailed] = useState(false);

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
        treeSubjects().then(res => setSubjects(res)).catch(() => {/**/});
    }, [fetchList]);

    const handleFilterChange = (changed: Partial<typeof filters>) => {
        const next = { ...filters, ...changed };
        setFilters(next);
        setPageNum(1);
        fetchList(1, next);
    };

    const buildSubjectTree = (list: SubjectDTO[]): React.ComponentProps<typeof TreeSelect>['treeData'] => {
        return list.map(item => ({
            title: item.subjectName,
            value: item.subjectCode,
            key: item.id,
            children: item.children ? buildSubjectTree(item.children) : undefined,
        }));
    };

    const openCreateModal = async (type: MetricType) => {
        setModalType(type);
        setEditingId(null);
        form.resetFields();
        setDimensionLoadFailed(false);

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
            }).catch(() => {
                setDimensionLoadFailed(true);
            });
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
        setDimensionLoadFailed(false);

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
            }).catch(() => {
                setDimensionLoadFailed(true);
            });
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

    const getDefinitionBody = (): Record<string, unknown> => {
        const values = form.getFieldsValue();
        if (modalType === MetricType.ATOMIC) {
            return {
                statFunc: values.statFunc,
                dsName: values.dsSelector?.dsName,
                dbName: values.dsSelector?.dbName,
                tblName: values.dsSelector?.tblName,
                colName: values.dsSelector?.colName,
                filterCondition: values.filterCondition || [],
            };
        }
        if (modalType === MetricType.DERIVED) {
            return {
                atomicMetricId: values.atomicMetricId,
                timePeriodId: values.timePeriodId,
                modifierIds: values.modifierIds || [],
                dimensionIds: values.dimensionIds || [],
                groupByFields: values.groupByFields || [],
            };
        }
        if (modalType === MetricType.COMPOSITE) {
            return {
                formula: values.formula,
                metricRefs: values.metricRefs || [],
            };
        }
        return {};
    };

    const columns = [
        { title: '指标编码', dataIndex: 'metricCode', key: 'metricCode', width: 160 },
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
        { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 180 },
        {
            title: '操作',
            key: 'action',
            width: 240,
            fixed: 'right',
            render: (_: unknown, record: MetricListItem) => (
                <Space size="small">
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>编辑</Button>
                    {record.status === MetricStatus.DRAFT && (
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
                title={editingId ? '编辑指标' : modalType === MetricType.ATOMIC ? '新建原子指标' : modalType === MetricType.DERIVED ? '新建派生指标' : '新建复合指标'}
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
                            <Form.Item name="dsSelector" label="数据来源" rules={[{ required: true, validator: (_, val) => val?.dsName && val?.dbName && val?.tblName && val?.colName ? Promise.resolve() : Promise.reject(new Error('请完整选择数据源、数据库、表和字段')) }]}>
                                <CascadeDsSelector />
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
                                {dimensionLoadFailed ? (
                                    <Select mode="tags" placeholder="维度服务暂不可用，请手动输入维度字段名" allowClear>
                                        {dimensions.map(d => <Option key={d.id} value={d.id}>{d.dimName}</Option>)}
                                    </Select>
                                ) : (
                                    <Select mode="multiple" placeholder="选择维度">
                                        {dimensions.map(d => <Option key={d.id} value={d.id}>{d.dimName}</Option>)}
                                    </Select>
                                )}
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
                        <SqlPreviewPanel metricType={modalType} definitionBody={getDefinitionBody()} />
                    )}
                </Form>
            </Modal>
        </div>
    );
};

export default MetricsDefinition;
