import {useState} from 'react';
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
import {QueryResult, ExecutionPlan, QueryHistory, TableInfo} from './types';

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

const SQLEditorPage: React.FC = () => {
    // 状态
    const [tabs, setTabs] = useState<QueryTab[]>([
        {id: '1', name: '查询 1', sql: '', result: null, executionPlan: null, error: null}
    ]);
    const [activeTab, setActiveTab] = useState('1');
    const [loading, setLoading] = useState(false);
    const [siderCollapsed, setSiderCollapsed] = useState(false);
    const [selectedTable, setSelectedTable] = useState<string>();

    // 生成唯一ID
    const generateId = () => Date.now().toString();

    // 当前活动的标签页
    const currentTab = tabs.find(t => t.id === activeTab);

    // 更新当前标签页的 SQL
    const handleSQLChange = (sql: string) => {
        setTabs(tabs.map(t => 
            t.id === activeTab ? {...t, sql} : t
        ));
    };

    // 新建标签页
    const handleAddTab = () => {
        const newId = generateId();
        const newTab: QueryTab = {
            id: newId,
            name: `查询 ${tabs.length + 1}`,
            sql: '',
            result: null,
            executionPlan: null,
            error: null
        };
        setTabs([...tabs, newTab]);
        setActiveTab(newId);
    };

    // 关闭标签页
    const handleCloseTab = (tabId: string) => {
        if (tabs.length === 1) {
            message.warning('至少保留一个查询标签页');
            return;
        }
        const newTabs = tabs.filter(t => t.id !== tabId);
        setTabs(newTabs);
        if (activeTab === tabId) {
            setActiveTab(newTabs[0].id);
        }
    };

    // 执行 SQL
    const handleExecute = async () => {
        if (!currentTab?.sql.trim()) {
            message.warning('请输入SQL语句');
            return;
        }

        setLoading(true);
        
        // 保存历史记录
        saveHistory(currentTab.sql, 'success', 1234, 100);

        // TODO: 替换为真实 API 调用
        setTimeout(() => {
            // 模拟结果
            const mockResult: QueryResult = {
                columns: ['id', 'name', 'age', 'create_time'],
                rows: Array.from({length: 100}, (_, i) => ({
                    id: i + 1,
                    name: `用户${i + 1}`,
                    age: Math.floor(Math.random() * 50) + 18,
                    create_time: new Date().toISOString()
                })),
                total: 100,
                duration: Math.floor(Math.random() * 2000) + 100
            };

            setTabs(tabs.map(t => 
                t.id === activeTab 
                    ? {...t, result: mockResult, error: null, executionPlan: null}
                    : t
            ));
            setLoading(false);
            message.success(`执行成功，返回 ${mockResult.rows.length} 行数据`);
        }, 1000);
    };

    // 查看执行计划
    const handleExecutePlan = async () => {
        if (!currentTab?.sql.trim()) {
            message.warning('请输入SQL语句');
            return;
        }

        setLoading(true);

        // TODO: 替换为真实 API 调用
        setTimeout(() => {
            const mockPlan: ExecutionPlan[] = [
                {id: '1', operation: 'TableScan', rowCount: 10000, cost: 100, details: 'table: dwd_user_info'},
                {id: '2', operation: 'Filter', rowCount: 5000, cost: 50, details: 'age > 18'},
                {id: '3', operation: 'Project', rowCount: 5000, cost: 20, details: 'id, name, age'},
            ];

            setTabs(tabs.map(t => 
                t.id === activeTab 
                    ? {...t, executionPlan: mockPlan, error: null}
                    : t
            ));
            setLoading(false);
        }, 500);
    };

    // 格式化 SQL
    const handleFormat = () => {
        if (!currentTab?.sql) return;
        
        let formatted = currentTab.sql
            .replace(/\s+/g, ' ')
            .replace(/\s*,\s*/g, ',\n    ')
            .replace(/\s+(SELECT|FROM|WHERE|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|GROUP BY|HAVING|ORDER BY|LIMIT|UNION|WITH)/gi, '\n$1')
            .replace(/\s+(AND|OR)/gi, '\n    $1')
            .trim();
        
        handleSQLChange(formatted);
        message.success('SQL已格式化');
    };

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
        history = [historyItem, ...history].slice(0, 50); // 最多保留50条
        localStorage.setItem('sql_history', JSON.stringify(history));
    };

    // 选择表
    const handleTableSelect = (table: TableInfo) => {
        const selectSQL = `SELECT * FROM ${table.name} LIMIT 100;`;
        handleSQLChange(selectSQL);
        setSelectedTable(table.name);
        message.info(`已选择表: ${table.name}`);
    };

    // 选择历史记录
    const handleHistorySelect = (sql: string) => {
        handleSQLChange(sql);
    };

    // 选择收藏
    const handleFavoriteSelect = (sql: string) => {
        handleSQLChange(sql);
    };

    // 标签页配置
    const tabItems = tabs.map(tab => ({
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
        children: (
            <Layout style={{height: 'calc(100vh - 120px)', background: '#fff'}}>
                <Content style={{display: 'flex', flexDirection: 'column'}}>
                    {/* SQL 编辑器 */}
                    <div style={{flex: '0 0 300px', borderBottom: '1px solid #f0f0f0'}}>
                        <SQLEditor
                            value={tab.sql}
                            onChange={handleSQLChange}
                            onExecute={handleExecute}
                            onExecutePlan={handleExecutePlan}
                            onFormat={handleFormat}
                            selectedTable={selectedTable}
                        />
                    </div>
                    {/* 结果面板 */}
                    <div style={{flex: 1, overflow: 'hidden'}}>
                        <ResultPanel
                            loading={loading}
                            result={tab.result}
                            executionPlan={tab.executionPlan}
                            error={tab.error}
                        />
                    </div>
                </Content>
            </Layout>
        )
    }));

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
                                        selectedTable={selectedTable}
                                    />
                                </div>
                                {/* 结果面板 */}
                                <div style={{flex: 1, overflow: 'hidden'}}>
                                    <ResultPanel
                                        loading={loading}
                                        result={currentTab.result}
                                        executionPlan={currentTab.executionPlan}
                                        error={currentTab.error}
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
