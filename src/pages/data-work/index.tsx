import React, {useCallback, useEffect, useRef, useState} from 'react';
import {message, Spin, Modal, Tag} from 'antd';
import {
    PlayCircleOutlined,
    SaveOutlined,
    FormatPainterOutlined,
    ReloadOutlined,
    CloudUploadOutlined,
    ShareAltOutlined,
    CodeOutlined,
    ThunderboltOutlined,
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
    executePreviewJob,
} from '@/api/DataworksApi.ts';
import { executeSparkSql } from '@/api/DatagawayApi.ts';
import { authFilterSql } from '@/api/DataAuthApi';
import { KEY } from '@/utils/storage';
import {QueryResult, ExecutionPlan} from '@/pages/sql-editor/types';
import LeftSidebar from './components/LeftSidebar';
import DataWorkRightDock from './components/DataWorkRightDock';
import {WorkbenchTabs, WorkbenchToolbar, ToolbarButton} from '@/pages/workbench/components';

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
    content: string;
    result: QueryResult | null;
    executionPlan: ExecutionPlan[] | null;
    error: string | null;
    resultActiveTab: string;
    logs: string[];
    isModified: boolean; // 是否有未保存修改
}

const getEngineTypeByNodeType = (nodeType: JobDTO['nodeType']): JobDTO['engineType'] => {
    if (nodeType === 'FLINK_SQL' || nodeType === 'FLINK_BATCH') return 'FLINK';
    if (nodeType === 'SHELL') return 'SHELL';
    if (nodeType === 'PYTHON') return 'PYTHON';
    return 'SPARK';
};

const getDefaultTaskNameByNodeType = (nodeType: JobDTO['nodeType']) => {
    if (nodeType === 'FLINK_SQL') return '未命名FlinkSQL任务';
    if (nodeType === 'SPARK_BATCH') return '未命名Spark批任务';
    if (nodeType === 'FLINK_BATCH') return '未命名Flink批任务';
    if (nodeType === 'SHELL') return '未命名Shell任务';
    if (nodeType === 'PYTHON') return '未命名Python任务';
    return '未命名SparkSQL任务';
};

const getNodeTypeLabel = (nodeType: JobDTO['nodeType'], engineType: JobDTO['engineType']) => {
    if (nodeType === 'FLINK_SQL') return 'FlinkSQL';
    if (nodeType === 'SPARK_BATCH') return 'Spark批任务';
    if (nodeType === 'FLINK_BATCH') return 'Flink批任务';
    if (nodeType === 'SHELL') return 'Shell';
    if (nodeType === 'PYTHON') return 'Python';
    if (nodeType === 'VIRTUAL') return '虚拟节点';
    return engineType === 'FLINK' ? 'FlinkSQL' : 'SparkSQL';
};

const getNodeTypeColor = (nodeType: JobDTO['nodeType'], engineType: JobDTO['engineType']) => {
    if (nodeType === 'SHELL') return 'cyan';
    if (nodeType === 'PYTHON') return 'green';
    if (nodeType === 'SPARK_BATCH') return 'geekblue';
    if (nodeType === 'FLINK_BATCH') return 'magenta';
    return engineType === 'SPARK' ? 'blue' : 'purple';
};

const getEditorLanguage = (nodeType: JobDTO['nodeType']): 'sql' | 'shell' | 'python' => {
    if (nodeType === 'SHELL') return 'shell';
    if (nodeType === 'PYTHON') return 'python';
    return 'sql';
};

// 生成空任务
const createEmptyTask = (nodeType: JobDTO['nodeType'] = 'SPARK_SQL'): JobDTO => ({
    id: '',
    name: getDefaultTaskNameByNodeType(nodeType),
    description: '',
    engineType: getEngineTypeByNodeType(nodeType),
    nodeType,
    content: '',
    configJson: '',
    status: 'DRAFT',
});

// 生成默认调度配置
const createEmptySchedule = (jobId: string = ''): ScheduleConfigDTO => ({
    id: '',
    jobId,
    cronExpression: '',
    enabled: false,
    schedulerType: 'AIRFLOW',
});

