import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Space, message, Empty, Modal, Form, Input, Select, Tag, Typography, Popconfirm,
} from 'antd';
import {
  PlusOutlined, EditOutlined, EyeOutlined, CheckCircleOutlined, StopOutlined,
} from '@ant-design/icons';
import {
  propertyApi, TrackingPropertyDTO, TrackingPropertySaveRequest,
} from '@/api/DataCollectionApi';
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

const propertyTypeMap: Record<string, string> = {
  COMMON: '公共属性',
  EVENT: '事件属性',
  USER: '用户属性',
  DEVICE: '设备属性',
};

const dataTypeMap: Record<string, string> = {
  STRING: 'String',
  NUMBER: 'Number',
  BOOLEAN: 'Boolean',
  DATETIME: 'DateTime',
  ENUM: 'Enum',
};

const PropertyListPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<TrackingPropertyDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState<{
    propertyCode?: string;
    propertyName?: string;
    propertyType?: string;
    dataType?: string;
    isSensitive?: boolean;
    status?: string;
  }>({});

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('新建属性');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(async (page = 1, query = filters) => {
    setLoading(true);
    try {
      const res = await propertyApi.page({
        pageNo: page,
        pageSize,
        ...query,
      }) as unknown as ApiResponse<PageResult<TrackingPropertyDTO>>;
      if (res.code === 200 && res.data) {
        setData(res.data.records || []);
        setTotal(res.data.total);
        setPageNo(res.data.pageNo);
      }
    } catch {
      message.error('获取属性列表失败');
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
    setModalTitle('新建属性');
    setEditingId(null);
    form.resetFields();
    setModalVisible(true);
  };

  const openEditModal = (record: TrackingPropertyDTO) => {
    setModalTitle('编辑属性');
    setEditingId(record.id);
    form.setFieldsValue({
      propertyCode: record.propertyCode,
      propertyName: record.propertyName,
      propertyType: record.propertyType,
      dataType: record.dataType,
      description: record.description,
      isRequired: record.isRequired,
      isSensitive: record.isSensitive,
      securityLevel: record.securityLevel,
      enumValues: record.enumValues,
      maxLength: record.maxLength,
      validationRule: record.validationRule,
      standardCode: record.standardCode,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload: TrackingPropertySaveRequest = { ...values };
      setSaving(true);
      if (editingId) {
        await propertyApi.update(editingId, payload);
        message.success('更新成功');
      } else {
        await propertyApi.create(payload);
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
      await propertyApi.publish(id);
      message.success('发布成功');
      fetchList(pageNo);
    } catch {
      message.error('发布失败');
    }
  };

  const handleDeprecate = async (id: string) => {
    try {
      await propertyApi.deprecate(id);
      message.success('废弃成功');
      fetchList(pageNo);
    } catch {
      message.error('废弃失败');
    }
  };

  const handleViewUsage = (id: string) => {
    propertyApi.usage(id)
      .then((res) => {
        const r = res as unknown as ApiResponse<unknown>;
        if (r.code === 200) {
          Modal.info({ title: '使用情况', content: <pre>{JSON.stringify(r.data, null, 2)}</pre>, width: 600 });
        }
      })
      .catch(() => message.error('获取使用情况失败'));
  };

  const columns = [
    { title: '属性编码', dataIndex: 'propertyCode', key: 'propertyCode', width: 160 },
    { title: '属性名称', dataIndex: 'propertyName', key: 'propertyName', width: 160 },
    {
      title: '属性类型',
      dataIndex: 'propertyType',
      key: 'propertyType',
      width: 110,
      render: (v: string) => propertyTypeMap[v] || v,
    },
    {
      title: '数据类型',
      dataIndex: 'dataType',
      key: 'dataType',
      width: 100,
      render: (v: string) => dataTypeMap[v] || v,
    },
    {
      title: '是否敏感',
      dataIndex: 'isSensitive',
      key: 'isSensitive',
      width: 90,
      render: (v: boolean) => (v ? <Tag color="red">是</Tag> : <Tag>否</Tag>),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string) => <Tag color={statusTagMap[v]?.color}>{statusTagMap[v]?.label}</Tag>,
    },
    { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 170 },
    {
      title: '操作',
      key: 'action',
      width: 240,
      fixed: 'right' as const,
      render: (_: unknown, record: TrackingPropertyDTO) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>编辑</Button>
          {record.status !== 'PUBLISHED' && (
            <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => handlePublish(record.id)}>发布</Button>
          )}
          {record.status !== 'DEPRECATED' && (
            <Popconfirm title="确认废弃该属性？" onConfirm={() => handleDeprecate(record.id)}>
              <Button type="link" size="small" danger icon={<StopOutlined />}>废弃</Button>
            </Popconfirm>
          )}
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewUsage(record.id)}>使用情况</Button>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/data-collection/properties/${record.id}`)}>详情</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 8px' }}>
      <Title level={4} style={{ marginBottom: 16 }}>属性管理</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input.Search
            placeholder="属性编码"
            allowClear
            onSearch={(v) => handleFilterChange({ propertyCode: v })}
            style={{ width: 180 }}
          />
          <Input.Search
            placeholder="属性名称"
            allowClear
            onSearch={(v) => handleFilterChange({ propertyName: v })}
            style={{ width: 180 }}
          />
          <Select
            placeholder="属性类型"
            allowClear
            style={{ width: 140 }}
            value={filters.propertyType}
            onChange={(v) => handleFilterChange({ propertyType: v })}
          >
            {Object.entries(propertyTypeMap).map(([k, label]) => (
              <Option key={k} value={k}>{label}</Option>
            ))}
          </Select>
          <Select
            placeholder="数据类型"
            allowClear
            style={{ width: 140 }}
            value={filters.dataType}
            onChange={(v) => handleFilterChange({ dataType: v })}
          >
            {Object.entries(dataTypeMap).map(([k, label]) => (
              <Option key={k} value={k}>{label}</Option>
            ))}
          </Select>
          <Select
            placeholder="是否敏感"
            allowClear
            style={{ width: 140 }}
            value={filters.isSensitive}
            onChange={(v) => handleFilterChange({ isSensitive: v })}
          >
            <Option value={true}>是</Option>
            <Option value={false}>否</Option>
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
        </Space>
      </Card>

      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>新建属性</Button>
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
        scroll={{ x: 1200 }}
        locale={{ emptyText: <Empty description="暂无属性数据" /> }}
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
          <Form.Item name="propertyCode" label="属性编码" rules={[{ required: true, message: '请输入属性编码' }, { pattern: /^[a-z][a-z0-9_]*$/, message: '必须以字母开头，只能包含小写字母、数字、下划线' }]}>
            <Input placeholder="如: order_id" disabled={!!editingId} />
          </Form.Item>
          <Form.Item name="propertyName" label="属性名称" rules={[{ required: true, message: '请输入属性名称' }]}>
            <Input placeholder="请输入属性名称" />
          </Form.Item>
          <Form.Item name="propertyType" label="属性类型" rules={[{ required: true, message: '请选择属性类型' }]}>
            <Select placeholder="请选择属性类型">
              {Object.entries(propertyTypeMap).map(([k, label]) => (
                <Option key={k} value={k}>{label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="dataType" label="数据类型" rules={[{ required: true, message: '请选择数据类型' }]}>
            <Select placeholder="请选择数据类型">
              {Object.entries(dataTypeMap).map(([k, label]) => (
                <Option key={k} value={k}>{label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="description" label="属性描述">
            <Input.TextArea rows={2} placeholder="请输入属性描述" />
          </Form.Item>
          <Form.Item name="isRequired" label="是否必填" valuePropName="checked">
            <Select placeholder="请选择">
              <Option value={true}>是</Option>
              <Option value={false}>否</Option>
            </Select>
          </Form.Item>
          <Form.Item name="isSensitive" label="是否敏感" valuePropName="checked">
            <Select placeholder="请选择">
              <Option value={true}>是</Option>
              <Option value={false}>否</Option>
            </Select>
          </Form.Item>
          <Form.Item name="securityLevel" label="安全等级">
            <Input placeholder="请输入安全等级" />
          </Form.Item>
          <Form.Item name="enumValues" label="枚举值">
            <Select mode="tags" placeholder="输入枚举值后按回车" />
          </Form.Item>
          <Form.Item name="maxLength" label="最大长度">
            <Input type="number" placeholder="请输入最大长度" />
          </Form.Item>
          <Form.Item name="validationRule" label="校验规则">
            <Input placeholder="请输入校验规则" />
          </Form.Item>
          <Form.Item name="standardCode" label="标准编码">
            <Input placeholder="请输入标准编码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PropertyListPage;
