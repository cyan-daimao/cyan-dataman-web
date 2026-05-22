import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Space, message, Empty, Modal, Form, Input, Select, Checkbox,
  DatePicker, Popconfirm, Tag, Typography,
} from 'antd';
import {
  PlusOutlined, EditOutlined, EyeOutlined, CloseOutlined, RocketOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  demandApi, TrackingDemandDTO, TrackingDemandSaveRequest,
} from '@/api/DataCollectionApi';
import EmployeeSelect from '@/component/employee/EmployeeSelect';
import { ApiResponse } from '@/api/Response';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface PageResult<T> {
  records: T[];
  total: number;
  pageNo: number;
  pageSize: number;
}

const statusTagMap: Record<string, { color: string; label: string }> = {
  DRAFT: { color: 'default', label: '草稿' },
  DESIGNING: { color: 'blue', label: '设计中' },
  REVIEWING: { color: 'orange', label: '评审中' },
  DEVELOPING: { color: 'cyan', label: '开发中' },
  ACCEPTING: { color: 'purple', label: '验收中' },
  RELEASING: { color: 'gold', label: '发布中' },
  ONLINE: { color: 'success', label: '已上线' },
  CLOSED: { color: 'error', label: '已关闭' },
};

const priorityTagMap: Record<string, { color: string; label: string }> = {
  P0: { color: 'red', label: 'P0' },
  P1: { color: 'orange', label: 'P1' },
  P2: { color: 'blue', label: 'P2' },
  P3: { color: 'default', label: 'P3' },
};

const terminalTypeMap: Record<string, string> = {
  WEB: 'Web',
  IOS: 'iOS',
  ANDROID: 'Android',
  MINIPROGRAM: '小程序',
  SERVER: 'Server',
};

const businessDomains = ['trade', 'user', 'product', 'marketing', 'finance', 'operations'];
const productLines = ['主站', 'APP', '小程序', 'B端', '数据中台'];

const DemandListPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<TrackingDemandDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState<{
    demandName?: string;
    businessDomain?: string;
    productLine?: string;
    terminalTypes?: string[];
    status?: string;
    priority?: string;
    productOwner?: string;
    startTime?: string;
    endTime?: string;
  }>({});

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('新建需求');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(async (page = 1, query = filters) => {
    setLoading(true);
    try {
      const res = await demandApi.page({
        pageNo: page,
        pageSize,
        ...query,
      }) as unknown as ApiResponse<PageResult<TrackingDemandDTO>>;
      if (res.code === 200 && res.data) {
        setData(res.data.records || []);
        setTotal(res.data.total);
        setPageNo(res.data.pageNo);
      }
    } catch {
      message.error('获取需求列表失败');
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
    setModalTitle('新建需求');
    setEditingId(null);
    form.resetFields();
    setModalVisible(true);
  };

  const openEditModal = (record: TrackingDemandDTO) => {
    setModalTitle('编辑需求');
    setEditingId(record.id);
    form.setFieldsValue({
      demandName: record.demandName,
      businessDomain: record.businessDomain,
      productLine: record.productLine,
      terminalTypes: record.terminalTypes,
      priority: record.priority,
      businessGoal: record.businessGoal,
      analysisGoal: record.analysisGoal,
      productOwner: record.productOwner,
      techOwner: record.techOwner,
      testOwner: record.testOwner,
      dataOwner: record.dataOwner,
      expectedReleaseDate: record.expectedReleaseDate ? dayjs(record.expectedReleaseDate) : undefined,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload: TrackingDemandSaveRequest = {
        ...values,
        expectedReleaseDate: values.expectedReleaseDate ? dayjs(values.expectedReleaseDate).format('YYYY-MM-DD') : undefined,
      };
      setSaving(true);
      if (editingId) {
        await demandApi.update(editingId, payload);
        message.success('更新成功');
      } else {
        await demandApi.create(payload);
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

  const handleSubmitDesign = async (id: string) => {
    try {
      await demandApi.submitDesign(id);
      message.success('提交设计成功');
      fetchList(pageNo);
    } catch {
      message.error('提交设计失败');
    }
  };

  const handleClose = async (id: string) => {
    try {
      await demandApi.close(id);
      message.success('关闭需求成功');
      fetchList(pageNo);
    } catch {
      message.error('关闭需求失败');
    }
  };

  const columns = [
    { title: '需求编号', dataIndex: 'demandCode', key: 'demandCode', width: 150 },
    { title: '需求名称', dataIndex: 'demandName', key: 'demandName', width: 180 },
    { title: '业务域', dataIndex: 'businessDomain', key: 'businessDomain', width: 100 },
    {
      title: '端类型',
      dataIndex: 'terminalTypes',
      key: 'terminalTypes',
      width: 150,
      render: (types: string[]) => (
        <Space size={2} wrap>
          {types?.map((t) => (
            <Tag key={t}>{terminalTypeMap[t] || t}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (v: string) => <Tag color={priorityTagMap[v]?.color}>{priorityTagMap[v]?.label}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string) => <Tag color={statusTagMap[v]?.color}>{statusTagMap[v]?.label}</Tag>,
    },
    { title: '产品负责人', dataIndex: 'productOwner', key: 'productOwner', width: 120 },
    { title: '期望上线时间', dataIndex: 'expectedReleaseDate', key: 'expectedReleaseDate', width: 140 },
    { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 170 },
    {
      title: '操作',
      key: 'action',
      width: 260,
      fixed: 'right' as const,
      render: (_: unknown, record: TrackingDemandDTO) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>编辑</Button>
          <Button type="link" size="small" icon={<RocketOutlined />} onClick={() => handleSubmitDesign(record.id)}>提交设计</Button>
          <Button type="link" size="small" icon={<LinkOutlined />} onClick={() => { message.info('关联方案功能开发中'); }}>关联方案</Button>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/data-collection/demands/${record.id}`)}>详情</Button>
          <Popconfirm title="确认关闭该需求？" onConfirm={() => handleClose(record.id)}>
            <Button type="link" size="small" danger icon={<CloseOutlined />}>关闭</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 8px' }}>
      <Title level={4} style={{ marginBottom: 16 }}>埋点需求</Title>

      {/* 筛选区 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input.Search
            placeholder="需求名称/编号"
            allowClear
            onSearch={(v) => handleFilterChange({ demandName: v })}
            style={{ width: 220 }}
          />
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
            placeholder="产品线"
            allowClear
            style={{ width: 140 }}
            value={filters.productLine}
            onChange={(v) => handleFilterChange({ productLine: v })}
          >
            {productLines.map((p) => (
              <Option key={p} value={p}>{p}</Option>
            ))}
          </Select>
          <Select
            placeholder="端类型"
            allowClear
            mode="multiple"
            maxTagCount={1}
            style={{ width: 160 }}
            value={filters.terminalTypes}
            onChange={(v) => handleFilterChange({ terminalTypes: v })}
          >
            {Object.entries(terminalTypeMap).map(([k, label]) => (
              <Option key={k} value={k}>{label}</Option>
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
            placeholder="优先级"
            allowClear
            style={{ width: 100 }}
            value={filters.priority}
            onChange={(v) => handleFilterChange({ priority: v })}
          >
            {Object.entries(priorityTagMap).map(([k, { label }]) => (
              <Option key={k} value={k}>{label}</Option>
            ))}
          </Select>
          <Input
            placeholder="产品负责人"
            allowClear
            value={filters.productOwner}
            onChange={(e) => handleFilterChange({ productOwner: e.target.value })}
            style={{ width: 140 }}
          />
          <RangePicker
            placeholder={['创建开始', '创建结束']}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                handleFilterChange({
                  startTime: dates[0].format('YYYY-MM-DD'),
                  endTime: dates[1].format('YYYY-MM-DD'),
                });
              } else {
                handleFilterChange({ startTime: undefined, endTime: undefined });
              }
            }}
          />
        </Space>
      </Card>

      {/* 操作按钮 */}
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>新建需求</Button>
      </div>

      {/* 表格 */}
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
        scroll={{ x: 1400 }}
        locale={{ emptyText: <Empty description="暂无需求数据" /> }}
      />

      {/* 新建/编辑 Modal */}
      <Modal
        title={modalTitle}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => { setModalVisible(false); form.resetFields(); }}
        width={720}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="demandName" label="需求名称" rules={[{ required: true, message: '请输入需求名称' }]}>
            <Input placeholder="请输入需求名称" />
          </Form.Item>
          <Form.Item name="businessDomain" label="业务域" rules={[{ required: true, message: '请选择业务域' }]}>
            <Select placeholder="请选择业务域">
              {businessDomains.map((d) => (
                <Option key={d} value={d}>{d}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="productLine" label="产品线" rules={[{ required: true, message: '请选择产品线' }]}>
            <Select placeholder="请选择产品线">
              {productLines.map((p) => (
                <Option key={p} value={p}>{p}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="terminalTypes" label="端类型" rules={[{ required: true, message: '请选择端类型' }]}>
            <Checkbox.Group
              options={Object.entries(terminalTypeMap).map(([k, label]) => ({ label, value: k }))}
            />
          </Form.Item>
          <Form.Item name="priority" label="优先级" rules={[{ required: true, message: '请选择优先级' }]}>
            <Select placeholder="请选择优先级">
              {Object.entries(priorityTagMap).map(([k, { label }]) => (
                <Option key={k} value={k}>{label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="businessGoal" label="业务目标" rules={[{ required: true, message: '请输入业务目标' }]}>
            <Input.TextArea rows={3} placeholder="请输入业务目标" />
          </Form.Item>
          <Form.Item name="analysisGoal" label="分析目标" rules={[{ required: true, message: '请输入分析目标' }]}>
            <Input.TextArea rows={3} placeholder="请输入分析目标" />
          </Form.Item>
          <Form.Item name="productOwner" label="产品负责人" rules={[{ required: true, message: '请选择产品负责人' }]}>
            <EmployeeSelect placeholder="请选择产品负责人" />
          </Form.Item>
          <Form.Item name="techOwner" label="技术负责人">
            <EmployeeSelect placeholder="请选择技术负责人" />
          </Form.Item>
          <Form.Item name="testOwner" label="测试负责人">
            <EmployeeSelect placeholder="请选择测试负责人" />
          </Form.Item>
          <Form.Item name="dataOwner" label="数据负责人" rules={[{ required: true, message: '请选择数据负责人' }]}>
            <EmployeeSelect placeholder="请选择数据负责人" />
          </Form.Item>
          <Form.Item name="expectedReleaseDate" label="期望上线时间">
            <DatePicker style={{ width: '100%' }} placeholder="请选择期望上线时间" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DemandListPage;
