import React from 'react';
import {
    Alert,
    Button,
    Card,
    Divider,
    Form,
    Input,
    InputNumber,
    Space,
    Switch,
    Tag,
    Popconfirm,
    Select,
} from 'antd';
import {
    SaveOutlined,
    PlayCircleOutlined,
    ThunderboltOutlined,
    CloseOutlined,
    DeleteOutlined,
    ApartmentOutlined,
} from '@ant-design/icons';
import { EngineType, NodeType } from '@/api/DataworksApi.ts';

interface TaskProps {
    name: string;
    description?: string;
    engineType: EngineType;
    nodeType?: NodeType;
    configJson?: string;
}

interface ScheduleProps {
    cronExpression?: string;
    enabled?: boolean;
}

interface DependencyJobOption {
    id: string;
    name: string;
    engineType: EngineType;
    nodeType?: NodeType;
    status: 'DRAFT' | 'ONLINE' | 'OFFLINE';
}

type PanelType = 'property' | 'schedule' | 'dependency' | 'version' | 'settings' | null;

interface RightSidebarProps {
    jobId?: string;
    task: TaskProps;
    schedule: ScheduleProps;
    dependencyJobOptions?: DependencyJobOption[];
    upstreamJobIds?: string[];
    onTaskChange: (task: Partial<TaskProps>) => void;
    onScheduleChange: (schedule: ScheduleProps) => void;
    onDependencyChange?: (upstreamJobIds: string[]) => void;
    onSave: () => void;
    onExecute: () => void;
    onDelete?: () => void;
    saving?: boolean;
    executing?: boolean;
    deleting?: boolean;
    activePanel: PanelType;
    panelWidth: number;
    onActivePanelChange: (panel: PanelType) => void;
}

