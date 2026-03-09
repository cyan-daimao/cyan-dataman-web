import React, { useState, useEffect } from 'react';
import {
    Layout, Tree, Table, Input, Button, Space, Tag, Dropdown,
    Menu, Modal, Form, Select, message, Typography, Divider,
    Card, Spin, Empty
} from 'antd';
import {
    DatabaseOutlined, SearchOutlined, PlusOutlined, EditOutlined,
    DeleteOutlined, FilterOutlined, DownloadOutlined, SettingOutlined,
    FolderOutlined, TableOutlined, ReloadOutlined
} from '@ant-design/icons';
import type { TreeProps, TableProps, ColumnsType } from 'antd';
import type { MenuProps } from 'antd/es/menu';
import {treeSubjects} from "../../../api/MetadataSubjectAPI.ts";
import ImportTable from "./ImportTableButton.tsx";

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;
const { confirm } = Modal;

// 定义类型接口
interface SubjectNode {
    key: string;
    title: string;
    icon?: React.ReactNode;
    children?: SubjectNode[];
}

interface TableMeta {
    id: string;
    tableName: string;
    tableComment: string;
    theme: string;
    dbType: string;
    createTime: string;
    updateTime: string;
    owner: string;
    status: 'online' | 'offline' | 'draft';
}

interface TableFormData {
    tableName: string;
    tableComment: string;
    theme: string;
    dbType: string;
    owner: string;
}

