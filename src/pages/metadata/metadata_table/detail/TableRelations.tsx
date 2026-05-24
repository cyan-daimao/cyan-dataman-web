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
import {BulbOutlined, DeleteOutlined, PlusOutlined, PartitionOutlined, TableOutlined} from "@ant-design/icons";
import {
    AiRelationSuggestionDTO,
    ColumnVO,
    getMetadataTableById,
    MetadataTableDTO,
    pageMetadataTables,
    tableRelationApi,
    TableRelationDTO,
} from "../../../../api/MetadataTableAPI";
import TableRelationGraph from "./TableRelationGraph";

const {Option} = Select;
const {TextArea} = Input;

interface TableRelationsProps {
    catalog: string;
    schema: string;
    table: string;
    tableComment?: string;
    columns: ColumnVO[];
}

const TableRelations: React.FC<TableRelationsProps> = ({catalog, schema, table, tableComment, columns}) => {
    const [loading, setLoading] = useState(false);
    const [outgoing, setOutgoing] = useState<TableRelationDTO[]>([]);
    const [incoming, setIncoming] = useState<TableRelationDTO[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [direction, setDirection] = useState<'outgoing' | 'incoming'>('outgoing');
    const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');
    const [targetTableOptions, setTargetTableOptions] = useState<MetadataTableDTO[]>([]);
    const [targetTableLoading, setTargetTableLoading] = useState(false);
    const [selectedTargetTable, setSelectedTargetTable] = useState<MetadataTableDTO | null>(null);
    const [targetColumns, setTargetColumns] = useState<ColumnVO[]>([]);
    const [targetColumnsLoading, setTargetColumnsLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [aiModalVisible, setAiModalVisible] = useState(false);
    const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<AiRelationSuggestionDTO[]>([]);
    const [selectedAiKeys, setSelectedAiKeys] = useState<React.Key[]>([]);
    const [saveAiLoading, setSaveAiLoading] = useState(false);

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

    const tableRef = (itemCatalog: string, itemSchema: string, itemTable: string) =>
        `${itemCatalog}.${itemSchema}.${itemTable}`;

    const currentTableRef = () => tableRef(catalog, schema, table);

    const isCurrentSource = (record: AiRelationSuggestionDTO) =>
        tableRef(record.sourceCatalog, record.sourceSchema, record.sourceTable) === currentTableRef();

    const getAiSuggestionKey = (_record: AiRelationSuggestionDTO, index?: number) => `ai-${index ?? 0}`;

    const handleAiSuggest = async () => {
        setAiModalVisible(true);
        setAiSuggestLoading(true);
        try {
            const resp = await tableRelationApi.aiSuggest({catalog, schema, table, maxCandidates: 8});
            const suggestions = resp.data || [];
            setAiSuggestions(suggestions);
            setSelectedAiKeys(suggestions.map((item, index) => getAiSuggestionKey(item, index)));
            if (suggestions.length === 0) {
                message.info('暂未发现可推荐的关联关系');
            }
        } catch (error) {
            message.error('AI 推荐失败');
            setAiSuggestions([]);
            setSelectedAiKeys([]);
        } finally {
            setAiSuggestLoading(false);
        }
    };

    const updateAiSuggestion = (index: number, patch: Partial<AiRelationSuggestionDTO>) => {
        setAiSuggestions(prev => prev.map((item, itemIndex) => (
            itemIndex === index ? {...item, ...patch} : item
        )));
    };

    const handleSaveAiSuggestions = async () => {
        const selected = aiSuggestions.filter((item, index) => selectedAiKeys.includes(getAiSuggestionKey(item, index)));
        if (selected.length === 0) {
            message.warning('请先选择要保存的推荐关系');
            return;
        }
        setSaveAiLoading(true);
        let successCount = 0;
        try {
            for (const item of selected) {
                await tableRelationApi.create({
                    sourceCatalog: item.sourceCatalog,
                    sourceSchema: item.sourceSchema,
                    sourceTable: item.sourceTable,
                    sourceColumn: item.sourceColumn,
                    targetCatalog: item.targetCatalog,
                    targetSchema: item.targetSchema,
                    targetTable: item.targetTable,
                    targetColumn: item.targetColumn,
                    joinType: item.joinType,
                    description: item.description,
                });
                successCount += 1;
            }
            message.success(`已保存 ${successCount} 条关联关系`);
            setAiModalVisible(false);
            setAiSuggestions([]);
            setSelectedAiKeys([]);
            loadRelations();
        } catch (error) {
            message.error(successCount > 0 ? `已保存 ${successCount} 条，剩余保存失败` : '保存推荐关系失败');
            loadRelations();
        } finally {
            setSaveAiLoading(false);
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

    const aiColumns: TableProps<AiRelationSuggestionDTO>['columns'] = [
        {
            title: '方向',
            key: 'direction',
            width: 80,
            render: (_, record) => isCurrentSource(record)
                ? <Tag color="green">出向</Tag>
                : <Tag color="purple">入向</Tag>,
        },
        {
            title: '本表字段',
            key: 'currentColumn',
            width: 180,
            render: (_, record, index) => {
                const currentIsSource = isCurrentSource(record);
                const options = currentIsSource ? record.sourceColumns : record.targetColumns;
                return (
                    <Select
                        value={currentIsSource ? record.sourceColumn : record.targetColumn}
                        onChange={(value) => updateAiSuggestion(index, currentIsSource ? {sourceColumn: value} : {targetColumn: value})}
                        style={{width: '100%'}}
                        options={(options || []).map(col => ({
                            label: `${col.name}${col.comment ? `（${col.comment}）` : ''}`,
                            value: col.name,
                        }))}
                    />
                );
            },
        },
        {
            title: '关联表',
            key: 'relationTable',
            width: 240,
            render: (_, record) => {
                const currentIsSource = isCurrentSource(record);
                const relationName = currentIsSource
                    ? tableRef(record.targetCatalog, record.targetSchema, record.targetTable)
                    : tableRef(record.sourceCatalog, record.sourceSchema, record.sourceTable);
                const relationComment = currentIsSource ? record.targetTableComment : record.sourceTableComment;
                return (
                    <div>
                        <div>{relationName}</div>
                        {relationComment && <div style={{fontSize: 12, color: '#999'}}>{relationComment}</div>}
                    </div>
                );
            },
        },
        {
            title: '关联字段',
            key: 'relationColumn',
            width: 180,
            render: (_, record, index) => {
                const currentIsSource = isCurrentSource(record);
                const options = currentIsSource ? record.targetColumns : record.sourceColumns;
                return (
                    <Select
                        value={currentIsSource ? record.targetColumn : record.sourceColumn}
                        onChange={(value) => updateAiSuggestion(index, currentIsSource ? {targetColumn: value} : {sourceColumn: value})}
                        style={{width: '100%'}}
                        options={(options || []).map(col => ({
                            label: `${col.name}${col.comment ? `（${col.comment}）` : ''}`,
                            value: col.name,
                        }))}
                    />
                );
            },
        },
        {
            title: 'JOIN类型',
            dataIndex: 'joinType',
            key: 'joinType',
            width: 120,
            render: (value: AiRelationSuggestionDTO['joinType'], _, index) => (
                <Select
                    value={value}
                    onChange={(joinType) => updateAiSuggestion(index, {joinType})}
                    style={{width: '100%'}}
                    options={[
                        {label: 'LEFT', value: 'LEFT'},
                        {label: 'INNER', value: 'INNER'},
                        {label: 'RIGHT', value: 'RIGHT'},
                    ]}
                />
            ),
        },
        {
            title: '置信度',
            dataIndex: 'confidence',
            key: 'confidence',
            width: 90,
            render: (value: number) => <Tag color={value >= 0.75 ? 'green' : value >= 0.5 ? 'gold' : 'default'}>{Math.round((value || 0) * 100)}%</Tag>,
        },
        {
            title: '推荐理由',
            key: 'reason',
            width: 260,
            render: (_, record, index) => (
                <TextArea
                    value={record.description || record.reason}
                    autoSize={{minRows: 1, maxRows: 3}}
                    onChange={(e) => updateAiSuggestion(index, {description: e.target.value})}
                />
            ),
        },
    ];

    return (
        <div>
            <Card size="small" loading={loading}>
                <div style={{marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <Radio.Group
                        value={viewMode}
                        onChange={(e) => setViewMode(e.target.value)}
                        optionType="button"
                        buttonStyle="solid"
                    >
                        <Radio.Button value="list">
                            <TableOutlined/> 列表
                        </Radio.Button>
                        <Radio.Button value="graph">
                            <PartitionOutlined/> 关系图谱
                        </Radio.Button>
                    </Radio.Group>
                    <Space>
                        <Button icon={<BulbOutlined/>} onClick={handleAiSuggest}>
                            AI 推荐
                        </Button>
                        <Button type="primary" icon={<PlusOutlined/>} onClick={() => setModalVisible(true)}>
                            添加关联
                        </Button>
                    </Space>
                </div>

                {viewMode === 'graph' ? (
                    <TableRelationGraph
                        catalog={catalog}
                        schema={schema}
                        table={table}
                        tableComment={tableComment}
                        outgoing={outgoing}
                        incoming={incoming}
                    />
                ) : (
                    <>
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
                    </>
                )}
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
                    <Form.Item name="description" label="描述" rules={[{required: true}]}>
                        <TextArea rows={3} placeholder="请输入关联描述"/>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="AI 推荐关联关系"
                open={aiModalVisible}
                onCancel={() => setAiModalVisible(false)}
                width={1100}
                destroyOnClose
                footer={[
                    <Button key="cancel" onClick={() => setAiModalVisible(false)}>
                        取消
                    </Button>,
                    <Button
                        key="save"
                        type="primary"
                        loading={saveAiLoading}
                        disabled={aiSuggestions.length === 0}
                        onClick={handleSaveAiSuggestions}
                    >
                        保存选中
                    </Button>,
                ]}
            >
                <Table
                    dataSource={aiSuggestions}
                    columns={aiColumns}
                    rowKey={getAiSuggestionKey}
                    loading={aiSuggestLoading}
                    size="small"
                    bordered
                    pagination={false}
                    scroll={{x: 1050}}
                    rowSelection={{
                        selectedRowKeys: selectedAiKeys,
                        onChange: (keys) => setSelectedAiKeys(keys),
                    }}
                    locale={{emptyText: aiSuggestLoading ? 'AI 分析中...' : '暂无推荐结果'}}
                />
            </Modal>
        </div>
    );
};

export default TableRelations;
