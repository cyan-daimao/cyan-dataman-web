import React, { useState, useCallback } from 'react';
import { Button, Dropdown, Input, Tooltip } from 'antd';
import {
    CloseOutlined,
    CodeOutlined,
    FileTextOutlined,
    PlusOutlined,
} from '@ant-design/icons';

export type WorkbenchTabStatus = 'DRAFT' | 'ONLINE' | 'OFFLINE' | 'normal';

export interface WorkbenchTabItem {
    id: string;
    name: string;
    isModified?: boolean;
    status?: WorkbenchTabStatus;
}

interface WorkbenchTabsProps {
    tabs: WorkbenchTabItem[];
    activeTabId: string;
    onActiveChange: (id: string) => void;
    onClose: (id: string) => void;
    onCloseOthers: (id: string) => void;
    onRename?: (id: string, newName: string) => void;
    onNew?: () => void;
    newDropdownItems?: { key: string; icon?: React.ReactNode; label: React.ReactNode }[];
    onNewDropdownSelect?: (key: string) => void;
    showNewDropdown?: boolean;
    newButtonTooltip?: string;
}

const getStatusColor = (status?: WorkbenchTabStatus) => {
    if (status === 'ONLINE') return '#52c41a';
    if (status === 'OFFLINE') return '#8c8c8c';
    if (status === 'DRAFT') return '#faad14';
    return '#1890ff';
};

const getStatusIcon = (status?: WorkbenchTabStatus) => {
    if (status === 'normal') return <CodeOutlined style={{ fontSize: 12 }} />;
    return <FileTextOutlined style={{ fontSize: 12 }} />;
};

/**
 * 统一的工作台标签栏（DataWorks 风格）。
 */
const WorkbenchTabs: React.FC<WorkbenchTabsProps> = ({
    tabs,
    activeTabId,
    onActiveChange,
    onClose,
    onCloseOthers,
    onRename,
    onNew,
    newDropdownItems,
    onNewDropdownSelect,
    showNewDropdown = false,
    newButtonTooltip = '新建',
}) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    const handleStartRename = useCallback((tab: WorkbenchTabItem) => {
        if (!onRename) return;
        setEditingId(tab.id);
        setEditingName(tab.name);
    }, [onRename]);

    const handleFinishRename = useCallback(() => {
        if (editingId && editingName.trim() && onRename) {
            onRename(editingId, editingName.trim());
        }
        setEditingId(null);
        setEditingName('');
    }, [editingId, editingName, onRename]);

    return (
        <div style={{
            height: 36,
            background: '#f5f7fa',
            borderBottom: '1px solid #dfe3eb',
            display: 'flex',
            alignItems: 'flex-end',
            flexShrink: 0,
            overflow: 'hidden',
            padding: '0 8px',
            gap: 2,
        }}>
            {tabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                const isEditing = editingId === tab.id;
                return (
                    <Dropdown
                        key={tab.id}
                        trigger={['contextMenu']}
                        menu={{
                            items: [
                                {
                                    key: 'closeOthers',
                                    label: '关闭其他',
                                    disabled: tabs.length <= 1,
                                },
                            ],
                            onClick: ({ key }) => {
                                if (key === 'closeOthers') {
                                    onCloseOthers(tab.id);
                                }
                            },
                        }}
                    >
                        <div
                            onClick={() => onActiveChange(tab.id)}
                            onDoubleClick={() => handleStartRename(tab)}
                            title={tab.name}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                height: 30,
                                padding: '0 8px',
                                fontSize: 13,
                                cursor: 'pointer',
                                userSelect: 'none',
                                borderRadius: '4px 4px 0 0',
                                border: '1px solid',
                                borderBottomColor: isActive ? '#fff' : '#dfe3eb',
                                borderColor: isActive ? '#dfe3eb' : 'transparent',
                                background: isActive ? '#fff' : 'transparent',
                                color: isActive ? '#1f2329' : '#646a73',
                                fontWeight: isActive ? 500 : 400,
                                maxWidth: 190,
                                minWidth: 80,
                                flexShrink: 0,
                                transition: 'all 0.15s ease',
                            }}
                        >
                            {isEditing ? (
                                <Input
                                    autoFocus
                                    size="small"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    onBlur={handleFinishRename}
                                    onPressEnter={handleFinishRename}
                                    style={{ width: 100, fontSize: 12 }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <>
                                    <span style={{ color: getStatusColor(tab.status), flexShrink: 0 }}>
                                        {getStatusIcon(tab.status)}
                                    </span>
                                    <span style={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        flex: 1,
                                    }}>
                                        {tab.name}
                                    </span>
                                    {tab.isModified && (
                                        <span style={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            background: '#fa8c16',
                                            flexShrink: 0,
                                        }} />
                                    )}
                                    {tabs.length > 1 && (
                                        <Tooltip title="关闭">
                                            <Button
                                                type="text"
                                                size="small"
                                                icon={<CloseOutlined />}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onClose(tab.id);
                                                }}
                                                style={{
                                                    width: 18,
                                                    height: 18,
                                                    minWidth: 18,
                                                    padding: 0,
                                                    color: '#8c8c8c',
                                                    flexShrink: 0,
                                                }}
                                            />
                                        </Tooltip>
                                    )}
                                </>
                            )}
                        </div>
                    </Dropdown>
                );
            })}

            {showNewDropdown && newDropdownItems && newDropdownItems.length > 0 ? (
                <Dropdown
                    menu={{
                        items: newDropdownItems,
                        onClick: ({ key }) => onNewDropdownSelect?.(key),
                    }}
                    trigger={['click']}
                    placement="bottomLeft"
                >
                    <Tooltip title={newButtonTooltip}>
                        <Button
                            type="text"
                            size="small"
                            icon={<PlusOutlined />}
                            style={{
                                width: 28,
                                height: 28,
                                marginBottom: 1,
                                color: '#646a73',
                                flexShrink: 0,
                            }}
                        />
                    </Tooltip>
                </Dropdown>
            ) : onNew ? (
                <Tooltip title={newButtonTooltip}>
                    <Button
                        type="text"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={onNew}
                        style={{
                            width: 28,
                            height: 28,
                            marginBottom: 1,
                            color: '#646a73',
                            flexShrink: 0,
                        }}
                    />
                </Tooltip>
            ) : null}
        </div>
    );
};

export default WorkbenchTabs;
