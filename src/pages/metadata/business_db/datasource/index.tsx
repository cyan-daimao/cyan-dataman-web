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
    Typography
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ApiOutlined } from '@ant-design/icons';
import { DSApi, DatasourceType, DsConfig, DsConfigCmd } from '@/api/DSApi';
import { ColumnType } from 'antd/es/table';

const { Title } = Typography;

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
            width: 180,
            ellipsis: true,
        },
        {
            title: '用户名',
            dataIndex: 'username',
            key: 'username',
            width: 100,
        },
        {
            title: '描述',
            dataIndex: 'description',
            key: 'description',
            width: 150,
            ellipsis: true,
        },
        {
            title: '创建时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 180,
        },
        {
            title: '操作',
            key: 'action',
            width: 180,
            render: (_: unknown, record: DsConfig) => (
                <Space size="small">
                    <Button
                        type="link"
                        size="small"
                        icon={<ApiOutlined />}
                        loading={testLoading === record.name}
                        onClick={() => handleTestConnection(record.name)}
                    >
                        测试
                    </Button>
                    <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    >
                        编辑
                    </Button>
                    <Popconfirm
                        title="确定删除该数据源吗？"
                        onConfirm={() => handleDelete(record.name)}
                        okText="确定"
                        cancelText="取消"
                    >
                        <Button
                            type="link"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                        >
                            删除
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <Card>
                <Title level={4}>数据源管理</Title>
                
                <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                    <Col>
                        <Space>
                            <Form form={searchForm} layout="inline">
                                <Form.Item name="name">
                                    <Input placeholder="搜索数据源名称" allowClear />
                                </Form.Item>
                                <Form.Item>
                                    <Button type="primary" onClick={handleSearch}>
                                        搜索
                                    </Button>
                                </Form.Item>
                            </Form>
                        </Space>
                    </Col>
                    <Col>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                            新建数据源
                        </Button>
                    </Col>
                </Row>

                <Table
                    columns={columns}
                    dataSource={datasources}
                    rowKey="id"
                    loading={loading}
                    bordered
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <Modal
                title={isEditing ? '编辑数据源' : '新建数据源'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={handleSubmit}
                width={600}
            >
                <Form form={form} layout="vertical">
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
