import React from 'react';
import { Button, Dropdown, Tooltip } from 'antd';
import { CloseOutlined, CodeOutlined, FileAddOutlined, FileTextOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { JobDTO } from '@/api/DataworksApi.ts';

interface DataWorkTabItem {
    tabId: string;
    task: JobDTO;
    isModified: boolean;
}

interface DataWorkTabsProps {
    tabs: DataWorkTabItem[];
    activeTabId: string;
    onActiveChange: (tabId: string) => void;
    onClose: (tabId: string) => void;
    onCloseOthers: (tabId: string) => void;
    onNew: (nodeType?: JobDTO['nodeType']) => void;
}

const getStatusColor = (status?: JobDTO['status']) => {
    if (status === 'ONLINE') return '#52c41a';
    if (status === 'OFFLINE') return '#8c8c8c';
    return '#faad14';
};

const createNodeMenuItems = [
    {
        key: 'SPARK_SQL',
        icon: <CodeOutlined />,
        label: 'SparkSQL',
    },
    {
        key: 'FLINK_SQL',
        icon: <ThunderboltOutlined />,
        label: 'FlinkSQL',
    },
    {
        key: 'SPARK_BATCH',
        icon: <CodeOutlined />,
        label: 'Spark批任务',
    },
    {
        key: 'FLINK_BATCH',
        icon: <ThunderboltOutlined />,
        label: 'Flink批任务',
    },
    {
        key: 'SHELL',
        icon: <CodeOutlined />,
        label: 'Shell',
    },
    {
        key: 'PYTHON',
        icon: <CodeOutlined />,
        label: 'Python',
    },
];

/**
 * DataWorks 风格的文件标签栏。
 */
const DataWorkTabs: React.FC<DataWorkTabsProps> = ({
    tabs,
    activeTabId,
    onActiveChange,
    onClose,
    onCloseOthers,
    onNew,
}) => {
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
                const isActive = tab.tabId === activeTabId;
                return (
                    <Dropdown
                        key={tab.tabId}
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
                                    onCloseOthers(tab.tabId);
                                }
                            },
                        }}
                    >
                        <div
                            onClick={() => onActiveChange(tab.tabId)}
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
                            <FileTextOutlined style={{ fontSize: 12, color: getStatusColor(tab.task.status), flexShrink: 0 }} />
                            <span style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1,
                            }}>
                                {tab.task.name || '未命名任务'}
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
                                            onClose(tab.tabId);
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
                        </div>
                    </Dropdown>
                );
            })}
            <Dropdown
                menu={{
                    items: createNodeMenuItems,
                    onClick: ({ key }) => onNew(key as JobDTO['nodeType']),
                }}
                trigger={['click']}
                placement="bottomLeft"
            >
                <Tooltip title="新建任务">
                    <Button
                        type="text"
                        size="small"
                        icon={<FileAddOutlined />}
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
        </div>
    );
};

export default DataWorkTabs;
