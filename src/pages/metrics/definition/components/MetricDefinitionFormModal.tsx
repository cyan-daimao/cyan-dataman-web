import React, { useEffect, useState, useCallback } from 'react';
import {
  Modal, Form, Input, Select, TreeSelect, message, Row, Col, Button,
} from 'antd';
import {
  MetricApi, MetricListItem, MetricType, StatFunc, AtomicMetricCmd,
  DerivedMetricCmd, CompositeMetricCmd,
} from '@/api/MetricApi';
import { ModifierApi, ModifierDTO, TimePeriodApi, TimePeriodDTO, DimensionApi, DimensionDTO, DimType, MetadataColumnDTO } from '@/api/MetricConfigApi';
import { MetricSubjectApi, MetricSubject } from '@/api/MetricSubjectApi';
import { listEmployees, EmployeeDTO, currentEmployee } from '@/api/EmployeeApi';

import MetadataTableSelector from './MetadataTableSelector';
import SqlPreviewPanel from './SqlPreviewPanel';

const { TextArea } = Input;
const { Option } = Select;

export interface MetricDefinitionFormModalProps {
  visible: boolean;
  metricType: MetricType | null;
  editingId?: string | null;
  initialValues?: Record<string, unknown>;
  onClose: () => void;
  onSuccess: () => void;
}

