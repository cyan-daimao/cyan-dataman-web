import {useState, useCallback, useMemo} from 'react';
import {Layout, message, Tabs} from 'antd';
import {
    CodeOutlined,
    DatabaseOutlined,
    PlusOutlined,
    CloseOutlined
} from '@ant-design/icons';
import Sidebar from './components/Sidebar';
import SQLEditor from './components/SQLEditor';
import ResultPanel from './components/ResultPanel';
import {QueryResult, ExecutionPlan, QueryHistory} from './types';
import {ColumnVO} from '../../api/MetadataTableAPI';
import {executeSql} from '../../api/DatagawayApi';

const {Sider, Content} = Layout;

// SQL 查询标签页
interface QueryTab {
    id: string;
    name: string;
    sql: string;
    result: QueryResult | null;
    executionPlan: ExecutionPlan[] | null;
    error: string | null;
}

// 表字段缓存
interface TableColumnsCache {
    [tableName: string]: ColumnVO[];
}

const SQLEditorPage: React.FC = () => {
    // 状态
    const [tabs, setTabs] = useState<QueryTab[]>([
        {id: '1', name: '查询 1', sql: '', result: null, executionPlan: null, error: null}
    ]);
    const [activeTab, setActiveTab] = useState('1');
    const [loading, setLoading] = useState(false);
    const [siderCollapsed, setSiderCollapsed] = useState(false);
    const [tableColumnsCache, setTableColumnsCache] = useState<TableColumnsCache>({});
    const [resultActiveTab, setResultActiveTab] = useState('result');

    // 生成唯一ID
    const generateId = () => Date.now().toString();

    // 当前活动的标签页
    const currentTab = useMemo(() => tabs.find(t => t.id === activeTab), [tabs, activeTab]);

    // 更新当前标签页的 SQL（使用 useCallback 优化）
    const handleSQLChange = useCallback((sql: string) => {
        setTabs(prev => prev.map(t => 
            t.id === activeTab ? {...t, sql} : t
        ));
    }, [activeTab]);

    // 新建标签页
    const handleAddTab = useCallback(() => {
        const newId = generateId();
        const newTab: QueryTab = {
            id: newId,
            name: `查询 ${tabs.length + 1}`,
            sql: '',
            result: null,
            executionPlan: null,
            error: null
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTab(newId);
    }, [tabs.length]);

    // 关闭标签页
    const handleCloseTab = useCallback((tabId: string) => {
        if (tabs.length === 1) {
            message.warning('至少保留一个查询标签页');
            return;
        }
        setTabs(prev => prev.filter(t => t.id !== tabId));
        if (activeTab === tabId) {
            setActiveTab(tabs[0].id === tabId ? tabs[1].id : tabs[0].id);
        }
    }, [tabs.length, activeTab]);

    // 执行 SQL
    const handleExecute = useCallback(async () => {
        if (!currentTab?.sql.trim()) {
            message.warning('请输入SQL语句');
            return;
        }

        setLoading(true);

        try {
            const resp = await executeSql(currentTab.sql);
            const result = resp.data
            // 从返回的数据中提取列名
            const columns = result.data.length > 0 ? Object.keys(result.data[0]) : [];
            
            const queryResult: QueryResult = {
                columns,
                rows: result.data,
                total: result.data.length,
                duration: result.costTimeMs
            };

            setTabs(prev => prev.map(t => 
                t.id === activeTab 
                    ? {...t, result: queryResult, error: null, executionPlan: null}
                    : t
            ));
            
            // 保存历史记录
            saveHistory(currentTab.sql, 'success', result.costTimeMs, result.data.length);
            
            // 自动切换到查询结果 tab
            setResultActiveTab('result');
            
            message.success(`执行成功，返回 ${result.data.length} 行数据，耗时 ${result.costTimeMs}ms`);
        } catch (error: any) {
            const errorMessage = error.message || 'SQL执行失败';
            
            setTabs(prev => prev.map(t => 
                t.id === activeTab 
                    ? {...t, result: null, error: errorMessage, executionPlan: null}
                    : t
            ));
            
            // 保存历史记录
            saveHistory(currentTab.sql, 'error', 0);
            
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [currentTab, activeTab]);

    // 查看执行计划
    const handleExecutePlan = useCallback(async () => {
        if (!currentTab?.sql.trim()) {
            message.warning('请输入SQL语句');
            return;
        }

        setLoading(true);

        try {
            // 在 SQL 前添加 EXPLAIN 前缀
            const explainSql = `EXPLAIN ${currentTab.sql}`;
            const resp = await executeSql(explainSql);
            const result = resp.data
            // 将返回数据转换为执行计划格式
            const plan: ExecutionPlan[] = result.data.map((row: any, index: number) => ({
                id: String(index + 1),
                operation: row.operation || row.Operation || row.id || '',
                rowCount: row.rows || row.Rows || row.row_count || 0,
                cost: row.cost || row.Cost || 0,
                details: row.details || row.Details || JSON.stringify(row),
            }));

            setTabs(prev => prev.map(t => 
                t.id === activeTab 
                    ? {...t, executionPlan: plan, error: null}
                    : t
            ));
            
            // 自动切换到执行计划 tab
            setResultActiveTab('plan');
            
            message.success(`执行计划生成成功，耗时 ${result.costTimeMs}ms`);
        } catch (error: any) {
            const errorMessage = error.message || '获取执行计划失败';
            
            setTabs(prev => prev.map(t => 
                t.id === activeTab 
                    ? {...t, executionPlan: null, error: errorMessage}
                    : t
            ));
            
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [currentTab, activeTab]);

    // 格式化 SQL
    const handleFormat = useCallback(() => {
        if (!currentTab?.sql) return;
        
        let formatted = currentTab.sql
            .replace(/\s+/g, ' ')
            .replace(/\s*,\s*/g, ',\n    ')
            .replace(/\s+(SELECT|FROM|WHERE|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|GROUP BY|HAVING|ORDER BY|LIMIT|UNION|WITH)/gi, '\n$1')
            .replace(/\s+(AND|OR)/gi, '\n    $1')
            .trim();
        
        handleSQLChange(formatted);
        message.success('SQL已格式化');
    }, [currentTab, handleSQLChange]);

    // 保存历史记录
    const saveHistory = (sql: string, status: 'success' | 'error', duration: number, rowCount?: number) => {
        const historyItem: QueryHistory = {
            id: generateId(),
            sql,
            executeTime: new Date().toLocaleString(),
            duration,
            status,
            rowCount
        };

        const saved = localStorage.getItem('sql_history');
        let history: QueryHistory[] = saved ? JSON.parse(saved) : [];
        history = [historyItem, ...history].slice(0, 50);
        localStorage.setItem('sql_history', JSON.stringify(history));
    };

    // 选择表 - 缓存表字段信息
    const handleTableSelect = useCallback((table: { 
        name: string; 
        tableId: string; 
        catalog?: string;
        schema?: string;
        columns?: ColumnVO[] 
    }) => {
        // 生成完整的表名：schema.tableName
        const fullTableName = table.schema ? `${table.schema}.${table.name}` : table.name;
        const selectSQL = `SELECT * FROM ${fullTableName} LIMIT 100;`;
        handleSQLChange(selectSQL);
        
        // 缓存表字段信息用于提示（使用完整表名作为key）
        if (table.columns) {
            setTableColumnsCache(prev => ({
                ...prev,
                [fullTableName]: table.columns!,
                [table.name]: table.columns! // 同时用简短名称缓存
            }));
        }
        
        message.info(`已选择表: ${fullTableName}`);
    }, [handleSQLChange]);

    // 选择历史记录
    const handleHistorySelect = useCallback((sql: string) => {
        handleSQLChange(sql);
    }, [handleSQLChange]);

    // 选择收藏
    const handleFavoriteSelect = useCallback((sql: string) => {
        handleSQLChange(sql);
    }, [handleSQLChange]);

    // 标签页配置
    const tabItems = useMemo(() => tabs.map(tab => ({
        key: tab.id,
        label: (
            <span>
                <CodeOutlined style={{marginRight: 4}}/>
                {tab.name}
                <CloseOutlined
                    style={{marginLeft: 8, fontSize: 10}}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleCloseTab(tab.id);
                    }}
                />
            </span>
        ),
        children: null // 不在这里渲染内容，单独处理
    })), [tabs, handleCloseTab]);

    return (
        <Layout style={{height: '100%', background: '#f5f5f5'}}>
            {/* 左侧边栏 */}
            <Sider
                width={280}
                collapsible
                collapsed={siderCollapsed}
                onCollapse={setSiderCollapsed}
                style={{background: '#fff'}}
                theme="light"
            >
                <Sidebar
                    onTableSelect={handleTableSelect}
                    onHistorySelect={handleHistorySelect}
                    onFavoriteSelect={handleFavoriteSelect}
                />
            </Sider>

            {/* 主内容区 */}
            <Content style={{display: 'flex', flexDirection: 'column'}}>
                {/* 标签页栏 */}
                <div style={{
                    background: '#fff',
                    borderBottom: '1px solid #f0f0f0',
                    padding: '4px 8px 0'
                }}>
                    <Tabs
                        type="editable-card"
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        items={tabItems}
                        onEdit={(targetKey, action) => {
                            if (action === 'add') handleAddTab();
                        }}
                        hideAdd={false}
                        addIcon={<PlusOutlined/>}
                        tabBarStyle={{marginBottom: 0}}
                        tabBarExtraContent={
                            <span style={{color: '#999', fontSize: 12}}>
                                <DatabaseOutlined style={{marginRight: 4}}/>
                                数据仓库 SQL 编辑器
                            </span>
                        }
                    />
                </div>

                {/* 当前标签页内容 */}
                <div style={{flex: 1, overflow: 'hidden'}}>
                    {currentTab && (
                        <Layout style={{height: '100%', background: '#fff'}}>
                            <Content style={{display: 'flex', flexDirection: 'column'}}>
                                {/* SQL 编辑器 */}
                                <div style={{flex: '0 0 300px', borderBottom: '1px solid #f0f0f0'}}>
                                    <SQLEditor
                                        value={currentTab.sql}
                                        onChange={handleSQLChange}
                                        onExecute={handleExecute}
                                        onExecutePlan={handleExecutePlan}
                                        onFormat={handleFormat}
                                        tableColumnsCache={tableColumnsCache}
                                    />
                                </div>
                                {/* 结果面板 */}
                                <div style={{flex: 1, overflow: 'hidden'}}>
                                    <ResultPanel
                                        loading={loading}
                                        result={currentTab.result}
                                        executionPlan={currentTab.executionPlan}
                                        error={currentTab.error}
                                        activeTab={resultActiveTab}
                                        onTabChange={setResultActiveTab}
                                    />
                                </div>
                            </Content>
                        </Layout>
                    )}
                </div>
            </Content>
        </Layout>
    );
};

export default SQLEditorPage;