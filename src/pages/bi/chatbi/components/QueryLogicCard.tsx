import React, { useState } from 'react';
import { Card, Tag, Button, Space } from 'antd';
import {
  BarChartOutlined,
  PartitionOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import { QueryLogic } from '../store';
import { MetricBiAnalysisCmd } from '@/api/DatabiApi';

interface QueryLogicCardProps {
  queryLogic: QueryLogic;
  sql?: string;
  dsl?: MetricBiAnalysisCmd;
}

const QueryLogicCard: React.FC<QueryLogicCardProps> = ({ queryLogic, sql, dsl }) => {
  const [showSql, setShowSql] = useState(false);
  const [showDsl, setShowDsl] = useState(false);

  return (
    <Card
      size="small"
      className="chatbi-query-card"
      style={{ marginTop: 16 }}
    >
      <div className="chatbi-query-title">
        <PartitionOutlined />
        <span>取数逻辑</span>
      </div>

      <Space direction="vertical" size={6} style={{ width: '100%' }}>
        {queryLogic.metrics.length > 0 && (
          <div className="chatbi-query-row">
            <Tag color="processing" className="chatbi-query-tag">
              <BarChartOutlined /> 指标
            </Tag>
            <span className="chatbi-query-value">
              {queryLogic.metrics.map((m) => m.label).join('、')}
            </span>
          </div>
        )}

        {queryLogic.dimensions.length > 0 && (
          <div className="chatbi-query-row">
            <Tag color="cyan" className="chatbi-query-tag">
              <PartitionOutlined /> 维度
            </Tag>
            <span className="chatbi-query-value">
              {queryLogic.dimensions.map((d) => d.label).join('、')}
            </span>
          </div>
        )}

        {queryLogic.filters.length > 0 && (
          <div className="chatbi-query-row">
            <Tag color="warning" className="chatbi-query-tag">
              <FilterOutlined /> 过滤
            </Tag>
            <span className="chatbi-query-value">
              {queryLogic.filters.map((f) => f.value).join('；')}
            </span>
          </div>
        )}

        {queryLogic.orders.length > 0 && (
          <div className="chatbi-query-row">
            <Tag color="purple" className="chatbi-query-tag">
              <SortAscendingOutlined /> 排序
            </Tag>
            <span className="chatbi-query-value">
              {queryLogic.orders.map((o) => `${o.label} ${o.value}`).join('、')}
            </span>
          </div>
        )}

        {queryLogic.limit && (
          <div className="chatbi-query-row">
            <Tag className="chatbi-query-tag">限制</Tag>
            <span className="chatbi-query-value">TOP {queryLogic.limit}</span>
          </div>
        )}
      </Space>

      <div style={{ marginTop: 12, display: 'flex', gap: 16 }}>
        {dsl && (
          <Button
            type="link"
            size="small"
            icon={showDsl ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => setShowDsl(!showDsl)}
            style={{ padding: 0, fontSize: 12 }}
          >
            {showDsl ? '隐藏 DSL' : '查看 DSL'}
          </Button>
        )}
        {sql && (
          <Button
            type="link"
            size="small"
            icon={showSql ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => setShowSql(!showSql)}
            style={{ padding: 0, fontSize: 12 }}
          >
            {showSql ? '隐藏 SQL' : '查看 SQL'}
          </Button>
        )}
      </div>

      {showDsl && dsl && (
        <pre className="chatbi-sql-block">
          <code>{JSON.stringify(dsl, null, 2)}</code>
        </pre>
      )}

      {showSql && sql && (
        <pre className="chatbi-sql-block">
          <code>{sql}</code>
        </pre>
      )}
    </Card>
  );
};

export default QueryLogicCard;
