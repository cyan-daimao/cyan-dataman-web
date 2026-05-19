import React, { useRef, useEffect } from 'react';
import {
  Spin, Button, message, Avatar, Typography, Space, Tooltip,
} from 'antd';
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
  PlusOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { useMetricAiChatStore, AiChatMessage } from './store';
import ChatInput from './components/ChatInput';
import MarkdownRender from './components/MarkdownRender';
import ThinkingChain from './components/ThinkingChain';
import MetricFormActionCard from './components/MetricFormActionCard';
import MetricDefinitionFormModal from '../definition/components/MetricDefinitionFormModal';
import { MetricType } from '@/api/MetricApi';
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
  const messages = useMetricAiChatStore((s) => s.messages);
  const isLoading = useMetricAiChatStore((s) => s.isLoading);
  const inputValue = useMetricAiChatStore((s) => s.inputValue);
  const pendingFormValues = useMetricAiChatStore((s) => s.pendingFormValues);
  const conversations = useMetricAiChatStore((s) => s.conversations);
  const conversationsLoading = useMetricAiChatStore((s) => s.conversationsLoading);
  const sidebarCollapsed = useMetricAiChatStore((s) => s.sidebarCollapsed);
  const conversationId = useMetricAiChatStore((s) => s.conversationId);

  const sendMessage = useMetricAiChatStore((s) => s.sendMessage);
  const setInputValue = useMetricAiChatStore((s) => s.setInputValue);
  const resetChat = useMetricAiChatStore((s) => s.resetChat);
  const setPendingFormValues = useMetricAiChatStore((s) => s.setPendingFormValues);
  const loadConversations = useMetricAiChatStore((s) => s.loadConversations);
  const loadConversationMessages = useMetricAiChatStore((s) => s.loadConversationMessages);
  const setSidebarCollapsed = useMetricAiChatStore((s) => s.setSidebarCollapsed);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 表单 Modal 状态
  const [formModalVisible, setFormModalVisible] = React.useState(false);
  const [formModalType, setFormModalType] = React.useState<MetricType | null>(null);

  // 首次加载历史对话列表
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

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

  const handleOpenFormModal = () => {
    if (!pendingFormValues) return;
    setFormModalType(pendingFormValues.metricType as MetricType);
    setFormModalVisible(true);
  };

  const handleCancelPreview = () => {
    setPendingFormValues(null);
  };

  const handleFormSuccess = () => {
    setFormModalVisible(false);
    setFormModalType(null);
    setPendingFormValues(null);
    message.success('指标创建成功');
  };

  const handleFormClose = () => {
    setFormModalVisible(false);
    setFormModalType(null);
  };

  const handleSelectConversation = (id: string) => {
    if (id === conversationId) return;
    loadConversationMessages(id);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="metric-ai-chat-page">
      {/* 历史对话侧边栏 */}
      <div className={`metric-ai-chat-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="metric-ai-chat-sidebar-header">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            block
            onClick={handleReset}
            className="metric-ai-chat-new-conv-btn"
          >
            新对话
          </Button>
        </div>
        <div className="metric-ai-chat-sidebar-list">
          {conversationsLoading ? (
            <div className="metric-ai-chat-sidebar-loading">
              <Spin size="small" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="metric-ai-chat-sidebar-empty">
              <MessageOutlined />
              <span>暂无历史对话</span>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`metric-ai-chat-conv-item ${conv.id === conversationId ? 'active' : ''}`}
                onClick={() => handleSelectConversation(conv.id)}
                title={conv.name}
              >
                <MessageOutlined className="metric-ai-chat-conv-icon" />
                <span className="metric-ai-chat-conv-name">{conv.name}</span>
                <span className="metric-ai-chat-conv-time">{formatTime(conv.updatedAt)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 主聊天区域 */}
      <div className="metric-ai-chat-main">
        {/* 顶部工具栏 */}
        <div className="metric-ai-chat-topbar">
          <Tooltip title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}>
            <Button
              type="text"
              icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="metric-ai-chat-sidebar-toggle"
            />
          </Tooltip>
          <span className="metric-ai-chat-topbar-title">AI 智能创建指标与维度</span>
          <Tooltip title="新对话">
            <Button
              type="text"
              icon={<RedoOutlined />}
              onClick={handleReset}
              disabled={isLoading || messages.length === 0}
            />
          </Tooltip>
        </div>

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
                  onNavigate={handleOpenFormModal}
                  onCancel={handleCancelPreview}
                />
              </div>
            </div>
          )}
        </div>

        {/* 底部输入区 */}
        <div className="metric-ai-chat-footer">
          <div className="metric-ai-chat-footer-inner">
            <ChatInput
              value={inputValue}
              onChange={setInputValue}
              onSend={handleSend}
              loading={isLoading}
            />
          </div>
        </div>
      </div>

      {/* 指标定义表单 Modal */}
      <MetricDefinitionFormModal
        visible={formModalVisible}
        metricType={formModalType}
        initialValues={pendingFormValues || undefined}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
};

export default MetricAiChatPage;
