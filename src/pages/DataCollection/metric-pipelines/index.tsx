import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Space, Tag, message, Typography, Modal, Form, Input,
} from 'antd';
import { PlusOutlined, EyeOutlined, PlayCircleOutlined, RocketOutlined } from '@ant-design/icons';
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

const MetricPipelinePage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<TrackingMetricPipelineDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await metricPipelineApi.page({ pageNo: 1, pageSize: 100 }) as unknown as ApiResponse<{
        list: TrackingMetricPipelineDTO[];
        records: TrackingMetricPipelineDTO[];
        total: number;
      }>;
      if (res.code === 200 && res.data) {
        setData(res.data.list || res.data.records || []);
      }
    } catch {
      message.error('获取采集指标链路失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await metricPipelineApi.create({
        metricCode: values.metricCode,
        metricName: values.metricName,
        eventCode: values.eventCode,
        appCode: values.appCode,
        dimensions: ['module_code', 'module_name', 'route_path'],
        measures: [
          { name: 'click_count', expr: 'COUNT(*)' },
          { name: 'user_count', expr: 'COUNT(DISTINCT user_id)' },
        ],
      });
      message.success('创建成功');
      setModalVisible(false);
      form.resetFields();
      await fetchData();
    } catch (err) {
      if (err instanceof Error && err.message) {
        message.error(err.message);
      }
    }
  };

  const handleProvision = async (id: string) => {
    try {
      await metricPipelineApi.provision(id);
      message.success('创建表成功');
      await fetchData();
    } catch {
      message.error('创建表失败');
    }
  };

  const handleStart = async (id: string) => {
    try {
      await metricPipelineApi.start(id);
      message.success('启动成功');
      await fetchData();
    } catch {
      message.error('启动失败');
    }
  };

  const columns = [
    { title: '指标编码', dataIndex: 'metricCode', key: 'metricCode' },
    { title: '指标名称', dataIndex: 'metricName', key: 'metricName' },
    { title: '事件编码', dataIndex: 'eventCode', key: 'eventCode' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => <Tag color={statusTagMap[v]?.color}>{statusTagMap[v]?.label}</Tag>,
    },
    { title: 'DataWorks Job', dataIndex: 'dataworksJobId', key: 'dataworksJobId', render: (v: string) => v || '-' },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt' },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: TrackingMetricPipelineDTO) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/data-collection/metric-pipelines/${record.id}`)}>详情</Button>
          {(record.status === 'DRAFT' || record.status === 'FAILED') && (
            <Button type="link" size="small" icon={<PlayCircleOutlined />} onClick={() => handleProvision(record.id)}>创建表和链路</Button>
          )}
          {record.status === 'TABLE_CREATED' && (
            <Button type="link" size="small" icon={<RocketOutlined />} onClick={() => handleStart(record.id)}>启动任务</Button>
          )}
          {record.status === 'FAILED' && (
            <Button type="link" size="small" danger onClick={() => handleStart(record.id)}>重试</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 8px' }}>
      <Title level={4} style={{ marginBottom: 16 }}>采集指标链路</Title>
      <Card style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>创建采集指标链路</Button>
      </Card>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        size="small"
      />
      <Modal title="创建采集指标链路" open={modalVisible} onOk={handleCreate} onCancel={() => { setModalVisible(false); form.resetFields(); }}>
        <Form form={form} layout="vertical">
          <Form.Item name="metricCode" label="指标编码" rules={[{ required: true }]}>
            <Input placeholder="如 module_click" />
          </Form.Item>
          <Form.Item name="metricName" label="指标名称" rules={[{ required: true }]}>
            <Input placeholder="如 模块点击次数" />
          </Form.Item>
          <Form.Item name="eventCode" label="事件编码" rules={[{ required: true }]}>
            <Input placeholder="如 module_click" />
          </Form.Item>
          <Form.Item name="appCode" label="应用编码">
            <Input placeholder="如 dataman_web" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MetricPipelinePage;
