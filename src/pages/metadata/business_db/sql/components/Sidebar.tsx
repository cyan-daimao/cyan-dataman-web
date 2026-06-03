import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
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
    message
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
    FolderOutlined,
    CheckCircleOutlined
} from '@ant-design/icons';
import {DSApi, databaseApi, tableApi, Column} from '@/api/DSApi';
import {QueryHistory, FavoriteQuery} from '@/pages/sql-editor/types';
import './Sidebar.less';

const {Text} = Typography;
const {Search} = Input;

const DIRECTORY_DEFAULT_HEIGHT = 320;
const FIELD_PANEL_MIN_HEIGHT = 120;

interface SidebarProps {
    selectedDsName: string | null;
    selectedDbName: string | null;
    onDatabaseSelect: (dsName: string, dbName: string) => void;
    onTableSelect: (dsName: string, dbName: string, tableName: string, columns?: Column[]) => void;
    onHistorySelect: (sql: string) => void;
}

// 树节点数据结构
interface TreeNodeData {
    key: string;
    title: React.ReactNode;
    icon?: React.ReactNode;
    children?: TreeNodeData[];
    isLeaf?: boolean;
    // 自定义属性
    type: 'datasource' | 'database' | 'table';
    dsName?: string;
    dbName?: string;
    tableName?: string;
    columns?: Column[];
}

