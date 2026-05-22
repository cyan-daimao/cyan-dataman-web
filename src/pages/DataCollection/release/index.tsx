import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Space, Tag, message, Typography,
} from 'antd';
import { PlusOutlined, EyeOutlined, CloudUploadOutlined } from '@ant-design/icons';
import {
  releaseApi, TrackingReleaseDTO,
} from '@/api/DataCollectionApi';
import { ApiResponse } from '@/api/Response';

const { Title } = Typography;

const statusTagMap: Record<string, { color: string; label: string }> = {
  DRAFT: { color: 'default', label: '草稿' },
  SUBMITTED: { color: 'blue', label: '已提交' },
  PUBLISHED: { color: 'success', label: '已发布' },
  CANCELED: { color: 'error', label: '已取消' },
};

const ReleasePage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<TrackingReleaseDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await releaseApi.page({ pageNo: 1, pageSize: 100 }) as unknown as ApiResponse<{
        records: TrackingReleaseDTO[];
        total: number;
      }>;
      if (res.code === 200 && res.data) {
        setData(res.data.records || []);
      }
    } catch {
      message.error('获取发布版本失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePublish = async (id: string) => {
    try {
      await releaseApi.publish(id);
      message.success('发布成功');
      await fetchData();
    } catch {
      message.error('发布失败');
    }
  };

  const columns = [
    { title: '发布编号', dataIndex: 'releaseCode', key: 'releaseCode' },
    { title: '方案ID', dataIndex: 'planId', key: 'planId' },
    { title: '版本', dataIndex: 'version', key: 'version', render: (v: number) => `V${v}` },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => <Tag color={statusTagMap[v]?.color}>{statusTagMap[v]?.label}</Tag>,
    },
    { title: '发布时间', dataIndex: 'publishedAt', key: 'publishedAt', render: (v: string) => v || '-' },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt' },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: TrackingReleaseDTO) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/data-collection/release/${record.id}`)}>详情</Button>
          {record.status === 'DRAFT' && (
            <Button type="link" size="small" icon={<CloudUploadOutlined />} onClick={() => handlePublish(record.id)}>发布</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 8px' }}>
      <Title level={4} style={{ marginBottom: 16 }}>发布中心</Title>
      <Card style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { /* TODO: create release modal */ }}>创建发布版本</Button>
      </Card>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        size="small"
      />
    </div>
  );
};

export default ReleasePage;
