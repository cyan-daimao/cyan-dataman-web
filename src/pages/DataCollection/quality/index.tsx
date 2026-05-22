import React, { useEffect, useState } from 'react';
import {
  Card, Table, Button, Space, Tag, message, Typography, Row, Col, Statistic,
} from 'antd';
import { CloseCircleOutlined } from '@ant-design/icons';
import {
  qualityApi, QualityOverviewDTO, TrackingAlertDTO,
} from '@/api/DataCollectionApi';
import { ApiResponse } from '@/api/Response';

const { Title } = Typography;

const statusTagMap: Record<string, { color: string; label: string }> = {
  OPEN: { color: 'error', label: '未关闭' },
  CLOSED: { color: 'success', label: '已关闭' },
};

const alertTypeMap: Record<string, string> = {
  NO_DATA: '断流',
  FAIL_RATE_HIGH: '失败率过高',
  PROPERTY_MISSING: '属性缺失',
};

const alertLevelMap: Record<string, { color: string; label: string }> = {
  INFO: { color: 'blue', label: '信息' },
  WARN: { color: 'orange', label: '警告' },
  ERROR: { color: 'red', label: '错误' },
};

const QualityPage: React.FC = () => {
  const [overview, setOverview] = useState<QualityOverviewDTO[]>([]);
  const [alerts, setAlerts] = useState<TrackingAlertDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewRes, alertRes] = await Promise.all([
        qualityApi.overview({}) as unknown as ApiResponse<QualityOverviewDTO[]>,
        qualityApi.alertPage({ pageNo: 1, pageSize: 50 }) as unknown as ApiResponse<{
          records: TrackingAlertDTO[];
          total: number;
        }>,
      ]);
      if (overviewRes.code === 200 && overviewRes.data) {
        setOverview(overviewRes.data);
      }
      if (alertRes.code === 200 && alertRes.data) {
        setAlerts(alertRes.data.records || []);
      }
    } catch {
      message.error('获取质量数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCloseAlert = async (id: string) => {
    try {
      await qualityApi.closeAlert(id);
      message.success('告警已关闭');
      await fetchData();
    } catch {
      message.error('关闭失败');
    }
  };

  const overviewColumns = [
    { title: '应用', dataIndex: 'appCode', key: 'appCode' },
    { title: '事件', dataIndex: 'eventCode', key: 'eventCode' },
    { title: '总上报量', dataIndex: 'totalCount', key: 'totalCount' },
    { title: '通过', dataIndex: 'passCount', key: 'passCount', render: (v: number) => <span style={{ color: '#52c41a' }}>{v}</span> },
    { title: '警告', dataIndex: 'warnCount', key: 'warnCount', render: (v: number) => <span style={{ color: '#faad14' }}>{v}</span> },
    { title: '失败', dataIndex: 'failCount', key: 'failCount', render: (v: number) => <span style={{ color: '#cf1322' }}>{v}</span> },
    { title: '通过率', dataIndex: 'passRate', key: 'passRate', render: (v: number) => `${(v * 100).toFixed(2)}%` },
  ];

  const alertColumns = [
    { title: '告警类型', dataIndex: 'alertType', key: 'alertType', render: (v: string) => alertTypeMap[v] || v },
    { title: '应用', dataIndex: 'appCode', key: 'appCode' },
    { title: '事件', dataIndex: 'eventCode', key: 'eventCode' },
    { title: '级别', dataIndex: 'alertLevel', key: 'alertLevel', render: (v: string) => <Tag color={alertLevelMap[v]?.color}>{alertLevelMap[v]?.label}</Tag> },
    { title: '信息', dataIndex: 'alertMessage', key: 'alertMessage' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={statusTagMap[v]?.color}>{statusTagMap[v]?.label}</Tag> },
    { title: '触发时间', dataIndex: 'triggeredAt', key: 'triggeredAt' },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: TrackingAlertDTO) => (
        <Space>
          {record.status === 'OPEN' && (
            <Button type="link" size="small" danger icon={<CloseCircleOutlined />} onClick={() => handleCloseAlert(record.id)}>关闭</Button>
          )}
        </Space>
      ),
    },
  ];

  const totalSamples = overview.reduce((sum, o) => sum + (o.totalCount || 0), 0);
  const totalPass = overview.reduce((sum, o) => sum + (o.passCount || 0), 0);
  const totalFail = overview.reduce((sum, o) => sum + (o.failCount || 0), 0);
  const avgPassRate = totalSamples > 0 ? (totalPass / totalSamples * 100).toFixed(2) : '0.00';

  return (
    <div style={{ padding: '0 8px' }}>
      <Title level={4} style={{ marginBottom: 16 }}>质量监控</Title>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card><Statistic title="监控事件数" value={overview.length} /></Card></Col>
        <Col span={6}><Card><Statistic title="今日总上报" value={totalSamples} /></Card></Col>
        <Col span={6}><Card><Statistic title="今日失败" value={totalFail} valueStyle={{ color: '#cf1322' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="平均通过率" value={`${avgPassRate}%`} valueStyle={{ color: '#52c41a' }} /></Card></Col>
      </Row>

      <Card title="事件质量总览" style={{ marginBottom: 16 }}>
        <Table
          rowKey={(record) => `${record.appCode}-${record.eventCode}`}
          columns={overviewColumns}
          dataSource={overview}
          loading={loading}
          size="small"
        />
      </Card>

      <Card title="质量告警">
        <Table
          rowKey="id"
          columns={alertColumns}
          dataSource={alerts}
          loading={loading}
          size="small"
        />
      </Card>
    </div>
  );
};

export default QualityPage;
