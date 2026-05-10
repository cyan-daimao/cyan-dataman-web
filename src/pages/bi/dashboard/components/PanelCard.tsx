import React from 'react';
import { Button, Dropdown } from 'antd';
import { MoreOutlined, CopyOutlined, DeleteOutlined, DragOutlined } from '@ant-design/icons';

const HEADER_HEIGHT = 36;

interface PanelCardProps {
    title?: string;
    children: React.ReactNode;
    selected?: boolean;
    bgColor?: string;
    borderStyle?: string;
    titleVisible?: boolean;
    extra?: React.ReactNode;
    onClick?: () => void;
    onDuplicate?: () => void;
    onDelete?: () => void;
    dragHandleProps?: Record<string, unknown>;
}

const PanelCard: React.FC<PanelCardProps> = ({
    title,
    children,
    selected = false,
    bgColor,
    borderStyle = 'default',
    titleVisible = true,
    extra,
    onClick,
    onDuplicate,
    onDelete,
    dragHandleProps,
}) => {
    const showBorder = borderStyle !== 'none';
    const showShadow = borderStyle === 'shadow';

    const menuItems = [
        {
            key: 'duplicate',
            label: '复制',
            icon: <CopyOutlined />,
            onClick: (e: { domEvent: React.MouseEvent }) => {
                e.domEvent.stopPropagation();
                onDuplicate?.();
            },
        },
        {
            key: 'delete',
            label: '删除',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: (e: { domEvent: React.MouseEvent }) => {
                e.domEvent.stopPropagation();
                onDelete?.();
            },
        },
    ];

    return (
        <div
            onClick={onClick}
            style={{
                height: '100%',
                background: bgColor || '#fff',
                borderRadius: 4,
                border: selected
                    ? '2px solid #4F6DF5'
                    : showBorder
                        ? '1px solid #e0e0e0'
                        : 'none',
                boxShadow: showShadow ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                overflow: 'hidden',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'box-shadow 0.2s, border-color 0.2s',
            }}
        >
            {/* 标题栏 - 固定高度 */}
            {titleVisible !== false && (
                <div
                    {...dragHandleProps}
                    style={{
                        height: HEADER_HEIGHT,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 10px',
                        borderBottom: '1px solid #f0f0f0',
                        background: 'rgba(0,0,0,0.02)',
                        cursor: dragHandleProps ? 'move' : 'default',
                        userSelect: 'none',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                        {dragHandleProps && <DragOutlined style={{ fontSize: 12, color: '#999', flexShrink: 0 }} />}
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {title}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        {extra && <span style={{ fontSize: 11, color: '#999' }}>{extra}</span>}
                        <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
                            <Button type="text" size="small" icon={<MoreOutlined />} style={{ padding: 0, width: 24, height: 24, color: '#999' }} onClick={(e) => e.stopPropagation()} />
                        </Dropdown>
                    </div>
                </div>
            )}

            {/* 内容区 - 明确高度 calc(100% - 标题栏高度) */}
            <div style={{ height: titleVisible !== false ? `calc(100% - ${HEADER_HEIGHT}px)` : '100%', overflow: 'hidden' }}>
                {children}
            </div>
        </div>
    );
};

export default PanelCard;
