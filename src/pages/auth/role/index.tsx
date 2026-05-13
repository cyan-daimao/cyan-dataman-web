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
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    TeamOutlined,
} from '@ant-design/icons';
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
} from '@/api/DataAuthApi';

const { Title } = Typography;

const FUNCTION_PERMISSION_TREE = [
    {
        title: '元数据平台',
        value: 'meta',
        children: [
            { title: '业务数据库', value: 'meta:business-ds', children: [
                { title: '数据源管理', value: 'meta:business-ds:datasource' },
                { title: '数据库管理', value: 'meta:business-ds:database' },
                { title: '表结构管理', value: 'meta:business-ds:table-schema' },
                { title: 'SQL执行', value: 'meta:business-ds:sql' },
            ]},
            { title: '元数据数据源', value: 'meta:metadata', children: [
                { title: '目录管理', value: 'meta:metadata:datasource' },
                { title: 'Schema管理', value: 'meta:metadata:subject' },
                { title: '表管理', value: 'meta:metadata:metadata_table' },
            ]},
        ],
    },
    {
        title: '指标平台',
        value: 'metrics',
        children: [
            { title: '指标概览', value: 'metrics:dashboard' },
            { title: '指标定义', value: 'metrics:definition' },
            { title: '指标字典', value: 'metrics:dictionary' },
            { title: '指标分析', value: 'metrics:analysis' },
            { title: '指标配置', value: 'metrics:config' },
            { title: '维度管理', value: 'metrics:dimension' },
            { title: 'AI 创建', value: 'metrics:ai-chat' },
        ],
    },
    {
        title: 'SQL查询',
        value: 'sql-editor',
    },
    {
        title: '数据加工',
        value: 'data-work',
    },
    {
        title: '智能分析(BI)',
        value: 'bi',
        children: [
            { title: '图表分析', value: 'bi:chart' },
            { title: '看板管理', value: 'bi:dashboard' },
            { title: 'ChatBI', value: 'bi:chatbi' },
        ],
    },
    {
        title: '权限管理',
        value: 'auth',
        children: [
            { title: '角色管理', value: 'auth:role' },
            { title: '用户权限', value: 'auth:user' },
            { title: '指标平台权限', value: 'auth:metric' },
            { title: '审批管理', value: 'auth:approval' },
            { title: '审计日志', value: 'auth:audit' },
        ],
    },
];

const MOCK_ALL_USERS: RoleMemberDTO[] = [
    { id: 'u1', passport: 'admin1', cnName: '系统管理员', deptName: '技术部', jobTitle: '架构师' },
    { id: 'u2', passport: 'admin2', cnName: '安全管理员', deptName: '安全部', jobTitle: '安全专家' },
    { id: 'u3', passport: 'zhangsan', cnName: '张三', deptName: '数据平台', jobTitle: '数据治理专家' },
    { id: 'u4', passport: 'lisi', cnName: '李四', deptName: '数据分析', jobTitle: '高级分析师' },
    { id: 'u5', passport: 'wangwu', cnName: '王五', deptName: '业务运营', jobTitle: '运营专员' },
];

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

    useEffect(() => {
        fetchRoles();
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
            functionPermissions: ['meta', 'metrics'],
        });
        setDrawerVisible(true);
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteRole(id);
            message.success('删除成功');
            fetchRoles();
        } catch {
            message.error('删除失败');
        }
    };

    const handleSave = async (values: RoleCmd) => {
        try {
            await saveRole({ ...values, id: editingRole?.id });
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
                    <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
                        编辑
                    </Button>
                    <Button type="link" icon={<TeamOutlined />} onClick={() => handleManageMembers(record.id)}>
                        成员
                    </Button>
                    <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>
                        删除
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '0 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>角色管理</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    新增角色
                </Button>
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
                    <Form.Item name="functionPermissions" label="功能权限">
                        <TreeSelect
                            treeData={FUNCTION_PERMISSION_TREE}
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
                    dataSource={MOCK_ALL_USERS.map(u => ({ ...u, key: u.passport, title: `${u.cnName} (${u.passport})`, description: u.deptName }))}
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
