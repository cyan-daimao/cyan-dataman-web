import React, { useState } from 'react';
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
    Tooltip,
    Drawer,
} from 'antd';
import {
    SaveOutlined,
    PlayCircleOutlined,
    ThunderboltOutlined,
    SettingOutlined,
    BranchesOutlined,
    FileTextOutlined,
    CloseOutlined,
} from '@ant-design/icons';

/**
 * 引擎类型选项
 */
const engineOptions = [
    { label: 'SparkSQL', value: 'SPARK' },
    { label: 'FlinkSQL', value: 'FLINK' },
];

/**
 * 任务属性
 */
interface TaskProps {
    name: string;
    description?: string;
    engineType: 'SPARK' | 'FLINK';
}

/**
 * 调度属性
 */
interface ScheduleProps {
    cronExpression?: string;
    enabled?: boolean;
}

interface RightSidebarProps {
    /** 当前任务ID（空表示未保存的新任务） */
    taskId?: string;
    /** 任务属性 */
    task: TaskProps;
    /** 调度属性 */
    schedule: ScheduleProps;
    /** 属性变更回调 */
    onTaskChange: (task: TaskProps) => void;
    /** 调度变更回调 */
    onScheduleChange: (schedule: ScheduleProps) => void;
    /** 保存任务 */
    onSave: () => void;
    /** 执行任务 */
    onExecute: () => void;
    /** 保存中 */
    saving?: boolean;
    /** 执行中 */
    executing?: boolean;
}

type PanelType = 'property' | 'schedule' | 'version' | 'settings' | null;

const RightSidebar: React.FC<RightSidebarProps> = ({
    taskId,
    task,
    schedule,
    onTaskChange,
    onScheduleChange,
    onSave,
    onExecute,
    saving = false,
    executing = false,
}) => {
    const [activePanel, setActivePanel] = useState<PanelType>('property');
    const isNew = !taskId;

    const togglePanel = (panel: PanelType) => {
        setActivePanel(prev => (prev === panel ? null : panel));
    };

    // 右侧 icon 按钮列表
    const iconButtons = [
        { key: 'property' as PanelType, icon: <FileTextOutlined />, title: '属性' },
        { key: 'schedule' as PanelType, icon: <ThunderboltOutlined />, title: '调度配置' },
        { key: 'version' as PanelType, icon: <BranchesOutlined />, title: '版本' },
        { key: 'settings' as PanelType, icon: <SettingOutlined />, title: '运行配置' },
    ];

    // 属性面板内容
    const PropertyPanel = (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>任务属性</span>
                {isNew ? <Tag color="orange">未保存</Tag> : <Tag color="blue">已保存</Tag>}
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
                <Card size="small" title="基本信息" bordered={false} style={{ marginBottom: 12 }} bodyStyle={{ padding: '12px 0' }}>
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

                <Card size="small" title={<span><ThunderboltOutlined style={{ marginRight: 6 }} />调度配置</span>} bordered={false} style={{ marginBottom: 12 }} bodyStyle={{ padding: '12px 0' }}>
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
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={onSave} block>
                        {isNew ? '保存任务' : '更新任务'}
                    </Button>
                    <Button icon={<PlayCircleOutlined />} loading={executing} onClick={onExecute} block>
                        立即执行
                    </Button>
                </Space>
            </div>
        </div>
    );

    // 调度配置面板（简化版，与属性面板中的调度配置重复，但独立展示）
    const SchedulePanel = (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontWeight: 600, fontSize: 14 }}>
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

    // 版本面板（占位）
    const VersionPanel = (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontWeight: 600, fontSize: 14 }}>
                版本管理
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
                <div style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
                    <BranchesOutlined style={{ fontSize: 32, marginBottom: 12 }} />
                    <p>版本管理功能开发中</p>
                    <p style={{ fontSize: 12 }}>将支持 SQL 版本快照与回滚</p>
                </div>
            </div>
        </div>
    );

    // 运行配置面板（占位）
    const SettingsPanel = (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontWeight: 600, fontSize: 14 }}>
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
        <div style={{ height: '100%', display: 'flex', flexDirection: 'row' }}>
            {/* 右侧 icon 按钮列 */}
            <div style={{
                width: 44,
                background: '#fafafa',
                borderLeft: '1px solid #f0f0f0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '8px 0',
                gap: 8,
            }}>
                {iconButtons.map(btn => (
                    <Tooltip key={btn.key} title={btn.title} placement="left">
                        <Button
                            type={activePanel === btn.key ? 'primary' : 'text'}
                            icon={btn.icon}
                            size="small"
                            style={{ width: 32, height: 32 }}
                            onClick={() => togglePanel(btn.key)}
                        />
                    </Tooltip>
                ))}
            </div>

            {/* 展开面板 */}
            {activePanel && (
                <div style={{
                    width: 320,
                    background: '#fff',
                    borderLeft: '1px solid #f0f0f0',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <div style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid #f0f0f0',
                        display: 'flex',
                        justifyContent: 'flex-end',
                    }}>
                        <Button type="text" icon={<CloseOutlined />} size="small" onClick={() => setActivePanel(null)} />
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        {panelContent[activePanel]}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RightSidebar;
