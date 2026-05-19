import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Card, Table, Button, Space, message,
    Empty, Tag, Popconfirm, Typography, Drawer,
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    RocketOutlined, DownOutlined, HistoryOutlined,
} from '@ant-design/icons';
import {
    MetricApi, MetricListItem, MetricType, MetricStatus,
    MetricVersionItem,
} from '@/api/MetricApi';
import { MetricSubjectApi, MetricSubject } from '@/api/MetricSubjectApi';
import { ApiResponse } from '@/api/Response';
import { PageResult } from '@/api/Response';
import { listEmployees, currentEmployee } from '@/api/EmployeeApi';
import MetricDefinitionFormModal from './components/MetricDefinitionFormModal';

const { Title } = Typography;
const { Option } = Select;
import { Input, Select, TreeSelect } from 'antd';

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

const MetricsDefinition: React.FC = () => {
    const [data, setData] = useState<MetricListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [pageNum, setPageNum] = useState(1);
    const [pageSize] = useState(20);
    const [total, setTotal] = useState(0);
    const [filters, setFilters] = useState({ metricName: '', metricType: undefined as MetricType | undefined, subjectCode: undefined as string | undefined, status: undefined as MetricStatus | undefined });
    const [subjects, setSubjects] = useState<MetricSubject[]>([]);

    // Modal 状态
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<MetricType | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [modalInitialValues, setModalInitialValues] = useState<Record<string, unknown> | undefined>(undefined);

    // 历史版本
    const [historyDrawerVisible, setHistoryDrawerVisible] = useState(false);
    const [historyList, setHistoryList] = useState<MetricVersionItem[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [currentHistoryMetric, setCurrentHistoryMetric] = useState<MetricListItem | null>(null);

    const [currentUser, setCurrentUser] = useState<string>('');

    const location = useLocation();
    const navigate = useNavigate();

    // 加载员工和当前用户
    useEffect(() => {
        listEmployees().then(res => {
            if (res.code === 200 && res.data) {/**/}
        }).catch(() => {/**/});
        currentEmployee().then(res => {
            if (res.code === 200 && res.data) setCurrentUser(res.data.passport);
        }).catch(() => {/**/});
    }, []);

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

    // AI 对话创建指标：从 location.state 读取预填数据并自动打开 Modal
    useEffect(() => {
        const aiCreate = location.state as { aiCreate?: { metricType: MetricType; initialValues: Record<string, unknown> } } | undefined;
        if (!aiCreate || !currentUser) return;

        const { metricType, initialValues } = aiCreate;
        if (!metricType || !initialValues) return;

        setModalType(metricType as MetricType);
        setEditingId(null);
        setModalInitialValues({
            ...initialValues,
            owner: initialValues.owner || currentUser,
            securityLevel: initialValues.securityLevel || 'L1',
        });
        setModalVisible(true);

        // 清空 location.state
        navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location, currentUser]);

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

    const openCreateModal = (type: MetricType) => {
        setModalType(type);
        setEditingId(null);
        setModalInitialValues(undefined);
        setModalVisible(true);
    };

    const openEditModal = (record: MetricListItem) => {
        setModalType(record.metricType);
        setEditingId(record.id);
        setModalInitialValues(undefined);
        setModalVisible(true);
    };

    const handleModalSuccess = () => {
        setModalVisible(false);
        setEditingId(null);
        setModalInitialValues(undefined);
        fetchList(pageNum);
    };

    const handleModalClose = () => {
        setModalVisible(false);
        setEditingId(null);
        setModalInitialValues(undefined);
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
        { title: '指标编码', dataIndex: 'metricCode', key: 'metricCode', width: 150},
        { title: '指标名称', dataIndex: 'metricName', key: 'metricName', width: 150 },
        {
            title: '类型',
            dataIndex: 'metricType',
            key: 'metricType',
            width: 100,
            render: (v: MetricType) => <Tag color={typeTagMap[v]?.color}>{typeTagMap[v]?.label}</Tag>,
        },
        { title: '主题域', dataIndex: 'subjectName', key: 'subjectName', width: 120 },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (v: MetricStatus) => <Tag color={statusTagMap[v]?.color}>{statusTagMap[v]?.label}</Tag>,
        },
        {
            title: '密级',
            dataIndex: 'securityLevel',
            key: 'securityLevel',
            width: 90,
            render: (level: string) => {
                const colorMap: Record<string, string> = { L1: 'default', L2: 'blue', L3: 'orange', L4: 'red' };
                const labelMap: Record<string, string> = { L1: '公开', L2: '内部', L3: '敏感', L4: '机密' };
                return <Tag color={colorMap[level || 'L1']}>{labelMap[level || 'L1']}</Tag>;
            },
        },
        {
            title: '版本',
            dataIndex: 'version',
            key: 'version',
            width: 80,
            render: (v: number) => `V${v}`,
        },
        { title: '负责人', dataIndex: 'owner', key: 'owner', width: 120 },
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
                pagination={{ current: pageNum, pageSize, total, onChange: setPageNum, showTotal: (t) => `共 ${t} 条` }}
                scroll={{ x: 1200 }}
                locale={{ emptyText: <Empty description="暂无指标数据" /> }}
            />

            {/* 表单 Modal */}
            <MetricDefinitionFormModal
                visible={modalVisible}
                metricType={modalType}
                editingId={editingId}
                initialValues={modalInitialValues}
                onClose={handleModalClose}
                onSuccess={handleModalSuccess}
            />

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
