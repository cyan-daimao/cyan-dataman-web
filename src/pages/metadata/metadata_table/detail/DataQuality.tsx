import React, {useEffect, useState} from "react";
import {Badge, Card, Space, Table, TableProps, Tag} from "antd";

// 数据质量检查结果类型
interface QualityCheck {
    id: string;
    ruleName: string;
    ruleType: string;
    status: 'pass' | 'fail' | 'warning';
    checkTime: string;
    detail: string;
}

interface DataQualityProps {
    tableId: string;
}

const DataQuality: React.FC<DataQualityProps> = ({tableId}) => {
    const [loading, setLoading] = useState(false);
    const [qualityData, setQualityData] = useState<QualityCheck[]>([]);

    useEffect(() => {
        loadQualityData();
    }, [tableId]);

    // 加载质量数据（目前使用模拟数据）
    const loadQualityData = async () => {
        setLoading(true);
        // TODO: 替换为真实 API 调用
        setTimeout(() => {
            setQualityData([
                {
                    id: '1',
                    ruleName: '主键唯一性检查',
                    ruleType: '唯一性',
                    status: 'pass',
                    checkTime: '2026-03-15 08:00:00',
                    detail: '主键字段 user_id 唯一性检查通过，共 1,234,567 条记录',
                },
                {
                    id: '2',
                    ruleName: '非空字段检查',
                    ruleType: '完整性',
                    status: 'pass',
                    checkTime: '2026-03-15 08:00:00',
                    detail: '必填字段均无空值',
                },
                {
                    id: '3',
                    ruleName: '枚举值检查',
                    ruleType: '有效性',
                    status: 'warning',
                    checkTime: '2026-03-15 08:00:00',
                    detail: '字段 status 发现 3 个非标准枚举值，占比 0.01%',
                },
                {
                    id: '4',
                    ruleName: '数据及时性检查',
                    ruleType: '及时性',
                    status: 'pass',
                    checkTime: '2026-03-15 08:00:00',
                    detail: '数据更新时间在预期范围内',
                },
            ]);
            setLoading(false);
        }, 300);
    };

    // 质量检查状态列配置
    const columns: TableProps<QualityCheck>["columns"] = [
        {
            title: "规则名称",
            dataIndex: "ruleName",
            key: "ruleName",
            width: 200,
        },
        {
            title: "规则类型",
            dataIndex: "ruleType",
            key: "ruleType",
            width: 100,
            render: (text) => <Tag>{text}</Tag>,
        },
        {
            title: "检查状态",
            dataIndex: "status",
            key: "status",
            width: 100,
            render: (status) => {
                const colorMap = {pass: 'success', fail: 'error', warning: 'warning'};
                const textMap = {pass: '通过', fail: '失败', warning: '警告'};
                return <Badge status={colorMap[status]} text={textMap[status]}/>;
            },
        },
        {
            title: "检查时间",
            dataIndex: "checkTime",
            key: "checkTime",
            width: 180,
        },
        {
            title: "检查详情",
            dataIndex: "detail",
            key: "detail",
            ellipsis: true,
        },
    ];

    return (
        <Card size="small" loading={loading}>
            <div style={{marginBottom: 16}}>
                <Space>
                    <Badge status="success" text={`通过 ${qualityData.filter(q => q.status === 'pass').length}`}/>
                    <Badge status="warning" text={`警告 ${qualityData.filter(q => q.status === 'warning').length}`}/>
                    <Badge status="error" text={`失败 ${qualityData.filter(q => q.status === 'fail').length}`}/>
                </Space>
            </div>
            <Table
                dataSource={qualityData}
                columns={columns}
                rowKey="id"
                size="small"
                pagination={false}
                scroll={{x: 'max-content'}}
                bordered
            />
        </Card>
    );
};

export default DataQuality;
