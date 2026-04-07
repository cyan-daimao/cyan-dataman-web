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
    Typography
} from 'antd';
import {
    DeleteOutlined,
    EditOutlined,
    EyeOutlined,
    HistoryOutlined,
    PlusOutlined,
    TableOutlined
} from '@ant-design/icons';
import {Database, databaseApi, DatasourceType, DSApi, DsConfig, tableApi} from '@/api/DSApi';
import {ColumnType} from 'antd/es/table';
import {useNavigate, useSearchParams} from 'react-router-dom';

const {Title} = Typography;

// 环境状态枚举
enum EnvStatus {
    SYNCED = 'SYNCED',           // 生产已同步
    PENDING = 'PENDING',         // 待发布
    TEST_BEHIND = 'TEST_BEHIND', // 测试落后
    APPROVING = 'APPROVING',     // 审批中
    REJECTED = 'REJECTED',       // 已拒绝
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
const convertToIcebergType = (dbType: string, datasourceType: DatasourceType): string => {
    const upperType = dbType.toUpperCase().split('(')[0].trim(); // 去除括号部分如 VARCHAR(255)

    // 通用类型映射
    const commonTypeMap: Record<string, string> = {
        // 字符串类型
        'CHAR': 'STRING',
        'VARCHAR': 'STRING',
        'TEXT': 'STRING',
        'MEDIUMTEXT': 'STRING',
        'LONGTEXT': 'STRING',
        'CLOB': 'STRING',
        // 整数类型
        'TINYINT': 'LONG',
        'SMALLINT': 'LONG',
        'INT': 'LONG',
        'INTEGER': 'LONG',
        'MEDIUMINT': 'LONG',
        'BIGINT': 'LONG',
        'SERIAL': 'LONG',
        'SMALLSERIAL': 'LONG',
        'BIGSERIAL': 'LONG',
        // 浮点类型
        'FLOAT': 'FLOAT',
        'REAL': 'FLOAT',
        'DOUBLE': 'DOUBLE',
        'DOUBLE PRECISION': 'DOUBLE',
        'DECIMAL': 'DECIMAL',
        'NUMERIC': 'DECIMAL',
        // 布尔类型
        'BOOLEAN': 'BOOLEAN',
        'BOOL': 'BOOLEAN',
        // 日期时间类型
        'DATE': 'DATE',
        'TIME': 'TIME',
        'DATETIME': 'TIMESTAMP',
        'TIMESTAMP': 'TIMESTAMP',
        'TIMESTAMP WITH TIME ZONE': 'TIMESTAMP_TZ',
        'TIMESTAMP WITH TIME ZONE': 'TIMESTAMP_TZ',
        // 二进制类型
        'BLOB': 'BINARY',
        'MEDIUMBLOB': 'BINARY',
        'LONGBLOB': 'BINARY',
        'BYTEA': 'BINARY',
        'BINARY': 'BINARY',
        'VARBINARY': 'BINARY',
        // 其他类型
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

    // 从 URL 参数获取预选的数据源和数据库
    const urlDsId = searchParams.get('dsId');
    const urlDbName = searchParams.get('dbName');

    const [datasources, setDatasources] = useState<DsConfig[]>([]);
    const [databases, setDatabases] = useState<Database[]>([]);
    const [tables, setTables] = useState<TableInfo[]>([]);

    const [selectedDsId, setSelectedDsId] = useState<string | null>(urlDsId);
    const [selectedDbName, setSelectedDbName] = useState<string | null>(urlDbName);

    const [dsLoading, setDsLoading] = useState(false);
    const [dbLoading, setDbLoading] = useState(false);
    const [tableLoading, setTableLoading] = useState(false);

    const [searchKeyword, setSearchKeyword] = useState('');

    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [newTableName, setNewTableName] = useState('');

    // 标记是否正在初始化（用于区分用户手动切换和 URL 参数恢复）
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        fetchDatasources();
    }, []);

    // 数据源列表加载完成后，如果有 URL 参数，自动选择并加载数据库
    useEffect(() => {
        if (datasources.length > 0 && urlDsId && !initialized) {
            const dsExists = datasources.some(ds => ds.id === urlDsId);
            if (dsExists) {
                setSelectedDsId(urlDsId);
                fetchDatabases(urlDsId);
            }
            setInitialized(true);
        }
    }, [datasources, urlDsId, initialized]);

