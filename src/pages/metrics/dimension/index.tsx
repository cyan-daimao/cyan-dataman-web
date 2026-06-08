import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Tree, Button, Table, Modal, Form, Input, Select, TreeSelect, message,
    Empty, Popconfirm, Tag, Space, Dropdown, Typography, Card, Row, Col,
    InputNumber,
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined, MoreOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import {
    DimensionApi, DimensionDTO, DimensionCmd, DimType, DataType, DimensionPageQuery,
    MetadataTableSelectorApi, MetadataColumnDTO, DimensionKind, DimensionSourceType,
} from '@/api/MetricConfigApi';
import { executeSparkSql } from '@/api/DatagawayApi';
import {
    DimensionCategoryApi, DimensionCategory, DimensionCategoryCmd,
} from '@/api/DimensionCategoryApi';

const { Title, Text } = Typography;
const { TextArea } = Input;

const dimTypeMap: Record<string, string> = {
    ENUM: '枚举',
    STRING: '字符串',
    DATE: '日期',
    NUMBER: '数值',
    GEO: '地理',
};

const dataTypeMap: Record<string, string> = {
    STRING: '字符串',
    INT: '整型',
    BIGINT: '长整型',
    DECIMAL: '小数',
    DATE: '日期',
    DATETIME: '日期时间',
};

const dimensionKindMap: Record<string, string> = {
    NORMAL: '普通关联维度',
    DEGENERATE: '退化维度',
    HIERARCHY: '层级维度',
    DERIVED: '派生维度',
};

const dimensionKindColorMap: Record<string, string> = {
    NORMAL: 'blue',
    DEGENERATE: 'green',
    HIERARCHY: 'purple',
    DERIVED: 'orange',
};

const sourceTypeMap: Record<string, string> = {
    COLUMN: '物理字段',
    JSON_PATH: 'JSON 路径',
    EXPRESSION: 'SQL 表达式',
};

const dimTypeColorMap: Record<string, string> = {
    ENUM: 'blue',
    STRING: 'green',
    DATE: 'purple',
    NUMBER: 'orange',
    GEO: 'cyan',
};

// ==================== 左侧分类树 ====================

interface CategoryTreeProps {
    treeData: DimensionCategory[];
    loading: boolean;
    selectedKeys: string[];
    onSelect: (keys: string[]) => void;
    onAddRoot: () => void;
    onAddChild: (parent: DimensionCategory) => void;
    onEdit: (category: DimensionCategory) => void;
    onDelete: (id: string) => void;
}

const CategoryTree: React.FC<CategoryTreeProps> = ({
    treeData,
    loading,
    selectedKeys,
    onSelect,
    onAddRoot,
    onAddChild,
    onEdit,
    onDelete,
}) => {
    const [hoveredKey, setHoveredKey] = useState<string | null>(null);

    const buildTreeNodes = (list: DimensionCategory[]): React.ComponentProps<typeof Tree>['treeData'] => {
        return list.map(item => ({
            key: item.id,
            title: (
                <div
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
                    onMouseEnter={() => setHoveredKey(item.id)}
                    onMouseLeave={() => setHoveredKey(null)}
                >
                    <Text strong={item.level === 1}>{item.name}</Text>
                    <Dropdown
                        trigger={['click']}
                        menu={{
                            items: [
                                {
                                    key: 'addChild',
                                    label: '新增子分类',
                                    onClick: () => onAddChild(item),
                                },
                                {
                                    key: 'edit',
                                    label: '编辑',
                                    onClick: () => onEdit(item),
                                },
                                {
                                    key: 'delete',
                                    label: '删除',
                                    danger: true,
                                    onClick: () => {
                                        const hasChildren = item.children && item.children.length > 0;
                                        Modal.confirm({
                                            title: hasChildren ? '确认删除（含子分类）？' : '确认删除？',
                                            content: hasChildren
                                                ? `分类「${item.name}」下包含 ${item.children!.length} 个子分类，删除后将一并移除，确定继续吗？`
                                                : `确定删除分类「${item.name}」吗？`,
                                            okButtonProps: { danger: true },
                                            onOk: () => onDelete(item.id),
                                        });
                                    },
                                },
                            ] as MenuProps['items'],
                        }}
                    >
                        <Button
                            type="text"
                            size="small"
                            icon={<MoreOutlined />}
                            style={{
                                opacity: hoveredKey === item.id ? 1 : 0,
                                transition: 'opacity 0.2s',
                                marginLeft: 8,
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </Dropdown>
                </div>
            ),
            children: item.children ? buildTreeNodes(item.children) : undefined,
        }));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    block
                    onClick={onAddRoot}
                >
                    新增分类
                </Button>
            </div>
            <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0' }}>
                <div
                    onClick={() => onSelect(['__ALL__'])}
                    style={{
                        padding: '6px 8px',
                        cursor: 'pointer',
                        backgroundColor: selectedKeys.includes('__ALL__') ? '#e6f7ff' : 'transparent',
                        borderRadius: 4,
                        fontWeight: selectedKeys.includes('__ALL__') ? 500 : 400,
                        color: selectedKeys.includes('__ALL__') ? '#1890ff' : 'inherit',
                    }}
                >
                    📊 全部维度
                </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                        <Text type="secondary">加载中...</Text>
                    </div>
                ) : (
                    <Tree
                        treeData={buildTreeNodes(treeData)}
                        selectedKeys={selectedKeys.filter(k => k !== '__ALL__')}
                        onSelect={onSelect}
                        defaultExpandAll
                        blockNode
                    />
                )}
            </div>
        </div>
    );
};

