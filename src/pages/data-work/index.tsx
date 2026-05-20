import React, {useCallback, useEffect, useRef, useState} from 'react';
import {message, Spin, Button, Space, Divider, Tooltip, Modal} from 'antd';
import {
    PlayCircleOutlined,
    SaveOutlined,
    FormatPainterOutlined,
    ReloadOutlined,
    CloudUploadOutlined,
    ShareAltOutlined,
    FileTextOutlined,
    ThunderboltOutlined,
    BranchesOutlined,
    SettingOutlined,

} from '@ant-design/icons';
import {loader} from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import SQLEditor from '@/pages/sql-editor/components/SQLEditor';
import DataWorkResultPanel from './components/DataWorkResultPanel';
import {ColumnVO} from '@/api/MetadataTableAPI.ts';
import {
    JobDTO,
    ScheduleConfigDTO,
    JobInstanceDTO,
    createJob,
    updateJob,
    getJob,
    getJobSchedule,
    saveJobSchedule,
    deleteJob,
    publishJob,
    executeJob,
} from '@/api/DataworksApi.ts';
import { executeSparkSql } from '@/api/DatagawayApi.ts';
import { authFilterSql } from '@/api/DataAuthApi';
import { KEY } from '@/utils/storage';
import {QueryResult, ExecutionPlan} from '@/pages/sql-editor/types';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';

// 预加载 Monaco
loader.config({monaco});
let monacoLoaded = false;
const loadMonaco = () => {
    if (monacoLoaded) return Promise.resolve();
    return loader.init().then(() => {
        monacoLoaded = true;
    });
};

// 表字段缓存
interface TableColumnsCache {
    [tableName: string]: ColumnVO[];
}

// Tab 数据
interface TabData {
    tabId: string; // Tab 唯一标识（未保存任务用临时 ID）
    task: JobDTO;
    schedule: ScheduleConfigDTO;
    sqlContent: string;
    result: QueryResult | null;
    executionPlan: ExecutionPlan[] | null;
    error: string | null;
    resultActiveTab: string;
    logs: string[];
    isModified: boolean; // 是否有未保存修改
}

// 生成空任务
const createEmptyTask = (): JobDTO => ({
    id: '',
    name: '未命名任务',
    description: '',
    engineType: 'SPARK',
    nodeType: 'SPARK_SQL',
    sqlContent: '',
    configJson: '',
    status: 'DRAFT',
});

// 生成默认调度配置
const createEmptySchedule = (jobId: string = ''): ScheduleConfigDTO => ({
    id: '',
    jobId,
    cronExpression: '',
    enabled: false,
});

// 生成新 Tab
const createNewTab = (): TabData => ({
    tabId: `new-${Date.now()}`,
    task: createEmptyTask(),
    schedule: createEmptySchedule(),
    sqlContent: '',
    result: null,
    executionPlan: null,
    error: null,
    resultActiveTab: 'result',
    logs: [],
    isModified: false,
});

// localStorage keys（使用新 key 避免与旧数据结构冲突）
const STORAGE_KEY = 'data_work_workspace_tabs_v2';
const ACTIVE_TAB_KEY = 'data_work_workspace_active_tab_v2';

// 持久化时只保存可序列化的基本信息，不保存运行时结果
interface PersistedTab {
    tabId: string;
    task: JobDTO;
    schedule: ScheduleConfigDTO;
    sqlContent: string;
    isModified: boolean;
    resultActiveTab: string;
}

const loadTabsFromStorage = (): { tabs: TabData[]; activeTabId: string } => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const savedActive = localStorage.getItem(ACTIVE_TAB_KEY);
        if (saved) {
            const persisted: PersistedTab[] = JSON.parse(saved);
            // 防御性校验：只恢复字段完整的 tab，避免旧数据/脏数据导致崩溃
            const tabs = persisted
                .filter((p): p is PersistedTab => !!p && typeof p.tabId === 'string' && !!p.task)
                .map((p) => ({
                    ...p,
                    schedule: p.schedule || createEmptySchedule(p.task.id),
                    sqlContent: p.sqlContent ?? '',
                    resultActiveTab: p.resultActiveTab || 'result',
                    result: null,
                    executionPlan: null,
                    error: null,
                    logs: [],
                }));
            if (tabs.length > 0) {
                const activeTabId = savedActive && tabs.some((t) => t.tabId === savedActive)
                    ? savedActive
                    : tabs[0].tabId;
                return { tabs, activeTabId };
            }
        }
    } catch (e) {
        console.error('加载数据加工 tabs 失败:', e);
    }
    const defaultTab = createNewTab();
    return { tabs: [defaultTab], activeTabId: defaultTab.tabId };
};

