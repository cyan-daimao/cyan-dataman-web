import React, { useState } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { ChartCmd } from '@/api/DatabiApi';
import { chartApi } from '@/api/DatabiApi';
import { ChatMessage } from '../store';

interface SaveChartModalProps {
  visible: boolean;
  messageData: ChatMessage | null;
  onCancel: () => void;
  onSuccess: () => void;
}

/**
 * 生成默认图表名称
 */
function generateDefaultName(msg: ChatMessage): string {
  if (msg.queryLogic) {
    const dims = msg.queryLogic.dimensions.map((d) => d.label).join('');
    const metrics = msg.queryLogic.metrics.map((m) => m.label).join('');
    return `${dims}${metrics}分析`;
  }
  return 'ChatBI 分析图表';
}

const SaveChartModal: React.FC<SaveChartModalProps> = ({ visible, messageData, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleOk = async () => {
    if (!messageData?.dsl) return;

    try {
      const values = await form.validateFields();
      setSaving(true);

      const cmd: ChartCmd = {
        name: values.name,
        description: values.description,
        metricAnalysisCmd: messageData.dsl,
        chartType: messageData.dsl.chartType,
      };

      await chartApi.create(cmd);
      message.success('图表保存成功');
      onSuccess();
    } catch (error) {
      if (error instanceof Error && error.message !== '表单校验失败') {
        message.error(error.message || '保存失败');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="保存为图表"
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={saving}
      okText="保存"
      cancelText="取消"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          name: messageData ? generateDefaultName(messageData) : '',
          description: '',
        }}
      >
        <Form.Item
          label="图表名称"
          name="name"
          rules={[{ required: true, message: '请输入图表名称' }]}
        >
          <Input placeholder="请输入图表名称" maxLength={100} showCount />
        </Form.Item>
        <Form.Item label="描述" name="description">
          <Input.TextArea placeholder="可选，输入图表描述" rows={3} maxLength={500} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SaveChartModal;
