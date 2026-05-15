import React, { useEffect, useState } from 'react';
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
import { DeleteOutlined, EditOutlined, PlusOutlined, ApiOutlined, SearchOutlined } from '@ant-design/icons';
import PermissionButton from '@/component/permission/PermissionButton';
import { DSApi, DatasourceType, DsConfig, DsConfigCmd } from '@/api/DSApi';
import { ColumnType } from 'antd/es/table';

const { Title, Text } = Typography;

const DatasourceManagement: React.FC = () => {
    const [datasources, setDatasources] = useState<DsConfig[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingName, setEditingName] = useState<string | null>(null);
    const [testLoading, setTestLoading] = useState<string | null>(null);

    const [form] = Form.useForm();
    const [searchForm] = Form.useForm();

    useEffect(() => {
        fetchDatasources();
    }, []);

    const fetchDatasources = async (name?: string) => {
        setLoading(true);
        try {
            const response = await DSApi.list({ name });
            if (response.code === 200) {
                setDatasources(response.data || []);
            }
        } catch (error) {
            console.error('获取数据源列表失败:', error);
            message.error('获取数据源列表失败');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setIsEditing(false);
        setEditingName(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (record: DsConfig) => {
        setIsEditing(true);
        setEditingName(record.name);
        form.setFieldsValue({
            name: record.name,
            datasourceType: record.datasourceType,
            url: record.url,
            username: record.username,
            description: record.description,
        });
        setModalVisible(true);
    };

    const handleDelete = async (name: string) => {
        try {
            const response = await DSApi.delete(name);
            if (response.code === 200) {
                message.success('删除成功');
                fetchDatasources();
            } else {
                message.error(response.message || '删除失败');
            }
        } catch (error) {
            console.error('删除数据源失败:', error);
            message.error('删除失败');
        }
    };

    const handleTestConnection = async (name: string) => {
        setTestLoading(name);
        try {
            const response = await DSApi.testConnection(name);
            if (response.code === 200) {
                message.success('连接测试成功');
            } else {
                message.error(response.message || '连接测试失败');
            }
        } catch (error) {
            console.error('连接测试失败:', error);
            message.error('连接测试失败');
        } finally {
            setTestLoading(null);
        }
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            const cmd: DsConfigCmd = {
                name: values.name,
                datasourceType: values.datasourceType,
                url: values.url,
                username: values.username,
                password: values.password,
                description: values.description,
            };

            let response;
            if (isEditing && editingName) {
                response = await DSApi.update(editingName, cmd);
            } else {
                response = await DSApi.create(cmd);
            }

            if (response.code === 200) {
                message.success(isEditing ? '更新成功' : '创建成功');
                setModalVisible(false);
                fetchDatasources();
            } else {
                message.error(response.message || '操作失败');
            }
        } catch (error) {
            console.error('表单提交失败:', error);
        }
    };

    const handleSearch = () => {
        const values = searchForm.getFieldsValue();
        fetchDatasources(values.name);
    };

    const getDatasourceTypeTag = (type: DatasourceType) => {
        const colorMap: Record<DatasourceType, string> = {
            [DatasourceType.MYSQL]: 'blue',
            [DatasourceType.POSTGRESQL]: 'green',
            [DatasourceType.ICEBERG]: 'purple',
        };
        return <Tag color={colorMap[type] || 'default'}>{type}</Tag>;
    };

    const columns: ColumnType<DsConfig>[] = [
        {
            title: '数据源名称',
            dataIndex: 'name',
            key: 'name',
            width: 150,
            render: (name: string) => (
                <span style={{ fontWeight: 500, color: '#1D2333' }}>{name}</span>
            ),
        },
        {
            title: '类型',
            dataIndex: 'datasourceType',
            key: 'datasourceType',
            width: 120,
            render: (type: DatasourceType) => getDatasourceTypeTag(type),
        },
        {
            title: '连接地址',
            dataIndex: 'url',
            key: 'url',
            width: 200,
            ellipsis: true,
            render: (url: string) => (
                <Tooltip title={url}>
                    <span style={{ color: '#4E5566' }}>{url}</span>
                </Tooltip>
            ),
        },
        {
            title: '用户名',
            dataIndex: 'username',
            key: 'username',
            width: 100,
            render: (username: string) => (
                <span style={{ color: '#4E5566' }}>{username}</span>
            ),
        },
        {
            title: '描述',
            dataIndex: 'description',
            key: 'description',
            width: 160,
            ellipsis: true,
            render: (desc: string) => (
                <span style={{ color: '#8B909A' }}>{desc || '-'}</span>
            ),
        },
        {
            title: '创建时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 180,
            render: (time: string) => (
                <span style={{ color: '#8B909A', fontSize: 13 }}>{time}</span>
            ),
        },
        {
            title: '操作',
            key: 'action',
            width: 140,
            fixed: 'right',
            render: (_: unknown, record: DsConfig) => (
                <Space size={4}>
                    <Tooltip title="测试连接">
                        <Button
                            type="text"
                            size="small"
                            icon={<ApiOutlined />}
                            loading={testLoading === record.name}
                            onClick={() => handleTestConnection(record.name)}
                            style={{ color: '#4F6DF5' }}
                        />
                    </Tooltip>
                    <Tooltip title="编辑">
                        <PermissionButton
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleEdit(record)}
                            style={{ color: '#4E5566' }}
                            permission="MENU:meta:business-ds:datasource:UPDATE"
                        />
                    </Tooltip>
                    <Popconfirm
                        title="确定删除该数据源吗？"
                        onConfirm={() => handleDelete(record.name)}
                        okText="确定"
                        cancelText="取消"
                    >
                        <Tooltip title="删除">
                            <PermissionButton
                                type="text"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                permission="MENU:meta:business-ds:datasource:DELETE"
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
                    <Title level={4} className="page-title">数据源管理</Title>
                    <Text className="page-subtitle">
                        管理业务数据库连接配置，支持 MySQL、PostgreSQL、Iceberg 等数据源
                    </Text>
                </div>
                <PermissionButton
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAdd}
                    size="middle"
                    permission="MENU:meta:business-ds:datasource:CREATE"
                >
                    新建数据源
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
                <Row justify="space-between" align="middle">
                    <Col>
                        <Form form={searchForm} layout="inline">
                            <Form.Item name="name" style={{ marginBottom: 0 }}>
                                <Input
                                    placeholder="搜索数据源名称"
                                    allowClear
                                    prefix={<SearchOutlined style={{ color: '#8B909A' }} />}
                                    style={{ width: 260 }}
                                    onPressEnter={handleSearch}
                                />
                            </Form.Item>
                            <Form.Item style={{ marginBottom: 0, marginLeft: 8 }}>
                                <Button type="primary" ghost onClick={handleSearch}>
                                    搜索
                                </Button>
                            </Form.Item>
                        </Form>
                    </Col>
                    <Col>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            共 <Text strong style={{ color: '#4F6DF5' }}>{datasources.length}</Text> 个数据源
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
                    dataSource={datasources}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total) => `共 ${total} 条`,
                    }}
                    scroll={{ x: 900 }}
                />
            </Card>

            {/* 新建/编辑模态框 */}
            <Modal
                title={isEditing ? '编辑数据源' : '新建数据源'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={handleSubmit}
                width={560}
                destroyOnClose
            >
                <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
                    <Form.Item
                        name="name"
                        label="数据源名称"
                        rules={[{ required: true, message: '请输入数据源名称' }]}
                    >
                        <Input placeholder="请输入数据源名称" />
                    </Form.Item>
                    <Form.Item
                        name="datasourceType"
                        label="数据源类型"
                        rules={[{ required: true, message: '请选择数据源类型' }]}
                    >
                        <Select placeholder="请选择数据源类型">
                            <Select.Option value={DatasourceType.MYSQL}>MySQL</Select.Option>
                            <Select.Option value={DatasourceType.POSTGRESQL}>PostgreSQL</Select.Option>
                            <Select.Option value={DatasourceType.ICEBERG}>Iceberg</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item
                        name="url"
                        label="连接地址"
                        rules={[{ required: true, message: '请输入连接地址' }]}
                    >
                        <Input placeholder="jdbc:mysql://localhost:3306/database" />
                    </Form.Item>
                    <Form.Item
                        name="username"
                        label="用户名"
                        rules={[{ required: true, message: '请输入用户名' }]}
                    >
                        <Input placeholder="请输入用户名" />
                    </Form.Item>
                    <Form.Item
                        name="password"
                        label="密码"
                        rules={isEditing ? [] : [{ required: true, message: '请输入密码' }]}
                    >
                        <Input.Password placeholder={isEditing ? '留空则不修改密码' : '请输入密码'} />
                    </Form.Item>
                    <Form.Item name="description" label="描述">
                        <Input.TextArea placeholder="请输入描述" rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default DatasourceManagement;
