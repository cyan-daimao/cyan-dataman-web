import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Table, Button, Space, message, Empty, Modal, Form, Input, Select, Tag, Typography, Popconfirm,
} from 'antd';
import {
  PlusOutlined, EditOutlined, KeyOutlined, CodeOutlined,
} from '@ant-design/icons';
import {
  appApi, TrackingAppDTO, TrackingAppSaveRequest,
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
  ENABLED: { color: 'success', label: '启用' },
  DISABLED: { color: 'error', label: '禁用' },
};

const appTypeMap: Record<string, string> = {
  WEB: 'Web',
  IOS: 'iOS',
  ANDROID: 'Android',
  MINIPROGRAM: '小程序',
  SERVER: 'Server',
};

const AppListPage: React.FC = () => {
  const [data, setData] = useState<TrackingAppDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState<{
    appCode?: string;
    appName?: string;
    appType?: string;
    status?: string;
  }>({});

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('新建应用');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(async (page = 1, query = filters) => {
    setLoading(true);
    try {
      const res = await appApi.page({
        pageNo: page,
        pageSize,
        ...query,
      }) as unknown as ApiResponse<PageResult<TrackingAppDTO>>;
      if (res.code === 200 && res.data) {
        setData(res.data.list || res.data.records || []);
        setTotal(res.data.total || 0);
        setPageNo(res.data.pageNum || res.data.pageNo || page);
      }
    } catch {
      message.error('获取应用列表失败');
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
    setModalTitle('新建应用');
    setEditingId(null);
    form.resetFields();
    setModalVisible(true);
  };

  const openEditModal = (record: TrackingAppDTO) => {
    setModalTitle('编辑应用');
    setEditingId(record.id);
    form.setFieldsValue({
      appCode: record.appCode,
      appName: record.appName,
      appType: record.appType,
      description: record.description,
      reportUrl: record.reportUrl,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload: TrackingAppSaveRequest = { ...values };
      setSaving(true);
      if (editingId) {
        await appApi.update(editingId, payload);
        message.success('更新成功');
      } else {
        await appApi.create(payload);
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

  const handleRotateSecret = async (id: string) => {
    try {
      await appApi.rotateSecret(id);
      message.success('密钥轮换成功');
      fetchList(pageNo);
    } catch {
      message.error('密钥轮换失败');
    }
  };

  const handleViewIntegrationCode = (id: string) => {
    appApi.integrationCode(id)
      .then((res) => {
        const r = res as unknown as ApiResponse<string>;
        if (r.code === 200) {
          Modal.info({
            title: '接入示例代码',
            content: (
              <pre style={{ background: '#f6f8fa', padding: 12, borderRadius: 6, overflow: 'auto', fontSize: 12 }}>
                {r.data || '暂无示例代码'}
              </pre>
            ),
            width: 800,
          });
        }
      })
      .catch(() => message.error('获取接入示例失败'));
  };

  const columns = [
    { title: '应用编码', dataIndex: 'appCode', key: 'appCode' },
    { title: '应用名称', dataIndex: 'appName', key: 'appName' },
    {
      title: '应用类型',
      dataIndex: 'appType',
      key: 'appType',
      render: (v: string) => appTypeMap[v] || v,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => <Tag color={statusTagMap[v]?.color}>{statusTagMap[v]?.label}</Tag>,
    },
    { title: '上报地址', dataIndex: 'reportUrl', key: 'reportUrl' },
    { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt' },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      render: (_: unknown, record: TrackingAppDTO) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>编辑</Button>
          <Popconfirm title="确认轮换密钥？" description="轮换后旧密钥将失效" onConfirm={() => handleRotateSecret(record.id)}>
            <Button type="link" size="small" icon={<KeyOutlined />}>轮换密钥</Button>
          </Popconfirm>
          <Button type="link" size="small" icon={<CodeOutlined />} onClick={() => handleViewIntegrationCode(record.id)}>接入示例</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 8px' }}>
      <Title level={4} style={{ marginBottom: 16 }}>接入配置</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input.Search
            placeholder="应用编码"
            allowClear
            onSearch={(v) => handleFilterChange({ appCode: v })}
            style={{ width: 180 }}
          />
          <Input.Search
            placeholder="应用名称"
            allowClear
            onSearch={(v) => handleFilterChange({ appName: v })}
            style={{ width: 180 }}
          />
          <Select
            placeholder="应用类型"
            allowClear
            style={{ width: 140 }}
            value={filters.appType}
            onChange={(v) => handleFilterChange({ appType: v })}
          >
            {Object.entries(appTypeMap).map(([k, label]) => (
              <Option key={k} value={k}>{label}</Option>
            ))}
          </Select>
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 120 }}
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
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>新建应用</Button>
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
        locale={{ emptyText: <Empty description="暂无应用数据" /> }}
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
          <Form.Item name="appCode" label="应用编码" rules={[{ required: true, message: '请输入应用编码' }, { pattern: /^[a-z][a-z0-9_]*$/, message: '必须以字母开头，只能包含小写字母、数字、下划线' }]}>
            <Input placeholder="如: dataman_web" disabled={!!editingId} />
          </Form.Item>
          <Form.Item name="appName" label="应用名称" rules={[{ required: true, message: '请输入应用名称' }]}>
            <Input placeholder="请输入应用名称" />
          </Form.Item>
          <Form.Item name="appType" label="应用类型" rules={[{ required: true, message: '请选择应用类型' }]}>
            <Select placeholder="请选择应用类型">
              {Object.entries(appTypeMap).map(([k, label]) => (
                <Option key={k} value={k}>{label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="description" label="应用描述">
            <Input.TextArea rows={2} placeholder="请输入应用描述" />
          </Form.Item>
          <Form.Item name="reportUrl" label="上报地址">
            <Input placeholder="请输入上报地址" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AppListPage;
