import React from 'react';
import { Button, Divider, Space, Tag, Tooltip } from 'antd';
import {
    CloudUploadOutlined,
    FormatPainterOutlined,
    PlayCircleOutlined,
    ReloadOutlined,
    SaveOutlined,
    ShareAltOutlined,
} from '@ant-design/icons';
import { JobDTO } from '@/api/DataworksApi.ts';

interface DataWorkToolbarProps {
    task: JobDTO;
    saving: boolean;
    executing: boolean;
    publishing: boolean;
    onExecute: () => void;
    onSave: () => void;
    onFormat: () => void;
    onResetResult: () => void;
    onPublish: () => void;
}

const statusMeta: Record<JobDTO['status'], { color: string; text: string }> = {
    DRAFT: { color: 'gold', text: '开发中' },
    ONLINE: { color: 'green', text: '已发布' },
    OFFLINE: { color: 'default', text: '已下线' },
};

/**
 * 数据加工工作台顶部操作栏。
 */
const DataWorkToolbar: React.FC<DataWorkToolbarProps> = ({
    task,
    saving,
    executing,
    publishing,
    onExecute,
    onSave,
    onFormat,
    onResetResult,
    onPublish,
}) => {
    const currentStatus = statusMeta[task.status] || statusMeta.DRAFT;
    return (
        <div style={{
            height: 44,
            background: '#fff',
            borderBottom: '1px solid #edf0f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            gap: 12,
            flexShrink: 0,
        }}>
            <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                    fontWeight: 600,
                    fontSize: 13,
                    color: '#1f2329',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 260,
                }}>
                    {task.name || '未命名任务'}
                </span>
                <Tag color={task.engineType === 'SPARK' ? 'blue' : 'purple'} style={{ marginInlineEnd: 0 }}>
                    {task.engineType === 'SPARK' ? 'SparkSQL' : 'FlinkSQL'}
                </Tag>
                <Tag color={currentStatus.color} style={{ marginInlineEnd: 0 }}>
                    {currentStatus.text}
                </Tag>
                {!task.id && <Tag color="orange" style={{ marginInlineEnd: 0 }}>未保存</Tag>}
            </div>
            <Space size={6} wrap={false}>
                <Tooltip title="临时运行当前 SQL">
                    <Button type="primary" icon={<PlayCircleOutlined />} loading={executing} onClick={onExecute}>
                        运行
                    </Button>
                </Tooltip>
                <Button icon={<SaveOutlined />} loading={saving} onClick={onSave}>
                    保存
                </Button>
                <Button icon={<FormatPainterOutlined />} onClick={onFormat}>
                    格式化
                </Button>
                <Button icon={<ReloadOutlined />} onClick={onResetResult}>
                    清空结果
                </Button>
                <Divider type="vertical" />
                <Button
                    icon={<CloudUploadOutlined />}
                    loading={publishing}
                    onClick={onPublish}
                    disabled={!task.id || task.status === 'ONLINE'}
                >
                    发布
                </Button>
                <Button icon={<ShareAltOutlined />} disabled={!task.id}>
                    分享
                </Button>
            </Space>
        </div>
    );
};

export default DataWorkToolbar;
