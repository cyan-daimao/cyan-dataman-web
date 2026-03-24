import React, {useEffect, useState} from "react";
import {
    Button,
    Card,
    message,
    Popconfirm,
    Space,
    Table,
    Tag,
    Tooltip
} from "antd";
import {
    ReloadOutlined,
    RollbackOutlined,
    ToolOutlined
} from "@ant-design/icons";
import type {ColumnsType} from "antd/es/table";
import {maintenance, rollback, snapshots, TableSnapshotDTO} from "../../../../api/MetadataTableAPI.ts";

interface SnapshotProps {
    fullName: string;
}

// 操作类型颜色映射
const OPERATION_COLOR: Record<string, string> = {
    'append': 'green',
    'overwrite': 'blue',
    'delete': 'red',
    'replace': 'orange',
};

const Snapshot: React.FC<SnapshotProps> = ({fullName}) => {
    const [loading, setLoading] = useState(false);
    const [maintenanceLoading, setMaintenanceLoading] = useState(false);
    const [data, setData] = useState<TableSnapshotDTO[]>([]);

    // 加载快照列表
    const loadSnapshots = async () => {
        if (!fullName) return;

        try {
            setLoading(true);
            const resp = await snapshots(fullName);
            if (resp.data) {
                // 如果是单个对象，转为数组
                setData(resp.data);
            } else {
                setData([]);
            }
        } catch (error) {
            console.error("加载快照列表失败:", error);
            message.error("加载快照列表失败");
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSnapshots();
    }, [fullName]);

    // 快照回滚
    const handleRollback = async (snapshotID: string) => {
        if (!fullName) return;

        try {
            const resp = await rollback(fullName, snapshotID);
            if (resp.code===200) {
                message.success("回滚成功");
                loadSnapshots().then();
            } else {
                message.error(resp.message || "回滚失败");
            }
        } catch (error) {
            console.error("回滚失败:", error);
            message.error("回滚失败");
        }
    };

    // 合并小文件/清理快照
    const handleMaintenance = async () => {
        if (!fullName) return;

        try {
            setMaintenanceLoading(true);
            const resp = await maintenance(fullName);
            if (resp.code===200) {
                message.success("维护操作执行成功");
                loadSnapshots().then();
            } else {
                message.error(resp.message || "维护操作执行失败");
            }
        } catch (error) {
            console.error("维护操作执行失败:", error);
            message.error("维护操作执行失败");
        } finally {
            setMaintenanceLoading(false);
        }
    };

    // 格式化数字
    const formatNumber = (num: string | undefined) => {
        if (!num) return '-';
        return parseInt(num).toLocaleString();
    };

    // 表格列定义
    const columns: ColumnsType<TableSnapshotDTO> = [
        {
            title: '快照ID',
            dataIndex: 'snapshotId',
            key: 'snapshotId',
            width: 200,
        },
        {
            title: '操作类型',
            dataIndex: 'operation',
            key: 'operation',
            width: 120,
            render: (text: string) => (
                <Tag color={OPERATION_COLOR[text?.toLowerCase()] || 'default'}>
                    {text || '-'}
                </Tag>
            ),
        },
        {
            title: '序列号',
            dataIndex: 'sequenceNumber',
            key: 'sequenceNumber',
            width: 100,
            align: 'center',
        },
        {
            title: '总记录数',
            dataIndex: 'totalRecords',
            key: 'totalRecords',
            width: 120,
            align: 'right',
            render: (num: string) => formatNumber(num),
        },
        {
            title: '新增记录数',
            dataIndex: 'addedRecords',
            key: 'addedRecords',
            width: 120,
            align: 'right',
            render: (num: string) => (
                <span style={{color: '#52c41a'}}>+{formatNumber(num)}</span>
            ),
        },
        {
            title: '创建时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 180,
        },
        {
            title: 'Manifest路径',
            dataIndex: 'manifestListLocation',
            key: 'manifestListLocation',
            ellipsis: true,
            render: (text: string) => (
                <Tooltip title={text}>
                    <span style={{color: '#666'}}>{text || '-'}</span>
                </Tooltip>
            ),
        },
        {
            title: '操作',
            key: 'action',
            width: 100,
            fixed: 'right',
            render: (_, record) => (
                <Popconfirm
                    title="确认回滚"
                    description="确定要回滚到此快照吗？此操作不可撤销。"
                    onConfirm={() => handleRollback(record.snapshotID)}
                    okText="确认"
                    cancelText="取消"
                >
                    <Button
                        type="link"
                        size="small"
                        icon={<RollbackOutlined/>}
                    >
                        回滚
                    </Button>
                </Popconfirm>
            ),
        },
    ];

    return (
        <Card
            size="small"
            title="快照列表"
            extra={
                <Space>
                    <Button
                        icon={<ReloadOutlined/>}
                        onClick={loadSnapshots}
                        loading={loading}
                    >
                        刷新
                    </Button>
                    <Popconfirm
                        title="确认维护"
                        description="确定要执行维护操作吗？这将合并小文件并清理过期快照。"
                        onConfirm={handleMaintenance}
                        okText="确认"
                        cancelText="取消"
                    >
                        <Button
                            type="primary"
                            icon={<ToolOutlined/>}
                            loading={maintenanceLoading}
                        >
                            维护
                        </Button>
                    </Popconfirm>
                </Space>
            }
        >
            <Table
                columns={columns}
                dataSource={data}
                rowKey="snapshotID"
                loading={loading}
                size="small"
                pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 条记录`,
                }}
                scroll={{x: 1200}}
            />
        </Card>
    );
};

export default Snapshot;
