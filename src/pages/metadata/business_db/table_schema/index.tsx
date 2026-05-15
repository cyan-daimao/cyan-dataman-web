import React, {useEffect, useState} from 'react';
import {
    Button,
    Card,
    Col,
    Form,
    Input,
    message,
    Modal,
    Popconfirm,
    Row,
    Select,
    Space,
    Table,
    Tag,
    Tooltip,
    Typography
} from 'antd';
import {
    DeleteOutlined,
    EditOutlined,
    EyeOutlined,
    HistoryOutlined,
    PlusOutlined,
    TableOutlined,
    SearchOutlined,
    DatabaseOutlined,
} from '@ant-design/icons';
import PermissionButton from '@/component/permission/PermissionButton';
import {Database, databaseApi, DatasourceType, DSApi, DsConfig, tableApi} from '@/api/DSApi';
import {ColumnType} from 'antd/es/table';
import {useNavigate, useSearchParams} from 'react-router-dom';

const {Title, Text} = Typography;

// 环境状态枚举
enum EnvStatus {
    SYNCED = 'SYNCED',
    PENDING = 'PENDING',
    TEST_BEHIND = 'TEST_BEHIND',
    APPROVING = 'APPROVING',
    REJECTED = 'REJECTED',
}

// 扩展的表信息（包含前端状态）
interface TableInfo {
    tableName: string;
    tableComment: string;
    cdcEnabled: boolean;
    envStatus: EnvStatus;
    updatedAt: string;
}

// 字段类型转换：MySQL/PostgreSQL 类型 -> Iceberg 类型
const convertToIcebergType = (dbType: string): string => {
    const upperType = dbType.toUpperCase().split('(')[0].trim();

    const commonTypeMap: Record<string, string> = {
        'CHAR': 'STRING',
        'VARCHAR': 'STRING',
        'TEXT': 'STRING',
        'MEDIUMTEXT': 'STRING',
        'LONGTEXT': 'STRING',
        'CLOB': 'STRING',
        'TINYINT': 'LONG',
        'SMALLINT': 'LONG',
        'INT': 'LONG',
        'INTEGER': 'LONG',
        'MEDIUMINT': 'LONG',
        'BIGINT': 'LONG',
        'SERIAL': 'LONG',
        'SMALLSERIAL': 'LONG',
        'BIGSERIAL': 'LONG',
        'FLOAT': 'FLOAT',
        'REAL': 'FLOAT',
        'DOUBLE': 'DOUBLE',
        'DOUBLE PRECISION': 'DOUBLE',
        'DECIMAL': 'DECIMAL',
        'NUMERIC': 'DECIMAL',
        'BOOLEAN': 'BOOLEAN',
        'BOOL': 'BOOLEAN',
        'DATE': 'DATE',
        'TIME': 'TIME',
        'DATETIME': 'TIMESTAMP',
        'TIMESTAMP': 'TIMESTAMP',
        'TIMESTAMP WITH TIME ZONE': 'TIMESTAMP_TZ',
        'BLOB': 'BINARY',
        'MEDIUMBLOB': 'BINARY',
        'LONGBLOB': 'BINARY',
        'BYTEA': 'BINARY',
        'BINARY': 'BINARY',
        'VARBINARY': 'BINARY',
        'UUID': 'UUID',
        'JSON': 'STRING',
        'JSONB': 'STRING',
        'ENUM': 'STRING',
        'SET': 'STRING',
    };

    return commonTypeMap[upperType] || 'STRING';
};

