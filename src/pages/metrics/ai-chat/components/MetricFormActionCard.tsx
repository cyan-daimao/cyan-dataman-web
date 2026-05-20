import React from 'react';
import { Card, Button, Tag } from 'antd';
import {
  FormOutlined,
  DatabaseOutlined,
  FunctionOutlined,
  CalculatorOutlined,
  ArrowRightOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { MetricFormValues } from '../types';

interface MetricFormActionCardProps {
  formValues: MetricFormValues;
  onNavigate: () => void;
  onCancel: () => void;
}

const TYPE_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ATOMIC: { label: '原子指标', color: 'blue', icon: <DatabaseOutlined /> },
  DERIVED: { label: '派生指标', color: 'purple', icon: <FunctionOutlined /> },
  COMPOSITE: { label: '复合指标', color: 'orange', icon: <CalculatorOutlined /> },
};

const STAT_FUNC_LABEL: Record<string, string> = {
  SUM: '求和',
  AVG: '平均值',
  COUNT: '计数',
  COUNT_DISTINCT: '去重计数',
  MAX: '最大值',
  MIN: '最小值',
};

const MetricFormActionCard: React.FC<MetricFormActionCardProps> = ({ formValues, onNavigate, onCancel }) => {
  const typeInfo = TYPE_MAP[formValues.metricType] || { label: formValues.metricType, color: 'default', icon: null };

  return (
    <Card
      className="metric-ai-form-action-card"
      title={
        <div className="metric-ai-form-action-header">
          <Tag color={typeInfo.color} icon={typeInfo.icon} className="metric-ai-form-action-type-tag">
            {typeInfo.label}
          </Tag>
          <span className="metric-ai-form-action-title">指标创建推荐</span>
        </div>
      }
      actions={[
        <Button key="cancel" icon={<CloseCircleOutlined />} onClick={onCancel}>
          取消
        </Button>,
        <Button key="navigate" type="primary" icon={<FormOutlined />} onClick={onNavigate}>
          完善并保存 <ArrowRightOutlined />
        </Button>,
      ]}
    >
      <div className="metric-ai-form-action-body">
        <div className="metric-ai-form-action-row">
          <span className="metric-ai-form-action-label">指标名称</span>
          <span className="metric-ai-form-action-value">{formValues.metricName}</span>
        </div>
        {formValues.bizCaliber && (
          <div className="metric-ai-form-action-row">
            <span className="metric-ai-form-action-label">业务口径</span>
            <span className="metric-ai-form-action-value text-ellipsis">{formValues.bizCaliber}</span>
          </div>
        )}

        {/* 原子指标摘要 */}
        {formValues.metricType === 'ATOMIC' && formValues.dsSelector && (
          <>
            <div className="metric-ai-form-action-row">
              <span className="metric-ai-form-action-label">数据来源</span>
              <span className="metric-ai-form-action-value">
                {formValues.dsSelector.dbName}.{formValues.dsSelector.tblName}
              </span>
            </div>
            <div className="metric-ai-form-action-row">
              <span className="metric-ai-form-action-label">统计方式</span>
              <span className="metric-ai-form-action-value">
                {formValues.dsSelector.colName}（{STAT_FUNC_LABEL[formValues.statFunc || ''] || formValues.statFunc}）
              </span>
            </div>
          </>
        )}

        {/* 派生指标摘要 */}
        {formValues.metricType === 'DERIVED' && (
          <>
            {formValues.atomicMetricId && (
              <div className="metric-ai-form-action-row">
                <span className="metric-ai-form-action-label">关联原子指标</span>
                <span className="metric-ai-form-action-value">{formValues.atomicMetricId}</span>
              </div>
            )}
            {formValues.timePeriodId && (
              <div className="metric-ai-form-action-row">
                <span className="metric-ai-form-action-label">时间周期</span>
                <span className="metric-ai-form-action-value">{formValues.timePeriodId}</span>
              </div>
            )}
          </>
        )}

        {/* 复合指标摘要 */}
        {formValues.metricType === 'COMPOSITE' && formValues.formula && (
          <div className="metric-ai-form-action-row">
            <span className="metric-ai-form-action-label">计算公式</span>
            <code className="metric-ai-form-action-code">{formValues.formula}</code>
          </div>
        )}
      </div>
    </Card>
  );
};

export default MetricFormActionCard;
