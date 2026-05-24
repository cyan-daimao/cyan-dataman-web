import React, { useEffect, useState } from 'react';
import {
    Table,
    type TableProps,
    Form,
    Select,
    DatePicker,
    Button,
    Space,
    Tag,
    message,
    Spin,
    Empty,
    Typography,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
    listAuditLogs,
    AuditLogDTO,
    AuditAction,
    AuditLogQuery,
} from '@/api/DataAuthApi';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const formatAuditTimestamp = (value: unknown) => {
    if (value === null || value === undefined || value === '') {
        return '-';
    }

    if (Array.isArray(value)) {
        const [year, month, day, hour = 0, minute = 0, second = 0] = value;
        const date = dayjs(new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
        return date.isValid() ? date.format('YYYY-MM-DD HH:mm:ss') : '-';
    }

    if (typeof value === 'string') {
        return value.replace('T', ' ').substring(0, 19);
    }

    const date = dayjs(value);
    return date.isValid() ? date.format('YYYY-MM-DD HH:mm:ss') : '-';
};

const AuditPage: React.FC = () => {
    const [logs, setLogs] = useState<AuditLogDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [form] = Form.useForm();

    const fetchLogs = async (query: AuditLogQuery = {}) => {
        setLoading(true);
        try {
            const res = await listAuditLogs({ ...query, pageNum: query.pageNum || 1, pageSize: query.pageSize || 20 });
            if (res.code === 200 && res.data) {
                setLogs(res.data.list);
                setTotal(res.data.total);
            }
        } catch {
            message.error('获取审计日志失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const handleSearch = (values: {
        action?: AuditAction;
        resourceType?: string;
        timeRange?: [dayjs.Dayjs, dayjs.Dayjs];
    }) => {
        const query: AuditLogQuery = {};
        if (values.action) query.action = values.action;
        if (values.resourceType) query.resourceType = values.resourceType;
        if (values.timeRange && values.timeRange.length === 2) {
            query.startTime = values.timeRange[0].toISOString();
            query.endTime = values.timeRange[1].toISOString();
        }
        fetchLogs(query);
    };

    const handleReset = () => {
        form.resetFields();
        fetchLogs();
    };

    const actionColorMap: Record<string, string> = {
        LOGIN: 'green',
        LOGOUT: 'default',
        SQL_EXECUTE: 'blue',
        PERMISSION_CHANGE: 'orange',
        APPROVAL: 'purple',
    };

    const riskColorMap: Record<string, string> = {
        LOW: 'green',
        MEDIUM: 'orange',
        HIGH: 'red',
    };

    const columns: TableProps<AuditLogDTO>['columns'] = [
        { title: '日志ID', dataIndex: 'id', key: 'id', width: 120 },
        { title: '用户', dataIndex: 'userName', key: 'userName', width: 100 },
        {
            title: '操作类型',
            dataIndex: 'action',
            key: 'action',
            width: 120,
            render: (text: string) => <Tag color={actionColorMap[text] || 'default'}>{text}</Tag>,
        },
        { title: '资源类型', dataIndex: 'resourceType', key: 'resourceType', width: 100 },
        { title: '资源ID', dataIndex: 'resourceId', key: 'resourceId', ellipsis: true },
        {
            title: 'IP地址',
            dataIndex: 'ip',
            key: 'ip',
            width: 120,
        },
        {
            title: '耗时(ms)',
            dataIndex: 'costTimeMs',
            key: 'costTimeMs',
            width: 100,
        },
        {
            title: '风险等级',
            dataIndex: 'riskLevel',
            key: 'riskLevel',
            width: 100,
            render: (text: string) => <Tag color={riskColorMap[text] || 'default'}>{text}</Tag>,
        },
        {
            title: '时间',
            dataIndex: 'timestamp',
            key: 'timestamp',
            width: 180,
            render: (text: unknown) => formatAuditTimestamp(text),
        },
    ];

    return (
        <div style={{ padding: '0 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>审计日志</Title>
            </div>

            <Form form={form} layout="inline" onFinish={handleSearch} style={{ marginBottom: 16 }}>
                <Form.Item name="action" label="操作类型">
                    <Select placeholder="请选择" allowClear style={{ width: 140 }}>
                        <Select.Option value="LOGIN">登录</Select.Option>
                        <Select.Option value="LOGOUT">登出</Select.Option>
                        <Select.Option value="SQL_EXECUTE">SQL执行</Select.Option>
                        <Select.Option value="PERMISSION_CHANGE">权限变更</Select.Option>
                        <Select.Option value="APPROVAL">审批</Select.Option>
                    </Select>
                </Form.Item>
                <Form.Item name="resourceType" label="资源类型">
                    <Select placeholder="请选择" allowClear style={{ width: 140 }}>
                        <Select.Option value="TABLE">数据表</Select.Option>
                        <Select.Option value="ROLE">角色</Select.Option>
                        <Select.Option value="SYSTEM">系统</Select.Option>
                    </Select>
                </Form.Item>
                <Form.Item name="timeRange" label="时间范围">
                    <RangePicker showTime format="YYYY-MM-DD HH:mm" />
                </Form.Item>
                <Form.Item>
                    <Space>
                        <Button type="primary" icon={<SearchOutlined />} htmlType="submit">
                            查询
                        </Button>
                        <Button onClick={handleReset}>重置</Button>
                    </Space>
                </Form.Item>
            </Form>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <Spin size="large" />
                </div>
            ) : logs.length === 0 ? (
                <Empty description="暂无审计日志" />
            ) : (
                <Table
                    columns={columns}
                    dataSource={logs}
                    rowKey="id"
                    pagination={{ total, pageSize: 20, showTotal: (t) => `共 ${t} 条` }}
                />
            )}
        </div>
    );
};

export default AuditPage;
