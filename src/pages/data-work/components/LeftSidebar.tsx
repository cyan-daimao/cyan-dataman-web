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
} from 'antd';
import {
    DatabaseOutlined,
    FileTextOutlined,
    HistoryOutlined,
    PlusOutlined,
    FolderOutlined,
    FolderOpenOutlined,
    FileOutlined,
    LinkOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { JobDTO, pageJobs, pageAllJobInstances } from '@/api/DataworksApi.ts';
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
    onNewTask: () => void;
    refreshTrigger?: number;
}

// 目录树节点
interface TreeNode {
    key: string;
    title: string;
    type: 'folder' | 'task';
    children?: TreeNode[];
    task?: JobDTO;
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
    const [taskSearch, setTaskSearch] = useState('');

    // 执行历史状态
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyRecords, setHistoryRecords] = useState<JobInstanceDTO[]>([]);

    // 加载任务列表
    const loadTasks = useCallback(async (name?: string) => {
        setTaskLoading(true);
        try {
            const resp = await pageJobs({
                current: 1,
                size: 50,
                name: name || undefined,
            });
            setTasks(resp.data || []);
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

    // 将任务列表转换为目录树（按状态分组）
    const taskTreeData: TreeNode[] = [
        {
            key: 'draft',
            title: '草稿',
            type: 'folder',
            icon: <FolderOutlined style={{ color: '#faad14' }} />,
            children: tasks
                .filter(t => t.status === 'DRAFT')
                .map(t => ({
                    key: t.id,
                    title: t.name,
                    type: 'task' as const,
                    task: t,
                    icon: <FileOutlined style={{ color: '#1890ff' }} />,
                })),
        },
        {
            key: 'online',
            title: '已上线',
            type: 'folder',
            icon: <FolderOutlined style={{ color: '#52c41a' }} />,
            children: tasks
                .filter(t => t.status === 'ONLINE')
                .map(t => ({
                    key: t.id,
                    title: t.name,
                    type: 'task' as const,
                    task: t,
                    icon: <FileOutlined style={{ color: '#52c41a' }} />,
                })),
        },
        {
            key: 'offline',
            title: '已下线',
            type: 'folder',
            icon: <FolderOutlined style={{ color: '#999' }} />,
            children: tasks
                .filter(t => t.status === 'OFFLINE')
                .map(t => ({
                    key: t.id,
                    title: t.name,
                    type: 'task' as const,
                    task: t,
                    icon: <FileOutlined style={{ color: '#999' }} />,
                })),
        },
    ];

    // 处理树节点选择
    const handleTreeSelect = (selectedKeys: React.Key[], info: any) => {
        const node = info.node as TreeNode;
        if (node.type === 'task' && node.task) {
            onTaskSelect(node.task);
        }
    };

    // 自定义树节点标题：任务节点右侧增加"实例"跳转链接
    const titleRender = (nodeData: any) => {
        const node = nodeData as TreeNode;
        if (node.type === 'task' && node.task) {
            return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {node.title}
                    </span>
                    <Button
                        type="text"
                        size="small"
                        style={{ padding: '0 4px', minWidth: 20, height: 20, marginLeft: 4 }}
                        icon={<LinkOutlined style={{ fontSize: 11 }} />}
                        title="查看实例"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/data-work/jobs/${node.task!.id}/instances`);
                        }}
                    />
                </div>
            );
        }
        return <span>{node.title}</span>;
    };

    const tabItems = [
        {
            key: 'tasks',
            label: (
                <span style={{ whiteSpace: 'nowrap' }}>
                    <FolderOutlined style={{ marginRight: 4 }} />
                    项目目录
                </span>
            ),
            children: (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
                        <Search
                            placeholder="搜索任务"
                            allowClear
                            value={taskSearch}
                            onChange={(e) => setTaskSearch(e.target.value)}
                            size="small"
                        />
                    </div>
                    <div style={{ padding: '8px 12px' }}>
                        <Button
                            type="dashed"
                            block
                            icon={<PlusOutlined />}
                            size="small"
                            onClick={onNewTask}
                        >
                            新建任务
                        </Button>
                    </div>
                    <div style={{ flex: 1, overflow: 'auto', padding: '0 12px' }}>
                        <Spin spinning={taskLoading}>
                            {tasks.length > 0 ? (
                                <Tree
                                    treeData={taskTreeData}
                                    defaultExpandAll
                                    showIcon
                                    onSelect={handleTreeSelect}
                                    selectedKeys={currentTaskId ? [currentTaskId] : []}
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
                    数据表
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
                    执行历史
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
                                                        {item.taskName}
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
                tabBarGutter={0}
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                tabBarStyle={{ marginBottom: 0, padding: '0 2px', flexShrink: 0 }}
            />
        </div>
    );
};

export default LeftSidebar;
