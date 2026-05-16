import React, { useEffect, useState } from "react";
import {
    Badge,
    Card,
    Table,
    TableProps,
    Typography,
    Tabs,
    Button,
    Form,
    Input,
    Select,
    Switch,
    Space,
    Tag,
    Upload,
    message,
    Modal,
    Divider,
    Tooltip
} from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    UploadOutlined,
    SyncOutlined,
    FileTextOutlined,
    DatabaseOutlined,
    CloudUploadOutlined
} from "@ant-design/icons";
import {
    listCdcConfigs,
    createCdcConfig,
    updateCdcConfig,
    deleteCdcConfig,
    toggleCdcConfig,
    CdcConfigDTO,
    CdcConfigCmd
} from '@/api/CdcApi';
import { ManualUploadApi, ManualUploadRecordDTO } from '@/api/ManualUploadApi';

const { Text } = Typography;

interface AsyncJobProps {
    tableId: string;
    catalog: string;
    schema: string;
    tableName: string;
}

// 前端展示用的 CDC 配置（字段与 UI 对齐）
interface CDCConfig {
    id: string;
    sourceTable: string;
    sourceDatabase: string;
    targetTable: string;
    targetDatabase: string;
    syncMode: 'full' | 'incremental';
    status: 'running' | 'stopped' | 'error';
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
    lastSyncTime?: string;
    lastSyncCount?: number;
}

// SQL 同步配置
interface SQLSyncConfig {
    id: string;
    name: string;
    sql: string;
    scheduleType: 'cron' | 'interval';
    cronExpression?: string;
    interval?: number;
    status: 'running' | 'stopped' | 'error';
    enabled: boolean;
    creator: string;
    creatorName: string;
    createdAt: string;
    updatedAt: string;
    lastSyncTime?: string;
}

// 手动上传记录
interface ManualUploadRecord {
    id: string;
    fileName: string;
    fileType: 'excel' | 'csv';
    uploadMode: 'overwrite' | 'append';
    rowCount: number;
    uploader?: string;
    uploaderName: string;
    uploadedAt: string;
    status: 'success' | 'failed';
    errorMessage?: string;
}

/**
 * 将后端 RunningStatus 映射为前端 status
 */
const mapRunningStatus = (status?: string): 'running' | 'stopped' | 'error' => {
    switch (status) {
        case 'RUNNING':
        case 'SUCCESS':
            return 'running';
        case 'ERROR':
            return 'error';
        case 'INIT':
        case 'STOP':
        default:
            return 'stopped';
    }
};

/**
 * 从 icebergTableName 提取 schema 和 table
 * 格式可能是 "schema.table" 或 "catalog.schema.table" 或单纯 "table"
 */
const parseIcebergTableName = (icebergTableName?: string): { targetDatabase: string; targetTable: string } => {
    if (!icebergTableName) {
        return { targetDatabase: '', targetTable: '' };
    }
    const parts = icebergTableName.split('.');
    if (parts.length >= 2) {
        return { targetDatabase: parts[parts.length - 2], targetTable: parts[parts.length - 1] };
    }
    return { targetDatabase: '', targetTable: icebergTableName };
};

/**
 * 将后端 CdcConfigDTO 映射为前端 CDCConfig
 */
const mapDtoToCdcConfig = (dto: CdcConfigDTO): CDCConfig => {
    const { targetDatabase, targetTable } = parseIcebergTableName(dto.icebergTableName);
    return {
        id: dto.id,
        sourceTable: dto.tableName,
        sourceDatabase: dto.dbName,
        targetTable,
        targetDatabase,
        syncMode: dto.syncTool === 'FLINK' ? 'incremental' : 'full',
        status: mapRunningStatus(dto.runningStatus),
        enabled: dto.enabled,
        createdAt: dto.createdAt || '',
        updatedAt: dto.updatedAt || '',
        lastSyncTime: undefined,
        lastSyncCount: undefined,
    };
};

