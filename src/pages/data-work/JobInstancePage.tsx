import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Alert,
    Button,
    Card,
    Drawer,
    Empty,
    InputNumber,
    message,
    Pagination,
    Popconfirm,
    Select,
    Space,
    Spin,
    Table,
    Tag,
    Typography,
} from 'antd';
import {
    ArrowLeftOutlined,
    ReloadOutlined,
    EyeOutlined,
    PlayCircleOutlined,
    StopOutlined,
    FileTextOutlined,
    CopyOutlined,
} from '@ant-design/icons';
import {
    JobInstanceDTO,
    JobInstanceLogDTO,
    JobLogRole,
    JobDTO,
    pageJobInstances,
    getJob,
    getJobInstance,
    getJobInstanceLogs,
    retryJobInstance,
    terminateJobInstance,
} from '@/api/DataworksApi';

const { Text } = Typography;

type LogViewMode = 'INSTANCE_OUTPUT' | 'REMOTE_LOG';

const isScriptInstance = (instance?: JobInstanceDTO | null) => {
    return instance?.engineType === 'SHELL' || instance?.engineType === 'PYTHON';
};

const buildScriptLogData = (instance: JobInstanceDTO): JobInstanceLogDTO => {
    const resultData = instance.resultData || '';
    const errorMessage = instance.errorMessage || '';
    const logs = resultData && errorMessage
        ? `${resultData}\n\n[ERROR]\n${errorMessage}`
        : resultData || errorMessage;

    return {
        instanceId: instance.id,
        deploymentName: instance.applicationName || '',
        namespace: instance.applicationNamespace || '',
        role: 'ALL',
        tailLines: 0,
        pods: [],
        logs,
        message: instance.status === 'FAILED' ? '脚本执行失败' : '脚本输出',
    };
};

const sortInstancesByCreatedAtDesc = (data: JobInstanceDTO[]) => {
    return [...data].sort((left, right) => {
        const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
        const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
        return rightTime - leftTime;
    });
};

/**
 * 作业实例列表页面
 *
 * <p>独立页面，展示某个 Job 的所有执行实例（JobInstance）。
 * 对标 Spark 的 Job → Task 实例概念，Flink 任务同样以 JobInstance 记录每次执行快照。</p>
 */
