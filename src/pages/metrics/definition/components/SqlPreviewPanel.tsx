import React, { useState } from 'react';
import { Form, Button, Space, Table, message, Typography } from 'antd';
import { EyeOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { MetricApi, MetricType } from '@/api/MetricApi';
import { executeSql } from '@/api/DatagawayApi';

const { Text } = Typography;

interface SqlPreviewPanelProps {
  metricType: MetricType;
}

const SqlPreviewPanel: React.FC<SqlPreviewPanelProps> = ({ metricType }) => {
  const form = Form.useFormInstance();
  const [sql, setSql] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [sqlResult, setSqlResult] = useState<{ costTimeMs?: number; data?: Record<string, unknown>[] } | null>(null);
  const [previewedFingerprint, setPreviewedFingerprint] = useState<string>('');

  // 监听所有表单值变化，确保修改过滤条件等字段后组件重新渲染，试算按钮正确置灰
  Form.useWatch([], form);

  const buildDefinitionBody = (): Record<string, unknown> => {
    const values = form.getFieldsValue();
    if (metricType === MetricType.ATOMIC) {
      return {
        statFunc: values.statFunc,
        dsName: values.dsSelector?.dsName,
        dbName: values.dsSelector?.dbName,
        tblName: values.dsSelector?.tblName,
        colName: values.dsSelector?.colName,
        filterCondition: values.filterCondition || [],
      };
    }
    if (metricType === MetricType.DERIVED) {
      return {
        atomicMetricId: values.atomicMetricId,
        timePeriodId: values.timePeriodId,
        modifierIds: values.modifierIds || [],
        dimensionIds: values.dimensionIds || [],
        groupByFields: values.groupByFields || [],
      };
    }
    if (metricType === MetricType.COMPOSITE) {
      return {
        formula: values.formula,
        metricRefs: values.metricRefs || [],
      };
    }
    return {};
  };

  const currentFingerprint = JSON.stringify(buildDefinitionBody());
  // 只有当 SQL 存在且当前表单参数与预览时的参数一致时，才能试算
  const canTrial = !!sql && currentFingerprint === previewedFingerprint;

  const handlePreview = async () => {
    setPreviewLoading(true);
    try {
      const definitionBody = buildDefinitionBody();
      const fp = JSON.stringify(definitionBody);
      const res = await MetricApi.previewSql({ metricType, definitionBody });
      if (res.code === 200 && res.data) {
        setSql(res.data);
        setPreviewedFingerprint(fp);
        setSqlResult(null);
      } else {
        message.error(res.message || '预览失败');
      }
    } catch {
      message.error('SQL预览失败');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleTrial = async () => {
    if (!sql) return;
    setTrialLoading(true);
    try {
      const res = await executeSql(sql);
      if (res.code === 200 && res.data) {
        setSqlResult(res.data);
      } else {
        message.error(res.message || '试算失败');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'SQL试算失败';
      message.error(errMsg);
    } finally {
      setTrialLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 16, padding: 16, background: '#f6f8fa', borderRadius: 6 }}>
      <Space style={{ marginBottom: 8 }}>
        <Button icon={<EyeOutlined />} loading={previewLoading} onClick={handlePreview}>SQL预览</Button>
        <Button icon={<PlayCircleOutlined />} loading={trialLoading} onClick={handleTrial} disabled={!canTrial} title={!sql ? '请先点击SQL预览' : '当前参数已变更，请重新点击SQL预览'}>试算</Button>
      </Space>
      {sql && (
        <pre style={{ background: '#fff', padding: 12, borderRadius: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxWidth: '100%' }}>{sql}</pre>
      )}
      {sqlResult && (
        <div style={{ marginTop: 8 }}>
          <Text type="secondary">执行耗时: {sqlResult.costTimeMs}ms</Text>
          <Table
            size="small"
            dataSource={sqlResult.data || []}
            columns={sqlResult.data && sqlResult.data.length > 0 ? Object.keys(sqlResult.data[0]).map(key => ({
              title: key,
              dataIndex: key,
              key: key,
            })) : []}
            pagination={false}
          />
        </div>
      )}
    </div>
  );
};

export default SqlPreviewPanel;
