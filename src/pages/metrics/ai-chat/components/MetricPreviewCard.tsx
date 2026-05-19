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
      let definitionBody: Record<string, unknown> = {};
      if (definition.metricType === 'ATOMIC' && definition.atomicExt) {
        definitionBody = {
          statFunc: definition.atomicExt.statFunc,
          dsName: definition.atomicExt.dsName,
          dbName: definition.atomicExt.dbName,
          tblName: definition.atomicExt.tblName,
          colName: definition.atomicExt.colName,
          filterCondition: definition.atomicExt.filterCondition || [],
        };
      } else if (definition.metricType === 'DERIVED' && definition.derivedExt) {
        definitionBody = {
          atomicMetricId: definition.derivedExt.atomicMetricId,
          timePeriodId: definition.derivedExt.timePeriodId,
          modifierIds: definition.derivedExt.modifierIds || [],
          dimensionIds: definition.derivedExt.dimensionIds || [],
          groupByFields: definition.derivedExt.groupByFields || [],
        };
      } else if (definition.metricType === 'COMPOSITE' && definition.compositeExt) {
        definitionBody = {
          formula: definition.compositeExt.formula,
          metricRefs: definition.compositeExt.metricRefs,
        };
      }

      const cmd: PreviewSqlCmd = {
        metricType: definition.metricType as 'ATOMIC' | 'DERIVED' | 'COMPOSITE',
        definitionBody,
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

  const renderAtomicDetails = () => {
    if (!definition.atomicExt) return null;
    const ext = definition.atomicExt;
    return (
      <>
        <Descriptions.Item label="统计函数">{STAT_FUNC_MAP[ext.statFunc] || ext.statFunc}</Descriptions.Item>
        <Descriptions.Item label="数据源">{ext.dsName}</Descriptions.Item>
        <Descriptions.Item label="数据库">{ext.dbName}</Descriptions.Item>
        <Descriptions.Item label="数据表">{ext.tblName}</Descriptions.Item>
        <Descriptions.Item label="统计字段">{ext.colName}</Descriptions.Item>
        {ext.filterCondition && ext.filterCondition.length > 0 && (
          <Descriptions.Item label="过滤条件">
            {ext.filterCondition.map((f, i) => (
              <Tag key={i} size="small">{f.field} {f.op} {f.value}</Tag>
            ))}
          </Descriptions.Item>
        )}
      </>
    );
  };

  const renderDerivedDetails = () => {
    if (!definition.derivedExt) return null;
    const ext = definition.derivedExt;
    return (
      <>
        <Descriptions.Item label="关联原子指标">{ext.atomicMetricId}</Descriptions.Item>
        <Descriptions.Item label="时间周期">{ext.timePeriodId}</Descriptions.Item>
        {ext.modifierIds && ext.modifierIds.length > 0 && (
          <Descriptions.Item label="修饰词">{ext.modifierIds.join(', ')}</Descriptions.Item>
        )}
        {ext.dimensionIds && ext.dimensionIds.length > 0 && (
          <Descriptions.Item label="维度">{ext.dimensionIds.join(', ')}</Descriptions.Item>
        )}
        {ext.groupByFields && ext.groupByFields.length > 0 && (
          <Descriptions.Item label="分组字段">{ext.groupByFields.map(g => g.col).join(', ')}</Descriptions.Item>
        )}
      </>
    );
  };

  const renderCompositeDetails = () => {
    if (!definition.compositeExt) return null;
    const ext = definition.compositeExt;
    return (
      <>
        <Descriptions.Item label="计算公式">
          <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>{ext.formula}</code>
        </Descriptions.Item>
        <Descriptions.Item label="引用指标">{ext.metricRefs.join(', ')}</Descriptions.Item>
      </>
    );
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
          {definition.metricType === 'ATOMIC' && renderAtomicDetails()}
          {definition.metricType === 'DERIVED' && renderDerivedDetails()}
          {definition.metricType === 'COMPOSITE' && renderCompositeDetails()}
        </Descriptions>
      </Card>

      <Modal
        title="SQL 预览"
        open={sqlModalOpen}
        onCancel={() => setSqlModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setSqlModalOpen(false)}>
            关闭
          </Button>,
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
