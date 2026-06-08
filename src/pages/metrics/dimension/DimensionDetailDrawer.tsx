import React, { useEffect, useState } from 'react';
import {
    Button, Descriptions, Drawer, Empty, Form, Input, InputNumber, Modal,
    Popconfirm, Select, Space, Table, Tabs, Tag, Typography, message,
} from 'antd';
import {
    DimensionApi, DimensionDTO, DimensionFieldBindingCmd, DimensionFieldBindingDTO,
    DimensionKind, DimensionSourceType, MetadataColumnDTO,
} from '@/api/MetricConfigApi';
import { executeSparkSql } from '@/api/DatagawayApi';
import MetadataTableSelector, { MetadataTableSelectorValue } from '../definition/components/MetadataTableSelector';

const { Paragraph, Text } = Typography;

interface DimensionDetailDrawerProps {
    open: boolean;
    dimensionId: string | null;
    onClose: () => void;
    onChanged: () => void;
}

const sourceTypeLabel: Record<string, string> = {
    COLUMN: '物理字段',
    JSON_PATH: 'JSON 路径',
    EXPRESSION: 'SQL 表达式',
};

const DimensionDetailDrawer: React.FC<DimensionDetailDrawerProps> = ({
    open,
    dimensionId,
    onClose,
    onChanged,
}) => {
    const [detail, setDetail] = useState<DimensionDTO | null>(null);
    const [bindings, setBindings] = useState<DimensionFieldBindingDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [bindingModalOpen, setBindingModalOpen] = useState(false);
    const [editingBinding, setEditingBinding] = useState<DimensionFieldBindingDTO | null>(null);
    const [savingBinding, setSavingBinding] = useState(false);
    const [previewBinding, setPreviewBinding] = useState<DimensionFieldBindingDTO | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewRows, setPreviewRows] = useState<Array<{ value: string; label?: string }>>([]);
    const [metadataColumns, setMetadataColumns] = useState<MetadataColumnDTO[]>([]);
    const [form] = Form.useForm();
    const sourceType = Form.useWatch('sourceType', form) || DimensionSourceType.COLUMN;

    const fetchDetail = async () => {
        if (!dimensionId) return;
        setLoading(true);
        try {
            const [detailRes, bindingRes] = await Promise.all([
                DimensionApi.detail(dimensionId),
                DimensionApi.listFieldBindings(dimensionId),
            ]);
            if (detailRes.code === 200 && detailRes.data) {
                setDetail(detailRes.data);
            }
            if (bindingRes.code === 200 && bindingRes.data) {
                setBindings(bindingRes.data);
                setPreviewBinding(bindingRes.data.find(item => item.primaryBinding) || bindingRes.data[0] || null);
            } else {
                setBindings([]);
                setPreviewBinding(null);
            }
        } catch {
            message.error('加载维度详情失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            fetchDetail();
        } else {
            setDetail(null);
            setBindings([]);
            setPreviewRows([]);
            setPreviewBinding(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, dimensionId]);

    const openBindingModal = (binding?: DimensionFieldBindingDTO) => {
        setEditingBinding(binding || null);
        form.resetFields();
        setMetadataColumns([]);
        form.setFieldsValue(binding ? {
            ...binding,
            selector: {
                dsName: binding.catalogName,
                dbName: binding.schemaName,
                tblName: binding.tableName,
                colName: binding.columnName,
            },
        } : {
            tableRole: detail?.dimensionKind === DimensionKind.DEGENERATE ? 'FACT' : 'DIMENSION',
            sourceType: DimensionSourceType.COLUMN,
            primaryBinding: bindings.length === 0,
            sortOrder: bindings.length,
        });
        setBindingModalOpen(true);
    };

    const saveBinding = async () => {
        if (!dimensionId) return;
        const values = await form.validateFields();
        const selector = values.selector as MetadataTableSelectorValue | undefined;
        const cmd: DimensionFieldBindingCmd = {
            tableRole: values.tableRole,
            catalogName: selector?.dsName,
            schemaName: selector?.dbName,
            tableName: selector?.tblName,
            columnName: values.sourceType === DimensionSourceType.EXPRESSION ? undefined : selector?.colName,
            displayColumn: values.displayColumn,
            sourceType: values.sourceType || DimensionSourceType.COLUMN,
            sourceExpr: values.sourceExpr,
            primaryBinding: values.primaryBinding,
            sortOrder: values.sortOrder,
        };
        setSavingBinding(true);
        try {
            if (editingBinding?.id) {
                await DimensionApi.updateFieldBinding(dimensionId, editingBinding.id, cmd);
            } else {
                await DimensionApi.saveFieldBinding(dimensionId, cmd);
            }
            message.success('绑定已保存');
            setBindingModalOpen(false);
            await fetchDetail();
            onChanged();
        } catch {
            message.error('保存绑定失败');
        } finally {
            setSavingBinding(false);
        }
    };

    const deleteBinding = async (bindingId?: string) => {
        if (!dimensionId || !bindingId) return;
        try {
            await DimensionApi.deleteFieldBinding(dimensionId, bindingId);
            message.success('绑定已删除');
            await fetchDetail();
            onChanged();
        } catch {
            message.error('删除绑定失败');
        }
    };

    const setPrimary = async (bindingId?: string) => {
        if (!dimensionId || !bindingId) return;
        try {
            await DimensionApi.setPrimaryFieldBinding(dimensionId, bindingId);
            message.success('已设为主绑定');
            await fetchDetail();
            onChanged();
        } catch {
            message.error('设置主绑定失败');
        }
    };

    const quoteTableRef = (binding: DimensionFieldBindingDTO) =>
        [binding.catalogName, binding.schemaName, binding.tableName]
            .filter(Boolean)
            .map(part => `\`${String(part).replace(/`/g, '``')}\``)
            .join('.');

    const buildValueExpr = (binding: DimensionFieldBindingDTO, display = false) => {
        if (display && binding.displayColumn) return `\`${binding.displayColumn.replace(/`/g, '``')}\``;
        if (binding.sourceType === DimensionSourceType.EXPRESSION) return binding.sourceExpr || '';
        if (binding.sourceType === DimensionSourceType.JSON_PATH) {
            const path = (binding.sourceExpr || `$.${binding.columnName || ''}`).replace(/'/g, "''");
            return `JSON_VALUE(\`properties\`, '${path}')`;
        }
        return binding.columnName ? `\`${binding.columnName.replace(/`/g, '``')}\`` : '';
    };

    const loadPreview = async (binding = previewBinding) => {
        if (!binding) {
            message.warning('请先添加或选择一个字段绑定');
            return;
        }
        const valueExpr = buildValueExpr(binding);
        if (!valueExpr) {
            message.warning('该绑定缺少字段或表达式');
            return;
        }
        setPreviewBinding(binding);
        setPreviewLoading(true);
        try {
            const labelExpr = buildValueExpr(binding, true);
            const columns = [`${valueExpr} AS value`];
            if (labelExpr && labelExpr !== valueExpr) columns.push(`${labelExpr} AS label`);
            const sql = `SELECT DISTINCT ${columns.join(', ')} FROM ${quoteTableRef(binding)} LIMIT 100`;
            const res = await executeSparkSql(sql);
            if (res.code === 200 && res.data) {
                const rows = (res.data.data || []) as Record<string, unknown>[];
                setPreviewRows(rows.map(row => ({
                    value: String(row.value ?? ''),
                    label: row.label == null ? undefined : String(row.label),
                })));
            } else {
                message.error(res.data?.errorMessage || res.message || '查询失败');
                setPreviewRows([]);
            }
        } catch (error) {
            message.error(error instanceof Error ? error.message : '加载维度值失败');
            setPreviewRows([]);
        } finally {
            setPreviewLoading(false);
        }
    };

    const bindingColumns = [
        {
            title: '表角色',
            dataIndex: 'tableRole',
            width: 90,
            render: (value: string) => <Tag color={value === 'FACT' ? 'green' : 'blue'}>{value === 'FACT' ? '事实表' : '维表'}</Tag>,
        },
        {
            title: '表字段',
            key: 'table',
            render: (_: unknown, record: DimensionFieldBindingDTO) => (
                <Text copyable>
                    {[record.catalogName, record.schemaName, record.tableName, record.columnName || record.sourceExpr].filter(Boolean).join('.')}
                </Text>
            ),
        },
        {
            title: '来源类型',
            dataIndex: 'sourceType',
            width: 120,
            render: (value: string) => sourceTypeLabel[value || DimensionSourceType.COLUMN] || value,
        },
        {
            title: '主绑定',
            dataIndex: 'primaryBinding',
            width: 90,
            render: (value: boolean) => value ? <Tag color="green">主绑定</Tag> : <Tag>候选</Tag>,
        },
        {
            title: '操作',
            key: 'action',
            width: 260,
            render: (_: unknown, record: DimensionFieldBindingDTO) => (
                <Space size="small">
                    <Button type="link" size="small" onClick={() => loadPreview(record)}>预览</Button>
                    <Button type="link" size="small" onClick={() => openBindingModal(record)}>编辑</Button>
                    {!record.primaryBinding && (
                        <Button type="link" size="small" onClick={() => setPrimary(record.id)}>设为主绑定</Button>
                    )}
                    <Popconfirm title="确认删除该绑定？" onConfirm={() => deleteBinding(record.id)}>
                        <Button type="link" size="small" danger>删除</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <>
            <Drawer
                title={detail ? `${detail.dimName} (${detail.dimCode})` : '维度详情'}
                width={960}
                open={open}
                onClose={onClose}
            >
                <Tabs
                    items={[
                        {
                            key: 'basic',
                            label: '基础信息',
                            children: detail ? (
                                <Descriptions bordered column={2} size="small">
                                    <Descriptions.Item label="维度编码">{detail.dimCode}</Descriptions.Item>
                                    <Descriptions.Item label="实现类型">{detail.dimensionKind || DimensionKind.NORMAL}</Descriptions.Item>
                                    <Descriptions.Item label="维度类型">{detail.dimType}</Descriptions.Item>
                                    <Descriptions.Item label="数据类型">{detail.dataType}</Descriptions.Item>
                                    <Descriptions.Item label="分类">{detail.categoryName || detail.categoryId || '-'}</Descriptions.Item>
                                    <Descriptions.Item label="排序">{detail.sortOrder ?? '-'}</Descriptions.Item>
                                    {detail.dimensionKind === DimensionKind.HIERARCHY && (
                                        <>
                                            <Descriptions.Item label="层级编码">{detail.hierarchyCode || '-'}</Descriptions.Item>
                                            <Descriptions.Item label="层级级别">{detail.hierarchyLevel || '-'}</Descriptions.Item>
                                        </>
                                    )}
                                    <Descriptions.Item label="描述" span={2}><Paragraph>{detail.description || '-'}</Paragraph></Descriptions.Item>
                                </Descriptions>
                            ) : <Empty description={loading ? '加载中...' : '暂无数据'} />,
                        },
                        {
                            key: 'binding',
                            label: '字段绑定',
                            children: (
                                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                    <Button type="primary" onClick={() => openBindingModal()}>添加字段绑定</Button>
                                    <Table
                                        rowKey={(record) => record.id || `${record.schemaName}.${record.tableName}.${record.columnName || record.sourceExpr}`}
                                        loading={loading}
                                        dataSource={bindings}
                                        columns={bindingColumns}
                                        pagination={false}
                                        locale={{ emptyText: <Empty description="暂无字段绑定" /> }}
                                    />
                                    <Table
                                        title={() => `维度值预览${previewBinding ? `：${previewBinding.tableName}` : ''}`}
                                        size="small"
                                        rowKey="value"
                                        loading={previewLoading}
                                        dataSource={previewRows}
                                        pagination={false}
                                        columns={[
                                            { title: '编码', dataIndex: 'value', key: 'value', ellipsis: true },
                                            { title: '名称', dataIndex: 'label', key: 'label', ellipsis: true },
                                        ]}
                                        locale={{ emptyText: '点击绑定行的「预览」加载维度值' }}
                                    />
                                </Space>
                            ),
                        },
                    ]}
                />
            </Drawer>

            <Modal
                title={editingBinding ? '编辑字段绑定' : '新增字段绑定'}
                open={bindingModalOpen}
                onOk={saveBinding}
                onCancel={() => setBindingModalOpen(false)}
                confirmLoading={savingBinding}
                destroyOnClose
                width={720}
            >
                <Form form={form} layout="vertical">
                    <Space style={{ width: '100%' }} size="middle">
                        <Form.Item name="tableRole" label="表角色" rules={[{ required: true, message: '请选择表角色' }]}>
                            <Select style={{ width: 140 }} options={[
                                { value: 'DIMENSION', label: '维表' },
                                { value: 'FACT', label: '事实表' },
                            ]} />
                        </Form.Item>
                        <Form.Item name="sourceType" label="来源类型">
                            <Select style={{ width: 160 }} options={Object.values(DimensionSourceType).map(value => ({
                                value,
                                label: sourceTypeLabel[value],
                            }))} />
                        </Form.Item>
                        <Form.Item name="primaryBinding" label="绑定优先级">
                            <Select style={{ width: 140 }} options={[
                                { value: true, label: '主绑定' },
                                { value: false, label: '候选绑定' },
                            ]} />
                        </Form.Item>
                    </Space>
                    <Form.Item
                        name="selector"
                        label={sourceType === DimensionSourceType.EXPRESSION ? '元数据表' : '元数据表字段'}
                        rules={[{
                            required: true,
                            validator: (_, value: MetadataTableSelectorValue | undefined) => {
                                if (!value?.dbName || !value?.tblName) {
                                    return Promise.reject(new Error('请选择元数据平台的表'));
                                }
                                if (sourceType !== DimensionSourceType.EXPRESSION && !value?.colName) {
                                    return Promise.reject(new Error('请选择字段'));
                                }
                                return Promise.resolve();
                            },
                        }]}
                    >
                        <MetadataTableSelector onColumnsChange={setMetadataColumns} />
                    </Form.Item>
                    <Form.Item name="displayColumn" label="显示字段">
                        <Select
                            showSearch
                            allowClear
                            placeholder="可选，选择同表展示字段"
                            optionFilterProp="label"
                            options={metadataColumns.map(column => ({
                                value: column.col,
                                label: `${column.col}${column.comment ? ` - ${column.comment}` : ''}`,
                            }))}
                        />
                    </Form.Item>
                    {(sourceType === DimensionSourceType.JSON_PATH || sourceType === DimensionSourceType.EXPRESSION) && (
                        <Form.Item name="sourceExpr" label={sourceType === DimensionSourceType.JSON_PATH ? 'JSON Path' : 'SQL 表达式'} rules={[{ required: true, message: '请输入来源表达式' }]}>
                            <Input.TextArea rows={3} />
                        </Form.Item>
                    )}
                    <Form.Item name="sortOrder" label="排序">
                        <InputNumber min={0} precision={0} />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default DimensionDetailDrawer;
