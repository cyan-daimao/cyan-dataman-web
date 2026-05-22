import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Spin, Empty, Button, Tabs, Table, message, Typography, Space,
  Modal, Form, Select,
} from 'antd';
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  planApi, TrackingPlanDTO, TrackingPlanEventDTO, eventApi,
} from '@/api/DataCollectionApi';
import { ApiResponse } from '@/api/Response';

const { Title } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

const statusTagMap: Record<string, { color: string; label: string }> = {
  DRAFT: { color: 'default', label: '草稿' },
  REVIEWING: { color: 'orange', label: '评审中' },
  DEVELOPING: { color: 'cyan', label: '开发中' },
  ACCEPTING: { color: 'purple', label: '验收中' },
  RELEASING: { color: 'gold', label: '发布中' },
  PUBLISHED: { color: 'success', label: '已发布' },
  CLOSED: { color: 'error', label: '已关闭' },
};

const PlanDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<TrackingPlanDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [eventForm] = Form.useForm();
  const [eventOptions, setEventOptions] = useState<{ id: string; eventCode: string; eventName: string }[]>([]);
  const [eventOptionsLoading, setEventOptionsLoading] = useState(false);

  const fetchDetail = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await planApi.getById(id) as unknown as ApiResponse<TrackingPlanDTO>;
      if (res.code === 200 && res.data) {
        setDetail(res.data);
      }
    } catch {
      message.error('获取方案详情失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const loadEventOptions = async () => {
    setEventOptionsLoading(true);
    try {
      const res = await eventApi.page({ pageNo: 1, pageSize: 1000, status: 'PUBLISHED' }) as unknown as ApiResponse<{
        records: { id: string; eventCode: string; eventName: string }[];
      }>;
      if (res.code === 200 && res.data) {
        setEventOptions(res.data.records || []);
      }
    } catch {
      message.error('加载事件列表失败');
    } finally {
      setEventOptionsLoading(false);
    }
  };

  const handleOpenAddEventModal = () => {
    loadEventOptions();
    setEventModalVisible(true);
  };

  const handleAddEvent = async () => {
    try {
      const values = await eventForm.validateFields();
      if (!id) return;
      await planApi.addEvent(id, values.eventId);
      message.success('添加事件成功');
      setEventModalVisible(false);
      eventForm.resetFields();
      await fetchDetail();
    } catch (err) {
      if (err instanceof Error && err.message) {
        message.error(err.message);
      }
    }
  };

  const handleRemoveEvent = async (eventId: string) => {
    if (!id) return;
    try {
      await planApi.removeEvent(id, eventId);
      message.success('移除事件成功');
      await fetchDetail();
    } catch {
      message.error('移除事件失败');
    }
  };

  const eventColumns = [
    { title: '事件编码', dataIndex: 'eventCode', key: 'eventCode' },
    { title: '事件名称', dataIndex: 'eventName', key: 'eventName' },
    { title: '事件类型', dataIndex: 'eventType', key: 'eventType' },
    {
      title: '是否必填',
      dataIndex: 'isRequired',
      key: 'isRequired',
      render: (v: boolean) => (v ? <Tag color="red">必填</Tag> : <Tag>选填</Tag>),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: TrackingPlanEventDTO) => (
        <Space>
          <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => handleRemoveEvent(record.eventId)}>删除</Button>
        </Space>
      ),
    },
  ];

  if (!id) {
    return <Empty description="缺少方案 ID" />;
  }

  return (
    <div style={{ padding: '0 8px' }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/data-collection/plans')} style={{ marginBottom: 16 }}>
        返回列表
      </Button>
      <Title level={4} style={{ marginBottom: 16 }}>方案详情</Title>

      <Spin spinning={loading}>
        {detail ? (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Descriptions column={2}>
                <Descriptions.Item label="方案编号">{detail.planCode}</Descriptions.Item>
                <Descriptions.Item label="方案名称">{detail.planName}</Descriptions.Item>
                <Descriptions.Item label="版本">V{detail.version}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={statusTagMap[detail.status]?.color}>{statusTagMap[detail.status]?.label}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="关联需求ID">{detail.demandId || '-'}</Descriptions.Item>
                <Descriptions.Item label="评审人">{detail.reviewer || '-'}</Descriptions.Item>
                <Descriptions.Item label="创建时间">{detail.createdAt}</Descriptions.Item>
                <Descriptions.Item label="更新时间">{detail.updatedAt}</Descriptions.Item>
                <Descriptions.Item label="描述" span={2}>{detail.description || '-'}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Tabs defaultActiveKey="events">
              <TabPane tab="事件清单" key="events">
                <div style={{ marginBottom: 16 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddEventModal}>添加事件</Button>
                </div>
                <Table
                  rowKey="eventId"
                  columns={eventColumns}
                  dataSource={detail.events || []}
                  locale={{ emptyText: <Empty description="暂无事件" /> }}
                  size="small"
                />
              </TabPane>
              <TabPane tab="属性清单" key="properties">
                <Empty description="暂无属性数据" />
              </TabPane>
              <TabPane tab="验收规则" key="acceptance">
                <Empty description="暂无验收规则" />
              </TabPane>
              <TabPane tab="变更记录" key="changes">
                <Empty description="暂无变更记录" />
              </TabPane>
            </Tabs>
          </>
        ) : (
          <Empty description="未找到方案详情" />
        )}
      </Spin>

      <Modal
        title="添加事件"
        open={eventModalVisible}
        onOk={handleAddEvent}
        onCancel={() => { setEventModalVisible(false); eventForm.resetFields(); }}
        destroyOnClose
      >
        <Form form={eventForm} layout="vertical">
          <Form.Item name="eventId" label="选择事件" rules={[{ required: true, message: '请选择事件' }]}>
            <Select placeholder="请选择事件" loading={eventOptionsLoading} showSearch optionFilterProp="children">
              {eventOptions.map((e) => (
                <Option key={e.id} value={e.id}>{e.eventCode} - {e.eventName}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PlanDetailPage;
