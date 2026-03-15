import React, {useEffect, useState} from "react";
import {Alert, Card, Pagination, Space, Spin, Table, TableProps, Tag, Typography} from "antd";
import {ReloadOutlined} from "@ant-design/icons";
import {ColumnVO} from "../../../../api/MetadataTableAPI.ts";

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
            loadPreviewData();
        }
    }, [catalog, schema, tableName, currentPage, pageSize]);

    // 加载预览数据（目前使用模拟数据）
    const loadPreviewData = async () => {
        setLoading(true);
        // TODO: 替换为真实 API 调用
        setTimeout(() => {
            // 根据字段生成模拟数据
            const mockColumns = columns?.map(col => col.name) || [];
            const mockRows = [];
            
            for (let i = 0; i < pageSize; i++) {
                const row: Record<string, any> = {};
                columns?.forEach((col, index) => {
                    switch (col.type) {
                        case 'INT':
                        case 'BIGINT':
                            row[col.name] = Math.floor(Math.random() * 10000);
                            break;
                        case 'FLOAT':
                        case 'DOUBLE':
                            row[col.name] = (Math.random() * 1000).toFixed(2);
                            break;
                        case 'BOOLEAN':
                            row[col.name] = Math.random() > 0.5 ? 'true' : 'false';
                            break;
                        case 'DATE':
                            row[col.name] = '2026-03-15';
                            break;
                        case 'TIMESTAMP':
                            row[col.name] = '2026-03-15 08:00:00';
                            break;
                        default:
                            row[col.name] = `sample_${index}_${i}`;
                    }
                });
                mockRows.push(row);
            }

            setPreviewData({
                columns: mockColumns,
                rows: mockRows,
                total: 1000, // 模拟总数
            });
            setLoading(false);
        }, 500);
    };

    // 生成表格列配置
    const tableColumns: TableProps<Record<string, any>>["columns"] = columns?.map((col) => ({
        title: (
            <Space direction="vertical" size={0}>
                <Text strong>{col.name}</Text>
                <Tag color="blue" style={{fontSize: 10}}>{col.type}</Tag>
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
                    scroll={{x: 'max-content', y: 400}}
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
