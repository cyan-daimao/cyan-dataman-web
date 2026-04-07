import React, {useEffect, useMemo, useState} from 'react';
import {
    Alert,
    Button,
    Card,
    Col,
    Divider,
    Form,
    Input,
    InputNumber,
    message,
    Modal,
    Row,
    Select,
    Space,
    Spin,
    Switch,
    Table,
    Tabs,
    Typography
} from 'antd';
import {ArrowLeftOutlined, CloudSyncOutlined, DeleteOutlined, PlusOutlined, SaveOutlined, MenuFoldOutlined, MenuUnfoldOutlined, UpOutlined, DownOutlined} from '@ant-design/icons';
import {Column, Index, IndexType, MysqlType, tableApi, TableSchemaCmd} from '@/api/DSApi';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {ColumnType} from 'antd/es/table';

const {Title, Text} = Typography;

// 生成简单的 UUID
const generateId = () => Math.random().toString(36).substr(2, 9);


// 支持精度的 MySQL 类型
const TYPES_WITH_PRECISION = new Set([
    'TINYINT', 'SMALLINT', 'MEDIUMINT', 'INT', 'BIGINT', 'INTEGER',
    'FLOAT', 'DOUBLE',
    'DECIMAL', 'NUMERIC',
    'CHAR', 'VARCHAR',
]);

// 支持标度（小数位）的 MySQL 类型
const TYPES_WITH_SCALE = new Set([
    'FLOAT', 'DOUBLE',
    'DECIMAL', 'NUMERIC',
]);

// 支持无符号的 MySQL 类型（整数类型）
const UNSIGNED_TYPES = new Set([
    'TINYINT', 'SMALLINT', 'MEDIUMINT', 'INT', 'BIGINT', 'INTEGER',
]);

// 判断类型是否支持精度
const supportsPrecision = (type: string): boolean => {
    const upperType = type.toUpperCase();
    return TYPES_WITH_PRECISION.has(upperType);
};

// 判断类型是否支持标度
const supportsScale = (type: string): boolean => {
    const upperType = type.toUpperCase();
    return TYPES_WITH_SCALE.has(upperType);
};

// 判断类型是否支持无符号
const supportsUnsigned = (type: string): boolean => {
    const upperType = type.toUpperCase();
    return UNSIGNED_TYPES.has(upperType);
};

// 生成默认的时间字段
const createDefaultTimeColumns = (): EditableColumn[] => [
    {
        _id: generateId(),
        name: 'create_by',
        type: 'VARCHAR',
        precision: 255,
        comment: '创建人',
        nullable: false,
        defaultValue: '',
    },{
        _id: generateId(),
        name: 'update_by',
        type: 'VARCHAR',
        precision: 255,
        comment: '更新人',
        nullable: false,
        defaultValue: '',
    },
    {
        _id: generateId(),
        name: 'created_at',
        type: 'DATETIME',
        comment: '创建时间',
        nullable: false,
        defaultValue: 'CURRENT_TIMESTAMP',
    },
    {
        _id: generateId(),
        name: 'updated_at',
        type: 'DATETIME',
        comment: '更新时间',
        nullable: false,
        defaultValue: 'CURRENT_TIMESTAMP',
    },
    {
        _id: generateId(),
        name: 'deleted_at',
        type: 'DATETIME',
        comment: '删除时间',
        nullable: true,
    },
];

// 生成默认的时间索引
const createDefaultTimeIndexes = (): EditableIndex[] => [
    {
        _id: generateId(),
        name: 'idx_created_at',
        indexType: 'INDEX',
        fieldNames: ['created_at'],
    },
    {
        _id: generateId(),
        name: 'idx_updated_at',
        indexType: 'INDEX',
        fieldNames: ['updated_at'],
    },
];

// 带有临时 ID 的字段（用于前端编辑）
type EditableColumn = Column & { _id: string };

// 带有临时 ID 的索引
type EditableIndex = Index & { _id: string };

