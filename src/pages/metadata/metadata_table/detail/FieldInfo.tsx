import React from "react";
import {Card, Table, TableProps, Tag, Typography} from "antd";
import {ColumnVO} from "../../../../api/MetadataTableAPI.ts";

const {Text} = Typography;

// 密级颜色映射
const SECRET_LEVEL_COLOR: Record<string, string> = {
    'L1': 'green',
    'L2': 'blue',
    'L3': 'orange',
    'L4': 'red',
};

interface FieldInfoProps {
    columns: ColumnVO[] | undefined;
}

const FieldInfo: React.FC<FieldInfoProps> = ({columns}) => {
    // 字段列表列配置
    const columnTableColumns: TableProps<ColumnVO>["columns"] = [
        {
            title: "序号",
            key: "index",
            width: 60,
            render: (_, __, index) => index + 1,
        },
        {
            title: "字段名",
            dataIndex: "name",
            key: "name",
            width: 200,
            render: (text) => <Text strong>{text}</Text>,
        },
        {
            title: "字段类型",
            dataIndex: "type",
            key: "type",
            width: 120,
            render: (text) => <Tag color="blue">{text}</Tag>,
        },
        {
            title: "是否可空",
            dataIndex: "nullable",
            key: "nullable",
            width: 100,
            render: (nullable) => (
                <Tag color={nullable ? 'green' : 'red'}>
                    {nullable ? '是' : '否'}
                </Tag>
            ),
        },
        {
            title: "密级",
            dataIndex: "secretLevel",
            key: "secretLevel",
            width: 100,
            render: (level) => (
                <Tag color={SECRET_LEVEL_COLOR[level] || 'default'}>
                    {level || 'L1'}
                </Tag>
            ),
        },
        {
            title: "字段注释",
            dataIndex: "comment",
            key: "comment",
            ellipsis: true,
        },
    ];

    return (
        <Card size="small">
            <Table
                dataSource={columns || []}
                columns={columnTableColumns}
                rowKey="name"
                size="small"
                pagination={false}
                scroll={{x: 'max-content'}}
                bordered
            />
        </Card>
    );
};

export default FieldInfo;
