import React, { useEffect, useState } from 'react';
import {
  Card, Statistic, Row, Col, Button, Table, Typography, Tag, Spin,
} from 'antd';
import {
  ProjectOutlined, ThunderboltOutlined, TagOutlined, CloudUploadOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  workbenchApi, WorkbenchSummaryDTO, WorkbenchTodoDTO, WorkbenchQualityRiskDTO,
} from '@/api/DataCollectionApi';
import { ApiResponse } from '@/api/Response';

const { Title } = Typography;

const statusTagMap: Record<string, { color: string; label: string }> = {
  DRAFT: { color: 'default', label: '草稿' },
  REVIEWING: { color: 'orange', label: '评审中' },
  PENDING: { color: 'gold', label: '待处理' },
  PASS: { color: 'success', label: '通过' },
  FAIL: { color: 'error', label: '失败' },
};

const WorkbenchPage: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<WorkbenchSummaryDTO | null>(null);
  const [todos, setTodos] = useState<WorkbenchTodoDTO[]>([]);
  const [risks, setRisks] = useState<WorkbenchQualityRiskDTO[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      workbenchApi.summary() as unknown as ApiResponse<WorkbenchSummaryDTO>,
      workbenchApi.todos() as unknown as ApiResponse<WorkbenchTodoDTO[]>,
      workbenchApi.qualityRisks() as unknown as ApiResponse<WorkbenchQualityRiskDTO[]>,
    ])
      .then(([summaryRes, todosRes, risksRes]) => {
        if (summaryRes.code === 200 && summaryRes.data) {
          setSummary(summaryRes.data);
        }
        if (todosRes.code === 200 && todosRes.data) {
          setTodos(todosRes.data);
        }
        if (risksRes.code === 200 && risksRes.data) {
          setRisks(risksRes.data);
        }
      })
      .catch(() => { /* handled by interceptor */ })
      .finally(() => setLoading(false));
  }, []);

  const quickEntries = [
    { label: '新建埋点需求', path: '/data-collection/demands', color: '#1677ff', icon: <ProjectOutlined /> },
    { label: '新建埋点方案', path: '/data-collection/plans', color: '#52c41a', icon: <ProjectOutlined /> },
    { label: '新建事件', path: '/data-collection/events', color: '#faad14', icon: <ThunderboltOutlined /> },
    { label: '新建属性', path: '/data-collection/properties', color: '#722ed1', icon: <TagOutlined /> },
    { label: 'Debug 控制台', path: '/data-collection/debug', color: '#eb2f96', icon: <CloudUploadOutlined /> },
    { label: '验收中心', path: '/data-collection/acceptance', color: '#13c2c2', icon: <CheckCircleOutlined /> },
  ];

  const todoColumns = [
    { title: '类型', dataIndex: 'todoType', key: 'todoType', render: (v: string) => v === 'PLAN' ? <Tag color="blue">方案</Tag> : <Tag color="purple">验收</Tag> },
    { title: '编号', dataIndex: 'todoCode', key: 'todoCode' },
    { title: '名称', dataIndex: 'todoName', key: 'todoName' },
    { title: '状态', dataIndex: 'todoStatus', key: 'todoStatus', render: (v: string) => <Tag color={statusTagMap[v]?.color}>{statusTagMap[v]?.label}</Tag> },
    { title: '时间', dataIndex: 'todoTime', key: 'todoTime' },
  ];

  const riskColumns = [
    { title: '告警类型', dataIndex: 'alertType', key: 'alertType' },
    { title: '事件', dataIndex: 'eventCode', key: 'eventCode' },
    { title: '级别', dataIndex: 'alertLevel', key: 'alertLevel', render: (v: string) => <Tag color="red">{v}</Tag> },
    { title: '信息', dataIndex: 'alertMessage', key: 'alertMessage' },
    { title: '触发时间', dataIndex: 'triggeredAt', key: 'triggeredAt' },
  ];

  return (
    <div style={{ padding: '0 8px' }}>
      <Title level={4} style={{ marginBottom: 16 }}>采集工作台</Title>

      <Spin spinning={loading}>
        {/* 统计卡片 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card><Statistic title="事件总数" value={summary?.eventCount || 0} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="属性总数" value={summary?.propertyCount || 0} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="方案总数" value={summary?.planCount || 0} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="今日上报量" value={summary?.todaySampleCount || 0} /></Card>
          </Col>
        </Row>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card><Statistic title="今日失败样本" value={summary?.todayFailSampleCount || 0} valueStyle={{ color: '#cf1322' }} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="待评审方案" value={summary?.reviewingPlanCount || 0} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="待验收任务" value={summary?.pendingTaskCount || 0} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="未关闭告警" value={summary?.openAlertCount || 0} valueStyle={{ color: '#cf1322' }} /></Card>
          </Col>
        </Row>

        {/* 快捷入口 */}
        <Card title="快捷入口" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            {quickEntries.map((entry) => (
              <Col span={4} key={entry.label}>
                <Button
                  type="dashed"
                  block
                  style={{ height: 80, color: entry.color, borderColor: entry.color }}
                  icon={entry.icon}
                  onClick={() => navigate(entry.path)}
                >
                  {entry.label}
                </Button>
              </Col>
            ))}
          </Row>
        </Card>

        {/* 待办事项 */}
        <Card title="待办事项" style={{ marginBottom: 16 }}>
          <Table
            rowKey="id"
            columns={todoColumns}
            dataSource={todos}
            size="small"
            pagination={false}
          />
        </Card>

        {/* 质量风险 */}
        <Card title="质量风险">
          <Table
            rowKey="id"
            columns={riskColumns}
            dataSource={risks}
            size="small"
            pagination={false}
          />
        </Card>
      </Spin>
    </div>
  );
};

export default WorkbenchPage;
