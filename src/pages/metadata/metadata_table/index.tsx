import React, {useEffect, useState} from 'react';
import type {TableColumnsType, TreeProps} from 'antd';
import {
    Button,
    Card,
    Empty,
    Input,
    Layout,
    message,
    Modal,
    Space,
    Spin,
    Table,
    Tag,
    Tree,
    Typography
} from 'antd';
import {
    DatabaseOutlined,
    DeleteOutlined,
    EditOutlined,
    FilterOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    PlusOutlined,
    SearchOutlined,
    TableOutlined
} from '@ant-design/icons';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {treeSubjects} from "@/api/MetadataSubjectAPI.ts";
import ImportTable from "./ImportTableForm";
import {deleteMetadataTable, MetadataTableDTO, pageMetadataTables} from "@/api/MetadataTableAPI.ts";

const {Sider, Content} = Layout;
const {Title, Text} = Typography;
const {confirm} = Modal;

// 定义类型接口
interface SubjectNode {
    key: string;
    title: string;
    icon?: React.ReactNode;
    children?: SubjectNode[];
}

// 使用 MetadataTableDTO 替代 TableMeta
type TableMeta = MetadataTableDTO;


const MetaDataManagement: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    // 状态管理
    const [subjectTreeData, setSubjectTreeData] = useState<SubjectNode[]>([]);
    const [expandedKeys, setExpandedKeys] = useState<string[]>([]); // 展开的节点
    const [collapsed, setCollapsed] = useState(false); // 侧边栏折叠状态
    const [selectedThemeKey, setSelectedThemeKey] = useState<string>('all'); // 选中的主题key
    const [tableData, setTableData] = useState<TableMeta[]>([]); // 表数据
    const [loading, setLoading] = useState(true); // 加载状态
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
    // 从 URL 参数初始化搜索值
    const [searchValue, setSearchValue] = useState(() => {
        const search = searchParams.get('search');
        return (search && true) ? search : '';
    }); // 搜索值

    useEffect(() => {
        fetchTreeSubjects().then()
    }, [])

    // 收集所有节点的 key
    const collectAllKeys = (nodes: SubjectNode[]): string[] => {
        const keys: string[] = [];
        const traverse = (items: SubjectNode[]) => {
            items.forEach(item => {
                keys.push(item.key);
                if (item.children && item.children.length > 0) {
                    traverse(item.children);
                }
            });
        };
        traverse(nodes);
        return keys;
    };

    const fetchTreeSubjects = async () => {
        const data = await treeSubjects();
        const treeData: SubjectNode[] = data.map(item => ({
            key: item.subjectCode,
            title: item.subjectName,
            icon: <DatabaseOutlined/>,
            children: item.children?.map(child => ({
                key: child.subjectCode,
                title: child.subjectName,
                icon: <DatabaseOutlined/>,
            }))
        }))
        treeData.unshift({
            key: 'all',
            title: '全部主题',
            icon: <TableOutlined/>,
        })
        setSubjectTreeData(treeData)
        // 设置所有节点展开
        setExpandedKeys(collectAllKeys(treeData))
    }

// 表列定义
const columns: TableColumnsType<TableMeta> = [
    {
        title: '表名称',
        dataIndex: 'name',
        key: 'name',
        width: 200,
        ellipsis: true,
        render: (text: string, record: TableMeta) => (
            <Text
                strong
                style={{cursor: 'pointer', color: '#4F6DF5'}}
                onClick={() => navigate('/meta/metadata/metadata_table/detail', { state: { tableId: record.id } })}
            >
                {text}
            </Text>
        ),
    },
    {
        title: '表描述',
        dataIndex: 'comment',
        key: 'comment',
        width: 250,
        ellipsis: true,
    },
    {
        title: '所属主题',
        dataIndex: 'subjectCode',
        key: 'subjectCode',
        width: 150,
        render: (text:string) => <Tag color="blue">{text}</Tag>,
    },
    {
        title: '数据分层',
        dataIndex: 'layerCode',
        key: 'layerCode',
        width: 120,
        render: (text:string) => <Tag color="green">{text}</Tag>,
    },
    {
        title: '负责人',
        dataIndex: 'owner',
        key: 'owner',
        width: 100,
    },
    {
        title: '热度',
        dataIndex: 'heatLevel',
        key: 'heatLevel',
        width: 80,
        render: (text:string) => <Tag color="orange">{text}</Tag>,
    },
    {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 180,
    },
    {
        title: '操作',
        key: 'action',
        width: 180,
        render: (_, record: TableMeta) => (
            <Space size="small">
                <Button
                    type="text"
                    icon={<EditOutlined/>}
                    onClick={() => handleEdit(record)}
                    size="small"
                >
                    编辑
                </Button>
                <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined/>}
                    onClick={() => handleDelete(record)}
                    size="small"
                >
                    删除
                </Button>
            </Space>
        ),
    },
];

// 获取表数据（调用真实 API）
const fetchTableData = async (subjectCode: string = 'all', page = 1, pageSize = 20) => {
    setLoading(true);
    try {
        const query = {
            subjectCode: subjectCode === 'all' ? undefined : subjectCode,
            content: searchValue || undefined,
            current: page,
            size: pageSize
        };

        const res = await pageMetadataTables(query);
        setTableData(res.data || []);
        setPagination({ current: res.current || page, pageSize: res.size || pageSize, total: res.total || 0 });
    } catch (error) {
        console.error('获取表数据失败:', error);
        message.error('获取表数据失败');
        setTableData([]);
        setPagination({ current: 1, pageSize: 20, total: 0 });
    } finally {
        setLoading(false);
    }
};


