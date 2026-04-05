import React, { useEffect, useState } from 'react';
import {
    Button,
    Card,
    Col,
    Descriptions,
    Divider,
    Empty,
    message,
    Row,
    Space,
    Spin,
    Table,
    Tabs,
    Tag,
    Typography
} from 'antd';
import { ArrowLeftOutlined, EditOutlined, TableOutlined } from '@ant-design/icons';
import { tableApi, TableSchema, Column, Index, ColumnDataType, SecretLevel } from '@/api/DSApi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ColumnType } from 'antd/es/table';

const { Title, Text } = Typography;

const TableSchemaDetail: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const dsId = searchParams.get('dsId');
    const dbName = searchParams.get('dbName');
    const tableName = searchParams.get('tableName');

    const [loading, setLoading] = useState(false);
    const [tableSchema, setTableSchema] = useState<TableSchema | null>(null);

    useEffect(() => {
        if (dsId && dbName && tableName) {
            fetchTableSchema();
        }
    }, [dsId, dbName, tableName]);

    const fetchTableSchema = async () => {
        if (!dsId || !dbName || !tableName) return;

        setLoading(true);
        try {
            const response = await tableApi.getSchema(dsId, dbName, tableName);
            if (response.code === 200) {
                setTableSchema(response.data);
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

    const handleBack = () => {
        navigate('/business-ds/table-schema');
    };

    const handleEdit = () => {
        navigate(`/business-ds/table-schema/edit?dsId=${dsId}&dbName=${dbName}&tableName=${tableName}`);
    };

    const getDataTypeTag = (type: ColumnDataType) => {
        const colorMap: Record<ColumnDataType, string> = {
            [ColumnDataType.BOOLEAN]: 'cyan',
            [ColumnDataType.INTEGER]: 'blue',
            [ColumnDataType.LONG]: 'blue',
            [ColumnDataType.FLOAT]: 'geekblue',
            [ColumnDataType.DOUBLE]: 'geekblue',
            [ColumnDataType.DECIMAL]: 'purple',
            [ColumnDataType.STRING]: 'green',
            [ColumnDataType.DATE]: 'orange',
            [ColumnDataType.TIMESTAMP]: 'orange',
            [ColumnDataType.TIMESTAMP_TZ]: 'orange',
            [ColumnDataType.TIME]: 'orange',
            [ColumnDataType.BINARY]: 'magenta',
            [ColumnDataType.UUID]: 'volcano',
        };
        return <Tag color={colorMap[type] || 'default'}>{type}</Tag>;
    };

    const getSecretLevelTag = (level?: SecretLevel) => {
        if (!level) return '-';
        const colorMap: Record<SecretLevel, string> = {
            [SecretLevel.L1]: 'green',
            [SecretLevel.L2]: 'blue',
            [SecretLevel.L3]: 'orange',
            [SecretLevel.L4]: 'red',
        };
        return <Tag color={colorMap[level]}>{level}</Tag>;
    };

    const columnColumns: ColumnType<Column>[] = [
        {
            title: '字段名',
            dataIndex: 'name',
            key: 'name',
            width: 150,
            render: (name: string) => <Text strong>{name}</Text>,
        },
        {
            title: '数据类型',
            dataIndex: 'type',
            key: 'type',
            width: 120,
            render: (type: ColumnDataType) => getDataTypeTag(type),
        },
        {
            title: '精度/长度',
            key: 'precision',
            width: 100,
            render: (_: unknown, record: Column) => {
                if (record.precision !== undefined) {
                    return record.scale !== undefined 
                        ? `${record.precision},${record.scale}` 
                        : `${record.precision}`;
                }
                return '-';
            },
        },
        {
            title: '可空',
            dataIndex: 'nullable',
            key: 'nullable',
            width: 80,
            render: (nullable: boolean) => (
                <Tag color={nullable ? 'default' : 'red'}>
                    {nullable ? 'YES' : 'NO'}
                </Tag>
            ),
        },
        {
            title: '主键',
            key: 'primaryKey',
            width: 80,
            render: () => '-',
        },
        {
            title: '自增',
            dataIndex: 'autoIncrement',
            key: 'autoIncrement',
            width: 80,
            render: (auto: boolean) => auto ? <Tag color="blue">AUTO</Tag> : '-',
        },
        {
            title: '默认值',
            dataIndex: 'defaultValue',
            key: 'defaultValue',
            width: 120,
            ellipsis: true,
            render: (value: string) => value || '-',
        },
        {
            title: '敏感级别',
            dataIndex: 'secretLevel',
            key: 'secretLevel',
            width: 100,
            render: (level: SecretLevel) => getSecretLevelTag(level),
        },
        {
            title: '注释',
            dataIndex: 'comment',
            key: 'comment',
            ellipsis: true,
            render: (comment: string) => comment || '-',
        },
    ];

    const indexColumns: ColumnType<Index>[] = [
        {
            title: '索引名',
            dataIndex: 'name',
            key: 'name',
            width: 200,
        },
        {
            title: '类型',
            dataIndex: 'indexType',
            key: 'indexType',
            width: 120,
            render: (type: string) => <Tag color="blue">{type}</Tag>,
        },
        {
            title: '包含字段',
            dataIndex: 'fieldNames',
            key: 'fieldNames',
            render: (fields: string[]) => (
                <Space size={4} wrap>
                    {fields.map(field => (
                        <Tag key={field}>{field}</Tag>
                    ))}
                </Space>
            ),
        },
    ];

    if (loading) {
        return (
            <div style={{ padding: '24px', textAlign: 'center' }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!tableSchema) {
        return (
            <div style={{ padding: '24px' }}>
                <Card>
                    <Empty description="未找到表结构信息" />
                    <div style={{ textAlign: 'center', marginTop: 16 }}>
                        <Button onClick={handleBack}>返回列表</Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px' }}>
            <Card>
                <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                    <Col>
                        <Space>
                            <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
                                返回
                            </Button>
                            <Divider type="vertical" />
                            <TableOutlined />
                            <Title level={4} style={{ margin: 0 }}>
                                {tableName}
                            </Title>
                            <Text type="secondary">
                                {dbName} / {dsId}
                            </Text>
                        </Space>
                    </Col>
                    <Col>
                        <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>
                            编辑
                        </Button>
                    </Col>
                </Row>

                <Divider />

                <Tabs
                    defaultActiveKey="basic"
                    items={[
                        {
                            key: 'basic',
                            label: '基本信息',
                            children: (
                                <Descriptions bordered column={2}>
                                    <Descriptions.Item label="表名">{tableSchema.tableName}</Descriptions.Item>
                                    <Descriptions.Item label="表注释">{tableSchema.tableComment || '-'}</Descriptions.Item>
                                </Descriptions>
                            ),
                        },
                        {
                            key: 'columns',
                            label: `字段信息 (${tableSchema.columns.length})`,
                            children: (
                                <Table
                                    columns={columnColumns}
                                    dataSource={tableSchema.columns}
                                    rowKey="name"
                                    bordered
                                    pagination={false}
                                    size="small"
                                />
                            ),
                        },
                        {
                            key: 'indexes',
                            label: `索引 (${tableSchema.indexes?.length || 0})`,
                            children: tableSchema.indexes && tableSchema.indexes.length > 0 ? (
                                <Table
                                    columns={indexColumns}
                                    dataSource={tableSchema.indexes}
                                    rowKey="name"
                                    bordered
                                    pagination={false}
                                    size="small"
                                />
                            ) : (
                                <Empty description="暂无索引信息" />
                            ),
                        },
                    ]}
                />
            </Card>
        </div>
    );
};

export default TableSchemaDetail;
