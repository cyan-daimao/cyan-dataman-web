import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Spin, Empty, Button, Typography, Table,
} from 'antd';
import { ArrowLeftOutlined, CloudUploadOutlined } from '@ant-design/icons';
import {
  releaseApi, TrackingReleaseDTO, TrackingReleaseItemDTO,
} from '@/api/DataCollectionApi';
import { ApiResponse } from '@/api/Response';

const { Title } = Typography;

const statusTagMap: Record<string, { color: string; label: string }> = {
  DRAFT: { color: 'default', label: '草稿' },
  SUBMITTED: { color: 'blue', label: '已提交' },
  PUBLISHED: { color: 'success', label: '已发布' },
  CANCELED: { color: 'error', label: '已取消' },
};

const ReleaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<TrackingReleaseDTO | null>(null);
  const [items, setItems] = useState<TrackingReleaseItemDTO[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      releaseApi.getById(id) as unknown as ApiResponse<TrackingReleaseDTO>,
      releaseApi.getDiff(id) as unknown as ApiResponse<TrackingReleaseItemDTO[]>,
    ])
      .then(([detailRes, diffRes]) => {
        if (detailRes.code === 200 && detailRes.data) {
          setDetail(detailRes.data);
        }
        if (diffRes.code === 200 && diffRes.data) {
          setItems(diffRes.data);
        }
      })
      .catch(() => { /* handled by interceptor */ })
      .finally(() => setLoading(false));
  }, [id]);

  const handlePublish = async () => {
    if (!id) return;
    try {
      await releaseApi.publish(id);
      const res = await releaseApi.getById(id) as unknown as ApiResponse<TrackingReleaseDTO>;
      if (res.code === 200 && res.data) {
        setDetail(res.data);
      }
    } catch {
      /* handled by interceptor */
    }
  };

  const itemColumns = [
    { title: '类型', dataIndex: 'itemType', key: 'itemType' },
    { title: '对象编码', dataIndex: 'itemCode', key: 'itemCode' },
    { title: '变更类型', dataIndex: 'changeType', key: 'changeType', render: (v: string) => <Tag>{v}</Tag> },
    { title: '快照', dataIndex: 'snapshot', key: 'snapshot', render: (v: string) => <pre style={{ maxHeight: 120, overflow: 'auto', fontSize: 12 }}>{v}</pre> },
  ];

  if (!id) {
    return <Empty description="缺少发布 ID" />;
  }

  return (
    <div style={{ padding: '0 8px' }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/data-collection/release')} style={{ marginBottom: 16 }}>
        返回列表
      </Button>
      <Title level={4} style={{ marginBottom: 16 }}>发布版本详情</Title>

      <Spin spinning={loading}>
        {detail ? (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Descriptions column={2}>
                <Descriptions.Item label="发布编号">{detail.releaseCode}</Descriptions.Item>
                <Descriptions.Item label="方案ID">{detail.planId}</Descriptions.Item>
                <Descriptions.Item label="版本">V{detail.version}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={statusTagMap[detail.status]?.color}>{statusTagMap[detail.status]?.label}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="发布时间">{detail.publishedAt || '-'}</Descriptions.Item>
                <Descriptions.Item label="创建时间">{detail.createdAt}</Descriptions.Item>
                <Descriptions.Item label="变更摘要" span={2}>{detail.diffSummary || '-'}</Descriptions.Item>
              </Descriptions>
              {detail.status === 'DRAFT' && (
                <Button type="primary" icon={<CloudUploadOutlined />} onClick={handlePublish} style={{ marginTop: 16 }}>
                  发布上线
                </Button>
              )}
            </Card>

            <Card title="发布明细">
              <Table
                rowKey="id"
                columns={itemColumns}
                dataSource={items}
                size="small"
              />
            </Card>
          </>
        ) : (
          <Empty description="未找到发布详情" />
        )}
      </Spin>
    </div>
  );
};

export default ReleaseDetailPage;
