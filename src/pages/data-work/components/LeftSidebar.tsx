import React, { useCallback, useEffect, useState } from 'react';
import {
    Empty,
    Input,
    List,
    Spin,
    Tabs,
    Tag,
    Typography,
    Tree,
    Button,
    Dropdown,
} from 'antd';
import {
    DatabaseOutlined,
    HistoryOutlined,
    PlusOutlined,
    FolderOutlined,
    FileOutlined,
    LinkOutlined,
    ProjectOutlined,
    CodeOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { JobDTO, pageJobs, pageAllJobInstances, pageWorkflows, WorkflowDTO } from '@/api/DataworksApi.ts';
import { pageJobInstances, JobInstanceDTO } from '@/api/DataworksApi.ts';
import Sidebar, { TableInfoWithColumns } from '@/pages/sql-editor/components/Sidebar';

const { Text } = Typography;
const { Search } = Input;

interface LeftSidebarProps {
    currentSql?: string;
    currentTaskId?: string;
    onTableSelect: (table: TableInfoWithColumns, shouldAppend: boolean) => void;
    onTableListLoaded?: (tables: Array<{ name: string; title: string }>) => void;
    onTaskSelect: (task: JobDTO) => void;
    onHistorySelect?: (record: JobInstanceDTO) => void;
    onNewTask: (nodeType?: JobDTO['nodeType'] | 'WORKFLOW') => void;
    refreshTrigger?: number;
}

// 目录树节点
interface TreeNode {
    key: string;
    title: string;
    type: 'folder' | 'job' | 'workflow';
    children?: TreeNode[];
    task?: JobDTO;
    workflow?: WorkflowDTO;
    icon?: React.ReactNode;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
    currentSql = '',
    currentTaskId,
    onTableSelect,
    onTableListLoaded,
    onTaskSelect,
    onHistorySelect,
    onNewTask,
    refreshTrigger,
}) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('tasks');

    // 任务列表状态
    const [taskLoading, setTaskLoading] = useState(false);
    const [tasks, setTasks] = useState<JobDTO[]>([]);
    const [workflows, setWorkflows] = useState<WorkflowDTO[]>([]);
    const [taskSearch, setTaskSearch] = useState('');

    // 执行历史状态
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyRecords, setHistoryRecords] = useState<JobInstanceDTO[]>([]);

    const createNodeMenuItems = [
        {
            key: 'SPARK_SQL',
            icon: <CodeOutlined />,
            label: 'SparkSQL',
        },
        {
            key: 'FLINK_SQL',
            icon: <ThunderboltOutlined />,
            label: 'FlinkSQL',
        },
        {
            key: 'SPARK_BATCH',
            icon: <CodeOutlined />,
            label: 'Spark批任务',
        },
        {
            key: 'FLINK_BATCH',
            icon: <ThunderboltOutlined />,
            label: 'Flink批任务',
        },
        {
            key: 'SHELL',
            icon: <CodeOutlined />,
            label: 'Shell',
        },
        {
            key: 'PYTHON',
            icon: <CodeOutlined />,
            label: 'Python',
        },
        {
            type: 'divider' as const,
        },
        {
            key: 'WORKFLOW',
            icon: <ProjectOutlined />,
            label: '工作流',
        },
    ];

    // 加载任务列表
    const loadTasks = useCallback(async (name?: string) => {
        setTaskLoading(true);
        try {
            const [jobResult, workflowResult] = await Promise.allSettled([
                pageJobs({
                    current: 1,
                    size: 50,
                    name: name || undefined,
                }),
                pageWorkflows({
                    current: 1,
                    size: 50,
                    name: name || undefined,
                }),
            ]);
            setTasks(jobResult.status === 'fulfilled' ? jobResult.value.data || [] : []);
            setWorkflows(workflowResult.status === 'fulfilled' ? workflowResult.value.data || [] : []);
        } catch {
            // 错误由拦截器处理
        } finally {
            setTaskLoading(false);
        }
    }, []);

    // 加载执行历史
    const loadHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            let resp;
            if (currentTaskId) {
                resp = await pageJobInstances(currentTaskId, { current: 1, size: 20 });
            } else {
                resp = await pageAllJobInstances({ current: 1, size: 20 });
            }
            setHistoryRecords(resp.data || []);
        } catch {
            // 错误由拦截器处理
        } finally {
            setHistoryLoading(false);
        }
    }, [currentTaskId]);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    useEffect(() => {
        if (activeTab === 'history') {
            loadHistory();
        }
    }, [activeTab, loadHistory]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadTasks(taskSearch);
        }, 300);
        return () => clearTimeout(timer);
    }, [taskSearch, loadTasks]);

    useEffect(() => {
        if (refreshTrigger !== undefined) {
            loadTasks(taskSearch);
        }
    }, [refreshTrigger, loadTasks, taskSearch]);

    const workspaceItems = [
        ...tasks.map(task => ({
            id: task.id,
            name: task.name,
            status: task.status,
            type: 'job' as const,
            task,
        })),
        ...workflows.map(workflow => ({
            id: workflow.id,
            name: workflow.name,
            status: workflow.status,
            type: 'workflow' as const,
            workflow,
        })),
    ];

    const buildWorkspaceChildren = (status: JobDTO['status']): TreeNode[] => workspaceItems
        .filter(item => item.status === status)
        .map(item => ({
            key: `${item.type}-${item.id}`,
            title: item.name,
            type: item.type,
            task: item.task,
            workflow: item.workflow,
        }));

    // 将工作空间对象转换为目录树（按状态分组）
    const taskTreeData: TreeNode[] = [
        {
            key: 'dev',
            title: `开发中的作业 (${workspaceItems.filter(t => t.status === 'DRAFT').length})`,
            type: 'folder',
            children: buildWorkspaceChildren('DRAFT'),
        },
        {
            key: 'online',
            title: `生产发布 (${workspaceItems.filter(t => t.status === 'ONLINE').length})`,
            type: 'folder',
            children: buildWorkspaceChildren('ONLINE'),
        },
        {
            key: 'offline',
            title: `已下线 (${workspaceItems.filter(t => t.status === 'OFFLINE').length})`,
            type: 'folder',
            children: buildWorkspaceChildren('OFFLINE'),
        },
    ];

    // 处理树节点选择
    const handleTreeSelect = (_selectedKeys: React.Key[], info: Parameters<NonNullable<React.ComponentProps<typeof Tree>['onSelect']>>[1]) => {
        const node = info.node as unknown as TreeNode;
        if (node.type === 'job' && node.task) {
            onTaskSelect(node.task);
            return;
        }
        if (node.type === 'workflow' && node.workflow) {
            navigate(`/data-work/workflows/${node.workflow.id}`);
        }
    };

    // 节点图标映射
    const nodeIcon = (node: TreeNode) => {
        if (node.type === 'folder') {
            if (node.key === 'dev') return <FolderOutlined style={{ color: '#faad14', fontSize: 14 }} />;
            if (node.key === 'online') return <FolderOutlined style={{ color: '#52c41a', fontSize: 14 }} />;
            return <FolderOutlined style={{ color: '#999', fontSize: 14 }} />;
        }
        if (node.type === 'workflow') {
            if (node.workflow?.status === 'ONLINE') return <ProjectOutlined style={{ color: '#52c41a', fontSize: 14 }} />;
            if (node.workflow?.status === 'OFFLINE') return <ProjectOutlined style={{ color: '#999', fontSize: 14 }} />;
            return <ProjectOutlined style={{ color: '#1890ff', fontSize: 14 }} />;
        }
        if (node.task) {
            if (node.task.status === 'DRAFT') return <FileOutlined style={{ color: '#1890ff', fontSize: 14 }} />;
            if (node.task.status === 'ONLINE') return <FileOutlined style={{ color: '#52c41a', fontSize: 14 }} />;
            return <FileOutlined style={{ color: '#999', fontSize: 14 }} />;
        }
        return null;
    };

    // 自定义树节点标题：统一渲染 icon + title，确保在同一行
    const titleRender = (nodeData: TreeNode) => {
        const node = nodeData as TreeNode;
        if ((node.type === 'job' && node.task) || (node.type === 'workflow' && node.workflow)) {
            return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
                        {nodeIcon(node)}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {node.title}
                        </span>
                        {node.type === 'workflow' && (
                            <Tag color="processing" style={{ marginInlineStart: 2, marginInlineEnd: 0 }}>工作流</Tag>
                        )}
                    </div>
                    {node.type === 'job' && (
                        <Button
                            type="text"
                            size="small"
                            style={{ padding: '0 4px', minWidth: 20, height: 20, flexShrink: 0 }}
                            icon={<LinkOutlined style={{ fontSize: 11 }} />}
                            title="查看实例"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/data-work/jobs/${node.task!.id}/instances`);
                            }}
                        />
                    )}
                </div>
            );
        }
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {nodeIcon(node)}
                <span>{node.title}</span>
            </div>
        );
    };

    const tabItems = [
        {
            key: 'tasks',
            label: (
                <span style={{ whiteSpace: 'nowrap' }}>
                    <ProjectOutlined style={{ marginRight: 4 }} />
                    开发
                </span>
            ),
            children: (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid #edf0f5', background: '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2329' }}>默认工作空间</div>
                                <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>DataWorks 开发目录</div>
                            </div>
                            <Dropdown
                                menu={{
                                    items: createNodeMenuItems,
                                    onClick: ({ key }) => onNewTask(key as JobDTO['nodeType'] | 'WORKFLOW'),
                                }}
                                trigger={['click']}
                                placement="bottomRight"
                            >
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    size="small"
                                />
                            </Dropdown>
                        </div>
                        <Search
                            placeholder="搜索任务"
                            allowClear
                            value={taskSearch}
                            onChange={(e) => setTaskSearch(e.target.value)}
                            size="small"
                        />
                    </div>
                    <div style={{ flex: 1, overflow: 'auto', padding: '8px 10px' }}>
                        <Spin spinning={taskLoading}>
                            {workspaceItems.length > 0 ? (
                                <Tree
                                    treeData={taskTreeData}
                                    defaultExpandAll
                                    onSelect={handleTreeSelect}
                                    selectedKeys={currentTaskId ? [`job-${currentTaskId}`] : []}
                                    style={{ fontSize: 13 }}
                                    titleRender={titleRender}
                                />
                            ) : (
                                <Empty description="暂无任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            )}
                        </Spin>
                    </div>
                </div>
            ),
        },
        {
            key: 'tables',
            label: (
                <span style={{ whiteSpace: 'nowrap' }}>
                    <DatabaseOutlined style={{ marginRight: 4 }} />
                    数据
                </span>
            ),
            children: (
                <div style={{ height: '100%' }}>
                    <Sidebar
                        currentSql={currentSql}
                        onTableSelect={onTableSelect}
                        onHistorySelect={() => {}}
                        onFavoriteSelect={() => {}}
                        onTableListLoaded={onTableListLoaded}
                    />
                </div>
            ),
        },
        {
            key: 'history',
            label: (
                <span style={{ whiteSpace: 'nowrap' }}>
                    <HistoryOutlined style={{ marginRight: 4 }} />
                    运维
                </span>
            ),
            children: (
                <div style={{ padding: '0 12px', height: '100%', overflow: 'auto' }}>
                    <Spin spinning={historyLoading}>
                        {historyRecords.length > 0 ? (
                            <List
                                size="small"
                                dataSource={historyRecords}
                                renderItem={(item) => (
                                    <List.Item
                                        style={{ cursor: 'pointer', padding: '8px 0' }}
                                        onClick={() => onHistorySelect?.(item)}
                                    >
                                        <List.Item.Meta
                                            title={
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Text ellipsis style={{ maxWidth: 140, fontSize: 12 }}>
                                                        {item.jobName}
                                                    </Text>
                                                    <Tag
                                                        color={item.status === 'SUCCESS' ? 'success' : item.status === 'FAILED' ? 'error' : 'processing'}
                                                        style={{ fontSize: 10 }}
                                                    >
                                                        {item.status}
                                                    </Tag>
                                                </div>
                                            }
                                            description={
                                                <span style={{ fontSize: 11 }}>
                                                    <span>{item.costTimeMs}ms</span>
                                                    <span style={{ margin: '0 4px' }}>|</span>
                                                    <Text type="secondary">{item.createdAt?.slice(0, 16)}</Text>
                                                </span>
                                            }
                                        />
                                    </List.Item>
                                )}
                            />
                        ) : (
                            <Empty
                                description="暂无执行记录"
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                        )}
                    </Spin>
                </div>
            ),
        },
    ];

    return (
        <div
            className="sql-editor-sidebar"
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: '#fff',
                borderRight: '1px solid #f0f0f0',
            }}
        >
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
                size="small"
                tabBarGutter={16}
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                tabBarStyle={{ marginBottom: 0, padding: '0 2px', flexShrink: 0 }}
            />
        </div>
    );
};

export default LeftSidebar;
