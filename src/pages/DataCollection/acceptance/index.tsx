import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Space, Tag, message, Typography, Modal, Form, Input, Select,
} from 'antd';
import { PlusOutlined, EyeOutlined, PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import {
  acceptanceApi, TrackingAcceptanceTaskDTO,
} from '@/api/DataCollectionApi';
import { ApiResponse } from '@/api/Response';

const { Title } = Typography;
const { Option } = Select;

const statusTagMap: Record<string, { color: string; label: string }> = {
  PENDING: { color: 'default', label: '待处理' },
  RUNNING: { color: 'blue', label: '执行中' },
  PASS: { color: 'success', label: '通过' },
  FAIL: { color: 'error', label: '失败' },
};

const AcceptancePage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<TrackingAcceptanceTaskDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await acceptanceApi.page({ pageNo: 1, pageSize: 100 }) as unknown as ApiResponse<{
        records: TrackingAcceptanceTaskDTO[];
        total: number;
      }>;
      if (res.code === 200 && res.data) {
        setData(res.data.records || []);
      }
    } catch {
      message.error('获取验收任务失败');
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
      await acceptanceApi.create(values);
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

  const handleRun = async (id: string) => {
    try {
      await acceptanceApi.run(id);
      message.success('验收执行成功');
      await fetchData();
    } catch {
      message.error('验收执行失败');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await acceptanceApi.approve(id);
      message.success('验收已通过');
      await fetchData();
    } catch {
      message.error('操作失败');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await acceptanceApi.reject(id);
      message.success('验收已驳回');
      await fetchData();
    } catch {
      message.error('操作失败');
    }
  };

  const columns = [
    { title: '任务编号', dataIndex: 'taskCode', key: 'taskCode' },
    { title: '方案ID', dataIndex: 'planId', key: 'planId' },
    { title: 'DebugToken', dataIndex: 'debugToken', key: 'debugToken' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => <Tag color={statusTagMap[v]?.color}>{statusTagMap[v]?.label}</Tag>,
    },
    { title: '事件覆盖率', dataIndex: 'eventCoverageRate', key: 'eventCoverageRate', render: (v: number) => v !== undefined ? `${(v * 100).toFixed(2)}%` : '-' },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt' },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: TrackingAcceptanceTaskDTO) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/data-collection/acceptance/${record.id}`)}>详情</Button>
          <Button type="link" size="small" icon={<PlayCircleOutlined />} onClick={() => handleRun(record.id)}>执行</Button>
          <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => handleApprove(record.id)}>通过</Button>
          <Button type="link" size="small" danger icon={<CloseCircleOutlined />} onClick={() => handleReject(record.id)}>驳回</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 8px' }}>
      <Title level={4} style={{ marginBottom: 16 }}>验收中心</Title>
      <Card style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>创建验收任务</Button>
      </Card>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        size="small"
      />
      <Modal title="创建验收任务" open={modalVisible} onOk={handleCreate} onCancel={() => { setModalVisible(false); form.resetFields(); }}>
        <Form form={form} layout="vertical">
          <Form.Item name="planId" label="方案ID" rules={[{ required: true }]}>
            <Input placeholder="请输入方案ID" />
          </Form.Item>
          <Form.Item name="debugToken" label="Debug Token" rules={[{ required: true }]}>
            <Input placeholder="请输入 Debug Token" />
          </Form.Item>
          <Form.Item name="environment" label="环境">
            <Select placeholder="请选择环境" allowClear>
              <Option value="DEV">DEV</Option>
              <Option value="TEST">TEST</Option>
              <Option value="STAGING">STAGING</Option>
              <Option value="PROD">PROD</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AcceptancePage;
