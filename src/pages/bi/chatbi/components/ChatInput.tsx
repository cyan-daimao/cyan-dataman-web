import React, { useRef, useEffect } from 'react';
import { Input, Button, Space, Tag } from 'antd';
import { SendOutlined, LoadingOutlined } from '@ant-design/icons';

interface ChatInputProps {
  onSend: (query: string) => void;
  loading: boolean;
  value: string;
  onChange: (value: string) => void;
}

const QUICK_QUESTIONS = [
  '近7天销售额趋势',
  '各渠道DAU对比',
  '本月销售额TOP10',
  'Q1各部门费用占比',
];

const ChatInput: React.FC<ChatInputProps> = ({ onSend, loading, value, onChange }) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!value.trim() || loading) return;
    onSend(value.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickClick = (q: string) => {
    onChange(q);
    onSend(q);
  };

  // 自动聚焦
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="chatbi-input-wrapper">
      <div className="chatbi-quick-questions">
        <Space wrap size={8}>
          <span style={{ color: '#999', fontSize: 12 }}>快捷提问：</span>
          {QUICK_QUESTIONS.map((q) => (
            <Tag
              key={q}
              color="processing"
              style={{ cursor: 'pointer' }}
              onClick={() => handleQuickClick(q)}
            >
              {q}
            </Tag>
          ))}
        </Space>
      </div>
      <div className="chatbi-input-area">
        <Input.TextArea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入自然语言提问，例如：近30天各省份销售额排名"
          autoSize={{ minRows: 1, maxRows: 4 }}
          disabled={loading}
          style={{ borderRadius: 8, resize: 'none' }}
        />
        <Button
          type="primary"
          icon={loading ? <LoadingOutlined /> : <SendOutlined />}
          onClick={handleSend}
          disabled={!value.trim() || loading}
          style={{ marginLeft: 8, height: 'auto', borderRadius: 8 }}
        >
          {loading ? '分析中' : '发送'}
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;
