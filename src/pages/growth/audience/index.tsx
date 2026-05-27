import React, { useEffect, useState } from 'react';
import { Button, Descriptions, Drawer, Input, Space, Table, Tag, message } from 'antd';
import { ReloadOutlined, SyncOutlined } from '@ant-design/icons';
import { AudienceDTO, MetricAudienceSelectionCmd, audienceApi } from '@/api/GrowthApi';

const statusColor: Record<string, string> = {
    DRAFT: 'default',
    READY: 'success',
    FAILED: 'error',
    RUNNING: 'processing',
    SUCCESS: 'success',
};

const parseSelection = (ruleJson?: string): Partial<MetricAudienceSelectionCmd> => {
    if (!ruleJson) {
        return {};
    }
    try {
        return JSON.parse(ruleJson) as MetricAudienceSelectionCmd;
    } catch {
        return {};
    }
};

const entityLabel = (record: AudienceDTO) => {
    const selection = parseSelection(record.ruleJson);
    return `${record.entityType || selection.entityType || 'USER'} / ${record.entityIdDimCode || selection.entityIdDimCode || '-'}`;
};

const AudiencePage: React.FC = () => {
    const [keyword, setKeyword] = useState('');
    const [data, setData] = useState<AudienceDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [detail, setDetail] = useState<AudienceDTO>();

    const loadData = async (nextKeyword = keyword) => {
        setLoading(true);
        try {
            const res = await audienceApi.list({ keyword: nextKeyword || undefined });
            setData(res.data || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleRun = async (id: string) => {
        await audienceApi.run(id);
        message.success('任务已提交');
        loadData();
    };

    const columns = [
        { title: '名称', dataIndex: 'audienceName', key: 'audienceName' },
        { title: '实体', dataIndex: 'entityType', key: 'entityType', render: (_: string, record: AudienceDTO) => entityLabel(record) },
        { title: '状态', dataIndex: 'status', key: 'status', render: (value: string) => <Tag color={statusColor[value] || 'default'}>{value}</Tag> },
        { title: '人数', dataIndex: 'latestCount', key: 'latestCount', render: (value: number) => value ?? '-' },
        { title: '快照', dataIndex: 'latestSnapshotId', key: 'latestSnapshotId', render: (value: string) => value || '-' },
        { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt' },
        {
            title: '操作',
            key: 'action',
            width: 180,
            render: (_: unknown, record: AudienceDTO) => (
                <Space>
                    <Button type="link" onClick={() => setDetail(record)}>详情</Button>
                    <Button type="link" icon={<SyncOutlined />} onClick={() => handleRun(record.id)}>运行</Button>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Space>
                <Input.Search placeholder="搜索人群包" value={keyword} onChange={(event) => setKeyword(event.target.value)} onSearch={loadData} allowClear style={{ width: 260 }} />
                <Button icon={<ReloadOutlined />} onClick={() => loadData()}>刷新</Button>
            </Space>
            <Table rowKey="id" loading={loading} columns={columns} dataSource={data} />
            <Drawer title="人群包详情" width={720} open={!!detail} onClose={() => setDetail(undefined)}>
                {detail && (
                    <Descriptions bordered column={1} size="small">
                        <Descriptions.Item label="名称">{detail.audienceName}</Descriptions.Item>
                        <Descriptions.Item label="实体">{entityLabel(detail)}</Descriptions.Item>
                        <Descriptions.Item label="实体ID字段">{detail.entityIdColumn || parseSelection(detail.ruleJson).entityIdColumn || '-'}</Descriptions.Item>
                        <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
                        <Descriptions.Item label="人数">{detail.latestCount ?? '-'}</Descriptions.Item>
                        <Descriptions.Item label="快照">{detail.latestSnapshotId || '-'}</Descriptions.Item>
                        <Descriptions.Item label="任务">{detail.latestTask?.status || '-'}</Descriptions.Item>
                        <Descriptions.Item label="失败原因">{detail.latestTask?.errorMessage || '-'}</Descriptions.Item>
                        <Descriptions.Item label="规则">
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{detail.ruleJson || '-'}</pre>
                        </Descriptions.Item>
                    </Descriptions>
                )}
            </Drawer>
        </div>
    );
};

export default AudiencePage;
