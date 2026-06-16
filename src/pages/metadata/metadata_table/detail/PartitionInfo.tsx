import React from "react";
import {Empty, Table, Tag, Typography} from "antd";
import type {TableProps} from "antd";
import type {PartitionVO} from "@/api/MetadataTableAPI.ts";

const {Text} = Typography;

const PARTITION_TYPE_LABEL: Record<string, string> = {
    IDENTITY: "原始字段",
    DAY: "按天",
    HOUR: "按小时",
    MONTH: "按月",
    YEAR: "按年",
    BUCKET: "分桶",
    TRUNCATE: "截断",
};

const PARTITION_TYPE_COLOR: Record<string, string> = {
    IDENTITY: "blue",
    DAY: "green",
    HOUR: "cyan",
    MONTH: "purple",
    YEAR: "magenta",
    BUCKET: "orange",
    TRUNCATE: "gold",
};

interface PartitionInfoProps {
    partitions?: PartitionVO[];
}

const PartitionInfo: React.FC<PartitionInfoProps> = ({partitions}) => {
    const data = (partitions || []).map((partition, index) => ({
        ...partition,
        sortOrder: partition.sortOrder ?? index,
    }));

    const columns: TableProps<PartitionVO>["columns"] = [
        {
            title: "顺序",
            dataIndex: "sortOrder",
            key: "sortOrder",
            width: 90,
            render: (value) => <Text>{Number(value ?? 0) + 1}</Text>,
        },
        {
            title: "分区字段",
            dataIndex: "columnName",
            key: "columnName",
            width: 220,
            render: (value) => <Text code>{value}</Text>,
        },
        {
            title: "分区类型",
            dataIndex: "partitionType",
            key: "partitionType",
            width: 180,
            render: (value) => (
                <Tag color={PARTITION_TYPE_COLOR[value] || "default"}>
                    {PARTITION_TYPE_LABEL[value] || value}
                </Tag>
            ),
        },
        {
            title: "参数",
            dataIndex: "param",
            key: "param",
            width: 160,
            render: (value, record) => {
                if (!["BUCKET", "TRUNCATE"].includes(record.partitionType)) {
                    return <Text type="secondary">无需参数</Text>;
                }
                return <Text>{value || "-"}</Text>;
            },
        },
        {
            title: "说明",
            key: "description",
            render: (_, record) => {
                if (record.partitionType === "BUCKET") {
                    return <Text type="secondary">按字段哈希分桶，参数为桶数</Text>;
                }
                if (record.partitionType === "TRUNCATE") {
                    return <Text type="secondary">按字段值截断，参数为截断长度</Text>;
                }
                if (["DAY", "HOUR", "MONTH", "YEAR"].includes(record.partitionType)) {
                    return <Text type="secondary">按日期/时间派生分区</Text>;
                }
                return <Text type="secondary">按字段原值分区</Text>;
            },
        },
    ];

    if (data.length === 0) {
        return <Empty description="未设置分区" style={{padding: 60}}/>;
    }

    return (
        <Table
            rowKey={(record) => `${record.partitionType}-${record.columnName}-${record.sortOrder}`}
            size="small"
            columns={columns}
            dataSource={data}
            pagination={false}
            scroll={{x: "max-content"}}
            bordered
        />
    );
};

export default PartitionInfo;
