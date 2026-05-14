import React, { useRef, useEffect, useState } from 'react';
import { Spin, Button, message, Avatar, Typography, Space, Popconfirm } from 'antd';
import {
  RobotOutlined,
  UserOutlined,
  SaveOutlined,
  RedoOutlined,
  LoadingOutlined,
  ToolOutlined,
  CompassOutlined,
  LineChartOutlined,
  BarChartOutlined,
  TableOutlined,
  NumberOutlined,
  PlusOutlined,
  DeleteOutlined,
  MessageOutlined,
  HistoryOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
} from '@ant-design/icons';
import { useChatBIStore, ChatMessage } from './store';
import ChatInput from './components/ChatInput';
import QueryLogicCard from './components/QueryLogicCard';
import ChartRenderer from './components/ChartRenderer';
import SaveChartModal from './components/SaveChartModal';
import MarkdownRender from './components/MarkdownRender';
import ThinkingChain from './components/ThinkingChain';
import './index.less';

const { Text } = Typography;

/**
 * 单条消息渲染组件
 */
const MessageItem: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
  const isUser = msg.role === 'user';

  // 提取思考过程（如果有）
  const thinkMatch = msg.content.match(/<tool_call>([\s\S]*?)<\/think>/);
  const thinkContent = thinkMatch ? thinkMatch[1].trim() : undefined;
  const displayContent = thinkContent
    ? msg.content.replace(/<tool_call>[\s\S]*?<\/think>/, '').trim()
    : msg.content;

  return (
    <div className={`chatbi-msg ${isUser ? 'chatbi-msg-user' : 'chatbi-msg-ai'}`}>
      {/* 头像 */}
      <div className="chatbi-msg-avatar">
        {isUser ? (
          <Avatar icon={<UserOutlined />} className="chatbi-avatar-user" />
        ) : (
          <div className="chatbi-avatar-ai">
            <RobotOutlined />
          </div>
        )}
      </div>

      {/* 消息体 */}
      <div className="chatbi-msg-body">
        {!isUser && <div className="chatbi-msg-label">ChatBI</div>}

        <div className={`chatbi-msg-bubble ${isUser ? 'chatbi-bubble-user' : 'chatbi-bubble-ai'}`}>
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
            <div className="chatbi-tool-hint">
              <ToolOutlined spin />
              <span>正在查询数据...</span>
            </div>
          )}

          {/* 错误 */}
          {msg.error && (
            <div className="chatbi-error-box">
              <Text type="danger">{msg.error}</Text>
            </div>
          )}

          {/* 取数逻辑 */}
          {msg.queryLogic && <QueryLogicCard queryLogic={msg.queryLogic} sql={msg.sql} />}

          {/* 图表 */}
          {msg.chartData && msg.chartType && (
            <div className="chatbi-chart-wrap">
              <ChartRenderer chartData={msg.chartData} chartType={msg.chartType} dsl={msg.dsl} />
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
  { icon: <BarChartOutlined />, title: '销售排名', desc: '近30天各省份销售额排名' },
  { icon: <LineChartOutlined />, title: '趋势分析', desc: '对比本月和上月的新增用户数' },
  { icon: <NumberOutlined />, title: '指标卡', desc: '本月总销售额' },
  { icon: <TableOutlined />, title: '数据明细', desc: 'Q1各部门费用占比' },
];

/**
 * 历史对话侧边栏
 */
const ConversationSidebar: React.FC = () => {
  const conversations = useChatBIStore((s) => s.conversations);
  const activeConversationId = useChatBIStore((s) => s.activeConversationId);
  const switchConversation = useChatBIStore((s) => s.switchConversation);
  const deleteConversation = useChatBIStore((s) => s.deleteConversation);
  const newConversation = useChatBIStore((s) => s.newConversation);

  return (
    <div className="chatbi-sidebar">
      <div className="chatbi-sidebar-header">
        <span className="chatbi-sidebar-title">
          <HistoryOutlined style={{ marginRight: 6 }} />
          历史对话
        </span>
        <Button
          type="text"
          size="small"
          icon={<PlusOutlined />}
          className="chatbi-sidebar-new-btn"
          onClick={newConversation}
        >
          新对话
        </Button>
      </div>
      <div className="chatbi-sidebar-list">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={`chatbi-sidebar-item ${conv.id === activeConversationId ? 'chatbi-sidebar-item-active' : ''}`}
            onClick={() => switchConversation(conv.id)}
          >
            <MessageOutlined className="chatbi-sidebar-item-icon" />
            <span className="chatbi-sidebar-item-title">{conv.title}</span>
            <Popconfirm
              title="确定删除此对话？"
              onConfirm={(e) => {
                e?.stopPropagation();
                deleteConversation(conv.id);
              }}
              onCancel={(e) => e?.stopPropagation()}
              okText="删除"
              cancelText="取消"
            >
              <DeleteOutlined
                className="chatbi-sidebar-item-delete"
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          </div>
        ))}
        {conversations.length === 0 && (
          <div className="chatbi-sidebar-empty">
            <Text type="secondary">暂无对话记录</Text>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * ChatBI 主页面
 */
const ChatBIPage: React.FC = () => {
  const messages = useChatBIStore((s) => s.messages);
  const isLoading = useChatBIStore((s) => s.isLoading);
  const inputValue = useChatBIStore((s) => s.inputValue);
  const sendMessage = useChatBIStore((s) => s.sendMessage);
  const setInputValue = useChatBIStore((s) => s.setInputValue);
  const resetChat = useChatBIStore((s) => s.resetChat);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [saveTargetMsg, setSaveTargetMsg] = useState<ChatMessage | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (query: string) => {
    sendMessage(query);
  };

  const handleSaveChart = (msg: ChatMessage) => {
    if (!msg.dsl) {
      message.warning('当前消息没有可保存的图表');
      return;
    }
    setSaveTargetMsg(msg);
    setSaveModalVisible(true);
  };

  const handleReset = () => {
    resetChat();
    message.success('新对话已创建');
  };

  return (
    <div className="chatbi-page">
      {/* 历史对话侧边栏 */}
      {sidebarVisible && <ConversationSidebar />}

      <div className="chatbi-main">
        {/* 侧边栏切换按钮 */}
        <div className="chatbi-sidebar-toggle">
          <Button
            type="text"
            size="small"
            icon={sidebarVisible ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
            onClick={() => setSidebarVisible(!sidebarVisible)}
            className="chatbi-toggle-btn"
          />
        </div>

        <div className="chatbi-content">
          {/* 消息列表 */}
          <div className="chatbi-messages">
            {messages.length === 0 ? (
              <div className="chatbi-welcome">
                {/* Logo 区域 */}
                <div className="chatbi-welcome-brand">
                  <div className="chatbi-welcome-icon">
                    <CompassOutlined />
                  </div>
                  <h1 className="chatbi-welcome-title">ChatBI 智能数据分析</h1>
                  <p className="chatbi-welcome-subtitle">
                    通过自然语言对话完成数据分析，支持多轮追问、图表渲染、一键保存
                  </p>
                </div>

                {/* 示例卡片 */}
                <div className="chatbi-welcome-cards">
                  {EXAMPLE_CARDS.map((card) => (
                    <div
                      key={card.title}
                      className="chatbi-welcome-card"
                      onClick={() => handleSend(card.desc)}
                    >
                      <div className="chatbi-welcome-card-icon">{card.icon}</div>
                      <div className="chatbi-welcome-card-title">{card.title}</div>
                      <div className="chatbi-welcome-card-desc">{card.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="chatbi-msg-list">
                {messages.map((msg) => (
                  <div key={msg.id} className="chatbi-msg-outer">
                    <MessageItem msg={msg} />
                    {!msg.loading && msg.role === 'assistant' && msg.saveable && msg.dsl && (
                      <div className="chatbi-msg-actions-outer">
                        <Button
                          type="link"
                          size="small"
                          icon={<SaveOutlined />}
                          className="chatbi-save-btn"
                          onClick={() => handleSaveChart(msg)}
                        >
                          保存为图表
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* 底部输入区 */}
          <div className="chatbi-footer">
            <div className="chatbi-footer-inner">
              {/* 工具栏 */}
              <div className="chatbi-footer-toolbar">
                <Button
                  type="text"
                  size="small"
                  icon={<RedoOutlined />}
                  onClick={handleReset}
                  disabled={isLoading}
                  className="chatbi-reset-btn"
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

      <SaveChartModal
        visible={saveModalVisible}
        messageData={saveTargetMsg}
        onCancel={() => {
          setSaveModalVisible(false);
          setSaveTargetMsg(null);
        }}
        onSuccess={() => {
          setSaveModalVisible(false);
          setSaveTargetMsg(null);
        }}
      />
    </div>
  );
};

export default ChatBIPage;