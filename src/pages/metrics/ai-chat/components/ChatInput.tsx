import React, { useRef, useEffect } from 'react';
import { Input, Button } from 'antd';
import { SendOutlined, LoadingOutlined } from '@ant-design/icons';

interface ChatInputProps {
  onSend: (query: string) => void;
  loading: boolean;
  value: string;
  onChange: (value: string) => void;
}

const QUICK_QUESTIONS = [
  '帮我创建一个原子指标',
  '帮我创建一个派生指标',
  '帮我创建一个维度',
  '指标定义有哪些规范',
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

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="metric-ai-chat-input-wrapper">
      {/* 快捷提问 */}
      <div className="metric-ai-chat-quick-bar">
        {QUICK_QUESTIONS.map((q) => (
          <button
            key={q}
            className="metric-ai-chat-quick-pill"
            onClick={() => handleQuickClick(q)}
            disabled={loading}
          >
            {q}
          </button>
        ))}
      </div>

      {/* 输入框 */}
      <div className="metric-ai-chat-input-box">
        <Input.TextArea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入自然语言描述，例如：帮我创建一个统计每日新增用户数的原子指标"
          autoSize={{ minRows: 1, maxRows: 5 }}
          disabled={loading}
          className="metric-ai-chat-textarea"
        />
        <Button
          type="primary"
          className="metric-ai-chat-send-btn"
          icon={loading ? <LoadingOutlined /> : <SendOutlined />}
          onClick={handleSend}
          disabled={!value.trim() || loading}
        >
          {loading ? '思考中' : '发送'}
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;