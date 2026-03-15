import {useState, useEffect} from 'react';
import {
    Collapse,
    Empty,
    Input,
    List,
    Menu,
    Space,
    Tabs,
    Tree,
    TreeProps,
    Typography
} from 'antd';
import {
    ClockCircleOutlined,
    DatabaseOutlined,
    DeleteOutlined,
    FileTextOutlined,
    HistoryOutlined,
    SearchOutlined,
    StarFilled,
    StarOutlined,
    TableOutlined
} from '@ant-design/icons';
import {SubjectNode, QueryHistory, FavoriteQuery, TableInfo} from '../types';

const {Panel} = Collapse;
const {Text} = Typography;
const {Search} = Input;

interface SidebarProps {
    onTableSelect: (table: TableInfo) => void;
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
    const [subjectTreeData, setSubjectTreeData] = useState<SubjectNode[]>([]);
    const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
    const [history, setHistory] = useState<QueryHistory[]>([]);
    const [favorites, setFavorites] = useState<FavoriteQuery[]>([]);

    // 加载主题树数据
    useEffect(() => {
        loadSubjectTree();
        loadHistory();
        loadFavorites();
    }, []);

    const loadSubjectTree = async () => {
        // TODO: 替换为真实 API
        // 模拟数据
        const mockData: SubjectNode[] = [
            {
                key: 'user_domain',
                title: '用户域',
                code: 'USER',
                icon: <DatabaseOutlined/>,
                children: [
                    {
                        key: 'user_info',
                        title: '用户信息',
                        code: 'USER_INFO',
                        icon: <TableOutlined/>,
                        tables: [
                            {name: 'dwd_user_info', catalog: 'iceberg', schema: 'dwd', comment: '用户信息明细表'},
                            {name: 'dws_user_summary', catalog: 'iceberg', schema: 'dws', comment: '用户汇总表'},
                        ]
                    }
                ]
            },
            {
                key: 'order_domain',
                title: '订单域',
                code: 'ORDER',
                icon: <DatabaseOutlined/>,
                children: [
                    {
                        key: 'order_info',
                        title: '订单信息',
                        code: 'ORDER_INFO',
                        icon: <TableOutlined/>,
                        tables: [
                            {name: 'dwd_order_detail', catalog: 'iceberg', schema: 'dwd', comment: '订单明细表'},
                            {name: 'dws_order_summary', catalog: 'iceberg', schema: 'dws', comment: '订单汇总表'},
                        ]
                    }
                ]
            },
            {
                key: 'product_domain',
                title: '商品域',
                code: 'PRODUCT',
                icon: <DatabaseOutlined/>,
                children: [
                    {
                        key: 'product_info',
                        title: '商品信息',
                        code: 'PRODUCT_INFO',
                        icon: <TableOutlined/>,
                        tables: [
                            {name: 'dim_product', catalog: 'iceberg', schema: 'dim', comment: '商品维度表'},
                        ]
                    }
                ]
            }
        ];
        setSubjectTreeData(mockData);
        // 展开所有节点
        const allKeys = collectAllKeys(mockData);
        setExpandedKeys(allKeys);
    };

    const loadHistory = () => {
        // 从 localStorage 加载历史记录
        const saved = localStorage.getItem('sql_history');
        if (saved) {
            setHistory(JSON.parse(saved));
        } else {
            // 模拟数据
            const mockHistory: QueryHistory[] = [
                {
                    id: '1',
                    sql: 'SELECT * FROM dwd_user_info LIMIT 100',
                    executeTime: '2026-03-15 10:30:00',
                    duration: 1234,
                    status: 'success',
                    rowCount: 100
                },
                {
                    id: '2',
                    sql: 'SELECT COUNT(*) FROM dwd_order_detail',
                    executeTime: '2026-03-15 09:15:00',
                    duration: 567,
                    status: 'success',
                    rowCount: 1
                }
            ];
            setHistory(mockHistory);
        }
    };

    const loadFavorites = () => {
        // 从 localStorage 加载收藏
        const saved = localStorage.getItem('sql_favorites');
        if (saved) {
            setFavorites(JSON.parse(saved));
        }
    };

    const collectAllKeys = (nodes: SubjectNode[]): string[] => {
        const keys: string[] = [];
        const traverse = (items: SubjectNode[]) => {
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
        const node = info.node as SubjectNode;
        if (node.tables && node.tables.length > 0) {
            // 点击的是表节点
            onTableSelect(node.tables[0]);
        }
    };

    // 添加收藏
    const addToFavorites = (item: QueryHistory) => {
        const newFavorite: FavoriteQuery = {
            id: Date.now().toString(),
            name: item.sql.substring(0, 50) + '...',
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

    // 过滤树数据
    const filterTreeData = (data: SubjectNode[], search: string): SubjectNode[] => {
        if (!search) return data;
        return data.filter(node => {
            const titleMatch = node.title.toLowerCase().includes(search.toLowerCase());
            const childrenMatch = node.children ? filterTreeData(node.children, search).length > 0 : false;
            const tablesMatch = node.tables?.some(t => t.name.toLowerCase().includes(search.toLowerCase()));
            return titleMatch || childrenMatch || tablesMatch;
        });
    };

    // 渲染树节点
    const renderTreeNodes = (data: SubjectNode[]): any[] => {
        return data.map(item => {
            if (item.children) {
                return {
                    key: item.key,
                    title: item.title,
                    icon: item.icon,
                    children: renderTreeNodes(item.children)
                };
            }
            if (item.tables) {
                return {
                    key: item.key,
                    title: (
                        <div>
                            <Text>{item.title}</Text>
                            <div style={{fontSize: 12, color: '#999'}}>
                                {item.tables.map(t => (
                                    <div
                                        key={t.name}
                                        style={{cursor: 'pointer', padding: '2px 0'}}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onTableSelect(t);
                                        }}
                                    >
                                        <TableOutlined style={{marginRight: 4}}/>
                                        {t.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ),
                    icon: item.icon,
                    isLeaf: true
                };
            }
            return {
                key: item.key,
                title: item.title,
                icon: item.icon
            };
        });
    };

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
                        onChange={(e) => setSearchValue(e.target.value)}
                        style={{marginBottom: 8}}
                    />
                    <Tree
                        treeData={renderTreeNodes(filterTreeData(subjectTreeData, searchValue))}
                        expandedKeys={expandedKeys}
                        onExpand={(keys) => setExpandedKeys(keys as string[])}
                        onSelect={onTreeSelect}
                        showIcon
                        style={{fontSize: 13}}
                    />
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
                <div>
                    {favorites.length > 0 ? (
                        <List
                            size="small"
                            dataSource={favorites}
                            renderItem={(item) => (
                                <List.Item
                                    style={{cursor: 'pointer', padding: '8px 0'}}
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
                <div>
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
                                            onClick={() => addToFavorites(item)}
                                            style={{color: '#faad14'}}
                                        />,
                                        <DeleteOutlined
                                            key="delete"
                                            onClick={() => deleteHistory(item.id)}
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
