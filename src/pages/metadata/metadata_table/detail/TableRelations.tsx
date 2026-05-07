import React, {useEffect, useState} from "react";
import {
    Button,
    Card,
    Form,
    Input,
    message,
    Modal,
    Popconfirm,
    Radio,
    Select,
    Space,
    Table,
    TableProps,
    Tag,
} from "antd";
import {DeleteOutlined, PlusOutlined} from "@ant-design/icons";
import {
    ColumnVO,
    getMetadataTableById,
    MetadataTableDTO,
    pageMetadataTables,
    tableRelationApi,
    TableRelationDTO,
} from "../../../../api/MetadataTableAPI";

const {Option} = Select;
const {TextArea} = Input;

interface TableRelationsProps {
    catalog: string;
    schema: string;
    table: string;
    columns: ColumnVO[];
}

const TableRelations: React.FC<TableRelationsProps> = ({catalog, schema, table, columns}) => {
    const [loading, setLoading] = useState(false);
    const [outgoing, setOutgoing] = useState<TableRelationDTO[]>([]);
    const [incoming, setIncoming] = useState<TableRelationDTO[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [direction, setDirection] = useState<'outgoing' | 'incoming'>('outgoing');
    const [targetTableOptions, setTargetTableOptions] = useState<MetadataTableDTO[]>([]);
    const [targetTableLoading, setTargetTableLoading] = useState(false);
    const [selectedTargetTable, setSelectedTargetTable] = useState<MetadataTableDTO | null>(null);
    const [targetColumns, setTargetColumns] = useState<ColumnVO[]>([]);
    const [targetColumnsLoading, setTargetColumnsLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);

    useEffect(() => {
        if (catalog && schema && table) {
            loadRelations();
        }
    }, [catalog, schema, table]);

    const loadRelations = async () => {
        setLoading(true);
        try {
            const resp = await tableRelationApi.getRelations(catalog, schema, table);
            const data = resp.data || {outgoing: [], incoming: []};
            setOutgoing(data.outgoing || []);
            setIncoming(data.incoming || []);
        } catch (error) {
            message.error('加载关联关系失败');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await tableRelationApi.delete(id);
            message.success('删除成功');
            loadRelations();
        } catch (error) {
            message.error('删除失败');
        }
    };

    const handleSearchTargetTable = async (keyword: string) => {
        setTargetTableLoading(true);
        try {
            const resp = await pageMetadataTables({content: keyword || undefined, current: 1, size: 20});
            const tables = resp.data || [];
            // 保留当前已选中的表，避免 Select 显示 ID
            setTargetTableOptions(prev => {
                const selected = prev.filter(t => t.id === form.getFieldValue('targetTableId'));
                const existingIds = new Set(selected.map(t => t.id));
                const newTables = tables.filter(t => !existingIds.has(t.id));
                return [...selected, ...newTables];
            });
        } catch (error) {
            message.error('搜索目标表失败');
        } finally {
            setTargetTableLoading(false);
        }
    };

    const handleTargetTableChange = async (tableId: string) => {
        const tableObj = targetTableOptions.find(t => t.id === tableId) || null;
        setSelectedTargetTable(tableObj);
        form.setFieldValue('targetColumn', undefined);
        if (tableObj) {
            setTargetColumnsLoading(true);
            try {
                const data = await getMetadataTableById(tableObj.id);
                setTargetColumns(data.table?.columns || []);
            } catch (error) {
                message.error('加载目标表字段失败');
                setTargetColumns([]);
            } finally {
                setTargetColumnsLoading(false);
            }
        } else {
            setTargetColumns([]);
        }
    };

    const handleModalOk = async () => {
        const values = await form.validateFields();
        if (!selectedTargetTable || !selectedTargetTable.table) {
            message.error('请选择有效的目标表');
            return;
        }

        const payload: Omit<TableRelationDTO, 'id'> = direction === 'outgoing'
            ? {
                sourceCatalog: catalog,
                sourceSchema: schema,
                sourceTable: table,
                sourceColumn: values.currentColumn,
                targetCatalog: selectedTargetTable.table.catalog,
                targetSchema: selectedTargetTable.table.schema,
                targetTable: selectedTargetTable.name,
                targetColumn: values.targetColumn,
                joinType: values.joinType,
                description: values.description,
            }
            : {
                sourceCatalog: selectedTargetTable.table.catalog,
                sourceSchema: selectedTargetTable.table.schema,
                sourceTable: selectedTargetTable.name,
                sourceColumn: values.targetColumn,
                targetCatalog: catalog,
                targetSchema: schema,
                targetTable: table,
                targetColumn: values.currentColumn,
                joinType: values.joinType,
                description: values.description,
            };

        setSubmitLoading(true);
        try {
            await tableRelationApi.create(payload);
            message.success('创建成功');
            setModalVisible(false);
            form.resetFields();
            setTargetTableOptions([]);
            setTargetColumns([]);
            setSelectedTargetTable(null);
            loadRelations();
        } catch (error) {
            message.error('创建失败');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleModalCancel = () => {
        setModalVisible(false);
        form.resetFields();
        setTargetTableOptions([]);
        setTargetColumns([]);
        setSelectedTargetTable(null);
    };

    const handleDirectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDirection(e.target.value as 'outgoing' | 'incoming');
    };

    const outgoingColumns: TableProps<TableRelationDTO>['columns'] = [
        {title: '本表字段', dataIndex: 'sourceColumn', key: 'sourceColumn'},
        {
            title: '目标表',
            key: 'targetTable',
            render: (_, record) => `${record.targetCatalog}.${record.targetSchema}.${record.targetTable}`,
        },
        {title: '目标字段', dataIndex: 'targetColumn', key: 'targetColumn'},
        {
            title: 'JOIN类型',
            dataIndex: 'joinType',
            key: 'joinType',
            width: 100,
            render: (text: string) => <Tag color="blue">{text}</Tag>,
        },
        {title: '描述', dataIndex: 'description', key: 'description', ellipsis: true},
        {
            title: '操作',
            key: 'action',
            width: 80,
            render: (_, record) => (
                <Popconfirm
                    title="确认删除"
                    description="确定要删除这条关联关系吗？"
                    onConfirm={() => handleDelete(record.id)}
                    okText="确定"
                    cancelText="取消"
                >
                    <Button type="link" danger icon={<DeleteOutlined/>}>删除</Button>
                </Popconfirm>
            ),
        },
    ];

    const incomingColumns: TableProps<TableRelationDTO>['columns'] = [
        {title: '本表字段', dataIndex: 'targetColumn', key: 'targetColumn'},
        {
            title: '目标表',
            key: 'sourceTable',
            render: (_, record) => `${record.sourceCatalog}.${record.sourceSchema}.${record.sourceTable}`,
        },
        {title: '目标字段', dataIndex: 'sourceColumn', key: 'sourceColumn'},
        {
            title: 'JOIN类型',
            dataIndex: 'joinType',
            key: 'joinType',
            width: 100,
            render: (text: string) => <Tag color="blue">{text}</Tag>,
        },
        {title: '描述', dataIndex: 'description', key: 'description', ellipsis: true},
        {
            title: '操作',
            key: 'action',
            width: 80,
            render: (_, record) => (
                <Popconfirm
                    title="确认删除"
                    description="确定要删除这条关联关系吗？"
                    onConfirm={() => handleDelete(record.id)}
                    okText="确定"
                    cancelText="取消"
                >
                    <Button type="link" danger icon={<DeleteOutlined/>}>删除</Button>
                </Popconfirm>
            ),
        },
    ];

    return (
        <div>
            <Card size="small" loading={loading}>
                <div style={{marginBottom: 16, display: 'flex', justifyContent: 'flex-end'}}>
                    <Button type="primary" icon={<PlusOutlined/>} onClick={() => setModalVisible(true)}>
                        添加关联
                    </Button>
                </div>

                <div style={{marginBottom: 24}}>
                    <h4 style={{marginBottom: 12}}>出向关联（本表 → 其他表）</h4>
                    <Table
                        dataSource={outgoing}
                        columns={outgoingColumns}
                        rowKey="id"
                        size="small"
                        bordered
                        pagination={false}
                        scroll={{x: 'max-content'}}
                        locale={{emptyText: '暂无出向关联'}}
                    />
                </div>

                <div>
                    <h4 style={{marginBottom: 12}}>入向关联（其他表 → 本表）</h4>
                    <Table
                        dataSource={incoming}
                        columns={incomingColumns}
                        rowKey="id"
                        size="small"
                        bordered
                        pagination={false}
                        scroll={{x: 'max-content'}}
                        locale={{emptyText: '暂无入向关联'}}
                    />
                </div>
            </Card>

            <Modal
                title="添加关联关系"
                open={modalVisible}
                onOk={handleModalOk}
                onCancel={handleModalCancel}
                width={600}
                destroyOnClose
                confirmLoading={submitLoading}
            >
                <Form form={form} layout="vertical" preserve={false}>
                    <Form.Item
                        name="direction"
                        label="方向"
                        initialValue="outgoing"
                        rules={[{required: true}]}
                    >
                        <Radio.Group onChange={handleDirectionChange}>
                            <Radio value="outgoing">出向（本表 → 其他表）</Radio>
                            <Radio value="incoming">入向（其他表 → 本表）</Radio>
                        </Radio.Group>
                    </Form.Item>
                    <Form.Item
                        name="targetTableId"
                        label="目标表"
                        rules={[{required: true, message: '请选择目标表'}]}
                    >
                        <Select
                            showSearch
                            placeholder="搜索并选择目标表"
                            onSearch={handleSearchTargetTable}
                            onChange={handleTargetTableChange}
                            onFocus={() => {
                                if (targetTableOptions.length === 0) {
                                    handleSearchTargetTable('');
                                }
                            }}
                            notFoundContent={targetTableLoading ? '加载中...' : '无数据'}
                            filterOption={false}
                            loading={targetTableLoading}
                        >
                            {targetTableOptions.map(t => (
                                <Option key={t.id} value={t.id}>
                                    <span>{t.name}</span>
                                    <span style={{fontSize: 12, color: '#999', marginLeft: 8}}>
                                        {t.comment || `${t.table?.catalog}.${t.table?.schema}`}
                                    </span>
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item
                        name="currentColumn"
                        label="本表字段"
                        rules={[{required: true, message: '请选择本表字段'}]}
                    >
                        <Select placeholder="选择本表字段">
                            {columns.map(col => (
                                <Option key={col.name} value={col.name}>{col.name}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item
                        name="targetColumn"
                        label="目标字段"
                        rules={[{required: true, message: '请选择目标字段'}]}
                    >
                        <Select
                            placeholder="选择目标字段"
                            loading={targetColumnsLoading}
                            disabled={!selectedTargetTable}
                        >
                            {targetColumns.map(col => (
                                <Option key={col.name} value={col.name}>{col.name}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item
                        name="joinType"
                        label="JOIN类型"
                        initialValue="LEFT"
                        rules={[{required: true}]}
                    >
                        <Select placeholder="选择JOIN类型">
                            <Option value="LEFT">LEFT JOIN</Option>
                            <Option value="INNER">INNER JOIN</Option>
                            <Option value="RIGHT">RIGHT JOIN</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="description" label="描述">
                        <TextArea rows={3} placeholder="请输入关联描述"/>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default TableRelations;
