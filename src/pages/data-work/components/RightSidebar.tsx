import React from 'react';
import {
    Button,
    Card,
    Divider,
    Form,
    Input,
    Radio,
    Space,
    Switch,
    Tag,
    Popconfirm,
} from 'antd';
import {
    SaveOutlined,
    PlayCircleOutlined,
    ThunderboltOutlined,
    CloseOutlined,
    DeleteOutlined,
} from '@ant-design/icons';

const engineOptions = [
    { label: 'SparkSQL', value: 'SPARK' },
    { label: 'FlinkSQL', value: 'FLINK' },
];

interface TaskProps {
    name: string;
    description?: string;
    engineType: 'SPARK' | 'FLINK';
}

interface ScheduleProps {
    cronExpression?: string;
    enabled?: boolean;
}

type PanelType = 'property' | 'schedule' | 'version' | 'settings' | null;

interface RightSidebarProps {
    jobId?: string;
    task: TaskProps;
    schedule: ScheduleProps;
    onTaskChange: (task: TaskProps) => void;
    onScheduleChange: (schedule: ScheduleProps) => void;
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
    onTaskChange,
    onScheduleChange,
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
                                onChange={(e) => onTaskChange({ ...task, name: e.target.value })}
                                maxLength={200}
                                showCount
                            />
                        </Form.Item>
                        <Form.Item label="任务描述">
                            <Input.TextArea
                                placeholder="请输入任务描述"
                                value={task.description || ''}
                                onChange={(e) => onTaskChange({ ...task, description: e.target.value })}
                                rows={2}
                                maxLength={500}
                                showCount
                            />
                        </Form.Item>
                        <Form.Item label="引擎类型" required>
                            <Radio.Group
                                options={engineOptions}
                                value={task.engineType}
                                onChange={(e) => onTaskChange({ ...task, engineType: e.target.value })}
                                optionType="button"
                                buttonStyle="solid"
                                style={{ width: '100%' }}
                            />
                        </Form.Item>
                    </Form>
                </Card>

                <Divider style={{ margin: '8px 0' }} />

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
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', background: '#fafafa', flexShrink: 0 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={onSave} block>
                        {isNew ? '保存任务' : '更新任务'}
                    </Button>
                    <Button icon={<PlayCircleOutlined />} loading={executing} onClick={onExecute} block>
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
                        <Radio.Group value={task.engineType} optionType="button" buttonStyle="solid">
                            <Radio.Button value="SPARK">SparkSQL</Radio.Button>
                            <Radio.Button value="FLINK">FlinkSQL</Radio.Button>
                        </Radio.Group>
                    </Form.Item>
                    <Form.Item label="内存（GB）">
                        <Input type="number" placeholder="2" defaultValue={2} />
                    </Form.Item>
                    <Form.Item label="CPU 核数">
                        <Input type="number" placeholder="1" defaultValue={1} />
                    </Form.Item>
                    <Form.Item label="并行度">
                        <Input type="number" placeholder="4" defaultValue={4} />
                    </Form.Item>
                </Form>
            </div>
        </div>
    );

    const panelContent: Record<string, React.ReactNode> = {
        property: PropertyPanel,
        schedule: SchedulePanel,
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
