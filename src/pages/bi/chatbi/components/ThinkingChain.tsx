import React, { useState } from 'react';
import { Button, Space } from 'antd';
import { ThunderboltOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';

interface ThinkingChainProps {
  content?: string;
}

const ThinkingChain: React.FC<ThinkingChainProps> = ({ content }) => {
  const [expanded, setExpanded] = useState(false);

  if (!content) return null;

  return (
    <div
      style={{
        marginBottom: 12,
        background: 'linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%)',
        borderRadius: 12,
        border: '1px solid #e8edff',
        overflow: 'hidden',
      }}
    >
      <Button
        type="text"
        size="small"
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          justifyContent: 'flex-start',
          padding: '8px 12px',
          height: 'auto',
          color: '#4F6DF5',
          fontSize: 13,
        }}
      >
        <Space>
          <ThunderboltOutlined />
          <span style={{ fontWeight: 500 }}>思考过程</span>
          {expanded ? <DownOutlined style={{ fontSize: 10 }} /> : <RightOutlined style={{ fontSize: 10 }} />}
        </Space>
      </Button>
      {expanded && (
        <div
          style={{
            padding: '0 16px 12px',
            fontSize: 13,
            color: '#666',
            lineHeight: 1.7,
            fontStyle: 'italic',
            borderTop: '1px dashed #e0e6ff',
            margin: '0 12px',
            paddingTop: 8,
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default ThinkingChain;
