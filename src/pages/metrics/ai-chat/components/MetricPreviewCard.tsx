import React, { useState } from 'react';
import { Card, Button, Tag, Descriptions, Modal, message } from 'antd';
import {
  CodeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DatabaseOutlined,
  FunctionOutlined,
  CalculatorOutlined,
} from '@ant-design/icons';
import type { MetricDefinitionJSON } from '../types';
import { MetricApi, type PreviewSqlCmd, StatFunc } from '@/api/MetricApi';

interface MetricPreviewCardProps {
  definition: MetricDefinitionJSON;
  onConfirm: () => void;
  onCancel: () => void;
}

const TYPE_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ATOMIC: { label: '原子指标', color: 'blue', icon: <DatabaseOutlined /> },
  DERIVED: { label: '派生指标', color: 'purple', icon: <FunctionOutlined /> },
  COMPOSITE: { label: '复合指标', color: 'orange', icon: <CalculatorOutlined /> },
};

const STAT_FUNC_MAP: Record<string, string> = {
  [StatFunc.SUM]: '求和',
  [StatFunc.AVG]: '平均值',
  [StatFunc.COUNT]: '计数',
  [StatFunc.COUNT_DISTINCT]: '去重计数',
  [StatFunc.MAX]: '最大值',
  [StatFunc.MIN]: '最小值',
};

const MetricPreviewCard: React.FC<MetricPreviewCardProps> = ({ definition, onConfirm, onCancel }) => {
  const [sqlModalOpen, setSqlModalOpen] = useState(false);
  const [sqlContent, setSqlContent] = useState('');
  const [sqlLoading, setSqlLoading] = useState(false);

  const typeInfo = TYPE_MAP[definition.metricType] || { label: definition.metricType, color: 'default', icon: null };

  const handlePreviewSql = async () => {
    setSqlLoading(true);
    try {
      const cmd: PreviewSqlCmd = {
        metricType: definition.metricType as 'ATOMIC' | 'DERIVED' | 'COMPOSITE',
        definitionBody: { ...definition },
      };

      const res = await MetricApi.previewSql(cmd);
      if (res.code === 200 && res.data) {
        setSqlContent(res.data);
        setSqlModalOpen(true);
      } else {
        message.error(res.message || 'SQL 预览失败');
      }
    } catch {
      message.error('SQL 预览请求失败');
    } finally {
      setSqlLoading(false);
    }
  };

  return (
    <>
      <Card
        className="metric-ai-preview-card"
        title={
          <div className="metric-ai-preview-header">
            <Tag color={typeInfo.color} icon={typeInfo.icon} className="metric-ai-preview-type-tag">
              {typeInfo.label}
            </Tag>
            <span className="metric-ai-preview-title">指标定义预览</span>
          </div>
        }
        actions={[
          <Button
            key="sql"
            icon={<CodeOutlined />}
            loading={sqlLoading}
            onClick={handlePreviewSql}
            disabled={definition.metricType === 'COMPOSITE'}
          >
            查看 SQL
          </Button>,
          <Button key="cancel" icon={<CloseCircleOutlined />} onClick={onCancel}>
            取消
          </Button>,
          <Button key="confirm" type="primary" icon={<CheckCircleOutlined />} onClick={onConfirm}>
            确认创建
          </Button>,
        ]}
      >
        <Descriptions column={1} size="small" className="metric-ai-preview-desc">
          <Descriptions.Item label="指标名称">{definition.metricName}</Descriptions.Item>
          <Descriptions.Item label="主题域编码">{definition.subjectCode}</Descriptions.Item>
          <Descriptions.Item label="业务口径">{definition.bizCaliber}</Descriptions.Item>
          {definition.techCaliber && (
            <Descriptions.Item label="技术口径">{definition.techCaliber}</Descriptions.Item>
          )}
          {definition.securityLevel && (
            <Descriptions.Item label="数据密级">
              <Tag color={definition.securityLevel === 'L1' ? 'green' : definition.securityLevel === 'L2' ? 'blue' : 'red'}>
                {definition.securityLevel}
              </Tag>
            </Descriptions.Item>
          )}
          {definition.owner && <Descriptions.Item label="负责人">{definition.owner}</Descriptions.Item>}

          {/* 原子指标字段 */}
          {definition.metricType === 'ATOMIC' && (
            <>
              {definition.statFunc && (
                <Descriptions.Item label="统计函数">
                  {STAT_FUNC_MAP[definition.statFunc] || definition.statFunc}
                </Descriptions.Item>
              )}
              {definition.dsName && <Descriptions.Item label="数据源">{definition.dsName}</Descriptions.Item>}
              {definition.dbName && <Descriptions.Item label="数据库">{definition.dbName}</Descriptions.Item>}
              {definition.tblName && <Descriptions.Item label="数据表">{definition.tblName}</Descriptions.Item>}
              {definition.colName && <Descriptions.Item label="统计字段">{definition.colName}</Descriptions.Item>}
              {definition.filterCondition && definition.filterCondition.length > 0 && (
                <Descriptions.Item label="过滤条件">
                  {definition.filterCondition.map((f, i) => (
                    <Tag key={i} size="small">{f.field} {f.op} {f.value}</Tag>
                  ))}
                </Descriptions.Item>
              )}
            </>
          )}

          {/* 派生指标字段 */}
          {definition.metricType === 'DERIVED' && (
            <>
              {definition.atomicMetricId && (
                <Descriptions.Item label="关联原子指标">{definition.atomicMetricId}</Descriptions.Item>
              )}
              {definition.timePeriodId && (
                <Descriptions.Item label="时间周期">{definition.timePeriodId}</Descriptions.Item>
              )}
              {definition.modifierIds && definition.modifierIds.length > 0 && (
                <Descriptions.Item label="修饰词">{definition.modifierIds.join(', ')}</Descriptions.Item>
              )}
              {definition.dimensionIds && definition.dimensionIds.length > 0 && (
                <Descriptions.Item label="维度">{definition.dimensionIds.join(', ')}</Descriptions.Item>
              )}
              {definition.groupByFields && definition.groupByFields.length > 0 && (
                <Descriptions.Item label="分组字段">
                  {definition.groupByFields.map(g => g.col).join(', ')}
                </Descriptions.Item>
              )}
            </>
          )}

          {/* 复合指标字段 */}
          {definition.metricType === 'COMPOSITE' && (
            <>
              {definition.formula && (
                <Descriptions.Item label="计算公式">
                  <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>
                    {definition.formula}
                  </code>
                </Descriptions.Item>
              )}
              {definition.metricRefs && definition.metricRefs.length > 0 && (
                <Descriptions.Item label="引用指标">{definition.metricRefs.join(', ')}</Descriptions.Item>
              )}
            </>
          )}
        </Descriptions>
      </Card>

      <Modal
        title="SQL 预览"
        open={sqlModalOpen}
        onCancel={() => setSqlModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setSqlModalOpen(false)}>关闭</Button>,
        ]}
        width={720}
      >
        <pre
          style={{
            background: '#1e1e1e',
            color: '#d4d4d4',
            padding: 16,
            borderRadius: 8,
            overflow: 'auto',
            maxHeight: 400,
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          {sqlContent}
        </pre>
      </Modal>
    </>
  );
};

export default MetricPreviewCard;