// 树节点点击事件
const onTreeSelect: TreeProps['onSelect'] = (selectedKeys) => {
    const key = selectedKeys[0] || 'all';
    setSelectedThemeKey(key);
    fetchTableData(key, 1, pagination.pageSize).then();
};

// 搜索表
const handleSearch = () => {
    fetchTableData(selectedThemeKey, 1, pagination.pageSize).then();
};

// 重置搜索
const handleReset = () => {
    setSearchValue('');
    fetchTableData(selectedThemeKey, 1, pagination.pageSize).then();
};



// 编辑表 - 跳转到编辑页面
const handleEdit = (record: TableMeta) => {
    navigate('/meta/metadata/metadata_table/edit', {
        state: {
            mode: 'edit',
            tableId: record.id
        }
    });
};

// 删除表
const handleDelete = async (record: TableMeta) => {
    confirm({
        title: '确认删除',
        content: `是否确定删除表【${record.name}】？`,
        okText: '确认',
        cancelText: '取消',
        onOk: async () => {
            try {
                await deleteMetadataTable(record.id);
                message.success('删除成功');
                fetchTableData(selectedThemeKey, pagination.current, pagination.pageSize).then();
            } catch (error) {
                console.error('删除表失败:', error);
                message.error('删除表失败');
            }
        },
    });
};

// 新增表 - 跳转到创建页面
const handleAdd = () => {
    navigate('/meta/metadata/metadata_table/edit', {
        state: {
            mode: 'create'
        }
    });
};


// 初始化加载数据
useEffect(() => {
    fetchTableData().then();
}, []);


return (
    <Layout style={{ minHeight: '100%', background: '#F8F9FA' }}>
        {/* 页面标题区 */}
        <div style={{
            padding: '16px 20px',
            background: '#fff',
            borderBottom: '1px solid #EDEFF5',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
        }}>
            <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                {collapsed && (
                    <Button
                        type="text"
                        icon={<MenuUnfoldOutlined />}
                        onClick={() => setCollapsed(false)}
                        style={{ color: '#4F6DF5', padding: '4px 8px' }}
                    />
                )}
                <DatabaseOutlined style={{ color: '#4F6DF5' }}/>
                元数据管理平台
            </Title>
            <Space>
                <ImportTable/>
                <Button type="primary" icon={<PlusOutlined/>} onClick={handleAdd}>
                    新增表
                </Button>
            </Space>
        </div>

        <Layout style={{ background: '#F8F9FA' }}>
            {/* 左侧主题树 */}
            <Sider
                trigger={null}
                collapsible
                collapsed={collapsed}
                collapsedWidth={0}
                width={240}
                style={{
                    background: '#fff',
                    borderRight: '1px solid #EDEFF5',
                    overflow: 'hidden',
                }}
            >
                {/* 标题栏 */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderBottom: '1px solid #EDEFF5',
                }}>
                    <span style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#1D2333',
                    }}>
                        主题目录
                    </span>
                    <Button
                        type="text"
                        size="small"
                        icon={<MenuFoldOutlined />}
                        onClick={() => setCollapsed(true)}
                        style={{ color: '#8B909A' }}
                    />
                </div>

                {/* 搜索框 */}
                <div style={{ padding: '12px 16px' }}>
                    <Input
                        placeholder="搜索主题/表"
                        size="small"
                        prefix={<SearchOutlined style={{ color: '#8B909A' }} />}
                        style={{ borderRadius: 6 }}
                    />
                </div>

                {/* Tree */}
                <div style={{ padding: '0 8px 16px', overflow: 'auto', height: 'calc(100% - 110px)' }}>
                    <Tree
                        treeData={subjectTreeData}
                        defaultSelectedKeys={['all']}
                        expandedKeys={expandedKeys}
                        onExpand={(keys) => setExpandedKeys(keys as string[])}
                        onSelect={onTreeSelect}
                        showIcon
                        switcherIcon={<FilterOutlined style={{ fontSize: 12, color: '#8B909A' }} />}
                    />
                </div>
            </Sider>

            {/* 右侧表管理内容 */}
            <Content style={{ padding: 16, background: '#F8F9FA', overflow: 'auto' }}>
                <Card style={{ marginBottom: 12, borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space>
                            <Input
                                placeholder="搜索表名称/备注"
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                onPressEnter={handleSearch}
                                style={{ width: 300 }}
                                prefix={<SearchOutlined/>}
                            />
                            <Button onClick={handleSearch} icon={<SearchOutlined/>}>搜索</Button>
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
                                current: pagination.current,
                                pageSize: pagination.pageSize,
                                total: pagination.total,
                                showSizeChanger: true,
                                showTotal: (total) => `共 ${total} 条记录`,
                                onChange: (page, pageSize) => {
                                    fetchTableData(selectedThemeKey, page, pageSize).then();
                                },
                            }}
                            scroll={{x: 'max-content'}}
                        />
                    ) : (
                        <Empty
                            description="暂无表数据"
                            style={{padding: '40px 0'}}
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                    )}
                </Spin>
            </Content>
        </Layout>
    </Layout>
);
};

export default MetaDataManagement;
