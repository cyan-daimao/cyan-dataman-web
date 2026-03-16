import {Card, Empty, Spin, Table, TableProps, Tabs, Tag, Typography, Space} from 'antd';
import {
    ClockCircleOutlined,
    FileSearchOutlined,
    InfoCircleOutlined,
    TableOutlined
} from '@ant-design/icons';
import {QueryResult, ExecutionPlan} from '../types';

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
    // 结果表格列配置
    const resultColumns: TableProps<Record<string, any>>["columns"] = result?.columns.map((col) => ({
        title: col,
        dataIndex: col,
        key: col,
        width: 150,
        ellipsis: true,
        render: (value: any) => {
            if (value === null || value === undefined) {
                return <Text type="secondary">NULL</Text>;
            }
            return <Text>{String(value)}</Text>;
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
                <Spin spinning={loading}>
                    {error ? (
                        <div style={{padding: 24, textAlign: 'center'}}>
                            <Text type="danger">{error}</Text>
                        </div>
                    ) : result ? (
                        <div>
                            <div style={{
                                padding: '8px 12px',
                                background: '#f5f5f5',
                                marginBottom: 8,
                                borderRadius: 4
                            }}>
                                <Space split={<span>|</span>}>
                                    <span><ClockCircleOutlined/> 耗时: {result.duration}ms</span>
                                    <span>返回行数: {result.rows.length}</span>
                                    <span>总行数: {result.total}</span>
                                </Space>
                            </div>
                            <Table
                                dataSource={result.rows}
                                columns={resultColumns}
                                rowKey={(_, index) => `row_${index}`}
                                size="small"
                                pagination={{
                                    pageSize: 20,
                                    showSizeChanger: true,
                                    showTotal: (total) => `共 ${total} 条`
                                }}
                                scroll={{x: 'max-content', y: 300}}
                                bordered
                            />
                        </div>
                    ) : (
                        <Empty description="暂无查询结果，请先执行SQL" image={Empty.PRESENTED_IMAGE_SIMPLE}/>
                    )}
                </Spin>
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
            )
        }
    ];

    return (
        <div style={{height: '100%', background: '#fff'}}>
            <Tabs
                activeKey={activeTab}
                onChange={onTabChange}
                items={tabItems}
                size="small"
                style={{padding: '0 12px'}}
                tabBarStyle={{marginBottom: 0, paddingLeft: 8}}
            />
        </div>
    );
};

export default ResultPanel;
