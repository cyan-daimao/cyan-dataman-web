import React, { useEffect, useState } from 'react';
import { Button, Input, Table, Space, Popconfirm, message, Card } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, BarChartOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { datasetApi, DatasetDTO } from '@/api/DatabiApi';

const DatasetList: React.FC = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<DatasetDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchName, setSearchName] = useState('');
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

    const fetchData = async (current = 1, pageSize = 10, name?: string) => {
        setLoading(true);
        try {
            const res = await datasetApi.page({ current, size: pageSize, name });
            if (res.code === 200) {
                setData(res.data.data);
                setPagination({
                    current: res.data.current,
                    pageSize: res.data.size,
                    total: res.data.total,
                });
            } else {
                message.error(res.message || '获取数据集列表失败');
            }
        } catch (e) {
            message.error('获取数据集列表失败');
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
            const res = await datasetApi.delete(id);
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

    const columns = [
        {
            title: '名称',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: '来源类型',
            dataIndex: 'sourceType',
            key: 'sourceType',
            render: (v: string) => (v === 'TABLE' ? '数据表' : '自定义SQL'),
        },
        {
            title: '来源表/SQL摘要',
            dataIndex: 'sourceTable',
            key: 'source',
            render: (_: unknown, record: DatasetDTO) => {
                if (record.sourceType === 'TABLE') {
                    return record.sourceTable || '-';
                }
                const sql = record.sourceSql || '';
                return sql.length > 60 ? sql.substring(0, 60) + '...' : sql || '-';
            },
        },
        {
            title: '创建时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
        },
        {
            title: '操作',
            key: 'action',
            render: (_: unknown, record: DatasetDTO) => (
                <Space>
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => navigate(`/bi/dataset/edit/${record.id}`)}
                    >
                        编辑
                    </Button>
                    <Button
                        type="link"
                        icon={<BarChartOutlined />}
                        onClick={() => navigate(`/bi/chart/analyzer/${record.id}`)}
                    >
                        分析
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

    return (
        <Card
            title="数据集管理"
            extra={
                <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/bi/dataset/create')}>
                    新建数据集
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
        </Card>
    );
};

export default DatasetList;
