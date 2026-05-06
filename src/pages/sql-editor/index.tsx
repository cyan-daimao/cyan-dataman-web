import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Input, Layout, message, Tabs, Spin} from 'antd';
import {CodeOutlined, DatabaseOutlined, PlusOutlined} from '@ant-design/icons';
import Sidebar from './components/Sidebar';
import SQLEditor from './components/SQLEditor';
import ResultPanel from './components/ResultPanel';
import {ExecutionPlan, QueryHistory, QueryResult} from './types';
import {ColumnVO} from '../../api/MetadataTableAPI';
import {executeSql} from '../../api/DatagawayApi';
import {loader} from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// 预加载 Monaco 编辑器 - 使用本地 monaco-editor
loader.config({ monaco });

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
    [tableName: string]: ColumnVO[];
}

// localStorage key
const STORAGE_KEY = 'sql_editor_tabs';
const ACTIVE_TAB_KEY = 'sql_editor_active_tab';

// 生成唯一ID
const generateId = () => Date.now().toString();

// 从 localStorage 加载 tabs
const loadTabsFromStorage = (): { tabs: QueryTab[], activeTab: string } => {
    try {
        const savedTabs = localStorage.getItem(STORAGE_KEY);
        const savedActiveTab = localStorage.getItem(ACTIVE_TAB_KEY);
        if (savedTabs) {
            const tabs = JSON.parse(savedTabs);
            // 清除 result 和 executionPlan，因为这些都是临时的
            const cleanTabs = tabs.map((tab: QueryTab) => ({
                ...tab,
                result: null,
                executionPlan: null,
                error: null
            }));
            return {
                tabs: cleanTabs.length > 0 ? cleanTabs : [{id: '1', name: '查询 1', sql: '', result: null, executionPlan: null, error: null}],
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

const SQLEditorPage: React.FC = () => {
    // 从 localStorage 初始化状态
    const initialState = useMemo(() => loadTabsFromStorage(), []);

    const [tabs, setTabs] = useState<QueryTab[]>(initialState.tabs);
    const [activeTab, setActiveTab] = useState(initialState.activeTab);
    const [loading, setLoading] = useState(false);
    const [editorInitializing, setEditorInitializing] = useState(true);

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
    const [availableTables, setAvailableTables] = useState<Array<{name: string; title: string}>>([]);
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
    
    // 使用 ref 保存最新的 activeTab，避免闭包问题
    const activeTabRef = useRef(activeTab);
    useEffect(() => {
        activeTabRef.current = activeTab;
    }, [activeTab]);

    // 持久化 tabs 到 localStorage（只保存 sql 和基本信息，不保存 result）
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

    // 当前活动的标签页
    const currentTab = useMemo(() => tabs.find(t => t.id === activeTab), [tabs, activeTab]);

    // 更新当前标签页的 SQL - 使用 ref 获取最新的 activeTab
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
        setActiveTab(newId => newId); // 使用函数形式确保使用最新值
        // 直接设置，因为 generateId 在外面已经生成了
        setTimeout(() => setActiveTab(newId), 0);
    }, []);

    // 关闭标签页 - 修复逻辑
    const handleCloseTab = useCallback((tabId: string) => {
        setTabs(prev => {
            if (prev.length === 1) {
                message.warning('至少保留一个查询标签页');
                return prev;
            }
            const newTabs = prev.filter(t => t.id !== tabId);
            // 如果关闭的是当前活动的 tab，切换到第一个 tab
            if (activeTabRef.current === tabId) {
                setActiveTab(newTabs[0].id);
            }
            return newTabs;
        });
    }, []);

    // 执行 SQL
    const handleExecute = useCallback(async (sqlToExecute?: string) => {
        const currentActiveTab = activeTabRef.current;
        const currentTabData = tabs.find(t => t.id === currentActiveTab);
        
        // 使用传入的 SQL 或当前 tab 的全部 SQL
        const sql = sqlToExecute || currentTabData?.sql || '';
        
        if (!sql.trim()) {
            message.warning('请输入SQL语句');
            return;
        }

        setLoading(true);

        try {
            const resp = await executeSql(sql);
            const result = resp.data;
            const columns = result.data.length > 0 ? Object.keys(result.data[0]) : [];
            
            const queryResult: QueryResult = {
                columns,
                rows: result.data,
                total: result.data.length,
                duration: result.costTimeMs
            };

            setTabs(prev => prev.map(t => 
                t.id === currentActiveTab 
                    ? {...t, result: queryResult, error: null, executionPlan: null}
                    : t
            ));
            
            saveHistory(sql, 'success', result.costTimeMs, result.data.length);
            setResultActiveTab('result');
            message.success(`执行成功，返回 ${result.data.length} 行数据，耗时 ${result.costTimeMs}ms`);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'SQL执行失败';
            
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
    }, [tabs]);

    // 查看执行计划
    const handleExecutePlan = useCallback(async () => {
        const currentActiveTab = activeTabRef.current;
        const currentTabData = tabs.find(t => t.id === currentActiveTab);
        
        if (!currentTabData?.sql.trim()) {
            message.warning('请输入SQL语句');
            return;
        }

        setLoading(true);

        try {
            const explainSql = `EXPLAIN ${currentTabData.sql}`;
            const resp = await executeSql(explainSql);
            const result = resp.data;
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const plan: ExecutionPlan[] = result.data.map((row: any, index: number) => ({
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
            message.success(`执行计划生成成功，耗时 ${result.costTimeMs}ms`);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : '获取执行计划失败';
            
            setTabs(prev => prev.map(t => 
                t.id === currentActiveTab 
                    ? {...t, executionPlan: null, error: errorMessage}
                    : t
            ));
            
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [tabs]);

    // 格式化 SQL
    const handleFormat = useCallback(() => {
        const currentTabData = tabs.find(t => t.id === activeTabRef.current);
        if (!currentTabData?.sql) return;
        
        const formatted = currentTabData.sql
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
        const fullTableName = table.schema ? `${table.schema}.${table.name}` : table.name;
        const selectSQL = `SELECT * FROM ${fullTableName} LIMIT 100;`;
        handleSQLChange(selectSQL);
        
        if (table.columns) {
            setTableColumnsCache(prev => ({
                ...prev,
                [fullTableName]: table.columns!,
                [table.name]: table.columns!
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
                maxWidth: 500,
                background: '#fff',
                position: 'relative',
                flexShrink: 0,
                height: '100%'
            }}>
                <Sidebar
                    currentSql={currentTab?.sql || ''}
                    onTableSelect={handleTableSelect}
                    onHistorySelect={handleHistorySelect}
                    onFavoriteSelect={handleFavoriteSelect}
                    onTableListLoaded={setAvailableTables}
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
            <Content style={{display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden'}} ref={containerRef}>
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
                                数据仓库SQL编辑器,默认只展示1000行
                            </span>
                        }
                    />
                </div>

                {/* 当前标签页内容 */}
                <div style={{flex: 1, overflow: 'hidden'}}>
                    {editorInitializing ? (
                        <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', flexDirection: 'column', gap: 16}}>
                            <Spin size="large" />
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
                                    availableTables={availableTables}
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

export default SQLEditorPage;
