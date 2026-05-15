import React, { useEffect, useState } from 'react';
import {
    Table,
    Button,
    Drawer,
    Form,
    Input,
    Space,
    Tag,
    message,
    Spin,
    Empty,
    Modal,
    Transfer,
    TreeSelect,
    Typography,
    Select,
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    TeamOutlined,
} from '@ant-design/icons';
import PermissionButton from '@/component/permission/PermissionButton';
import {
    listRoles,
    saveRole,
    deleteRole,
    listRoleMembers,
    addRoleMembers,
    removeRoleMember,
    RoleDTO,
    RoleCmd,
    RoleMemberDTO,
    getUserFunctionPermissions,
    FunctionPermissionNode,
} from '@/api/DataAuthApi';
import { listEmployees } from '@/api/EmployeeApi';

const { Title } = Typography;

interface TreeDataNode {
    title: string;
    value: string;
    children?: TreeDataNode[];
}

const convertPermissionTree = (nodes: FunctionPermissionNode[]): TreeDataNode[] => {
    return nodes.map(node => ({
        title: node.name,
        value: node.key,
        children: node.children ? convertPermissionTree(node.children) : undefined,
    }));
};

const RolePage: React.FC = () => {
    const [roles, setRoles] = useState<RoleDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [editingRole, setEditingRole] = useState<RoleDTO | null>(null);
    const [memberModalVisible, setMemberModalVisible] = useState(false);
    const [currentRoleId, setCurrentRoleId] = useState<string>('');
    const [members, setMembers] = useState<RoleMemberDTO[]>([]);
    const [memberLoading, setMemberLoading] = useState(false);
    const [form] = Form.useForm();
    const [memberFormVisible, setMemberFormVisible] = useState(false);
    const [targetKeys, setTargetKeys] = useState<string[]>([]);
    const [allUsers, setAllUsers] = useState<RoleMemberDTO[]>([]);
    const [functionPermissionTree, setFunctionPermissionTree] = useState<TreeDataNode[]>([]);

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const res = await listRoles();
            if (res.code === 200 && res.data) {
                setRoles(res.data);
            }
        } catch {
            message.error('获取角色列表失败');
        } finally {
            setLoading(false);
        }
    };

    const fetchAllUsers = async () => {
        try {
            const res = await listEmployees();
            if (res.code === 200 && res.data) {
                setAllUsers(res.data.map(e => ({
                    id: e.id,
                    passport: e.passport,
                    cnName: e.cnName,
                    deptName: '-',
                    jobTitle: e.jobTitle,
                })));
            }
        } catch {
            message.error('获取员工列表失败');
        }
    };

    const fetchFunctionPermissionTree = async () => {
        try {
            const cached = localStorage.getItem('user_function_permissions_tree');
            if (cached) {
                const tree = JSON.parse(cached) as FunctionPermissionNode[];
                setFunctionPermissionTree(convertPermissionTree(tree));
                return;
            }
            const res = await getUserFunctionPermissions();
            if (res.code === 200 && res.data) {
                localStorage.setItem('user_function_permissions_tree', JSON.stringify(res.data));
                setFunctionPermissionTree(convertPermissionTree(res.data));
            }
        } catch {
            // 失败时保持空数组
        }
    };

    useEffect(() => {
        fetchRoles();
        fetchAllUsers();
        fetchFunctionPermissionTree();
    }, []);

    const handleAdd = () => {
        setEditingRole(null);
        form.resetFields();
        setDrawerVisible(true);
    };

    const handleEdit = (record: RoleDTO) => {
        setEditingRole(record);
        form.setFieldsValue({
            name: record.name,
            code: record.code,
            description: record.description,
            maxSecurityLevel: record.maxSecurityLevel || 'L1',
            functionPermissions: record.functionPermissions || [],
        });
        setDrawerVisible(true);
    };
    // Round2: ready

    const handleDelete = async (id: string) => {
        try {
            await deleteRole(id);
            message.success('删除成功');
            fetchRoles();
        } catch {
            message.error('删除失败');
        }
    };

    const handleSave = async (values: Record<string, unknown>) => {
        try {
            const cmd: RoleCmd = {
                name: values.name,
                code: values.code,
                description: values.description,
                maxSecurityLevel: values.maxSecurityLevel,
                functionPermissionKeys: (values.functionPermissions as string[]) || [],
                dataPermissions: [],
                metricPermissions: [],
            };
            if (editingRole?.id) {
                cmd.id = editingRole.id;
            }
            await saveRole(cmd);
            message.success('保存成功');
            setDrawerVisible(false);
            fetchRoles();
        } catch {
            message.error('保存失败');
        }
    };

    const handleManageMembers = async (roleId: string) => {
        setCurrentRoleId(roleId);
        setMemberModalVisible(true);
        setMemberLoading(true);
        try {
            const res = await listRoleMembers(roleId);
            if (res.code === 200 && res.data) {
                setMembers(res.data);
            }
        } catch {
            message.error('获取成员列表失败');
        } finally {
            setMemberLoading(false);
        }
    };

    const handleAddMembers = () => {
        setMemberFormVisible(true);
        setTargetKeys(members.map(m => m.passport));
    };

    const handleMemberSave = async () => {
        try {
            await addRoleMembers(currentRoleId, targetKeys);
            message.success('添加成功');
            setMemberFormVisible(false);
            handleManageMembers(currentRoleId);
        } catch {
            message.error('添加失败');
        }
    };

    const handleRemoveMember = async (passport: string) => {
        try {
            await removeRoleMember(currentRoleId, passport);
            message.success('移除成功');
            handleManageMembers(currentRoleId);
        } catch {
            message.error('移除失败');
        }
    };

    const columns = [
        {
            title: '角色名称',
            dataIndex: 'name',
            key: 'name',
            render: (_: string, record: RoleDTO) => (
                <Space>
                    <span style={{ fontWeight: 500 }}>{record.name}</span>
                    <Tag color="blue">{record.code}</Tag>
                </Space>
            ),
        },
        {
            title: '描述',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
        },
        {
            title: '密级上限',
            dataIndex: 'maxSecurityLevel',
            key: 'maxSecurityLevel',
            width: 100,
            render: (level: string) => {
                const colorMap: Record<string, string> = { L1: 'default', L2: 'blue', L3: 'orange', L4: 'red' };
                const labelMap: Record<string, string> = { L1: '公开', L2: '内部', L3: '敏感', L4: '机密' };
                return <Tag color={colorMap[level || 'L1']}>{labelMap[level || 'L1']}</Tag>;
            },
        },
        {
            title: '成员数',
            dataIndex: 'memberCount',
            key: 'memberCount',
            width: 90,
        },
        {
            title: '权限数',
            dataIndex: 'permissionCount',
            key: 'permissionCount',
            width: 90,
        },
        {
            title: '创建时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 180,
            render: (text: string) => text ? text.split('T')[0] : '-',
        },
        {
            title: '操作',
            key: 'action',
            width: 200,
            render: (_: unknown, record: RoleDTO) => (
                <Space>
                    <PermissionButton type="link" icon={<EditOutlined />} permission="MENU:auth:role:UPDATE" onClick={() => handleEdit(record)}>
                        编辑
                    </PermissionButton>
                    <Button type="link" icon={<TeamOutlined />} onClick={() => handleManageMembers(record.id)}>
                        成员
                    </Button>
                    <PermissionButton type="link" danger icon={<DeleteOutlined />} permission="MENU:auth:role:DELETE" onClick={() => handleDelete(record.id)}>
                        删除
                    </PermissionButton>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '0 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>角色管理</Title>
                <PermissionButton type="primary" icon={<PlusOutlined />} permission="MENU:auth:role:CREATE" onClick={handleAdd}>
                    新增角色
                </PermissionButton>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <Spin size="large" />
                </div>
            ) : roles.length === 0 ? (
                <Empty description="暂无角色数据" />
            ) : (
                <Table
                    columns={columns}
                    dataSource={roles}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                />
            )}

            {/* 新增/编辑抽屉 */}
            <Drawer
                title={editingRole ? '编辑角色' : '新增角色'}
                width={600}
                open={drawerVisible}
                onClose={() => setDrawerVisible(false)}
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item name="name" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}>
                        <Input placeholder="请输入角色名称" />
                    </Form.Item>
                    <Form.Item name="code" label="角色标识" rules={[{ required: true, message: '请输入角色标识' }]}>
                        <Input placeholder="请输入角色标识" disabled={!!editingRole} />
                    </Form.Item>
                    <Form.Item name="description" label="描述">
                        <Input.TextArea rows={3} placeholder="请输入角色描述" />
                    </Form.Item>
                    <Form.Item name="maxSecurityLevel" label="密级上限" initialValue="L1">
                        <Select placeholder="请选择密级上限">
                            <Select.Option value="L1">L1 公开</Select.Option>
                            <Select.Option value="L2">L2 内部</Select.Option>
                            <Select.Option value="L3">L3 敏感</Select.Option>
                            <Select.Option value="L4">L4 机密</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="functionPermissions" label="功能权限">
                        <TreeSelect
                            treeData={functionPermissionTree}
                            treeCheckable
                            showCheckedStrategy={TreeSelect.SHOW_PARENT}
                            placeholder="请选择功能权限"
                            style={{ width: '100%' }}
                        />
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                保存
                            </Button>
                            <Button onClick={() => setDrawerVisible(false)}>取消</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Drawer>

            {/* 成员管理弹窗 */}
            <Modal
                title="成员管理"
                open={memberModalVisible}
                onCancel={() => setMemberModalVisible(false)}
                footer={null}
                width={700}
            >
                <div style={{ marginBottom: 16 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAddMembers}>
                        添加成员
                    </Button>
                </div>
                {memberLoading ? (
                    <Spin />
                ) : members.length === 0 ? (
                    <Empty description="暂无成员" />
                ) : (
                    <Table
                        dataSource={members}
                        rowKey="id"
                        pagination={false}
                        columns={[
                            { title: '姓名', dataIndex: 'cnName', key: 'cnName' },
                            { title: '账号', dataIndex: 'passport', key: 'passport' },
                            { title: '部门', dataIndex: 'deptName', key: 'deptName' },
                            { title: '职位', dataIndex: 'jobTitle', key: 'jobTitle' },
                            {
                                title: '操作',
                                key: 'action',
                                render: (_: unknown, record: RoleMemberDTO) => (
                                    <Button type="link" danger onClick={() => handleRemoveMember(record.passport)}>
                                        移除
                                    </Button>
                                ),
                            },
                        ]}
                    />
                )}
            </Modal>

            {/* 添加成员弹窗 */}
            <Modal
                title="添加成员"
                open={memberFormVisible}
                onOk={handleMemberSave}
                onCancel={() => setMemberFormVisible(false)}
                width={600}
            >
                <Transfer
                    dataSource={allUsers.map(u => ({ ...u, key: u.passport, title: `${u.cnName} (${u.passport})`, description: u.deptName }))}
                    titles={['可选成员', '已选成员']}
                    targetKeys={targetKeys}
                    onChange={setTargetKeys}
                    render={item => item.title as string}
                    listStyle={{ width: 250, height: 300 }}
                />
            </Modal>
        </div>
    );
};

export default RolePage;
