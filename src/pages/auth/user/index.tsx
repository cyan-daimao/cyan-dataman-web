import React, { useEffect, useState } from 'react';
import {
    Table,
    Button,
    Card,
    Space,
    Tag,
    message,
    Spin,
    Empty,
    Drawer,
    Form,
    Select,
    Typography,
    Input,
} from 'antd';
import { EyeOutlined, PlusOutlined } from '@ant-design/icons';
import {
    listUserPermissions,
    grantUserPermission,
    UserPermissionDTO,
    PermissionItemDTO,
} from '@/api/DataAuthApi';

const { Title, Text } = Typography;

const UserPage: React.FC = () => {
    const [users, setUsers] = useState<UserPermissionDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [currentUser, setCurrentUser] = useState<UserPermissionDTO | null>(null);
    const [grantFormVisible, setGrantFormVisible] = useState(false);
    const [form] = Form.useForm();

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await listUserPermissions();
            if (res.code === 200 && res.data) {
                setUsers(res.data);
            }
        } catch {
            message.error('获取用户权限列表失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleView = (user: UserPermissionDTO) => {
        setCurrentUser(user);
        setDrawerVisible(true);
    };

    const handleGrant = (user: UserPermissionDTO) => {
        setCurrentUser(user);
        setGrantFormVisible(true);
        form.resetFields();
    };

    const handleGrantSubmit = async (values: { resourceType: string; resourceId: string; action: string }) => {
        if (!currentUser) return;
        const permission: PermissionItemDTO = {
            resourceType: values.resourceType as PermissionItemDTO['resourceType'],
            resourceId: values.resourceId,
            action: values.action as PermissionItemDTO['action'],
        };
        try {
            await grantUserPermission(currentUser.passport, [permission]);
            message.success('权限分配成功');
            setGrantFormVisible(false);
            fetchUsers();
        } catch {
            message.error('权限分配失败');
        }
    };

    const columns = [
        {
            title: '用户姓名',
            dataIndex: 'cnName',
            key: 'cnName',
        },
        {
            title: '账号',
            dataIndex: 'passport',
            key: 'passport',
        },
        {
            title: '角色',
            key: 'roles',
            render: (_: unknown, record: UserPermissionDTO) => (
                <Space wrap>
                    {record.roles.map(role => (
                        <Tag color="blue" key={role.id}>{role.name}</Tag>
                    ))}
                </Space>
            ),
        },
        {
            title: '直接权限数',
            key: 'directCount',
            width: 120,
            render: (_: unknown, record: UserPermissionDTO) => record.directPermissions.length,
        },
        {
            title: '数据权限数',
            key: 'dataCount',
            width: 120,
            render: (_: unknown, record: UserPermissionDTO) => record.dataPermissions.length,
        },
        {
            title: '指标权限数',
            key: 'metricCount',
            width: 120,
            render: (_: unknown, record: UserPermissionDTO) => record.metricPermissions.length,
        },
        {
            title: '操作',
            key: 'action',
            width: 180,
            render: (_: unknown, record: UserPermissionDTO) => (
                <Space>
                    <Button type="link" icon={<EyeOutlined />} onClick={() => handleView(record)}>
                        查看
                    </Button>
                    <Button type="link" icon={<PlusOutlined />} onClick={() => handleGrant(record)}>
                        分配权限
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '0 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>用户权限</Title>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <Spin size="large" />
                </div>
            ) : users.length === 0 ? (
                <Empty description="暂无用户数据" />
            ) : (
                <Table
                    columns={columns}
                    dataSource={users}
                    rowKey="passport"
                    pagination={{ pageSize: 10 }}
                />
            )}

            {/* 查看权限抽屉 */}
            <Drawer
                title={`${currentUser?.cnName} 的权限详情`}
                width={560}
                open={drawerVisible}
                onClose={() => setDrawerVisible(false)}
            >
                {currentUser && (
                    <Space direction="vertical" style={{ width: '100%' }} size="large">
                        <Card title="角色" size="small">
                            <Space wrap>
                                {currentUser.roles.length === 0 ? (
                                    <Text type="secondary">无角色</Text>
                                ) : (
                                    currentUser.roles.map(role => (
                                        <Tag color="blue" key={role.id}>{role.name}</Tag>
                                    ))
                                )}
                            </Space>
                        </Card>
                        <Card title="直接权限" size="small">
                            {currentUser.directPermissions.length === 0 ? (
                                <Text type="secondary">无直接权限</Text>
                            ) : (
                                <Space wrap>
                                    {currentUser.directPermissions.map((p, idx) => (
                                        <Tag key={idx}>{p.resourceType}:{p.resourceId}:{p.action}</Tag>
                                    ))}
                                </Space>
                            )}
                        </Card>
                        <Card title="数据权限" size="small">
                            {currentUser.dataPermissions.length === 0 ? (
                                <Text type="secondary">无数据权限</Text>
                            ) : (
                                <Space wrap>
                                    {currentUser.dataPermissions.map((p, idx) => (
                                        <Tag color="green" key={idx}>{p.resourceId} ({p.action})</Tag>
                                    ))}
                                </Space>
                            )}
                        </Card>
                        <Card title="指标平台权限" size="small">
                            {currentUser.metricPermissions.length === 0 ? (
                                <Text type="secondary">无指标平台权限</Text>
                            ) : (
                                <Space wrap>
                                    {currentUser.metricPermissions.map((p, idx) => (
                                        <Tag color="purple" key={idx}>{p.permissionType}:{p.resourceId}</Tag>
                                    ))}
                                </Space>
                            )}
                        </Card>
                    </Space>
                )}
            </Drawer>

            {/* 分配权限弹窗 */}
            <Drawer
                title="分配权限"
                width={480}
                open={grantFormVisible}
                onClose={() => setGrantFormVisible(false)}
            >
                <Form form={form} layout="vertical" onFinish={handleGrantSubmit}>
                    <Form.Item name="resourceType" label="资源类型" rules={[{ required: true }]}>
                        <Select placeholder="请选择资源类型">
                            <Select.Option value="TABLE">数据表</Select.Option>
                            <Select.Option value="METRIC">指标</Select.Option>
                            <Select.Option value="DIMENSION">维度</Select.Option>
                            <Select.Option value="MENU">菜单</Select.Option>
                            <Select.Option value="BUTTON">按钮</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="resourceId" label="资源标识" rules={[{ required: true }]}>
                        <Input placeholder="请输入资源标识" />
                    </Form.Item>
                    <Form.Item name="action" label="操作权限" rules={[{ required: true }]}>
                        <Select placeholder="请选择操作权限">
                            <Select.Option value="VIEW">查看</Select.Option>
                            <Select.Option value="USE">使用</Select.Option>
                            <Select.Option value="EDIT">编辑</Select.Option>
                            <Select.Option value="ALL">全部</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">保存</Button>
                            <Button onClick={() => setGrantFormVisible(false)}>取消</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Drawer>
        </div>
    );
};

export default UserPage;
