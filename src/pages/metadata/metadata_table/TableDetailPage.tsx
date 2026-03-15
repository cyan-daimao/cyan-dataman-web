import React, {useEffect, useState} from "react";
import {
    Button,
    Divider,
    Empty,
    Space,
    Spin,
    Tabs,
    Tag,
    Typography
} from "antd";
import {
    ArrowLeftOutlined,
    ClockCircleOutlined,
    DatabaseOutlined,
    EyeOutlined,
    FileTextOutlined,
    SafetyOutlined,
    TableOutlined
} from "@ant-design/icons";
import {useLocation, useNavigate} from "react-router-dom";
import {getMetadataTableById, MetadataTableDTO} from "../../../api/MetadataTableAPI.ts";

// 导入子组件
import BasicInfo from "./detail/BasicInfo.tsx";
import FieldInfo from "./detail/FieldInfo.tsx";
import DataLineage from "./detail/DataLineage.tsx";
import DataQuality from "./detail/DataQuality.tsx";
import ScheduleInfo from "./detail/ScheduleInfo.tsx";
import DataPreview from "./detail/DataPreview.tsx";

const {Title} = Typography;

// 密级颜色映射
const SECRET_LEVEL_COLOR: Record<string, string> = {
    'L1': 'green',
    'L2': 'blue',
    'L3': 'orange',
    'L4': 'red',
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

const TableDetailPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const tableId = (location.state as { tableId?: string })?.tableId;

    const [loading, setLoading] = useState(true);
    const [tableData, setTableData] = useState<MetadataTableDTO | null>(null);

    // 加载表详情
    useEffect(() => {
        if (tableId) {
            loadTableDetail();
        }
    }, [tableId]);

    const loadTableDetail = async () => {
        try {
            setLoading(true);
            const data = await getMetadataTableById(tableId!);
            setTableData(data);
        } catch (error) {
            console.error("加载表详情失败:", error);
        } finally {
            setLoading(false);
        }
    };

    // 返回列表
    const handleBack = () => {
        navigate('/metadata/metadata_table');
    };

    // Tab 配置
    const tabItems = [
        {
            key: 'basic',
            label: (
                <span>
                    <FileTextOutlined/>
                    基本信息
                </span>
            ),
            children: <BasicInfo data={tableData}/>,
        },
        {
            key: 'fields',
            label: (
                <span>
                    <DatabaseOutlined/>
                    字段信息
                </span>
            ),
            children: <FieldInfo columns={tableData?.table?.columns}/>,
        },
        {
            key: 'preview',
            label: (
                <span>
                    <EyeOutlined/>
                    数据预览
                </span>
            ),
            children: (
                <DataPreview
                    tableId={tableId || ''}
                    columns={tableData?.table?.columns}
                    catalog={tableData?.table?.catalog}
                    schema={tableData?.table?.schema}
                    tableName={tableData?.name}
                />
            ),
        },
        {
            key: 'lineage',
            label: (
                <span>
                    <TableOutlined/>
                    数据血缘
                </span>
            ),
            children: (
                <DataLineage
                    tableName={tableData?.name || ''}
                    tableComment={tableData?.comment || ''}
                />
            ),
        },
        {
            key: 'quality',
            label: (
                <span>
                    <SafetyOutlined/>
                    数据质量
                </span>
            ),
            children: <DataQuality tableId={tableId || ''}/>,
        },
        {
            key: 'schedule',
            label: (
                <span>
                    <ClockCircleOutlined/>
                    调度信息
                </span>
            ),
            children: <ScheduleInfo tableId={tableId || ''}/>,
        },
    ];

    return (
        <Spin spinning={loading}>
            <div style={{padding: 0}}>
                {/* 页面头部 */}
                <div style={{
                    marginBottom: 16,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <Space>
                        <Button icon={<ArrowLeftOutlined/>} onClick={handleBack}>
                            返回
                        </Button>
                        <Divider type="vertical" style={{height: 24}}/>
                        <DatabaseOutlined style={{fontSize: 20, color: '#1890ff'}}/>
                        <Title level={4} style={{margin: 0}}>
                            {tableData?.name || '表详情'}
                        </Title>
                        {tableData && (
                            <Space style={{marginLeft: 16}}>
                                <Tag color={LAYER_COLOR[tableData.layerCode] || 'default'}>
                                    {tableData.layerCode}
                                </Tag>
                                <Tag color={SECRET_LEVEL_COLOR[tableData.secretLevel || 'L1']}>
                                    {tableData.secretLevel || 'L1'}
                                </Tag>
                            </Space>
                        )}
                    </Space>
                </div>

                {/* 内容区域 */}
                {tableData ? (
                    <Tabs
                        defaultActiveKey="basic"
                        items={tabItems}
                        tabBarStyle={{
                            marginBottom: 16,
                            borderBottom: '1px solid #f0f0f0',
                            paddingLeft: 8,
                        }}
                    />
                ) : (
                    <Empty description="未找到表信息" style={{padding: 100}}/>
                )}
            </div>
        </Spin>
    );
};

export default TableDetailPage;