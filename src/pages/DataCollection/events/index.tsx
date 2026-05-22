import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Space, message, Empty, Modal, Form, Input, Select, Tag, Typography, Popconfirm,
} from 'antd';
import {
  PlusOutlined, EditOutlined, EyeOutlined, RocketOutlined, CopyOutlined,
  StopOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import {
  eventApi, TrackingEventDTO, TrackingEventSaveRequest,
} from '@/api/DataCollectionApi';
import EmployeeSelect from '@/component/employee/EmployeeSelect';
import { ApiResponse } from '@/api/Response';

const { Title } = Typography;
const { Option } = Select;

interface PageResult<T> {
  records: T[];
  total: number;
  pageNo: number;
  pageSize: number;
}

const statusTagMap: Record<string, { color: string; label: string }> = {
  DRAFT: { color: 'default', label: '草稿' },
  PUBLISHED: { color: 'success', label: '已发布' },
  DEPRECATED: { color: 'error', label: '已废弃' },
};

const eventTypeMap: Record<string, string> = {
  PAGE: '页面',
  CLICK: '点击',
  TRANSACTION: '交易',
  CUSTOM: '自定义',
};

const businessDomains = ['trade', 'user', 'product', 'marketing', 'finance', 'operations'];

const EventListPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<TrackingEventDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState<{
    eventCode?: string;
    eventName?: string;
    eventType?: string;
    businessDomain?: string;
    status?: string;
    isCore?: boolean;
    owner?: string;
  }>({});

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('新建事件');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(async (page = 1, query = filters) => {
    setLoading(true);
    try {
      const res = await eventApi.page({
        pageNo: page,
        pageSize,
        ...query,
      }) as unknown as ApiResponse<PageResult<TrackingEventDTO>>;
      if (res.code === 200 && res.data) {
        setData(res.data.records || []);
        setTotal(res.data.total);
        setPageNo(res.data.pageNo);
      }
    } catch {
      message.error('获取事件列表失败');
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
    setModalTitle('新建事件');
    setEditingId(null);
    form.resetFields();
    setModalVisible(true);
  };

  const openEditModal = (record: TrackingEventDTO) => {
    setModalTitle('编辑事件');
    setEditingId(record.id);
    form.setFieldsValue({
      eventCode: record.eventCode,
      eventName: record.eventName,
      eventType: record.eventType,
      businessDomain: record.businessDomain,
      description: record.description,
      triggerTiming: record.triggerTiming,
      terminalTypes: record.terminalTypes,
      owner: record.owner,
      isCore: record.isCore,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload: TrackingEventSaveRequest = { ...values };
      setSaving(true);
      if (editingId) {
        await eventApi.update(editingId, payload);
        message.success('更新成功');
      } else {
        await eventApi.create(payload);
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

  const handlePublish = async (id: string) => {
    try {
      await eventApi.publish(id);
      message.success('发布成功');
      fetchList(pageNo);
    } catch {
      message.error('发布失败');
    }
  };

  const handleDeprecate = async (id: string) => {
    try {
      await eventApi.deprecate(id);
      message.success('废弃成功');
      fetchList(pageNo);
    } catch {
      message.error('废弃失败');
    }
  };

  const handleCopy = (record: TrackingEventDTO) => {
    form.setFieldsValue({
      eventCode: `${record.eventCode}_copy`,
      eventName: `${record.eventName}_复制`,
      eventType: record.eventType,
      businessDomain: record.businessDomain,
      description: record.description,
      triggerTiming: record.triggerTiming,
      terminalTypes: record.terminalTypes,
      owner: record.owner,
      isCore: record.isCore,
    });
    setModalTitle('复制事件');
    setEditingId(null);
    setModalVisible(true);
  };

  const handleViewUsage = (id: string) => {
    eventApi.usage(id)
      .then((res) => {
        const r = res as unknown as ApiResponse<unknown>;
        if (r.code === 200) {
          Modal.info({ title: '使用情况', content: <pre>{JSON.stringify(r.data, null, 2)}</pre>, width: 600 });
        }
      })
      .catch(() => message.error('获取使用情况失败'));
  };

  const terminalTypeMap: Record<string, string> = {
    WEB: 'Web',
    IOS: 'iOS',
    ANDROID: 'Android',
    MINIPROGRAM: '小程序',
    SERVER: 'Server',
  };

  const columns = [
    { title: '事件编码', dataIndex: 'eventCode', key: 'eventCode', width: 160 },
    { title: '事件名称', dataIndex: 'eventName', key: 'eventName', width: 160 },
    {
      title: '事件类型',
      dataIndex: 'eventType',
      key: 'eventType',
      width: 100,
      render: (v: string) => eventTypeMap[v] || v,
    },
    { title: '业务域', dataIndex: 'businessDomain', key: 'businessDomain', width: 100 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string) => <Tag color={statusTagMap[v]?.color}>{statusTagMap[v]?.label}</Tag>,
    },
    {
      title: '核心事件',
      dataIndex: 'isCore',
      key: 'isCore',
      width: 90,
      render: (v: boolean) => (v ? <Tag color="red">是</Tag> : <Tag>否</Tag>),
    },
    { title: 'Owner', dataIndex: 'owner', key: 'owner', width: 120 },
    { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 170 },
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right' as const,
      render: (_: unknown, record: TrackingEventDTO) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>编辑</Button>
          <Button type="link" size="small" icon={<RocketOutlined />} onClick={() => { message.info('提交评审功能开发中'); }}>提交评审</Button>
          {record.status !== 'PUBLISHED' && (
            <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => handlePublish(record.id)}>发布</Button>
          )}
          {record.status !== 'DEPRECATED' && (
            <Popconfirm title="确认废弃该事件？" onConfirm={() => handleDeprecate(record.id)}>
              <Button type="link" size="small" danger icon={<StopOutlined />}>废弃</Button>
            </Popconfirm>
          )}
          <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => handleCopy(record)}>复制</Button>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewUsage(record.id)}>使用情况</Button>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/data-collection/events/${record.id}`)}>详情</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 8px' }}>
      <Title level={4} style={{ marginBottom: 16 }}>事件管理</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input.Search
            placeholder="事件编码"
            allowClear
            onSearch={(v) => handleFilterChange({ eventCode: v })}
            style={{ width: 180 }}
          />
          <Input.Search
            placeholder="事件名称"
            allowClear
            onSearch={(v) => handleFilterChange({ eventName: v })}
            style={{ width: 180 }}
          />
          <Select
            placeholder="事件类型"
            allowClear
            style={{ width: 140 }}
            value={filters.eventType}
            onChange={(v) => handleFilterChange({ eventType: v })}
          >
            {Object.entries(eventTypeMap).map(([k, label]) => (
              <Option key={k} value={k}>{label}</Option>
            ))}
          </Select>
          <Select
            placeholder="业务域"
            allowClear
            style={{ width: 140 }}
            value={filters.businessDomain}
            onChange={(v) => handleFilterChange({ businessDomain: v })}
          >
            {businessDomains.map((d) => (
              <Option key={d} value={d}>{d}</Option>
            ))}
          </Select>
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
          <Select
            placeholder="是否核心事件"
            allowClear
            style={{ width: 140 }}
            value={filters.isCore}
            onChange={(v) => handleFilterChange({ isCore: v })}
          >
            <Option value={true}>是</Option>
            <Option value={false}>否</Option>
          </Select>
          <Input
            placeholder="Owner"
            allowClear
            value={filters.owner}
            onChange={(e) => handleFilterChange({ owner: e.target.value })}
            style={{ width: 140 }}
          />
        </Space>
      </Card>

      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>新建事件</Button>
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
        scroll={{ x: 1300 }}
        locale={{ emptyText: <Empty description="暂无事件数据" /> }}
      />

      <Modal
        title={modalTitle}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => { setModalVisible(false); form.resetFields(); }}
        width={640}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="eventCode" label="事件编码" rules={[{ required: true, message: '请输入事件编码' }, { pattern: /^[a-z][a-z0-9_]*$/, message: '必须以字母开头，只能包含小写字母、数字、下划线' }]}>
            <Input placeholder="如: order_paid" disabled={!!editingId} />
          </Form.Item>
          <Form.Item name="eventName" label="事件名称" rules={[{ required: true, message: '请输入事件名称' }]}>
            <Input placeholder="请输入事件名称" />
          </Form.Item>
          <Form.Item name="eventType" label="事件类型" rules={[{ required: true, message: '请选择事件类型' }]}>
            <Select placeholder="请选择事件类型">
              {Object.entries(eventTypeMap).map(([k, label]) => (
                <Option key={k} value={k}>{label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="businessDomain" label="业务域" rules={[{ required: true, message: '请选择业务域' }]}>
            <Select placeholder="请选择业务域">
              {businessDomains.map((d) => (
                <Option key={d} value={d}>{d}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="description" label="事件描述">
            <Input.TextArea rows={2} placeholder="请输入事件描述" />
          </Form.Item>
          <Form.Item name="triggerTiming" label="触发时机">
            <Input placeholder="请输入触发时机" />
          </Form.Item>
          <Form.Item name="terminalTypes" label="端类型" rules={[{ required: true, message: '请选择端类型' }]}>
            <Select mode="multiple" placeholder="请选择端类型">
              {Object.entries(terminalTypeMap).map(([k, label]) => (
                <Option key={k} value={k}>{label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="owner" label="Owner" rules={[{ required: true, message: '请选择Owner' }]}>
            <EmployeeSelect placeholder="请选择Owner" />
          </Form.Item>
          <Form.Item name="isCore" label="是否核心事件" valuePropName="checked">
            <Select placeholder="请选择">
              <Option value={true}>是</Option>
              <Option value={false}>否</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EventListPage;
