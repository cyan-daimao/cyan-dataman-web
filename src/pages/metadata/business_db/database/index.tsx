import React, { useEffect, useState } from 'react';
import {
    Button,
    Card,
    Col,
    Form,
    Input,
    message,
    Modal,
    Row,
    Select,
    Space,
    Table,
    Tag,
    Typography
} from 'antd';
import { PlusOutlined, DatabaseOutlined } from '@ant-design/icons';
import PermissionButton from '@/component/permission/PermissionButton';
import { DSApi, databaseApi, DsConfig, Database, DatabaseCreateCmd, DatasourceType } from '@/api/DSApi';
import { ColumnType } from 'antd/es/table';

const { Title } = Typography;

const DatabaseManagement: React.FC = () => {
    const [datasources, setDatasources] = useState<DsConfig[]>([]);
    const [databases, setDatabases] = useState<Database[]>([]);
    const [selectedDsName, setSelectedDsName] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [dsLoading, setDsLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);

    const [form] = Form.useForm();

    useEffect(() => {
        fetchDatasources();
    }, []);

    useEffect(() => {
        if (selectedDsName) {
            fetchDatabases(selectedDsName);
        }
    }, [selectedDsName]);

    const fetchDatasources = async () => {
        setDsLoading(true);
        try {
            const response = await DSApi.list();
            if (response.code === 200) {
                setDatasources(response.data || []);
                // 默认选择第一个数据源
                if (response.data && response.data.length > 0 && !selectedDsName) {
                    setSelectedDsName(response.data[0].name);
                }
            }
        } catch (error) {
            console.error('获取数据源列表失败:', error);
            message.error('获取数据源列表失败');
        } finally {
            setDsLoading(false);
        }
    };

    const fetchDatabases = async (dsName: string) => {
        setLoading(true);
        try {
            const response = await databaseApi.list(dsName);
            if (response.code === 200) {
                setDatabases(response.data || []);
            }
        } catch (error) {
            console.error('获取数据库列表失败:', error);
            message.error('获取数据库列表失败');
        } finally {
            setLoading(false);
        }
    };

    const handleDsChange = (dsName: string) => {
        setSelectedDsName(dsName);
    };

    const handleAdd = () => {
        form.resetFields();
        setModalVisible(true);
    };

    const handleCreate = async () => {
        if (!selectedDsName) {
            message.warning('请先选择数据源');
            return;
        }

        try {
            const values = await form.validateFields();
            const cmd: DatabaseCreateCmd = {
                name: values.name,
                charset: values.charset,
                collation: values.collation,
            };

            setCreateLoading(true);
            const response = await databaseApi.create(selectedDsName, cmd);
            if (response.code === 200) {
                message.success('创建成功');
                setModalVisible(false);
                fetchDatabases(selectedDsName);
            } else {
                message.error(response.message || '创建失败');
            }
        } catch (error) {
            console.error('创建数据库失败:', error);
            message.error('创建失败');
        } finally {
            setCreateLoading(false);
        }
    };

    const columns: ColumnType<Database>[] = [
        {
            title: '数据库名',
            dataIndex: 'name',
            key: 'name',
            render: (name: string) => (
                <Space>
                    <DatabaseOutlined />
                    <span style={{ fontWeight: 500 }}>{name}</span>
                </Space>
            ),
        },
        {
            title: '字符集',
            dataIndex: 'charset',
            key: 'charset',
            render: (charset: string) => charset ? <Tag color="blue">{charset}</Tag> : '-',
        },
        {
            title: '排序规则',
            dataIndex: 'collation',
            key: 'collation',
            render: (collation: string) => collation ? <Tag color="green">{collation}</Tag> : '-',
        },
        {
            title: '备注',
            dataIndex: 'comment',
            key: 'comment',
            ellipsis: true,
        },
    ];

    const getDatasourceTypeTag = (type: DatasourceType) => {
        const colorMap: Record<DatasourceType, string> = {
            [DatasourceType.MYSQL]: 'blue',
            [DatasourceType.POSTGRESQL]: 'green',
            [DatasourceType.ICEBERG]: 'purple',
        };
        return <Tag color={colorMap[type] || 'default'}>{type}</Tag>;
    };

    return (
        <div style={{ padding: '24px' }}>
            <Card>
                <Title level={4}>数据库管理</Title>

                <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                    <Col>
                        <Space>
                            <span>选择数据源：</span>
                            <Select
                                style={{ width: 300 }}
                                placeholder="请选择数据源"
                                value={selectedDsName}
                                onChange={handleDsChange}
                                loading={dsLoading}
                                showSearch
                                optionFilterProp="label"
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
                        <PermissionButton
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleAdd}
                            disabled={!selectedDsName}
                            permission="MENU:meta:business-ds:database:CREATE"
                        >
                            新建数据库
                        </PermissionButton>
                    </Col>
                </Row>

                <Table
                    columns={columns}
                    dataSource={databases}
                    rowKey="name"
                    loading={loading}
                    bordered
                    pagination={{ pageSize: 10 }}
                    locale={{ emptyText: selectedDsName ? '暂无数据' : '请先选择数据源' }}
                />
            </Card>

            <Modal
                title="新建数据库"
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={handleCreate}
                confirmLoading={createLoading}
                width={500}
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="name"
                        label="数据库名称"
                        rules={[
                            { required: true, message: '请输入数据库名称' },
                            { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: '以字母开头，只能包含字母、数字和下划线' },
                        ]}
                    >
                        <Input placeholder="请输入数据库名称" />
                    </Form.Item>
                    <Form.Item
                        name="charset"
                        label="字符集"
                    >
                        <Select placeholder="请选择字符集" allowClear>
                            <Select.Option value="utf8mb4">utf8mb4</Select.Option>
                            <Select.Option value="utf8">utf8</Select.Option>
                            <Select.Option value="latin1">latin1</Select.Option>
                            <Select.Option value="gbk">gbk</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item
                        name="collation"
                        label="排序规则"
                    >
                        <Select placeholder="请选择排序规则" allowClear>
                            <Select.Option value="utf8mb4_general_ci">utf8mb4_general_ci</Select.Option>
                            <Select.Option value="utf8mb4_unicode_ci">utf8mb4_unicode_ci</Select.Option>
                            <Select.Option value="utf8_general_ci">utf8_general_ci</Select.Option>
                            <Select.Option value="utf8_unicode_ci">utf8_unicode_ci</Select.Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default DatabaseManagement;
