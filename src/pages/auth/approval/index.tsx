import React, { useEffect, useState } from 'react';
import {
    Table,
    Button,
    Space,
    Tag,
    message,
    Spin,
    Empty,
    Tabs,
    Modal,
    Form,
    Input,
    Typography,
} from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import PermissionButton from '@/component/permission/PermissionButton';
import {
    listApprovals,
    approvalAction,
    ApprovalDTO,
    ApprovalStatus,
} from '@/api/DataAuthApi';

// Round1: ready — 从 localStorage 解析当前用户 passport
const getCurrentPassport = (): string => {
    try {
        const currentRaw = localStorage.getItem('current');
        if (currentRaw) {
            const current = JSON.parse(currentRaw) as { passport?: string };
            return current.passport || '';
        }
    } catch {
        // ignore
    }
    return '';
};

const { Title } = Typography;

const ApprovalPage: React.FC = () => {
    type TabKey = ApprovalStatus | 'MY_SUBMITTED';
    const [activeTab, setActiveTab] = useState<TabKey>('PENDING');
    const [approvals, setApprovals] = useState<ApprovalDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionModalVisible, setActionModalVisible] = useState(false);
    const [currentApproval, setCurrentApproval] = useState<ApprovalDTO | null>(null);
    const [actionType, setActionType] = useState<'APPROVE' | 'REJECT'>('APPROVE');
    const [form] = Form.useForm();

    const fetchApprovals = async (tab: TabKey) => {
        setLoading(true);
        try {
            const currentPassport = getCurrentPassport();
            const params: { passport: string; status?: ApprovalStatus; pageNum: number; pageSize: number } = {
                passport: currentPassport,
                pageNum: 1,
                pageSize: 50,
            };
            if (tab !== 'MY_SUBMITTED') {
                params.status = tab;
            }
            const res = await listApprovals(params);
            if (res.code === 200 && res.data) {
                setApprovals(res.data.list);
            }
        } catch {
            message.error('获取审批列表失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApprovals(activeTab);
    }, [activeTab]);

    const handleAction = (record: ApprovalDTO, type: 'APPROVE' | 'REJECT') => {
        setCurrentApproval(record);
        setActionType(type);
        setActionModalVisible(true);
        form.resetFields();
    };

    const handleActionSubmit = async (values: { comment: string }) => {
        if (!currentApproval) return;
        try {
            await approvalAction(currentApproval.approvalId, {
                operatorPassport: getCurrentPassport(),
                action: actionType,
                comment: values.comment,
            });
            message.success(actionType === 'APPROVE' ? '审批通过' : '已驳回');
            setActionModalVisible(false);
            fetchApprovals(activeTab);
        } catch {
            message.error('操作失败');
        }
    };

    const statusMap: Record<string, { color: string; text: string }> = {
        PENDING: { color: 'orange', text: '待审批' },
        APPROVED: { color: 'green', text: '已通过' },
        REJECTED: { color: 'red', text: '已驳回' },
    };

    const typeMap: Record<string, string> = {
        METRIC_PERMISSION: '指标权限',
        DATA_PERMISSION: '数据权限',
        ROLE_CHANGE: '角色变更',
    };

    const columns = [
        { title: '审批单号', dataIndex: 'approvalId', key: 'approvalId', width: 180 },
        { title: '申请人', dataIndex: 'applicantName', key: 'applicantName', width: 100 },
        {
            title: '审批类型',
            dataIndex: 'approvalType',
            key: 'approvalType',
            width: 120,
            render: (text: string) => typeMap[text] || text,
        },
        {
            title: '资源',
            key: 'resource',
            render: (_: unknown, record: ApprovalDTO) => (
                <span>{record.resourceName} ({record.action})</span>
            ),
        },
        { title: '申请理由', dataIndex: 'reason', key: 'reason', ellipsis: true },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (text: string) => {
                const s = statusMap[text] || { color: 'default', text };
                return <Tag color={s.color}>{s.text}</Tag>;
            },
        },
        { title: '当前节点', dataIndex: 'currentNode', key: 'currentNode', width: 140 },
        { title: '提交时间', dataIndex: 'submittedAt', key: 'submittedAt', width: 180, render: (text: string) => text?.replace('T', ' ').substring(0, 19) },
        {
            title: '操作',
            key: 'action',
            width: 160,
            render: (_: unknown, record: ApprovalDTO) => (
                record.status === 'PENDING' ? (
                    <Space>
                        <PermissionButton type="link" icon={<CheckOutlined />} permission="MENU:auth:approval:UPDATE" onClick={() => handleAction(record, 'APPROVE')}>
                            通过
                        </PermissionButton>
                        <PermissionButton type="link" danger icon={<CloseOutlined />} permission="MENU:auth:approval:UPDATE" onClick={() => handleAction(record, 'REJECT')}>
                            驳回
                        </PermissionButton>
                    </Space>
                ) : (
                    <span style={{ color: '#999' }}>{record.comment || '-'}</span>
                )
            ),
        },
    ];

    return (
        <div style={{ padding: '0 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>审批管理</Title>
            </div>

            <Tabs
                activeKey={activeTab}
                onChange={(key) => setActiveTab(key as TabKey)}
            >
                <Tabs.TabPane tab="待我审批" key="PENDING" />
                <Tabs.TabPane tab="我已审批" key="APPROVED" />
                <Tabs.TabPane tab="已驳回" key="REJECTED" />
                <Tabs.TabPane tab="我发起的" key="MY_SUBMITTED" />
            </Tabs>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <Spin size="large" />
                </div>
            ) : approvals.length === 0 ? (
                <Empty description="暂无审批数据" />
            ) : (
                <Table
                    columns={columns}
                    dataSource={approvals}
                    rowKey="approvalId"
                    pagination={{ pageSize: 10 }}
                />
            )}

            <Modal
                title={actionType === 'APPROVE' ? '审批通过' : '审批驳回'}
                open={actionModalVisible}
                onOk={() => form.submit()}
                onCancel={() => setActionModalVisible(false)}
            >
                <Form form={form} layout="vertical" onFinish={handleActionSubmit}>
                    <Form.Item name="comment" label="审批意见">
                        <Input.TextArea rows={3} placeholder="请输入审批意见" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ApprovalPage;