const AsyncJob: React.FC<AsyncJobProps> = ({ catalog, schema, tableName }) => {
    const [loading, setLoading] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<string>('sql');

    // CDC 相关状态
    const [cdcConfigs, setCdcConfigs] = useState<CDCConfig[]>([]);
    const [cdcModalVisible, setCdcModalVisible] = useState(false);
    const [editingCdc, setEditingCdc] = useState<CDCConfig | null>(null);
    const [cdcForm] = Form.useForm();

    // SQL 同步相关状态
    const [sqlConfigs, setSqlConfigs] = useState<SQLSyncConfig[]>([]);

    // 手动上传相关状态
    const [uploadRecords, setUploadRecords] = useState<ManualUploadRecord[]>([]);
    const [uploadModalVisible, setUploadModalVisible] = useState(false);
    const [uploadMode, setUploadMode] = useState<'overwrite' | 'append'>('append');
    const [uploadLoading, setUploadLoading] = useState(false);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadPageNum, setUploadPageNum] = useState(1);
    const [uploadPageSize] = useState(10);
    const [uploadTotal, setUploadTotal] = useState(0);

    useEffect(() => {
        if (schema && tableName) {
            loadCdcData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schema, tableName]);

    useEffect(() => {
        if (activeTab === 'manual') {
            loadUploadRecords(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const loadCdcData = async () => {
        setLoading(true);
        try {
            const res = await listCdcConfigs({
                dbName: schema,
                tableName: tableName,
                syncTool: 'FLINK',
            });
            if (res.code === 200 && res.data) {
                const list = res.data.map(mapDtoToCdcConfig);
                setCdcConfigs(list);
            } else {
                message.error(res.message || '加载 CDC 配置失败');
            }
        } catch (error) {
            console.error('加载 CDC 配置失败:', error);
            message.error('加载 CDC 配置失败');
        } finally {
            setLoading(false);
        }
    };

    const loadUploadRecords = async (page = 1) => {
        setUploadLoading(true);
        try {
            const res = await ManualUploadApi.listRecords(tableName, { pageNum: page, pageSize: uploadPageSize });
            if (res.code === 200 && res.data) {
                const list = res.data.data.map((item: ManualUploadRecordDTO): ManualUploadRecord => ({
                    id: String(item.id),
                    fileName: item.fileName,
                    fileType: item.fileType,
                    uploadMode: item.uploadMode,
                    rowCount: item.rowCount,
                    uploaderName: item.uploaderName,
                    uploadedAt: item.createdAt,
                    status: item.status,
                    errorMessage: item.errorMessage
                }));
                setUploadRecords(list);
                setUploadTotal(res.data.total);
                setUploadPageNum(res.data.current);
            }
        } catch {
            message.error('加载上传记录失败');
        } finally {
            setUploadLoading(false);
        }
    };

    // CDC 相关操作
    const handleAddCdc = () => {
        setEditingCdc(null);
        cdcForm.resetFields();
        cdcForm.setFieldsValue({
            dsName: catalog,
            sourceDatabase: schema,
            sourceTable: tableName,
            syncMode: 'incremental',
        });
        setCdcModalVisible(true);
    };

    const handleEditCdc = (record: CDCConfig) => {
        setEditingCdc(record);
        cdcForm.setFieldsValue({
            dsName: catalog,
            sourceDatabase: record.sourceDatabase,
            sourceTable: record.sourceTable,
            targetDatabase: record.targetDatabase,
            targetTable: record.targetTable,
            syncMode: record.syncMode,
        });
        setCdcModalVisible(true);
    };

    const handleDeleteCdc = async (id: string) => {
        Modal.confirm({
            title: '确认删除',
            content: '确定要删除这条 CDC 配置吗？',
            onOk: async () => {
                try {
                    // 需要先根据 id 查到 cdcName
                    const target = cdcConfigs.find(c => c.id === id);
                    if (!target) {
                        message.error('找不到要删除的配置');
                        return;
                    }
                    // 通过列表反查 DTO 获取 name（简化：直接用 sourceTable 作为 name）
                    // 实际上需要更精确地获取 cdcName，这里简化处理
                    const res = await listCdcConfigs({ dbName: schema, tableName: tableName, syncTool: 'FLINK' });
                    if (res.code === 200 && res.data) {
                        const dto = res.data.find(d => d.id === id);
                        if (dto) {
                            const delRes = await deleteCdcConfig(dto.name);
                            if (delRes.code === 200) {
                                message.success('删除成功');
                                loadCdcData();
                            } else {
                                message.error(delRes.message || '删除失败');
                            }
                        }
                    }
                } catch (error) {
                    console.error('删除 CDC 配置失败:', error);
                    message.error('删除失败');
                }
            }
        });
    };

    const handleToggleCdc = async (id: string, enabled: boolean) => {
        try {
            const res = await listCdcConfigs({ dbName: schema, tableName: tableName, syncTool: 'FLINK' });
            if (res.code === 200 && res.data) {
                const dto = res.data.find(d => d.id === id);
                if (dto) {
                    const toggleRes = await toggleCdcConfig(dto.name, enabled);
                    if (toggleRes.code === 200) {
                        message.success(enabled ? '已启用' : '已停用');
                        loadCdcData();
                    } else {
                        message.error(toggleRes.message || '操作失败');
                    }
                }
            }
        } catch (error) {
            console.error('启停 CDC 配置失败:', error);
            message.error('操作失败');
        }
    };

    const handleCdcSubmit = async () => {
        try {
            const values = await cdcForm.validateFields();
            const icebergTableName = values.targetDatabase && values.targetTable
                ? `${values.targetDatabase}.${values.targetTable}`
                : values.targetTable;

            const cmd: CdcConfigCmd = {
                name: `${values.sourceDatabase}_${values.sourceTable}_cdc`,
                dsName: values.dsName || catalog,
                dbName: values.sourceDatabase,
                tableName: values.sourceTable,
                icebergTableName,
                syncTool: 'FLINK',
                description: `CDC 同步: ${values.sourceDatabase}.${values.sourceTable} -> ${icebergTableName}`,
            };

            if (editingCdc) {
                // 编辑：需要先查到 cdcName
                const res = await listCdcConfigs({ dbName: schema, tableName: tableName, syncTool: 'FLINK' });
                if (res.code === 200 && res.data) {
                    const dto = res.data.find(d => d.id === editingCdc.id);
                    if (dto) {
                        const updateRes = await updateCdcConfig(dto.name, cmd);
                        if (updateRes.code === 200) {
                            message.success('更新成功');
                            setCdcModalVisible(false);
                            loadCdcData();
                        } else {
                            message.error(updateRes.message || '更新失败');
                        }
                    }
                }
            } else {
                const createRes = await createCdcConfig(cmd);
                if (createRes.code === 200) {
                    message.success('创建成功');
                    setCdcModalVisible(false);
                    loadCdcData();
                } else {
                    message.error(createRes.message || '创建失败');
                }
            }
        } catch (error) {
            console.error('表单验证或提交失败:', error);
        }
    };

    // 手动上传相关操作
    const handleBeforeUpload = (file: File) => {
        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
        const isCsv = file.name.endsWith('.csv');
        if (!isExcel && !isCsv) {
            message.error('只能上传 Excel 或 CSV 文件！');
            return false;
        }
        setSelectedFiles(prev => [...prev, file]);
        return false;
    };

    const handleRemoveFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleConfirmUpload = async () => {
        if (selectedFiles.length === 0) {
            message.warning('请先选择文件');
            return;
        }
        setConfirmLoading(true);
        try {
            const file = selectedFiles[0];
            const res = await ManualUploadApi.upload(tableName, file, uploadMode);
            if (res.code === 200 && res.data) {
                message.success('上传成功');
                setUploadModalVisible(false);
                setSelectedFiles([]);
                loadUploadRecords(1);
            } else {
                message.error(res.message || '上传失败');
            }
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : '上传失败';
            message.error(errorMsg);
        } finally {
            setConfirmLoading(false);
        }
    };

    const handleCloseModal = () => {
        setUploadModalVisible(false);
        setSelectedFiles([]);
    };

    // CDC 表格列定义
    const cdcColumns: TableProps<CDCConfig>['columns'] = [
        {
            title: '数据源',
            key: 'dsName',
            width: 120,
            render: () => catalog || '-',
        },
        {
            title: '源数据库',
            dataIndex: 'sourceDatabase',
            key: 'sourceDatabase',
            width: 120,
        },
        {
            title: '源表',
            dataIndex: 'sourceTable',
            key: 'sourceTable',
            width: 120,
        },
        {
            title: '目标数据库',
            dataIndex: 'targetDatabase',
            key: 'targetDatabase',
            width: 120,
        },
        {
            title: '目标表',
            dataIndex: 'targetTable',
            key: 'targetTable',
            width: 120,
        },
        {
            title: '同步模式',
            dataIndex: 'syncMode',
            key: 'syncMode',
            width: 100,
            render: (mode) => (
                <Tag color={mode === 'incremental' ? 'blue' : 'green'}>
                    {mode === 'incremental' ? '增量' : '全量'}
                </Tag>
            )
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status) => {
                const statusMap: Record<string, { color: 'success' | 'default' | 'error', text: string }> = {
                    running: { color: 'success', text: '运行中' },
                    stopped: { color: 'default', text: '已停止' },
                    error: { color: 'error', text: '异常' }
                };
                const config = statusMap[status];
                return <Badge status={config.color} text={config.text} />;
            }
        },
        {
            title: '启用',
            dataIndex: 'enabled',
            key: 'enabled',
            width: 80,
            render: (enabled, record) => (
                <Switch
                    checked={enabled}
                    onChange={(checked) => handleToggleCdc(record.id, checked)}
                    size="small"
                />
            )
        },
        {
            title: '最近同步时间',
            dataIndex: 'lastSyncTime',
            key: 'lastSyncTime',
            width: 160,
            render: (time) => time || '-'
        },
        {
            title: '同步数量',
            dataIndex: 'lastSyncCount',
            key: 'lastSyncCount',
            width: 100,
            render: (count) => count ? count.toLocaleString() : '-'
        },
        {
            title: '操作',
            key: 'action',
            width: 120,
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEditCdc(record)}
                    >
                        编辑
                    </Button>
                    <Button
                        type="link"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteCdc(record.id)}
                    >
                        删除
                    </Button>
                </Space>
            )
        }
    ];

    // SQL 同步详情渲染
    const renderSQLSyncDetail = (config: SQLSyncConfig) => (
        <Card
            key={config.id}
            size="small"
            style={{ marginBottom: 16 }}
            title={
                <Space>
                    <SyncOutlined />
                    <Text strong>{config.name}</Text>
                    <Tag color={config.enabled ? 'green' : 'default'}>
                        {config.enabled ? '已启用' : '已停用'}
                    </Tag>
                    <Badge
                        status={config.status === 'running' ? 'success' : config.status === 'error' ? 'error' : 'default'}
                        text={config.status === 'running' ? '运行中' : config.status === 'error' ? '异常' : '已停止'}
                    />
                </Space>
            }
        >
            <Descriptions column={2} size="small">
                <Descriptions.Item label="调度类型">
                    {config.scheduleType === 'cron' ? 'Cron 表达式' : '固定间隔'}
                </Descriptions.Item>
                <Descriptions.Item label="调度规则">
                    {config.scheduleType === 'cron' ? config.cronExpression : `${config.interval} 分钟`}
                </Descriptions.Item>
                <Descriptions.Item label="创建人">
                    {config.creatorName} ({config.creator})
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">
                    {config.createdAt}
                </Descriptions.Item>
                <Descriptions.Item label="更新时间">
                    {config.updatedAt}
                </Descriptions.Item>
                <Descriptions.Item label="最近执行">
                    {config.lastSyncTime || '-'}
                </Descriptions.Item>
            </Descriptions>

            <Divider style={{ margin: '12px 0' }} />

            <div>
                <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>SQL 内容：</Text>
                <pre style={{
                    background: '#f5f5f5',
                    padding: 12,
                    borderRadius: 4,
                    fontSize: 12,
                    maxHeight: 200,
                    overflow: 'auto'
                }}>
                    {config.sql}
                </pre>
            </div>
        </Card>
    );

    // 手动上传记录表格列定义
    const uploadColumns: TableProps<ManualUploadRecord>['columns'] = [
        {
            title: '文件名',
            dataIndex: 'fileName',
            key: 'fileName',
            width: 200,
            render: (name, record) => (
                <Space>
                    <FileTextOutlined style={{ color: record.fileType === 'excel' ? '#52c41a' : '#1890ff' }} />
                    <Text>{name}</Text>
                </Space>
            )
        },
        {
            title: '文件类型',
            dataIndex: 'fileType',
            key: 'fileType',
            width: 100,
            render: (type) => (
                <Tag color={type === 'excel' ? 'green' : 'blue'}>
                    {type === 'excel' ? 'Excel' : 'CSV'}
                </Tag>
            )
        },
        {
            title: '上传模式',
            dataIndex: 'uploadMode',
            key: 'uploadMode',
            width: 100,
            render: (mode) => (
                <Tag color={mode === 'overwrite' ? 'orange' : 'cyan'}>
                    {mode === 'overwrite' ? '覆盖' : '追加'}
                </Tag>
            )
        },
        {
            title: '记录数',
            dataIndex: 'rowCount',
            key: 'rowCount',
            width: 100,
            render: (count) => count.toLocaleString()
        },
        {
            title: '上传人',
            dataIndex: 'uploaderName',
            key: 'uploaderName',
            width: 100,
            render: (name, record) => record.uploader ? `${name} (${record.uploader})` : name
        },
        {
            title: '上传时间',
            dataIndex: 'uploadedAt',
            key: 'uploadedAt',
            width: 160
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 80,
            render: (status, record: ManualUploadRecord) => {
                const tag = (
                    <Tag color={status === 'success' ? 'success' : 'error'}>
                        {status === 'success' ? '成功' : '失败'}
                    </Tag>
                );
                if (status === 'failed' && record.errorMessage) {
                    return (
                        <Tooltip title={record.errorMessage}>
                            {tag}
                        </Tooltip>
                    );
                }
                return tag;
            }
        }
    ];

    // Tab 项配置
    const tabItems = [
        {
            key: 'sql',
            label: (
                <Space>
                    <SyncOutlined />
                    SQL 同步
                </Space>
            ),
            children: (
                <div>
                    <div style={{ marginBottom: 16 }}>
                        <Text type="secondary">
                            通过 SQL 脚本定时同步数据，支持灵活的调度配置
                        </Text>
                    </div>
                    {sqlConfigs.length > 0 ? (
                        sqlConfigs.map(config => renderSQLSyncDetail(config))
                    ) : (
                        <Card size="small">
                            <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
                                暂无 SQL 同步配置
                            </div>
                        </Card>
                    )}
                </div>
            )
        },
        {
            key: 'manual',
            label: (
                <Space>
                    <CloudUploadOutlined />
                    手动上传
                </Space>
            ),
            children: (
                <div>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary">
                            手动上传 Excel 或 CSV 文件导入数据
                        </Text>
                        <Button
                            type="primary"
                            icon={<UploadOutlined />}
                            onClick={() => setUploadModalVisible(true)}
                        >
                            上传文件
                        </Button>
                    </div>
                    <Table
                        columns={uploadColumns}
                        dataSource={uploadRecords}
                        rowKey="id"
                        size="small"
                        loading={uploadLoading}
                        pagination={{
                            current: uploadPageNum,
                            pageSize: uploadPageSize,
                            total: uploadTotal,
                            onChange: (page) => loadUploadRecords(page),
                            showTotal: (t) => `共 ${t} 条`,
                        }}
                    />
                </div>
            )
        }
    ];

    return (
        <Card size="small" loading={loading}>
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
            />

            {/* 上传文件模态框 */}
            <Modal
                title="上传文件"
                open={uploadModalVisible}
                onCancel={handleCloseModal}
                confirmLoading={confirmLoading}
                onOk={handleConfirmUpload}
                okText="确定"
                cancelText="取消"
                width={500}
            >
                <div style={{ marginTop: 16 }}>
                    <Form.Item label="上传模式" style={{ marginBottom: 16 }}>
                        <Select
                            value={uploadMode}
                            onChange={setUploadMode}
                            style={{ width: '100%' }}
                        >
                            <Select.Option value="append">
                                <Space>
                                    <Tag color="cyan">追加</Tag>
                                    在现有数据基础上添加新数据
                                </Space>
                            </Select.Option>
                            <Select.Option value="overwrite">
                                <Space>
                                    <Tag color="orange">覆盖</Tag>
                                    清空现有数据后导入新数据
                                </Space>
                            </Select.Option>
                        </Select>
                    </Form.Item>

                    <Divider />

                    <Upload.Dragger
                        accept=".xlsx,.xls,.csv"
                        beforeUpload={handleBeforeUpload}
                        showUploadList={false}
                        multiple
                    >
                        <p className="ant-upload-drag-icon">
                            <CloudUploadOutlined />
                        </p>
                        <p className="ant-upload-text">点击或拖拽文件到此区域</p>
                        <p className="ant-upload-hint">
                            支持 .xlsx, .xls, .csv 格式文件
                        </p>
                    </Upload.Dragger>

                    {selectedFiles.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                                已选择 {selectedFiles.length} 个文件：
                            </Text>
                            <Space direction="vertical" style={{ width: '100%' }}>
                                {selectedFiles.map((file, index) => (
                                    <Card
                                        key={index}
                                        size="small"
                                        styles={{ body: { padding: '8px 12px' } }}
                                    >
                                        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                            <Space>
                                                <FileTextOutlined style={{ color: file.name.endsWith('.csv') ? '#1890ff' : '#52c41a' }} />
                                                <Text>{file.name}</Text>
                                                <Text type="secondary">({(file.size / 1024).toFixed(1)} KB)</Text>
                                            </Space>
                                            <Button
                                                type="link"
                                                danger
                                                size="small"
                                                onClick={() => handleRemoveFile(index)}
                                            >
                                                移除
                                            </Button>
                                        </Space>
                                    </Card>
                                ))}
                            </Space>
                        </div>
                    )}
                </div>
            </Modal>
        </Card>
    );
};

export default AsyncJob;