// ==================== 分类弹窗 ====================

interface CategoryModalProps {
    open: boolean;
    editing: DimensionCategory | null;
    defaultParentId?: string;
    treeData: DimensionCategory[];
    onCancel: () => void;
    onSave: (values: DimensionCategoryCmd) => void;
}

const CategoryModal: React.FC<CategoryModalProps> = ({ open, editing, defaultParentId, treeData, onCancel, onSave }) => {
    const [form] = Form.useForm();

    useEffect(() => {
        if (open) {
            if (editing) {
                form.setFieldsValue({
                    name: editing.name,
                    parentId: editing.parentId,
                    sortOrder: editing.sortOrder,
                });
            } else {
                form.resetFields();
                if (defaultParentId) {
                    form.setFieldsValue({ parentId: defaultParentId });
                }
            }
        }
    }, [open, editing, defaultParentId, form]);

    const collectDescendantIds = (list: DimensionCategory[], id: string): Set<string> => {
        const result = new Set<string>();
        const findNode = (nodes: DimensionCategory[]): DimensionCategory | null => {
            for (const node of nodes) {
                if (node.id === id) return node;
                if (node.children) {
                    const found = findNode(node.children);
                    if (found) return found;
                }
            }
            return null;
        };
        const collect = (node: DimensionCategory) => {
            result.add(node.id);
            if (node.children) {
                node.children.forEach(collect);
            }
        };
        const target = findNode(list);
        if (target) collect(target);
        return result;
    };

    const buildParentTreeData = (
        list: DimensionCategory[],
        excludeIds?: Set<string>
    ): React.ComponentProps<typeof TreeSelect>['treeData'] => {
        return list
            .filter(item => !excludeIds?.has(item.id))
            .map(item => ({
                key: item.id,
                value: item.id,
                title: item.name,
                children: item.children
                    ? buildParentTreeData(item.children, excludeIds)
                    : undefined,
            }));
    };

    return (
        <Modal
            title={editing ? '编辑分类' : '新增分类'}
            open={open}
            onOk={() => form.submit()}
            onCancel={onCancel}
            destroyOnClose
        >
            <Form form={form} onFinish={onSave} layout="vertical">
                <Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请输入分类名称' }]}>
                    <Input placeholder="请输入分类名称" />
                </Form.Item>
                <Form.Item name="parentId" label="父分类">
                    <TreeSelect
                        treeData={buildParentTreeData(treeData, editing ? collectDescendantIds(treeData, editing.id) : undefined)}
                        placeholder="选择父分类（不选则为一级分类）"
                        allowClear
                        treeDefaultExpandAll
                    />
                </Form.Item>
                <Form.Item name="sortOrder" label="排序号">
                    <Input type="number" placeholder="请输入排序号" min={0} />
                </Form.Item>
            </Form>
        </Modal>
    );
};

// ==================== 维度弹窗 ====================

interface DimensionModalProps {
    open: boolean;
    editing: DimensionDTO | null;
    treeData: DimensionCategory[];
    onCancel: () => void;
    onSave: (values: DimensionCmd) => void;
}