let tempIdCounter = 0;

const DataWorkWorkspace: React.FC = () => {
    // ========== Monaco 初始化 ==========
    const [editorInitializing, setEditorInitializing] = useState(true);
    useEffect(() => {
        loadMonaco()
            .then(() => setEditorInitializing(false))
            .catch(() => setEditorInitializing(false));
    }, []);

    // ========== Tab 状态（从 localStorage 恢复）==========
    const initialState = React.useMemo(() => loadTabsFromStorage(), []);
    const [tabs, setTabs] = useState<TabData[]>(initialState.tabs);
    const [activeTabId, setActiveTabId] = useState<string>(initialState.activeTabId);

    const activeTab = tabs.find(t => t.tabId === activeTabId) || tabs[0];

    // 持久化 tabs 到 localStorage（只保存基本信息，不保存运行时结果）
    useEffect(() => {
        const toSave: PersistedTab[] = tabs.map(t => ({
            tabId: t.tabId,
            task: t.task,
            schedule: t.schedule,
            sqlContent: t.sqlContent,
            isModified: t.isModified,
            resultActiveTab: t.resultActiveTab,
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        localStorage.setItem(ACTIVE_TAB_KEY, activeTabId);
    }, [tabs, activeTabId]);

    // ========== 操作状态 ==========
    const [saving, setSaving] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

    // ========== 布局状态 ==========
    const [siderWidth, setSiderWidth] = useState(260);
    const [rightSiderWidth, setRightSiderWidth] = useState(320);
    const [rightActivePanel, setRightActivePanel] = useState<'property' | 'schedule' | 'version' | 'settings' | null>('property');

    const handleRightPanelChange = useCallback((panel: 'property' | 'schedule' | 'version' | 'settings' | null) => {
        setRightActivePanel(prev => {
            if (panel === null) return null;
            return prev === panel ? null : panel;
        });
    }, []);
    const [editorHeight, setEditorHeight] = useState(420);
    const [isDraggingSider, setIsDraggingSider] = useState(false);
    const [isDraggingRightSider, setIsDraggingRightSider] = useState(false);
    const [isDraggingEditor, setIsDraggingEditor] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // ========== 数据源状态 ==========
    const [tableColumnsCache, setTableColumnsCache] = useState<TableColumnsCache>({});
    const [availableTables, setAvailableTables] = useState<Array<{name: string; title: string}>>([]);

    // ========== 拖拽处理 ==========
    const handleSiderMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDraggingSider(true);
    }, []);

    const handleRightSiderMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDraggingRightSider(true);
    }, []);

    const handleEditorMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDraggingEditor(true);
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDraggingSider) {
                const newWidth = e.clientX;
                if (newWidth >= 200 && newWidth <= 400) setSiderWidth(newWidth);
            }
            if (isDraggingRightSider) {
                const newPanelWidth = window.innerWidth - e.clientX - 44;
                if (newPanelWidth >= 260 && newPanelWidth <= 400) {
                    setRightSiderWidth(newPanelWidth);
                }
            }
            if (isDraggingEditor && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const newHeight = e.clientY - rect.top;
                if (newHeight >= 150 && newHeight <= rect.height - 150) setEditorHeight(newHeight);
            }
        };
        const handleMouseUp = () => {
            setIsDraggingSider(false);
            setIsDraggingRightSider(false);
            setIsDraggingEditor(false);
        };
        if (isDraggingSider || isDraggingRightSider || isDraggingEditor) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = 'none';
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = '';
        };
    }, [isDraggingSider, isDraggingRightSider, isDraggingEditor]);

    // ========== 加载任务到 Tab ==========
    const loadTaskToTab = useCallback(async (task: JobDTO, targetTabId: string) => {
        let schedule = createEmptySchedule(task.id);
        if (task.id) {
            try {
                const sched = await getJobSchedule(task.id);
                if (sched) schedule = sched;
            } catch {
                // ignore
            }
        }
        setTabs(prev => prev.map(t => t.tabId === targetTabId ? {
            ...t,
            task,
            sqlContent: task.sqlContent || '',
            schedule,
            result: null,
            executionPlan: null,
            error: null,
            resultActiveTab: 'result',
            logs: [],
            isModified: false,
        } : t));
    }, []);

    // ========== 新建任务（新开 Tab）==========
    const handleNewTask = useCallback(() => {
        const newTab = createNewTab();
        newTab.tabId = `new-${Date.now()}-${++tempIdCounter}`;
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTab.tabId);
    }, []);

    // ========== 关闭 Tab ==========
    const doCloseTab = useCallback((tabId: string) => {
        setTabs(prev => {
            const idx = prev.findIndex(t => t.tabId === tabId);
            if (prev.length <= 1) {
                // 最后一个 Tab，重置为全新 Tab
                const newTab = createNewTab();
                setActiveTabId(newTab.tabId);
                return [newTab];
            }
            const next = prev.filter(t => t.tabId !== tabId);
            // 如果关闭的是当前激活的 Tab，切换到前一个
            if (tabId === activeTabId) {
                const newIdx = Math.max(0, idx - 1);
                setActiveTabId(next[newIdx].tabId);
            }
            return next;
        });
    }, [activeTabId]);

    const handleCloseTab = useCallback((tabId: string) => {
        const tab = tabs.find(t => t.tabId === tabId);
        if (tab?.isModified) {
            Modal.confirm({
                title: '确认关闭',
                content: `「${tab.task.name || '未命名任务'}」有未保存的修改，关闭后将丢失更改，是否继续？`,
                okText: '关闭',
                cancelText: '取消',
                onOk: () => doCloseTab(tabId),
            });
        } else {
            doCloseTab(tabId);
        }
    }, [tabs, doCloseTab]);

    // ========== 保存任务 ==========
    const handleSave = useCallback(async () => {
        const tab = tabs.find(t => t.tabId === activeTabId);
        if (!tab) return;

        if (!tab.task.name.trim()) {
            message.warning('请输入任务名称');
            return;
        }
        const body = {
            name: tab.task.name.trim(),
            description: tab.task.description,
            engineType: tab.task.engineType,
            nodeType: tab.task.nodeType || (tab.task.engineType === 'FLINK' ? 'FLINK_SQL' : 'SPARK_SQL'),
            sqlContent: tab.sqlContent,
            configJson: tab.task.configJson,
        };
        setSaving(true);
        try {
            let savedTask: JobDTO;
            if (!tab.task.id) {
                const resp = await createJob(body);
                savedTask = resp.data;
                message.success('任务创建成功');
                setSidebarRefreshKey(prev => prev + 1);
            } else {
                const resp = await updateJob(tab.task.id, body);
                savedTask = resp.data;
                message.success('任务更新成功');
                setSidebarRefreshKey(prev => prev + 1);
            }
            // 保存调度配置
            if (savedTask.id && tab.schedule.cronExpression) {
                await saveJobSchedule(savedTask.id, {
                    cronExpression: tab.schedule.cronExpression,
                    enabled: tab.schedule.enabled || false,
                });
            }
            // 刷新当前任务状态
            const freshTask = await getJob(savedTask.id);
            const freshSchedule = await getJobSchedule(freshTask.id).catch(() => createEmptySchedule(freshTask.id));
            setTabs(prev => prev.map(t => t.tabId === activeTabId ? {
                ...t,
                task: freshTask,
                sqlContent: freshTask.sqlContent || '',
                schedule: freshSchedule || createEmptySchedule(freshTask.id),
                isModified: false,
            } : t));
        } catch {
            // 错误由拦截器处理
        } finally {
            setSaving(false);
        }
    }, [tabs, activeTabId]);

    // ========== 发布任务 ==========
    const handlePublish = useCallback(async () => {
        const tab = tabs.find(t => t.tabId === activeTabId);
        if (!tab) return;
        if (!tab.task.id) {
            message.warning('请先保存任务');
            return;
        }
        if (tab.task.status === 'ONLINE') {
            message.info('任务已发布');
            return;
        }
        setPublishing(true);
        try {
            const resp = await publishJob(tab.task.id);
            const publishedTask = resp.data;
            message.success('任务发布成功');
            setTabs(prev => prev.map(t => t.tabId === activeTabId ? {
                ...t,
                task: publishedTask,
                isModified: false,
            } : t));
            setSidebarRefreshKey(prev => prev + 1);
        } catch {
            // 错误由拦截器处理
        } finally {
            setPublishing(false);
        }
    }, [tabs, activeTabId]);

    // ========== 执行任务 ==========
    const handleExecute = useCallback(async () => {
        const tab = tabs.find(t => t.tabId === activeTabId);
        if (!tab) return;

        if (tab.task.engineType === 'FLINK') {
            if (!tab.task.id || tab.isModified) {
                message.warning('请先保存任务后再执行FlinkSQL节点');
                return;
            }
            setExecuting(true);
            setTabs(prev => prev.map(t => t.tabId === activeTabId ? {
                ...t,
                result: null,
                executionPlan: null,
                error: null,
                logs: [
                    `[${new Date().toLocaleString()}] INFO 开始执行 ${tab.task.nodeType || 'FLINK_SQL'}: ${tab.task.name}`,
                ],
            } : t));
            try {
                const resp = await executeJob(tab.task.id);
                const instance = resp.data;
                setTabs(prev => prev.map(t => t.tabId === activeTabId ? {
                    ...t,
                    error: instance.errorMessage || null,
                    logs: [
                        ...t.logs,
                        `[${new Date().toLocaleString()}] INFO 实例状态: ${instance.status}`,
                        `[${new Date().toLocaleString()}] INFO 执行SQL快照:`,
                        ...(instance.sqlContent || '').split('\n').map(line => `    ${line}`),
                        ...(instance.errorMessage ? [`[${new Date().toLocaleString()}] ERROR ${instance.errorMessage}`] : []),
                    ],
                } : t));
                if (instance.status === 'SUCCESS') {
                    message.success('任务执行成功');
                } else {
                    message.error(instance.errorMessage || '任务执行失败');
                }
            } catch (e: unknown) {
                const errMsg = e instanceof Error ? e.message : '执行异常';
                setTabs(prev => prev.map(t => t.tabId === activeTabId ? {
                    ...t,
                    error: errMsg,
                    logs: [...t.logs, `[${new Date().toLocaleString()}] ERROR ${errMsg}`],
                } : t));
                message.error(errMsg);
            } finally {
                setExecuting(false);
            }
            return;
        }

        if (!tab.sqlContent.trim()) {
            message.warning('请输入SQL语句');
            return;
        }

        // 权限校验
        try {
            const currentStr = localStorage.getItem(KEY.CURRENT);
            const passport = currentStr ? JSON.parse(currentStr).passport : '';
            const authResp = await authFilterSql({passport, sql: tab.sqlContent, engine: 'spark'});
            if (!authResp.data?.permitted) {
                message.error(authResp.data?.reason || '无权执行该SQL');
                return;
            }
        } catch {
            // 权限校验异常时继续执行
        }

        setExecuting(true);
        setTabs(prev => prev.map(t => t.tabId === activeTabId ? {
            ...t,
            result: null,
            executionPlan: null,
            error: null,
        } : t));

        const startTime = Date.now();
        const newLogs: string[] = [
            `[${new Date().toLocaleString()}] INFO 开始执行 SparkSQL: ${tab.task.name}`,
            `[${new Date().toLocaleString()}] INFO SQL 内容:`,
            ...tab.sqlContent.split('\n').map(line => `    ${line}`),
        ];
        setTabs(prev => prev.map(t => t.tabId === activeTabId ? {...t, logs: newLogs} : t));

        try {
            const resp = await executeSparkSql(tab.sqlContent);
            const record = resp.data;
            const cost = Date.now() - startTime;
            if (record.status === 'SUCCESS' && record.data) {
                const data = record.data;
                const columns = Array.isArray(data) && data.length > 0 ? Object.keys(data[0]) : [];
                const queryResult: QueryResult = {
                    columns,
                    rows: Array.isArray(data) ? data : [],
                    total: Array.isArray(data) ? data.length : 0,
                    duration: record.costTimeMs || cost,
                };
                setTabs(prev => prev.map(t => t.tabId === activeTabId ? {
                    ...t,
                    result: queryResult,
                    error: null,
                    logs: [
                        ...t.logs,
                        `[${new Date().toLocaleString()}] INFO 执行成功`,
                        `[${new Date().toLocaleString()}] INFO 耗时: ${record.costTimeMs || cost}ms`,
                        `[${new Date().toLocaleString()}] INFO 返回行数: ${Array.isArray(data) ? data.length : 0}`,
                    ],
                } : t));
                message.success(`执行成功，耗时 ${record.costTimeMs || cost}ms`);
            } else if (record.status === 'FAILED') {
                setTabs(prev => prev.map(t => t.tabId === activeTabId ? {
                    ...t,
                    result: null,
                    error: record.errorMessage || '执行失败',
                    logs: [
                        ...t.logs,
                        `[${new Date().toLocaleString()}] ERROR 执行失败`,
                        `[${new Date().toLocaleString()}] ERROR ${record.errorMessage || '未知错误'}`,
                    ],
                } : t));
                message.error(record.errorMessage || '执行失败');
            } else {
                setTabs(prev => prev.map(t => t.tabId === activeTabId ? {
                    ...t,
                    result: null,
                    error: '执行状态未知',
                    logs: [...t.logs, `[${new Date().toLocaleString()}] WARN 执行状态未知: ${record.status}`],
                } : t));
            }
        } catch (e: unknown) {
            const errMsg = e instanceof Error ? e.message : '执行异常';
            setTabs(prev => prev.map(t => t.tabId === activeTabId ? {
                ...t,
                result: null,
                error: errMsg,
                logs: [...t.logs, `[${new Date().toLocaleString()}] ERROR ${errMsg}`],
            } : t));
            message.error(errMsg);
        } finally {
            setExecuting(false);
            setTabs(prev => prev.map(t => t.tabId === activeTabId ? {
                ...t,
                logs: [...t.logs, `[${new Date().toLocaleString()}] INFO 任务执行结束`],
            } : t));
        }
    }, [tabs, activeTabId]);

    // ========== 执行计划 ==========
    const handleExecutePlan = useCallback(async () => {
        const tab = tabs.find(t => t.tabId === activeTabId);
        if (!tab) return;

        if (!tab.sqlContent.trim()) {
            message.warning('请输入SQL语句');
            return;
        }
        // 权限校验
        try {
            const currentStr = localStorage.getItem(KEY.CURRENT);
            const passport = currentStr ? JSON.parse(currentStr).passport : '';
            const explainSql = `EXPLAIN ${tab.sqlContent}`;
            const authResp = await authFilterSql({passport, sql: explainSql, engine: 'spark'});
            if (!authResp.data?.permitted) {
                message.error(authResp.data?.reason || '无权执行该SQL');
                return;
            }
        } catch {
            // 权限校验异常时继续执行
        }

        setTabs(prev => prev.map(t => t.tabId === activeTabId ? {
            ...t,
            loading: true as boolean,
        } : t));
        try {
            const {executeSql} = await import('@/api/DatagawayApi');
            const explainSql = `EXPLAIN ${tab.sqlContent}`;
            const resp = await executeSql(explainSql);
            const result = resp.data;
            const plan: ExecutionPlan[] = result.data.map((item: object, idx: number) => {
                const row = item as Record<string, unknown>;
                return {
                    id: String(idx + 1),
                    operation: String(row.operation || row.Operation || ''),
                    rowCount: Number(row.rows || row.Rows || 0),
                    cost: Number(row.cost || row.Cost || 0),
                    details: String(row.details || row.Details || JSON.stringify(row)),
                };
            });
            setTabs(prev => prev.map(t => t.tabId === activeTabId ? {
                ...t,
                executionPlan: plan,
                error: null,
                resultActiveTab: 'plan',
            } : t));
            message.success('执行计划生成成功');
        } catch {
            message.error('获取执行计划失败');
        } finally {
            setTabs(prev => prev.map(t => t.tabId === activeTabId ? {
                ...t,
                loading: false as boolean,
            } : t));
        }
    }, [tabs, activeTabId]);

    // ========== 删除任务 ==========
    const handleDelete = useCallback(async () => {
        const tab = tabs.find(t => t.tabId === activeTabId);
        if (!tab || !tab.task.id) return;
        setDeleting(true);
        try {
            await deleteJob(tab.task.id);
            message.success('任务已删除');
            handleCloseTab(activeTabId);
        } catch {
            // 错误由拦截器处理
        } finally {
            setDeleting(false);
        }
    }, [tabs, activeTabId, handleCloseTab]);

    // ========== 格式化 SQL ==========
    const handleFormat = useCallback(() => {
        const tab = tabs.find(t => t.tabId === activeTabId);
        if (!tab || !tab.sqlContent) return;
        const formatted = tab.sqlContent
            .replace(/\s+/g, ' ')
            .replace(/\s*,\s*/g, ',\n    ')
            .replace(/\s+(SELECT|FROM|WHERE|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|GROUP BY|HAVING|ORDER BY|LIMIT|UNION|WITH)/gi, '\n$1')
            .replace(/\s+(AND|OR)/gi, '\n    $1')
            .trim();
        setTabs(prev => prev.map(t => t.tabId === activeTabId ? {
            ...t,
            sqlContent: formatted,
            isModified: true,
        } : t));
        message.success('SQL已格式化');
    }, [tabs, activeTabId]);

    // ========== 左侧边栏回调 ==========
    const handleTableSelect = useCallback((table: {name: string; tableId: string; catalog?: string; schema?: string; columns?: ColumnVO[]}) => {
        const fullTableName = table.schema ? `${table.schema}.${table.name}` : table.name;
        const selectSQL = `SELECT * FROM ${fullTableName} LIMIT 100;`;
        setTabs(prev => prev.map(t => t.tabId === activeTabId ? {
            ...t,
            sqlContent: selectSQL,
            isModified: true,
        } : t));
        if (table.columns) {
            setTableColumnsCache(prev => ({
                ...prev,
                [fullTableName]: table.columns!,
                [table.name]: table.columns!,
            }));
        }
    }, [activeTabId]);

    const handleTaskSelect = useCallback((task: JobDTO) => {
        // 检查是否已有该任务的 Tab
        const existingTab = tabs.find(t => t.task.id === task.id);
        if (existingTab) {
            setActiveTabId(existingTab.tabId);
            return;
        }
        // 未打开则新开 Tab
        const newTabId = `task-${task.id}`;
        const newTab: TabData = {
            tabId: newTabId,
            task,
            schedule: createEmptySchedule(task.id),
            sqlContent: task.sqlContent || '',
            result: null,
            executionPlan: null,
            error: null,
            resultActiveTab: 'result',
            logs: [],
            isModified: false,
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTabId);
        // 异步加载调度配置
        loadTaskToTab(task, newTabId);
    }, [tabs, loadTaskToTab]);

    const handleHistorySelect = useCallback((record: JobInstanceDTO) => {
        setTabs(prev => prev.map(t => t.tabId === activeTabId ? {
            ...t,
            sqlContent: record.sqlContent || t.sqlContent,
            isModified: true,
        } : t));
        message.info(`已加载历史 SQL: ${record.jobName}`);
    }, [activeTabId]);

    // ========== 渲染 ==========
    return (
        <div style={{height: '100%', flex: 1, display: 'flex', flexDirection: 'column', background: '#f5f5f5', minHeight: 0, minWidth: 0, overflow: 'hidden'}}>
            {/* Tab 栏 — 模仿 DataWorks 编辑器标签页 */}
            <div style={{
                height: 36,
                background: '#f5f5f5',
                borderBottom: '1px solid #e8e8e8',
                display: 'flex',
                alignItems: 'flex-end',
                flexShrink: 0,
                overflow: 'hidden',
                padding: '0 8px 0 0',
                gap: 2,
            }}>
                {tabs.map((tab) => {
                    const isActive = tab.tabId === activeTabId;
                    return (
                        <div
                            key={tab.tabId}
                            onClick={() => setActiveTabId(tab.tabId)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                height: 28,
                                padding: '0 8px',
                                fontSize: 14,
                                cursor: 'pointer',
                                userSelect: 'none',
                                borderRadius: 4,
                                border: '1px solid transparent',
                                background: isActive ? '#fff' : 'transparent',
                                borderColor: isActive ? '#e8e8e8' : 'transparent',
                                color: isActive ? '#262626' : '#8c8c8c',
                                fontWeight: isActive ? 500 : 400,
                                position: 'relative',
                                top: isActive ? 0 : 1,
                                maxWidth: 160,
                                minWidth: 60,
                                flexShrink: 0,
                                transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = '#e8e8e8';
                                    e.currentTarget.style.color = '#595959';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = '#8c8c8c';
                                }
                            }}
                        >
                            {/* 左侧小圆点指示修改状态 */}
                            {tab.isModified && (
                                <span style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    background: '#faad14',
                                    flexShrink: 0,
                                }} />
                            )}
                            <span style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1,
                            }}>
                                {tab.task.name || '未命名任务'}
                            </span>
                            {tabs.length > 1 && (
                                <span
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 14,
                                        height: 14,
                                        borderRadius: 3,
                                        fontSize: 12,
                                        lineHeight: '14px',
                                        color: '#bfbfbf',
                                        cursor: 'pointer',
                                        flexShrink: 0,
                                        transition: 'all 0.15s',
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCloseTab(tab.tabId);
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#ff4d4f';
                                        e.currentTarget.style.color = '#fff';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = '#bfbfbf';
                                    }}
                                >
                                    ×
                                </span>
                            )}
                        </div>
                    );
                })}
                {/* 新建按钮 */}
                <div
                    onClick={handleNewTask}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 24,
                        height: 24,
                        borderRadius: 4,
                        cursor: 'pointer',
                        color: '#8c8c8c',
                        fontSize: 16,
                        fontWeight: 300,
                        flexShrink: 0,
                        marginBottom: 2,
                        transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#1677ff';
                        e.currentTarget.style.background = '#e6f4ff';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#8c8c8c';
                        e.currentTarget.style.background = 'transparent';
                    }}
                >
                    +
                </div>
            </div>

            {/* 顶部工具栏 */}
            <div style={{
                height: 40,
                background: '#fff',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                gap: 8,
                flexShrink: 0,
            }}>
                <span style={{fontWeight: 600, fontSize: 13, marginRight: 12, minWidth: 120, color: '#262626'}}>
                    {activeTab.task.name}
                    {!activeTab.task.id && <span style={{color: '#999', fontWeight: 400}}>（未保存）</span>}
                </span>
                <Space>
                    <Button type="primary" icon={<PlayCircleOutlined />} loading={executing} onClick={handleExecute}>
                        运行
                    </Button>
                    <Button icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
                        保存
                    </Button>
                    <Button icon={<FormatPainterOutlined />} onClick={handleFormat}>
                        格式化
                    </Button>
                    <Button icon={<ReloadOutlined />} onClick={() => {
                        setTabs(prev => prev.map(t => t.tabId === activeTabId ? {
                            ...t,
                            result: null,
                            error: null,
                        } : t));
                        message.info('已重置结果');
                    }}>
                        刷新
                    </Button>
                    <Divider type="vertical" />
                    <Button icon={<CloudUploadOutlined />} loading={publishing} onClick={handlePublish} disabled={!activeTab.task.id || activeTab.task.status === 'ONLINE'}>
                        发布
                    </Button>
                    <Button icon={<ShareAltOutlined />} disabled={!activeTab.task.id}>
                        分享
                    </Button>
                </Space>
            </div>

            {/* 主体三栏布局 */}
            <div style={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', overflow: 'hidden' }}>
                {/* 左侧边栏 */}
                <div style={{ width: siderWidth, flex: `0 0 ${siderWidth}px`, height: '100%', position: 'relative', overflow: 'hidden' }}>
                    <LeftSidebar
                        currentSql={activeTab.sqlContent}
                        currentTaskId={activeTab.task.id}
                        onTableSelect={handleTableSelect}
                        onTableListLoaded={setAvailableTables}
                        onTaskSelect={handleTaskSelect}
                        onHistorySelect={handleHistorySelect}
                        onNewTask={handleNewTask}
                        refreshTrigger={sidebarRefreshKey}
                    />
                    {/* 左侧拖拽条 */}
                    <div
                        onMouseDown={handleSiderMouseDown}
                        style={{
                            position: 'absolute',
                            right: 0, top: 0, bottom: 0,
                            width: 6,
                            cursor: 'col-resize',
                            background: isDraggingSider ? '#1890ff' : 'transparent',
                            zIndex: 10,
                            transition: 'background 0.2s',
                        }}
                    />
                </div>

                {/* 中央区域 */}
                <div style={{ flex: '1 1 auto', minWidth: 0, height: '100%' }}>
                    <div ref={containerRef} style={{height: '100%', minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
                        {editorInitializing ? (
                            <div style={{background: '#fff', flex: 1, minHeight: 0}}>
                                <div style={{padding: 40, textAlign: 'center'}}>
                                    <Spin size="large" />
                                    <div style={{color: '#999', fontSize: 14, marginTop: 16}}>SQL 编辑器初始化中...</div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div style={{height: editorHeight, flexShrink: 0, minHeight: 0, minWidth: 0, background: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
                                    <div style={{flex: 1, minHeight: 0, minWidth: 0}}>
                                        <SQLEditor
                                            value={activeTab.sqlContent}
                                            onChange={(val) => setTabs(prev => prev.map(t => t.tabId === activeTabId ? {
                                                ...t,
                                                sqlContent: val,
                                                isModified: true,
                                            } : t))}
                                            onExecute={handleExecute}
                                            onExecutePlan={handleExecutePlan}
                                            onFormat={handleFormat}
                                            tableColumnsCache={tableColumnsCache}
                                            availableTables={availableTables}
                                            showRun={false}
                                            showFormat={false}
                                        />
                                    </div>
                                </div>
                                {/* 水平拖拽条 */}
                                <div
                                    onMouseDown={handleEditorMouseDown}
                                    style={{
                                        height: 6,
                                        flexShrink: 0,
                                        cursor: 'row-resize',
                                        background: isDraggingEditor ? '#1890ff' : '#f0f0f0',
                                        transition: 'background 0.2s',
                                    }}
                                />
                                <div style={{flex: 1, minHeight: 0, minWidth: 0, background: '#fff', overflow: 'hidden'}}>
                                    <DataWorkResultPanel
                                        loading={executing}
                                        result={activeTab.result}
                                        executionPlan={activeTab.executionPlan}
                                        error={activeTab.error}
                                        activeTab={activeTab.resultActiveTab}
                                        onTabChange={(tab) => setTabs(prev => prev.map(t => t.tabId === activeTabId ? {
                                            ...t,
                                            resultActiveTab: tab,
                                        } : t))}
                                        logs={activeTab.logs}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* 右侧边栏 */}
                <div style={{ width: 44, flex: '0 0 44px', height: '100%', position: 'relative', overflow: 'visible' }}>
                    {/* 展开面板 */}
                    {rightActivePanel && (
                        <div style={{
                            position: 'absolute',
                            right: 44,
                            top: 0,
                            bottom: 0,
                            width: rightSiderWidth,
                            background: '#fff',
                            borderLeft: '1px solid #f0f0f0',
                            display: 'flex',
                            flexDirection: 'column',
                            zIndex: 1,
                        }}>
                            <RightSidebar
                                jobId={activeTab.task.id}
                                task={{
                                    name: activeTab.task.name,
                                    description: activeTab.task.description,
                                    engineType: activeTab.task.engineType,
                                    nodeType: activeTab.task.nodeType,
                                    configJson: activeTab.task.configJson,
                                }}
                                schedule={{
                                    cronExpression: activeTab.schedule.cronExpression,
                                    enabled: activeTab.schedule.enabled,
                                }}
                                onTaskChange={(nextTask) => setTabs(prev => prev.map(tab => tab.tabId === activeTabId ? {
                                    ...tab,
                                    task: {...tab.task, ...nextTask},
                                    isModified: true,
                                } : tab))}
                                onScheduleChange={(nextSchedule) => setTabs(prev => prev.map(tab => tab.tabId === activeTabId ? {
                                    ...tab,
                                    schedule: {...tab.schedule, ...nextSchedule},
                                    isModified: true,
                                } : tab))}
                                onSave={handleSave}
                                onExecute={handleExecute}
                                onDelete={handleDelete}
                                saving={saving}
                                executing={executing}
                                deleting={deleting}
                                activePanel={rightActivePanel}
                                panelWidth={rightSiderWidth}
                                onActivePanelChange={handleRightPanelChange}
                            />
                        </div>
                    )}

                    {/* icon 按钮列 */}
                    <div style={{
                        width: 44,
                        height: '100%',
                        background: '#fafafa',
                        borderLeft: '1px solid #f0f0f0',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '8px 0',
                        gap: 8,
                    }}>
                        {[
                            { key: 'property', icon: <FileTextOutlined />, title: '属性' },
                            { key: 'schedule', icon: <ThunderboltOutlined />, title: '调度配置' },
                            { key: 'version', icon: <BranchesOutlined />, title: '版本' },
                            { key: 'settings', icon: <SettingOutlined />, title: '运行配置' },
                        ].map(btn => (
                            <Tooltip key={btn.key} title={btn.title} placement="left">
                                <Button
                                    type={rightActivePanel === btn.key ? 'primary' : 'text'}
                                    icon={btn.icon}
                                    size="small"
                                    style={{ width: 32, height: 32 }}
                                    onClick={() => handleRightPanelChange(btn.key as 'property' | 'schedule' | 'version' | 'settings')}
                                />
                            </Tooltip>
                        ))}
                    </div>

                    {/* 右侧拖拽条 */}
                    {rightActivePanel && (
                        <div
                            onMouseDown={handleRightSiderMouseDown}
                            style={{
                                position: 'absolute',
                                right: 41,
                                top: 0,
                                bottom: 0,
                                width: 6,
                                cursor: 'col-resize',
                                background: isDraggingRightSider ? '#1890ff' : 'transparent',
                                zIndex: 10,
                                transition: 'background 0.2s',
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default DataWorkWorkspace;