const JobInstancePage: React.FC = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();

    const [job, setJob] = useState<JobDTO | null>(null);
    const [loading, setLoading] = useState(false);
    const [instances, setInstances] = useState<JobInstanceDTO[]>([]);
    const [total, setTotal] = useState(0);
    const [current, setCurrent] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

    const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
    const [detailInstance, setDetailInstance] = useState<JobInstanceDTO | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [logLoading, setLogLoading] = useState(false);
    const [logData, setLogData] = useState<JobInstanceLogDTO | null>(null);
    const [logRole, setLogRole] = useState<JobLogRole>('ALL');
    const [logTailLines, setLogTailLines] = useState(500);
    const [logError, setLogError] = useState<string | null>(null);
    const [logViewMode, setLogViewMode] = useState<LogViewMode>('INSTANCE_OUTPUT');
    const instanceOutputMode = logViewMode === 'INSTANCE_OUTPUT' && isScriptInstance(detailInstance);
    const remoteLogMode = logViewMode === 'REMOTE_LOG';

    // 加载作业信息
    const loadJob = useCallback(async () => {
        if (!jobId) return;
        try {
            const data = await getJob(jobId);
            setJob(data);
        } catch {
            // 错误由拦截器处理
        }
    }, [jobId]);

    // 加载实例列表
    const loadInstances = useCallback(async (page: number, size: number, status?: string) => {
        if (!jobId) return;
        setLoading(true);
        try {
            const resp = await pageJobInstances(jobId, {
                current: page,
                size: size,
                status: status,
            });
            setInstances(sortInstancesByCreatedAtDesc(resp.data || []));
            setTotal(Number(resp.total) || 0);
        } catch {
            // 错误由拦截器处理
        } finally {
            setLoading(false);
        }
    }, [jobId]);

    useEffect(() => {
        loadJob();
    }, [loadJob]);

    useEffect(() => {
        loadInstances(current, pageSize, statusFilter);
    }, [loadInstances, current, pageSize, statusFilter]);

    // 查看详情
    const handleViewDetail = async (instanceId: string) => {
        setDetailLoading(true);
        setDetailDrawerOpen(true);
        setLogData(null);
        setLogError(null);
        setLogViewMode('INSTANCE_OUTPUT');
        try {
            const data = await getJobInstance(instanceId);
            setDetailInstance(data);
            if (isScriptInstance(data)) {
                setLogData(buildScriptLogData(data));
            }
        } catch {
            setDetailDrawerOpen(false);
        } finally {
            setDetailLoading(false);
        }
    };

    // 加载实例日志
    const loadInstanceLogs = async (instanceId: string, role: JobLogRole = logRole, tailLines: number = logTailLines) => {
        setLogLoading(true);
        setLogError(null);
        try {
            const data = await getJobInstanceLogs(instanceId, {
                role,
                tailLines,
                previous: false,
            });
            setLogData(data);
        } catch (e: any) {
            const errMsg = e?.message || '获取日志失败';
            setLogData(null);
            setLogError(errMsg);
        } finally {
            setLogLoading(false);
        }
    };

    // 加载脚本实例日志
    const loadScriptInstanceLogs = async (instanceId: string) => {
        setLogLoading(true);
        setLogError(null);
        try {
            const data = await getJobInstance(instanceId);
            setDetailInstance(data);
            setLogData(buildScriptLogData(data));
        } catch (e: any) {
            const errMsg = e?.message || '获取脚本输出失败';
            setLogData(null);
            setLogError(errMsg);
        } finally {
            setLogLoading(false);
        }
    };

    // 查看日志
    const handleViewLogs = async (record: JobInstanceDTO) => {
        setDetailLoading(true);
        setDetailDrawerOpen(true);
        setDetailInstance(record);
        setLogData(null);
        setLogError(null);
        setLogViewMode('REMOTE_LOG');
        try {
            const data = await getJobInstance(record.id);
            setDetailInstance(data);
            await loadInstanceLogs(record.id, logRole, logTailLines);
        } catch {
            setDetailDrawerOpen(false);
        } finally {
            setDetailLoading(false);
        }
    };

    // 重试
    const handleRetry = async (instanceId: string) => {
        try {
            await retryJobInstance(instanceId);
            message.success('已重新执行');
            loadInstances(current, pageSize, statusFilter);
        } catch {
            // 错误由拦截器处理
        }
    };

    // 终止
    const handleTerminate = async (instanceId: string) => {
        try {
            await terminateJobInstance(instanceId);
            message.success('已终止');
            loadInstances(current, pageSize, statusFilter);
        } catch {
            // 错误由拦截器处理
        }
    };

    // 复制日志内容
    const handleCopyLogs = async () => {
        const logs = logData?.logs || '';
        if (!logs) return;
        try {
            await navigator.clipboard.writeText(logs);
            message.success('日志已复制');
        } catch {
            message.error('复制失败');
        }
    };

    const statusConfig: Record<string, { color: string; label: string }> = {
        RUNNING: { color: 'processing', label: '运行中' },
        SUCCESS: { color: 'success', label: '成功' },
        FAILED: { color: 'error', label: '失败' },
    };

    const columns = [
        {
            title: '实例ID',
            dataIndex: 'id',
            key: 'id',
            width: 120,
            render: (id: string) => <Text copyable={{ text: id }} ellipsis style={{ maxWidth: 100 }}>{id}</Text>,
        },
        {
            title: '作业名称',
            dataIndex: 'jobName',
            key: 'jobName',
            width: 160,
            ellipsis: true,
        },
        {
            title: '引擎',
            dataIndex: 'engineType',
            key: 'engineType',
            width: 100,
            render: (type: string) => <Tag>{type}</Tag>,
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: string) => {
                const cfg = statusConfig[status] || { color: 'default', label: status };
                return <Tag color={cfg.color}>{cfg.label}</Tag>;
            },
        },
        {
            title: '耗时',
            dataIndex: 'costTimeMs',
            key: 'costTimeMs',
            width: 100,
            render: (ms?: number) => ms ? `${ms}ms` : '-',
        },
        {
            title: '执行时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 170,
            render: (t?: string) => t || '-',
        },
        {
            title: '操作',
            key: 'action',
            width: 180,
            fixed: 'right' as const,
            render: (_: any, record: JobInstanceDTO) => (
                <Space size="small">
                    <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record.id)}>
                        详情
                    </Button>
                    <Button type="text" size="small" icon={<FileTextOutlined />} onClick={() => handleViewLogs(record)}>
                        日志
                    </Button>
                    <Button type="text" size="small" icon={<PlayCircleOutlined />} onClick={() => handleRetry(record.id)}>
                        重试
                    </Button>
                    {record.status === 'RUNNING' && (
                        <Popconfirm
                            title="终止实例"
                            description="确定要终止该运行中实例吗？"
                            onConfirm={() => handleTerminate(record.id)}
                            okText="终止"
                            cancelText="取消"
                        >
                            <Button type="text" size="small" danger icon={<StopOutlined />}>
                                终止
                            </Button>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div style={{ height: '100%', flex: 1, display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
            {/* 顶部工具栏 */}
            <div style={{
                height: 48,
                background: '#fff',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                gap: 12,
                flexShrink: 0,
            }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/data-work')}>
                    返回
                </Button>
                <span style={{ fontWeight: 600, fontSize: 14 }}>
                    {job?.name || '作业'} — 实例列表
                </span>
                <Tag color={job?.engineType === 'SPARK' ? 'blue' : 'purple'}>
                    {job?.engineType}
                </Tag>
                <div style={{ flex: 1 }} />
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={() => loadInstances(current, pageSize, statusFilter)}>
                        刷新
                    </Button>
                </Space>
            </div>

            {/* 内容区 */}
            <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
                <Card
                    title={
                        <Space>
                            <span>实例列表</span>
                            <Space size={4}>
                                {(['全部', 'RUNNING', 'SUCCESS', 'FAILED'] as const).map((s) => (
                                    <Button
                                        key={s}
                                        type={statusFilter === s || (s === '全部' && !statusFilter) ? 'primary' : 'text'}
                                        size="small"
                                        onClick={() => {
                                            setStatusFilter(s === '全部' ? undefined : s);
                                            setCurrent(1);
                                        }}
                                    >
                                        {s === '全部' ? '全部' : statusConfig[s]?.label || s}
                                    </Button>
                                ))}
                            </Space>
                        </Space>
                    }
                    variant="borderless"
                >
                    <Spin spinning={loading}>
                        <Table
                            dataSource={instances}
                            columns={columns}
                            rowKey="id"
                            pagination={false}
                            size="small"
                            locale={{ emptyText: <Empty description="暂无实例" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                            scroll={{ x: 800 }}
                        />
                        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                            <Pagination
                                current={current}
                                pageSize={pageSize}
                                total={total}
                                showSizeChanger
                                showTotal={(t) => `共 ${t} 条`}
                                onChange={(p, ps) => {
                                    setCurrent(p);
                                    if (ps !== pageSize) setPageSize(ps);
                                }}
                            />
                        </div>
                    </Spin>
                </Card>
            </div>

            {/* 详情 Drawer */}
            <Drawer
                title={remoteLogMode ? '运行日志' : '实例详情'}
                width={600}
                open={detailDrawerOpen}
                onClose={() => setDetailDrawerOpen(false)}
            >
                <Spin spinning={detailLoading}>
                    {detailInstance && remoteLogMode ? (
                        <Space direction="vertical" style={{ width: '100%' }} size="middle">
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                <Button
                                    size="small"
                                    icon={<CopyOutlined />}
                                    disabled={!logData?.logs}
                                    onClick={handleCopyLogs}
                                >
                                    复制
                                </Button>
                                <Button
                                    size="small"
                                    icon={<ReloadOutlined />}
                                    loading={logLoading}
                                    onClick={() => loadInstanceLogs(detailInstance.id, logRole, logTailLines)}
                                >
                                    刷新
                                </Button>
                            </div>
                            <Spin spinning={logLoading}>
                                {logError ? (
                                    <Alert type="error" showIcon message={logError} />
                                ) : logData?.logs ? (
                                    <pre style={{
                                        background: '#111827',
                                        color: '#e5e7eb',
                                        borderRadius: 4,
                                        padding: 12,
                                        fontSize: 12,
                                        overflow: 'auto',
                                        maxHeight: 'calc(100vh - 180px)',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                    }}>
                                        {logData.logs}
                                    </pre>
                                ) : (
                                    <Empty description="暂无日志" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                )}
                            </Spin>
                        </Space>
                    ) : detailInstance && (
                        <Space direction="vertical" style={{ width: '100%' }} size="large">
                            <div>
                                <Text type="secondary">实例ID</Text>
                                <div><Text copyable>{detailInstance.id}</Text></div>
                            </div>
                            <div>
                                <Text type="secondary">作业ID</Text>
                                <div><Text copyable>{detailInstance.jobId}</Text></div>
                            </div>
                            <div>
                                <Text type="secondary">作业名称</Text>
                                <div>{detailInstance.jobName}</div>
                            </div>
                            <div>
                                <Text type="secondary">引擎类型</Text>
                                <div><Tag>{detailInstance.engineType}</Tag></div>
                            </div>
                            <div>
                                <Text type="secondary">执行状态</Text>
                                <div>
                                    <Tag color={statusConfig[detailInstance.status]?.color}>
                                        {statusConfig[detailInstance.status]?.label}
                                    </Tag>
                                </div>
                            </div>
                            <div>
                                <Text type="secondary">耗时</Text>
                                <div>{detailInstance.costTimeMs ? `${detailInstance.costTimeMs}ms` : '-'}</div>
                            </div>
                            {detailInstance.applicationName && (
                                <div>
                                    <Text type="secondary">Flink Application</Text>
                                    <div><Text copyable>{detailInstance.applicationName}</Text></div>
                                </div>
                            )}
                            {detailInstance.applicationNamespace && (
                                <div>
                                    <Text type="secondary">Application Namespace</Text>
                                    <div>{detailInstance.applicationNamespace}</div>
                                </div>
                            )}
                            {detailInstance.jobManagerPodName && (
                                <div>
                                    <Text type="secondary">JobManager Pod</Text>
                                    <div><Text copyable>{detailInstance.jobManagerPodName}</Text></div>
                                </div>
                            )}
                            {detailInstance.taskManagerPodNames && (
                                <div>
                                    <Text type="secondary">TaskManager Pods</Text>
                                    <pre style={{
                                        background: '#f6f8fa',
                                        borderRadius: 4,
                                        padding: 8,
                                        fontSize: 12,
                                        overflow: 'auto',
                                        maxHeight: 120,
                                    }}>
                                        {detailInstance.taskManagerPodNames}
                                    </pre>
                                </div>
                            )}
                            <div>
                                <Text type="secondary">执行时间</Text>
                                <div>{detailInstance.createdAt || '-'}</div>
                            </div>
                            {detailInstance.errorMessage && (
                                <div>
                                    <Text type="secondary">错误信息</Text>
                                    <div style={{
                                        background: '#fff2f0',
                                        border: '1px solid #ffccc7',
                                        borderRadius: 4,
                                        padding: 8,
                                        color: '#cf1322',
                                        fontSize: 12,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-all',
                                    }}>
                                        {detailInstance.errorMessage}
                                    </div>
                                </div>
                            )}
                            <div>
                                <Text type="secondary">任务内容</Text>
                                <pre style={{
                                    background: '#f6f8fa',
                                    borderRadius: 4,
                                    padding: 12,
                                    fontSize: 12,
                                    overflow: 'auto',
                                    maxHeight: 300,
                                }}>
                                    {detailInstance.content}
                                </pre>
                            </div>
                            {detailInstance.resultData && (
                                <div>
                                    <Text type="secondary">结果数据</Text>
                                    <pre style={{
                                        background: '#f6f8fa',
                                        borderRadius: 4,
                                        padding: 12,
                                        fontSize: 12,
                                        overflow: 'auto',
                                        maxHeight: 300,
                                    }}>
                                        {detailInstance.resultData}
                                    </pre>
                                </div>
                            )}
                            <div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 12,
                                    marginBottom: 8,
                                }}>
                                    <Text type="secondary">
                                        {instanceOutputMode ? '脚本输出' : '运行日志'}
                                    </Text>
                                    <Space size="small">
                                        {!instanceOutputMode && (
                                            <>
                                                <Select
                                                    size="small"
                                                    value={logRole}
                                                    style={{ width: 132 }}
                                                    options={[
                                                        { label: '全部', value: 'ALL' },
                                                        { label: 'JobManager', value: 'JOB_MANAGER' },
                                                        { label: 'TaskManager', value: 'TASK_MANAGER' },
                                                    ]}
                                                    onChange={(value: JobLogRole) => {
                                                        setLogRole(value);
                                                        if (detailInstance) {
                                                            loadInstanceLogs(detailInstance.id, value, logTailLines);
                                                        }
                                                    }}
                                                />
                                                <InputNumber
                                                    size="small"
                                                    min={1}
                                                    max={5000}
                                                    value={logTailLines}
                                                    style={{ width: 96 }}
                                                    onChange={(value) => setLogTailLines(value || 500)}
                                                />
                                            </>
                                        )}
                                        <Button
                                            size="small"
                                            icon={<ReloadOutlined />}
                                            loading={logLoading}
                                            onClick={() => {
                                                if (!detailInstance) return;
                                                if (logViewMode === 'INSTANCE_OUTPUT' && isScriptInstance(detailInstance)) {
                                                    loadScriptInstanceLogs(detailInstance.id);
                                                    return;
                                                }
                                                loadInstanceLogs(detailInstance.id, logRole, logTailLines);
                                            }}
                                        >
                                            刷新
                                        </Button>
                                    </Space>
                                </div>
                                <Spin spinning={logLoading}>
                                    {logError ? (
                                        <Alert type="error" showIcon message={logError} />
                                    ) : logData ? (
                                        <>
                                            <div style={{ marginBottom: 8 }}>
                                                <Space size={4} wrap>
                                                    {instanceOutputMode ? (
                                                        <Tag color={detailInstance?.status === 'FAILED' ? 'error' : 'blue'}>
                                                            {logData.message || '脚本输出'}
                                                        </Tag>
                                                    ) : (
                                                        <>
                                                            <Tag>{logData.namespace || '-'}</Tag>
                                                            <Tag color="purple">{logData.deploymentName || '-'}</Tag>
                                                            <Tag color={logData.pods?.length ? 'blue' : 'default'}>
                                                                {logData.message || `Pod ${logData.pods?.length || 0} 个`}
                                                            </Tag>
                                                        </>
                                                    )}
                                                </Space>
                                            </div>
                                            {logData.logs ? (
                                                <pre style={{
                                                    background: '#111827',
                                                    color: '#e5e7eb',
                                                    borderRadius: 4,
                                                    padding: 12,
                                                    fontSize: 12,
                                                    overflow: 'auto',
                                                    maxHeight: 420,
                                                    whiteSpace: 'pre-wrap',
                                                    wordBreak: 'break-word',
                                                }}>
                                                    {logData.logs}
                                                </pre>
                                            ) : (
                                                <Empty
                                                    description={instanceOutputMode ? '暂无脚本输出' : '暂无日志'}
                                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                />
                                            )}
                                        </>
                                    ) : (
                                        <Empty
                                            description={instanceOutputMode ? '点击刷新加载脚本输出' : '点击刷新加载日志'}
                                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                                        />
                                    )}
                                </Spin>
                            </div>
                        </Space>
                    )}
                </Spin>
            </Drawer>
        </div>
    );
};

export default JobInstancePage;
