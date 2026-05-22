import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Spin, Empty, Button, Table, Typography,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import {
  propertyApi, TrackingPropertyDTO,
} from '@/api/DataCollectionApi';
import { ApiResponse } from '@/api/Response';

const { Title } = Typography;

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

interface EventUsage {
  id: string;
  eventCode: string;
  eventName: string;
  isRequired: boolean;
}

const PropertyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<TrackingPropertyDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<EventUsage[]>([]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    propertyApi.getById(id)
      .then((res) => {
        const r = res as unknown as ApiResponse<TrackingPropertyDTO>;
        if (r.code === 200 && r.data) {
          setDetail(r.data);
        }
      })
      .catch(() => { /* message handled by interceptor */ })
      .finally(() => setLoading(false));

    // Mock usage data
    setEvents([
      { id: '1', eventCode: 'page_view', eventName: '页面浏览', isRequired: true },
      { id: '2', eventCode: 'button_click', eventName: '按钮点击', isRequired: false },
      { id: '3', eventCode: 'order_paid', eventName: '订单支付成功', isRequired: true },
    ]);
  }, [id]);

  const eventColumns = [
    { title: '事件编码', dataIndex: 'eventCode', key: 'eventCode' },
    { title: '事件名称', dataIndex: 'eventName', key: 'eventName' },
    {
      title: '是否必填',
      dataIndex: 'isRequired',
      key: 'isRequired',
      render: (v: boolean) => (v ? <Tag color="red">必填</Tag> : <Tag>选填</Tag>),
    },
  ];

  if (!id) {
    return <Empty description="缺少属性 ID" />;
  }

  return (
    <div style={{ padding: '0 8px' }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/data-collection/properties')} style={{ marginBottom: 16 }}>
        返回列表
      </Button>
      <Title level={4} style={{ marginBottom: 16 }}>属性详情</Title>

      <Spin spinning={loading}>
        {detail ? (
          <>
            <Card title="属性定义" style={{ marginBottom: 16 }}>
              <Descriptions column={2}>
                <Descriptions.Item label="属性编码">{detail.propertyCode}</Descriptions.Item>
                <Descriptions.Item label="属性名称">{detail.propertyName}</Descriptions.Item>
                <Descriptions.Item label="属性类型">{propertyTypeMap[detail.propertyType] || detail.propertyType}</Descriptions.Item>
                <Descriptions.Item label="数据类型">{dataTypeMap[detail.dataType] || detail.dataType}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={statusTagMap[detail.status]?.color}>{statusTagMap[detail.status]?.label}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="版本">V{detail.version}</Descriptions.Item>
                <Descriptions.Item label="是否必填">{detail.isRequired ? <Tag color="red">是</Tag> : <Tag>否</Tag>}</Descriptions.Item>
                <Descriptions.Item label="是否敏感">{detail.isSensitive ? <Tag color="red">是</Tag> : <Tag>否</Tag>}</Descriptions.Item>
                <Descriptions.Item label="安全等级">{detail.securityLevel || '-'}</Descriptions.Item>
                <Descriptions.Item label="最大长度">{detail.maxLength || '-'}</Descriptions.Item>
                <Descriptions.Item label="枚举值" span={2}>
                  {detail.enumValues?.length ? detail.enumValues.map((v) => <Tag key={v}>{v}</Tag>) : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="校验规则" span={2}>{detail.validationRule || '-'}</Descriptions.Item>
                <Descriptions.Item label="标准编码">{detail.standardCode || '-'}</Descriptions.Item>
                <Descriptions.Item label="描述" span={2}>{detail.description || '-'}</Descriptions.Item>
                <Descriptions.Item label="创建时间">{detail.createdAt}</Descriptions.Item>
                <Descriptions.Item label="更新时间">{detail.updatedAt}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="被哪些事件使用">
              <Table
                rowKey="id"
                columns={eventColumns}
                dataSource={events}
                size="small"
                locale={{ emptyText: <Empty description="暂无事件使用该属性" /> }}
              />
            </Card>
          </>
        ) : (
          <Empty description="未找到属性详情" />
        )}
      </Spin>
    </div>
  );
};

export default PropertyDetailPage;