const RightSidebar: React.FC<RightSidebarProps> = ({
    jobId,
    task,
    schedule,
    dependencyJobOptions = [],
    upstreamJobIds = [],
    onTaskChange,
    onScheduleChange,
    onDependencyChange,
    onSave,
    onExecute,
    onDelete,
    saving = false,
    executing = false,
    deleting = false,
    activePanel,
    onActivePanelChange,
}) => {
    const isNew = !jobId;
    const isRealtimeFlinkSql = task.nodeType === 'FLINK_SQL';
    const getNodeTypeLabel = () => {
        if (task.nodeType === 'FLINK_SQL') return 'FlinkSQL 实时任务';
        if (task.nodeType === 'SPARK_BATCH') return 'Spark批任务';
        if (task.nodeType === 'FLINK_BATCH') return 'FlinkSQL 批任务';
        if (task.nodeType === 'SHELL') return 'Shell';
        if (task.nodeType === 'PYTHON') return 'Python';
        return task.engineType === 'FLINK' ? 'FlinkSQL' : 'SparkSQL';
    };
    const getNodeTypeColor = () => {
        if (task.nodeType === 'SHELL') return 'cyan';
        if (task.nodeType === 'PYTHON') return 'green';
        if (task.nodeType === 'SPARK_BATCH') return 'geekblue';
        if (task.nodeType === 'FLINK_BATCH') return 'magenta';
        return task.engineType === 'SPARK' ? 'blue' : 'purple';
    };
    const parseFlinkConfig = () => {
        const defaults = {
            taskManagerMemoryGb: 2,
            taskManagerCpu: 1,
            parallelism: 4,
            jobManagerMemoryGb: 1,
            jobManagerCpu: 0.5,
            flinkVersion: 'v2_0',
            upgradeMode: 'last-state',
            state: 'running',
            checkpointInterval: '60s',
            checkpointTimeout: '600s',
            checkpointMaxConcurrent: 1,
            checkpointMinPause: '500ms',
            checkpointMode: 'EXACTLY_ONCE',
            stateBackendType: 'rocksdb',
            flinkConfiguration: '' as string,
        };
        if (!task.configJson) return defaults;
        try {
            const config = JSON.parse(task.configJson);
            const flink = config?.flink || {};
            const extra = flink.flinkConfiguration && typeof flink.flinkConfiguration === 'object'
                ? flink.flinkConfiguration
                : {};
            return {
                taskManagerMemoryGb: Number(flink.taskManagerMemoryGb) || defaults.taskManagerMemoryGb,
                taskManagerCpu: Number(flink.taskManagerCpu) || defaults.taskManagerCpu,
                parallelism: Number(flink.parallelism) || defaults.parallelism,
                jobManagerMemoryGb: Number(flink.jobManagerMemoryGb) || defaults.jobManagerMemoryGb,
                jobManagerCpu: Number(flink.jobManagerCpu) || defaults.jobManagerCpu,
                flinkVersion: String(flink.flinkVersion || defaults.flinkVersion),
                upgradeMode: String(flink.upgradeMode || defaults.upgradeMode),
                state: String(flink.state || defaults.state),
                checkpointInterval: String(flink.checkpointInterval || defaults.checkpointInterval),
                checkpointTimeout: String(flink.checkpointTimeout || defaults.checkpointTimeout),
                checkpointMaxConcurrent: Number(flink.checkpointMaxConcurrent) || defaults.checkpointMaxConcurrent,
                checkpointMinPause: String(flink.checkpointMinPause || defaults.checkpointMinPause),
                checkpointMode: String(flink.checkpointMode || defaults.checkpointMode),
                stateBackendType: String(flink.stateBackendType || defaults.stateBackendType),
                flinkConfiguration: Object.keys(extra).length > 0 ? JSON.stringify(extra, null, 2) : '',
            };
        } catch {
            return defaults;
        }
    };
    const updateFlinkConfig = (patch: Partial<ReturnType<typeof parseFlinkConfig>>) => {
        let current: Record<string, any> = {};
        try {
            current = task.configJson ? JSON.parse(task.configJson) : {};
        } catch {
            current = {};
        }
        const merged = {
            ...parseFlinkConfig(),
            ...current.flink,
            ...patch,
        };
        // 对 flinkConfiguration（自由 KV）字段做容错解析：JSON 字符串 → object，解析失败保留原样字符串以便用户修复
        let extraConfiguration: Record<string, string> | undefined;
        const rawExtra = merged.flinkConfiguration;
        if (rawExtra && typeof rawExtra === 'string' && rawExtra.trim()) {
            try {
                const parsed = JSON.parse(rawExtra);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    extraConfiguration = Object.fromEntries(
                        Object.entries(parsed).map(([k, v]) => [k, String(v)]),
                    );
                }
            } catch {
                // 解析失败：保留原始字符串到后端去（后端会忽略非对象），同时不破坏其它字段
            }
        }
        const nextFlink: Record<string, any> = {
            taskManagerMemoryGb: merged.taskManagerMemoryGb,
            taskManagerCpu: merged.taskManagerCpu,
            parallelism: merged.parallelism,
            jobManagerMemoryGb: merged.jobManagerMemoryGb,
            jobManagerCpu: merged.jobManagerCpu,
            flinkVersion: merged.flinkVersion,
            upgradeMode: merged.upgradeMode,
            state: merged.state,
            checkpointInterval: merged.checkpointInterval,
            checkpointTimeout: merged.checkpointTimeout,
            checkpointMaxConcurrent: merged.checkpointMaxConcurrent,
            checkpointMinPause: merged.checkpointMinPause,
            checkpointMode: merged.checkpointMode,
            stateBackendType: merged.stateBackendType,
        };
        if (extraConfiguration && Object.keys(extraConfiguration).length > 0) {
            nextFlink.flinkConfiguration = extraConfiguration;
        }
        onTaskChange({
            configJson: JSON.stringify({
                ...current,
                flink: nextFlink,
            }),
        });
    };
    const flinkConfig = parseFlinkConfig();
    const parseScriptConfig = () => {
        const defaults = {
            image: task.nodeType === 'PYTHON' ? 'python:3.11-slim' : 'busybox:1.36',
            cpu: '0.5',
            memory: '512Mi',
            timeoutSeconds: 300,
        };
        if (!task.configJson) return defaults;
        try {
            const config = JSON.parse(task.configJson);
            return {
                image: String(config?.script?.image || defaults.image),
                cpu: String(config?.script?.cpu || defaults.cpu),
                memory: String(config?.script?.memory || defaults.memory),
                timeoutSeconds: Number(config?.script?.timeoutSeconds) || defaults.timeoutSeconds,
            };
        } catch {
            return defaults;
        }
    };
    const updateScriptConfig = (patch: Partial<ReturnType<typeof parseScriptConfig>>) => {
        let current: Record<string, any> = {};
        try {
            current = task.configJson ? JSON.parse(task.configJson) : {};
        } catch {
            current = {};
        }
        onTaskChange({
            configJson: JSON.stringify({
                ...current,
                script: {
                    ...parseScriptConfig(),
                    ...current.script,
                    ...patch,
                },
            }),
        });
    };
    const scriptConfig = parseScriptConfig();

    const PropertyPanel = (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
            }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>任务属性</span>
                {isNew ? <Tag color="orange">未保存</Tag> : <Tag color="blue">已保存</Tag>}
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
                <Card size="small" title="基本信息" variant="borderless" style={{ marginBottom: 12 }} styles={{ body: { padding: '12px 0' } }}>
                    <Form layout="vertical" size="small">
                        <Form.Item label="任务名称" required>
                            <Input
                                placeholder="请输入任务名称"
                                value={task.name}
                                onChange={(e) => onTaskChange({ name: e.target.value })}
                                maxLength={200}
                                showCount
                            />
                        </Form.Item>
                        <Form.Item label="任务描述">
                            <Input.TextArea
                                placeholder="请输入任务描述"
                                value={task.description || ''}
                                onChange={(e) => onTaskChange({ description: e.target.value })}
                                rows={2}
                                maxLength={500}
                                showCount
                            />
                        </Form.Item>
                    </Form>
                </Card>

                <Divider style={{ margin: '8px 0' }} />

                {isRealtimeFlinkSql ? (
                    <Alert
                        type="info"
                        showIcon
                        message="实时任务发布后由 Flink Operator 常驻运行"
                    />
                ) : (
                    <Card size="small" title={<span><ThunderboltOutlined style={{ marginRight: 6 }} />调度配置</span>} variant="borderless" style={{ marginBottom: 12 }} styles={{ body: { padding: '12px 0' } }}>
                        <Form layout="vertical" size="small">
                            <Form.Item label="Cron 表达式" extra={<span style={{ fontSize: 11, color: '#999' }}>例如: 0 0 2 * * ?（每天凌晨2点）</span>}>
                                <Input
                                    placeholder="0 0 2 * * ?"
                                    value={schedule.cronExpression || ''}
                                    onChange={(e) => onScheduleChange({ ...schedule, cronExpression: e.target.value })}
                                />
                            </Form.Item>
                            <Form.Item label="启用调度">
                                <Switch
                                    checked={schedule.enabled || false}
                                    onChange={(checked) => onScheduleChange({ ...schedule, enabled: checked })}
                                    checkedChildren="启用"
                                    unCheckedChildren="停用"
                                />
                            </Form.Item>
                        </Form>
                    </Card>
                )}
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', background: '#fafafa', flexShrink: 0 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={onSave} block>
                        {isNew ? '保存任务' : '更新任务'}
                    </Button>
                    <Button icon={<PlayCircleOutlined />} loading={executing} onClick={onExecute} block disabled={task.engineType === 'FLINK'}>
                        立即执行
                    </Button>
                    {!isNew && onDelete && (
                        <Popconfirm
                            title="删除任务"
                            description="确定要删除该任务吗？删除后不可恢复。"
                            onConfirm={onDelete}
                            okText="删除"
                            cancelText="取消"
                            okButtonProps={{ danger: true, loading: deleting }}
                        >
                            <Button danger icon={<DeleteOutlined />} loading={deleting} block>
                                删除任务
                            </Button>
                        </Popconfirm>
                    )}
                </Space>
            </div>
        </div>
    );

    const SchedulePanel = (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontWeight: 600, fontSize: 14, flexShrink: 0 }}>
                调度配置
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
                {isRealtimeFlinkSql ? (
                    <Alert type="info" showIcon message="FlinkSQL实时任务不使用Airflow调度" />
                ) : (
                    <Form layout="vertical" size="small">
                    <Form.Item label="Cron 表达式">
                        <Input
                            placeholder="0 0 2 * * ?"
                            value={schedule.cronExpression || ''}
                            onChange={(e) => onScheduleChange({ ...schedule, cronExpression: e.target.value })}
                        />
                    </Form.Item>
                    <Form.Item label="启用调度">
                        <Switch
                            checked={schedule.enabled || false}
                            onChange={(checked) => onScheduleChange({ ...schedule, enabled: checked })}
                            checkedChildren="启用"
                            unCheckedChildren="停用"
                        />
                    </Form.Item>
                    <Form.Item label="超时时间（分钟）">
                        <Input type="number" placeholder="60" defaultValue={60} />
                    </Form.Item>
                    <Form.Item label="失败重试次数">
                        <Input type="number" placeholder="3" defaultValue={3} />
                    </Form.Item>
                    </Form>
                )}
            </div>
        </div>
    );

    const DependencyPanel = (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontWeight: 600, fontSize: 14, flexShrink: 0 }}>
                依赖配置
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
                {isRealtimeFlinkSql ? (
                    <Alert type="info" showIcon message="FlinkSQL实时任务不配置Airflow上游依赖" />
                ) : (
                    <Form layout="vertical" size="small">
                    <Form.Item
                        label={<span><ApartmentOutlined style={{ marginRight: 6 }} />上游任务</span>}
                    >
                        <Select
                            mode="multiple"
                            allowClear
                            showSearch
                            placeholder="请选择上游任务"
                            disabled={isNew}
                            value={upstreamJobIds}
                            onChange={(values) => onDependencyChange?.(values)}
                            optionFilterProp="label"
                            options={dependencyJobOptions
                                .filter(option => option.id !== jobId)
                                .map(option => ({
                                    value: option.id,
                                    label: `${option.name} (${option.status})`,
                                }))}
                        />
                    </Form.Item>
                    </Form>
                )}
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', background: '#fafafa', flexShrink: 0 }}>
                <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={onSave} disabled={isRealtimeFlinkSql} block>
                    保存依赖配置
                </Button>
            </div>
        </div>
    );

    const VersionPanel = (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontWeight: 600, fontSize: 14, flexShrink: 0 }}>
                版本管理
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
                <div style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
                    <span style={{ fontSize: 32, marginBottom: 12, display: 'block' }}>🌿</span>
                    <p>版本管理功能开发中</p>
                    <p style={{ fontSize: 12 }}>将支持 SQL 版本快照与回滚</p>
                </div>
            </div>
        </div>
    );

    const SettingsPanel = (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontWeight: 600, fontSize: 14, flexShrink: 0 }}>
                运行配置
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
                <Form layout="vertical" size="small">
                    <Form.Item label="执行引擎">
                        <Tag color={getNodeTypeColor()}>
                            {getNodeTypeLabel()}
                        </Tag>
                    </Form.Item>
                    {(task.nodeType === 'FLINK_SQL' || task.nodeType === 'FLINK_BATCH') && (
                        <>
                            <Form.Item label="JobManager 内存（GB）">
                                <InputNumber
                                    min={1}
                                    precision={0}
                                    value={flinkConfig.jobManagerMemoryGb}
                                    style={{ width: '100%' }}
                                    onChange={(value) => updateFlinkConfig({ jobManagerMemoryGb: value || 1 })}
                                />
                            </Form.Item>
                            <Form.Item label="JobManager CPU 核数">
                                <InputNumber
                                    min={0.1}
                                    step={0.1}
                                    precision={1}
                                    value={flinkConfig.jobManagerCpu}
                                    style={{ width: '100%' }}
                                    onChange={(value) => updateFlinkConfig({ jobManagerCpu: value || 0.5 })}
                                />
                            </Form.Item>
                            <Form.Item label="TaskManager 内存（GB）">
                                <InputNumber
                                    min={1}
                                    precision={0}
                                    value={flinkConfig.taskManagerMemoryGb}
                                    style={{ width: '100%' }}
                                    onChange={(value) => updateFlinkConfig({ taskManagerMemoryGb: value || 1 })}
                                />
                            </Form.Item>
                            <Form.Item label="TaskManager CPU 核数">
                                <InputNumber
                                    min={0.1}
                                    step={0.1}
                                    precision={1}
                                    value={flinkConfig.taskManagerCpu}
                                    style={{ width: '100%' }}
                                    onChange={(value) => updateFlinkConfig({ taskManagerCpu: value || 0.5 })}
                                />
                            </Form.Item>
                            <Form.Item label="并行度">
                                <InputNumber
                                    min={1}
                                    precision={0}
                                    value={flinkConfig.parallelism}
                                    style={{ width: '100%' }}
                                    onChange={(value) => updateFlinkConfig({ parallelism: value || 1 })}
                                />
                            </Form.Item>
                            {task.nodeType === 'FLINK_SQL' && (
                                <>
                                    <Form.Item label="Flink 版本">
                                        <Select
                                            value={flinkConfig.flinkVersion}
                                            onChange={(value) => updateFlinkConfig({ flinkVersion: value })}
                                            options={[
                                                { value: 'v2_0', label: 'v2_0' },
                                                { value: 'v1_20', label: 'v1_20' },
                                                { value: 'v1_19', label: 'v1_19' },
                                                { value: 'v1_18', label: 'v1_18' },
                                            ]}
                                        />
                                    </Form.Item>
                                    <Form.Item label="升级模式">
                                        <Select
                                            value={flinkConfig.upgradeMode}
                                            onChange={(value) => updateFlinkConfig({ upgradeMode: value })}
                                            options={[
                                                { value: 'last-state', label: 'last-state（默认）' },
                                                { value: 'savepoint', label: 'savepoint' },
                                                { value: 'stateless', label: 'stateless' },
                                            ]}
                                        />
                                    </Form.Item>
                                    <Form.Item label="期望状态">
                                        <Select
                                            value={flinkConfig.state}
                                            onChange={(value) => updateFlinkConfig({ state: value })}
                                            options={[
                                                { value: 'running', label: 'running' },
                                                { value: 'suspended', label: 'suspended' },
                                            ]}
                                        />
                                    </Form.Item>
                                    <Form.Item label="状态后端">
                                        <Select
                                            value={flinkConfig.stateBackendType}
                                            onChange={(value) => updateFlinkConfig({ stateBackendType: value })}
                                            options={[
                                                { value: 'rocksdb', label: 'rocksdb' },
                                                { value: 'hashmap', label: 'hashmap' },
                                            ]}
                                        />
                                    </Form.Item>
                                    <Form.Item label="Checkpoint 间隔">
                                        <Input
                                            value={flinkConfig.checkpointInterval}
                                            onChange={(e) => updateFlinkConfig({ checkpointInterval: e.target.value })}
                                            placeholder="60s"
                                        />
                                    </Form.Item>
                                    <Form.Item label="Checkpoint 超时">
                                        <Input
                                            value={flinkConfig.checkpointTimeout}
                                            onChange={(e) => updateFlinkConfig({ checkpointTimeout: e.target.value })}
                                            placeholder="600s"
                                        />
                                    </Form.Item>
                                    <Form.Item label="Checkpoint 最大并发">
                                        <InputNumber
                                            min={1}
                                            precision={0}
                                            value={flinkConfig.checkpointMaxConcurrent}
                                            style={{ width: '100%' }}
                                            onChange={(value) => updateFlinkConfig({ checkpointMaxConcurrent: value || 1 })}
                                        />
                                    </Form.Item>
                                    <Form.Item label="Checkpoint 最小间隔">
                                        <Input
                                            value={flinkConfig.checkpointMinPause}
                                            onChange={(e) => updateFlinkConfig({ checkpointMinPause: e.target.value })}
                                            placeholder="500ms"
                                        />
                                    </Form.Item>
                                    <Form.Item label="Checkpoint 模式">
                                        <Select
                                            value={flinkConfig.checkpointMode}
                                            onChange={(value) => updateFlinkConfig({ checkpointMode: value })}
                                            options={[
                                                { value: 'EXACTLY_ONCE', label: 'EXACTLY_ONCE' },
                                                { value: 'AT_LEAST_ONCE', label: 'AT_LEAST_ONCE' },
                                            ]}
                                        />
                                    </Form.Item>
                                    <Form.Item
                                        label="自定义 flinkConfiguration"
                                        extra={<span style={{ fontSize: 11, color: '#999' }}>JSON 对象，键值会与默认配置合并</span>}
                                    >
                                        <Input.TextArea
                                            value={flinkConfig.flinkConfiguration}
                                            rows={4}
                                            placeholder={'{\n  "table.exec.source.idle-timeout": "30s"\n}'}
                                            onChange={(e) => updateFlinkConfig({ flinkConfiguration: e.target.value })}
                                        />
                                    </Form.Item>
                                </>
                            )}
                        </>
                    )}
                    {(task.nodeType === 'SHELL' || task.nodeType === 'PYTHON') && (
                        <>
                            <Form.Item label="运行镜像">
                                <Input
                                    value={scriptConfig.image}
                                    onChange={(e) => updateScriptConfig({ image: e.target.value })}
                                />
                            </Form.Item>
                            <Form.Item label="CPU 限制">
                                <Input
                                    value={scriptConfig.cpu}
                                    onChange={(e) => updateScriptConfig({ cpu: e.target.value })}
                                />
                            </Form.Item>
                            <Form.Item label="内存限制">
                                <Input
                                    value={scriptConfig.memory}
                                    onChange={(e) => updateScriptConfig({ memory: e.target.value })}
                                />
                            </Form.Item>
                            <Form.Item label="超时时间（秒）">
                                <InputNumber
                                    min={30}
                                    precision={0}
                                    value={scriptConfig.timeoutSeconds}
                                    style={{ width: '100%' }}
                                    onChange={(value) => updateScriptConfig({ timeoutSeconds: value || 300 })}
                                />
                            </Form.Item>
                        </>
                    )}
                    {(task.nodeType === 'SPARK_BATCH' || task.nodeType === 'FLINK_BATCH') && (
                        <Form.Item label="批任务配置">
                            <Input.TextArea
                                value={task.configJson || ''}
                                rows={8}
                                onChange={(e) => onTaskChange({ configJson: e.target.value })}
                            />
                        </Form.Item>
                    )}
                </Form>
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', background: '#fafafa', flexShrink: 0 }}>
                <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={onSave} block>
                    保存运行配置
                </Button>
            </div>
        </div>
    );

    const panelContent: Record<string, React.ReactNode> = {
        property: PropertyPanel,
        schedule: SchedulePanel,
        dependency: DependencyPanel,
        version: VersionPanel,
        settings: SettingsPanel,
    };

    return (
        <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* 关闭按钮行 */}
            <div style={{
                padding: '8px 12px',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: 'flex-end',
                flexShrink: 0,
            }}>
                <Button type="text" icon={<CloseOutlined />} size="small" onClick={() => onActivePanelChange(null)} />
            </div>
            {/* 面板内容 */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                {activePanel ? panelContent[activePanel] : null}
            </div>
        </div>
    );
};

export default RightSidebar;