const TableSchemaManagement: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const urlDsName = searchParams.get('dsName');
    const urlDbName = searchParams.get('dbName');

    const [datasources, setDatasources] = useState<DsConfig[]>([]);
    const [databases, setDatabases] = useState<Database[]>([]);
    const [tables, setTables] = useState<TableInfo[]>([]);

    const [selectedDsName, setSelectedDsName] = useState<string | null>(urlDsName);
    const [selectedDbName, setSelectedDbName] = useState<string | null>(urlDbName);

    const [dsLoading, setDsLoading] = useState(false);
    const [dbLoading, setDbLoading] = useState(false);
    const [tableLoading, setTableLoading] = useState(false);

    const [searchKeyword, setSearchKeyword] = useState('');

    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [newTableName, setNewTableName] = useState('');

    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        fetchDatasources();
    }, []);

    useEffect(() => {
        if (datasources.length > 0 && urlDsName && !initialized) {
            const dsExists = datasources.some(ds => ds.name === urlDsName);
            if (dsExists) {
                setSelectedDsName(urlDsName);
                fetchDatabases(urlDsName);
            }
            setInitialized(true);
        }
    }, [datasources, urlDsName, initialized]);

    useEffect(() => {
        if (databases.length > 0 && urlDbName && selectedDsName === urlDsName && !selectedDbName) {
            const dbExists = databases.some(db => db.name === urlDbName);
            if (dbExists) {
                setSelectedDbName(urlDbName);
            }
        }
    }, [databases, urlDbName, selectedDsName, selectedDbName]);

    useEffect(() => {
        if (selectedDsName) {
            fetchDatabases(selectedDsName);
            if (selectedDsName !== urlDsName) {
                setSelectedDbName(null);
                setTables([]);
            }
        }
    }, [selectedDsName]);

    useEffect(() => {
        if (selectedDsName && selectedDbName) {
            fetchTables(selectedDsName, selectedDbName);
        }
    }, [selectedDsName, selectedDbName]);

    const fetchDatasources = async () => {
        setDsLoading(true);
        try {
            const response = await DSApi.list();
            if (response.code === 200) {
                setDatasources(response.data || []);
            }
        } catch (error) {
            console.error('获取数据源列表失败:', error);
            message.error('获取数据源列表失败');
        } finally {
            setDsLoading(false);
        }
    };

    const fetchDatabases = async (dsName: string) => {
        setDbLoading(true);
        try {
            const response = await databaseApi.list(dsName);
            if (response.code === 200) {
                setDatabases(response.data || []);
            }
        } catch (error) {
            console.error('获取数据库列表失败:', error);
            message.error('获取数据库列表失败');
        } finally {
            setDbLoading(false);
        }
    };

    const fetchTables = async (dsName: string, dbName: string) => {
        setTableLoading(true);
        try {
            const response = await tableApi.list(dsName, dbName);
            if (response.code === 200) {
                const tableInfos: TableInfo[] = (response.data || []).map(tbl => ({
                    tableName: tbl.tableName,
                    tableComment: tbl.tableComment,
                    cdcEnabled: false,
                    envStatus: EnvStatus.SYNCED,
                    updatedAt: new Date().toISOString(),
                }));
                setTables(tableInfos);
            }
        } catch (error) {
            console.error('获取表列表失败:', error);
            message.error('获取表列表失败');
        } finally {
            setTableLoading(false);
        }
    };

    const handleDsChange = (dsName: string) => {
        setSelectedDsName(dsName);
    };

    const handleDbChange = (dbName: string) => {
        setSelectedDbName(dbName);
    };

    const handleCreateTable = () => {
        setNewTableName('');
        setCreateModalVisible(true);
    };

    const handleCreateConfirm = () => {
        if (!newTableName.trim()) {
            message.warning('请输入表名');
            return;
        }
        navigate(`/meta/business-ds/table-schema/edit?dsName=${selectedDsName}&dbName=${selectedDbName}&tableName=${newTableName}&isNew=true`);
        setCreateModalVisible(false);
    };

    const handleViewDetail = (tableName: string) => {
        navigate(`/meta/business-ds/table-schema/detail?dsName=${selectedDsName}&dbName=${selectedDbName}&tableName=${tableName}`);
    };

    const handleEdit = (tableName: string) => {
        navigate(`/meta/business-ds/table-schema/edit?dsName=${selectedDsName}&dbName=${selectedDbName}&tableName=${tableName}`);
    };

    const handleDelete = async (tableName: string) => {
        if (!selectedDsName || !selectedDbName) return;

        try {
            const response = await tableApi.drop(selectedDsName, selectedDbName, tableName);
            if (response.code === 200) {
                message.success('删除成功');
                fetchTables(selectedDsName, selectedDbName);
            } else {
                message.error(response.message || '删除失败');
            }
        } catch (error) {
            console.error('删除表失败:', error);
            message.error('删除失败');
        }
    };

    const handleSyncHistory = async (tableName: string) => {
        if (!selectedDsName || !selectedDbName) return;

        try {
            const response = await tableApi.getSchema(selectedDsName, selectedDbName, tableName);
            if (response.code === 200 && response.data) {
                const tableSchema = response.data;

                const importData = {
                    id: '',
                    name: tableSchema.tableName,
                    owner: '',
                    subjectCode: '',
                    datasourceType: '',
                    layerCode: 'ODS',
                    comment: tableSchema.tableComment || '',
                    accessCount: '',
                    lastAccessTime: '',
                    heatLevel: '',
                    secretLevel: 'L1',
                    onlineStatus: 'ONLINE',
                    createdAt: '',
                    updatedAt: '',
                    table: {
                        catalog: selectedDsName,
                        schema: selectedDbName,
                        name: tableSchema.tableName,
                        comment: tableSchema.tableComment || '',
                        columns: tableSchema.columns.map(col => ({
                            name: col.name,
                            type: convertToIcebergType(col.type),
                            comment: col.comment || '',
                            nullable: col.nullable ?? true,
                            autoIncrement: col.autoIncrement ?? false,
                            defaultValue: col.defaultValue,
                            secretLevel: col.secretLevel || 'L1',
                        })),
                        indexes: tableSchema.indexes || [],
                    },
                };

                navigate('/meta/metadata/metadata_table/edit', {
                    state: {
                        mode: 'import',
                        importData: importData,
                    }
                });
            } else {
                message.error('获取表结构失败');
            }
        } catch (error) {
            console.error('获取表结构失败:', error);
            message.error('获取表结构失败');
        }
    };

    const getEnvStatusTag = (status: EnvStatus) => {
        const config: Record<EnvStatus, { color: string; text: string }> = {
            [EnvStatus.SYNCED]: {color: 'success', text: '生产已同步'},
            [EnvStatus.PENDING]: {color: 'warning', text: '待发布'},
            [EnvStatus.TEST_BEHIND]: {color: 'warning', text: '测试落后'},
            [EnvStatus.APPROVING]: {color: 'processing', text: '审批中'},
            [EnvStatus.REJECTED]: {color: 'error', text: '已拒绝'},
        };
        const {color, text} = config[status];
        return <Tag color={color}>{text}</Tag>;
    };

    const getDatasourceTypeTag = (type: DatasourceType) => {
        const colorMap: Record<DatasourceType, string> = {
            [DatasourceType.MYSQL]: 'blue',
            [DatasourceType.POSTGRESQL]: 'green',
            [DatasourceType.ICEBERG]: 'purple',
        };
        return <Tag color={colorMap[type] || 'default'}>{type}</Tag>;
    };

    const filteredTables = tables.filter(table =>
        table.tableName.toLowerCase().includes(searchKeyword.toLowerCase())
    );

    const columns: ColumnType<TableInfo>[] = [
        {
            title: '表名',
            dataIndex: 'tableName',
            key: 'tableName',
            width: 140,
            render: (name: string) => (
                <Space>
                    <TableOutlined style={{ color: '#8B909A' }} />
                    <span style={{fontWeight: 500, color: '#1D2333'}}>{name}</span>
                </Space>
            ),
        },
        {
            title: '描述',
            dataIndex: 'tableComment',
            key: 'tableComment',
            width: 180,
            ellipsis: true,
            render: (comment: string) => (
                <span style={{ color: '#8B909A' }}>{comment || '-'}</span>
            ),
        },
        {
            title: 'CDC状态',
            dataIndex: 'cdcEnabled',
            key: 'cdcEnabled',
            width: 100,
            render: (enabled: boolean) => (
                <Tag color={enabled ? 'success' : 'default'}>
                    {enabled ? '已启用' : '未启用'}
                </Tag>
            ),
        },
        {
            title: '环境状态',
            dataIndex: 'envStatus',
            key: 'envStatus',
            width: 120,
            render: (status: EnvStatus) => getEnvStatusTag(status),
        },
        {
            title: '操作',
            key: 'action',
            width: 160,
            fixed: 'right',
            render: (_: unknown, record: TableInfo) => (
                <Space size={4}>
                    <Tooltip title="查看详情">
                        <Button
                            type="text"
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => handleViewDetail(record.tableName)}
                            style={{ color: '#4F6DF5' }}
                        />
                    </Tooltip>
                    <Tooltip title="编辑">
                        <PermissionButton
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleEdit(record.tableName)}
                            style={{ color: '#4E5566' }}
                            permission="MENU:meta:business-ds:table:UPDATE"
                        />
                    </Tooltip>
                    <Tooltip title="同步表结构到数仓">
                        <Button
                            type="text"
                            size="small"
                            icon={<HistoryOutlined />}
                            onClick={() => handleSyncHistory(record.tableName)}
                            style={{ color: '#1A9F5C' }}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="确定删除该表吗？此操作不可恢复！"
                        onConfirm={() => handleDelete(record.tableName)}
                        okText="确定"
                        cancelText="取消"
                    >
                        <Tooltip title="删除">
                            <PermissionButton
                                type="text"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                permission="MENU:meta:business-ds:table:DELETE"
                            />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div className="page-container">
            {/* 页面标题区 */}
            <div className="page-header-section" style={{ marginBottom: 20 }}>
                <div className="page-title-wrapper">
                    <Title level={4} className="page-title">表结构管理</Title>
                    <Text className="page-subtitle">
                        浏览和管理数据库表结构，支持表结构同步到数据仓库
                    </Text>
                </div>
                <PermissionButton
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleCreateTable}
                    disabled={!selectedDsName || !selectedDbName}
                    size="middle"
                    permission="MENU:meta:business-ds:table:CREATE"
                >
                    新建表
                </PermissionButton>
            </div>

            {/* 搜索筛选区 */}
            <Card
                style={{
                    marginBottom: 16,
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(29, 35, 51, 0.03)',
                }}
                styles={{ body: { padding: '16px 20px' } }}
            >
                <Row gutter={[16, 12]} align="middle">
                    <Col>
                        <Space>
                            <DatabaseOutlined style={{ color: '#8B909A' }} />
                            <Text type="secondary" style={{ fontSize: 13 }}>数据源</Text>
                            <Select
                                style={{ width: 200 }}
                                placeholder="请选择数据源"
                                value={selectedDsName}
                                onChange={handleDsChange}
                                loading={dsLoading}
                                showSearch
                                optionFilterProp="label"
                                suffixIcon={<DatabaseOutlined style={{ color: '#8B909A', fontSize: 12 }} />}
                            >
                                {datasources.map(ds => (
                                    <Select.Option key={ds.name} value={ds.name} label={ds.name}>
                                        <Space>
                                            {getDatasourceTypeTag(ds.datasourceType)}
                                            {ds.name}
                                        </Space>
                                    </Select.Option>
                                ))}
                            </Select>
                        </Space>
                    </Col>
                    <Col>
                        <Space>
                            <Text type="secondary" style={{ fontSize: 13 }}>数据库</Text>
                            <Select
                                style={{ width: 180 }}
                                placeholder="请选择数据库"
                                value={selectedDbName}
                                onChange={handleDbChange}
                                loading={dbLoading}
                                disabled={!selectedDsName}
                                showSearch
                                optionFilterProp="children"
                            >
                                {databases.map(db => (
                                    <Select.Option key={db.name} value={db.name}>
                                        {db.name}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Space>
                    </Col>
                    <Col flex="auto">
                        <Input.Search
                            placeholder="搜索表名"
                            value={searchKeyword}
                            onChange={e => setSearchKeyword(e.target.value)}
                            style={{ width: 240 }}
                            allowClear
                            prefix={<SearchOutlined style={{ color: '#8B909A' }} />}
                        />
                    </Col>
                    <Col>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            共 <Text strong style={{ color: '#4F6DF5' }}>{filteredTables.length}</Text> 个表
                        </Text>
                    </Col>
                </Row>
            </Card>

            {/* 数据表格 */}
            <Card
                style={{
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(29, 35, 51, 0.03)',
                    overflow: 'hidden',
                }}
                styles={{ body: { padding: 0 } }}
            >
                <Table
                    columns={columns}
                    dataSource={filteredTables}
                    rowKey="tableName"
                    loading={tableLoading}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total) => `共 ${total} 条`,
                    }}
                    locale={{emptyText: selectedDsName && selectedDbName ? '暂无数据' : '请先选择数据源和数据库'}}
                    scroll={{ x: 700 }}
                />
            </Card>

            {/* 新建表模态框 */}
            <Modal
                title="新建表"
                open={createModalVisible}
                onCancel={() => setCreateModalVisible(false)}
                onOk={handleCreateConfirm}
                width={400}
            >
                <Form layout="vertical" style={{ marginTop: 8 }}>
                    <Form.Item label="表名" required>
                        <Input
                            placeholder="请输入表名"
                            value={newTableName}
                            onChange={e => setNewTableName(e.target.value)}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default TableSchemaManagement;
