import React, {useCallback, useEffect, useRef, useState} from 'react';
import {message, Spin, Button, Space, Divider} from 'antd';
import {
    PlayCircleOutlined,
    SaveOutlined,
    FormatPainterOutlined,
    ReloadOutlined,
    CloudUploadOutlined,
    ShareAltOutlined,
} from '@ant-design/icons';
import {loader} from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import SQLEditor from '@/pages/sql-editor/components/SQLEditor';
import DataWorkResultPanel from './components/DataWorkResultPanel';
import {ColumnVO} from '@/api/MetadataTableAPI.ts';
import {
    DataWorkTaskDTO,
    ScheduleConfigDTO,
    ExecutionRecordDTO,
    createDataWorkTask,
    updateDataWorkTask,
    executeTask,
    getDataWorkTask,
    getTaskSchedule,
    saveTaskSchedule,
} from '@/api/DataworksApi.ts';
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

// 生成空任务
const createEmptyTask = (): DataWorkTaskDTO => ({
    id: '',
    name: '未命名任务',
    description: '',
    engineType: 'SPARK',
    sqlContent: '',
    status: 'DRAFT',
});

const DataWorkWorkspace: React.FC = () => {
    // ========== Monaco 初始化 ==========
    const [editorInitializing, setEditorInitializing] = useState(true);
    useEffect(() => {
        loadMonaco()
            .then(() => setEditorInitializing(false))
            .catch(() => setEditorInitializing(false));
    }, []);

    // ========== 任务状态 ==========
    const [currentTask, setCurrentTask] = useState<DataWorkTaskDTO>(createEmptyTask());
    const [schedule, setSchedule] = useState<ScheduleConfigDTO>({
        id: '',
        taskId: '',
        cronExpression: '',
        enabled: false,
    });
    const [sqlContent, setSqlContent] = useState('');

    // ========== 执行结果状态 ==========
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<QueryResult | null>(null);
    const [executionPlan, setExecutionPlan] = useState<ExecutionPlan[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [resultActiveTab, setResultActiveTab] = useState('result');
    const [logs, setLogs] = useState<string[]>([]);

    // ========== 操作状态 ==========
    const [saving, setSaving] = useState(false);
    const [executing, setExecuting] = useState(false);

    // ========== 布局状态 ==========
    const [siderWidth, setSiderWidth] = useState(260);
    const [rightSiderWidth, setRightSiderWidth] = useState(300);
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
                const newWidth = window.innerWidth - e.clientX;
                if (newWidth >= 260 && newWidth <= 400) setRightSiderWidth(newWidth);
            }
            if (isDraggingEditor && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const newHeight = e.clientY - rect.top - 48; // 减去顶部工具栏高度
                if (newHeight >= 200 && newHeight <= rect.height - 300) setEditorHeight(newHeight);
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

    // ========== 加载任务到编辑器 ==========
    const loadTask = useCallback(async (task: DataWorkTaskDTO) => {
        setCurrentTask(task);
        setSqlContent(task.sqlContent || '');
        setResult(null);
        setExecutionPlan(null);
        setError(null);
        // 加载调度配置
        if (task.id) {
            try {
                const sched = await getTaskSchedule(task.id);
                if (sched) {
                    setSchedule(sched);
                } else {
                    setSchedule({id: '', taskId: task.id, cronExpression: '', enabled: false});
                }
            } catch {
                setSchedule({id: '', taskId: task.id, cronExpression: '', enabled: false});
            }
        }
    }, []);

    // ========== 新建任务 ==========
    const handleNewTask = useCallback(() => {
        setCurrentTask(createEmptyTask());
        setSqlContent('');
        setSchedule({id: '', taskId: '', cronExpression: '', enabled: false});
        setResult(null);
        setExecutionPlan(null);
        setError(null);
    }, []);

    // ========== 保存任务 ==========
    const handleSave = useCallback(async () => {
        if (!currentTask.name.trim()) {
            message.warning('请输入任务名称');
            return;
        }
        const body = {
            name: currentTask.name.trim(),
            description: currentTask.description,
            engineType: currentTask.engineType,
            sqlContent: sqlContent,
        };
        setSaving(true);
        try {
            let savedTask: DataWorkTaskDTO;
            if (!currentTask.id) {
                const resp = await createDataWorkTask(body);
                savedTask = resp.data;
                message.success('任务创建成功');
            } else {
                const resp = await updateDataWorkTask(currentTask.id, body);
                savedTask = resp.data;
                message.success('任务更新成功');
            }
            // 保存调度配置
            if (savedTask.id && schedule.cronExpression) {
                await saveTaskSchedule(savedTask.id, {
                    cronExpression: schedule.cronExpression,
                    enabled: schedule.enabled || false,
                });
            }
            // 刷新当前任务状态
            const freshTask = await getDataWorkTask(savedTask.id);
            setCurrentTask(freshTask);
            setSqlContent(freshTask.sqlContent || '');
        } catch {
            // 错误由拦截器处理
        } finally {
            setSaving(false);
        }
    }, [currentTask, sqlContent, schedule]);

    // ========== 执行任务 ==========
    const handleExecute = useCallback(async () => {
        if (!sqlContent.trim()) {
            message.warning('请输入SQL语句');
            return;
        }
        // 如果任务未保存，先提示保存
        if (!currentTask.id) {
            message.warning('请先保存任务再执行');
            return;
        }
        setExecuting(true);
        setLoading(true);
        setResult(null);
        setExecutionPlan(null);
        setError(null);
        const startTime = Date.now();
        const newLogs: string[] = [
            `[${new Date().toLocaleString()}] INFO 开始执行任务: ${currentTask.name}`,
            `[${new Date().toLocaleString()}] INFO 引擎类型: ${currentTask.engineType}`,
            `[${new Date().toLocaleString()}] INFO SQL 内容:`,
            ...sqlContent.split('\n').map(line => `    ${line}`),
        ];
        setLogs(newLogs);
        try {
            const resp = await executeTask(currentTask.id);
            const record: ExecutionRecordDTO = resp.data;
            const cost = Date.now() - startTime;
            if (record.status === 'SUCCESS' && record.resultData) {
                try {
                    const data = JSON.parse(record.resultData);
                    const columns = Array.isArray(data) && data.length > 0 ? Object.keys(data[0]) : [];
                    const queryResult: QueryResult = {
                        columns,
                        rows: Array.isArray(data) ? data : [],
                        total: Array.isArray(data) ? data.length : 0,
                        duration: record.costTimeMs || cost,
                    };
                    setResult(queryResult);
                    setError(null);
                    setLogs(prev => [
                        ...prev,
                        `[${new Date().toLocaleString()}] INFO 执行成功`,
                        `[${new Date().toLocaleString()}] INFO 耗时: ${record.costTimeMs || cost}ms`,
                        `[${new Date().toLocaleString()}] INFO 返回行数: ${Array.isArray(data) ? data.length : 0}`,
                    ]);
                    message.success(`执行成功，耗时 ${record.costTimeMs || cost}ms`);
                } catch {
                    setResult(null);
                    setError('解析结果失败');
                    setLogs(prev => [...prev, `[${new Date().toLocaleString()}] ERROR 解析结果失败`]);
                }
            } else if (record.status === 'FAILED') {
                setResult(null);
                setError(record.errorMessage || '执行失败');
                setLogs(prev => [
                    ...prev,
                    `[${new Date().toLocaleString()}] ERROR 执行失败`,
                    `[${new Date().toLocaleString()}] ERROR ${record.errorMessage || '未知错误'}`,
                ]);
                message.error(record.errorMessage || '执行失败');
            } else {
                setResult(null);
                setError('执行状态未知');
                setLogs(prev => [...prev, `[${new Date().toLocaleString()}] WARN 执行状态未知: ${record.status}`]);
            }
        } catch (e: any) {
            setLogs(prev => [...prev, `[${new Date().toLocaleString()}] ERROR ${e.message || '执行异常'}`]);
        } finally {
            setExecuting(false);
            setLoading(false);
            setLogs(prev => [...prev, `[${new Date().toLocaleString()}] INFO 任务执行结束`]);
        }
    }, [currentTask, sqlContent]);

    // ========== 执行计划 ==========
    const handleExecutePlan = useCallback(async () => {
        if (!sqlContent.trim()) {
            message.warning('请输入SQL语句');
            return;
        }
        setLoading(true);
        try {
            const {executeSql} = await import('@/api/DatagawayApi');
            const explainSql = `EXPLAIN ${sqlContent}`;
            const resp = await executeSql(explainSql);
            const result = resp.data;
            const plan: ExecutionPlan[] = result.data.map((row: any, idx: number) => ({
                id: String(idx + 1),
                operation: row.operation || row.Operation || '',
                rowCount: row.rows || row.Rows || 0,
                cost: row.cost || row.Cost || 0,
                details: row.details || row.Details || JSON.stringify(row),
            }));
            setExecutionPlan(plan);
            setError(null);
            setResultActiveTab('plan');
            message.success('执行计划生成成功');
        } catch {
            message.error('获取执行计划失败');
        } finally {
            setLoading(false);
        }
    }, [sqlContent]);

    // ========== 格式化 SQL ==========
    const handleFormat = useCallback(() => {
        if (!sqlContent) return;
        const formatted = sqlContent
            .replace(/\s+/g, ' ')
            .replace(/\s*,\s*/g, ',\n    ')
            .replace(/\s+(SELECT|FROM|WHERE|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|GROUP BY|HAVING|ORDER BY|LIMIT|UNION|WITH)/gi, '\n$1')
            .replace(/\s+(AND|OR)/gi, '\n    $1')
            .trim();
        setSqlContent(formatted);
        message.success('SQL已格式化');
    }, [sqlContent]);

    // ========== 左侧边栏回调 ==========
    const handleTableSelect = useCallback((table: {name: string; tableId: string; catalog?: string; schema?: string; columns?: ColumnVO[]}) => {
        const fullTableName = table.schema ? `${table.schema}.${table.name}` : table.name;
        const selectSQL = `SELECT * FROM ${fullTableName} LIMIT 100;`;
        setSqlContent(selectSQL);
        if (table.columns) {
            setTableColumnsCache(prev => ({
                ...prev,
                [fullTableName]: table.columns!,
                [table.name]: table.columns!,
            }));
        }
    }, []);

    const handleTaskSelect = useCallback((task: DataWorkTaskDTO) => {
        loadTask(task);
    }, [loadTask]);

    const handleHistorySelect = useCallback((record: ExecutionRecordDTO) => {
        if (record.sqlContent) setSqlContent(record.sqlContent);
        message.info(`已加载历史 SQL: ${record.taskName}`);
    }, []);

    // ========== 渲染 ==========
    return (
        <div style={{height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f5f5'}}>
            {/* 顶部工具栏 */}
            <div style={{
                height: 48,
                background: '#fff',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                gap: 12,
                flexShrink: 0,
            }}>
                <span style={{fontWeight: 600, fontSize: 14, marginRight: 16, minWidth: 120}}>
                    {currentTask.name}
                    {!currentTask.id && <span style={{color: '#999', fontWeight: 400}}>（未保存）</span>}
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
                    <Button icon={<ReloadOutlined />} onClick={() => { setResult(null); setError(null); message.info('已重置结果'); }}>
                        刷新
                    </Button>
                    <Divider type="vertical" />
                    <Button icon={<CloudUploadOutlined />} disabled={!currentTask.id}>
                        发布
                    </Button>
                    <Button icon={<ShareAltOutlined />} disabled={!currentTask.id}>
                        分享
                    </Button>
                </Space>
            </div>

            {/* 主体三栏布局 */}
            <div style={{flex: 1, display: 'flex', overflow: 'hidden'}}>
                {/* 左侧边栏 */}
                <div style={{
                    width: siderWidth,
                    minWidth: 200,
                    maxWidth: 400,
                    position: 'relative',
                    flexShrink: 0,
                }}>
                    <LeftSidebar
                        currentSql={sqlContent}
                        currentTaskId={currentTask.id}
                        onTableSelect={handleTableSelect}
                        onTableListLoaded={setAvailableTables}
                        onTaskSelect={handleTaskSelect}
                        onHistorySelect={handleHistorySelect}
                        onNewTask={handleNewTask}
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
                <div style={{flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden'}} ref={containerRef}>
                    {editorInitializing ? (
                        <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', flexDirection: 'column', gap: 16}}>
                            <Spin size="large" />
                            <div style={{color: '#999', fontSize: 14}}>SQL 编辑器初始化中...</div>
                        </div>
                    ) : (
                        <>
                            {/* SQL 编辑器 */}
                            <div style={{height: editorHeight, minHeight: 200, borderBottom: '1px solid #f0f0f0'}}>
                                <SQLEditor
                                    value={sqlContent}
                                    onChange={setSqlContent}
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
                                    flexShrink: 0,
                                }}
                            />
                            {/* 结果面板 */}
                            <div style={{flex: 1, minHeight: 150, overflow: 'hidden'}}>
                                <DataWorkResultPanel
                                    loading={loading}
                                    result={result}
                                    executionPlan={executionPlan}
                                    error={error}
                                    activeTab={resultActiveTab}
                                    onTabChange={setResultActiveTab}
                                    logs={logs}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* 右侧边栏 */}
                <div style={{
                    width: rightSiderWidth,
                    minWidth: 260,
                    maxWidth: 400,
                    position: 'relative',
                    flexShrink: 0,
                }}>
                    <RightSidebar
                        taskId={currentTask.id}
                        task={{
                            name: currentTask.name,
                            description: currentTask.description,
                            engineType: currentTask.engineType,
                        }}
                        schedule={{
                            cronExpression: schedule.cronExpression,
                            enabled: schedule.enabled,
                        }}
                        onTaskChange={(t) => setCurrentTask(prev => ({...prev, ...t}))}
                        onScheduleChange={(s) => setSchedule(prev => ({...prev, ...s}))}
                        onSave={handleSave}
                        onExecute={handleExecute}
                        saving={saving}
                        executing={executing}
                    />
                    {/* 右侧拖拽条 */}
                    <div
                        onMouseDown={handleRightSiderMouseDown}
                        style={{
                            position: 'absolute',
                            left: 0, top: 0, bottom: 0,
                            width: 6,
                            cursor: 'col-resize',
                            background: isDraggingRightSider ? '#1890ff' : 'transparent',
                            zIndex: 10,
                            transition: 'background 0.2s',
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default DataWorkWorkspace;
