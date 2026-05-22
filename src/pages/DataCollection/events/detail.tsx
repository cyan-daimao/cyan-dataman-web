import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Spin, Empty, Button, Table, Typography, Modal, Form, Select, Switch, Input, Space, message,
} from 'antd';
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons';
import {
  eventApi, TrackingEventDTO, propertyApi, EventPropertyConfigRequest,
} from '@/api/DataCollectionApi';
import { ApiResponse } from '@/api/Response';

const { Title } = Typography;
const { Option } = Select;

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

const terminalTypeMap: Record<string, string> = {
  WEB: 'Web',
  IOS: 'iOS',
  ANDROID: 'Android',
  MINIPROGRAM: '小程序',
  SERVER: 'Server',
};

interface VersionRecord {
  version: number;
  operator: string;
  operateTime: string;
  remark: string;
}

const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<TrackingEventDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<VersionRecord[]>([]);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [propertyOptions, setPropertyOptions] = useState<{ id: string; propertyCode: string; propertyName: string; dataType: string }[]>([]);
  const [propertyOptionsLoading, setPropertyOptionsLoading] = useState(false);
  const [configForm] = Form.useForm();
  const [configuring, setConfiguring] = useState(false);

  const fetchDetail = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await eventApi.getById(id) as unknown as ApiResponse<TrackingEventDTO>;
      if (res.code === 200 && res.data) {
        setDetail(res.data);
      }
    } catch {
      /* message handled by interceptor */
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
    // Mock version data
    setVersions([
      { version: 1, operator: 'zhangsan', operateTime: '2026-05-20 10:00:00', remark: '创建事件' },
      { version: 2, operator: 'lisi', operateTime: '2026-05-21 14:30:00', remark: '更新触发时机' },
    ]);
  }, [fetchDetail]);

  const loadPropertyOptions = async () => {
    setPropertyOptionsLoading(true);
    try {
      const res = await propertyApi.page({ pageNo: 1, pageSize: 1000, status: 'PUBLISHED' }) as unknown as ApiResponse<{
        records: { id: string; propertyCode: string; propertyName: string; dataType: string }[];
      }>;
      if (res.code === 200 && res.data) {
        setPropertyOptions(res.data.records || []);
      }
    } catch {
      /* message handled by interceptor */
    } finally {
      setPropertyOptionsLoading(false);
    }
  };

  const handleOpenConfigModal = () => {
    loadPropertyOptions();
    // 预填充当前已配置的属性
    const currentProperties = detail?.properties || [];
    configForm.setFieldsValue({
      properties: currentProperties.map((p) => ({
        propertyId: p.propertyId,
        isRequired: p.isRequired,
        defaultValue: p.defaultValue,
        sampleValue: p.sampleValue,
        description: p.description,
      })),
    });
    setConfigModalVisible(true);
  };

  const handleConfigProperties = async () => {
    if (!id) return;
    try {
      const values = await configForm.validateFields();
      setConfiguring(true);
      const configs: EventPropertyConfigRequest[] = (values.properties || []).map((p: {
        propertyId: string;
        isRequired?: boolean;
        defaultValue?: string;
        sampleValue?: string;
        description?: string;
      }) => ({
        propertyId: p.propertyId,
        isRequired: p.isRequired ?? false,
        defaultValue: p.defaultValue,
        sampleValue: p.sampleValue,
        description: p.description,
      }));
      await eventApi.configProperties(id, configs);
      message.success('属性配置成功');
      setConfigModalVisible(false);
      await fetchDetail();
    } catch (err) {
      if (err instanceof Error && err.message) {
        message.error(err.message);
      }
    } finally {
      setConfiguring(false);
    }
  };

  const propertyColumns = [
    { title: '属性编码', dataIndex: 'propertyCode', key: 'propertyCode' },
    { title: '属性名称', dataIndex: 'propertyName', key: 'propertyName' },
    { title: '数据类型', dataIndex: 'dataType', key: 'dataType' },
    {
      title: '是否必填',
      dataIndex: 'isRequired',
      key: 'isRequired',
      render: (v: boolean) => (v ? <Tag color="red">必填</Tag> : <Tag>选填</Tag>),
    },
    { title: '样例值', dataIndex: 'sampleValue', key: 'sampleValue', render: (v: string) => v || '-' },
    { title: '说明', dataIndex: 'description', key: 'description', render: (v: string) => v || '-' },
  ];

  const versionColumns = [
    { title: '版本', dataIndex: 'version', key: 'version', render: (v: number) => `V${v}` },
    { title: '操作人', dataIndex: 'operator', key: 'operator' },
    { title: '操作时间', dataIndex: 'operateTime', key: 'operateTime' },
    { title: '备注', dataIndex: 'remark', key: 'remark' },
  ];

  if (!id) {
    return <Empty description="缺少事件 ID" />;
  }

  return (
    <div style={{ padding: '0 8px' }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/data-collection/events')} style={{ marginBottom: 16 }}>
        返回列表
      </Button>
      <Title level={4} style={{ marginBottom: 16 }}>事件详情</Title>

      <Spin spinning={loading}>
        {detail ? (
          <>
            <Card title="事件定义" style={{ marginBottom: 16 }}>
              <Descriptions column={2}>
                <Descriptions.Item label="事件编码">{detail.eventCode}</Descriptions.Item>
                <Descriptions.Item label="事件名称">{detail.eventName}</Descriptions.Item>
                <Descriptions.Item label="事件类型">{eventTypeMap[detail.eventType] || detail.eventType}</Descriptions.Item>
                <Descriptions.Item label="业务域">{detail.businessDomain}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={statusTagMap[detail.status]?.color}>{statusTagMap[detail.status]?.label}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="是否核心事件">{detail.isCore ? <Tag color="red">是</Tag> : <Tag>否</Tag>}</Descriptions.Item>
                <Descriptions.Item label="Owner">{detail.owner}</Descriptions.Item>
                <Descriptions.Item label="版本">V{detail.version}</Descriptions.Item>
                <Descriptions.Item label="端类型">
                  {detail.terminalTypes?.map((t) => (
                    <Tag key={t}>{terminalTypeMap[t] || t}</Tag>
                  ))}
                </Descriptions.Item>
                <Descriptions.Item label="触发时机">{detail.triggerTiming || '-'}</Descriptions.Item>
                <Descriptions.Item label="描述" span={2}>{detail.description || '-'}</Descriptions.Item>
                <Descriptions.Item label="创建时间">{detail.createdAt}</Descriptions.Item>
                <Descriptions.Item label="更新时间">{detail.updatedAt}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card
              title="关联属性"
              style={{ marginBottom: 16 }}
              extra={
                <Button type="primary" size="small" icon={<SettingOutlined />} onClick={handleOpenConfigModal}>
                  配置属性
                </Button>
              }
            >
              <Table
                rowKey="id"
                columns={propertyColumns}
                dataSource={detail.properties || []}
                size="small"
                locale={{ emptyText: <Empty description="暂无关联属性" /> }}
              />
            </Card>

            <Card title="版本记录">
              <Table
                rowKey="version"
                columns={versionColumns}
                dataSource={versions}
                size="small"
                locale={{ emptyText: <Empty description="暂无版本记录" /> }}
              />
            </Card>
          </>
        ) : (
          <Empty description="未找到事件详情" />
        )}
      </Spin>

      <Modal
        title="配置事件属性"
        open={configModalVisible}
        onOk={handleConfigProperties}
        onCancel={() => { setConfigModalVisible(false); configForm.resetFields(); }}
        confirmLoading={configuring}
        width={720}
        destroyOnClose
      >
        <Form form={configForm} layout="vertical">
          <Form.List name="properties">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'propertyId']}
                      rules={[{ required: true, message: '请选择属性' }]}
                      style={{ width: 180 }}
                    >
                      <Select placeholder="选择属性" loading={propertyOptionsLoading} showSearch optionFilterProp="children">
                        {propertyOptions.map((p) => (
                          <Option key={p.id} value={p.id}>{p.propertyCode} - {p.propertyName}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'isRequired']} valuePropName="checked" initialValue={false}>
                      <Switch checkedChildren="必填" unCheckedChildren="选填" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'defaultValue']} style={{ width: 120 }}>
                      <Input placeholder="默认值" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'sampleValue']} style={{ width: 120 }}>
                      <Input placeholder="样例值" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'description']} style={{ width: 160 }}>
                      <Input placeholder="说明" />
                    </Form.Item>
                    <Button type="link" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  添加属性
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
};

export default EventDetailPage;
