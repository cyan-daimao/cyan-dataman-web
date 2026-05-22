import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Spin, Empty, Button, Typography, Space,
} from 'antd';
import { ArrowLeftOutlined, PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import {
  acceptanceApi, TrackingAcceptanceTaskDTO,
} from '@/api/DataCollectionApi';
import { ApiResponse } from '@/api/Response';

const { Title } = Typography;

const statusTagMap: Record<string, { color: string; label: string }> = {
  PENDING: { color: 'default', label: '待处理' },
  RUNNING: { color: 'blue', label: '执行中' },
  PASS: { color: 'success', label: '通过' },
  FAIL: { color: 'error', label: '失败' },
};

const AcceptanceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<TrackingAcceptanceTaskDTO | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetail = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await acceptanceApi.getById(id) as unknown as ApiResponse<TrackingAcceptanceTaskDTO>;
      if (res.code === 200 && res.data) {
        setDetail(res.data);
      }
    } catch {
      /* message handled by interceptor */
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleRun = async () => {
    if (!id) return;
    try {
      await acceptanceApi.run(id);
      await fetchDetail();
    } catch {
      /* handled by interceptor */
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    try {
      await acceptanceApi.approve(id);
      await fetchDetail();
    } catch {
      /* handled by interceptor */
    }
  };

  const handleReject = async () => {
    if (!id) return;
    try {
      await acceptanceApi.reject(id);
      await fetchDetail();
    } catch {
      /* handled by interceptor */
    }
  };

  if (!id) {
    return <Empty description="缺少任务 ID" />;
  }

  return (
    <div style={{ padding: '0 8px' }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/data-collection/acceptance')} style={{ marginBottom: 16 }}>
        返回列表
      </Button>
      <Title level={4} style={{ marginBottom: 16 }}>验收任务详情</Title>

      <Spin spinning={loading}>
        {detail ? (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Descriptions column={2}>
                <Descriptions.Item label="任务编号">{detail.taskCode}</Descriptions.Item>
                <Descriptions.Item label="方案ID">{detail.planId}</Descriptions.Item>
                <Descriptions.Item label="Debug Token">{detail.debugToken}</Descriptions.Item>
                <Descriptions.Item label="环境">{detail.environment || '-'}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={statusTagMap[detail.status]?.color}>{statusTagMap[detail.status]?.label}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="事件覆盖率">{detail.eventCoverageRate !== undefined ? `${(detail.eventCoverageRate * 100).toFixed(2)}%` : '-'}</Descriptions.Item>
                <Descriptions.Item label="必填属性完整率">{detail.requiredPropertyCompleteRate !== undefined ? `${(detail.requiredPropertyCompleteRate * 100).toFixed(2)}%` : '-'}</Descriptions.Item>
                <Descriptions.Item label="类型正确率">{detail.typeValidRate !== undefined ? `${(detail.typeValidRate * 100).toFixed(2)}%` : '-'}</Descriptions.Item>
                <Descriptions.Item label="结果摘要" span={2}>{detail.resultSummary || '-'}</Descriptions.Item>
                <Descriptions.Item label="创建时间">{detail.createdAt}</Descriptions.Item>
                <Descriptions.Item label="更新时间">{detail.updatedAt}</Descriptions.Item>
              </Descriptions>
              <Space style={{ marginTop: 16 }}>
                <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleRun}>执行验收</Button>
                <Button icon={<CheckCircleOutlined />} onClick={handleApprove}>验收通过</Button>
                <Button danger icon={<CloseCircleOutlined />} onClick={handleReject}>验收驳回</Button>
              </Space>
            </Card>
          </>
        ) : (
          <Empty description="未找到任务详情" />
        )}
      </Spin>
    </div>
  );
};

export default AcceptanceDetailPage;
