import React, { useRef, useEffect, useState } from 'react';
import { Spin, Button, message, Avatar, Typography, Space, Divider } from 'antd';
import {
  RobotOutlined,
  UserOutlined,
  SaveOutlined,
  RedoOutlined,
  LoadingOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { useChatBIStore, ChatMessage } from './store';
import ChatInput from './components/ChatInput';
import QueryLogicCard from './components/QueryLogicCard';
import ChartRenderer from './components/ChartRenderer';
import SaveChartModal from './components/SaveChartModal';
import './index.less';

const { Text } = Typography;

/**
 * 单条消息渲染组件
 */
const MessageItem: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
  const isUser = msg.role === 'user';

  return (
    <div className={`chatbi-message ${isUser ? 'chatbi-message-user' : 'chatbi-message-assistant'}`}>
      <div className="chatbi-message-avatar">
        <Avatar
          icon={isUser ? <UserOutlined /> : <RobotOutlined />}
          style={{
            background: isUser ? '#4F6DF5' : '#f0f0f0',
            color: isUser ? '#fff' : '#666',
          }}
        />
      </div>
      <div className="chatbi-message-body">
        <div className="chatbi-message-role">{isUser ? '我' : 'ChatBI'}</div>
        <div className="chatbi-message-content">
          {msg.loading && !msg.content ? (
            <Space>
              <Spin indicator={<LoadingOutlined spin />} size="small" />
              <Text type="secondary">正在思考...</Text>
            </Space>
          ) : (
            <Text style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</Text>
          )}

          {/* 工具调用中提示 */}
          {msg.loading && msg.content && (
            <div style={{ marginTop: 8 }}>
              <Space>
                <ToolOutlined spin style={{ color: '#4F6DF5' }} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  正在分析数据...
                </Text>
              </Space>
            </div>
          )}

          {/* 错误提示 */}
          {msg.error && (
            <div className="chatbi-message-error">
              <Text type="danger">{msg.error}</Text>
            </div>
          )}

          {/* 取数逻辑卡片 */}
          {msg.queryLogic && (
            <QueryLogicCard queryLogic={msg.queryLogic} sql={msg.sql} />
          )}

          {/* 图表渲染 */}
          {msg.chartData && msg.chartType && (
            <div className="chatbi-message-chart">
              <ChartRenderer chartData={msg.chartData} chartType={msg.chartType} />
            </div>
          )}
        </div>
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

  // 自动滚动到底部
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
    message.success('对话已重置');
  };

  return (
    <div className="chatbi-page">
      <div className="chatbi-content">
        {/* 消息列表 */}
        <div className="chatbi-messages">
          {messages.length === 0 ? (
            <div className="chatbi-welcome">
              <RobotOutlined style={{ fontSize: 48, color: '#4F6DF5', marginBottom: 16 }} />
              <h2 style={{ marginBottom: 8 }}>欢迎使用 ChatBI</h2>
              <p style={{ color: '#999', marginBottom: 24 }}>
                通过自然语言对话完成数据分析，支持多轮追问、图表渲染、一键保存
              </p>
              <div style={{ textAlign: 'left', maxWidth: 400 }}>
                <Text type="secondary">您可以这样问我：</Text>
                <ul style={{ color: '#666', marginTop: 8, paddingLeft: 20 }}>
                  <li>"近30天各省份销售额排名"</li>
                  <li>"对比本月和上月的新增用户数"</li>
                  <li>"本月总销售额"</li>
                  <li>"Q1各部门费用占比"</li>
                </ul>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id}>
                <MessageItem msg={msg} />
                {/* 保存按钮 - 仅在 assistant 消息且 saveable 时显示 */}
                {!msg.loading && msg.role === 'assistant' && msg.saveable && msg.dsl && (
                  <div className="chatbi-message-actions">
                    <Button
                      type="link"
                      size="small"
                      icon={<SaveOutlined />}
                      onClick={() => handleSaveChart(msg)}
                    >
                      保存为图表
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 底部输入区 */}
        <div className="chatbi-footer">
          <Divider style={{ margin: '0 0 12px 0' }} />
          <div className="chatbi-footer-toolbar">
            <Button
              type="text"
              size="small"
              icon={<RedoOutlined />}
              onClick={handleReset}
              disabled={isLoading || messages.length === 0}
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

      {/* 保存图表弹窗 */}
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
