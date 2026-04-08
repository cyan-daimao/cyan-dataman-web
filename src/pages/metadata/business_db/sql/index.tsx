import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Input, Layout, message, Tabs, Spin} from 'antd';
import {CodeOutlined, DatabaseOutlined, PlusOutlined} from '@ant-design/icons';
import Sidebar from './components/Sidebar';
import SQLEditor from '@/pages/sql-editor/components/SQLEditor';
import ResultPanel from '@/pages/sql-editor/components/ResultPanel';
import {ExecutionPlan, QueryHistory, QueryResult} from '@/pages/sql-editor/types';
import {sqlExecuteApi, Column} from '@/api/DSApi';
import {loader} from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// 预加载 Monaco 编辑器 - 使用本地 monaco-editor
loader.config({monaco});

let monacoLoaded = false;
const loadMonaco = () => {
    if (monacoLoaded) return Promise.resolve();
    return loader.init().then(() => {
        monacoLoaded = true;
    });
};

const {Content} = Layout;

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
    [tableName: string]: Column[];
}

// localStorage key
const STORAGE_KEY = 'business_ds_sql_tabs';
const ACTIVE_TAB_KEY = 'business_ds_sql_active_tab';

// 生成唯一ID
const generateId = () => Date.now().toString();

// 从 localStorage 加载 tabs
const loadTabsFromStorage = (): { tabs: QueryTab[], activeTab: string } => {
    try {
        const savedTabs = localStorage.getItem(STORAGE_KEY);
        const savedActiveTab = localStorage.getItem(ACTIVE_TAB_KEY);
        if (savedTabs) {
            const tabs = JSON.parse(savedTabs);
            const cleanTabs = tabs.map((tab: QueryTab) => ({
                ...tab,
                result: null,
                executionPlan: null,
                error: null
            }));
            return {
                tabs: cleanTabs.length > 0 ? cleanTabs : [{
                    id: '1',
                    name: '查询 1',
                    sql: '',
                    result: null,
                    executionPlan: null,
                    error: null
                }],
                activeTab: savedActiveTab && cleanTabs.some((t: QueryTab) => t.id === savedActiveTab) ? savedActiveTab : cleanTabs[0]?.id || '1'
            };
        }
    } catch (e) {
        console.error('加载 tabs 失败:', e);
    }
    return {
        tabs: [{id: '1', name: '查询 1', sql: '', result: null, executionPlan: null, error: null}],
        activeTab: '1'
    };
};

