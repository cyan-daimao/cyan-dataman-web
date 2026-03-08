import React, {useEffect, useState} from 'react';
import {
    Button,
    Card,
    Dropdown,
    Empty,
    Input,
    Layout,
    Menu,
    message,
    Select,
    Space,
    Spin,
    Table,
    Tag,
    Typography
} from 'antd';
import {
    DatabaseOutlined,
    DeleteOutlined,
    DownloadOutlined,
    EditOutlined,
    EyeOutlined,
    FilterOutlined,
    LineChartOutlined,
    MoreOutlined,
    SearchOutlined,
    TableOutlined,
    TagOutlined,
    UserOutlined
} from '@ant-design/icons';

// 类型定义
interface MetadataItem {
    id: string;
    name: string;
    code: string;
    type: 'table' | 'view' | 'field' | 'api' | 'metric';
    database: string;
    owner: string;
    createTime: string;
    updateTime: string;
    status: 'online' | 'offline' | 'draft';
    tags: string[];
    description: string;
}

interface MetadataTypeOption {
    value: string;
    label: string;
    icon: React.ReactNode;
}

const {Text} = Typography;
const {Option} = Select;
const {Search} = Input;

const MetadataPlatform: React.FC = () => {
    // 状态管理
    const [metadataList, setMetadataList] = useState<MetadataItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchValue, setSearchValue] = useState<string>('');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');

    // 元数据类型选项
    const metadataTypes: MetadataTypeOption[] = [
        {value: 'table', label: '数据表', icon: <TableOutlined/>},
        {value: 'view', label: '视图', icon: <TableOutlined/>},
        {value: 'field', label: '字段', icon: <TagOutlined/>},
        {value: 'api', label: '接口', icon: <LineChartOutlined/>},
        {value: 'metric', label: '指标', icon: <DatabaseOutlined/>},
    ];

    // 模拟获取元数据列表
    useEffect(() => {
        // 模拟接口请求
        const fetchMetadata = async () => {
            setLoading(true);
            try {
                // 模拟延迟
                await new Promise(resolve => setTimeout(resolve, 800));

                // 模拟数据
                const mockData: MetadataItem[] = [
                    {
                        id: '1',
                        name: '用户基础信息表',
                        code: 'dim_user_base',
                        type: 'table',
                        database: 'user_center',
                        owner: 'zhangsan',
                        createTime: '2026-01-10 14:30:00',
                        updateTime: '2026-02-15 09:20:00',
                        status: 'online',
                        tags: ['用户数据', '基础信息', '核心表'],
                        description: '存储用户的基础信息，包括用户名、手机号、邮箱等核心字段'
                    },
                    {
                        id: '2',
                        name: '订单支付金额指标',
                        code: 'metric_order_pay_amt',
                        type: 'metric',
                        database: 'data_mart',
                        owner: 'lisi',
                        createTime: '2026-01-15 10:00:00',
                        updateTime: '2026-02-20 16:40:00',
                        status: 'online',
                        tags: ['订单数据', '支付指标', '实时计算'],
                        description: '统计各时段订单支付金额，按天/小时聚合'
                    },
                    {
                        id: '3',
                        name: '商品详情接口',
                        code: 'api_product_detail',
                        type: 'api',
                        database: 'product_center',
                        owner: 'wangwu',
                        createTime: '2026-01-20 09:15:00',
                        updateTime: '2026-02-22 11:30:00',
                        status: 'draft',
                        tags: ['商品数据', '接口', '详情'],
                        description: '提供商品详情信息查询的API接口'
                    },
                    {
                        id: '4',
                        name: '用户订单视图',
                        code: 'view_user_order',
                        type: 'view',
                        database: 'order_center',
                        owner: 'zhaoliu',
                        createTime: '2026-01-25 15:40:00',
                        updateTime: '2026-03-01 14:10:00',
                        status: 'offline',
                        tags: ['用户订单', '视图', '关联查询'],
                        description: '关联用户表和订单表的视图，简化查询逻辑'
                    },
                    {
                        id: '5',
                        name: '订单金额字段',
                        code: 'field_order_amount',
                        type: 'field',
                        database: 'order_center',
                        owner: 'qianqi',
                        createTime: '2026-02-01 11:20:00',
                        updateTime: '2026-03-05 10:00:00',
                        status: 'online',
                        tags: ['订单字段', '金额', '数值型'],
                        description: '订单表中的金额字段，记录订单总金额'
                    },
                ];

                setMetadataList(mockData);
            } catch (error) {
                message.error('获取元数据列表失败，请重试');
                console.error('Fetch metadata error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMetadata();
    }, []);

    // 处理搜索和筛选
    const getFilteredList = () => {
        return metadataList.filter(item => {
            // 搜索筛选
            const matchSearch = searchValue
                ? item.name.includes(searchValue) || item.code.includes(searchValue) || item.description.includes(searchValue)
                : true;

            // 类型筛选
            const matchType = typeFilter ? item.type === typeFilter : true;

            // 状态筛选
            const matchStatus = statusFilter ? item.status === statusFilter : true;

            return matchSearch && matchType && matchStatus;
        });
    };

    // 状态标签渲染
    const renderStatusTag = (status: string) => {
        const statusMap = {
            online: {color: 'success', text: '已上线'},
            offline: {color: 'error', text: '已下线'},
            draft: {color: 'warning', text: '草稿'},
        };
        const {color, text} = statusMap[status as keyof typeof statusMap];
        return <Tag color={color}>{text}</Tag>;
    };

    // 类型标签渲染
    const renderTypeTag = (type: string) => {
        const typeMap = {
            table: {color: 'blue', text: '数据表'},
            view: {color: 'purple', text: '视图'},
            field: {color: 'cyan', text: '字段'},
            api: {color: 'orange', text: '接口'},
            metric: {color: 'green', text: '指标'},
        };
        const {color, text} = typeMap[type as keyof typeof typeMap];
        return <Tag color={color}>{text}</Tag>;
    };

    // 操作菜单
    const renderOperationMenu = (record: MetadataItem) => {
        const menu = (
            <Menu>
                <Menu.Item
                    key="view"
                    icon={<EyeOutlined/>}
                    onClick={() => handleView(record)}
                >
                    查看详情
                </Menu.Item>
                <Menu.Item
                    key="edit"
                    icon={<EditOutlined/>}
                    onClick={() => handleEdit(record)}
                >
                    编辑
                </Menu.Item>
                <Menu.Item
                    key="download"
                    icon={<DownloadOutlined/>}
                    onClick={() => handleDownload(record)}
                >
                    导出文档
                </Menu.Item>
                <Menu.Item
                    key="delete"
                    icon={<DeleteOutlined/>}
                    danger
                    onClick={() => handleDelete(record)}
                >
                    删除
                </Menu.Item>
            </Menu>
        );

        return (
            <Dropdown menu={menu} trigger={['click']}>
                <Button size="small" icon={<MoreOutlined/>}/>
            </Dropdown>
        );
    };

    // 操作处理函数
    const handleView = (record: MetadataItem) => {
        message.info(`查看元数据：${record.name}`);
        // 可在这里打开详情弹窗或跳转到详情页
    };

    const handleEdit = (record: MetadataItem) => {
        message.info(`编辑元数据：${record.name}`);
        // 可在这里打开编辑弹窗或跳转到编辑页
    };

    const handleDownload = (record: MetadataItem) => {
        message.success(`导出元数据文档：${record.name}`);
        // 可在这里实现导出逻辑
    };

    const handleDelete = (record: MetadataItem) => {
        // 实际项目中需增加确认弹窗
        setMetadataList(metadataList.filter(item => item.id !== record.id));
        message.success(`删除元数据：${record.name} 成功`);
    };

    const handleAddMetadata = () => {
        message.info('打开新增元数据表单');
        // 可在这里打开新增弹窗
    };

    // 表格列定义
    const columns = [
        {
            title: '元数据名称',
            dataIndex: 'name',
            key: 'name',
            width: 180,
            render: (name: string, record: MetadataItem) => (
                <Space>
                    {metadataTypes.find(item => item.value === record.type)?.icon}
                    <Text strong>{name}</Text>
                </Space>
            ),
        },
        {
            title: '编码',
            dataIndex: 'code',
            key: 'code',
            width: 200,
        },
        {
            title: '类型',
            dataIndex: 'type',
            key: 'type',
            width: 100,
            render: (type: string) => renderTypeTag(type),
        },
        {
            title: '所属数据库',
            dataIndex: 'database',
            key: 'database',
            width: 150,
        },
        {
            title: '负责人',
            dataIndex: 'owner',
            key: 'owner',
            width: 100,
            render: (owner: string) => (
                <Space>
                    <UserOutlined/>
                    <Text>{owner}</Text>
                </Space>
            ),
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: string) => renderStatusTag(status),
        },
        {
            title: '标签',
            dataIndex: 'tags',
            key: 'tags',
            render: (tags: string[]) => (
                <>
                    {tags.map(tag => (
                        <Tag key={tag} size="small">{tag}</Tag>
                    ))}
                </>
            ),
        },
        {
            title: '更新时间',
            dataIndex: 'updateTime',
            key: 'updateTime',
            width: 180,
        },
        {
            title: '操作',
            key: 'action',
            width: 100,
            render: (_: any, record: MetadataItem) => (
                <Space size="small">
                    <Button
                        size="small"
                        icon={<EyeOutlined/>}
                        onClick={() => handleView(record)}
                    />
                    {renderOperationMenu(record)}
                </Space>
            ),
        },
    ];

    return (
        <Layout>

            {/* 搜索筛选卡片 */}
            <Card style={{marginBottom: 20}}>
                <Space size="middle" wrap>
                    <Search
                        placeholder="请输入元数据名称/编码/描述"
                        allowClear
                        enterButton={<SearchOutlined/>}
                        style={{width: 300}}
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                    />
                    <Select
                        placeholder="元数据类型"
                        allowClear
                        style={{width: 120}}
                        value={typeFilter}
                        onChange={setTypeFilter}
                        prefix={<FilterOutlined/>}
                    >
                        {metadataTypes.map(type => (
                            <Option key={type.value} value={type.value}>{type.label}</Option>
                        ))}
                    </Select>
                    <Select
                        placeholder="状态"
                        allowClear
                        style={{width: 120}}
                        value={statusFilter}
                        onChange={setStatusFilter}
                        prefix={<FilterOutlined/>}
                    >
                        <Option value="online">已上线</Option>
                        <Option value="offline">已下线</Option>
                        <Option value="draft">草稿</Option>
                    </Select>
                    <Button icon={<FilterOutlined/>} onClick={() => {
                        setSearchValue('');
                        setTypeFilter('');
                        setStatusFilter('');
                    }}>
                        重置筛选
                    </Button>
                </Space>
            </Card>

            {/* 元数据列表 */}
            <Card>
                <Spin spinning={loading}>
                    {getFilteredList().length > 0 ? (
                        <Table
                            columns={columns}
                            dataSource={getFilteredList()}
                            rowKey="id"
                            pagination={{pageSize: 10, showSizeChanger: true}}
                            scroll={{x: 'max-content'}}
                            bordered
                        />
                    ) : (
                        <Empty description="暂无元数据信息" style={{padding: '40px 0'}}/>
                    )}
                </Spin>
            </Card>
        </Layout>
    );
};

export default MetadataPlatform;