import React, { useState } from 'react';
import { Card, Tag, Button, Space } from 'antd';
import {
  FundOutlined,
  PartitionOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { QueryLogic } from '../store';

interface QueryLogicCardProps {
  queryLogic: QueryLogic;
  sql?: string;
}

const QueryLogicCard: React.FC<QueryLogicCardProps> = ({ queryLogic, sql }) => {
  const [showSql, setShowSql] = useState(false);

  return (
    <Card
      size="small"
      className="chatbi-query-logic-card"
      style={{ marginBottom: 12, background: '#f6f8ff', border: '1px solid #e0e6ff' }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8, color: '#4F6DF5' }}>
        <PartitionOutlined style={{ marginRight: 6 }} />
        取数逻辑
      </div>

      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        {queryLogic.metrics.length > 0 && (
          <div>
            <Tag color="blue" icon={<FundOutlined />}>
              指标
            </Tag>
            <span style={{ marginLeft: 8 }}>
              {queryLogic.metrics.map((m) => m.label).join('、')}
            </span>
          </div>
        )}

        {queryLogic.dimensions.length > 0 && (
          <div>
            <Tag color="cyan" icon={<PartitionOutlined />}>
              维度
            </Tag>
            <span style={{ marginLeft: 8 }}>
              {queryLogic.dimensions.map((d) => d.label).join('、')}
            </span>
          </div>
        )}

        {queryLogic.filters.length > 0 && (
          <div>
            <Tag color="orange" icon={<FilterOutlined />}>
              过滤
            </Tag>
            <span style={{ marginLeft: 8 }}>
              {queryLogic.filters.map((f) => f.value).join('；')}
            </span>
          </div>
        )}

        {queryLogic.orders.length > 0 && (
          <div>
            <Tag color="purple" icon={<SortAscendingOutlined />}>
              排序
            </Tag>
            <span style={{ marginLeft: 8 }}>
              {queryLogic.orders.map((o) => `${o.label} ${o.value}`).join('、')}
            </span>
          </div>
        )}

        {queryLogic.limit && (
          <div>
            <Tag color="default">限制</Tag>
            <span style={{ marginLeft: 8 }}>TOP {queryLogic.limit}</span>
          </div>
        )}
      </Space>

      {sql && (
        <div style={{ marginTop: 12 }}>
          <Button
            type="link"
            size="small"
            icon={showSql ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => setShowSql(!showSql)}
            style={{ padding: 0 }}
          >
            {showSql ? '隐藏 SQL' : '查看 SQL'}
          </Button>
          {showSql && (
            <pre
              style={{
                marginTop: 8,
                padding: 12,
                background: '#1e1e1e',
                color: '#d4d4d4',
                borderRadius: 6,
                fontSize: 12,
                overflowX: 'auto',
                maxHeight: 200,
                overflowY: 'auto',
              }}
            >
              <CodeOutlined style={{ marginRight: 6, color: '#4F6DF5' }} />
              {sql}
            </pre>
          )}
        </div>
      )}
    </Card>
  );
};

export default QueryLogicCard;
