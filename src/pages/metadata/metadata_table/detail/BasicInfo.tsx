import React from "react";
import {Badge, Card, Descriptions, Space, Tag, Typography} from "antd";
import {
    ClockCircleOutlined,
    FieldTimeOutlined,
    SafetyOutlined,
    UserOutlined
} from "@ant-design/icons";
import {MetadataTableDTO} from "../../../../api/MetadataTableAPI";

const {Text} = Typography;

// 密级颜色映射
const SECRET_LEVEL_COLOR: Record<string, string> = {
    'L1': 'green',
    'L2': 'blue',
    'L3': 'orange',
    'L4': 'red',
};

// 密级文本映射
const SECRET_LEVEL_TEXT: Record<string, string> = {
    'L1': 'L1 - 公开',
    'L2': 'L2 - 内部',
    'L3': 'L3 - 机密',
    'L4': 'L4 - 绝密',
};

// 数据分层颜色映射
const LAYER_COLOR: Record<string, string> = {
    'ODS': 'cyan',
    'DWD': 'blue',
    'DWM': 'purple',
    'DWS': 'magenta',
    'ADS': 'gold',
    'DIM': 'green',
};

interface BasicInfoProps {
    data: MetadataTableDTO | null;
}

const BasicInfo: React.FC<BasicInfoProps> = ({data}) => {
    if (!data) {
        return null;
    }

    return (
        <Card size="small">
            <Descriptions column={3} bordered size="small">
                <Descriptions.Item label="表名称" span={2}>
                    <Text strong copyable>{data.name}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="数据分层">
                    <Tag color={LAYER_COLOR[data.layerCode] || 'default'}>
                        {data.layerCode}
                    </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="所属主题">
                    <Tag color="blue">{data.subjectCode}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="负责人">
                    <Space>
                        <UserOutlined/>
                        {data.owner || '-'}
                    </Space>
                </Descriptions.Item>
                <Descriptions.Item label="密级">
                    <Tag color={SECRET_LEVEL_COLOR[data.secretLevel || 'L1']}>
                        {SECRET_LEVEL_TEXT[data.secretLevel || 'L1']}
                    </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="上线状态">
                    <Badge
                        status={data.onlineStatus === 'ONLINE' ? 'success' : 'default'}
                        text={data.onlineStatus === 'ONLINE' ? '已上线' : '已下线'}
                    />
                </Descriptions.Item>
                <Descriptions.Item label="热度">
                    <Tag color="orange">{data.heatLevel || '-'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="访问次数">
                    {data.accessCount || '0'} 次
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">
                    <Space>
                        <ClockCircleOutlined/>
                        {data.createdAt || '-'}
                    </Space>
                </Descriptions.Item>
                <Descriptions.Item label="更新时间">
                    <Space>
                        <FieldTimeOutlined/>
                        {data.updatedAt || '-'}
                    </Space>
                </Descriptions.Item>
                <Descriptions.Item label="最后访问时间">
                    {data.lastAccessTime || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="表描述" span={3}>
                    {data.comment || '暂无描述'}
                </Descriptions.Item>
                {data.table && (
                    <>
                        <Descriptions.Item label="Catalog">
                            <Text code>{data.table.catalog}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Schema">
                            <Text code>{data.table.schema}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="字段数量">
                            <SafetyOutlined style={{marginRight: 4}}/>
                            {data.table.columns?.length || 0} 个
                        </Descriptions.Item>
                    </>
                )}
            </Descriptions>
        </Card>
    );
};

export default BasicInfo;
