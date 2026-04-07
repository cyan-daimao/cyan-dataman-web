import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
    Empty,
    Input,
    List,
    Space,
    Tabs,
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
    ColumnHeightOutlined,
    FolderOutlined,
    CheckCircleOutlined
} from '@ant-design/icons';
import {DSApi, databaseApi, tableApi, Column} from '@/api/DSApi';
import {QueryHistory, FavoriteQuery} from '@/pages/sql-editor/types';

const {Text} = Typography;
const {Search} = Input;

interface SidebarProps {
    selectedDsId: string | null;
    selectedDbName: string | null;
    onDatabaseSelect: (dsId: string, dbName: string) => void;
    onTableSelect: (dsId: string, dbName: string, tableName: string, columns?: Column[]) => void;
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
    type: 'datasource' | 'database' | 'table' | 'column';
    dsId?: string;
    dbName?: string;
    tableName?: string;
    columns?: Column[];
}

const Sidebar: React.FC<SidebarProps> = ({
    selectedDsId,
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
                    key: `ds-${ds.id}`,
                    title: (
                        <span>
                            {ds.name}
                            {selectedDsId === ds.id && (
                                <CheckCircleOutlined style={{color: '#52c41a', marginLeft: 4}}/>
                            )}
                        </span>
                    ),
                    icon: <DatabaseOutlined style={{color: '#1890ff'}}/>,
                    type: 'datasource' as const,
                    dsId: ds.id,
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
    const loadDatabases = async (dsId: string) => {
        const cacheKey = `ds-${dsId}`;
        if (loadedDatabases[cacheKey]) return;

        setLoadingKeys(prev => new Set(prev).add(cacheKey));
        try {
            const resp = await databaseApi.list(dsId);
            if (resp.code === 200) {
                const dbNodes: TreeNodeData[] = resp.data.map(db => ({
                    key: `db-${dsId}-${db.name}`,
                    title: (
                        <span
                            onClick={(e) => {
                                e.stopPropagation();
                                onDatabaseSelect(dsId, db.name);
                            }}
                            style={{cursor: 'pointer'}}
                        >
                            {db.name}
                            {selectedDbName === db.name && selectedDsId === dsId && (
                                <CheckCircleOutlined style={{color: '#52c41a', marginLeft: 4}}/>
                            )}
                        </span>
                    ),
                    icon: <FolderOutlined style={{color: '#faad14'}}/>,
                    type: 'database' as const,
                    dsId,
                    dbName: db.name,
                    isLeaf: false
                }));

                // 更新树数据
                setTreeData(prev => prev.map(node => {
                    if (node.key === `ds-${dsId}`) {
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
    const loadTables = async (dsId: string, dbName: string) => {
        const cacheKey = `db-${dsId}-${dbName}`;
        if (loadedTables[cacheKey]) return;

        setLoadingKeys(prev => new Set(prev).add(cacheKey));
        try {
            const resp = await tableApi.list(dsId, dbName);
            if (resp.code === 200) {
                const tableNodes: TreeNodeData[] = resp.data.map(tableName => ({
                    key: `tbl-${dsId}-${dbName}-${tableName}`,
                    title: (
                        <span
                            onClick={(e) => {
                                e.stopPropagation();
                                handleTableClick(dsId, dbName, tableName);
                            }}
                            style={{cursor: 'pointer'}}
                        >
                            <TableOutlined style={{color: '#1890ff', marginRight: 4}}/>
                            {tableName}
                        </span>
                    ),
                    icon: null,
                    type: 'table' as const,
                    dsId,
                    dbName,
                    tableName,
                    isLeaf: false
                }));

                // 更新树数据
                setTreeData(prev => prev.map(dsNode => {
                    if (dsNode.dsId === dsId && dsNode.children) {
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
    const loadTableSchema = async (dsId: string, dbName: string, tableName: string) => {
        const cacheKey = `tbl-${dsId}-${dbName}-${tableName}`;
        if (tableSchemaCache[cacheKey]) {
            return tableSchemaCache[cacheKey];
        }

        try {
            const resp = await tableApi.getSchema(dsId, dbName, tableName);
            if (resp.code === 200) {
                const columns = resp.data.columns || [];
                setTableSchemaCache(prev => ({...prev, [cacheKey]: columns}));

                // 更新树数据，添加字段子节点
                setTreeData(prev => prev.map(dsNode => {
                    if (dsNode.dsId === dsId && dsNode.children) {
                        return {
                            ...dsNode,
                            children: dsNode.children.map(dbNode => {
                                if (dbNode.dbName === dbName && dbNode.children) {
                                    return {
                                        ...dbNode,
                                        children: dbNode.children.map(tblNode => {
                                            if (tblNode.tableName === tableName) {
                                                const columnNodes: TreeNodeData[] = columns.map((col, idx) => ({
                                                    key: `col-${dsId}-${dbName}-${tableName}-${idx}`,
                                                    title: (
                                                        <span style={{fontSize: 12}}>
                                                            <ColumnHeightOutlined style={{marginRight: 4, color: '#52c41a'}}/>
                                                            <Text>{col.name}</Text>
                                                            <Text type="secondary" style={{marginLeft: 4, fontSize: 10}}>
                                                                {col.type}
                                                            </Text>
                                                            {col.comment && (
                                                                <Text type="secondary" style={{marginLeft: 4, fontSize: 10}}>
                                                                    {col.comment}
                                                                </Text>
                                                            )}
                                                        </span>
                                                    ),
                                                    icon: null,
                                                    type: 'column' as const,
                                                    isLeaf: true
                                                }));
                                                return {...tblNode, children: columnNodes, columns};
                                            }
                                            return tblNode;
                                        })
                                    };
                                }
                                return dbNode;
                            })
                        };
                    }
                    return dsNode;
                }));

                return columns;
            }
        } catch (error) {
            console.error('加载表结构失败:', error);
        }
        return [];
    };

    // 处理表点击
    const handleTableClick = async (dsId: string, dbName: string, tableName: string) => {
        const columns = await loadTableSchema(dsId, dbName, tableName);
        onTableSelect(dsId, dbName, tableName, columns);
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
        if (node.type === 'datasource' && node.dsId) {
            loadDatabases(node.dsId);
        }

        // 展开数据库时加载表
        if (node.type === 'database' && node.dsId && node.dbName) {
            loadTables(node.dsId, node.dbName);
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

    const tabItems = [
        {
            key: 'tables',
            label: (
                <span>
                    <DatabaseOutlined/>
                    数据源
                </span>
            ),
            children: (
                <div>
                    <Search
                        placeholder="搜索"
                        allowClear
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        style={{marginBottom: 8}}
                        loading={loading}
                    />
                    <Spin spinning={loading}>
                        <Tree
                            treeData={treeData}
                            expandedKeys={expandedKeys}
                            onExpand={onTreeExpand}
                            showIcon
                            style={{fontSize: 13}}
                            height={400}
                            titleRender={(node: any) => {
                                if (isNodeLoading(node.key)) {
                                    return (
                                        <span>
                                            {node.title}
                                            <Spin size="small" style={{marginLeft: 4}}/>
                                        </span>
                                    );
                                }
                                return node.title;
                            }}
                        />
                    </Spin>
                </div>
            )
        },
        {
            key: 'favorites',
            label: (
                <span>
                    <StarOutlined/>
                    收藏
                </span>
            ),
            children: (
                <div style={{height: 450, overflow: 'auto'}}>
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
            label: (
                <span>
                    <HistoryOutlined/>
                    历史
                </span>
            ),
            children: (
                <div style={{height: 450, overflow: 'auto'}}>
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
        <div style={{height: '100%', background: '#fff', borderRight: '1px solid #f0f0f0'}}>
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
                size="small"
                style={{padding: '0 8px'}}
                tabBarStyle={{marginBottom: 8, paddingLeft: 8}}
            />
        </div>
    );
};

export default Sidebar;
