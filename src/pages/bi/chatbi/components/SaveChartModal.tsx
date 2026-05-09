import React, { useState } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { ChartCmd, AnalysisType, DimensionConfig, MetricConfig, FilterConfig, OrderConfig } from '@/api/DatabiApi';
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

/**
 * 将 DSL 中的 ref 转换为 config（用于 ChartCmd）
 */
function dslToChartConfig(dsl: ChatMessage['dsl']): {
  dimensions?: DimensionConfig[];
  metrics?: MetricConfig[];
  filters?: FilterConfig[];
  orders?: OrderConfig[];
} {
  if (!dsl) return {};

  return {
    dimensions: dsl.dimensions.map((d) => ({
      field: d.dimCode,
      alias: d.alias || d.dimCode,
    })),
    metrics: dsl.metrics.map((m) => ({
      field: m.metricCode,
      alias: m.alias || m.metricCode,
      aggregate: 'SUM' as const,
    })),
    filters: dsl.filters.map((f) => ({
      field: (f.dimCode || f.metricCode) as string,
      operator: f.operator,
      values: f.values,
    })),
    orders: dsl.orders.map((o) => ({
      field: (o.dimCode || o.metricCode) as string,
      direction: o.direction,
    })),
  };
}

const SaveChartModal: React.FC<SaveChartModalProps> = ({ visible, messageData, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleOk = async () => {
    if (!messageData?.dsl) return;

    try {
      const values = await form.validateFields();
      setSaving(true);

      const config = dslToChartConfig(messageData.dsl);
      const cmd: ChartCmd = {
        name: values.name,
        description: values.description,
        analysisType: AnalysisType.METRICS,
        metricAnalysisCmd: messageData.dsl,
        chartType: messageData.dsl.chartType,
        ...config,
        limitValue: messageData.dsl.limitValue,
        sqlContent: messageData.sql,
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