const TableSchemaEdit: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const dsId = searchParams.get('dsId');
    const dbName = searchParams.get('dbName');
    const tableName = searchParams.get('tableName');
    const isNewTable = searchParams.get('isNew') === 'true' || !tableName;

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // 基本信息表单
    const [tableNameValue, setTableNameValue] = useState(tableName || '');
    const [tableComment, setTableComment] = useState('');

    // 字段列表
    const [columns, setColumns] = useState<EditableColumn[]>([]);
    // 索引列表
    const [indexes, setIndexes] = useState<EditableIndex[]>([]);

    // CDC 状态
    const [cdcEnabled, setCdcEnabled] = useState(false);

    // 右侧面板折叠状态
    const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

    // 同步模态框
    const [syncModalVisible, setSyncModalVisible] = useState(false);

    useEffect(() => {
        if (dsId && dbName && tableName && !isNewTable) {
            fetchTableSchema();
        } else if (isNewTable) {
            // 新建表时，初始化默认的时间字段和索引
            setColumns(createDefaultTimeColumns());
            setIndexes(createDefaultTimeIndexes());
        }
    }, [dsId, dbName, tableName, isNewTable]);

    // 检查并补充缺失的时间字段
    const ensureDefaultTimeColumns = (existingColumns: EditableColumn[]): {
        columns: EditableColumn[];
        addedCount: number;
        addedNames: string[];
    } => {
        const existingNames = existingColumns.map(col => col.name.toLowerCase());
        const addedNames: string[] = [];

        const defaultCols = createDefaultTimeColumns();
        const missingCols = defaultCols.filter(col => !existingNames.includes(col.name.toLowerCase()));

        if (missingCols.length > 0) {
            addedNames.push(...missingCols.map(col => col.name));
        }

        return {
            columns: [...existingColumns, ...missingCols],
            addedCount: missingCols.length,
            addedNames,
        };
    };

    // 检查并补充缺失的时间索引
    const ensureDefaultTimeIndexes = (
        existingIndexes: EditableIndex[],
        allColumnNames: string[]
    ): EditableIndex[] => {
        const existingIndexFields = new Set(
            existingIndexes.flatMap(idx => idx.fieldNames.map(f => f.toLowerCase()))
        );

        const defaultIndexes = createDefaultTimeIndexes();
        const missingIndexes = defaultIndexes.filter(idx => {
            const fieldName = idx.fieldNames[0];
            return !existingIndexFields.has(fieldName.toLowerCase()) &&
                allColumnNames.includes(fieldName.toLowerCase());
        });

        return [...existingIndexes, ...missingIndexes];
    };

    const fetchTableSchema = async () => {
        if (!dsId || !dbName || !tableName) return;

        setLoading(true);
        try {
            const response = await tableApi.getSchema(dsId, dbName, tableName);
            if (response.code === 200) {
                const schema = response.data;
                setTableNameValue(schema.tableName);
                setTableComment(schema.tableComment || '');

                const loadedColumns = (schema.columns || []).map(col => ({...col, _id: generateId()}));

                // 检查并补充缺失的时间字段
                const {columns: finalColumns, addedCount, addedNames} = ensureDefaultTimeColumns(loadedColumns);
                setColumns(finalColumns);

                if (addedCount > 0) {
                    message.info(`已自动添加缺失的时间字段: ${addedNames.join(', ')}`);
                }

                // 加载索引并补充缺失的时间索引
                const loadedIndexes = (schema.indexes || []).map(idx => ({...idx, _id: generateId()}));
                const allColumnNames = finalColumns.map(col => col.name.toLowerCase());
                const finalIndexes = ensureDefaultTimeIndexes(loadedIndexes, allColumnNames);
                setIndexes(finalIndexes);
            } else {
                message.error(response.message || '获取表结构失败');
            }
        } catch (error) {
            console.error('获取表结构失败:', error);
            message.error('获取表结构失败');
        } finally {
            setLoading(false);
        }
    };

    // 生成 DDL 预览
    const ddlPreview = useMemo(() => {
        if (!tableNameValue) return '-- 请输入表名';

        const columnDefs = columns.map(col => {
            let def = `  \`${col.name}\` ${col.type}`;

            // 只有支持精度的类型才显示括号
            if (supportsPrecision(col.type)) {
                if (col.precision !== undefined && col.precision !== null) {
                    if (supportsScale(col.type) && col.scale !== undefined && col.scale !== null) {
                        def += `(${col.precision}, ${col.scale})`;
                    } else {
                        def += `(${col.precision})`;
                    }
                }
            }

            // 无符号属性（仅整数类型）
            if (col.unsigned && supportsUnsigned(col.type)) {
                def += ' UNSIGNED';
            }

            if (!col.nullable) def += ' NOT NULL';
            if (col.autoIncrement) def += ' AUTO_INCREMENT';
            if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
            if (col.comment) def += ` COMMENT '${col.comment}'`;
            return def;
        });

        const indexDefs = indexes.map(idx => {
            const fields = idx.fieldNames.map(f => `\`${f}\``).join(', ');
            switch (idx.indexType.toUpperCase()) {
                case 'PRIMARY':
                    return `  PRIMARY KEY (${fields})`;
                case 'UNIQUE':
                    return `  UNIQUE KEY \`${idx.name}\` (${fields})`;
                default:
                    return `  KEY \`${idx.name}\` (${fields})`;
            }
        });

        const allDefs = [...columnDefs, ...indexDefs];
        let sql = `CREATE TABLE \`${tableNameValue}\`
                   (
                       ${allDefs.join(',\n')}
                   )`;
        if (tableComment) sql += ` COMMENT='${tableComment}'`;
        sql += ';';

        return sql;
    }, [tableNameValue, columns, indexes, tableComment]);

    const handleBack = () => {
        // 返回列表页，保留数据源和数据库选择
        if (dsId && dbName) {
            navigate(`/meta/business-ds/table-schema?dsId=${dsId}&dbName=${dbName}`);
        } else {
            navigate('/meta/business-ds/table-schema');
        }
    };

    // 添加字段（在 created_at 上方插入）
    const handleAddColumn = () => {
        const newColumn: EditableColumn = {
            _id: generateId(),
            name: '',
            type: 'VARCHAR',
            comment: '',
            nullable: false,
            autoIncrement: false,
        };

        // 找到 created_at 字段的索引
        const createdAtIndex = columns.findIndex(
            col => col.name.toLowerCase() === 'created_at'
        );

        if (createdAtIndex === -1) {
            // 如果没有 created_at，添加到列表开头
            setColumns([newColumn, ...columns]);
        } else {
            // 在 created_at 上方插入
            const newColumns = [...columns];
            newColumns.splice(createdAtIndex, 0, newColumn);
            setColumns(newColumns);
        }
    };

    // 更新字段
    const handleUpdateColumn = (id: string, field: keyof EditableColumn, value: unknown) => {
        setColumns(columns.map(col =>
            col._id === id ? {...col, [field]: value} : col
        ));
    };

    // 删除字段
    const handleDeleteColumn = (id: string) => {
        setColumns(columns.filter(col => col._id !== id));
    };

    // 上移字段
    const handleMoveColumnUp = (index: number) => {
        if (index === 0) return;
        const newColumns = [...columns];
        [newColumns[index - 1], newColumns[index]] = [newColumns[index], newColumns[index - 1]];
        setColumns(newColumns);
    };

    // 下移字段
    const handleMoveColumnDown = (index: number) => {
        if (index === columns.length - 1) return;
        const newColumns = [...columns];
        [newColumns[index], newColumns[index + 1]] = [newColumns[index + 1], newColumns[index]];
        setColumns(newColumns);
    };

    // 判断字段是否在主键索引中
    const isPrimaryKeyField = (fieldName: string): boolean => {
        return indexes.some(idx =>
            idx.indexType.toUpperCase() === 'PRIMARY' &&
            idx.fieldNames.some(f => f.toLowerCase() === fieldName.toLowerCase())
        );
    };

    // 添加索引
    const handleAddIndex = () => {
        setIndexes([
            ...indexes,
            {
                _id: generateId(),
                name: '',
                indexType: 'INDEX',
                fieldNames: [],
            }
        ]);
    };

    // 更新索引
    const handleUpdateIndex = (id: string, field: keyof EditableIndex, value: unknown) => {
        const newIndexes = indexes.map(idx =>
            idx._id === id ? {...idx, [field]: value} : idx
        );
        setIndexes(newIndexes);

        // 当索引更新时，检查并清理非主键字段的自增属性
        const primaryKeyFields = new Set(
            newIndexes
                .filter(idx => idx.indexType.toUpperCase() === 'PRIMARY')
                .flatMap(idx => idx.fieldNames.map(f => f.toLowerCase()))
        );

        setColumns(prevColumns =>
            prevColumns.map(col => {
                if (col.autoIncrement && !primaryKeyFields.has(col.name.toLowerCase())) {
                    return {...col, autoIncrement: false};
                }
                return col;
            })
        );
    };

    // 删除索引
    const handleDeleteIndex = (id: string) => {
        const newIndexes = indexes.filter(idx => idx._id !== id);
        setIndexes(newIndexes);

        // 当索引删除时，检查并清理非主键字段的自增属性
        const primaryKeyFields = new Set(
            newIndexes
                .filter(idx => idx.indexType.toUpperCase() === 'PRIMARY')
                .flatMap(idx => idx.fieldNames.map(f => f.toLowerCase()))
        );

        setColumns(prevColumns =>
            prevColumns.map(col => {
                if (col.autoIncrement && !primaryKeyFields.has(col.name.toLowerCase())) {
                    return {...col, autoIncrement: false};
                }
                return col;
            })
        );
    };

    // 上移索引
    const handleMoveIndexUp = (index: number) => {
        if (index === 0) return;
        const newIndexes = [...indexes];
        [newIndexes[index - 1], newIndexes[index]] = [newIndexes[index], newIndexes[index - 1]];
        setIndexes(newIndexes);
    };

    // 下移索引
    const handleMoveIndexDown = (index: number) => {
        if (index === indexes.length - 1) return;
        const newIndexes = [...indexes];
        [newIndexes[index], newIndexes[index + 1]] = [newIndexes[index + 1], newIndexes[index]];
        setIndexes(newIndexes);
    };

    // 保存草稿
    const handleSaveDraft = async () => {
        if (!tableNameValue.trim()) {
            message.warning('请输入表名');
            return;
        }

        // 验证字段名
        const hasEmptyName = columns.some(col => !col.name.trim());
        if (hasEmptyName) {
            message.warning('字段名不能为空');
            return;
        }

        // 检查并补充缺失的时间字段
        const {columns: finalColumns, addedCount, addedNames} = ensureDefaultTimeColumns(columns);

        if (addedCount > 0) {
            message.info(`已自动添加缺失的时间字段: ${addedNames.join(', ')}`);
            setColumns(finalColumns);
            // 同时补充缺失的索引
            const allColumnNames = finalColumns.map(col => col.name.toLowerCase());
            const finalIndexes = ensureDefaultTimeIndexes(indexes, allColumnNames);
            setIndexes(finalIndexes);
            return; // 让用户确认后再保存
        }

        if (columns.length === 0) {
            message.warning('请至少添加一个字段');
            return;
        }

        if (!dsId || !dbName) {
            message.error('缺少数据源或数据库信息');
            return;
        }

        setSaving(true);
        try {
            const cmd: TableSchemaCmd = {
                tableName: tableNameValue,
                tableComment,
                columns: finalColumns.map(({_id, ...col}) => col),
                indexes: indexes.map(({_id, ...idx}) => idx),
            };

            let response;
            if (isNewTable) {
                response = await tableApi.create(dsId, dbName, cmd);
            } else if (tableName) {
                response = await tableApi.update(dsId, dbName, tableName, cmd);
            }

            if (response && response.code === 200) {
                message.success('保存成功');
                // 返回列表页，保留数据源和数据库选择
                navigate(`/meta/business-ds/table-schema?dsId=${dsId}&dbName=${dbName}`);
            } else {
                message.error(response?.message || '保存失败');
            }
        } catch (error) {
            console.error('保存失败:', error);
            message.error('保存失败');
        } finally {
            setSaving(false);
        }
    };

    // 同步到生产
    const handleSyncToProduction = () => {
        setSyncModalVisible(true);
    };

    // 确认同步
    const handleConfirmSync = async () => {
        // TODO: 调用同步接口
        message.info('同步功能开发中');
        setSyncModalVisible(false);
    };

    // 字段表格列配置
    const columnColumns: ColumnType<EditableColumn>[] = [
        {
            title: '字段名',
            dataIndex: 'name',
            key: 'name',
            width: 120,
            render: (value: string, record: EditableColumn) => (
                <Input
                    value={value}
                    onChange={e => handleUpdateColumn(record._id, 'name', e.target.value)}
                    placeholder="字段名"
                />
            ),
        },
        {
            title: '数据类型',
            dataIndex: 'type',
            key: 'type',
            width: 100,
            render: (value: string, record: EditableColumn) => (
                <Select
                    value={value}
                    onChange={v => handleUpdateColumn(record._id, 'type', v)}
                    style={{width: '100%'}}
                    showSearch
                    optionFilterProp="children"
                >
                    {Object.values(MysqlType).map(t => (
                        <Select.Option key={t} value={t}>{t}</Select.Option>
                    ))}
                </Select>
            ),
        },
        {
            title: '精度',
            dataIndex: 'precision',
            key: 'precision',
            width: 50,
            render: (value: number | undefined, record: EditableColumn) => (
                <InputNumber
                    value={value}
                    onChange={v => handleUpdateColumn(record._id, 'precision', v ?? undefined)}
                    min={0}
                    placeholder="精度"
                    disabled={!supportsPrecision(record.type)}
                />
            ),
        },
        {
            title: '标度',
            dataIndex: 'scale',
            key: 'scale',
            width: 50,
            render: (value: number | undefined, record: EditableColumn) => (
                <InputNumber
                    value={value}
                    onChange={v => handleUpdateColumn(record._id, 'scale', v ?? undefined)}
                    min={0}
                    placeholder="标度"
                    disabled={!supportsScale(record.type)}
                />
            ),
        },
        {
            title: '无符号',
            dataIndex: 'unsigned',
            key: 'unsigned',
            width: 50,
            render: (value: boolean | undefined, record: EditableColumn) => (
                <Switch
                    size="small"
                    checked={value || false}
                    onChange={v => handleUpdateColumn(record._id, 'unsigned', v)}
                    disabled={!supportsUnsigned(record.type)}
                />
            ),
        },
        {
            title: '可空',
            dataIndex: 'nullable',
            key: 'nullable',
            width: 50,
            render: (value: boolean, record: EditableColumn) => (
                <Switch
                    size="small"
                    checked={value}
                    onChange={v => handleUpdateColumn(record._id, 'nullable', v)}
                />
            ),
        },
        {
            title: '自增',
            dataIndex: 'autoIncrement',
            key: 'autoIncrement',
            width: 50,
            render: (value: boolean, record: EditableColumn) => {
                const isPrimaryKey = isPrimaryKeyField(record.name);
                return (
                    <Switch
                        size="small"
                        checked={value}
                        onChange={v => handleUpdateColumn(record._id, 'autoIncrement', v)}
                        disabled={!isPrimaryKey}
                        title={!isPrimaryKey ? '只有主键字段才能设置自增' : ''}
                    />
                );
            },
        },
        {
            title: '默认值',
            dataIndex: 'defaultValue',
            key: 'defaultValue',
            width: 80,
            render: (value: string | undefined, record: EditableColumn) => (
                <Input
                    value={value}
                    onChange={e => handleUpdateColumn(record._id, 'defaultValue', e.target.value)}
                    placeholder="默认值"
                />
            ),
        },
        {
            title: '注释',
            dataIndex: 'comment',
            key: 'comment',
            width: 120,
            render: (value: string, record: EditableColumn) => (
                <Input
                    value={value}
                    onChange={e => handleUpdateColumn(record._id, 'comment', e.target.value)}
                    placeholder="注释"
                />
            ),
        },
        {
            title: '',
            key: 'action',
            width: 100,
            render: (_: unknown, record: EditableColumn, index: number) => (
                <Space size={0}>
                    <Button
                        type="text"
                        icon={<UpOutlined/>}
                        onClick={() => handleMoveColumnUp(index)}
                        disabled={index === 0}
                        title="上移"
                    />
                    <Button
                        type="text"
                        icon={<DownOutlined/>}
                        onClick={() => handleMoveColumnDown(index)}
                        disabled={index === columns.length - 1}
                        title="下移"
                    />
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined/>}
                        onClick={() => handleDeleteColumn(record._id)}
                        title="删除"
                    />
                </Space>
            ),
        },
    ];

    // 索引表格列配置
    const indexColumns: ColumnType<EditableIndex>[] = [
        {
            title: '索引名',
            dataIndex: 'name',
            key: 'name',
            width: 180,
            render: (value: string, record: EditableIndex) => (
                <Input
                    value={value}
                    onChange={e => handleUpdateIndex(record._id, 'name', e.target.value)}
                    placeholder="索引名"
                />
            ),
        },
        {
            title: '类型',
            dataIndex: 'indexType',
            key: 'indexType',
            width: 120,
            render: (value: string, record: EditableIndex) => (
                <Select
                    value={value}
                    onChange={v => handleUpdateIndex(record._id, 'indexType', v)}
                    style={{width: '100%'}}
                >
                    {Object.values(IndexType).map(t => (
                        <Select.Option key={t} value={t}>{t}</Select.Option>
                    ))}
                </Select>
            ),
        },
        {
            title: '包含字段',
            dataIndex: 'fieldNames',
            key: 'fieldNames',
            render: (value: string[], record: EditableIndex) => (
                <Select
                    mode="multiple"
                    value={value}
                    onChange={v => handleUpdateIndex(record._id, 'fieldNames', v)}
                    style={{width: '100%'}}
                    placeholder="选择字段"
                >
                    {columns.filter(col => col.name).map(col => (
                        <Select.Option key={col._id} value={col.name}>{col.name}</Select.Option>
                    ))}
                </Select>
            ),
        },
        {
            title: '',
            key: 'action',
            width: 100,
            render: (_: unknown, record: EditableIndex, index: number) => (
                <Space size={0}>
                    <Button
                        type="text"
                        icon={<UpOutlined/>}
                        onClick={() => handleMoveIndexUp(index)}
                        disabled={index === 0}
                        title="上移"
                    />
                    <Button
                        type="text"
                        icon={<DownOutlined/>}
                        onClick={() => handleMoveIndexDown(index)}
                        disabled={index === indexes.length - 1}
                        title="下移"
                    />
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined/>}
                        onClick={() => handleDeleteIndex(record._id)}
                        title="删除"
                    />
                </Space>
            ),
        },
    ];

    if (loading) {
        return (
            <div style={{padding: '24px', textAlign: 'center'}}>
                <Spin size="large"/>
            </div>
        );
    }

    return (
        <div style={{padding: '24px'}}>
            <Card style={{position: 'relative'}}>
                <Row justify="space-between" align="middle" style={{marginBottom: 16}}>
                    <Col>
                        <Space>
                            <Button icon={<ArrowLeftOutlined/>} onClick={handleBack}>
                                返回
                            </Button>
                            <Divider type="vertical"/>
                            <Title level={4} style={{margin: 0}}>
                                {isNewTable ? '新建表' : `编辑表: ${tableName}`}
                            </Title>
                        </Space>
                    </Col>
                    <Col>
                        <Space>
                            <Button icon={<SaveOutlined/>} onClick={handleSaveDraft} loading={saving}>
                                保存草稿
                            </Button>
                            {!isNewTable && (
                                <Button
                                    type="primary"
                                    icon={<CloudSyncOutlined/>}
                                    onClick={handleSyncToProduction}
                                >
                                    同步到生产
                                </Button>
                            )}
                        </Space>
                    </Col>
                </Row>

                <Divider/>

                <Row gutter={24}>
                    {/* 左侧：表结构定义 */}
                    <Col span={rightPanelCollapsed ? 24 : 16}>
                        <Card title="表结构定义" size="small">
                            <Space direction="vertical" style={{width: '100%'}} size="large">
                                {/* 基本信息 */}
                                <div>
                                    <Text strong>基本信息</Text>
                                    <Row gutter={16} style={{marginTop: 8}}>
                                        <Col span={12}>
                                            <Form.Item label="表名" style={{marginBottom: 8}}>
                                                <Input
                                                    value={tableNameValue}
                                                    onChange={e => setTableNameValue(e.target.value)}
                                                    placeholder="请输入表名"
                                                    disabled={!isNewTable}
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item label="表注释" style={{marginBottom: 8}}>
                                                <Input
                                                    value={tableComment}
                                                    onChange={e => setTableComment(e.target.value)}
                                                    placeholder="请输入表注释"
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                </div>

                                {/* CDC 状态 */}
                                {cdcEnabled && (
                                    <Alert
                                        message="开启后，表结构变更将自动同步至大数据平台。"
                                        type="info"
                                        showIcon
                                    />
                                )}

                                {/* 字段管理 */}
                                <div>
                                    <Row justify="space-between" align="middle" style={{marginBottom: 8}}>
                                        <Col><Text strong>字段管理</Text></Col>
                                        <Col>
                                            <Button
                                                type="dashed"
                                                icon={<PlusOutlined/>}
                                                onClick={handleAddColumn}
                                            >
                                                添加字段
                                            </Button>
                                        </Col>
                                    </Row>
                                    <Table
                                        columns={columnColumns}
                                        dataSource={columns}
                                        rowKey="_id"
                                        bordered
                                        pagination={false}
                                        size="small"
                                        scroll={{x: 1200}}
                                    />
                                </div>

                                {/* 索引管理 */}
                                <div>
                                    <Row justify="space-between" align="middle" style={{marginBottom: 8}}>
                                        <Col><Text strong>索引管理</Text></Col>
                                        <Col>
                                            <Button
                                                type="dashed"
                                                icon={<PlusOutlined/>}
                                                onClick={handleAddIndex}
                                            >
                                                添加索引
                                            </Button>
                                        </Col>
                                    </Row>
                                    <Table
                                        columns={indexColumns}
                                        dataSource={indexes}
                                        rowKey="_id"
                                        bordered
                                        pagination={false}
                                        size="small"
                                    />
                                </div>
                            </Space>
                        </Card>
                    </Col>

                    {/* 右侧：预览与操作 */}
                    {!rightPanelCollapsed && (
                        <Col span={8}>
                            <Card title="DDL 预览" size="small">
                                <Input.TextArea
                                    value={ddlPreview}
                                    rows={15}
                                    readOnly
                                    style={{fontFamily: 'monospace'}}
                                />
                            </Card>

                            <Card title="环境对比" size="small" style={{marginTop: 16}}>
                                <Tabs
                                    size="small"
                                    items={[
                                        {
                                            key: 'test',
                                            label: '测试环境',
                                            children: (
                                                <div style={{padding: 8, background: '#fafafa', borderRadius: 4}}>
                                                    <Text type="secondary">暂无测试环境数据</Text>
                                                </div>
                                            ),
                                        },
                                        {
                                            key: 'prod',
                                            label: '生产环境',
                                            children: (
                                                <div style={{padding: 8, background: '#fafafa', borderRadius: 4}}>
                                                    <Text type="secondary">暂无生产环境数据</Text>
                                                </div>
                                            ),
                                        },
                                        {
                                            key: 'diff',
                                            label: '差异对比',
                                            children: (
                                                <div style={{padding: 8, background: '#fafafa', borderRadius: 4}}>
                                                    <Text type="secondary">暂无差异</Text>
                                                </div>
                                            ),
                                        },
                                    ]}
                                />
                            </Card>
                        </Col>
                    )}

                    {/* 折叠按钮 */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '50%',
                            right: rightPanelCollapsed ? 0 : 0,
                            transform: 'translateY(-50%)',
                            zIndex: 10,
                        }}
                    >
                        <Button
                            type="text"
                            icon={rightPanelCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                            onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
                            style={{
                                background: '#fff',
                                border: '1px solid #d9d9d9',
                                borderRadius: rightPanelCollapsed ? '4px 0 0 4px' : '0 4px 4px 0',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            }}
                        />
                    </div>
                </Row>
            </Card>

            {/* 同步确认模态框 */}
            <Modal
                title="确认同步到生产环境"
                open={syncModalVisible}
                onCancel={() => setSyncModalVisible(false)}
                onOk={handleConfirmSync}
                width={700}
            >
                <Alert
                    message="同步操作将修改生产环境数据库，请谨慎操作！"
                    type="warning"
                    showIcon
                    style={{marginBottom: 16}}
                />

                {cdcEnabled && (
                    <Alert
                        message="检测到该表开启了 CDC，同步后将自动更新大数据平台配置。"
                        type="info"
                        showIcon
                        style={{marginBottom: 16}}
                    />
                )}

                <Text strong>即将执行的 DDL：</Text>
                <Input.TextArea
                    value={ddlPreview}
                    rows={10}
                    readOnly
                    style={{fontFamily: 'monospace', marginTop: 8}}
                />
            </Modal>
        </div>
    );
};

export default TableSchemaEdit;
