import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Space, Tag, message, Typography, Modal, Form, Select,
} from 'antd';
import { PlusOutlined, EyeOutlined, CloudUploadOutlined } from '@ant-design/icons';
import {
  releaseApi, planApi, TrackingReleaseDTO,
} from '@/api/DataCollectionApi';
import { ApiResponse } from '@/api/Response';

const { Title } = Typography;

const statusTagMap: Record<string, { color: string; label: string }> = {
  DRAFT: { color: 'default', label: '草稿' },
  SUBMITTED: { color: 'blue', label: '已提交' },
  PUBLISHED: { color: 'success', label: '已发布' },
  ROLLED_BACK: { color: 'warning', label: '已回滚' },
  CANCELED: { color: 'error', label: '已取消' },
};

interface SelectOption {
  label: string;
  value: string;
}

const ReleasePage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<TrackingReleaseDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [planOptions, setPlanOptions] = useState<SelectOption[]>([]);
  const [form] = Form.useForm();

  const fetchPlanOptions = async () => {
    try {
      const res = await planApi.page({ pageNo: 1, pageSize: 100 }) as unknown as ApiResponse<{
        records: { id: string; planCode: string; planName: string }[];
      }>;
      if (res.code === 200 && res.data) {
        setPlanOptions(res.data.records.map(p => ({
          label: `${p.planCode} - ${p.planName}`,
          value: p.id,
        })));
      }
    } catch {
      // ignore
    }
  };

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

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await releaseApi.create({ planId: values.planId });
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
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>创建发布版本</Button>
      </Card>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        size="small"
      />
      <Modal title="创建发布版本" open={modalVisible} onOk={handleCreate} onCancel={() => { setModalVisible(false); form.resetFields(); }}
        afterOpenChange={(open) => {
          if (open) fetchPlanOptions();
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="planId" label="方案" rules={[{ required: true }]}>
            <Select placeholder="请选择方案" options={planOptions} showSearch optionFilterProp="label" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ReleasePage;
