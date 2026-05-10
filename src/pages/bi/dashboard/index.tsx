import React, { useEffect, useState } from 'react';
import { Button, Input, Table, Space, Popconfirm, message, Card } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, DashboardDTO } from '@/api/DatabiApi';

const DashboardList: React.FC = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<DashboardDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchName, setSearchName] = useState('');
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

    const fetchData = async (current = 1, pageSize = 10, name?: string) => {
        setLoading(true);
        try {
            const res = await dashboardApi.page({ current, size: pageSize, name });
            if (res.code === 200) {
                setData(res.data.data);
                setPagination({
                    current: res.data.current,
                    pageSize: res.data.size,
                    total: res.data.total,
                });
            } else {
                message.error(res.message || '获取看板列表失败');
            }
        } catch {
            message.error('获取看板列表失败');
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
            const res = await dashboardApi.delete(id);
            if (res.code === 200) {
                message.success('删除成功');
                fetchData(pagination.current, pagination.pageSize, searchName || undefined);
            } else {
                message.error(res.message || '删除失败');
            }
        } catch {
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
            title: '描述',
            dataIndex: 'description',
            key: 'description',
            render: (v?: string) => v || '-',
        },
        {
            title: '图表数量',
            key: 'chartCount',
            render: (_: unknown, record: DashboardDTO) => record.chartRefs?.length || 0,
        },
        {
            title: '创建时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
        },
        {
            title: '操作',
            key: 'action',
            render: (_: unknown, record: DashboardDTO) => (
                <Space>
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => navigate(`/bi/dashboard/edit/${record.id}`)}
                    >
                        编辑
                    </Button>
                    <Button
                        type="link"
                        icon={<EyeOutlined />}
                        onClick={() => navigate(`/bi/dashboard/view/${record.id}`)}
                    >
                        查看
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
            title="看板管理"
            extra={
                <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/bi/dashboard/edit')}>
                    新建看板
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

export default DashboardList;