const DimensionModal: React.FC<DimensionModalProps> = ({ open, editing, treeData, onCancel, onSave }) => {
    const [form] = Form.useForm();
    const dimType = Form.useWatch('dimType', form);
    const dimensionKind = (Form.useWatch('dimensionKind', form) || DimensionKind.NORMAL) as DimensionKind;
    const sourceType = (Form.useWatch('sourceType', form) || DimensionSourceType.COLUMN) as DimensionSourceType;
    const tableName = Form.useWatch('tableName', form);
    const sourceTable = Form.useWatch('sourceTable', form);
    const columnName = Form.useWatch('columnName', form);
    const sourceExpr = Form.useWatch('sourceExpr', form);
    const [dimTableOptions, setDimTableOptions] = useState<{ id: string; name: string; schema?: string; catalog?: string; comment: string }[]>([]);
    const [sourceTableOptions, setSourceTableOptions] = useState<{ id: string; name: string; schema?: string; catalog?: string; comment: string }[]>([]);
    const [dimTableLoading, setDimTableLoading] = useState(false);
    const [tableColumns, setTableColumns] = useState<MetadataColumnDTO[]>([]);
    const [tableColumnsLoading, setTableColumnsLoading] = useState(false);
    const [dimValueList, setDimValueList] = useState<Array<{ code: string; name?: string }>>([]);
    const [dimValueLoading, setDimValueLoading] = useState(false);
    const [dimValueKeyword, setDimValueKeyword] = useState('');
    const usesSourceTable = dimensionKind === DimensionKind.DEGENERATE
        || (dimensionKind === DimensionKind.DERIVED && !!sourceTable);
    const activeTableName = usesSourceTable ? sourceTable : tableName;
    const activeTableOptions = usesSourceTable ? sourceTableOptions : dimTableOptions;
    const canPreviewValues = !!activeTableName && (sourceType !== DimensionSourceType.EXPRESSION
        ? !!columnName
        : !!sourceExpr);

    const buildQualifiedTableName = useCallback((item: { name: string; schema?: string; catalog?: string }) => {
        if (item.catalog && item.schema) return `${item.catalog}.${item.schema}.${item.name}`;
        if (item.schema) return `${item.schema}.${item.name}`;
        return item.name;
    }, []);

    // 根据 tableName 查找对应的 tableId
    const findTableIdByName = useCallback((name: string | undefined): string | undefined => {
        if (!name) return undefined;
        return [...dimTableOptions, ...sourceTableOptions]
            .find(opt => opt.name === name || buildQualifiedTableName(opt) === name)?.id;
    }, [dimTableOptions, sourceTableOptions, buildQualifiedTableName]);

    // 加载字段列表
    const loadTableColumns = useCallback(async (name: string | undefined) => {
        const tableId = findTableIdByName(name);
        if (!tableId) {
            setTableColumns([]);
            return;
        }
        setTableColumnsLoading(true);
        try {
            const res = await MetadataTableSelectorApi.columns(tableId);
            if (res.code === 200 && res.data) {
                setTableColumns(res.data);
            } else {
                setTableColumns([]);
            }
        } catch {
            message.error('加载字段列表失败');
            setTableColumns([]);
        } finally {
            setTableColumnsLoading(false);
        }
    }, [findTableIdByName]);

    // 监听 tableName 变化，自动加载字段列表
    useEffect(() => {
        if (open) {
            loadTableColumns(activeTableName);
        }
    }, [activeTableName, open, loadTableColumns]);

    useEffect(() => {
        if (open) {
            if (editing) {
                form.setFieldsValue({
                    dimCode: editing.dimCode,
                    dimName: editing.dimName,
                    dimType: editing.dimType,
                    dimensionKind: editing.dimensionKind || DimensionKind.NORMAL,
                    dataType: editing.dataType,
                    categoryId: editing.categoryId,
                    schemaName: editing.schemaName,
                    tableName: editing.tableName,
                    columnName: editing.columnName,
                    displayColumn: editing.displayColumn,
                    sourceType: editing.sourceType || DimensionSourceType.COLUMN,
                    sourceExpr: editing.sourceExpr,
                    sourceTable: editing.sourceTable,
                    hierarchyCode: editing.hierarchyCode,
                    hierarchyName: editing.hierarchyName,
                    parentDimCode: editing.parentDimCode,
                    hierarchyLevel: editing.hierarchyLevel,
                    sortOrder: editing.sortOrder,
                    dimValues: editing.dimValues,
                    description: editing.description,
                });
            } else {
                form.resetFields();
                form.setFieldsValue({
                    dimensionKind: DimensionKind.NORMAL,
                    sourceType: DimensionSourceType.COLUMN,
                    sortOrder: 0,
                });
            }
            // 加载维表列表
            setDimTableLoading(true);
            Promise.all([
                MetadataTableSelectorApi.list({ layerCode: 'DIM' }),
                MetadataTableSelectorApi.list(),
            ])
                .then(([dimRes, allRes]) => {
                    if (dimRes.code === 200 && dimRes.data) {
                        const list = (dimRes.data.data || []).map((item) => ({
                            id: item.id,
                            name: item.name,
                            schema: item.table?.schema,
                            catalog: item.table?.catalog,
                            comment: item.comment || item.table?.comment || '',
                        }));
                        setDimTableOptions(list);
                    }
                    if (allRes.code === 200 && allRes.data) {
                        const list = (allRes.data.data || []).map((item) => ({
                            id: item.id,
                            name: item.name,
                            schema: item.table?.schema,
                            catalog: item.table?.catalog,
                            comment: item.comment || item.table?.comment || '',
                        }));
                        setSourceTableOptions(list);
                    }
                })
                .catch(() => {
                    message.error('加载数仓表列表失败');
                })
                .finally(() => {
                    setDimTableLoading(false);
                });
        }
    }, [open, editing, form]);

    const buildCategoryTreeData = (
        list: DimensionCategory[]
    ): React.ComponentProps<typeof TreeSelect>['treeData'] => {
        return list.map(item => ({
            key: item.id,
            value: item.id,
            title: item.name,
            children: item.children
                ? buildCategoryTreeData(item.children)
                : undefined,
        }));
    };

    const handleSyncEnums = () => {
        if (!activeTableName) {
            message.warning('请先选择可查询表');
            return;
        }
        const columnName = form.getFieldValue('columnName');
        if (!columnName) {
            message.warning('请先选择关联字段');
            return;
        }
        message.info('同步枚举值功能即将上线，敬请期待');
    };

    const loadDimensionValues = async () => {
        const currentColumnName = form.getFieldValue('columnName');
        const displayColumn = form.getFieldValue('displayColumn');
        const currentSourceExpr = form.getFieldValue('sourceExpr');
        const valueExpr = sourceType === DimensionSourceType.EXPRESSION
            ? currentSourceExpr
            : currentColumnName ? `\`${currentColumnName}\`` : '';
        if (!activeTableName || !valueExpr) {
            message.warning('请先选择可查询表并配置字段或表达式');
            return;
        }
        const tableInfo = activeTableOptions.find(opt => opt.name === activeTableName || buildQualifiedTableName(opt) === activeTableName);
        if (!tableInfo || !tableInfo.schema) {
            message.warning('未找到表的 schema 信息');
            return;
        }
        setDimValueLoading(true);
        try {
            const parts = tableInfo.catalog
                ? [tableInfo.catalog, tableInfo.schema, tableInfo.name]
                : [tableInfo.schema, tableInfo.name];
            const tableRef = parts.map(p => `\`${p}\``).join('.');

            const cols = [`${valueExpr} AS value`];
            if (displayColumn && sourceType !== DimensionSourceType.EXPRESSION) cols.push(`\`${displayColumn}\` AS label`);

            let sql = `SELECT DISTINCT ${cols.join(', ')} FROM ${tableRef}`;
            if (dimValueKeyword && displayColumn) {
                sql += ` WHERE \`${displayColumn}\` LIKE '%${dimValueKeyword.replace(/'/g, "''")}%' `;
            }
            sql += ' LIMIT 100';

            const res = await executeSparkSql(sql);
            if (res.code === 200 && res.data) {
                const rows = (res.data.data || []) as Record<string, unknown>[];
                const list = rows.map((row) => ({
                    code: String(row.value ?? row[Object.keys(row)[0]] ?? ''),
                    name: displayColumn ? String(row.label ?? row[Object.keys(row)[1]] ?? '') : undefined,
                }));
                setDimValueList(list);
            } else {
                message.error(res.data?.errorMessage || res.message || '查询失败');
                setDimValueList([]);
            }
        } catch (e) {
            message.error(e instanceof Error ? e.message : '加载维度值失败');
            setDimValueList([]);
        } finally {
            setDimValueLoading(false);
        }
    };

    const handleSubmit = (values: DimensionCmd) => {
        const kind = values.dimensionKind || DimensionKind.NORMAL;
        const payload: DimensionCmd = {
            ...values,
            dimensionKind: kind,
            sortOrder: values.sortOrder ?? 0,
        };
        if (kind === DimensionKind.NORMAL) {
            payload.sourceType = DimensionSourceType.COLUMN;
            payload.sourceTable = undefined;
            payload.sourceExpr = undefined;
            payload.hierarchyCode = undefined;
            payload.hierarchyName = undefined;
            payload.parentDimCode = undefined;
            payload.hierarchyLevel = undefined;
        }
        if (kind === DimensionKind.HIERARCHY) {
            payload.sourceType = DimensionSourceType.COLUMN;
            payload.sourceTable = undefined;
            payload.sourceExpr = undefined;
        }
        if (kind === DimensionKind.DEGENERATE) {
            payload.tableName = undefined;
            payload.schemaName = undefined;
            payload.displayColumn = undefined;
            payload.hierarchyCode = undefined;
            payload.hierarchyName = undefined;
            payload.parentDimCode = undefined;
            payload.hierarchyLevel = undefined;
        }
        if (kind === DimensionKind.DERIVED) {
            payload.sourceType = DimensionSourceType.EXPRESSION;
            payload.columnName = undefined;
            payload.displayColumn = undefined;
            payload.hierarchyCode = undefined;
            payload.hierarchyName = undefined;
            payload.parentDimCode = undefined;
            payload.hierarchyLevel = undefined;
        }
        onSave(payload);
    };

    return (
        <Modal
            title={editing ? '编辑维度' : '新增维度'}
            open={open}
            onOk={() => form.submit()}
            onCancel={onCancel}
            destroyOnClose
            width={960}
        >
            <Row gutter={24} style={{ minHeight: 560 }}>
                <Col span={14}>
                    <Form form={form} onFinish={handleSubmit} layout="vertical">
                        <Form.Item name="dimCode" label="维度编码">
                            <Input placeholder={editing ? undefined : '不填则系统自动生成'} disabled={!!editing} />
                        </Form.Item>
                        <Form.Item name="dimName" label="维度名称" rules={[{ required: true, message: '请输入维度名称' }]}>
                            <Input placeholder="如：日期维度" />
                        </Form.Item>
                        <Form.Item name="dimType" label="维度类型" rules={[{ required: true, message: '请选择维度类型' }]}>
                            <Select placeholder="选择维度类型">
                                {Object.values(DimType).map(t => (
                                    <Select.Option key={t} value={t}>{dimTypeMap[t] || t}</Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item name="dimensionKind" label="维度实现类型" rules={[{ required: true, message: '请选择维度实现类型' }]}>
                            <Select
                                placeholder="选择维度实现类型"
                                onChange={(value: DimensionKind) => {
                                    if (value === DimensionKind.NORMAL || value === DimensionKind.HIERARCHY) {
                                        form.setFieldsValue({ sourceType: DimensionSourceType.COLUMN, sourceTable: undefined, sourceExpr: undefined });
                                    }
                                    if (value === DimensionKind.DEGENERATE) {
                                        form.setFieldsValue({ sourceType: DimensionSourceType.COLUMN, tableName: undefined, schemaName: undefined, displayColumn: undefined });
                                    }
                                    if (value === DimensionKind.DERIVED) {
                                        form.setFieldsValue({ sourceType: DimensionSourceType.EXPRESSION, columnName: undefined, displayColumn: undefined });
                                    }
                                }}
                            >
                                {Object.values(DimensionKind).map(t => (
                                    <Select.Option key={t} value={t}>{dimensionKindMap[t]}</Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item name="dataType" label="数据类型" rules={[{ required: true, message: '请选择数据类型' }]}>
                            <Select placeholder="选择数据类型">
                                {Object.values(DataType).map(t => (
                                    <Select.Option key={t} value={t}>{dataTypeMap[t] || t}</Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item name="categoryId" label="所属分类">
                            <TreeSelect
                                treeData={buildCategoryTreeData(treeData)}
                                placeholder="选择所属分类"
                                allowClear
                                treeDefaultExpandAll
                            />
                        </Form.Item>
                        {(dimensionKind === DimensionKind.NORMAL || dimensionKind === DimensionKind.HIERARCHY || dimensionKind === DimensionKind.DERIVED) && (
                            <>
                                <Form.Item
                                    name="tableName"
                                    label={dimensionKind === DimensionKind.DERIVED ? '绑定维表（可选）' : '关联维表'}
                                    rules={dimensionKind === DimensionKind.NORMAL || dimensionKind === DimensionKind.HIERARCHY
                                        ? [{ required: true, message: '请选择关联维表' }]
                                        : undefined}
                                >
                                    <Select
                                        showSearch
                                        placeholder={dimensionKind === DimensionKind.DERIVED ? '可选：表达式基于维表时选择' : '选择关联维表'}
                                        allowClear
                                        loading={dimTableLoading}
                                        optionFilterProp="label"
                                        options={dimTableOptions.map(item => ({
                                            value: item.name,
                                            label: `${item.name}${item.comment ? ' - ' + item.comment : ''}`,
                                        }))}
                                        onChange={(value) => {
                                            const selected = dimTableOptions.find(opt => opt.name === value);
                                            form.setFieldValue('schemaName', selected?.schema || '');
                                            if (dimensionKind === DimensionKind.DERIVED && value) {
                                                form.setFieldValue('sourceTable', undefined);
                                            }
                                        }}
                                    />
                                </Form.Item>
                                <Form.Item name="schemaName" label="维表 Schema">
                                    <Input placeholder="选择维表后自动填充，也可手动修改" />
                                </Form.Item>
                            </>
                        )}
                        {(dimensionKind === DimensionKind.DEGENERATE || dimensionKind === DimensionKind.DERIVED) && (
                            <Form.Item
                                name="sourceTable"
                                label={dimensionKind === DimensionKind.DERIVED ? '绑定事实表（可选）' : '来源事实表'}
                                rules={dimensionKind === DimensionKind.DEGENERATE
                                    ? [{ required: true, message: '请选择来源事实表' }]
                                    : [
                                        ({ getFieldValue }) => ({
                                            validator(_, value) {
                                                if (dimensionKind !== DimensionKind.DERIVED || value || getFieldValue('tableName')) {
                                                    return Promise.resolve();
                                                }
                                                return Promise.reject(new Error('派生维度必须绑定事实表或维表'));
                                            },
                                        }),
                                    ]}
                            >
                                <Select
                                    showSearch
                                    placeholder={dimensionKind === DimensionKind.DERIVED ? '可选：表达式基于事实表时选择' : '选择来源事实表'}
                                    allowClear
                                    loading={dimTableLoading}
                                    optionFilterProp="label"
                                    options={sourceTableOptions.map(item => ({
                                        value: buildQualifiedTableName(item),
                                        label: `${buildQualifiedTableName(item)}${item.comment ? ' - ' + item.comment : ''}`,
                                    }))}
                                    onChange={(value) => {
                                        if (dimensionKind === DimensionKind.DERIVED && value) {
                                            form.setFieldsValue({ tableName: undefined, schemaName: undefined });
                                        }
                                    }}
                                />
                            </Form.Item>
                        )}
                        {(dimensionKind === DimensionKind.DEGENERATE || dimensionKind === DimensionKind.DERIVED) && (
                            <Form.Item name="sourceType" label="来源类型" rules={[{ required: true, message: '请选择来源类型' }]}>
                                <Select
                                    placeholder="选择来源类型"
                                    disabled={dimensionKind === DimensionKind.DERIVED}
                                    options={Object.values(DimensionSourceType).map(t => ({
                                        value: t,
                                        label: sourceTypeMap[t],
                                    }))}
                                />
                            </Form.Item>
                        )}
                        {sourceType !== DimensionSourceType.EXPRESSION && (
                            <Form.Item
                                name="columnName"
                                label={dimensionKind === DimensionKind.DEGENERATE ? '事实表字段' : '关联字段'}
                                rules={[{ required: dimensionKind !== DimensionKind.DERIVED, message: '请选择字段' }]}
                            >
                                <Select
                                    showSearch
                                    placeholder={activeTableName ? '选择字段' : '请先选择可查询表'}
                                    allowClear
                                    disabled={!activeTableName || tableColumnsLoading}
                                    loading={tableColumnsLoading}
                                    optionFilterProp="label"
                                    options={tableColumns.map(col => ({
                                        value: col.col,
                                        label: `${col.col}${col.comment ? ' - ' + col.comment : ''}`,
                                    }))}
                                />
                            </Form.Item>
                        )}
                        {(sourceType === DimensionSourceType.JSON_PATH || sourceType === DimensionSourceType.EXPRESSION) && (
                            <Form.Item
                                name="sourceExpr"
                                label={sourceType === DimensionSourceType.JSON_PATH ? 'JSON Path' : 'SQL 表达式'}
                                rules={[{ required: sourceType === DimensionSourceType.EXPRESSION, message: '请输入来源表达式' }]}
                            >
                                <TextArea
                                    rows={3}
                                    placeholder={sourceType === DimensionSourceType.JSON_PATH
                                        ? '$.properties.user_level'
                                        : "如：CASE WHEN `age` < 18 THEN '未成年' ELSE '成年' END"}
                                />
                            </Form.Item>
                        )}
                        {(dimensionKind === DimensionKind.NORMAL || dimensionKind === DimensionKind.HIERARCHY) && (
                            <Form.Item name="displayColumn" label="显示字段">
                                <Select
                                    showSearch
                                    placeholder={activeTableName ? '选择 BI 展示时用的名称字段（如 name）' : '请先选择关联维表'}
                                    allowClear
                                    disabled={!activeTableName || tableColumnsLoading}
                                    loading={tableColumnsLoading}
                                    optionFilterProp="label"
                                    options={tableColumns.map(col => ({
                                        value: col.col,
                                        label: `${col.col}${col.comment ? ' - ' + col.comment : ''}`,
                                    }))}
                                />
                            </Form.Item>
                        )}
                        {dimensionKind === DimensionKind.HIERARCHY && (
                            <Row gutter={12}>
                                <Col span={12}>
                                    <Form.Item name="hierarchyCode" label="层级编码" rules={[{ required: true, message: '请输入层级编码' }]}>
                                        <Input placeholder="如：GEO_REGION" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="hierarchyName" label="层级名称">
                                        <Input placeholder="如：地理层级" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="parentDimCode" label="父级维度编码">
                                        <Input placeholder="如：DIM_PROVINCE" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="hierarchyLevel" label="层级级别" rules={[{ required: true, message: '请输入层级级别' }]}>
                                        <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                            </Row>
                        )}
                        <Form.Item name="sortOrder" label="排序号">
                            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                        </Form.Item>
                        {dimType === DimType.ENUM && (
                            <Form.Item label="维度可选值">
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <Form.Item name="dimValues" noStyle>
                                        <Select
                                            mode="tags"
                                            placeholder="输入可选值后按回车确认"
                                            allowClear
                                            tokenSeparators={[',']}
                                            style={{ flex: 1 }}
                                        />
                                    </Form.Item>
                                    <Button
                                        disabled={!tableName}
                                        onClick={handleSyncEnums}
                                    >
                                        同步枚举值
                                    </Button>
                                </div>
                            </Form.Item>
                        )}
                        <Form.Item name="description" label="描述">
                            <TextArea rows={2} placeholder="描述该维度的业务含义" />
                        </Form.Item>
                    </Form>
                </Col>
                <Col span={10}>
                    <Card
                        title="维度值预览"
                        size="small"
                        // style={{ height: 580 }}
                        extra={
                            <Button
                                type="primary"
                                size="small"
                                onClick={loadDimensionValues}
                                loading={dimValueLoading}
                                disabled={!canPreviewValues}
                            >
                                加载维度值
                            </Button>
                        }
                    >
                        <Input.Search
                            placeholder="搜索维度值名称"
                            allowClear
                            size="small"
                            value={dimValueKeyword}
                            onChange={(e) => setDimValueKeyword(e.target.value)}
                            onSearch={loadDimensionValues}
                            style={{ marginBottom: 12 }}
                        />
                        <div style={{ height: 680, overflow: 'auto' }}>
                            <Table
                                size="small"
                                loading={dimValueLoading}
                                dataSource={dimValueList}
                                rowKey="code"
                                pagination={false}
                                columns={[
                                    { title: '编码', dataIndex: 'code', key: 'code', ellipsis: true },
                                    { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true },
                                ]}
                                locale={{ emptyText: '点击「加载维度值」获取数据' }}
                            />
                        </div>
                    </Card>
                </Col>
            </Row>
        </Modal>
    );
};

// ==================== 主页面 ====================

const DimensionPage: React.FC = () => {
    // 分类树状态
    const [categoryTree, setCategoryTree] = useState<DimensionCategory[]>([]);
    const [categoryLoading, setCategoryLoading] = useState(false);
    const [selectedCategoryKeys, setSelectedCategoryKeys] = useState<string[]>(['__ALL__']);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<DimensionCategory | null>(null);
    const [defaultParentId, setDefaultParentId] = useState<string | undefined>(undefined);

    // 维度列表状态
    const [dimensions, setDimensions] = useState<DimensionDTO[]>([]);
    const [dimensionLoading, setDimensionLoading] = useState(false);
    const [dimensionModalOpen, setDimensionModalOpen] = useState(false);
    const [editingDimension, setEditingDimension] = useState<DimensionDTO | null>(null);
    const [pageNum, setPageNum] = useState(1);
    const [pageSize] = useState(20);
    const [total, setTotal] = useState(0);

    const selectedCategory = useMemo(() => {
        if (selectedCategoryKeys.length === 0 || selectedCategoryKeys[0] === '__ALL__') return undefined;
        const findById = (list: DimensionCategory[], id: string): DimensionCategory | undefined => {
            for (const item of list) {
                if (item.id === id) return item;
                if (item.children) {
                    const found = findById(item.children, id);
                    if (found) return found;
                }
            }
            return undefined;
        };
        return findById(categoryTree, selectedCategoryKeys[0]);
    }, [selectedCategoryKeys, categoryTree]);

    const fetchCategories = useCallback(async () => {
        setCategoryLoading(true);
        try {
            const res = await DimensionCategoryApi.tree();
            if (res.code === 200 && res.data) {
                setCategoryTree(res.data);
            }
        } catch {
            message.error('获取分类树失败');
        } finally {
            setCategoryLoading(false);
        }
    }, []);

    const fetchDimensions = useCallback(async (page = 1, query?: DimensionPageQuery) => {
        setDimensionLoading(true);
        try {
            const params: DimensionPageQuery = {
                pageNum: page,
                pageSize,
                ...query,
            };
            const res = await DimensionApi.page(params);
            if (res.code === 200 && res.data) {
                setDimensions(res.data.list);
                setTotal(res.data.total);
            }
        } catch {
            message.error('获取维度列表失败');
        } finally {
            setDimensionLoading(false);
        }
    }, [pageSize]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    useEffect(() => {
        const query: DimensionPageQuery = {};
        if (selectedCategory) {
            query.categoryId = selectedCategory.id;
        }
        if (searchKeyword) {
            query.dimName = searchKeyword;
        }
        fetchDimensions(1, query);
    }, [selectedCategory, searchKeyword, fetchDimensions]);

    const handleCategorySelect = (keys: string[]) => {
        setSelectedCategoryKeys(keys.length > 0 ? keys : ['__ALL__']);
        setPageNum(1);
    };

    const handleSaveCategory = async (values: DimensionCategoryCmd) => {
        try {
            const payload: DimensionCategoryCmd = {
                ...values,
                sortOrder: values.sortOrder ? Number(values.sortOrder) : 0,
            };
            if (editingCategory) {
                await DimensionCategoryApi.update(editingCategory.id, payload);
                message.success('更新成功');
            } else {
                await DimensionCategoryApi.create(payload);
                message.success('创建成功');
            }
            setCategoryModalOpen(false);
            setEditingCategory(null);
            fetchCategories();
        } catch {
            message.error('保存失败');
        }
    };

    const handleDeleteCategory = async (id: string) => {
        try {
            await DimensionCategoryApi.deleteById(id);
            message.success('删除成功');
            if (selectedCategoryKeys.includes(id)) {
                setSelectedCategoryKeys([]);
            }
            fetchCategories();
        } catch {
            message.error('删除失败');
        }
    };

    const handleAddRootCategory = () => {
        setEditingCategory(null);
        setDefaultParentId(undefined);
        setCategoryModalOpen(true);
    };

    const handleAddChildCategory = (parent: DimensionCategory) => {
        setEditingCategory(null);
        setDefaultParentId(parent.id);
        setCategoryModalOpen(true);
    };

    const handleEditCategory = (category: DimensionCategory) => {
        setEditingCategory(category);
        setDefaultParentId(undefined);
        setCategoryModalOpen(true);
    };

    const handleSaveDimension = async (values: DimensionCmd) => {
        try {
            if (editingDimension) {
                await DimensionApi.update(editingDimension.id, values);
                message.success('更新成功');
            } else {
                await DimensionApi.create(values);
                message.success('创建成功');
            }
            setDimensionModalOpen(false);
            setEditingDimension(null);
            fetchDimensions(pageNum);
        } catch {
            message.error('保存失败');
        }
    };

    const handleDeleteDimension = async (id: string) => {
        try {
            await DimensionApi.delete(id);
            message.success('删除成功');
            fetchDimensions(pageNum);
        } catch {
            message.error('删除失败');
        }
    };

    const handleAddDimension = () => {
        setEditingDimension(null);
        setDimensionModalOpen(true);
    };

    const handleEditDimension = (record: DimensionDTO) => {
        setEditingDimension(record);
        setDimensionModalOpen(true);
    };

    const columns = [
        { title: '维度编码', dataIndex: 'dimCode', key: 'dimCode'},
        { title: '维度名称', dataIndex: 'dimName', key: 'dimName' },
        {
            title: '维度类型',
            dataIndex: 'dimType',
            key: 'dimType',
            render: (v: DimType) => (
                <Tag color={dimTypeColorMap[v]}>{dimTypeMap[v] || v}</Tag>
            ),
        },
        {
            title: '实现类型',
            dataIndex: 'dimensionKind',
            key: 'dimensionKind',
            render: (v?: DimensionKind) => {
                const kind = v || DimensionKind.NORMAL;
                return <Tag color={dimensionKindColorMap[kind]}>{dimensionKindMap[kind] || kind}</Tag>;
            },
        },
        {
            title: '数据类型',
            dataIndex: 'dataType',
            key: 'dataType',
            render: (v: DataType) => dataTypeMap[v] || v,
        },
        {
            title: '关联维表',
            key: 'tableRef',
            render: (_: unknown, record: DimensionDTO) => {
                if (record.sourceTable) {
                    const field = record.columnName || record.sourceExpr;
                    return field ? `${record.sourceTable}.${field}` : record.sourceTable;
                }
                if (!record.tableName) return record.sourceExpr || '-';
                const tableRef = record.schemaName
                    ? `${record.schemaName}.${record.tableName}`
                    : record.tableName;
                return record.columnName
                    ? `${tableRef}.${record.columnName}`
                    : tableRef;
            },
        },
        {
            title: '层级',
            key: 'hierarchy',
            render: (_: unknown, record: DimensionDTO) => {
                if ((record.dimensionKind || DimensionKind.NORMAL) !== DimensionKind.HIERARCHY) return '-';
                const level = record.hierarchyLevel ? `L${record.hierarchyLevel}` : 'L-';
                return `${record.hierarchyName || record.hierarchyCode || '-'} / ${level}`;
            },
        },
        { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
        {
            title: '操作',
            key: 'action',
            fixed: 'right',
            render: (_: unknown, record: DimensionDTO) => (
                <Space>
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => handleEditDimension(record)}
                    >
                        编辑
                    </Button>
                    <Popconfirm
                        title="确认删除？"
                        onConfirm={() => handleDeleteDimension(record.id)}
                    >
                        <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ display: 'flex', height: '100%', width: '100%' }}>
            {/* 左侧分类树 */}
            <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid #f0f0f0', background: '#fff' }}>
                <CategoryTree
                    treeData={categoryTree}
                    loading={categoryLoading}
                    selectedKeys={selectedCategoryKeys}
                    onSelect={handleCategorySelect}
                    onAddRoot={handleAddRootCategory}
                    onAddChild={handleAddChildCategory}
                    onEdit={handleEditCategory}
                    onDelete={handleDeleteCategory}
                />
            </div>

            {/* 右侧维度列表 */}
            <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
                <Card style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                        <Title level={5} style={{ margin: 0, whiteSpace: 'nowrap' }}>
                            {selectedCategory ? selectedCategory.name : '全部维度'}
                        </Title>
                        <Input.Search
                            placeholder="搜索维度名称或描述"
                            allowClear
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            onSearch={(value) => {
                                setSearchKeyword(value);
                                setPageNum(1);
                            }}
                            style={{ maxWidth: 320 }}
                        />
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddDimension}>
                            新增维度
                        </Button>
                    </div>
                </Card>

                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={dimensions}
                    loading={dimensionLoading}
                    pagination={{ current: pageNum, pageSize, total, onChange: setPageNum, showTotal: (t) => `共 ${t} 条` }}
                    scroll={{ x: 1000 }}
                    locale={{ emptyText: <Empty description="暂无维度数据" /> }}
                />
            </div>

            <CategoryModal
                open={categoryModalOpen}
                editing={editingCategory}
                defaultParentId={defaultParentId}
                treeData={categoryTree}
                onCancel={() => { setCategoryModalOpen(false); setEditingCategory(null); setDefaultParentId(undefined); }}
                onSave={handleSaveCategory}
            />

            <DimensionModal
                open={dimensionModalOpen}
                editing={editingDimension}
                treeData={categoryTree}
                onCancel={() => { setDimensionModalOpen(false); setEditingDimension(null); }}
                onSave={handleSaveDimension}
            />
        </div>
    );
};

export default DimensionPage;