    // 数据库列表加载完成后，如果有 URL 参数，自动选择并加载表
    useEffect(() => {
        if (databases.length > 0 && urlDbName && selectedDsId === urlDsId && !selectedDbName) {
            const dbExists = databases.some(db => db.name === urlDbName);
            if (dbExists) {
                setSelectedDbName(urlDbName);
            }
        }
    }, [databases, urlDbName, selectedDsId, selectedDbName]);

    // 监听数据源变化，加载对应的数据库列表
    useEffect(() => {
        if (selectedDsId) {
            fetchDatabases(selectedDsId);
            // 如果不是从 URL 参数恢复，则重置数据库和表选择
            if (selectedDsId !== urlDsId) {
                setSelectedDbName(null);
                setTables([]);
            }
        }
    }, [selectedDsId]);

    // 监听数据库变化，加载对应的表列表
    useEffect(() => {
        if (selectedDsId && selectedDbName) {
            fetchTables(selectedDsId, selectedDbName);
        }
    }, [selectedDsId, selectedDbName]);

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

    const fetchDatabases = async (dsId: string) => {
        setDbLoading(true);
        try {
            const response = await databaseApi.list(dsId);
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

    const fetchTables = async (dsId: string, dbName: string) => {
        setTableLoading(true);
        try {
            const response = await tableApi.list(dsId, dbName);
            if (response.code === 200) {
                // 转换为 TableInfo 格式
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

    const handleDsChange = (dsId: string) => {
        setSelectedDsId(dsId);
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
        // 跳转到编辑页面创建新表，添加 isNew=true 参数区分新建和编辑
        navigate(`/meta/business-ds/table-schema/edit?dsId=${selectedDsId}&dbName=${selectedDbName}&tableName=${newTableName}&isNew=true`);
        setCreateModalVisible(false);
    };

    const handleViewDetail = (tableName: string) => {
        navigate(`/meta/business-ds/table-schema/detail?dsId=${selectedDsId}&dbName=${selectedDbName}&tableName=${tableName}`);
    };

    const handleEdit = (tableName: string) => {
        navigate(`/meta/business-ds/table-schema/edit?dsId=${selectedDsId}&dbName=${selectedDbName}&tableName=${tableName}`);
    };

    const handleDelete = async (tableName: string) => {
        if (!selectedDsId || !selectedDbName) return;

        try {
            const response = await tableApi.drop(selectedDsId, selectedDbName, tableName);
            if (response.code === 200) {
                message.success('删除成功');
                fetchTables(selectedDsId, selectedDbName);
            } else {
                message.error(response.message || '删除失败');
            }
        } catch (error) {
            console.error('删除表失败:', error);
            message.error('删除失败');
        }
    };

    const handleSyncHistory = async (tableName: string) => {
        if (!selectedDsId || !selectedDbName) return;

        try {
            // 获取当前数据源类型
            const currentDs = datasources.find(ds => ds.id === selectedDsId);
            const datasourceType = currentDs?.datasourceType || DatasourceType.MYSQL;

            // 获取表结构详情
            const response = await tableApi.getSchema(selectedDsId, selectedDbName, tableName);
            if (response.code === 200 && response.data) {
                const tableSchema = response.data;

                // 转换为 MetadataTableDTO 格式
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
                        catalog: selectedDsId,
                        schema: selectedDbName,
                        name: tableSchema.tableName,
                        comment: tableSchema.tableComment || '',
                        columns: tableSchema.columns.map(col => ({
                            name: col.name,
                            type: convertToIcebergType(col.type, datasourceType),
                            comment: col.comment || '',
                            nullable: col.nullable ?? true,
                            autoIncrement: col.autoIncrement ?? false,
                            defaultValue: col.defaultValue,
                            secretLevel: col.secretLevel || 'L1',
                        })),
                        indexes: tableSchema.indexes || [],
                    },
                };

                // 跳转到元数据表编辑页面，传递 importData
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
        const config: Record<EnvStatus, { color: string; text: string; icon: string }> = {
            [EnvStatus.SYNCED]: {color: 'success', text: '生产已同步', icon: '✅'},
            [EnvStatus.PENDING]: {color: 'warning', text: '待发布', icon: '⚠️'},
            [EnvStatus.TEST_BEHIND]: {color: 'warning', text: '测试落后', icon: '⚠️'},
            [EnvStatus.APPROVING]: {color: 'processing', text: '审批中', icon: '🔄'},
            [EnvStatus.REJECTED]: {color: 'error', text: '已拒绝', icon: '❌'},
        };
        const {color, text, icon} = config[status];
        return <Tag color={color}>{icon} {text}</Tag>;
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
            width: 120,
            render: (name: string) => (
                <Space>
                    <TableOutlined/>
                    <span style={{fontWeight: 500}}>{name}</span>
                </Space>
            ),
        },
        {
            title: '描述',
            dataIndex: 'tableComment',
            key: 'tableComment',
            width: 150,
            ellipsis: true,
            render: (comment: string) => comment || '-',
        },
        {
            title: 'CDC状态',
            dataIndex: 'cdcEnabled',
            key: 'cdcEnabled',
            width: 100,
            render: (enabled: boolean) => (
                <Tag>{enabled ? '已启用' : '未启用'}</Tag>
            ),
        },
        {
            title: '环境状态',
            dataIndex: 'envStatus',
            key: 'envStatus',
            width: 140,
            render: (status: EnvStatus) => getEnvStatusTag(status),
        },
        {
            title: '操作',
            key: 'action',
            width: 220,
            render: (_: unknown, record: TableInfo) => (
                <Space size="small">
                    <Button
                        type="link"
                        size="small"
                        icon={<EyeOutlined/>}
                        onClick={() => handleViewDetail(record.tableName)}
                    >
                        详情
                    </Button>
                    <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined/>}
                        onClick={() => handleEdit(record.tableName)}
                    >
                        编辑
                    </Button>
                    <Button
                        type="link"
                        size="small"
                        icon={<HistoryOutlined/>}
                        onClick={() => handleSyncHistory(record.tableName)}
                    >
                        同步表结构到数仓
                    </Button>
                    <Popconfirm
                        title="确定删除该表吗？此操作不可恢复！"
                        onConfirm={() => handleDelete(record.tableName)}
                        okText="确定"
                        cancelText="取消"
                    >
                        <Button
                            type="link"
                            size="small"
                            danger
                            icon={<DeleteOutlined/>}
                        >
                            删除
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div style={{padding: '24px'}}>
            <Card>
                <Title level={4}>表结构管理</Title>

                <Row gutter={16} style={{marginBottom: 16}}>
                    <Col>
                        <Space>
                            <span>数据源：</span>
                            <Select
                                style={{width: 240}}
                                placeholder="请选择数据源"
                                value={selectedDsId}
                                onChange={handleDsChange}
                                loading={dsLoading}
                                showSearch
                                optionFilterProp="label"
                            >
                                {datasources.map(ds => (
                                    <Select.Option key={ds.id} value={ds.id} label={ds.name}>
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
                            <span>数据库：</span>
                            <Select
                                style={{width: 200}}
                                placeholder="请选择数据库"
                                value={selectedDbName}
                                onChange={handleDbChange}
                                loading={dbLoading}
                                disabled={!selectedDsId}
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
                            style={{width: 240}}
                            allowClear
                        />
                    </Col>
                    <Col>
                        <Button
                            type="primary"
                            icon={<PlusOutlined/>}
                            onClick={handleCreateTable}
                            disabled={!selectedDsId || !selectedDbName}
                        >
                            新建表
                        </Button>
                    </Col>
                </Row>

                <Table
                    columns={columns}
                    dataSource={filteredTables}
                    rowKey="tableName"
                    loading={tableLoading}
                    bordered
                    pagination={{pageSize: 10}}
                    locale={{emptyText: selectedDsId && selectedDbName ? '暂无数据' : '请先选择数据源和数据库'}}
                />
            </Card>

            <Modal
                title="新建表"
                open={createModalVisible}
                onCancel={() => setCreateModalVisible(false)}
                onOk={handleCreateConfirm}
                width={400}
            >
                <Form layout="vertical">
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
