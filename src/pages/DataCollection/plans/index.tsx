import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Space, message, Empty, Modal, Form, Input, Select, Tag, Typography,
} from 'antd';
import {
  PlusOutlined, EditOutlined, EyeOutlined, RocketOutlined,
} from '@ant-design/icons';
import {
  planApi, TrackingPlanDTO, TrackingPlanSaveRequest,
} from '@/api/DataCollectionApi';
import { ApiResponse } from '@/api/Response';

const { Title } = Typography;
const { Option } = Select;

interface PageResult<T> {
  list?: T[];
  records?: T[];
  total: number;
  pageNum?: number;
  pageNo?: number;
  pageSize: number;
}

const statusTagMap: Record<string, { color: string; label: string }> = {
  DRAFT: { color: 'default', label: '草稿' },
  REVIEWING: { color: 'orange', label: '评审中' },
  DEVELOPING: { color: 'cyan', label: '开发中' },
  ACCEPTING: { color: 'purple', label: '验收中' },
  RELEASING: { color: 'gold', label: '发布中' },
  PUBLISHED: { color: 'success', label: '已发布' },
  CLOSED: { color: 'error', label: '已关闭' },
};

const PlanListPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<TrackingPlanDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState<{
    planName?: string;
    status?: string;
  }>({});

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('新建方案');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(async (page = 1, query = filters) => {
    setLoading(true);
    try {
      const res = await planApi.page({
        pageNo: page,
        pageSize,
        ...query,
      }) as unknown as ApiResponse<PageResult<TrackingPlanDTO>>;
      if (res.code === 200 && res.data) {
        setData(res.data.list || res.data.records || []);
        setTotal(res.data.total || 0);
        setPageNo(res.data.pageNum || res.data.pageNo || page);
      }
    } catch {
      message.error('获取方案列表失败');
    } finally {
      setLoading(false);
    }
  }, [filters, pageSize]);

  useEffect(() => {
    fetchList(1);
  }, [fetchList]);

  const handleFilterChange = (changed: Partial<typeof filters>) => {
    const next = { ...filters, ...changed };
    setFilters(next);
    setPageNo(1);
    fetchList(1, next);
  };

  const openCreateModal = () => {
    setModalTitle('新建方案');
    setEditingId(null);
    form.resetFields();
    setModalVisible(true);
  };

  const openEditModal = (record: TrackingPlanDTO) => {
    setModalTitle('编辑方案');
    setEditingId(record.id);
    form.setFieldsValue({
      planName: record.planName,
      description: record.description,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload: TrackingPlanSaveRequest = { ...values };
      setSaving(true);
      if (editingId) {
        await planApi.update(editingId, payload);
        message.success('更新成功');
      } else {
        await planApi.create(payload);
        message.success('创建成功');
      }
      setModalVisible(false);
      form.resetFields();
      fetchList(pageNo);
    } catch (err) {
      if (err instanceof Error && err.message) {
        message.error(err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitReview = async (id: string) => {
    try {
      await planApi.submitReview(id);
      message.success('提交评审成功');
      fetchList(pageNo);
    } catch {
      message.error('提交评审失败');
    }
  };

  const columns = [
    { title: '方案编号', dataIndex: 'planCode', key: 'planCode', width: 160 },
    { title: '方案名称', dataIndex: 'planName', key: 'planName', width: 180 },
    { title: '关联需求ID', dataIndex: 'demandId', key: 'demandId', width: 120 },
    { title: '版本', dataIndex: 'version', key: 'version', width: 80, render: (v: number) => `V${v}` },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string) => <Tag color={statusTagMap[v]?.color}>{statusTagMap[v]?.label}</Tag>,
    },
    { title: '评审人', dataIndex: 'reviewer', key: 'reviewer', width: 120 },
    { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 170 },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: unknown, record: TrackingPlanDTO) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>编辑</Button>
          <Button type="link" size="small" icon={<RocketOutlined />} onClick={() => handleSubmitReview(record.id)}>提交评审</Button>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/data-collection/plans/${record.id}`)}>详情</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 8px' }}>
      <Title level={4} style={{ marginBottom: 16 }}>埋点方案</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input.Search
            placeholder="方案名称"
            allowClear
            onSearch={(v) => handleFilterChange({ planName: v })}
            style={{ width: 220 }}
          />
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 140 }}
            value={filters.status}
            onChange={(v) => handleFilterChange({ status: v })}
          >
            {Object.entries(statusTagMap).map(([k, { label }]) => (
              <Option key={k} value={k}>{label}</Option>
            ))}
          </Select>
        </Space>
      </Card>

      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>新建方案</Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{
          current: pageNo,
          pageSize,
          total,
          onChange: (p) => {
            setPageNo(p);
            fetchList(p);
          },
          showTotal: (t) => `共 ${t} 条`,
        }}
        scroll={{ x: 1100 }}
        locale={{ emptyText: <Empty description="暂无方案数据" /> }}
      />

      <Modal
        title={modalTitle}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => { setModalVisible(false); form.resetFields(); }}
        width={560}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="planName" label="方案名称" rules={[{ required: true, message: '请输入方案名称' }]}>
            <Input placeholder="请输入方案名称" />
          </Form.Item>
          <Form.Item name="description" label="方案描述">
            <Input.TextArea rows={3} placeholder="请输入方案描述" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PlanListPage;
