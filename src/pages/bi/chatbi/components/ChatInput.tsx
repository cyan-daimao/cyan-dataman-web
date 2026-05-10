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
  '我想看城市用户分布',
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

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="chatbi-input-wrapper">
      {/* 快捷提问 */}
      <div className="chatbi-quick-bar">
        {QUICK_QUESTIONS.map((q) => (
          <button
            key={q}
            className="chatbi-quick-pill"
            onClick={() => handleQuickClick(q)}
            disabled={loading}
          >
            {q}
          </button>
        ))}
      </div>

      {/* 输入框 */}
      <div className="chatbi-input-box">
        <Input.TextArea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入自然语言提问，例如：近30天各省份销售额排名"
          autoSize={{ minRows: 1, maxRows: 5 }}
          disabled={loading}
          className="chatbi-textarea"
        />
        <Button
          type="primary"
          className="chatbi-send-btn"
          icon={loading ? <LoadingOutlined /> : <SendOutlined />}
          onClick={handleSend}
          disabled={!value.trim() || loading}
        >
          {loading ? '分析中' : '发送'}
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;
