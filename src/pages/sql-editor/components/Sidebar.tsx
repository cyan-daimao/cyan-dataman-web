import {useState, useEffect, useCallback, useMemo} from 'react';
import {
    Empty,
    Input,
    List,
    Space,
    Tabs,
    Tree,
    TreeProps,
    Typography,
    Spin
} from 'antd';
import {
    ClockCircleOutlined,
    DatabaseOutlined,
    DeleteOutlined,
    FileTextOutlined,
    HistoryOutlined,
    StarFilled,
    StarOutlined,
    TableOutlined
} from '@ant-design/icons';
import {getSubjectTableTree, SubjectTableTreeDTO, ColumnVO} from '../../../api/MetadataTableAPI';
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
    onTableSelect: (table: TableInfoWithColumns) => void;
    onHistorySelect: (sql: string) => void;
    onFavoriteSelect: (sql: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    onTableSelect,
    onHistorySelect,
    onFavoriteSelect
}) => {
    const [activeTab, setActiveTab] = useState('tables');
    const [searchValue, setSearchValue] = useState('');
    const [treeData, setTreeData] = useState<SubjectTableTreeDTO[]>([]);
    const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<QueryHistory[]>([]);
    const [favorites, setFavorites] = useState<FavoriteQuery[]>([]);

    // 加载主题树数据
    useEffect(() => {
        loadSubjectTree();
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

    // 树选择事件
    const onTreeSelect: TreeProps['onSelect'] = (selectedKeys, info) => {
        const node = info.node as SubjectTableTreeDTO;
        // 只有表节点才触发选择
        if (node.type === 'table' && node.tableName) {
            onTableSelect({
                name: node.tableName,
                tableId: node.tableId || '',
                catalog: node.catalog,
                schema: node.schema,
                columns: node.columns
            });
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

    // 转换树数据为 Tree 组件格式
    const convertToTreeData = useCallback((nodes: SubjectTableTreeDTO[]): any[] => {
        return nodes.map(node => {
            if (node.type === 'subject') {
                return {
                    key: node.key,
                    title: (
                        <span>
                            <DatabaseOutlined style={{marginRight: 4, color: '#1890ff'}}/>
                            {node.title}
                        </span>
                    ),
                    icon: <DatabaseOutlined />,
                    children: node.children ? convertToTreeData(node.children) : undefined
                };
            } else {
                // 表节点
                const displayName = node.schema 
                    ? `${node.schema}.${node.tableName || node.title}` 
                    : node.title;
                return {
                    key: node.key,
                    title: (
                        <span 
                            style={{cursor: 'pointer'}}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (node.tableName) {
                                    onTableSelect({
                                        name: node.tableName,
                                        tableId: node.tableId || '',
                                        catalog: node.catalog,
                                        schema: node.schema,
                                        columns: node.columns
                                    });
                                }
                            }}
                        >
                            <TableOutlined style={{marginRight: 4, color: '#52c41a'}}/>
                            {displayName}
                            {node.columns && (
                                <Text type="secondary" style={{fontSize: 11, marginLeft: 4}}>
                                    ({node.columns.length}字段)
                                </Text>
                            )}
                        </span>
                    ),
                    icon: <TableOutlined />,
                    isLeaf: true
                };
            }
        });
    }, [onTableSelect]);

    // 使用 useMemo 缓存树数据转换
    const treeDataMemo = useMemo(() => convertToTreeData(treeData), [treeData, convertToTreeData]);

    const tabItems = [
        {
            key: 'tables',
            label: (
                <span>
                    <DatabaseOutlined/>
                    数据表
                </span>
            ),
            children: (
                <div>
                    <Search
                        placeholder="搜索表名"
                        allowClear
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        style={{marginBottom: 8}}
                        loading={loading}
                    />
                    <Spin spinning={loading}>
                        <Tree
                            treeData={treeDataMemo}
                            expandedKeys={expandedKeys}
                            onExpand={(keys) => setExpandedKeys(keys as string[])}
                            onSelect={onTreeSelect}
                            showIcon
                            style={{fontSize: 13}}
                            height={400}
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