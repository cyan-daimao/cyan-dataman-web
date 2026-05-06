import React, {useEffect, useState} from "react";
import {Alert, Card, Col, Pagination, Space, Spin, Table, TableProps, Tag, Typography} from "antd";
import {ReloadOutlined} from "@ant-design/icons";
import {ColumnVO} from "../../../../api/MetadataTableAPI";
import {previewTableData} from "../../../../api/DataSourceApi";

const {Text} = Typography;

// 预览数据类型
interface PreviewData {
    columns: string[];
    rows: Record<string, any>[];
    total: number;
}

interface DataPreviewProps {
    tableId: string;
    columns: ColumnVO[] | undefined;
    catalog?: string;
    schema?: string;
    tableName?: string;
}

const DataPreview: React.FC<DataPreviewProps> = ({columns, catalog, schema, tableName}) => {
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState<PreviewData>({
        columns: [],
        rows: [],
        total: 0,
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    useEffect(() => {
        if (catalog && schema && tableName) {
            loadPreviewData().then();
        }
    }, [catalog, schema, tableName, currentPage, pageSize]);

    // 加载预览数据（目前使用模拟数据）
    const loadPreviewData = async () => {
        setLoading(true);
        if (catalog && schema && tableName){
            previewTableData(catalog, schema, tableName).then(data => {
                setPreviewData({
                    columns: columns?.map(col => col.name) || [],
                    rows: data || [],  // data 是 map 数组，如 [{"id":"1","name":"张三"}]
                    total: data?.length || 0,
                });
            }).finally(()=>{
                setLoading( false)
            })
        }
    };

    // 生成表格列配置
    const tableColumns: TableProps<Record<string, any>>["columns"] = columns?.map((col) => ({
        title: (
            <Space direction="vertical" size={0}>
                <Col>
                    <Text strong>{col.name}</Text>
                    <Tag color="blue" style={{fontSize: 10}}>{col.type}</Tag>
                </Col>
            </Space>
        ),
        dataIndex: col.name,
        key: col.name,
        width: 150,
        ellipsis: true,
        render: (value: any) => {
            if (value === null || value === undefined) {
                return <Text type="secondary">NULL</Text>;
            }
            return <Text>{String(value)}</Text>;
        },
    })) || [];

    // 刷新数据
    const handleRefresh = () => {
        loadPreviewData();
    };

    // 分页变化
    const handlePageChange = (page: number, size: number) => {
        setCurrentPage(page);
        setPageSize(size);
    };

    return (
        <Card
            size="small"
            title={
                <Space>
                    <span>数据预览</span>
                    <Tag color="blue">共 {previewData.total} 条</Tag>
                </Space>
            }
            extra={
                <Space>
                    <Tag icon={<ReloadOutlined />} style={{cursor: 'pointer'}} onClick={handleRefresh}>
                        刷新
                    </Tag>
                </Space>
            }
        >
            <Alert
                message="数据预览最多展示前 100 条记录，仅供参考"
                type="info"
                showIcon
                style={{marginBottom: 16}}
            />

            <Spin spinning={loading}>
                <Table
                    dataSource={previewData.rows}
                    columns={tableColumns}
                    rowKey={(_, index) => `row_${index}`}
                    size="small"
                    pagination={false}
                    scroll={{x: 'max-content', y: 500}}
                    bordered
                />

                <div style={{marginTop: 16, textAlign: 'right'}}>
                    <Pagination
                        current={currentPage}
                        pageSize={pageSize}
                        total={previewData.total}
                        showSizeChanger
                        showQuickJumper
                        showTotal={(total) => `共 ${total} 条`}
                        onChange={handlePageChange}
                        pageSizeOptions={['10', '20', '50', '100']}
                    />
                </div>
            </Spin>
        </Card>
    );
};

export default DataPreview;
