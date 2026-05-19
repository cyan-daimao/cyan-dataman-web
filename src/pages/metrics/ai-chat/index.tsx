import React, { useRef, useEffect } from 'react';
import { Spin, Button, message, Avatar, Typography, Space } from 'antd';
import {
  RobotOutlined,
  UserOutlined,
  RedoOutlined,
  LoadingOutlined,
  ToolOutlined,
  CompassOutlined,
  AppstoreOutlined,
  TagOutlined,
  NumberOutlined,
  BookOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useMetricAiChatStore, AiChatMessage } from './store';
import ChatInput from './components/ChatInput';
import MarkdownRender from './components/MarkdownRender';
import ThinkingChain from './components/ThinkingChain';
import MetricFormActionCard from './components/MetricFormActionCard';
import { stripMetricForm } from './types';
import './index.less';

const { Text } = Typography;

/**
 * 单条消息渲染组件
 */
const MessageItem: React.FC<{ msg: AiChatMessage }> = ({ msg }) => {
  const isUser = msg.role === 'user';

  // 提取思考过程（如果有）
  const thinkMatch = msg.content.match(/<think>([\s\S]*?)<\/think>/);
  const thinkContent = thinkMatch ? thinkMatch[1].trim() : undefined;
  // 同时移除 metric_form 标签（操作卡片会单独展示）
  const displayContent = thinkContent
    ? stripMetricForm(msg.content.replace(/<think>[\s\S]*?<\/think>/, '').trim())
    : stripMetricForm(msg.content);

  return (
    <div className={`metric-ai-chat-msg ${isUser ? 'metric-ai-chat-msg-user' : 'metric-ai-chat-msg-ai'}`}>
      {/* 头像 */}
      <div className="metric-ai-chat-msg-avatar">
        {isUser ? (
          <Avatar icon={<UserOutlined />} className="metric-ai-chat-avatar-user" />
        ) : (
          <div className="metric-ai-chat-avatar-ai">
            <RobotOutlined />
          </div>
        )}
      </div>

      {/* 消息体 */}
      <div className="metric-ai-chat-msg-body">
        {!isUser && <div className="metric-ai-chat-msg-label">AI 助手</div>}

        <div className={`metric-ai-chat-msg-bubble ${isUser ? 'metric-ai-chat-bubble-user' : 'metric-ai-chat-bubble-ai'}`}>
          {/* 思考过程 */}
          {!isUser && thinkContent && <ThinkingChain content={thinkContent} />}

          {/* 内容 */}
          {msg.loading && !msg.content ? (
            <Space>
              <Spin indicator={<LoadingOutlined spin />} size="small" />
              <Text type="secondary">正在思考...</Text>
            </Space>
          ) : isUser ? (
            <Text>{msg.content}</Text>
          ) : (
            <MarkdownRender content={displayContent} />
          )}

          {/* 工具调用中 */}
          {msg.loading && msg.content && (
            <div className="metric-ai-chat-tool-hint">
              <ToolOutlined spin />
              <span>正在处理...</span>
            </div>
          )}

          {/* 错误 */}
          {msg.error && (
            <div className="metric-ai-chat-error-box">
              <Text type="danger">{msg.error}</Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * 欢迎页示例卡片
 */
const EXAMPLE_CARDS = [
  { icon: <NumberOutlined />, title: '创建原子指标', desc: '帮我创建一个统计每日新增用户数的原子指标' },
  { icon: <AppstoreOutlined />, title: '创建派生指标', desc: '帮我创建一个基于销售额的环比增长率派生指标' },
  { icon: <TagOutlined />, title: '创建维度', desc: '帮我创建一个城市维度的定义' },
  { icon: <BookOutlined />, title: '定义规范', desc: '指标定义有哪些规范和注意事项' },
];

/**
 * AI 创建对话主页面
 */
const MetricAiChatPage: React.FC = () => {
  const navigate = useNavigate();
  const messages = useMetricAiChatStore((s) => s.messages);
  const isLoading = useMetricAiChatStore((s) => s.isLoading);
  const inputValue = useMetricAiChatStore((s) => s.inputValue);
  const pendingFormValues = useMetricAiChatStore((s) => s.pendingFormValues);
  const sendMessage = useMetricAiChatStore((s) => s.sendMessage);
  const setInputValue = useMetricAiChatStore((s) => s.setInputValue);
  const resetChat = useMetricAiChatStore((s) => s.resetChat);
  const setPendingFormValues = useMetricAiChatStore((s) => s.setPendingFormValues);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingFormValues]);

  const handleSend = (query: string) => {
    sendMessage(query);
  };

  const handleReset = () => {
    resetChat();
    message.success('对话已重置');
  };

  const handleNavigateToDefinition = () => {
    if (!pendingFormValues) return;
    navigate('/metrics/definition', {
      state: {
        aiCreate: {
          metricType: pendingFormValues.metricType,
          initialValues: pendingFormValues,
        },
      },
    });
  };

  const handleCancelPreview = () => {
    setPendingFormValues(null);
  };

  return (
    <div className="metric-ai-chat-page">
      <div className="metric-ai-chat-content">
        {/* 消息列表 */}
        <div className="metric-ai-chat-messages">
          {messages.length === 0 && !pendingFormValues ? (
            <div className="metric-ai-chat-welcome">
              {/* Logo 区域 */}
              <div className="metric-ai-chat-welcome-brand">
                <div className="metric-ai-chat-welcome-icon">
                  <CompassOutlined />
                </div>
                <h1 className="metric-ai-chat-welcome-title">AI 智能创建指标与维度</h1>
                <p className="metric-ai-chat-welcome-subtitle">
                  通过自然语言对话完成指标和维度的创建，AI 助手将引导您完成定义过程
                </p>
              </div>

              {/* 示例卡片 */}
              <div className="metric-ai-chat-welcome-cards">
                {EXAMPLE_CARDS.map((card) => (
                  <div
                    key={card.title}
                    className="metric-ai-chat-welcome-card"
                    onClick={() => handleSend(card.desc)}
                  >
                    <div className="metric-ai-chat-welcome-card-icon">{card.icon}</div>
                    <div className="metric-ai-chat-welcome-card-title">{card.title}</div>
                    <div className="metric-ai-chat-welcome-card-desc">{card.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="metric-ai-chat-msg-list">
              {messages.map((msg) => (
                <div key={msg.id} className="metric-ai-chat-msg-outer">
                  <MessageItem msg={msg} />
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* 指标表单操作卡片 */}
          {pendingFormValues && (
            <div className="metric-ai-chat-msg-list">
              <div className="metric-ai-chat-msg-outer">
                <MetricFormActionCard
                  formValues={pendingFormValues}
                  onNavigate={handleNavigateToDefinition}
                  onCancel={handleCancelPreview}
                />
              </div>
            </div>
          )}
        </div>

        {/* 底部输入区 */}
        <div className="metric-ai-chat-footer">
          <div className="metric-ai-chat-footer-inner">
            {/* 工具栏 */}
            <div className="metric-ai-chat-footer-toolbar">
              <Button
                type="text"
                size="small"
                icon={<RedoOutlined />}
                onClick={handleReset}
                disabled={isLoading || messages.length === 0}
                className="metric-ai-chat-reset-btn"
              >
                新对话
              </Button>
            </div>
            <ChatInput
              value={inputValue}
              onChange={setInputValue}
              onSend={handleSend}
              loading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricAiChatPage;
