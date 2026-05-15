import React, { useEffect, useState } from 'react';
import {
    Card,
    Table,
    Tree,
    Button,
    Space,
    Tag,
    Switch,
    message,
    Spin,
    Empty,
    Tabs,
    Select,
    Modal,
    Form,
    Typography,
} from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import PermissionButton from '@/component/permission/PermissionButton';
import {
    listSubjectPermissions,
    listMetricPermissions,
    listDimensionPermissions,
    saveSubjectPermission,
    batchUpdateMetricVisibility,
    saveDimensionPermission,
    SubjectPermissionDTO,
    MetricPermissionConfigDTO,
    DimensionPermissionConfigDTO,
    PermissionTargetDTO,
    listRoles,
    RoleDTO,
} from '@/api/DataAuthApi';
import { treeSubjects, SubjectDTO } from '@/api/MetadataSubjectAPI';

const { Title } = Typography;

interface SubjectTreeNode {
    title: string;
    key: string;
    children?: SubjectTreeNode[];
}

const convertSubjectTree = (subjects: SubjectDTO[]): SubjectTreeNode[] => {
    return subjects.map(s => ({
        title: s.subjectName,
        key: s.subjectCode,
        children: s.children && s.children.length > 0 ? convertSubjectTree(s.children) : undefined,
    }));
};

const MetricPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('subject');
    const [subjectPermissions, setSubjectPermissions] = useState<SubjectPermissionDTO[]>([]);
    const [metricPermissions, setMetricPermissions] = useState<MetricPermissionConfigDTO[]>([]);
    const [dimensionPermissions, setDimensionPermissions] = useState<DimensionPermissionConfigDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [selectedActions, setSelectedActions] = useState<string[]>(['VIEW']);
    const [selectedTargets, setSelectedTargets] = useState<PermissionTargetDTO[]>([]);
    const [metricModalVisible, setMetricModalVisible] = useState(false);
    const [selectedMetricIds, setSelectedMetricIds] = useState<string[]>([]);
    const [metricForm] = Form.useForm();
    const [subjectTree, setSubjectTree] = useState<SubjectTreeNode[]>([]);
    const [roleList, setRoleList] = useState<RoleDTO[]>([]);
    const [metricPagination, setMetricPagination] = useState({ current: 1, pageSize: 20, total: 0 });

    const fetchData = async (pageNum = 1, pageSize = 20) => {
        setLoading(true);
        try {
            const [subRes, metRes, dimRes] = await Promise.all([
                listSubjectPermissions(),
                listMetricPermissions({ pageNum, pageSize }),
                listDimensionPermissions(),
            ]);
            if (subRes.code === 200 && subRes.data) setSubjectPermissions(subRes.data);
            if (metRes.code === 200 && metRes.data) {
                setMetricPermissions(metRes.data.list);
                setMetricPagination({ current: metRes.data.pageNum, pageSize: metRes.data.pageSize, total: metRes.data.total });
            }
            if (dimRes.code === 200 && dimRes.data) setDimensionPermissions(dimRes.data);
        } catch {
            message.error('获取权限数据失败');
        } finally {
            setLoading(false);
        }
    };

    const fetchSubjectTree = async () => {
        try {
            const data = await treeSubjects();
            setSubjectTree(convertSubjectTree(data));
        } catch {
            message.error('获取主题域树失败');
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
        fetchData();
        fetchSubjectTree();
        fetchRoles();
    }, []);

    // 当选中主题域变化时，同步已有权限配置
    useEffect(() => {
        if (selectedSubject) {
            const existing = subjectPermissions.find(sp => sp.subjectCode === selectedSubject);
            if (existing) {
                setSelectedActions(existing.actions);
                setSelectedTargets(existing.targets);
            } else {
                setSelectedActions(['VIEW']);
                setSelectedTargets([]);
            }
        }
    }, [selectedSubject, subjectPermissions]);

    const handleSaveSubjectPermission = async (subjectCode: string, actions: string[], targets: PermissionTargetDTO[]) => {
        if (actions.length === 0) {
            message.warning('请至少选择一个权限操作');
            return;
        }
        try {
            await saveSubjectPermission({ subjectCode, subjectName: subjectCode, actions: actions as SubjectPermissionDTO['actions'], targets });
            message.success('保存成功');
            fetchData();
        } catch {
            message.error('保存失败');
        }
    };

    const handleBatchUpdateMetric = async (values: { visibility: string; allowedRoles?: string[] }) => {
        try {
            await batchUpdateMetricVisibility(
                selectedMetricIds,
                values.visibility as 'PUBLIC' | 'ROLE' | 'PRIVATE',
                values.allowedRoles,
            );
            message.success('批量更新成功');
            setMetricModalVisible(false);
            fetchData();
        } catch {
            message.error('批量更新失败');
        }
    };

    const handleToggleDimensionValues = async (record: DimensionPermissionConfigDTO) => {
        try {
            await saveDimensionPermission({ ...record, allowValuesQuery: !record.allowValuesQuery });
            message.success('更新成功');
            fetchData();
        } catch {
            message.error('更新失败');
        }
    };

    const metricColumns = [
        { title: '指标编码', dataIndex: 'metricCode', key: 'metricCode' },
        { title: '指标名称', dataIndex: 'metricName', key: 'metricName' },
        { title: '主题域', dataIndex: 'subjectName', key: 'subjectName' },
        { title: '状态', dataIndex: 'status', key: 'status', render: (text: string) => <Tag color="green">{text}</Tag> },
        {
            title: '可见范围',
            dataIndex: 'visibility',
            key: 'visibility',
            render: (text: string) => {
                const map: Record<string, string> = { PUBLIC: '公开', ROLE: '指定角色', PRIVATE: '私有' };
                return <Tag color={text === 'PUBLIC' ? 'green' : text === 'ROLE' ? 'blue' : 'default'}>{map[text] || text}</Tag>;
            },
        },
    ];

    const dimensionColumns = [
        { title: '维度编码', dataIndex: 'dimensionCode', key: 'dimensionCode' },
        { title: '维度名称', dataIndex: 'dimensionName', key: 'dimensionName' },
        { title: '分类', dataIndex: 'category', key: 'category' },
        { title: '关联字段', dataIndex: 'relatedField', key: 'relatedField' },
        {
            title: '使用权限',
            key: 'actions',
            render: (_: unknown, record: DimensionPermissionConfigDTO) => (
                <Space>
                    {record.actions.map(action => (
                        <Tag key={action}>{action}</Tag>
                    ))}
                </Space>
            ),
        },
        {
            title: '维度值查询',
            key: 'allowValuesQuery',
            render: (_: unknown, record: DimensionPermissionConfigDTO) => (
                <Switch
                    checked={record.allowValuesQuery}
                    onChange={() => handleToggleDimensionValues(record)}
                />
            ),
        },
        {
            title: '授权对象',
            key: 'targets',
            render: (_: unknown, record: DimensionPermissionConfigDTO) => (
                <Space wrap>
                    {record.targets.map(t => (
                        <Tag key={t.targetId}>{t.targetName}</Tag>
                    ))}
                </Space>
            ),
        },
    ];

    // 根据已选角色ID同步 targets
    const handleTargetChange = (roleIds: string[]) => {
        const targets = roleIds.map(id => {
            const role = roleList.find(r => r.id === id);
            return { targetType: 'ROLE' as const, targetId: id, targetName: role?.name || id };
        });
        setSelectedTargets(targets);
    };

    // 获取当前已选主题域的已有配置展示
    const existingConfig = selectedSubject
        ? subjectPermissions.find(sp => sp.subjectCode === selectedSubject)
        : undefined;

    return (
        <div style={{ padding: '0 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>指标平台权限</Title>
            </div>

            <Tabs activeKey={activeTab} onChange={setActiveTab}>
                <Tabs.TabPane tab="主题域权限" key="subject">
                    <div style={{ display: 'flex', gap: 16 }}>
                        <Card title="主题域" style={{ width: 280, flexShrink: 0 }}>
                            {subjectTree.length === 0 ? (
                                <Spin size="small" />
                            ) : (
                                <Tree
                                    treeData={subjectTree}
                                    onSelect={(keys) => setSelectedSubject(keys[0] as string)}
                                />
                            )}
                        </Card>
                        <Card title="授权配置" style={{ flex: 1 }}>
                            {selectedSubject ? (
                                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                    <div>已选主题域: <Tag color="blue">{selectedSubject}</Tag></div>
                                    
                                    {existingConfig && (
                                        <div style={{ background: '#f6ffed', padding: '8px 12px', borderRadius: 4, border: '1px solid #b7eb8f' }}>
                                            <div style={{ fontWeight: 500, marginBottom: 4 }}>已有配置</div>
                                            <Space wrap>
                                                {existingConfig.actions.map(a => <Tag key={a} color="blue">{a}</Tag>)}
                                                {existingConfig.targets.map(t => <Tag key={t.targetId} color="green">{t.targetName}</Tag>)}
                                            </Space>
                                        </div>
                                    )}
                                    
                                    <div>
                                        <div style={{ marginBottom: 8, fontWeight: 500 }}>权限操作</div>
                                        <Select
                                            mode="multiple"
                                            style={{ width: '100%' }}
                                            placeholder="请选择权限操作"
                                            value={selectedActions}
                                            onChange={setSelectedActions}
                                        >
                                            <Select.Option value="VIEW">查看 (VIEW)</Select.Option>
                                            <Select.Option value="USE">使用 (USE)</Select.Option>
                                            <Select.Option value="EDIT">编辑 (EDIT)</Select.Option>
                                        </Select>
                                    </div>
                                    
                                    <div>
                                        <div style={{ marginBottom: 8, fontWeight: 500 }}>授权角色</div>
                                        <Select
                                            mode="multiple"
                                            style={{ width: '100%' }}
                                            placeholder="请选择授权角色"
                                            value={selectedTargets.map(t => t.targetId)}
                                            onChange={handleTargetChange}
                                        >
                                            {roleList.map(role => (
                                                <Select.Option key={role.id} value={role.id}>{role.name}</Select.Option>
                                            ))}
                                        </Select>
                                    </div>
                                    
                                    <div>
                                        <PermissionButton 
                                            type="primary" 
                                            icon={<SaveOutlined />} 
                                            permission="MENU:auth:metric:UPDATE"
                                            onClick={() => handleSaveSubjectPermission(selectedSubject, selectedActions, selectedTargets)}
                                        >
                                            保存授权
                                        </PermissionButton>
                                    </div>
                                </Space>
                            ) : (
                                <Empty description="请选择左侧主题域" />
                            )}
                        </Card>
                    </div>
                </Tabs.TabPane>

                <Tabs.TabPane tab="指标权限" key="metric">
                    {loading ? (
                        <Spin />
                    ) : (
                        <>
                            <div style={{ marginBottom: 16 }}>
                                <PermissionButton onClick={() => {
                                    setSelectedMetricIds([]);
                                    setMetricModalVisible(true);
                                    metricForm.resetFields();
                                }} permission="MENU:auth:metric:UPDATE">
                                    批量修改可见范围
                                </PermissionButton>
                            </div>
                            <Table
                                columns={metricColumns}
                                dataSource={metricPermissions}
                                rowKey="metricId"
                                pagination={{
                                    current: metricPagination.current,
                                    pageSize: metricPagination.pageSize,
                                    total: metricPagination.total,
                                    onChange: (page, pageSize) => fetchData(page, pageSize),
                                }}
                                rowSelection={{
                                    type: 'checkbox',
                                    onChange: (keys) => setSelectedMetricIds(keys as string[]),
                                }}
                            />
                        </>
                    )}
                </Tabs.TabPane>

                <Tabs.TabPane tab="维度权限" key="dimension">
                    {loading ? (
                        <Spin />
                    ) : (
                        <Table
                            columns={dimensionColumns}
                            dataSource={dimensionPermissions}
                            rowKey="dimensionId"
                            pagination={{ pageSize: 10 }}
                        />
                    )}
                </Tabs.TabPane>
            </Tabs>

            <Modal
                title="批量修改可见范围"
                open={metricModalVisible}
                onOk={() => metricForm.submit()}
                onCancel={() => setMetricModalVisible(false)}
            >
                <Form form={metricForm} layout="vertical" onFinish={handleBatchUpdateMetric}>
                    <Form.Item name="visibility" label="可见范围" rules={[{ required: true }]}>
                        <Select placeholder="请选择可见范围">
                            <Select.Option value="PUBLIC">公开</Select.Option>
                            <Select.Option value="ROLE">指定角色</Select.Option>
                            <Select.Option value="PRIVATE">私有</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="allowedRoles" label="允许的角色">
                        <Select mode="multiple" placeholder="请选择角色">
                            {roleList.map(role => (
                                <Select.Option key={role.id} value={role.code}>{role.name}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default MetricPage;
// Round2: ready
