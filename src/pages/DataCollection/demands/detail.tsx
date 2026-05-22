import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Spin, Empty, Button, Timeline, message, Typography,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { demandApi, TrackingDemandDTO } from '@/api/DataCollectionApi';
import { ApiResponse } from '@/api/Response';

const { Title } = Typography;

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

interface OperationLog {
  id: string;
  action: string;
  operator: string;
  operateTime: string;
  remark: string;
}

const DemandDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<TrackingDemandDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    demandApi.getById(id)
      .then((res) => {
        const r = res as unknown as ApiResponse<TrackingDemandDTO>;
        if (r.code === 200 && r.data) {
          setDetail(r.data);
        }
      })
      .catch(() => message.error('获取需求详情失败'))
      .finally(() => setLoading(false));

    // Mock operation logs
    setLogLoading(true);
    setTimeout(() => {
      setLogs([
        { id: '1', action: '创建需求', operator: 'zhangsan', operateTime: '2026-05-20 10:00:00', remark: '创建埋点需求' },
        { id: '2', action: '编辑需求', operator: 'zhangsan', operateTime: '2026-05-21 14:30:00', remark: '更新业务目标' },
        { id: '3', action: '提交设计', operator: 'lisi', operateTime: '2026-05-22 09:00:00', remark: '提交设计方案' },
      ]);
      setLogLoading(false);
    }, 400);
  }, [id]);

  if (!id) {
    return <Empty description="缺少需求 ID" />;
  }

  return (
    <div style={{ padding: '0 8px' }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/data-collection/demands')} style={{ marginBottom: 16 }}>
        返回列表
      </Button>
      <Title level={4} style={{ marginBottom: 16 }}>需求详情</Title>

      <Spin spinning={loading}>
        {detail ? (
          <>
            <Card title="基本信息" style={{ marginBottom: 16 }}>
              <Descriptions column={2}>
                <Descriptions.Item label="需求编号">{detail.demandCode}</Descriptions.Item>
                <Descriptions.Item label="需求名称">{detail.demandName}</Descriptions.Item>
                <Descriptions.Item label="业务域">{detail.businessDomain}</Descriptions.Item>
                <Descriptions.Item label="产品线">{detail.productLine}</Descriptions.Item>
                <Descriptions.Item label="端类型">
                  {detail.terminalTypes?.map((t) => (
                    <Tag key={t}>{terminalTypeMap[t] || t}</Tag>
                  ))}
                </Descriptions.Item>
                <Descriptions.Item label="优先级">
                  <Tag color={priorityTagMap[detail.priority]?.color}>{priorityTagMap[detail.priority]?.label}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={statusTagMap[detail.status]?.color}>{statusTagMap[detail.status]?.label}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="产品负责人">{detail.productOwner}</Descriptions.Item>
                <Descriptions.Item label="技术负责人">{detail.techOwner || '-'}</Descriptions.Item>
                <Descriptions.Item label="测试负责人">{detail.testOwner || '-'}</Descriptions.Item>
                <Descriptions.Item label="数据负责人">{detail.dataOwner}</Descriptions.Item>
                <Descriptions.Item label="期望上线时间">{detail.expectedReleaseDate || '-'}</Descriptions.Item>
                <Descriptions.Item label="业务目标" span={2}>{detail.businessGoal}</Descriptions.Item>
                <Descriptions.Item label="分析目标" span={2}>{detail.analysisGoal}</Descriptions.Item>
                <Descriptions.Item label="创建时间">{detail.createdAt}</Descriptions.Item>
                <Descriptions.Item label="更新时间">{detail.updatedAt}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="关联方案" style={{ marginBottom: 16 }}>
              <Empty description="暂无关联方案" />
            </Card>

            <Card title="操作记录">
              <Spin spinning={logLoading}>
                <Timeline
                  items={logs.map((log) => ({
                    children: (
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{log.action}</div>
                        <div style={{ color: '#888', fontSize: 12 }}>
                          {log.operator} · {log.operateTime}
                        </div>
                        <div>{log.remark}</div>
                      </div>
                    ),
                  }))}
                />
              </Spin>
            </Card>
          </>
        ) : (
          <Empty description="未找到需求详情" />
        )}
      </Spin>
    </div>
  );
};

export default DemandDetailPage;
