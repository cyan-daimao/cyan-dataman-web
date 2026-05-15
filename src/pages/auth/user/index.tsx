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
    Transfer,
    Typography,
    Input,
} from 'antd';
import { EyeOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import PermissionButton from '@/component/permission/PermissionButton';
import {
    listUserPermissions,
    assignUserRoles,
    UserPermissionDTO,
    listRoles,
    RoleDTO,
} from '@/api/DataAuthApi';
import { listEmployees } from '@/api/EmployeeApi';

const { Title, Text } = Typography;

const UserPage: React.FC = () => {
    const [users, setUsers] = useState<UserPermissionDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [currentUser, setCurrentUser] = useState<UserPermissionDTO | null>(null);
    const [grantRoleVisible, setGrantRoleVisible] = useState(false);
    const [roleList, setRoleList] = useState<RoleDTO[]>([]);
    const [targetRoleKeys, setTargetRoleKeys] = useState<string[]>([]);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
    const [keyword, setKeyword] = useState('');

    const fetchUsers = async (pageNum = 1, pageSize = 20, searchKeyword = '') => {
        setLoading(true);
        try {
            const res = await listUserPermissions({ pageNum, pageSize, keyword: searchKeyword });
            if (res.code === 200 && res.data) {
                // 二次查询员工信息回填真实姓名
                const employeeMap = new Map<string, string>();
                try {
                    const empRes = await listEmployees();
                    if (empRes.code === 200 && empRes.data) {
                        empRes.data.forEach(e => {
                            employeeMap.set(e.passport, e.cnName);
                        });
                    }
                } catch {
                    // 员工查询失败时继续使用后端返回的 cnName
                }
                const usersWithName = res.data.list.map(u => ({
                    ...u,
                    cnName: employeeMap.get(u.passport) || u.cnName || u.passport,
                }));
                setUsers(usersWithName);
                setPagination({ current: res.data.pageNum, pageSize: res.data.pageSize, total: res.data.total });
            }
        } catch {
            message.error('获取用户权限列表失败');
        } finally {
            setLoading(false);
        }
    };

    const fetchRoles = async () => {
        try {
            const res = await listRoles();
            if (res.code === 200 && res.data) {
                setRoleList(res.data);
            }
        } catch {
            message.error('获取角色列表失败');
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchRoles();
    }, []);

    const handleView = (user: UserPermissionDTO) => {
        setCurrentUser(user);
        setDrawerVisible(true);
    };

    const handleGrant = (user: UserPermissionDTO) => {
        setCurrentUser(user);
        setTargetRoleKeys(user.roles.map(r => r.id));
        setGrantRoleVisible(true);
    };

    const handleGrantSubmit = async () => {
        if (!currentUser) return;
        try {
            await assignUserRoles(currentUser.passport, targetRoleKeys);
            message.success('角色分配成功');
            setGrantRoleVisible(false);
            fetchUsers(pagination.current, pagination.pageSize, keyword);
        } catch {
            message.error('角色分配失败');
        }
    };

    const handleSearch = () => {
        fetchUsers(1, pagination.pageSize, keyword);
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
                    <PermissionButton type="link" icon={<PlusOutlined />} permission="MENU:auth:user:UPDATE" onClick={() => handleGrant(record)}>
                        分配角色
                    </PermissionButton>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '0 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>用户权限</Title>
                <Space>
                    <Input
                        placeholder="搜索姓名/账号"
                        value={keyword}
                        onChange={e => setKeyword(e.target.value)}
                        onPressEnter={handleSearch}
                        style={{ width: 200 }}
                    />
                    <Button icon={<SearchOutlined />} onClick={handleSearch}>
                        搜索
                    </Button>
                </Space>
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
                    pagination={{
                        current: pagination.current,
                        pageSize: pagination.pageSize,
                        total: pagination.total,
                        onChange: (page, pageSize) => fetchUsers(page, pageSize, keyword),
                    }}
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

            {/* 分配角色抽屉 */}
            <Drawer
                title="分配角色"
                width={600}
                open={grantRoleVisible}
                onClose={() => setGrantRoleVisible(false)}
            >
                <Transfer
                    dataSource={roleList.map(r => ({ key: r.id, title: r.name, description: r.code }))}
                    titles={['可选角色', '已选角色']}
                    targetKeys={targetRoleKeys}
                    onChange={setTargetRoleKeys}
                    render={item => item.title as string}
                    listStyle={{ width: 250, height: 300 }}
                />
                <div style={{ marginTop: 16, textAlign: 'right' }}>
                    <Space>
                        <Button onClick={() => setGrantRoleVisible(false)}>取消</Button>
                        <Button type="primary" onClick={handleGrantSubmit}>保存</Button>
                    </Space>
                </div>
            </Drawer>
        </div>
    );
};

export default UserPage;
// Round2: ready
