import {Card, Empty, Spin, Table, TableProps, Tabs, Tag, Typography, Space, Button} from 'antd';
import {useState} from 'react';
import {
    ClockCircleOutlined,
    DownloadOutlined,
    FileSearchOutlined,
    InfoCircleOutlined,
    TableOutlined
} from '@ant-design/icons';
import {QueryResult, ExecutionPlan} from '../types';
import React from "react";

const {Text} = Typography;

interface ResultPanelProps {
    loading: boolean;
    result: QueryResult | null;
    executionPlan: ExecutionPlan[] | null;
    error: string | null;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
}

const ResultPanel: React.FC<ResultPanelProps> = ({
    loading,
    result,
    executionPlan,
    error,
    activeTab = 'result',
    onTabChange
}) => {
    // DEBUG: 验证组件是否被加载
    React.useEffect(() => {
        console.log('[ResultPanel] v3 loaded, result:', !!result);
    }, []);
    // 分页状态
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 20
    });

    // 处理分页变化
    const handleTableChange = (newPagination: any) => {
        setPagination({
            current: newPagination.current,
            pageSize: newPagination.pageSize
        });
    };

    // 下载 CSV
    const downloadCSV = () => {
        if (!result) return;

        const headers = result.columns;
        const rows = result.rows.map(row => {
            return result.columns.map(col => {
                const value = row[col];
                if (value === null || value === undefined) {
                    return '';
                }
                const str = String(value);
                if (str.includes(',') || str.includes('\n') || str.includes('"')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            }).join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `query_result_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // 为每行数据添加唯一索引，用于 rowKey
    const rowsWithIndex = result?.rows.map((row, idx) => ({...row, _idx: idx})) || [];
    const columnsWithKey = result?.columns.map((col) => ({
        title: col,
        dataIndex: col,
        key: col,
        width: 150,
        render: (value: any) => {
            if (value === null || value === undefined) {
                return <Text type="secondary">NULL</Text>;
            }
            return (
                <Text ellipsis style={{ maxWidth: 150 }}>
                    {String(value)}
                </Text>
            );
        },
    })) || [];

    // 执行计划表格列配置
    const planColumns: TableProps<ExecutionPlan>["columns"] = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 60,
        },
        {
            title: '操作',
            dataIndex: 'operation',
            key: 'operation',
            width: 200,
            render: (text) => <Tag color="blue">{text}</Tag>
        },
        {
            title: '预估行数',
            dataIndex: 'rowCount',
            key: 'rowCount',
            width: 100,
            render: (num) => num?.toLocaleString()
        },
        {
            title: '代价',
            dataIndex: 'cost',
            key: 'cost',
            width: 100,
            render: (num) => <Tag color="orange">{num}</Tag>
        },
        {
            title: '详情',
            dataIndex: 'details',
            key: 'details',
            ellipsis: true,
        }
    ];

    const tabItems = [
        {
            key: 'result',
            label: (
                <span>
                    <TableOutlined/>
                    查询结果
                    {result && (
                        <Tag color="blue" style={{marginLeft: 8}}>
                            {result.rows.length} 行
                        </Tag>
                    )}
                </span>
            ),
            children: (
                <div style={{height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
                    <Spin spinning={loading} style={{flex: 1, minHeight: 0}}>
                        {error ? (
                            <div style={{padding: 24, textAlign: 'center'}}>
                                <Text type="danger">{error}</Text>
                            </div>
                        ) : result ? (
                            <div style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
                                <div style={{
                                    padding: '8px 12px',
                                    background: '#f5f5f5',
                                    marginBottom: 8,
                                    borderRadius: 4,
                                    flexShrink: 0,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    border: '3px solid red'  // DEBUG: 验证样式是否生效
                                }}>
                                    <Space split={<span>|</span>}>
                                        <span><ClockCircleOutlined/> 耗时：{result.duration}ms</span>
                                        <span>返回行数：{result.rows.length}</span>
                                        <span>总行数：{result.total}</span>
                                    </Space>
                                    <Button type="primary" size="small" icon={<DownloadOutlined/>} onClick={downloadCSV}>下载CSV [V3]</Button>
                                </div>
                                <div style={{flex: 1, minHeight: 0, overflow: 'hidden'}}>
                                    <Table
                                        dataSource={rowsWithIndex}
                                        columns={columnsWithKey}
                                        rowKey="_idx"
                                        size="small"
                                        pagination={{
                                            current: pagination.current,
                                            pageSize: pagination.pageSize,
                                            total: result.rows.length,
                                            showSizeChanger: true,
                                            showQuickJumper: true,
                                            showTotal: (total) => `共 ${total} 条`,
                                            pageSizeOptions: ['10', '20', '50', '100']
                                        }}
                                        onChange={handleTableChange}
                                        scroll={{x: columnsWithKey.length * 150, y: 300}}
                                        bordered
                                    />
                                </div>
                            </div>
                        ) : (
                            <Empty description="暂无查询结果，请先执行 SQL" image={Empty.PRESENTED_IMAGE_SIMPLE}/>
                        )}
                    </Spin>
                </div>
            )
        },
        {
            key: 'plan',
            label: (
                <span>
                    <FileSearchOutlined/>
                    执行计划
                </span>
            ),
            children: (
                <div style={{height: '100%', overflow: 'auto'}}>
                    <Spin spinning={loading}>
                        {executionPlan ? (
                            <Table
                                dataSource={executionPlan}
                                columns={planColumns}
                                rowKey="id"
                                size="small"
                                pagination={false}
                                scroll={{x: 'max-content'}}
                                bordered
                            />
                        ) : (
                            <Empty description="暂无执行计划" image={Empty.PRESENTED_IMAGE_SIMPLE}/>
                        )}
                    </Spin>
                </div>
            )
        },
        {
            key: 'info',
            label: (
                <span>
                    <InfoCircleOutlined/>
                    查询信息
                </span>
            ),
            children: (
                <div style={{height: '100%', overflow: 'auto'}}>
                    <Card size="small">
                        {result ? (
                            <div>
                                <p><strong>查询时间:</strong> {new Date().toLocaleString()}</p>
                                <p><strong>执行耗时:</strong> {result.duration}ms</p>
                                <p><strong>返回行数:</strong> {result.rows.length}</p>
                                <p><strong>数据大小:</strong> {(JSON.stringify(result.rows).length / 1024).toFixed(2)} KB</p>
                            </div>
                        ) : (
                            <Empty description="暂无查询信息" image={Empty.PRESENTED_IMAGE_SIMPLE}/>
                        )}
                    </Card>
                </div>
            )
        }
    ];

    return (
        <div style={{height: '100%', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '5px solid red'}}>
            <Tabs
                activeKey={activeTab}
                onChange={onTabChange}
                items={tabItems}
                size="small"
                style={{flex: 1, minHeight: 0}}
                tabBarStyle={{padding: '0 12px', flexShrink: 0}}
            />
        </div>
    );
};

export default ResultPanel;
