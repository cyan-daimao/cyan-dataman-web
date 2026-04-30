import React, { useEffect, useState } from 'react';
import { Button, Input, Table, Space, Popconfirm, message, Card, Modal } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { chartApi, ChartDTO, ChartDataDTO } from '@/api/DatabiApi';

const ChartList: React.FC = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<ChartDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchName, setSearchName] = useState('');
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    const [resultModal, setResultModal] = useState<{ open: boolean; title: string; data?: ChartDataDTO }>({
        open: false,
        title: '',
    });

    const fetchData = async (current = 1, pageSize = 10, name?: string) => {
        setLoading(true);
        try {
            const res = await chartApi.page({ current, size: pageSize, name });
            if (res.code === 200) {
                setData(res.data.data);
                setPagination({
                    current: res.data.current,
                    pageSize: res.data.size,
                    total: res.data.total,
                });
            } else {
                message.error(res.message || '获取图表列表失败');
            }
        } catch (e) {
            message.error('获取图表列表失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(1, 10);
    }, []);

    const handleSearch = () => {
        fetchData(1, pagination.pageSize, searchName || undefined);
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await chartApi.delete(id);
            if (res.code === 200) {
                message.success('删除成功');
                fetchData(pagination.current, pagination.pageSize, searchName || undefined);
            } else {
                message.error(res.message || '删除失败');
            }
        } catch (e) {
            message.error('删除失败');
        }
    };

    const handleExecute = async (record: ChartDTO) => {
        try {
            const res = await chartApi.execute(record.id);
            if (res.code === 200) {
                setResultModal({ open: true, title: `执行结果 - ${record.name}`, data: res.data });
            } else {
                message.error(res.message || '执行失败');
            }
        } catch (e) {
            message.error('执行失败');
        }
    };

    const columns = [
        {
            title: '名称',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: '图表类型',
            dataIndex: 'chartType',
            key: 'chartType',
        },
        {
            title: '关联数据集',
            dataIndex: 'datasetId',
            key: 'datasetId',
        },
        {
            title: '创建时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
        },
        {
            title: '操作',
            key: 'action',
            render: (_: unknown, record: ChartDTO) => (
                <Space>
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => navigate(`/bi/chart/analyzer/${record.datasetId}/${record.id}`)}
                    >
                        编辑
                    </Button>
                    <Button
                        type="link"
                        icon={<PlayCircleOutlined />}
                        onClick={() => handleExecute(record)}
                    >
                        执行
                    </Button>
                    <Popconfirm
                        title="确认删除"
                        description="删除后无法恢复，是否确认？"
                        onConfirm={() => handleDelete(record.id)}
                        okText="确认"
                        cancelText="取消"
                    >
                        <Button type="link" danger icon={<DeleteOutlined />}>
                            删除
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const resultColumns = resultModal.data?.columns.map((col) => ({
        title: col,
        dataIndex: col,
        key: col,
    })) || [];

    return (
        <Card
            title="图表管理"
            extra={
                <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/bi/chart/analyzer')}>
                    新建图表
                </Button>
            }
        >
            <Space style={{ marginBottom: 16 }}>
                <Input
                    placeholder="按名称搜索"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    onPressEnter={handleSearch}
                    style={{ width: 240 }}
                    prefix={<SearchOutlined />}
                />
                <Button type="primary" onClick={handleSearch}>
                    搜索
                </Button>
            </Space>
            <Table
                rowKey="id"
                loading={loading}
                dataSource={data}
                columns={columns}
                pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                    showSizeChanger: true,
                    showTotal: (total) => `共 ${total} 条`,
                    onChange: (page, pageSize) => {
                        fetchData(page, pageSize || 10, searchName || undefined);
                    },
                }}
            />
            <Modal
                open={resultModal.open}
                title={resultModal.title}
                width={900}
                onCancel={() => setResultModal({ open: false, title: '' })}
                footer={null}
            >
                {resultModal.data?.status === 'FAILED' ? (
                    <div style={{ color: '#cf1322', padding: 16, background: '#fff1f0', borderRadius: 4 }}>
                        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>执行失败</div>
                        <div>{resultModal.data.errorMessage || '未知错误'}</div>
                    </div>
                ) : (
                    <Table
                        size="small"
                        scroll={{ x: 'max-content' }}
                        dataSource={resultModal.data?.rows || []}
                        columns={resultColumns}
                        pagination={{ pageSize: 20 }}
                    />
                )}
            </Modal>
        </Card>
    );
};

export default ChartList;
