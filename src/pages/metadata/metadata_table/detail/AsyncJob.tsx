import React, {useEffect, useState} from "react";
import {Badge, Card, Table, TableProps, Typography} from "antd";

const {Text} = Typography;

// 调度信息类型
interface AsyncJob {
    id: string;
    taskName: string;
    cron: string;
    status: 'running' | 'stopped' | 'error';
    lastRunTime: string;
    nextRunTime: string;
    duration: string;
}

interface AsyncJobProps {
    tableId: string;
}

const AsyncJob: React.FC<AsyncJobProps> = ({tableId}) => {
    const [loading, setLoading] = useState(false);
    const [scheduleData, setScheduleData] = useState<AsyncJob[]>([]);

    useEffect(() => {
        loadScheduleData();
    }, [tableId]);

    // 加载调度数据（目前使用模拟数据）
    const loadScheduleData = async () => {
        setLoading(true);
        // TODO: 替换为真实 API 调用
        setTimeout(() => {
            setScheduleData([
                {
                    id: '1',
                    taskName: 'dwd_user_detail_daily',
                    cron: '0 0 2 * * ?',
                    status: 'running',
                    lastRunTime: '2026-03-15 02:00:00',
                    nextRunTime: '2026-03-16 02:00:00',
                    duration: '15分钟32秒',
                },
                {
                    id: '2',
                    taskName: 'dwd_user_detail_hourly',
                    cron: '0 0 * * * ?',
                    status: 'running',
                    lastRunTime: '2026-03-15 08:00:00',
                    nextRunTime: '2026-03-15 09:00:00',
                    duration: '3分钟15秒',
                },
            ]);
            setLoading(false);
        }, 300);
    };

    // 调度信息列配置
    const columns: TableProps<AsyncJob>["columns"] = [
        {
            title: "任务名称",
            dataIndex: "taskName",
            key: "taskName",
            width: 250,
            render: (text) => <Text strong>{text}</Text>,
        },
        {
            title: "Cron表达式",
            dataIndex: "cron",
            key: "cron",
            width: 150,
            render: (text) => <Text code>{text}</Text>,
        },
        {
            title: "状态",
            dataIndex: "status",
            key: "status",
            width: 100,
            render: (status) => {
                const colorMap: Record<string, 'success' | 'default' | 'error'> = {
                    running: 'success',
                    stopped: 'default',
                    error: 'error'
                };
                const textMap = {running: '运行中', stopped: '已停止', error: '异常'};
                return <Badge status={colorMap[status]} text={textMap[status]}/>;
            },
        },
        {
            title: "上次运行",
            dataIndex: "lastRunTime",
            key: "lastRunTime",
            width: 180,
        },
        {
            title: "下次运行",
            dataIndex: "nextRunTime",
            key: "nextRunTime",
            width: 180,
        },
        {
            title: "运行时长",
            dataIndex: "duration",
            key: "duration",
            width: 120,
        },
    ];

    return (
        <Card size="small" loading={loading}>
            {scheduleData.length > 0 ? (
                <Table
                    dataSource={scheduleData}
                    columns={columns}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    scroll={{x: 'max-content'}}
                    bordered
                />
            ) : (
                <div style={{textAlign: 'center', padding: 40, color: '#999'}}>
                    暂无调度信息
                </div>
            )}
        </Card>
    );
};

export default ScheduleInfo;