const Sidebar: React.FC<SidebarProps> = ({
    selectedDsName,
    selectedDbName,
    onDatabaseSelect,
    onTableSelect,
    onHistorySelect
}) => {
    const [activeTab, setActiveTab] = useState('tables');
    const [searchValue, setSearchValue] = useState('');
    const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
    const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<QueryHistory[]>([]);
    const [favorites, setFavorites] = useState<FavoriteQuery[]>([]);

    // 已加载的数据库列表缓存
    const [loadedDatabases, setLoadedDatabases] = useState<Record<string, boolean>>({});
    // 已加载的表列表缓存
    const [loadedTables, setLoadedTables] = useState<Record<string, boolean>>({});
    // 表结构缓存
    const [tableSchemaCache, setTableSchemaCache] = useState<Record<string, Column[]>>({});
    // 加载中的节点
    const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());
    // 当前选中表的字段展示
    const [selectedTableInfo, setSelectedTableInfo] = useState<{
        dsName: string;
        dbName: string;
        tableName: string;
        cacheKey: string;
    } | null>(null);
    // 正在加载字段的表 key
    const [loadingTableKey, setLoadingTableKey] = useState<string | null>(null);
    // 字段面板高度
    const [columnPanelHeight, setColumnPanelHeight] = useState(280);
    // 字段搜索值
    const [columnSearchValue, setColumnSearchValue] = useState('');
    // 字段面板拖动状态
    const isDragging = useRef(false);
    const startY = useRef(0);
    const startHeight = useRef(280);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadDataSources();
        loadHistory();
        loadFavorites();
    }, []);

    // 加载数据源列表
    const loadDataSources = async () => {
        setLoading(true);
        try {
            const resp = await DSApi.list();
            if (resp.code === 200) {
                const dsNodes: TreeNodeData[] = resp.data.map(ds => ({
                    key: `ds-${ds.name}`,
                    title: ds.name,
                    icon: <DatabaseOutlined style={{color: '#1890ff'}}/>,
                    type: 'datasource' as const,
                    dsName: ds.name,
                    isLeaf: false
                }));
                setTreeData(dsNodes);
            }
        } catch (error) {
            console.error('加载数据源失败:', error);
            message.error('加载数据源失败');
        } finally {
            setLoading(false);
        }
    };

    // 加载数据库列表
    const loadDatabases = async (dsName: string) => {
        const cacheKey = `ds-${dsName}`;
        if (loadedDatabases[cacheKey]) return;

        setLoadingKeys(prev => new Set(prev).add(cacheKey));
        try {
            const resp = await databaseApi.list(dsName);
            if (resp.code === 200) {
                const dbNodes: TreeNodeData[] = resp.data.map(db => ({
                    key: `db-${dsName}-${db.name}`,
                    title: (
                        <div
                            className="business-ds-sql-tree-title"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDatabaseSelect(dsName, db.name);
                            }}
                            style={{cursor: 'pointer'}}
                        >
                            <Text ellipsis title={db.name} className="business-ds-sql-tree-text">{db.name}</Text>
                            {selectedDbName === db.name && selectedDsName === dsName && (
                                <CheckCircleOutlined style={{color: '#52c41a', marginLeft: 4, flexShrink: 0}}/>
                            )}
                        </div>
                    ),
                    icon: <FolderOutlined style={{color: '#faad14'}}/>,
                    type: 'database' as const,
                    dsName,
                    dbName: db.name,
                    isLeaf: false
                }));

                // 更新树数据
                setTreeData(prev => prev.map(node => {
                    if (node.key === `ds-${dsName}`) {
                        return {...node, children: dbNodes};
                    }
                    return node;
                }));

                setLoadedDatabases(prev => ({...prev, [cacheKey]: true}));
            }
        } catch (error) {
            console.error('加载数据库失败:', error);
        } finally {
            setLoadingKeys(prev => {
                const newSet = new Set(prev);
                newSet.delete(cacheKey);
                return newSet;
            });
        }
    };

    // 加载表列表
    const loadTables = async (dsName: string, dbName: string) => {
        const cacheKey = `db-${dsName}-${dbName}`;
        if (loadedTables[cacheKey]) return;

        setLoadingKeys(prev => new Set(prev).add(cacheKey));
        try {
            const resp = await tableApi.list(dsName, dbName);
            if (resp.code === 200) {
                const tableNodes: TreeNodeData[] = resp.data.map(tableSchema => ({
                    key: `tbl-${dsName}-${dbName}-${tableSchema.tableName}`,
                    title: (
                        <div
                            className="business-ds-sql-tree-title"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleTableClick(dsName, dbName, tableSchema.tableName);
                            }}
                            style={{cursor: 'pointer'}}
                        >
                            <Text ellipsis title={tableSchema.tableName} className="business-ds-sql-tree-text">
                                {tableSchema.tableName}
                            </Text>
                        </div>
                    ),
                    icon: <TableOutlined style={{color: '#1890ff'}}/>,
                    type: 'table' as const,
                    dsName,
                    dbName,
                    tableName: tableSchema.tableName,
                    isLeaf: true
                }));

                // 更新树数据
                setTreeData(prev => prev.map(dsNode => {
                    if (dsNode.dsName === dsName && dsNode.children) {
                        return {
                            ...dsNode,
                            children: dsNode.children.map(dbNode => {
                                if (dbNode.dbName === dbName) {
                                    return {...dbNode, children: tableNodes};
                                }
                                return dbNode;
                            })
                        };
                    }
                    return dsNode;
                }));

                setLoadedTables(prev => ({...prev, [cacheKey]: true}));
            }
        } catch (error) {
            console.error('加载表列表失败:', error);
        } finally {
            setLoadingKeys(prev => {
                const newSet = new Set(prev);
                newSet.delete(cacheKey);
                return newSet;
            });
        }
    };

    // 加载表结构
    const loadTableSchema = async (dsName: string, dbName: string, tableName: string) => {
        const cacheKey = `tbl-${dsName}-${dbName}-${tableName}`;
        if (tableSchemaCache[cacheKey]) {
            return tableSchemaCache[cacheKey];
        }

        setLoadingTableKey(cacheKey);
        try {
            const resp = await tableApi.getSchema(dsName, dbName, tableName);
            if (resp.code === 200) {
                const columns = resp.data.columns || [];
                setTableSchemaCache(prev => ({...prev, [cacheKey]: columns}));
                return columns;
            }
        } catch (error) {
            console.error('加载表结构失败:', error);
        } finally {
            setLoadingTableKey(null);
        }
        return [];
    };

    // 处理表点击
    const handleTableClick = async (dsName: string, dbName: string, tableName: string) => {
        const cacheKey = `tbl-${dsName}-${dbName}-${tableName}`;
        setSelectedTableInfo({dsName, dbName, tableName, cacheKey});
        setColumnSearchValue('');
        const columns = await loadTableSchema(dsName, dbName, tableName);
        onTableSelect(dsName, dbName, tableName, columns);
    };

    const loadHistory = () => {
        const saved = localStorage.getItem('business_ds_sql_history');
        if (saved) {
            setHistory(JSON.parse(saved));
        }
    };

    const loadFavorites = () => {
        const saved = localStorage.getItem('business_ds_sql_favorites');
        if (saved) {
            setFavorites(JSON.parse(saved));
        }
    };

    // 树展开事件
    const onTreeExpand: TreeProps['onExpand'] = (keys, info) => {
        setExpandedKeys(keys as string[]);

        const node = info.node as TreeNodeData;

        // 展开数据源时加载数据库
        if (node.type === 'datasource' && node.dsName) {
            loadDatabases(node.dsName);
        }

        // 展开数据库时加载表
        if (node.type === 'database' && node.dsName && node.dbName) {
            loadTables(node.dsName, node.dbName);
        }

    };

    // 搜索已加载节点，保留命中节点的祖先节点
    const filteredTreeData = useMemo(() => {
        const keyword = searchValue.trim().toLowerCase();
        if (!keyword) {
            return treeData;
        }

        const matches = (node: TreeNodeData) => {
            const texts = [node.dsName, node.dbName, node.tableName]
                .filter(Boolean)
                .map(text => String(text).toLowerCase());
            return texts.some(text => text.includes(keyword));
        };

        const filterNodes = (nodes: TreeNodeData[]): TreeNodeData[] => nodes
            .map(node => {
                const childMatches = node.children ? filterNodes(node.children) : [];
                if (matches(node)) {
                    return node;
                }
                if (childMatches.length > 0) {
                    return {...node, children: childMatches};
                }
                return null;
            })
            .filter((node): node is TreeNodeData => node !== null);

        return filterNodes(treeData);
    }, [searchValue, treeData]);

    // 搜索时自动展开过滤结果
    const filteredExpandedKeys = useMemo(() => {
        const keys: string[] = [];
        const collect = (nodes: TreeNodeData[]) => {
            nodes.forEach(node => {
                if (node.children && node.children.length > 0) {
                    keys.push(node.key);
                    collect(node.children);
                }
            });
        };
        collect(filteredTreeData);
        return keys;
    }, [filteredTreeData]);

    // 字段表格列
    const columnTableColumns = useMemo(() => [
        {
            title: '字段名',
            dataIndex: 'name',
            key: 'name',
            ellipsis: true,
            render: (text: string) => <Text style={{fontSize: 12}}>{text}</Text>
        },
        {
            title: '类型',
            dataIndex: 'type',
            key: 'type',
            width: 80,
            render: (text: string) => <Text type="secondary" style={{fontSize: 11}}>{text}</Text>
        },
        {
            title: '描述',
            dataIndex: 'comment',
            key: 'comment',
            ellipsis: true,
            render: (text: string) => <Text type="secondary" style={{fontSize: 11}}>{text || '-'}</Text>
        }
    ], []);

    // 当前选中表的字段数据
    const selectedTableColumns = useMemo(() => {
        if (!selectedTableInfo) {
            return [];
        }
        const columns = tableSchemaCache[selectedTableInfo.cacheKey] || [];
        const keyword = columnSearchValue.trim().toLowerCase();
        if (!keyword) {
            return columns;
        }
        return columns.filter(column =>
            column.name.toLowerCase().includes(keyword)
            || (column.comment && column.comment.toLowerCase().includes(keyword))
        );
    }, [columnSearchValue, selectedTableInfo, tableSchemaCache]);

    // 拖动调整字段面板高度
    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDragging.current = true;
        startY.current = e.clientY;
        startHeight.current = columnPanelHeight;
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
    }, [columnPanelHeight]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging.current || !containerRef.current) {
                return;
            }
            const containerHeight = containerRef.current.clientHeight;
            const delta = startY.current - e.clientY;
            const maxHeight = Math.max(FIELD_PANEL_MIN_HEIGHT, containerHeight - 96);
            const newHeight = Math.max(FIELD_PANEL_MIN_HEIGHT, Math.min(startHeight.current + delta, maxHeight));
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
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, []);

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
        localStorage.setItem('business_ds_sql_favorites', JSON.stringify(newFavorites));
    };

    // 删除历史
    const deleteHistory = (id: string) => {
        const newHistory = history.filter(h => h.id !== id);
        setHistory(newHistory);
        localStorage.setItem('business_ds_sql_history', JSON.stringify(newHistory));
    };

    // 删除收藏
    const deleteFavorite = (id: string) => {
        const newFavorites = favorites.filter(f => f.id !== id);
        setFavorites(newFavorites);
        localStorage.setItem('business_ds_sql_favorites', JSON.stringify(newFavorites));
    };

    // 判断节点是否正在加载
    const isNodeLoading = (key: string) => loadingKeys.has(key);

    // 渲染数据源节点标题
    const renderDatasourceTitle = (node: TreeNodeData) => {
        const title = String(node.title || node.dsName || '');
        return (
            <div className="business-ds-sql-tree-title">
                <Text ellipsis title={title} className="business-ds-sql-tree-text">{title}</Text>
                {selectedDsName === node.dsName && (
                    <CheckCircleOutlined style={{color: '#52c41a', marginLeft: 4, flexShrink: 0}}/>
                )}
            </div>
        );
    };

    const tabItems = [
        {
            key: 'tables',
            style: {flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden'},
            label: (
                <span>
                    <DatabaseOutlined/>
                    数据源
                </span>
            ),
            children: (
                <div ref={containerRef} className="business-ds-sql-tab-content">
                    <Search
                        placeholder="搜索数据源/库/表"
                        allowClear
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        style={{marginBottom: 8, flexShrink: 0}}
                        loading={loading}
                    />
                    <div style={{
                        flex: selectedTableInfo ? `1 1 ${DIRECTORY_DEFAULT_HEIGHT}px` : 1,
                        height: selectedTableInfo ? DIRECTORY_DEFAULT_HEIGHT : undefined,
                        minHeight: 0,
                        overflow: 'auto'
                    }}>
                        <Spin spinning={loading}>
                            <Tree
                                treeData={filteredTreeData}
                                expandedKeys={searchValue.trim() ? filteredExpandedKeys : expandedKeys}
                                onExpand={onTreeExpand}
                                showIcon
                                style={{fontSize: 13}}
                                titleRender={(node: any) => {
                                    if (isNodeLoading(node.key)) {
                                        return (
                                            <div className="business-ds-sql-tree-title">
                                                {node.type === 'datasource' ? renderDatasourceTitle(node) : node.title}
                                                <Spin size="small" style={{marginLeft: 4}}/>
                                            </div>
                                        );
                                    }
                                    if (node.type === 'datasource') {
                                        return renderDatasourceTitle(node);
                                    }
                                    return node.title;
                                }}
                            />
                        </Spin>
                    </div>
                    {selectedTableInfo && (
                        <>
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
                                    borderBottom: '1px solid #e8e8e8'
                                }}
                                title="拖动调整高度"
                            >
                                <div style={{width: 24, height: 2, background: '#bfbfbf', borderRadius: 1}}/>
                            </div>
                            <div style={{
                                flexShrink: 0,
                                height: columnPanelHeight,
                                minHeight: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden'
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
                                    gap: 8
                                }}>
                                    <span style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                        {selectedTableInfo.dbName}.{selectedTableInfo.tableName}
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
                                <div style={{flex: 1, minHeight: 0, overflow: 'auto'}}>
                                    <Table
                                        size="small"
                                        pagination={false}
                                        columns={columnTableColumns}
                                        dataSource={selectedTableColumns}
                                        rowKey="name"
                                        loading={loadingTableKey === selectedTableInfo.cacheKey}
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
                                    onClick={() => onHistorySelect(item.sql)}
                                >
                                    <List.Item.Meta
                                        avatar={<StarFilled style={{color: '#faad14'}}/>}
                                        title={<Text ellipsis style={{maxWidth: 180}}>{item.name}</Text>}
                                        description={<Text type="secondary"
                                                          style={{fontSize: 11}}>{item.createTime}</Text>}
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
                                                {item.rowCount !== undefined && (
                                                    <>
                                                        <span>|</span>
                                                        <span>{item.rowCount}行</span>
                                                    </>
                                                )}
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
        <div className="business-ds-sql-sidebar" style={{height: '100%', minHeight: 0, overflow: 'hidden', background: '#fff', borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column'}}>
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
                size="small"
                style={{padding: '0 8px', flex: 1, height: '100%', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column'}}
                tabBarStyle={{marginBottom: 8, paddingLeft: 8, flexShrink: 0}}
            />
        </div>
    );
};

export default Sidebar;
