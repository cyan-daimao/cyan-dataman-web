import {Card, Empty, Pagination, Spin, Table, TableProps, Tabs, Tag, Typography, Button} from 'antd';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
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
    const [pagination, setPagination] = useState({current: 1, pageSize: 20});
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

    const resizingCol = useRef<string | null>(null);
    const startX = useRef(0);
    const startWidth = useRef(150);
    const columnWidthsRef = useRef(columnWidths);
    columnWidthsRef.current = columnWidths;

    const handleResizeStart = useCallback((e: React.MouseEvent, col: string) => {
        e.preventDefault();
        e.stopPropagation();
        resizingCol.current = col;
        startX.current = e.clientX;
        startWidth.current = columnWidthsRef.current[col] || 150;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!resizingCol.current) return;
            const delta = e.clientX - startX.current;
            const newWidth = Math.max(60, startWidth.current + delta);
            setColumnWidths(prev => ({
                ...prev,
                [resizingCol.current!]: newWidth
            }));
        };
        const handleMouseUp = () => {
            resizingCol.current = null;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const handleTableChange = (newPagination: {current: number; pageSize: number}) => {
        setPagination({
            current: newPagination.current,
            pageSize: newPagination.pageSize
        });
    };

    const downloadCSV = () => {
        if (!result) return;
        const headers = result.columns;
        const rows = result.rows.map(row => {
            return result.columns.map(col => {
                const value = row[col];
                if (value === null || value === undefined) return '';
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

    const rowsWithIndex = result?.rows.map((row, idx) => ({...row, _idx: idx})) || [];

    const columnsWithKey = useMemo(() => {
        return result?.columns.map((col) => {
            const width = columnWidths[col] || 150;
            return {
                title: (
                    <div style={{ position: 'relative', width: '100%', paddingRight: 6, userSelect: 'none' }}>
                        <Text ellipsis style={{ maxWidth: width - 16, fontWeight: 600, fontSize: 13 }}>{col}</Text>
                        <div
                            onMouseDown={(e) => handleResizeStart(e, col)}
                            style={{
                                position: 'absolute',
                                right: 0,
                                top: 0,
                                bottom: 0,
                                width: 5,
                                cursor: 'col-resize',
                                background: 'transparent',
                                zIndex: 1,
                                transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#1890ff'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        />
                    </div>
                ),
                dataIndex: col,
                key: col,
                width,
                render: (value: unknown) => {
                    if (value === null || value === undefined) {
                        return <Text type="secondary" style={{fontSize: 13}}>NULL</Text>;
                    }
                    return <Text ellipsis style={{ maxWidth: width - 16, fontSize: 13 }} title={String(value)}>{String(value)}</Text>;
                },
            };
        }) || [];
    }, [result?.columns, columnWidths, handleResizeStart]);

    const totalColumnWidth = useMemo(() => {
        return result?.columns.reduce((sum, col) => sum + (columnWidths[col] || 150), 0) || 0;
    }, [result?.columns, columnWidths]);

    const planColumns: TableProps<ExecutionPlan>["columns"] = [
        { title: 'ID', dataIndex: 'id', key: 'id', width: 60, align: 'center' as const },
        { title: '操作', dataIndex: 'operation', key: 'operation', width: 200, render: (text) => <Tag color="blue">{text}</Tag> },
        { title: '预估行数', dataIndex: 'rowCount', key: 'rowCount', width: 100, align: 'right' as const, render: (num) => num?.toLocaleString() },
        { title: '代价', dataIndex: 'cost', key: 'cost', width: 100, align: 'right' as const, render: (num) => <Tag color="orange">{num}</Tag> },
        { title: '详情', dataIndex: 'details', key: 'details', ellipsis: true },
    ];

    return (
        <Tabs
            activeKey={activeTab}
            onChange={onTabChange}
            size="small"
            style={{height: '100%'}}
            items={[
                {
                    key: 'result',
                    label: (
                        <span style={{fontSize: 13}}>
                            <TableOutlined style={{marginRight: 4}}/>
                            查询结果
                            {result && <Tag color="blue" style={{marginLeft: 8, fontSize: 11}}>{result.rows.length} 行</Tag>}
                        </span>
                    ),
                    children: (
                        <>
                            {loading ? (
                                <div style={{padding: 48, textAlign: 'center'}}>
                                    <Spin size="large" tip="正在执行查询..." />
                                </div>
                            ) : error ? (
                                <div style={{padding: 32}}>
                                    <Card size="small" style={{borderColor: '#ffccc7', background: '#fff2f0'}}>
                                        <Text type="danger" style={{fontSize: 14}}>{error}</Text>
                                    </Card>
                                </div>
                            ) : result ? (
                                <>
                                    {/* 摘要栏 */}
                                    <div style={{
                                        padding: '10px 16px',
                                        background: '#f8fafc',
                                        borderBottom: '1px solid #e2e8f0',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}>
                                        <span style={{fontSize: 13, color: '#475569'}}>
                                            <ClockCircleOutlined style={{marginRight: 6, color: '#3b82f6'}}/>
                                            耗时 <strong style={{color: '#1e293b'}}>{result.duration}ms</strong>
                                            <span style={{margin: '0 12px', color: '#cbd5e1'}}>|</span>
                                            返回 <strong style={{color: '#1e293b'}}>{result.rows.length}</strong> 行
                                            <span style={{margin: '0 12px', color: '#cbd5e1'}}>|</span>
                                            总计 <strong style={{color: '#1e293b'}}>{result.total}</strong> 行
                                        </span>
                                        <Button type="primary" ghost size="small" icon={<DownloadOutlined/>} onClick={downloadCSV}>
                                            下载 CSV
                                        </Button>
                                    </div>
                                    {/* 表格 */}
                                    <Table
                                        dataSource={rowsWithIndex.slice((pagination.current - 1) * pagination.pageSize, pagination.current * pagination.pageSize)}
                                        columns={columnsWithKey}
                                        rowKey="_idx"
                                        size="small"
                                        pagination={false}
                                        scroll={{x: totalColumnWidth, y: 'calc(100vh - 580px)'}}
                                        bordered
                                    />
                                    {/* 分页器 */}
                                    <div style={{
                                        padding: '10px 16px',
                                        background: '#f8fafc',
                                        borderTop: '1px solid #e2e8f0',
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                        alignItems: 'center',
                                    }}>
                                        <Pagination
                                            size="small"
                                            current={pagination.current}
                                            pageSize={pagination.pageSize}
                                            total={result.rows.length}
                                            showSizeChanger
                                            showQuickJumper
                                            showTotal={(total, range) => `第 ${range[0]}-${range[1]} 条 / 共 ${total} 条`}
                                            pageSizeOptions={[10, 20, 50, 100]}
                                            onChange={(page, pageSize) => handleTableChange({current: page, pageSize})}
                                        />
                                    </div>
                                </>
                            ) : (
                                <Empty
                                    description="暂无查询结果，请先执行 SQL"
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    style={{marginTop: 48}}
                                />
                            )}
                        </>
                    )
                },
                {
                    key: 'plan',
                    label: <span style={{fontSize: 13}}><FileSearchOutlined style={{marginRight: 4}}/> 执行计划</span>,
                    children: (
                        <>
                            {loading ? (
                                <div style={{padding: 32, textAlign: 'center'}}><Spin tip="生成执行计划中..." /></div>
                            ) : executionPlan ? (
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
                                <Empty description="暂无执行计划" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{marginTop: 48}}/>
                            )}
                        </>
                    )
                },
                {
                    key: 'info',
                    label: <span style={{fontSize: 13}}><InfoCircleOutlined style={{marginRight: 4}}/> 查询信息</span>,
                    children: (
                        <Card size="small" style={{margin: 16, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)'}}>
                            {result ? (
                                <div style={{lineHeight: 2, fontSize: 13}}>
                                    <p><strong style={{color: '#475569', display: 'inline-block', width: 80}}>查询时间</strong>{new Date().toLocaleString()}</p>
                                    <p><strong style={{color: '#475569', display: 'inline-block', width: 80}}>执行耗时</strong><Tag color="blue">{result.duration}ms</Tag></p>
                                    <p><strong style={{color: '#475569', display: 'inline-block', width: 80}}>返回行数</strong><Tag color="green">{result.rows.length}</Tag></p>
                                    <p><strong style={{color: '#475569', display: 'inline-block', width: 80}}>数据大小</strong>{(JSON.stringify(result.rows).length / 1024).toFixed(2)} KB</p>
                                </div>
                            ) : (
                                <Empty description="暂无查询信息" image={Empty.PRESENTED_IMAGE_SIMPLE}/>
                            )}
                        </Card>
                    )
                },
            ]}
        />
    );
};

export default ResultPanel;