const BusinessDsSqlPage: React.FC = () => {
    const initialState = useMemo(() => loadTabsFromStorage(), []);

    const [tabs, setTabs] = useState<QueryTab[]>(initialState.tabs);
    const [activeTab, setActiveTab] = useState(initialState.activeTab);
    const [loading, setLoading] = useState(false);
    const [editorInitializing, setEditorInitializing] = useState(true);

    // 当前选中的数据源和数据库
    const [selectedDsName, setSelectedDsName] = useState<string | null>(null);
    const [selectedDbName, setSelectedDbName] = useState<string | null>(null);

    // 预加载 Monaco 编辑器
    useEffect(() => {
        loadMonaco()
            .then(() => setEditorInitializing(false))
            .catch((err) => {
                console.error('Monaco 加载失败:', err);
                setEditorInitializing(false);
            });
    }, []);

    const [tableColumnsCache, setTableColumnsCache] = useState<TableColumnsCache>({});
    const [resultActiveTab, setResultActiveTab] = useState('result');

    // 重命名相关状态
    const [editingTabId, setEditingTabId] = useState<string | null>(null);
    const [editingTabName, setEditingTabName] = useState('');

    // 拖拽相关状态
    const [siderWidth, setSiderWidth] = useState(280);
    const [editorHeight, setEditorHeight] = useState(400);
    const [isDraggingSider, setIsDraggingSider] = useState(false);
    const [isDraggingEditor, setIsDraggingEditor] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const activeTabRef = useRef(activeTab);
    useEffect(() => {
        activeTabRef.current = activeTab;
    }, [activeTab]);

    // 持久化 tabs 到 localStorage
    useEffect(() => {
        const tabsToSave = tabs.map(tab => ({
            id: tab.id,
            name: tab.name,
            sql: tab.sql,
            result: null,
            executionPlan: null,
            error: null
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tabsToSave));
        localStorage.setItem(ACTIVE_TAB_KEY, activeTab);
    }, [tabs, activeTab]);

    // 左侧边栏拖拽处理
    const handleSiderMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDraggingSider(true);
    }, []);

    // 编辑器高度拖拽处理
    const handleEditorMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDraggingEditor(true);
    }, []);

    // 全局鼠标移动和释放事件
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDraggingSider) {
                const newWidth = e.clientX;
                if (newWidth >= 200 && newWidth <= 500) {
                    setSiderWidth(newWidth);
                }
            }
            if (isDraggingEditor && containerRef.current) {
                const containerRect = containerRef.current.getBoundingClientRect();
                const headerHeight = 41;
                const newHeight = e.clientY - containerRect.top - headerHeight;
                if (newHeight >= 150 && newHeight <= containerRect.height - headerHeight - 150) {
                    setEditorHeight(newHeight);
                }
            }
        };

        const handleMouseUp = () => {
            setIsDraggingSider(false);
            setIsDraggingEditor(false);
        };

        if (isDraggingSider || isDraggingEditor) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = isDraggingSider ? 'col-resize' : 'row-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isDraggingSider, isDraggingEditor]);

    const currentTab = useMemo(() => tabs.find(t => t.id === activeTab), [tabs, activeTab]);

    const handleSQLChange = useCallback((sql: string) => {
        const currentActiveTab = activeTabRef.current;
        setTabs(prev => prev.map(t =>
            t.id === currentActiveTab ? {...t, sql} : t
        ));
    }, []);

    // 新建标签页
    const handleAddTab = useCallback(() => {
        const newId = generateId();
        setTabs(prev => {
            const newTab: QueryTab = {
                id: newId,
                name: `查询 ${prev.length + 1}`,
                sql: '',
                result: null,
                executionPlan: null,
                error: null
            };
            return [...prev, newTab];
        });
        setTimeout(() => setActiveTab(newId), 0);
    }, []);

    // 关闭标签页
    const handleCloseTab = useCallback((tabId: string) => {
        setTabs(prev => {
            if (prev.length === 1) {
                message.warning('至少保留一个查询标签页');
                return prev;
            }
            const newTabs = prev.filter(t => t.id !== tabId);
            if (activeTabRef.current === tabId) {
                setActiveTab(newTabs[0].id);
            }
            return newTabs;
        });
    }, []);

    // 执行 SQL
    const handleExecute = useCallback(async (sqlToExecute?: string) => {
        if (!selectedDsName || !selectedDbName) {
            message.warning('请先选择数据源和数据库');
            return;
        }

        const currentActiveTab = activeTabRef.current;
        const currentTabData = tabs.find(t => t.id === currentActiveTab);

        const sql = sqlToExecute || currentTabData?.sql || '';

        if (!sql.trim()) {
            message.warning('请输入SQL语句');
            return;
        }

        setLoading(true);

        try {
            const resp = await sqlExecuteApi.execute(selectedDsName, selectedDbName, {
                sql,
                limit: 1000
            });

            if (resp.code === 200) {
                const result = resp.data;

                const queryResult: QueryResult = {
                    columns: result.columns || [],
                    rows: result.rows || [],
                    total: result.rowCount || 0,
                    duration: 0 // TODO: 后端返回耗时
                };

                setTabs(prev => prev.map(t =>
                    t.id === currentActiveTab
                        ? {...t, result: queryResult, error: null, executionPlan: null}
                        : t
                ));

                saveHistory(sql, 'success', 0, result.rowCount);
                setResultActiveTab('result');
                message.success(`执行成功，返回 ${result.rowCount || 0} 行数据`);
            } else {
                throw new Error(resp.message || '执行失败');
            }
        } catch (error: any) {
            const errorMessage = error.message || 'SQL执行失败';

            setTabs(prev => prev.map(t =>
                t.id === currentActiveTab
                    ? {...t, result: null, error: errorMessage, executionPlan: null}
                    : t
            ));

            saveHistory(sql, 'error', 0);
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [tabs, selectedDsName, selectedDbName]);

    // 查看执行计划
    const handleExecutePlan = useCallback(async () => {
        if (!selectedDsName || !selectedDbName) {
            message.warning('请先选择数据源和数据库');
            return;
        }

        const currentActiveTab = activeTabRef.current;
        const currentTabData = tabs.find(t => t.id === currentActiveTab);

        if (!currentTabData?.sql.trim()) {
            message.warning('请输入SQL语句');
            return;
        }

        setLoading(true);

        try {
            const explainSql = `EXPLAIN ${currentTabData.sql}`;
            const resp = await sqlExecuteApi.execute(selectedDsName, selectedDbName, {
                sql: explainSql
            });

            if (resp.code === 200) {
                const result = resp.data;
                const plan: ExecutionPlan[] = (result.rows || []).map((row: any, index: number) => ({
                    id: String(index + 1),
                    operation: row.operation || row.Operation || row.id || '',
                    rowCount: row.rows || row.Rows || row.row_count || 0,
                    cost: row.cost || row.Cost || 0,
                    details: row.details || row.Details || JSON.stringify(row),
                }));

                setTabs(prev => prev.map(t =>
                    t.id === currentActiveTab
                        ? {...t, executionPlan: plan, error: null}
                        : t
                ));

                setResultActiveTab('plan');
                message.success('执行计划生成成功');
            }
        } catch (error: any) {
            message.error(error.message || '获取执行计划失败');
        } finally {
            setLoading(false);
        }
    }, [tabs, selectedDsName, selectedDbName]);

    // 格式化 SQL
    const handleFormat = useCallback(() => {
        const currentTabData = tabs.find(t => t.id === activeTabRef.current);
        if (!currentTabData?.sql) return;

        let formatted = currentTabData.sql
            .replace(/\s+/g, ' ')
            .replace(/\s*,\s*/g, ',\n    ')
            .replace(/\s+(SELECT|FROM|WHERE|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|GROUP BY|HAVING|ORDER BY|LIMIT|UNION|WITH)/gi, '\n$1')
            .replace(/\s+(AND|OR)/gi, '\n    $1')
            .trim();

        handleSQLChange(formatted);
        message.success('SQL已格式化');
    }, [tabs, handleSQLChange]);

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

        const saved = localStorage.getItem('business_ds_sql_history');
        let history: QueryHistory[] = saved ? JSON.parse(saved) : [];
        history = [historyItem, ...history].slice(0, 50);
        localStorage.setItem('business_ds_sql_history', JSON.stringify(history));
    };

    // 选择数据库
    const handleDatabaseSelect = useCallback((dsName: string, dbName: string) => {
        setSelectedDsName(dsName);
        setSelectedDbName(dbName);
        message.info(`已选择数据库: ${dbName}`);
    }, []);

    // 选择表
    const handleTableSelect = useCallback((dsName: string, dbName: string, tableName: string, columns?: Column[]) => {
        setSelectedDsName(dsName);
        setSelectedDbName(dbName);
        const selectSQL = `SELECT * FROM ${tableName} LIMIT 100;`;
        handleSQLChange(selectSQL);

        if (columns) {
            setTableColumnsCache(prev => ({
                ...prev,
                [tableName]: columns,
            }));
        }
    }, [handleSQLChange]);

    // 选择历史记录
    const handleHistorySelect = useCallback((sql: string) => {
        handleSQLChange(sql);
    }, [handleSQLChange]);

    // 开始重命名
    const handleStartRename = useCallback((tabId: string, currentName: string) => {
        setEditingTabId(tabId);
        setEditingTabName(currentName);
    }, []);

    // 完成重命名
    const handleFinishRename = useCallback(() => {
        if (editingTabId && editingTabName.trim()) {
            setTabs(prev => prev.map(t =>
                t.id === editingTabId ? {...t, name: editingTabName.trim()} : t
            ));
        }
        setEditingTabId(null);
        setEditingTabName('');
    }, [editingTabId, editingTabName]);

    // 标签页配置
    const tabItems = useMemo(() => tabs.map(tab => ({
        key: tab.id,
        label: editingTabId === tab.id ? (
            <Input
                autoFocus
                size="small"
                value={editingTabName}
                onChange={(e) => setEditingTabName(e.target.value)}
                onBlur={handleFinishRename}
                onPressEnter={handleFinishRename}
                style={{width: 100}}
                onClick={(e) => e.stopPropagation()}
            />
        ) : (
            <span onDoubleClick={() => handleStartRename(tab.id, tab.name)}>
                <CodeOutlined style={{marginRight: 4}}/>
                {tab.name}
            </span>
        ),
        children: null
    })), [tabs, editingTabId, editingTabName, handleStartRename, handleFinishRename]);

    return (
        <Layout style={{height: '100%', background: '#f5f5f5', display: 'flex', flexDirection: 'row'}}>
            {/* 左侧边栏 */}
            <div style={{
                width: siderWidth,
                minWidth: 200,
                background: '#fff',
                position: 'relative',
                flexShrink: 0
            }}>
                <Sidebar
                    selectedDsName={selectedDsName}
                    selectedDbName={selectedDbName}
                    onDatabaseSelect={handleDatabaseSelect}
                    onTableSelect={handleTableSelect}
                    onHistorySelect={handleHistorySelect}
                />
                {/* 左侧拖拽条 */}
                <div
                    onMouseDown={handleSiderMouseDown}
                    style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: 6,
                        cursor: 'col-resize',
                        background: isDraggingSider ? '#1890ff' : 'transparent',
                        zIndex: 10,
                        transition: 'background 0.2s'
                    }}
                />
            </div>

            {/* 主内容区 */}
            <Content style={{display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden'}}
                     ref={containerRef}>
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
                            if (action === 'add') {
                                handleAddTab();
                            } else if (action === 'remove' && typeof targetKey === 'string') {
                                handleCloseTab(targetKey);
                            }
                        }}
                        hideAdd={false}
                        addIcon={<PlusOutlined/>}
                        tabBarStyle={{marginBottom: 0}}
                        tabBarExtraContent={
                            <span style={{color: '#999', fontSize: 12}}>
                                <DatabaseOutlined style={{marginRight: 4}}/>
                                {selectedDsName && selectedDbName
                                    ? `当前数据库: ${selectedDbName}`
                                    : '请选择数据源和数据库'}
                            </span>
                        }
                    />
                </div>

                {/* 当前标签页内容 */}
                <div style={{flex: 1, overflow: 'hidden'}}>
                    {editorInitializing ? (
                        <div style={{
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#fff',
                            flexDirection: 'column',
                            gap: 16
                        }}>
                            <Spin size="large"/>
                            <div style={{color: '#999', fontSize: 14}}>SQL 编辑器初始化中...</div>
                        </div>
                    ) : currentTab && (
                        <div style={{height: '100%', display: 'flex', flexDirection: 'column', background: '#fff'}}>
                            {/* SQL 编辑器 */}
                            <div style={{height: editorHeight, minHeight: 250, borderBottom: '1px solid #f0f0f0'}}>
                                <SQLEditor
                                    value={currentTab.sql}
                                    onChange={handleSQLChange}
                                    onExecute={handleExecute}
                                    onExecutePlan={handleExecutePlan}
                                    onFormat={handleFormat}
                                    tableColumnsCache={tableColumnsCache}
                                />
                            </div>
                            {/* 水平拖拽条 */}
                            <div
                                onMouseDown={handleEditorMouseDown}
                                style={{
                                    height: 6,
                                    cursor: 'row-resize',
                                    background: isDraggingEditor ? '#1890ff' : '#f0f0f0',
                                    transition: 'background 0.2s',
                                    flexShrink: 0
                                }}
                            />
                            {/* 结果面板 */}
                            <div style={{flex: 1, minHeight: 150, overflow: 'hidden'}}>
                                <ResultPanel
                                    loading={loading}
                                    result={currentTab.result}
                                    executionPlan={currentTab.executionPlan}
                                    error={currentTab.error}
                                    activeTab={resultActiveTab}
                                    onTabChange={setResultActiveTab}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </Content>
        </Layout>
    );
};

export default BusinessDsSqlPage;
