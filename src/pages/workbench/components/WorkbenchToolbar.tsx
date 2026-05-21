import React from 'react';
import { Button, Divider, Space, Tooltip } from 'antd';
import type { ButtonProps } from 'antd';

export interface ToolbarButton {
    key: string;
    label: string;
    icon: React.ReactNode;
    type?: ButtonProps['type'];
    loading?: boolean;
    disabled?: boolean;
    onClick: () => void;
    tooltip?: string;
    danger?: boolean;
}

interface WorkbenchToolbarProps {
    /** 左侧信息区（如任务名称、状态标签等） */
    leftContent?: React.ReactNode;
    /** 右侧按钮组 */
    buttons: ToolbarButton[];
    /** 是否在按钮组前显示分隔线（用于分组视觉效果） */
    dividerIndices?: number[];
}

/**
 * 统一的工作台顶部操作栏。
 */
const WorkbenchToolbar: React.FC<WorkbenchToolbarProps> = ({
    leftContent,
    buttons,
    dividerIndices = [],
}) => {
    return (
        <div style={{
            height: 40,
            background: '#fff',
            borderBottom: '1px solid #edf0f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            gap: 12,
            flexShrink: 0,
        }}>
            {leftContent && (
                <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {leftContent}
                </div>
            )}
            <Space size={4} wrap={false} style={{ flexShrink: 0 }}>
                {buttons.map((btn, index) => (
                    <React.Fragment key={btn.key}>
                        {dividerIndices.includes(index) && (
                            <Divider type="vertical" style={{ margin: '0 4px' }} />
                        )}
                        <Tooltip title={btn.tooltip || btn.label}>
                            <Button
                                type={btn.type || 'default'}
                                icon={btn.icon}
                                loading={btn.loading}
                                disabled={btn.disabled}
                                danger={btn.danger}
                                onClick={btn.onClick}
                                size="small"
                            >
                                {btn.label}
                            </Button>
                        </Tooltip>
                    </React.Fragment>
                ))}
            </Space>
        </div>
    );
};

export default WorkbenchToolbar;
