import {Card, Empty, Spin, Table, TableProps, Tabs, Tag, Typography, Space} from 'antd';
import {useState} from 'react';
import {
    ClockCircleOutlined,
    FileSearchOutlined,
    InfoCircleOutlined,
    TableOutlined,
    BugOutlined,
    LogoutOutlined,
    BranchesOutlined,
    CheckCircleOutlined,
    SafetyOutlined,
} from '@ant-design/icons';
import {QueryResult, ExecutionPlan} from '@/pages/sql-editor/types';
import React from "react";

const {Text} = Typography;

interface DataWorkResultPanelProps {
    loading: boolean;
    result: QueryResult | null;
    executionPlan: ExecutionPlan[] | null;
    error: string | null;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
    /** 执行日志 */
    logs?: string[];
}

const DataWorkResultPanel: React.FC<DataWorkResultPanelProps> = ({
    loading,
    result,
    executionPlan,
    error,
    activeTab = 'result',
    onTabChange,
    logs = [],
}) => {
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

    const handleTableChange = (newPagination: any) => {
        setPagination({ current: newPagination.current, pageSize: newPagination.pageSize });
    };

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

    const planColumns: TableProps<ExecutionPlan>["columns"] = [
        { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
        { title: '操作', dataIndex: 'operation', key: 'operation', width: 200, render: (text) => <Tag color="blue">{text}</Tag> },
        { title: '预估行数', dataIndex: 'rowCount', key: 'rowCount', width: 100, render: (num) => num?.toLocaleString() },
        { title: '代价', dataIndex: 'cost', key: 'cost', width: 100, render: (num) => <Tag color="orange">{num}</Tag> },
        { title: '详情', dataIndex: 'details', key: 'details', ellipsis: true },
    ];

    const tabItems = [
        {
            key: 'result',
            label: (
                <span>
                    <TableOutlined/> 查询结果
                    {result && <Tag color="blue" style={{marginLeft: 8}}>{result.rows.length} 行</Tag>}
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
                                <div style={{padding: '8px 12px', background: '#f5f5f5', marginBottom: 8, borderRadius: 4, flexShrink: 0}}>
                                    <Space split={<span>|</span>}>
                                        <span><ClockCircleOutlined/> 耗时：{result.duration}ms</span>
                                        <span>返回行数：{result.rows.length}</span>
                                        <span>总行数：{result.total}</span>
                                    </Space>
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
            label: <span><FileSearchOutlined/> 执行计划</span>,
            children: (
                <div style={{height: '100%', overflow: 'auto'}}>
                    <Spin spinning={loading}>
                        {executionPlan ? (
                            <Table dataSource={executionPlan} columns={planColumns} rowKey="id" size="small" pagination={false} scroll={{x: 'max-content'}} bordered/>
                        ) : (
                            <Empty description="暂无执行计划" image={Empty.PRESENTED_IMAGE_SIMPLE}/>
                        )}
                    </Spin>
                </div>
            )
        },
        {
            key: 'info',
            label: <span><InfoCircleOutlined/> 查询信息</span>,
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
        },
        {
            key: 'logs',
            label: <span><LogoutOutlined/> 输出</span>,
            children: (
                <div style={{height: '100%', overflow: 'auto', background: '#1e1e1e', padding: 12, fontFamily: 'monospace', fontSize: 12}}>
                    {logs.length > 0 ? (
                        logs.map((log, idx) => (
                            <div key={idx} style={{color: '#d4d4d4', lineHeight: '1.6'}}>{log}</div>
                        ))
                    ) : (
                        <Empty description="暂无输出日志" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{color: '#999'}} />
                    )}
                </div>
            )
        },
        {
            key: 'issues',
            label: <span><BugOutlined/> 问题</span>,
            children: (
                <div style={{height: '100%', overflow: 'auto', padding: 24}}>
                    {error ? (
                        <div>
                            <Tag color="error">错误</Tag>
                            <Text type="danger" style={{marginLeft: 8}}>{error}</Text>
                        </div>
                    ) : (
                        <Empty description="暂无问题" image={Empty.PRESENTED_IMAGE_SIMPLE}/>
                    )}
                </div>
            )
        },
        {
            key: 'lineage',
            label: <span><BranchesOutlined/> 血缘</span>,
            children: (
                <div style={{height: '100%', overflow: 'auto', padding: 24, textAlign: 'center'}}>
                    <BranchesOutlined style={{fontSize: 48, color: '#d9d9d9', marginBottom: 16}} />
                    <p style={{color: '#999'}}>数据血缘分析功能开发中</p>
                    <p style={{fontSize: 12, color: '#bbb'}}>将自动解析 SQL 中的表依赖关系</p>
                </div>
            )
        },
        {
            key: 'check',
            label: <span><SafetyOutlined/> 深度检查</span>,
            children: (
                <div style={{height: '100%', overflow: 'auto', padding: 24, textAlign: 'center'}}>
                    <SafetyOutlined style={{fontSize: 48, color: '#d9d9d9', marginBottom: 16}} />
                    <p style={{color: '#999'}}>SQL 深度检查功能开发中</p>
                    <p style={{fontSize: 12, color: '#bbb'}}>将支持语法检查、性能优化建议、合规检测</p>
                </div>
            )
        },
        {
            key: 'publish',
            label: <span><CheckCircleOutlined/> 发布</span>,
            children: (
                <div style={{height: '100%', overflow: 'auto', padding: 24, textAlign: 'center'}}>
                    <CheckCircleOutlined style={{fontSize: 48, color: '#d9d9d9', marginBottom: 16}} />
                    <p style={{color: '#999'}}>发布记录</p>
                    <p style={{fontSize: 12, color: '#bbb'}}>任务发布历史与回滚记录</p>
                </div>
            )
        },
    ];

    return (
        <div className="sql-editor-sidebar" style={{height: '100%', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
            <Tabs
                activeKey={activeTab}
                onChange={onTabChange}
                items={tabItems}
                size="small"
                style={{flex: 1, minHeight: 0}}
                tabBarStyle={{padding: '0 12px', flexShrink: 0, marginBottom: 0}}
            />
        </div>
    );
};

export default DataWorkResultPanel;
