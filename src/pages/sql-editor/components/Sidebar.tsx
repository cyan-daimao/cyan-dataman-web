import React, {useState, useEffect, useCallback, useMemo, useRef} from 'react';
import {
    Empty,
    Input,
    List,
    Space,
    Tabs,
    Table,
    Tree,
    TreeProps,
    Typography,
    Spin,
} from 'antd';
import {
    ClockCircleOutlined,
    DatabaseOutlined,
    DeleteOutlined,
    FileTextOutlined,
    HistoryOutlined,
    StarFilled,
    StarOutlined,
    TableOutlined,
    ColumnHeightOutlined
} from '@ant-design/icons';
import {getSubjectTableTree, getMetadataTableById, SubjectTableTreeDTO, ColumnVO} from '@/api/MetadataTableAPI.ts';
import {QueryHistory, FavoriteQuery} from '../types';

const {Text} = Typography;
const {Search} = Input;

// 表信息（包含字段）
export interface TableInfoWithColumns {
    name: string;
    tableId: string;
    catalog?: string;
    schema?: string;
    comment?: string;
    columns?: ColumnVO[];
}

interface SidebarProps {
    currentSql?: string;
    onTableSelect: (table: TableInfoWithColumns, shouldAppend: boolean) => void;
    onHistorySelect: (sql: string) => void;
    onFavoriteSelect: (sql: string) => void;
    onTableListLoaded?: (tables: Array<{name: string; title: string}>) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    currentSql = '',
    onTableSelect,
    onHistorySelect,
    onFavoriteSelect,
    onTableListLoaded
}) => {
    const [activeTab, setActiveTab] = useState('tables');
    const [searchValue, setSearchValue] = useState('');
    const [treeData, setTreeData] = useState<SubjectTableTreeDTO[]>([]);
    const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<QueryHistory[]>([]);
    const [favorites, setFavorites] = useState<FavoriteQuery[]>([]);
    
    // 表字段缓存
    const [tableColumnsCache, setTableColumnsCache] = useState<Record<string, ColumnVO[]>>({});
    const [loadingTableId, setLoadingTableId] = useState<string | null>(null);
    // 当前选中表的字段展示（下方表格）
    const [selectedTableInfo, setSelectedTableInfo] = useState<{name: string; tableId: string; schema?: string} | null>(null);
    // 字段面板高度（px）
    const [columnPanelHeight, setColumnPanelHeight] = useState(280);
    // 字段搜索值
    const [columnSearchValue, setColumnSearchValue] = useState('');
    // 拖动状态
    const isDragging = useRef(false);
    const startY = useRef(0);
    const startHeight = useRef(200);
    const containerRef = useRef<HTMLDivElement>(null);

    // 加载主题树数据
    useEffect(() => {
        loadSubjectTree().then();
        loadHistory();
        loadFavorites();
    }, []);

    // 搜索防抖
    useEffect(() => {
        const timer = setTimeout(() => {
            loadSubjectTree(searchValue);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchValue]);

    const loadSubjectTree = async (content?: string) => {
        setLoading(true);
        try {
            const data = await getSubjectTableTree(content);
            setTreeData(data);
            // 展开所有节点
            const allKeys = collectAllKeys(data);
            setExpandedKeys(allKeys);
            // 收集所有表名通知编辑器
            if (onTableListLoaded) {
                const tables = collectAllTables(data);
                onTableListLoaded(tables);
            }
        } catch (error) {
            console.error('加载主题树失败:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadHistory = () => {
        const saved = localStorage.getItem('sql_history');
        if (saved) {
            setHistory(JSON.parse(saved));
        }
    };

    const loadFavorites = () => {
        const saved = localStorage.getItem('sql_favorites');
        if (saved) {
            setFavorites(JSON.parse(saved));
        }
    };

    const collectAllKeys = (nodes: SubjectTableTreeDTO[]): string[] => {
        const keys: string[] = [];
        const traverse = (items: SubjectTableTreeDTO[]) => {
            items.forEach(item => {
                keys.push(item.key);
                if (item.children) traverse(item.children);
            });
        };
        traverse(nodes);
        return keys;
    };

    // 收集所有表名（含 schema 前缀）及标题
    const collectAllTables = (nodes: SubjectTableTreeDTO[]): Array<{name: string; title: string}> => {
        const tables: Array<{name: string; title: string}> = [];
        const traverse = (items: SubjectTableTreeDTO[]) => {
            items.forEach(item => {
                if (item.type === 'table' && item.tableName) {
                    const displayName = item.schema
                        ? `${item.schema}.${item.tableName}`
                        : item.tableName;
                    tables.push({name: displayName, title: item.title || item.tableName});
                }
                if (item.children) traverse(item.children);
            });
        };
        traverse(nodes);
        return tables;
    };

    // 树选择事件
    const onTreeSelect: TreeProps['onSelect'] = (selectedKeys, info) => {
        const node = info.node as SubjectTableTreeDTO;
        // 只有表节点才触发选择
        if (node.type === 'table' && node.tableName) {
            handleTableClick(node);
        }
    };

    // 处理表点击 - 加载字段信息并在下方表格展示
    const handleTableClick = async (node: SubjectTableTreeDTO) => {
        if (!node.tableId) return;

        const tableName = node.tableName || node.title;
        const tableInfo = {
            name: tableName,
            tableId: node.tableId,
            schema: node.schema
        };

        // 设置当前选中的表（下方表格展示）
        setSelectedTableInfo(tableInfo);

        // 如果编辑器有内容，只加载字段信息展示，不修改 SQL
        const hasContent = currentSql.trim().length > 0;

        // 如果已经有缓存的字段信息，直接使用
        const cachedColumns = tableColumnsCache[node.tableId];
        if (cachedColumns) {
            if (!hasContent) {
                onTableSelect({
                    name: tableName,
                    tableId: node.tableId || '',
                    catalog: node.catalog,
                    schema: node.schema,
                    columns: cachedColumns
                }, false);
            }
            return;
        }

        // 从 API 加载字段信息
        setLoadingTableId(node.tableId);
        try {
            const tableDetail = await getMetadataTableById(node.tableId);
            const columns = tableDetail.table?.columns || [];

            // 缓存字段信息
            setTableColumnsCache(prev => ({
                ...prev,
                [node.tableId!]: columns
            }));

            // 只有编辑器为空时才生成 SELECT 语句
            if (!hasContent) {
                onTableSelect({
                    name: tableName,
                    tableId: node.tableId || '',
                    catalog: node.catalog,
                    schema: node.schema,
                    columns
                }, false);
            }
        } catch (error) {
            console.error('加载表字段失败:', error);
            if (!hasContent) {
                onTableSelect({
                    name: tableName,
                    tableId: node.tableId || '',
                    catalog: node.catalog,
                    schema: node.schema,
                    columns: []
                }, false);
            }
        } finally {
            setLoadingTableId(null);
        }
    };

    // 添加收藏
    const addToFavorites = (item: QueryHistory) => {
        const newFavorite: FavoriteQuery = {
            id: Date.now().toString(),
            name: item.sql.substring(0, 50) + (item.sql.length > 50 ? '...' : ''),
            sql: item.sql,
            createTime: new Date().toISOString()
        };
        const newFavorites = [newFavorite, ...favorites];
        setFavorites(newFavorites);
        localStorage.setItem('sql_favorites', JSON.stringify(newFavorites));
    };

    // 删除历史
    const deleteHistory = (id: string) => {
        const newHistory = history.filter(h => h.id !== id);
        setHistory(newHistory);
        localStorage.setItem('sql_history', JSON.stringify(newHistory));
    };

    // 删除收藏
    const deleteFavorite = (id: string) => {
        const newFavorites = favorites.filter(f => f.id !== id);
        setFavorites(newFavorites);
        localStorage.setItem('sql_favorites', JSON.stringify(newFavorites));
    };

    // 转换树数据为 Tree 组件格式（表节点不再展开字段子节点）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const convertToTreeData = useCallback((nodes: SubjectTableTreeDTO[]): any[] => {
        return nodes.map(node => {
            if (node.type === 'subject') {
                return {
                    key: node.key,
                    title: (
                        <span>
                            {node.title}
                        </span>
                    ),
                    icon: <DatabaseOutlined style={{color: '#1890ff'}}/>,
                    children: node.children ? convertToTreeData(node.children) : undefined
                };
            } else {
                // 表节点
                const displayName = node.schema
                    ? `${node.schema}.${node.tableName || node.title}`
                    : node.title;

                const isLoading = loadingTableId === node.tableId;
                const cachedColumns = node.tableId ? tableColumnsCache[node.tableId] : undefined;
                const isSelected = selectedTableInfo?.tableId === node.tableId;

                return {
                    key: node.key,
                    title: (
                        <div
                            style={{
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                maxWidth: '100%',
                                color: isSelected ? '#1890ff' : undefined,
                                fontWeight: isSelected ? 500 : undefined,
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (node.tableName) {
                                    handleTableClick(node);
                                }
                            }}
                        >
                            <TableOutlined style={{color: isSelected ? '#1890ff' : '#1890ff', marginRight: 6, flexShrink: 0}}/>
                            <Text ellipsis style={{flex: 1}} title={displayName}>
                                {displayName}
                            </Text>
                            {isLoading && (
                                <Text type="secondary" style={{fontSize: 11, marginLeft: 4, flexShrink: 0}}>
                                    加载中...
                                </Text>
                            )}
                            {cachedColumns && !isLoading && (
                                <Text type="secondary" style={{fontSize: 11, marginLeft: 4, flexShrink: 0}}>
                                    ({cachedColumns.length}字段)
                                </Text>
                            )}
                        </div>
                    ),
                    icon: null,
                    isLeaf: true,
                };
            }
        });
    }, [tableColumnsCache, loadingTableId, selectedTableInfo]);

    // 使用 useMemo 缓存树数据转换
    const treeDataMemo = useMemo(() => convertToTreeData(treeData), [treeData, convertToTreeData]);

    // 下方字段表格列定义
    const columnTableColumns = useMemo(() => [
        {
            title: '字段名',
            dataIndex: 'name',
            key: 'name',
            ellipsis: true,
            render: (text: string) => <Text style={{fontSize: 12}}>{text}</Text>,
        },
        {
            title: '类型',
            dataIndex: 'type',
            key: 'type',
            width: 80,
            render: (text: string) => <Text type="secondary" style={{fontSize: 11}}>{text}</Text>,
        },
        {
            title: '描述',
            dataIndex: 'comment',
            key: 'comment',
            ellipsis: true,
            render: (text: string) => <Text type="secondary" style={{fontSize: 11}}>{text || '-'}</Text>,
        },
    ], []);

    // 当前选中表的字段数据（经前端搜索过滤）
    const selectedTableColumns = useMemo(() => {
        if (!selectedTableInfo) return [];
        const cols = tableColumnsCache[selectedTableInfo.tableId] || [];
        if (!columnSearchValue.trim()) return cols;
        const keyword = columnSearchValue.trim().toLowerCase();
        return cols.filter(col =>
            col.name.toLowerCase().includes(keyword) ||
            (col.comment && col.comment.toLowerCase().includes(keyword))
        );
    }, [selectedTableInfo, tableColumnsCache, columnSearchValue]);

    // 拖动调整字段面板高度
    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        isDragging.current = true;
        startY.current = e.clientY;
        startHeight.current = columnPanelHeight;
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
    }, [columnPanelHeight]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging.current || !containerRef.current) return;
            const containerHeight = containerRef.current.clientHeight;
            const delta = startY.current - e.clientY;
            const newHeight = Math.max(
                120,
                Math.min(startHeight.current + delta, containerHeight * 0.7)
            );
            setColumnPanelHeight(newHeight);
        };
        const handleMouseUp = () => {
            if (isDragging.current) {
                isDragging.current = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const tabItems = [
        {
            key: 'tables',
            style: {flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden'},
            label: (
                <span>
                    <DatabaseOutlined/>
                    数据表
                </span>
            ),
            children: (
                <div ref={containerRef} style={{display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0}}>
                    <Search
                        placeholder="搜索表名"
                        allowClear
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        style={{marginBottom: 8, flexShrink: 0}}
                        loading={loading}
                    />
                    <div style={{flex: 1, minHeight: 0, overflow: 'auto'}}>
                        <Spin spinning={loading}>
                            <Tree
                                treeData={treeDataMemo}
                                expandedKeys={expandedKeys}
                                onExpand={(keys) => setExpandedKeys(keys as string[])}
                                onSelect={onTreeSelect}
                                showIcon
                                style={{fontSize: 13}}
                            />
                        </Spin>
                    </div>
                    {/* 选中表的字段表格 */}
                    {selectedTableInfo && (
                        <>
                            {/* 拖动条 */}
                            <div
                                onMouseDown={handleResizeStart}
                                style={{
                                    height: 6,
                                    background: '#f0f0f0',
                                    cursor: 'ns-resize',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    borderTop: '1px solid #e8e8e8',
                                    borderBottom: '1px solid #e8e8e8',
                                }}
                                title="拖动调整高度"
                            >
                                <div style={{
                                    width: 24,
                                    height: 2,
                                    background: '#bfbfbf',
                                    borderRadius: 1,
                                }}/>
                            </div>
                            <div style={{
                                flexShrink: 0,
                                height: columnPanelHeight,
                                display: 'flex',
                                flexDirection: 'column',
                            }}>
                                <div style={{
                                    padding: '6px 8px',
                                    background: '#fafafa',
                                    fontSize: 12,
                                    fontWeight: 500,
                                    borderBottom: '1px solid #f0f0f0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 8,
                                }}>
                                    <span style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                        {selectedTableInfo.schema
                                            ? `${selectedTableInfo.schema}.${selectedTableInfo.name}`
                                            : selectedTableInfo.name}
                                        <Text type="secondary" style={{fontSize: 11, marginLeft: 4}}>
                                            ({selectedTableColumns.length} 字段)
                                        </Text>
                                    </span>
                                    <Search
                                        placeholder="搜索字段"
                                        allowClear
                                        size="small"
                                        value={columnSearchValue}
                                        onChange={(e) => setColumnSearchValue(e.target.value)}
                                        style={{width: 120, flexShrink: 0}}
                                    />
                                </div>
                                <div style={{flex: 1, overflow: 'auto'}}>
                                    <Table
                                        size="small"
                                        pagination={false}
                                        columns={columnTableColumns}
                                        dataSource={selectedTableColumns}
                                        rowKey="name"
                                        scroll={{y: columnPanelHeight - 80}}
                                        locale={{emptyText: '暂无字段'}}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )
        },
        {
            key: 'favorites',
            style: {flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden'},
            label: (
                <span>
                    <StarOutlined/>
                    收藏
                </span>
            ),
            children: (
                <div style={{flex: 1, minHeight: 0, overflow: 'auto'}}>
                    {favorites.length > 0 ? (
                        <List
                            size="small"
                            dataSource={favorites}
                            renderItem={(item) => (
                                <List.Item
                                    style={{cursor: 'pointer', padding: '8px 0'}}
                                    actions={[
                                        <DeleteOutlined
                                            key="delete"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteFavorite(item.id);
                                            }}
                                            style={{color: '#ff4d4f'}}
                                        />
                                    ]}
                                    onClick={() => onFavoriteSelect(item.sql)}
                                >
                                    <List.Item.Meta
                                        avatar={<StarFilled style={{color: '#faad14'}}/>}
                                        title={<Text ellipsis style={{maxWidth: 180}}>{item.name}</Text>}
                                        description={<Text type="secondary" style={{fontSize: 11}}>{item.createTime}</Text>}
                                    />
                                </List.Item>
                            )}
                        />
                    ) : (
                        <Empty description="暂无收藏" image={Empty.PRESENTED_IMAGE_SIMPLE}/>
                    )}
                </div>
            )
        },
        {
            key: 'history',
            style: {flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden'},
            label: (
                <span>
                    <HistoryOutlined/>
                    历史
                </span>
            ),
            children: (
                <div style={{flex: 1, minHeight: 0, overflow: 'auto'}}>
                    {history.length > 0 ? (
                        <List
                            size="small"
                            dataSource={history}
                            renderItem={(item) => (
                                <List.Item
                                    style={{cursor: 'pointer', padding: '8px 0'}}
                                    actions={[
                                        <StarOutlined
                                            key="favorite"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                addToFavorites(item);
                                            }}
                                            style={{color: '#faad14'}}
                                        />,
                                        <DeleteOutlined
                                            key="delete"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteHistory(item.id);
                                            }}
                                            style={{color: '#ff4d4f'}}
                                        />
                                    ]}
                                    onClick={() => onHistorySelect(item.sql)}
                                >
                                    <List.Item.Meta
                                        avatar={<FileTextOutlined/>}
                                        title={
                                            <Text ellipsis style={{maxWidth: 150, fontSize: 12}}>
                                                {item.sql}
                                            </Text>
                                        }
                                        description={
                                            <Space size={4} style={{fontSize: 11}}>
                                                <ClockCircleOutlined/>
                                                {item.executeTime}
                                                <span>|</span>
                                                <span>{item.duration}ms</span>
                                            </Space>
                                        }
                                    />
                                </List.Item>
                            )}
                        />
                    ) : (
                        <Empty description="暂无历史" image={Empty.PRESENTED_IMAGE_SIMPLE}/>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="sql-editor-sidebar" style={{height: '100%', background: '#fff', borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column'}}>
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
                size="small"
                style={{padding: '0 8px', flex: 1, display: 'flex', flexDirection: 'column'}}
                tabBarStyle={{marginBottom: 8, paddingLeft: 8, flexShrink: 0}}
            />
        </div>
    );
};

export default Sidebar;