// 生成新 Tab
const createNewTab = (nodeType: JobDTO['nodeType'] = 'SPARK_SQL'): TabData => ({
    tabId: `new-${Date.now()}`,
    task: createEmptyTask(nodeType),
    schedule: createEmptySchedule(),
    content: '',
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
    content: string;
    isModified: boolean;
    resultActiveTab: string;
}

const normalizePersistedContent = (tab: PersistedTab & { sqlContent?: string; task?: JobDTO & { sqlContent?: string } }) => {
    return tab.content ?? tab.task?.content ?? tab.sqlContent ?? tab.task?.sqlContent ?? '';
};

interface FlinkPreviewPayload {
    mock?: boolean;
    mode?: string;
    durationMs?: number;
    result?: {
        isQueryResult?: boolean;
        columns?: string[];
        rows?: Record<string, unknown>[];
        total?: number;
        maxRowsReached?: boolean;
        results?: {
            columns?: Array<{ name?: string; columnName?: string }>;
            data?: unknown[];
        };
    };
}

const toRecord = (value: unknown): Record<string, unknown> | null => {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null;
};

const normalizeFlinkRows = (rows: unknown[], columns: string[]): Record<string, unknown>[] => {
    return rows.map((row) => {
        const record = toRecord(row);
        if (record) {
            if (Array.isArray(record.fields)) {
                const normalized: Record<string, unknown> = {};
                record.fields.forEach((field, index) => {
                    normalized[columns[index] || `col_${index}`] = field;
                });
                return normalized;
            }
            return record;
        }
        return {[columns[0] || 'result']: row};
    });
};

const parseFlinkQueryResult = (instance: JobInstanceDTO): QueryResult | null => {
    if (!instance.resultData) return null;
    try {
        const payload = JSON.parse(instance.resultData) as FlinkPreviewPayload;
        const result = payload.result;
        if (!result?.isQueryResult) return null;

        const columns = Array.isArray(result.columns) && result.columns.length > 0
            ? result.columns
            : (result.results?.columns || []).map((column, index) => column.name || column.columnName || `col_${index}`);
        const rows = Array.isArray(result.rows)
            ? normalizeFlinkRows(result.rows, columns)
            : normalizeFlinkRows(result.results?.data || [], columns);

        return {
            columns: columns.length > 0 ? columns : Object.keys(rows[0] || {}),
            rows,
            total: typeof result.total === 'number' ? result.total : rows.length,
            duration: instance.costTimeMs || payload.durationMs || 0,
        };
    } catch {
        return null;
    }
};

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
                    task: {
                        ...p.task,
                        content: p.task.content ?? (p.task as JobDTO & { sqlContent?: string }).sqlContent ?? '',
                    },
                    schedule: p.schedule || createEmptySchedule(p.task.id),
                    content: normalizePersistedContent(p),
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
            content: t.content,
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
            content: task.content || '',
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
    const handleNewTask = useCallback((nodeType: JobDTO['nodeType'] = 'SPARK_SQL') => {
        const newTab = createNewTab(nodeType);
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

    // ========== 关闭其他 Tab ==========
    const doCloseOtherTabs = useCallback((tabId: string) => {
        setTabs(prev => {
            if (prev.length <= 1) {
                message.warning('没有其他任务标签页可关闭');
                return prev;
            }
            const targetTab = prev.find(t => t.tabId === tabId);
            if (!targetTab) return prev;
            setActiveTabId(tabId);
            return [targetTab];
        });
    }, []);

    const handleCloseOtherTabs = useCallback((tabId: string) => {
        const otherModifiedTabs = tabs.filter(t => t.tabId !== tabId && t.isModified);
        if (otherModifiedTabs.length > 0) {
            Modal.confirm({
                title: '确认关闭其他标签页',
                content: `有 ${otherModifiedTabs.length} 个其他任务存在未保存的修改，关闭后将丢失更改，是否继续？`,
                okText: '关闭其他',
                cancelText: '取消',
                onOk: () => doCloseOtherTabs(tabId),
            });
            return;
        }
        doCloseOtherTabs(tabId);
    }, [tabs, doCloseOtherTabs]);

    // ========== 持久化任务 ==========
    const persistTask = useCallback(async (tab: TabData): Promise<JobDTO | null> => {
        if (!tab.task.name.trim()) {
            message.warning('请输入任务名称');
            return null;
        }
        const body = {
            name: tab.task.name.trim(),
            description: tab.task.description,
            engineType: tab.task.engineType,
            nodeType: tab.task.nodeType || (tab.task.engineType === 'FLINK' ? 'FLINK_SQL' : 'SPARK_SQL'),
            content: tab.content,
            configJson: tab.task.configJson,
        };

        let savedTask: JobDTO;
        if (!tab.task.id) {
            const resp = await createJob(body);
            savedTask = resp.data;
            message.success('任务创建成功');
        } else {
            const resp = await updateJob(tab.task.id, body);
            savedTask = resp.data;
            message.success('任务更新成功');
        }
        setSidebarRefreshKey(prev => prev + 1);

        // 保存调度配置
        if (savedTask.id && tab.schedule.cronExpression) {
            await saveJobSchedule(savedTask.id, {
                cronExpression: tab.schedule.cronExpression,
                enabled: tab.schedule.enabled || false,
                schedulerType: tab.schedule.schedulerType || 'AIRFLOW',
            });
        }

        // 刷新当前任务状态，确保 configJson 以数据库为准回显
        const freshTask = await getJob(savedTask.id);
        const freshSchedule = await getJobSchedule(freshTask.id).catch(() => createEmptySchedule(freshTask.id));
        setTabs(prev => prev.map(t => t.tabId === tab.tabId ? {
                ...t,
                task: freshTask,
                content: freshTask.content || '',
                schedule: freshSchedule || createEmptySchedule(freshTask.id),
                isModified: false,
            } : t));
        return freshTask;
    }, []);

    // ========== 保存任务 ==========
    const handleSave = useCallback(async () => {
        const tab = tabs.find(t => t.tabId === activeTabId);
        if (!tab) return;

        setSaving(true);
        try {
            await persistTask(tab);
        } catch {
            // 错误由拦截器处理
        } finally {
            setSaving(false);
        }
    }, [tabs, activeTabId, persistTask]);

    // ========== 发布任务 ==========
    const handlePublish = useCallback(async () => {
        const tab = tabs.find(t => t.tabId === activeTabId);
        if (!tab) return;
        if (!tab.task.id) {
            message.warning('请先保存任务');
            return;
        }
        // 允许已发布任务再次发布（新版本发布）
        setPublishing(true);
        try {
            let publishJobId = tab.task.id;
            if (tab.isModified) {
                setSaving(true);
                let savedTask: JobDTO | null = null;
                try {
                    savedTask = await persistTask(tab);
                } finally {
                    setSaving(false);
                }
                if (!savedTask?.id) {
                    return;
                }
                publishJobId = savedTask.id;
            }
            const resp = await publishJob(publishJobId);
            const publishedTask = resp.data;
            let startMessage = '';
            if (publishedTask.engineType === 'FLINK') {
                startMessage = '，Application Mode任务已启动';
            }
            message.success(`任务发布成功${startMessage}`);
            setTabs(prev => prev.map(t => t.tabId === activeTabId ? {
                ...t,
                task: publishedTask,
                logs: publishedTask.engineType === 'FLINK'
                    ? [
                        ...t.logs,
                        `[${new Date().toLocaleString()}] INFO 任务已发布，开始启动Application Mode正式任务`,
                    ]
                    : t.logs,
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

        if (!tab.content.trim()) {
            message.warning('请输入任务内容');
            return;
        }

        if (tab.task.engineType !== 'SPARK' || tab.task.nodeType !== 'SPARK_SQL') {
            const nodeType = tab.task.nodeType || 'FLINK_SQL';
            setExecuting(true);
            setTabs(prev => prev.map(t => t.tabId === activeTabId ? {
                ...t,
                result: null,
                executionPlan: null,
                error: null,
                logs: [
                    `[${new Date().toLocaleString()}] INFO 开始执行 ${nodeType}: ${tab.task.name}`,
                    `[${new Date().toLocaleString()}] INFO 当前为临时运行，不生成正式Application任务`,
                ],
            } : t));
            try {
                const resp = await executePreviewJob({
                    name: tab.task.name,
                    engineType: tab.task.engineType,
                    nodeType,
                    content: tab.content,
                    configJson: tab.task.configJson,
                });
                const instance = resp.data;
                const queryResult = parseFlinkQueryResult(instance);
                setTabs(prev => prev.map(t => t.tabId === activeTabId ? {
                    ...t,
                    result: queryResult,
                    error: instance.errorMessage || null,
                    resultActiveTab: queryResult ? 'result' : t.resultActiveTab,
                    logs: [
                        ...t.logs,
                        `[${new Date().toLocaleString()}] INFO 实例状态: ${instance.status}`,
                        ...(queryResult ? [
                            `[${new Date().toLocaleString()}] INFO 执行成功，返回 ${queryResult.rows.length} 行`,
                            `[${new Date().toLocaleString()}] INFO 耗时: ${queryResult.duration}ms`,
                        ] : []),
                        `[${new Date().toLocaleString()}] INFO 执行内容快照:`,
                        ...(instance.content || '').split('\n').map(line => `    ${line}`),
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

        // 权限校验
        try {
            const currentStr = sessionStorage.getItem(KEY.CURRENT) || localStorage.getItem(KEY.CURRENT);
            const passport = currentStr ? JSON.parse(currentStr).passport : '';
            const authResp = await authFilterSql({passport, sql: tab.content, engine: 'spark'});
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
            `[${new Date().toLocaleString()}] INFO 任务内容:`,
            ...tab.content.split('\n').map(line => `    ${line}`),
        ];
        setTabs(prev => prev.map(t => t.tabId === activeTabId ? {...t, logs: newLogs} : t));

        try {
            const resp = await executeSparkSql(tab.content);
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

        if (!tab.content.trim()) {
            message.warning('请输入SQL语句');
            return;
        }
        if (!tab.task.nodeType?.endsWith('_SQL')) {
            message.warning('当前节点类型不支持执行计划');
            return;
        }
        // 权限校验
        try {
            const currentStr = sessionStorage.getItem(KEY.CURRENT) || localStorage.getItem(KEY.CURRENT);
            const passport = currentStr ? JSON.parse(currentStr).passport : '';
            const explainSql = `EXPLAIN ${tab.content}`;
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
            const explainSql = `EXPLAIN ${tab.content}`;
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
        if (!tab || !tab.content) return;
        if (!tab.task.nodeType?.endsWith('_SQL')) {
            message.warning('当前节点类型不支持SQL格式化');
            return;
        }
        const formatted = tab.content
            .replace(/\s+/g, ' ')
            .replace(/\s*,\s*/g, ',\n    ')
            .replace(/\s+(SELECT|FROM|WHERE|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|GROUP BY|HAVING|ORDER BY|LIMIT|UNION|WITH)/gi, '\n$1')
            .replace(/\s+(AND|OR)/gi, '\n    $1')
            .trim();
        setTabs(prev => prev.map(t => t.tabId === activeTabId ? {
            ...t,
            content: formatted,
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
            content: selectSQL,
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
            content: task.content || '',
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
            content: record.content || t.content,
            isModified: true,
        } : t));
        message.info(`已加载历史内容: ${record.jobName}`);
    }, [activeTabId]);

    const workbenchTabItems = React.useMemo(() => tabs.map(t => ({
        id: t.tabId,
        name: t.task.name || '未命名任务',
        isModified: t.isModified,
        status: t.task.status,
    })), [tabs]);

    const newDropdownItems = [
        { key: 'SPARK_SQL', icon: <CodeOutlined />, label: 'SparkSQL' },
        { key: 'FLINK_SQL', icon: <ThunderboltOutlined />, label: 'FlinkSQL' },
        { key: 'SPARK_BATCH', icon: <CodeOutlined />, label: 'Spark批任务' },
        { key: 'FLINK_BATCH', icon: <ThunderboltOutlined />, label: 'Flink批任务' },
        { key: 'SHELL', icon: <CodeOutlined />, label: 'Shell' },
        { key: 'PYTHON', icon: <CodeOutlined />, label: 'Python' },
    ];

    const statusMeta: Record<JobDTO['status'], { color: string; text: string }> = {
        DRAFT: { color: 'gold', text: '开发中' },
        ONLINE: { color: 'green', text: '已发布' },
        OFFLINE: { color: 'default', text: '已下线' },
    };

    const currentStatus = statusMeta[activeTab.task.status] || statusMeta.DRAFT;
    const activeIsSqlNode = !!activeTab.task.nodeType?.endsWith('_SQL');

    const toolbarButtons: ToolbarButton[] = [
        {
            key: 'run',
            label: '运行',
            icon: <PlayCircleOutlined />,
            type: 'primary',
            loading: executing,
            onClick: handleExecute,
            tooltip: '临时运行当前任务内容',
        },
        {
            key: 'save',
            label: '保存',
            icon: <SaveOutlined />,
            loading: saving,
            onClick: handleSave,
        },
        {
            key: 'format',
            label: '格式化',
            icon: <FormatPainterOutlined />,
            onClick: handleFormat,
            disabled: !activeIsSqlNode,
        },
        {
            key: 'clear',
            label: '清空结果',
            icon: <ReloadOutlined />,
            onClick: () => {
                setTabs(prev => prev.map(t => t.tabId === activeTabId ? {
                    ...t,
                    result: null,
                    error: null,
                } : t));
                message.info('已清空结果');
            },
        },
        {
            key: 'publish',
            label: '发布',
            icon: <CloudUploadOutlined />,
            loading: publishing,
            disabled: !activeTab.task.id,
            onClick: handlePublish,
        },
        {
            key: 'share',
            label: '分享',
            icon: <ShareAltOutlined />,
            disabled: !activeTab.task.id,
            onClick: () => message.info('分享功能开发中'),
        },
    ];

    // ========== 渲染 ==========
    return (
        <div style={{height: '100%', flex: 1, display: 'flex', flexDirection: 'column', background: '#f5f5f5', minHeight: 0, minWidth: 0, overflow: 'hidden'}}>
            <WorkbenchTabs
                tabs={workbenchTabItems}
                activeTabId={activeTabId}
                onActiveChange={setActiveTabId}
                onClose={handleCloseTab}
                onCloseOthers={handleCloseOtherTabs}
                showNewDropdown
                newDropdownItems={newDropdownItems}
                onNewDropdownSelect={(key) => handleNewTask(key as JobDTO['nodeType'])}
                newButtonTooltip="新建任务"
            />

            <WorkbenchToolbar
                leftContent={
                    <>
                        <span style={{
                            fontWeight: 600,
                            fontSize: 13,
                            color: '#1f2329',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 260,
                        }}>
                            {activeTab.task.name || '未命名任务'}
                        </span>
                        <Tag color={getNodeTypeColor(activeTab.task.nodeType, activeTab.task.engineType)} style={{ marginInlineEnd: 0 }}>
                            {getNodeTypeLabel(activeTab.task.nodeType, activeTab.task.engineType)}
                        </Tag>
                        <Tag color={currentStatus.color} style={{ marginInlineEnd: 0 }}>
                            {currentStatus.text}
                        </Tag>
                        {!activeTab.task.id && <Tag color="orange" style={{ marginInlineEnd: 0 }}>未保存</Tag>}
                    </>
                }
                buttons={toolbarButtons}
                dividerIndices={[4]}
            />

            {/* 主体三栏布局 */}
            <div style={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', overflow: 'hidden' }}>
                {/* 左侧边栏 */}
                <div style={{ width: siderWidth, flex: `0 0 ${siderWidth}px`, height: '100%', position: 'relative', overflow: 'hidden' }}>
                    <LeftSidebar
                        currentSql={activeTab.content}
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
                                    <div style={{color: '#999', fontSize: 14, marginTop: 16}}>编辑器初始化中...</div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div style={{height: editorHeight, flexShrink: 0, minHeight: 0, minWidth: 0, background: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
                                    <div style={{flex: 1, minHeight: 0, minWidth: 0}}>
                                        <SQLEditor
                                            key={`${activeTab.tabId}-${getEditorLanguage(activeTab.task.nodeType)}`}
                                            value={activeTab.content}
                                            onChange={(val) => setTabs(prev => prev.map(t => t.tabId === activeTabId ? {
                                                ...t,
                                                content: val,
                                                isModified: true,
                                            } : t))}
                                            onExecute={handleExecute}
                                            onExecutePlan={handleExecutePlan}
                                            onFormat={handleFormat}
                                            tableColumnsCache={tableColumnsCache}
                                            availableTables={availableTables}
                                            language={getEditorLanguage(activeTab.task.nodeType)}
                                            showRun={false}
                                            showFormat={activeTab.task.nodeType?.endsWith('_SQL')}
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

                <DataWorkRightDock
                    task={activeTab.task}
                    schedule={activeTab.schedule}
                    activePanel={rightActivePanel}
                    panelWidth={rightSiderWidth}
                    isDragging={isDraggingRightSider}
                    saving={saving}
                    executing={executing}
                    deleting={deleting}
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
                    onActivePanelChange={handleRightPanelChange}
                    onResizeStart={handleRightSiderMouseDown}
                />
            </div>
        </div>
    );
};

export default DataWorkWorkspace;
