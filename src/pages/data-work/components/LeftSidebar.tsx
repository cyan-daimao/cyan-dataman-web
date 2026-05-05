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
} from '@ant-design/icons';
import { DataWorkTaskDTO, pageDataWorkTasks } from '@/api/DataworksApi.ts';
import { pageTaskExecutions, ExecutionRecordDTO } from '@/api/DataworksApi.ts';
import Sidebar, { TableInfoWithColumns } from '@/pages/sql-editor/components/Sidebar';

const { Text } = Typography;
const { Search } = Input;

interface LeftSidebarProps {
    currentSql?: string;
    currentTaskId?: string;
    onTableSelect: (table: TableInfoWithColumns, shouldAppend: boolean) => void;
    onTableListLoaded?: (tables: Array<{ name: string; title: string }>) => void;
    onTaskSelect: (task: DataWorkTaskDTO) => void;
    onHistorySelect?: (record: ExecutionRecordDTO) => void;
    onNewTask: () => void;
}

// 目录树节点
interface TreeNode {
    key: string;
    title: string;
    type: 'folder' | 'task';
    children?: TreeNode[];
    task?: DataWorkTaskDTO;
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
}) => {
    const [activeTab, setActiveTab] = useState('tasks');

    // 任务列表状态
    const [taskLoading, setTaskLoading] = useState(false);
    const [tasks, setTasks] = useState<DataWorkTaskDTO[]>([]);
    const [taskSearch, setTaskSearch] = useState('');

    // 执行历史状态
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyRecords, setHistoryRecords] = useState<ExecutionRecordDTO[]>([]);

    // 加载任务列表
    const loadTasks = useCallback(async (name?: string) => {
        setTaskLoading(true);
        try {
            const resp = await pageDataWorkTasks({
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
            if (!currentTaskId) {
                setHistoryRecords([]);
                return;
            }
            const resp = await pageTaskExecutions(currentTaskId, { current: 1, size: 20 });
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
                                description={currentTaskId ? '暂无执行记录' : '请先选择或创建任务'}
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
