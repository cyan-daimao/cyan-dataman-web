import React, { useEffect, useState } from 'react';
import {
  Button, Descriptions, Drawer, Empty, Form, Input, InputNumber, Modal,
  Popconfirm, Select, Space, Table, Tabs, Tag, Typography, message,
} from 'antd';
import {
  MetricApi, MetricDetail, MetricFieldBindingCmd, MetricFieldBindingDTO,
  MetricType,
} from '@/api/MetricApi';
import MetadataTableSelector from './MetadataTableSelector';

const { Paragraph, Text } = Typography;
const { Option } = Select;

interface MetricDetailDrawerProps {
  open: boolean;
  metricId: string | null;
  onClose: () => void;
  onChanged: () => void;
}

const typeLabel: Record<string, string> = {
  ATOMIC: '原子指标',
  DERIVED: '派生指标',
  COMPOSITE: '复合指标',
};

const MetricDetailDrawer: React.FC<MetricDetailDrawerProps> = ({
  open,
  metricId,
  onClose,
  onChanged,
}) => {
  const [detail, setDetail] = useState<MetricDetail | null>(null);
  const [bindings, setBindings] = useState<MetricFieldBindingDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [bindingModalOpen, setBindingModalOpen] = useState(false);
  const [editingBinding, setEditingBinding] = useState<MetricFieldBindingDTO | null>(null);
  const [savingBinding, setSavingBinding] = useState(false);
  const [form] = Form.useForm();

  const fetchDetail = async () => {
    if (!metricId) return;
    setLoading(true);
    try {
      const [detailRes, bindingRes] = await Promise.all([
        MetricApi.detail(metricId),
        MetricApi.listFieldBindings(metricId),
      ]);
      if (detailRes.code === 200 && detailRes.data) {
        setDetail(detailRes.data);
      }
      if (bindingRes.code === 200 && bindingRes.data) {
        setBindings(bindingRes.data);
      } else {
        setBindings([]);
      }
    } catch {
      message.error('加载指标详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchDetail();
    } else {
      setDetail(null);
      setBindings([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, metricId]);

  const openBindingModal = (binding?: MetricFieldBindingDTO) => {
    setEditingBinding(binding || null);
    form.resetFields();
    if (binding) {
      form.setFieldsValue({
        ...binding,
        selector: {
          dsName: binding.catalogName,
          dbName: binding.schemaName,
          tblName: binding.tableName,
          colName: binding.columnName,
        },
      });
    } else {
      form.setFieldsValue({
        primaryBinding: bindings.length === 0,
        sortOrder: bindings.length,
      });
    }
    setBindingModalOpen(true);
  };

  const saveBinding = async () => {
    if (!metricId) return;
    const values = await form.validateFields();
    const cmd: MetricFieldBindingCmd = {
      catalogName: values.selector?.dsName || 'iceberg',
      schemaName: values.selector?.dbName,
      tableName: values.selector?.tblName,
      columnName: values.selector?.colName,
      sourceExpr: values.sourceExpr,
      filterCondition: values.filterCondition,
      primaryBinding: values.primaryBinding,
      sortOrder: values.sortOrder,
    };
    setSavingBinding(true);
    try {
      if (editingBinding?.id) {
        await MetricApi.updateFieldBinding(metricId, editingBinding.id, cmd);
      } else {
        await MetricApi.saveFieldBinding(metricId, cmd);
      }
      message.success('绑定已保存');
      setBindingModalOpen(false);
      await fetchDetail();
      onChanged();
    } catch {
      message.error('保存绑定失败');
    } finally {
      setSavingBinding(false);
    }
  };

  const deleteBinding = async (bindingId?: string) => {
    if (!metricId || !bindingId) return;
    try {
      await MetricApi.deleteFieldBinding(metricId, bindingId);
      message.success('绑定已删除');
      await fetchDetail();
      onChanged();
    } catch {
      message.error('删除绑定失败');
    }
  };

  const setPrimary = async (bindingId?: string) => {
    if (!metricId || !bindingId) return;
    try {
      await MetricApi.setPrimaryFieldBinding(metricId, bindingId);
      message.success('已设为主绑定');
      await fetchDetail();
      onChanged();
    } catch {
      message.error('设置主绑定失败');
    }
  };

  const bindingColumns = [
    {
      title: '表字段',
      key: 'table',
      render: (_: unknown, record: MetricFieldBindingDTO) => (
        <Text copyable>
          {[record.catalogName, record.schemaName, record.tableName, record.columnName].filter(Boolean).join('.')}
        </Text>
      ),
    },
    {
      title: '主绑定',
      dataIndex: 'primaryBinding',
      width: 90,
      render: (value: boolean) => value ? <Tag color="green">主绑定</Tag> : <Tag>候选</Tag>,
    },
    { title: '排序', dataIndex: 'sortOrder', width: 80 },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_: unknown, record: MetricFieldBindingDTO) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => openBindingModal(record)}>编辑</Button>
          {!record.primaryBinding && (
            <Button type="link" size="small" onClick={() => setPrimary(record.id)}>设为主绑定</Button>
          )}
          <Popconfirm title="确认删除该绑定？" onConfirm={() => deleteBinding(record.id)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Drawer
        title={detail ? `${detail.metricName} (${detail.metricCode})` : '指标详情'}
        width={860}
        open={open}
        onClose={onClose}
      >
        <Tabs
          items={[
            {
              key: 'basic',
              label: '基础信息',
              children: detail ? (
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="指标编码">{detail.metricCode}</Descriptions.Item>
                  <Descriptions.Item label="指标类型">{typeLabel[detail.metricType] || detail.metricType}</Descriptions.Item>
                  <Descriptions.Item label="主题域">{detail.subjectName || detail.subjectCode}</Descriptions.Item>
                  <Descriptions.Item label="状态"><Tag>{detail.status}</Tag></Descriptions.Item>
                  <Descriptions.Item label="负责人">{detail.owner || '-'}</Descriptions.Item>
                  <Descriptions.Item label="版本">V{detail.version}</Descriptions.Item>
                  <Descriptions.Item label="业务口径" span={2}><Paragraph>{detail.bizCaliber || '-'}</Paragraph></Descriptions.Item>
                  <Descriptions.Item label="技术口径" span={2}><Paragraph code>{detail.techCaliber || '-'}</Paragraph></Descriptions.Item>
                  {detail.atomic && (
                    <Descriptions.Item label="统计函数" span={2}><Tag>{detail.atomic.statFunc}</Tag></Descriptions.Item>
                  )}
                  {detail.derived && (
                    <>
                      <Descriptions.Item label="原子指标ID">{detail.derived.atomicMetricId}</Descriptions.Item>
                      <Descriptions.Item label="时间周期ID">{detail.derived.timePeriodId}</Descriptions.Item>
                    </>
                  )}
                  {detail.composite && (
                    <Descriptions.Item label="公式" span={2}><Paragraph code>{detail.composite.formula}</Paragraph></Descriptions.Item>
                  )}
                </Descriptions>
              ) : <Empty description={loading ? '加载中...' : '暂无数据'} />,
            },
            ...(detail?.metricType === MetricType.ATOMIC ? [{
              key: 'binding',
              label: '字段绑定',
              children: (
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Button type="primary" onClick={() => openBindingModal()}>添加字段绑定</Button>
                  <Table
                    rowKey={(record) => record.id || `${record.schemaName}.${record.tableName}.${record.columnName}`}
                    loading={loading}
                    dataSource={bindings}
                    columns={bindingColumns}
                    pagination={false}
                    locale={{ emptyText: <Empty description="暂无字段绑定" /> }}
                  />
                </Space>
              ),
            }] : []),
          ]}
        />
      </Drawer>

      <Modal
        title={editingBinding ? '编辑字段绑定' : '新增字段绑定'}
        open={bindingModalOpen}
        onOk={saveBinding}
        onCancel={() => setBindingModalOpen(false)}
        confirmLoading={savingBinding}
        destroyOnClose
        width={720}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="selector"
            label="数仓表字段"
            rules={[{
              required: true,
              validator: (_, value) => value?.dbName && value?.tblName && value?.colName
                ? Promise.resolve()
                : Promise.reject(new Error('请选择数仓表和字段')),
            }]}
          >
            <MetadataTableSelector />
          </Form.Item>
          <Form.Item name="sourceExpr" label="来源表达式">
            <Input.TextArea rows={3} placeholder="可选；配置后用于替代物理字段表达式" />
          </Form.Item>
          <Form.List name="filterCondition">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: '100%' }}>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} align="baseline">
                    <Form.Item {...restField} name={[name, 'field']} rules={[{ required: true, message: '请输入字段' }]}>
                      <Input placeholder="过滤字段" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'op']} rules={[{ required: true, message: '请选择运算符' }]}>
                      <Select style={{ width: 120 }}>
                        <Option value="=">=</Option>
                        <Option value="!=">!=</Option>
                        <Option value=">">&gt;</Option>
                        <Option value="<">&lt;</Option>
                        <Option value="IN">IN</Option>
                      </Select>
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'value']} rules={[{ required: true, message: '请输入值' }]}>
                      <Input placeholder="过滤值" />
                    </Form.Item>
                    <Button type="link" danger onClick={() => remove(name)}>删除</Button>
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} block>添加过滤条件</Button>
              </Space>
            )}
          </Form.List>
          <Space style={{ marginTop: 16 }}>
            <Form.Item name="primaryBinding" style={{ marginBottom: 0 }}>
              <Select style={{ width: 120 }} options={[
                { value: true, label: '主绑定' },
                { value: false, label: '候选绑定' },
              ]} />
            </Form.Item>
            <Form.Item name="sortOrder" label="排序" style={{ marginBottom: 0 }}>
              <InputNumber min={0} precision={0} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </>
  );
};

export default MetricDetailDrawer;
