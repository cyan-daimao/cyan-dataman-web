import React from 'react';
import { Button, Tooltip } from 'antd';
import {
    ApartmentOutlined,
    BranchesOutlined,
    FileTextOutlined,
    SettingOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons';
import { JobDTO, ScheduleConfigDTO } from '@/api/DataworksApi.ts';
import RightSidebar from './RightSidebar';

type RightPanelType = 'property' | 'schedule' | 'dependency' | 'version' | 'settings' | null;

interface DataWorkRightDockProps {
    task: JobDTO;
    schedule: ScheduleConfigDTO;
    dependencyJobOptions: JobDTO[];
    upstreamJobIds: string[];
    activePanel: RightPanelType;
    panelWidth: number;
    isDragging: boolean;
    saving: boolean;
    executing: boolean;
    deleting: boolean;
    onTaskChange: (task: Partial<{
        name: string;
        description?: string;
        engineType: JobDTO['engineType'];
        nodeType?: JobDTO['nodeType'];
        configJson?: string;
    }>) => void;
    onScheduleChange: (schedule: { cronExpression?: string; enabled?: boolean }) => void;
    onDependencyChange: (upstreamJobIds: string[]) => void;
    onSave: () => void;
    onExecute: () => void;
    onDelete: () => void;
    onActivePanelChange: (panel: RightPanelType) => void;
    onResizeStart: (e: React.MouseEvent) => void;
}

const panelButtons: Array<{
    key: Exclude<RightPanelType, null>;
    icon: React.ReactNode;
    title: string;
}> = [
    { key: 'property', icon: <FileTextOutlined />, title: '属性' },
    { key: 'schedule', icon: <ThunderboltOutlined />, title: '调度配置' },
    { key: 'dependency', icon: <ApartmentOutlined />, title: '依赖配置' },
    { key: 'version', icon: <BranchesOutlined />, title: '版本' },
    { key: 'settings', icon: <SettingOutlined />, title: '运行配置' },
];

/**
 * 右侧 DataWorks 式图标栏和配置面板。
 */
const DataWorkRightDock: React.FC<DataWorkRightDockProps> = ({
    task,
    schedule,
    dependencyJobOptions,
    upstreamJobIds,
    activePanel,
    panelWidth,
    isDragging,
    saving,
    executing,
    deleting,
    onTaskChange,
    onScheduleChange,
    onDependencyChange,
    onSave,
    onExecute,
    onDelete,
    onActivePanelChange,
    onResizeStart,
}) => {
    return (
        <div style={{ width: 44, flex: '0 0 44px', height: '100%', position: 'relative', overflow: 'visible' }}>
            {activePanel && (
                <div style={{
                    position: 'absolute',
                    right: 44,
                    top: 0,
                    bottom: 0,
                    width: panelWidth,
                    background: '#fff',
                    borderLeft: '1px solid #edf0f5',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 1,
                    boxShadow: '-6px 0 16px rgba(31, 35, 41, 0.05)',
                }}>
                    <RightSidebar
                        jobId={task.id}
                        task={{
                            name: task.name,
                            description: task.description,
                            engineType: task.engineType,
                            nodeType: task.nodeType,
                            configJson: task.configJson,
                        }}
                        schedule={{
                            cronExpression: schedule.cronExpression,
                            enabled: schedule.enabled,
                        }}
                        dependencyJobOptions={dependencyJobOptions}
                        upstreamJobIds={upstreamJobIds}
                        onTaskChange={onTaskChange}
                        onScheduleChange={onScheduleChange}
                        onDependencyChange={onDependencyChange}
                        onSave={onSave}
                        onExecute={onExecute}
                        onDelete={onDelete}
                        saving={saving}
                        executing={executing}
                        deleting={deleting}
                        activePanel={activePanel}
                        panelWidth={panelWidth}
                        onActivePanelChange={onActivePanelChange}
                    />
                </div>
            )}

            <div style={{
                width: 44,
                height: '100%',
                background: '#f7f8fa',
                borderLeft: '1px solid #edf0f5',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '8px 0',
                gap: 8,
            }}>
                {panelButtons.map(btn => (
                    <Tooltip key={btn.key} title={btn.title} placement="left">
                        <Button
                            type={activePanel === btn.key ? 'primary' : 'text'}
                            icon={btn.icon}
                            size="small"
                            style={{ width: 32, height: 32 }}
                            onClick={() => onActivePanelChange(btn.key)}
                        />
                    </Tooltip>
                ))}
            </div>

            {activePanel && (
                <div
                    onMouseDown={onResizeStart}
                    style={{
                        position: 'absolute',
                        right: 41,
                        top: 0,
                        bottom: 0,
                        width: 6,
                        cursor: 'col-resize',
                        background: isDragging ? '#1677ff' : 'transparent',
                        zIndex: 10,
                        transition: 'background 0.2s',
                    }}
                />
            )}
        </div>
    );
};

export default DataWorkRightDock;