const MetaDataManagement: React.FC = () => {
    // 状态管理
    const [subjectTreeData,setSubjectTreeData] = useState<SubjectNode[]>([]);
    const [collapsed, setCollapsed] = useState(false); // 侧边栏折叠状态
    const [selectedThemeKey, setSelectedThemeKey] = useState<string>('all'); // 选中的主题key
    const [tableData, setTableData] = useState<TableMeta[]>([]); // 表数据
    const [loading, setLoading] = useState(true); // 加载状态
    const [searchValue, setSearchValue] = useState(''); // 搜索值
    const [modalVisible, setModalVisible] = useState(false); // 表单弹窗状态
    const [modalType, setModalType] = useState<'add' | 'edit'>('add'); // 弹窗类型
    const [currentRecord, setCurrentRecord] = useState<TableMeta | null>(null); // 当前操作的记录
    const [form] = Form.useForm(); // 表单实例

    useEffect(()=>{
      fetchTreeSubjects().then()
    },[])

    const fetchTreeSubjects = async () => {
        const data = await treeSubjects();
        const treeData: SubjectNode[] = data.map(item=>({
            key: item.id,
            title: item.subjectName,
            icon: <DatabaseOutlined />,
            children: item.children?.map(child=>({
                key: child.subjectCode,
                title: child.subjectName,
                icon: <DatabaseOutlined />,
            }))
        }))
        treeData.unshift({
            key: 'all',
            title: '全部主题',
            icon: <TableOutlined />,
        })
        setSubjectTreeData(treeData)
    }
    // 主题树数据
    const themeTreeData: SubjectNode[] = [
        {
            key: 'all',
            title: '全部主题',
            icon: <DatabaseOutlined />,
        },
        {
            key: 'ods',
            title: 'ODS层',
            icon: <FolderOutlined />,
            children: [
                { key: 'ods_user', title: '用户数据', icon: <TableOutlined /> },
                { key: 'ods_order', title: '订单数据', icon: <TableOutlined /> },
                { key: 'ods_product', title: '商品数据', icon: <TableOutlined /> },
            ],
        },
        {
            key: 'dwd',
            title: 'DWD层',
            icon: <FolderOutlined />,
            children: [
                { key: 'dwd_user_profile', title: '用户画像', icon: <TableOutlined /> },
                { key: 'dwd_order_detail', title: '订单明细', icon: <TableOutlined /> },
            ],
        },
        {
            key: 'dws',
            title: 'DWS层',
            icon: <FolderOutlined />,
            children: [
                { key: 'dws_user_behavior', title: '用户行为', icon: <TableOutlined /> },
                { key: 'dws_sales_summary', title: '销售汇总', icon: <TableOutlined /> },
            ],
        },
        {
            key: 'ads',
            title: 'ADS层',
            icon: <FolderOutlined />,
            children: [
                { key: 'ads_sales_analysis', title: '销售分析', icon: <TableOutlined /> },
                { key: 'ads_user_analysis', title: '用户分析', icon: <TableOutlined /> },
            ],
        },
    ];

    // 表列定义
    const columns: ColumnsType<TableMeta> = [
        {
            title: '表名称',
            dataIndex: 'tableName',
            key: 'tableName',
            width: 200,
            ellipsis: true,
            render: (text) => <Text strong>{text}</Text>,
        },
        {
            title: '表备注',
            dataIndex: 'tableComment',
            key: 'tableComment',
            width: 250,
            ellipsis: true,
        },
        {
            title: '所属主题',
            dataIndex: 'theme',
            key: 'theme',
            width: 150,
            render: (text) => <Tag color="blue">{text}</Tag>,
        },
        {
            title: '数据库类型',
            dataIndex: 'dbType',
            key: 'dbType',
            width: 120,
            render: (text) => <Tag color="green">{text}</Tag>,
        },
        {
            title: '负责人',
            dataIndex: 'owner',
            key: 'owner',
            width: 100,
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status) => {
                let color = '';
                let text = '';
                switch (status) {
                    case 'online':
                        color = 'success';
                        text = '已上线';
                        break;
                    case 'offline':
                        color = 'error';
                        text = '已下线';
                        break;
                    case 'draft':
                        color = 'warning';
                        text = '草稿';
                        break;
                    default:
                        color = 'default';
                        text = '未知';
                }
                return <Tag color={color}>{text}</Tag>;
            },
        },
        {
            title: '创建时间',
            dataIndex: 'createTime',
            key: 'createTime',
            width: 180,
        },
        {
            title: '操作',
            key: 'action',
            width: 180,
            render: (_: any, record: TableMeta) => (
                <Space size="small">
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                        size="small"
                    >
                        编辑
                    </Button>
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(record)}
                        size="small"
                    >
                        删除
                    </Button>
                    <Dropdown
                        overlay={
                            <Menu>
                                <Menu.Item key="1">查看详情</Menu.Item>
                                <Menu.Item key="2">同步数据</Menu.Item>
                                <Menu.Item key="3">导出DDL</Menu.Item>
                            </Menu>
                        }
                    >
                        <Button type="text" size="small">更多</Button>
                    </Dropdown>
                </Space>
            ),
        },
    ];

    // 模拟获取表数据
    const fetchTableData = async (themeKey: string = 'all') => {
        setLoading(true);
        // 模拟接口请求
        await new Promise(resolve => setTimeout(resolve, 800));

        // 模拟数据
        const mockData: TableMeta[] = [
            {
                id: '1',
                tableName: 'ods_user_info',
                tableComment: '用户基础信息表',
                theme: themeKey === 'all' ? 'ODS层/用户数据' : getThemeName(themeKey),
                dbType: 'Hive',
                createTime: '2026-01-10 10:20:30',
                updateTime: '2026-02-15 14:30:20',
                owner: '张三',
                status: 'online',
            },
            {
                id: '2',
                tableName: 'ods_order_info',
                tableComment: '订单基础信息表',
                theme: themeKey === 'all' ? 'ODS层/订单数据' : getThemeName(themeKey),
                dbType: 'Hive',
                createTime: '2026-01-12 09:15:20',
                updateTime: '2026-02-20 11:45:10',
                owner: '李四',
                status: 'online',
            },
            {
                id: '3',
                tableName: 'dwd_user_profile',
                tableComment: '用户画像宽表',
                theme: themeKey === 'all' ? 'DWD层/用户画像' : getThemeName(themeKey),
                dbType: 'Hive',
                createTime: '2026-01-15 14:20:10',
                updateTime: '2026-02-25 09:10:30',
                owner: '王五',
                status: 'online',
            },
            {
                id: '4',
                tableName: 'dws_sales_summary',
                tableComment: '销售汇总表',
                theme: themeKey === 'all' ? 'DWS层/销售汇总' : getThemeName(themeKey),
                dbType: 'ClickHouse',
                createTime: '2026-01-20 16:30:40',
                updateTime: '2026-03-01 15:20:10',
                owner: '赵六',
                status: 'draft',
            },
            {
                id: '5',
                tableName: 'ads_sales_analysis',
                tableComment: '销售分析表',
                theme: themeKey === 'all' ? 'ADS层/销售分析' : getThemeName(themeKey),
                dbType: 'MySQL',
                createTime: '2026-01-25 11:10:20',
                updateTime: '2026-03-05 10:15:40',
                owner: '钱七',
                status: 'offline',
            },
        ];

        // 根据主题筛选数据
        const filteredData = themeKey === 'all'
            ? mockData
            : mockData.filter(item => item.theme.includes(getThemeName(themeKey)));

        // 根据搜索值筛选
        const finalData = searchValue
            ? filteredData.filter(item =>
                item.tableName.includes(searchValue) ||
                item.tableComment.includes(searchValue)
            )
            : filteredData;

        setTableData(finalData);
        setLoading(false);
    };

    // 根据主题key获取主题名称
    const getThemeName = (key: string): string => {
        const findNode = (nodes: SubjectNode[], targetKey: string): SubjectNode | undefined => {
            for (const node of nodes) {
                if (node.key === targetKey) return node;
                if (node.children) {
                    const found = findNode(node.children, targetKey);
                    if (found) return found;
                }
            }
            return undefined;
        };
        const node = findNode(themeTreeData, key);
        return node?.title || '';
    };

    // 树节点点击事件
    const onTreeSelect: TreeProps['onSelect'] = (selectedKeys) => {
        const key = selectedKeys[0] || 'all';
        console.log(123,key)
        setSelectedThemeKey(key);
        fetchTableData(key);
    };

    // 搜索表
    const handleSearch = () => {
        fetchTableData(selectedThemeKey);
    };

    // 重置搜索
    const handleReset = () => {
        setSearchValue('');
        fetchTableData(selectedThemeKey);
    };

    // 新增表
    const handleAdd = () => {
        setModalType('add');
        setCurrentRecord(null);
        form.resetFields();
        setModalVisible(true);
    };

    // 编辑表
    const handleEdit = (record: TableMeta) => {
        setModalType('edit');
        setCurrentRecord(record);
        form.setFieldsValue({
            tableName: record.tableName,
            tableComment: record.tableComment,
            theme: record.theme,
            dbType: record.dbType,
            owner: record.owner,
        });
        setModalVisible(true);
    };

    // 删除表
    const handleDelete = (record: TableMeta) => {
        confirm({
            title: '确认删除',
            content: `是否确定删除表【${record.tableName}】？`,
            okText: '确认',
            cancelText: '取消',
            onOk: () => {
                setTableData(tableData.filter(item => item.id !== record.id));
                message.success('删除成功');
            },
        });
    };

    // 表单提交
    const handleFormSubmit = async () => {
        try {
            const values = await form.validateFields();
            if (modalType === 'add') {
                // 模拟新增
                const newRecord: TableMeta = {
                    id: `${Date.now()}`,
                    tableName: values.tableName,
                    tableComment: values.tableComment,
                    theme: values.theme,
                    dbType: values.dbType,
                    owner: values.owner,
                    createTime: new Date().toLocaleString(),
                    updateTime: new Date().toLocaleString(),
                    status: 'draft',
                };
                setTableData([...tableData, newRecord]);
                message.success('新增表成功');
            } else {
                // 模拟编辑
                if (currentRecord) {
                    const updatedData = tableData.map(item =>
                        item.id === currentRecord.id
                            ? { ...item, ...values, updateTime: new Date().toLocaleString() }
                            : item
                    );
                    setTableData(updatedData);
                    message.success('编辑表成功');
                }
            }
            setModalVisible(false);
        } catch (error) {
            console.error('表单验证失败:', error);
        }
    };

    // 初始化加载数据
    useEffect(() => {
        fetchTableData();
    }, []);

    // 工具栏菜单
    const toolMenuItems: MenuProps['items'] = [
        { key: 'export', label: '导出数据', icon: <DownloadOutlined /> },
        { key: 'refresh', label: '刷新数据', icon: <ReloadOutlined /> },
        { key: 'setting', label: '列表设置', icon: <SettingOutlined /> },
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            {/* 顶部Header */}
            <Header style={{ background: '#fff', padding: '0 20px', boxShadow: '0 1px 4px rgba(0,21,41,.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                    <Title level={4} style={{ margin: 0 }}>
                        <DatabaseOutlined style={{ marginRight: 8 }} />
                        元数据表管理平台
                    </Title>
                    <Space>
                        <ImportTable/>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                            新增表
                        </Button>
                        <Dropdown menu={{ items: toolMenuItems }}>
                            <Button icon={<SettingOutlined />}>更多操作</Button>
                        </Dropdown>
                    </Space>
                </div>
            </Header>

            <Layout>
                {/* 左侧主题树 */}
                <Sider
                    collapsible
                    collapsed={collapsed}
                    onCollapse={setCollapsed}
                    style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}
                >
                    <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
                        <Input
                            placeholder="搜索主题/表"
                            size="small"
                            prefix={<SearchOutlined />}
                            style={{ marginBottom: 0 }}
                        />
                    </div>
                    <Tree
                        treeData={subjectTreeData}
                        defaultSelectedKeys={['all']}
                        onSelect={onTreeSelect}
                        showIcon
                        style={{ padding: '16px' }}
                        switcherIcon={<FilterOutlined />}
                    />
                </Sider>

                {/* 右侧表管理内容 */}
                <Content style={{ margin: '0px', background: '#fff', borderRadius: '1px' }}>
                    <Card style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <Title level={5} style={{ margin: 0, display: 'inline-block' }}>
                                    {selectedThemeKey === 'all' ? '全部表' : getThemeName(selectedThemeKey)}
                                </Title>
                                <Text type="secondary" style={{ marginLeft: 8 }}>
                                    共 {tableData.length} 张表
                                </Text>
                            </div>
                            <Space>
                                <Input
                                    placeholder="搜索表名称/备注"
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    onPressEnter={handleSearch}
                                    style={{ width: 300 }}
                                    prefix={<SearchOutlined />}
                                />
                                <Button onClick={handleSearch} icon={<SearchOutlined />}>搜索</Button>
                                <Button onClick={handleReset}>重置</Button>
                            </Space>
                        </div>
                    </Card>

                    {/* 表列表 */}
                    <Spin spinning={loading}>
                        {tableData.length > 0 ? (
                            <Table
                                columns={columns}
                                dataSource={tableData}
                                rowKey="id"
                                pagination={{
                                    pageSize: 10,
                                    showSizeChanger: true,
                                    showTotal: (total) => `共 ${total} 条记录`
                                }}
                                scroll={{ x: 'max-content' }}
                                bordered
                            />
                        ) : (
                            <Empty
                                description="暂无表数据"
                                style={{ padding: '40px 0' }}
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                        )}
                    </Spin>
                </Content>
            </Layout>

            {/* 新增/编辑表弹窗 */}
            <Modal
                title={modalType === 'add' ? '新增元数据表' : '编辑元数据表'}
                open={modalVisible}
                onOk={handleFormSubmit}
                onCancel={() => setModalVisible(false)}
                destroyOnClose
                maskClosable={false}
                width={600}
            >
                <Form
                    form={form}
                    layout="vertical"
                    validateMessages={{
                        required: '${label}为必填项',
                    }}
                >
                    <Form.Item
                        name="tableName"
                        label="表名称"
                        rules={[{ required: true }]}
                    >
                        <Input placeholder="请输入表名称（如：ods_user_info）" />
                    </Form.Item>
                    <Form.Item
                        name="tableComment"
                        label="表备注"
                        rules={[{ required: true }]}
                    >
                        <Input.TextArea placeholder="请输入表备注信息" rows={3} />
                    </Form.Item>
                    <Form.Item
                        name="theme"
                        label="所属主题"
                        rules={[{ required: true }]}
                    >
                        <Select placeholder="请选择所属主题">
                            <Option value="ODS层/用户数据">ODS层/用户数据</Option>
                            <Option value="ODS层/订单数据">ODS层/订单数据</Option>
                            <Option value="DWD层/用户画像">DWD层/用户画像</Option>
                            <Option value="DWS层/销售汇总">DWS层/销售汇总</Option>
                            <Option value="ADS层/销售分析">ADS层/销售分析</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item
                        name="dbType"
                        label="数据库类型"
                        rules={[{ required: true }]}
                    >
                        <Select placeholder="请选择数据库类型">
                            <Option value="Hive">Hive</Option>
                            <Option value="ClickHouse">ClickHouse</Option>
                            <Option value="MySQL">MySQL</Option>
                            <Option value="PostgreSQL">PostgreSQL</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item
                        name="owner"
                        label="负责人"
                        rules={[{ required: true }]}
                    >
                        <Input placeholder="请输入负责人姓名" />
                    </Form.Item>
                </Form>
            </Modal>
        </Layout>
    );
};

export default MetaDataManagement;