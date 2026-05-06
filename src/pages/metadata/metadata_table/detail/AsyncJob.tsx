import React, {useEffect, useState} from "react";
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
    Descriptions,
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
import { ManualUploadApi, ManualUploadRecordDTO } from '@/api/ManualUploadApi';

const {Text} = Typography;

interface AsyncJobProps {
    tableId: string;
}

// CDC 配置
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

const AsyncJob: React.FC<AsyncJobProps> = ({tableId}) => {
    const [loading, setLoading] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<string>('cdc');

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
        loadData();
    }, [tableId]);

    useEffect(() => {
        if (activeTab === 'manual') {
            loadUploadRecords(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            // TODO: 调用实际 API 获取数据
            // 模拟数据
            setCdcConfigs([
                {
                    id: '1',
                    sourceTable: 'user_info',
                    sourceDatabase: 'business_db',
                    targetTable: 'user_info_iceberg',
                    targetDatabase: 'dwd',
                    syncMode: 'incremental',
                    status: 'running',
                    enabled: true,
                    createdAt: '2024-01-15 10:30:00',
                    updatedAt: '2024-01-20 14:20:00',
                    lastSyncTime: '2024-01-20 14:20:00',
                    lastSyncCount: 1523
                }
            ]);

            setSqlConfigs([
                {
                    id: '1',
                    name: '每日用户数据同步',
                    sql: 'INSERT INTO dwd.user_info_iceberg\nSELECT * FROM business_db.user_info\nWHERE updated_at > DATE_SUB(NOW(), INTERVAL 1 DAY)',
                    scheduleType: 'cron',
                    cronExpression: '0 2 * * *',
                    status: 'running',
                    enabled: true,
                    creator: 'zhangsan',
                    creatorName: '张三',
                    createdAt: '2024-01-10 09:00:00',
                    updatedAt: '2024-01-15 11:30:00',
                    lastSyncTime: '2024-01-20 02:00:00'
                }
            ]);


        } catch (error) {
            console.error('加载数据失败:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadUploadRecords = async (page = 1) => {
        setUploadLoading(true);
        try {
            const res = await ManualUploadApi.listRecords(tableId, { pageNum: page, pageSize: uploadPageSize });
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
        setCdcModalVisible(true);
    };

    const handleEditCdc = (record: CDCConfig) => {
        setEditingCdc(record);
        cdcForm.setFieldsValue(record);
        setCdcModalVisible(true);
    };

    const handleDeleteCdc = (id: string) => {
        Modal.confirm({
            title: '确认删除',
            content: '确定要删除这条 CDC 配置吗？',
            onOk: () => {
                setCdcConfigs(prev => prev.filter(item => item.id !== id));
                message.success('删除成功');
            }
        });
    };

    const handleToggleCdc = (id: string, enabled: boolean) => {
        setCdcConfigs(prev => prev.map(item =>
            item.id === id ? {...item, enabled} : item
        ));
        message.success(enabled ? '已启用' : '已停用');
    };

    const handleCdcSubmit = async () => {
        try {
            const values = await cdcForm.validateFields();
            if (editingCdc) {
                setCdcConfigs(prev => prev.map(item =>
                    item.id === editingCdc.id ? {...item, ...values} : item
                ));
                message.success('更新成功');
            } else {
                const newCdc: CDCConfig = {
                    id: Date.now().toString(),
                    ...values,
                    status: 'stopped',
                    createdAt: new Date().toLocaleString(),
                    updatedAt: new Date().toLocaleString()
                };
                setCdcConfigs(prev => [...prev, newCdc]);
                message.success('创建成功');
            }
            setCdcModalVisible(false);
        } catch (error) {
            console.error('表单验证失败:', error);
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
        return false; // 阻止自动上传
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
            // 逐个上传文件（当前 API 只支持单文件）
            const file = selectedFiles[0];
            const res = await ManualUploadApi.upload(tableId, file, uploadMode);
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
                const statusMap: Record<string, {color: 'success' | 'default' | 'error', text: string}> = {
                    running: {color: 'success', text: '运行中'},
                    stopped: {color: 'default', text: '已停止'},
                    error: {color: 'error', text: '异常'}
                };
                const config = statusMap[status];
                return <Badge status={config.color} text={config.text}/>;
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
                        icon={<EditOutlined/>}
                        onClick={() => handleEditCdc(record)}
                    >
                        编辑
                    </Button>
                    <Button
                        type="link"
                        size="small"
                        danger
                        icon={<DeleteOutlined/>}
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
            style={{marginBottom: 16}}
            title={
                <Space>
                    <SyncOutlined/>
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

            <Divider style={{margin: '12px 0'}}/>

            <div>
                <Text type="secondary" style={{marginBottom: 8, display: 'block'}}>SQL 内容：</Text>
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
                    <FileTextOutlined style={{color: record.fileType === 'excel' ? '#52c41a' : '#1890ff'}}/>
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
            key: 'cdc',
            label: (
                <Space>
                    <DatabaseOutlined/>
                    CDC 同步
                </Space>
            ),
            children: (
                <div>
                    <div style={{marginBottom: 16, display: 'flex', justifyContent: 'space-between'}}>
                        <Text type="secondary">
                            CDC (Change Data Capture) 实时捕获数据变更并同步到目标表
                        </Text>
                        <Button
                            type="primary"
                            icon={<PlusOutlined/>}
                            onClick={handleAddCdc}
                        >
                            新建配置
                        </Button>
                    </div>
                    <Table
                        columns={cdcColumns}
                        dataSource={cdcConfigs}
                        rowKey="id"
                        size="small"
                        pagination={false}
                    />
                </div>
            )
        },
        {
            key: 'sql',
            label: (
                <Space>
                    <SyncOutlined/>
                    SQL 同步
                </Space>
            ),
            children: (
                <div>
                    <div style={{marginBottom: 16}}>
                        <Text type="secondary">
                            通过 SQL 脚本定时同步数据，支持灵活的调度配置
                        </Text>
                    </div>
                    {sqlConfigs.length > 0 ? (
                        sqlConfigs.map(config => renderSQLSyncDetail(config))
                    ) : (
                        <Card size="small">
                            <div style={{textAlign: 'center', padding: 20, color: '#999'}}>
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
                    <CloudUploadOutlined/>
                    手动上传
                </Space>
            ),
            children: (
                <div>
                    <div style={{marginBottom: 16, display: 'flex', justifyContent: 'space-between'}}>
                        <Text type="secondary">
                            手动上传 Excel 或 CSV 文件导入数据
                        </Text>
                        <Button
                            type="primary"
                            icon={<UploadOutlined/>}
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

            {/* CDC 配置模态框 */}
            <Modal
                title={editingCdc ? '编辑 CDC 配置' : '新建 CDC 配置'}
                open={cdcModalVisible}
                onOk={handleCdcSubmit}
                onCancel={() => setCdcModalVisible(false)}
                width={600}
            >
                <Form
                    form={cdcForm}
                    layout="vertical"
                    style={{marginTop: 16}}
                >
                    <Form.Item
                        name="sourceDatabase"
                        label="源数据库"
                        rules={[{required: true, message: '请输入源数据库'}]}
                    >
                        <Input placeholder="请输入源数据库名称"/>
                    </Form.Item>
                    <Form.Item
                        name="sourceTable"
                        label="源表名"
                        rules={[{required: true, message: '请输入源表名'}]}
                    >
                        <Input placeholder="请输入源表名称"/>
                    </Form.Item>
                    <Form.Item
                        name="targetDatabase"
                        label="目标数据库"
                        rules={[{required: true, message: '请输入目标数据库'}]}
                    >
                        <Input placeholder="请输入目标数据库名称"/>
                    </Form.Item>
                    <Form.Item
                        name="targetTable"
                        label="目标表名"
                        rules={[{required: true, message: '请输入目标表名'}]}
                    >
                        <Input placeholder="请输入目标表名称"/>
                    </Form.Item>
                    <Form.Item
                        name="syncMode"
                        label="同步模式"
                        rules={[{required: true, message: '请选择同步模式'}]}
                    >
                        <Select placeholder="请选择同步模式">
                            <Select.Option value="full">全量同步</Select.Option>
                            <Select.Option value="incremental">增量同步</Select.Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>

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
                <div style={{marginTop: 16}}>
                    <Form.Item label="上传模式" style={{marginBottom: 16}}>
                        <Select
                            value={uploadMode}
                            onChange={setUploadMode}
                            style={{width: '100%'}}
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

                    <Divider/>

                    <Upload.Dragger
                        accept=".xlsx,.xls,.csv"
                        beforeUpload={handleBeforeUpload}
                        showUploadList={false}
                        multiple
                    >
                        <p className="ant-upload-drag-icon">
                            <CloudUploadOutlined/>
                        </p>
                        <p className="ant-upload-text">点击或拖拽文件到此区域</p>
                        <p className="ant-upload-hint">
                            支持 .xlsx, .xls, .csv 格式文件
                        </p>
                    </Upload.Dragger>

                    {selectedFiles.length > 0 && (
                        <div style={{marginTop: 16}}>
                            <Text type="secondary" style={{display: 'block', marginBottom: 8}}>
                                已选择 {selectedFiles.length} 个文件：
                            </Text>
                            <Space direction="vertical" style={{width: '100%'}}>
                                {selectedFiles.map((file, index) => (
                                    <Card
                                        key={index}
                                        size="small"
                                        styles={{ body: { padding: '8px 12px' } }}
                                    >
                                        <Space style={{width: '100%', justifyContent: 'space-between'}}>
                                            <Space>
                                                <FileTextOutlined style={{color: file.name.endsWith('.csv') ? '#1890ff' : '#52c41a'}}/>
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