const MetricDefinitionFormModal: React.FC<MetricDefinitionFormModalProps> = ({
  visible,
  metricType,
  editingId,
  initialValues,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [subjects, setSubjects] = useState<MetricSubject[]>([]);
  const [employees, setEmployees] = useState<EmployeeDTO[]>([]);
  const [currentUser, setCurrentUser] = useState<string>('');

  // 派生/复合指标依赖数据
  const [atomicMetrics, setAtomicMetrics] = useState<MetricListItem[]>([]);
  const [timePeriods, setTimePeriods] = useState<TimePeriodDTO[]>([]);
  const [modifiers, setModifiers] = useState<ModifierDTO[]>([]);
  const [dimensions, setDimensions] = useState<DimensionDTO[]>([]);
  const [refMetrics, setRefMetrics] = useState<MetricListItem[]>([]);
  const [sourceColumns, setSourceColumns] = useState<MetadataColumnDTO[]>([]);

  const [saving, setSaving] = useState(false);

  // 加载基础数据（主题域、员工、当前用户）
  useEffect(() => {
    if (!visible) return;
    MetricSubjectApi.tree().then(res => setSubjects(res)).catch(() => {/**/});
    listEmployees().then(res => {
      if (res.code === 200 && res.data) setEmployees(res.data);
    }).catch(() => {/**/});
    currentEmployee().then(res => {
      if (res.code === 200 && res.data) setCurrentUser(res.data.passport);
    }).catch(() => {/**/});
  }, [visible]);

  // 加载派生/复合指标依赖数据
  useEffect(() => {
    if (!visible || !metricType) return;

    if (metricType === MetricType.DERIVED) {
      MetricApi.page({ pageNum: 1, pageSize: 1000, metricType: MetricType.ATOMIC }).then(res => {
        if (res.code === 200 && res.data) setAtomicMetrics(res.data.list);
      }).catch(() => {/**/});
      TimePeriodApi.list().then(res => {
        if (res.code === 200 && res.data) setTimePeriods(res.data);
      }).catch(() => {/**/});
      ModifierApi.page({ pageNum: 1, pageSize: 1000 }).then(res => {
        if (res.code === 200 && res.data) setModifiers(res.data.list);
      }).catch(() => {/**/});
      DimensionApi.page({ pageNum: 1, pageSize: 1000 }).then(res => {
        if (res.code === 200 && res.data) setDimensions(res.data.list);
      }).catch(() => {/**/});
    }
    if (metricType === MetricType.COMPOSITE) {
      MetricApi.page({ pageNum: 1, pageSize: 1000 }).then(res => {
        if (res.code === 200 && res.data) setRefMetrics(res.data.list);
      }).catch(() => {/**/});
    }
  }, [visible, metricType]);

  // 处理初始值（AI 预填或编辑模式）
  useEffect(() => {
    if (!visible || !metricType || !currentUser) return;

    form.resetFields();

    // 如果有 editingId，从 API 加载详情
    if (editingId) {
      MetricApi.detail(editingId).then(res => {
        if (res.code === 200 && res.data) {
          const detail = res.data;
          const base = {
            metricName: detail.metricName,
            metricCode: detail.metricCode,
            bizCaliber: detail.bizCaliber,
            techCaliber: detail.techCaliber,
            subjectCode: detail.subjectCode,
            owner: detail.owner,
            securityLevel: detail.securityLevel || 'L1',
          };
          if (detail.metricType === MetricType.ATOMIC && detail.atomic) {
            form.setFieldsValue({
              ...base,
              statFunc: detail.atomic.statFunc,
              dsSelector: {
                dsName: detail.atomic.dsName,
                dbName: detail.atomic.dbName,
                tblName: detail.atomic.tblName,
                colName: detail.atomic.colName,
              },
              filterCondition: detail.atomic.filterCondition || [],
            });
          } else if (detail.metricType === MetricType.DERIVED && detail.derived) {
            form.setFieldsValue({
              ...base,
              atomicMetricId: detail.derived.atomicMetricId,
              timePeriodId: detail.derived.timePeriodId,
              modifierIds: detail.derived.modifierIds || [],
              dimensionIds: detail.derived.dimensionIds || [],
              groupByFields: detail.derived.groupByFields || [],
            });
          } else if (detail.metricType === MetricType.COMPOSITE && detail.composite) {
            form.setFieldsValue({
              ...base,
              formula: detail.composite.formula,
              metricRefs: detail.composite.metricRefs,
            });
          }
        }
      }).catch(() => {/**/});
    } else if (initialValues) {
      // AI 预填模式
      form.setFieldsValue({
        ...initialValues,
        owner: (initialValues.owner as string) || currentUser,
        securityLevel: (initialValues.securityLevel as string) || 'L1',
      });
    } else {
      // 新建模式，默认负责人和密级
      form.setFieldsValue({ owner: currentUser, securityLevel: 'L1' });
    }
  }, [visible, metricType, editingId, currentUser, form, initialValues]);

  const buildSubjectTree = useCallback((list: MetricSubject[]): React.ComponentProps<typeof TreeSelect>['treeData'] => {
    return list.map(item => ({
      title: item.subjectName,
      value: item.subjectCode,
      key: item.subjectCode,
      children: item.children ? buildSubjectTree(item.children) : undefined,
    }));
  }, []);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const base = {
        metricName: values.metricName,
        metricCode: values.metricCode,
        bizCaliber: values.bizCaliber,
        techCaliber: values.techCaliber,
        subjectCode: values.subjectCode,
        owner: values.owner,
        securityLevel: values.securityLevel,
      };

      setSaving(true);

      if (metricType === MetricType.ATOMIC) {
        const cmd: AtomicMetricCmd = {
          ...base,
          statFunc: values.statFunc,
          dsName: values.dsSelector.dsName,
          dbName: values.dsSelector.dbName,
          tblName: values.dsSelector.tblName,
          colName: values.dsSelector.colName,
          filterCondition: values.filterCondition,
        };
        if (editingId) {
          await MetricApi.updateAtomic(editingId, cmd);
        } else {
          await MetricApi.createAtomic(cmd);
        }
      } else if (metricType === MetricType.DERIVED) {
        const cmd: DerivedMetricCmd = {
          ...base,
          atomicMetricId: values.atomicMetricId,
          timePeriodId: values.timePeriodId,
          modifierIds: values.modifierIds,
          dimensionIds: values.dimensionIds,
          groupByFields: values.groupByFields,
        };
        if (editingId) {
          await MetricApi.updateDerived(editingId, cmd);
        } else {
          await MetricApi.createDerived(cmd);
        }
      } else if (metricType === MetricType.COMPOSITE) {
        const cmd: CompositeMetricCmd = {
          ...base,
          formula: values.formula,
          metricRefs: values.metricRefs,
        };
        if (editingId) {
          await MetricApi.updateComposite(editingId, cmd);
        } else {
          await MetricApi.createComposite(cmd);
        }
      }

      message.success('保存成功');
      form.resetFields();
      onSuccess();
    } finally {
      setSaving(false);
    }
  };

  const title = editingId
    ? '编辑指标'
    : metricType === MetricType.ATOMIC
      ? '新建原子指标'
      : metricType === MetricType.DERIVED
        ? '新建派生指标'
        : metricType === MetricType.COMPOSITE
          ? '新建复合指标'
          : '指标定义';

  return (
    <Modal
      title={title}
      open={visible}
      onOk={handleSave}
      onCancel={onClose}
      width={1200}
      destroyOnClose
      confirmLoading={saving}
    >
      <Form form={form} layout="vertical">
        <Row gutter={24}>
          <Col span={14}>
            <Form.Item name="metricCode" label="指标编码">
              <Input placeholder={editingId ? undefined : '不填则系统自动生成'} disabled={!!editingId} />
            </Form.Item>
            <Form.Item name="metricName" label="指标名称" rules={[{ required: true }]}>
              <Input placeholder="请输入指标名称" />
            </Form.Item>
            <Form.Item name="bizCaliber" label="业务口径" rules={[{ required: true }]}>
              <TextArea rows={2} placeholder="请输入业务口径" />
            </Form.Item>
            <Form.Item name="techCaliber" label="技术口径">
              <TextArea rows={2} placeholder="请输入技术口径（选填）" />
            </Form.Item>
            <Form.Item name="subjectCode" label="所属主题域" rules={[{ required: true }]}>
              <TreeSelect
                treeData={buildSubjectTree(subjects)}
                placeholder="选择主题域"
                treeDefaultExpandAll
              />
            </Form.Item>
            <Form.Item name="owner" label="负责人" rules={[{ required: true }]}>
              <Select placeholder="选择负责人" showSearch optionFilterProp="children">
                {employees.map(emp => (
                  <Option key={emp.passport} value={emp.passport}>
                    {emp.cnName} ({emp.passport})
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="securityLevel" label="数据密级" initialValue="L1">
              <Select placeholder="请选择数据密级">
                <Option value="L1">L1 公开</Option>
                <Option value="L2">L2 内部</Option>
                <Option value="L3">L3 敏感</Option>
                <Option value="L4">L4 机密</Option>
              </Select>
            </Form.Item>

            {metricType === MetricType.ATOMIC && (
              <>
                <Form.Item name="statFunc" label="统计函数" rules={[{ required: true }]}>
                  <Select placeholder="选择统计函数">
                    {Object.values(StatFunc).map(f => <Option key={f} value={f}>{f}</Option>)}
                  </Select>
                </Form.Item>
                <Form.Item
                  name="dsSelector"
                  label="数据来源"
                  rules={[{ required: true, validator: (_, val) => val?.dsName && val?.dbName && val?.tblName && val?.colName ? Promise.resolve() : Promise.reject(new Error('请选择数仓表和字段')) }]}
                >
                  <MetadataTableSelector onColumnsChange={setSourceColumns} />
                </Form.Item>
                <Form.List name="filterCondition">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...restField }) => (
                        <Row key={key} gutter={8} align="middle">
                          <Col span={7}>
                            <Form.Item {...restField} name={[name, 'field']} rules={[{ required: true }]}>
                              <Select
                                placeholder="选择字段"
                                showSearch
                                optionFilterProp="label"
                                options={sourceColumns.map(c => ({ value: c.col, label: c.col + (c.comment ? ` - ${c.comment}` : '') }))}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={5}>
                            <Form.Item {...restField} name={[name, 'op']} rules={[{ required: true }]}>
                              <Select placeholder="运算符">
                                <Option value="=">=</Option>
                                <Option value="!=">!=</Option>
                                <Option value=">">&gt;</Option>
                                <Option value="<">&lt;</Option>
                                <Option value="IN">IN</Option>
                              </Select>
                            </Form.Item>
                          </Col>
                          <Col span={9}>
                            <Form.Item {...restField} name={[name, 'value']} rules={[{ required: true }]}>
                              <Input placeholder="值" />
                            </Form.Item>
                          </Col>
                          <Col span={3}>
                            <Button type="link" danger onClick={() => remove(name)}>删除</Button>
                          </Col>
                        </Row>
                      ))}
                      <Button type="dashed" onClick={() => add()} block>添加过滤条件</Button>
                    </>
                  )}
                </Form.List>
              </>
            )}

            {metricType === MetricType.DERIVED && (
              <>
                <Form.Item name="atomicMetricId" label="原子指标" rules={[{ required: true }]}>
                  <Select placeholder="选择原子指标" showSearch optionFilterProp="children">
                    {atomicMetrics.map(m => <Option key={m.id} value={m.id}>{m.metricName} ({m.metricCode})</Option>)}
                  </Select>
                </Form.Item>
                <Form.Item name="timePeriodId" label="时间周期" rules={[{ required: true }]}>
                  <Select placeholder="选择时间周期">
                    {timePeriods.map(t => <Option key={t.id} value={t.id}>{t.periodName}</Option>)}
                  </Select>
                </Form.Item>
                <Form.Item name="modifierIds" label="修饰词">
                  <Select mode="multiple" placeholder="选择修饰词">
                    {modifiers.map(m => <Option key={m.id} value={m.id}>{m.modifierName}</Option>)}
                  </Select>
                </Form.Item>
                <Form.Item name="dimensionIds" label="维度">
                  <Select mode="multiple" placeholder="选择维度">
                    {dimensions.map(d => (
                      <Option key={d.id} value={d.id}>
                        <span>{d.dimName}</span>
                        <span style={{ marginLeft: 8, fontSize: 12, color: '#1677ff' }}>{d.dimType === DimType.DATE ? 'DATE' : d.dimType}</span>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.List name="groupByFields">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...restField }) => (
                        <Row key={key} gutter={8} align="middle">
                          <Col span={20}>
                            <Form.Item {...restField} name={[name, 'col']} rules={[{ required: true }]}>
                              <Input placeholder="分组字段" />
                            </Form.Item>
                          </Col>
                          <Col span={4}>
                            <Button type="link" danger onClick={() => remove(name)}>删除</Button>
                          </Col>
                        </Row>
                      ))}
                      <Button type="dashed" onClick={() => add()} block>添加分组字段</Button>
                    </>
                  )}
                </Form.List>
              </>
            )}

            {metricType === MetricType.COMPOSITE && (
              <>
                <Form.Item name="formula" label="计算公式" rules={[{ required: true }]}>
                  <Input placeholder="如：${M001} / ${M002} * 100" />
                </Form.Item>
                <Form.Item name="metricRefs" label="引用指标" rules={[{ required: true }]}>
                  <Select mode="multiple" placeholder="选择引用的指标">
                    {refMetrics.map(m => <Option key={m.id} value={m.id}>{m.metricName} ({m.metricCode})</Option>)}
                  </Select>
                </Form.Item>
              </>
            )}
          </Col>
          <Col span={10}>
            <div style={{ position: 'sticky', top: 0 }}>
              {metricType && (
                <SqlPreviewPanel metricType={metricType} />
              )}
            </div>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default MetricDefinitionFormModal;
