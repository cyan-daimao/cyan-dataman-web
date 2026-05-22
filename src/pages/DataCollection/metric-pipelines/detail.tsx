import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Button, message, Steps, Typography,
} from 'antd';
import { PlayCircleOutlined, RocketOutlined, RedoOutlined } from '@ant-design/icons';
import {
  metricPipelineApi, TrackingMetricPipelineDTO,
} from '@/api/DataCollectionApi';
import { ApiResponse } from '@/api/Response';

const { Title } = Typography;

const statusTagMap: Record<string, { color: string; label: string }> = {
  DRAFT: { color: 'default', label: '草稿' },
  TABLE_CREATED: { color: 'blue', label: '表已创建' },
  JOB_CREATED: { color: 'purple', label: '作业已创建' },
  RUNNING: { color: 'success', label: '运行中' },
  FAILED: { color: 'error', label: '失败' },
};

interface PipelineNode {
  type: string;
  name: string;
  resourceName: string;
}

const MetricPipelineDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<TrackingMetricPipelineDTO | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await metricPipelineApi.getById(id) as unknown as ApiResponse<TrackingMetricPipelineDTO>;
      if (res.code === 200 && res.data) {
        setData(res.data);
      }
    } catch {
      message.error('获取详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleProvision = async () => {
    if (!id) return;
    try {
      await metricPipelineApi.provision(id);
      message.success('创建表成功');
      await fetchData();
    } catch {
      message.error('创建表失败');
    }
  };

  const handleStart = async () => {
    if (!id) return;
    try {
      await metricPipelineApi.start(id);
      message.success('启动成功');
      await fetchData();
    } catch {
      message.error('启动失败');
    }
  };

  if (!data) {
    return <div>加载中...</div>;
  }

  const nodes: PipelineNode[] = [
    { type: 'KAFKA', name: '原始事件 Topic', resourceName: data.topicName },
    { type: 'ODS', name: 'ODS 原始事件表', resourceName: `ods.${data.odsTableName}` },
    { type: 'DWD', name: 'DWD 明细事件表', resourceName: `dwd.${data.dwdTableName}` },
    { type: 'DWS', name: 'DWS 汇总指标表', resourceName: `dws.${data.dwsTableName}` },
    { type: 'ADS', name: 'ADS 应用指标表', resourceName: `ads.${data.adsTableName}` },
  ];

  const currentStep = data.status === 'DRAFT' ? 0
    : data.status === 'TABLE_CREATED' ? 1
    : data.status === 'JOB_CREATED' ? 2
    : data.status === 'RUNNING' ? 4
    : data.status === 'FAILED' ? 0
    : 0;

  return (
    <div style={{ padding: '0 8px' }}>
      <Title level={4} style={{ marginBottom: 16 }}>采集指标链路详情</Title>

      <Card style={{ marginBottom: 16 }} loading={loading}>
        <Descriptions title="基本信息" bordered size="small" column={2}>
          <Descriptions.Item label="指标编码">{data.metricCode}</Descriptions.Item>
          <Descriptions.Item label="指标名称">{data.metricName}</Descriptions.Item>
          <Descriptions.Item label="事件编码">{data.eventCode}</Descriptions.Item>
          <Descriptions.Item label="应用编码">{data.appCode || '-'}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={statusTagMap[data.status]?.color}>{statusTagMap[data.status]?.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="DataWorks Job">{data.dataworksJobId || '-'}</Descriptions.Item>
          <Descriptions.Item label="DataWorks Instance">{data.dataworksInstanceId || '-'}</Descriptions.Item>
          <Descriptions.Item label="Flink Deployment">{data.flinkDeploymentName || '-'}</Descriptions.Item>
          {data.errorMessage && (
            <Descriptions.Item label="错误信息" span={2}>
              <Tag color="error">{data.errorMessage}</Tag>
            </Descriptions.Item>
          )}
        </Descriptions>

        <div style={{ marginTop: 16 }}>
          {(data.status === 'DRAFT' || data.status === 'FAILED') && (
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleProvision}>创建表和链路</Button>
          )}
          {data.status === 'TABLE_CREATED' && (
            <Button type="primary" icon={<RocketOutlined />} onClick={handleStart}>启动任务</Button>
          )}
          {data.status === 'FAILED' && (
            <Button style={{ marginLeft: 8 }} icon={<RedoOutlined />} onClick={handleStart}>重试</Button>
          )}
        </div>
      </Card>

      <Card title="链路节点" style={{ marginBottom: 16 }}>
        <Steps
          direction="vertical"
          current={currentStep}
          items={nodes.map(node => ({
            title: node.name,
            description: node.resourceName,
          }))}
        />
      </Card>
    </div>
  );
};

export default MetricPipelineDetailPage;
