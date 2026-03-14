import React, {useEffect, useState} from 'react';
import type {ColumnsType, TreeProps} from 'antd';
import {
    Button,
    Card,
    Dropdown,
    Empty,
    Form,
    Input,
    Layout,
    Menu,
    message,
    Modal,
    Select,
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
    DownloadOutlined,
    EditOutlined,
    FilterOutlined,
    FolderOutlined,
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
    SettingOutlined,
    TableOutlined
} from '@ant-design/icons';
import type {MenuProps} from 'antd/es/menu';
import {treeSubjects} from "../../../api/MetadataSubjectAPI.ts";
import ImportTable from "./ImportTableForm.tsx";
import TableEditModal from "./TableEditModal.tsx";
import {MetadataTableDTO, pageMetadataTables} from "../../../api/MetadataTableAPI.ts";

const {Header, Sider, Content} = Layout;
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
    // 状态管理
    const [tableEditModalVisible, setTableEditModalVisible] = useState<boolean>(false)
    const [subjectTreeData, setSubjectTreeData] = useState<SubjectNode[]>([]);
    const [collapsed, setCollapsed] = useState(false); // 侧边栏折叠状态
    const [selectedThemeKey, setSelectedThemeKey] = useState<string>('all'); // 选中的主题key
    const [tableData, setTableData] = useState<TableMeta[]>([]); // 表数据
    const [loading, setLoading] = useState(true); // 加载状态
    const [searchValue, setSearchValue] = useState(''); // 搜索值

    useEffect(() => {
        fetchTreeSubjects().then()
    }, [])

    const fetchTreeSubjects = async () => {
        const data = await treeSubjects();
        const treeData: SubjectNode[] = data.map(item => ({
            key: item.id,
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
    }

    // 主题树数据
    const themeTreeData: SubjectNode[] = [
        {
            key: 'all',
            title: '全部主题',
            icon: <DatabaseOutlined/>,
        },
        {
            key: 'ods',
            title: 'ODS层',
            icon: <FolderOutlined/>,
            children: [
                {key: 'ods_user', title: '用户数据', icon: <TableOutlined/>},
                {key: 'ods_order', title: '订单数据', icon: <TableOutlined/>},
                {key: 'ods_product', title: '商品数据', icon: <TableOutlined/>},
            ],
        },
        {
            key: 'dwd',
            title: 'DWD层',
            icon: <FolderOutlined/>,
            children: [
                {key: 'dwd_user_profile', title: '用户画像', icon: <TableOutlined/>},
                {key: 'dwd_order_detail', title: '订单明细', icon: <TableOutlined/>},
            ],
        },
        {
            key: 'dws',
            title: 'DWS层',
            icon: <FolderOutlined/>,
            children: [
                {key: 'dws_user_behavior', title: '用户行为', icon: <TableOutlined/>},
                {key: 'dws_sales_summary', title: '销售汇总', icon: <TableOutlined/>},
            ],
        },
        {
            key: 'ads',
            title: 'ADS层',
            icon: <FolderOutlined/>,
            children: [
                {key: 'ads_sales_analysis', title: '销售分析', icon: <TableOutlined/>},
                {key: 'ads_user_analysis', title: '用户分析', icon: <TableOutlined/>},
            ],
        },
    ];

    const tableMenuItems: MenuProps['items'] = [
        {
            key: '1',
            label: (
                <Button type={"text"}>查看数据</Button>
            )
        }, {
            key: '2',
            label: (
                <Button type={"text"}>同步数据</Button>
            )
        }, {
            key: '3',
            label: (
                <Button type={"text"}>删除表</Button>
            )
        }
    ]

// 表列定义
const columns: ColumnsType<TableMeta> = [
    {
        title: '表名称',
        dataIndex: 'name',
        key: 'name',
        width: 200,
        ellipsis: true,
        render: (text, record) => <Text strong>{record.name}</Text>,
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
        render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
        title: '数据分层',
        dataIndex: 'layerCode',
        key: 'layerCode',
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
        title: '热度',
        dataIndex: 'heatLevel',
        key: 'heatLevel',
        width: 80,
        render: (text) => <Tag color="orange">{text}</Tag>,
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
                <Dropdown menu={{items:tableMenuItems}}>
                    <Button type="text" size="small">更多</Button>
                </Dropdown>
            </Space>
        ),
    },
];

// 获取表数据（调用真实 API）
const fetchTableData = async (subjectCode: string = 'all') => {
    setLoading(true);
    try {
        const query = {
            subjectCode: subjectCode === 'all' ? undefined : subjectCode,
            content: searchValue || undefined,
            current: 1,
            size: 100
        };
        
        const page = await pageMetadataTables(query);
        setTableData(page.data || []);
    } catch (error) {
        console.error('获取表数据失败:', error);
        message.error('获取表数据失败');
        setTableData([]);
    } finally {
        setLoading(false);
    }
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
    console.log(123, key)
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

;

// 删除表
const handleDelete = (record: TableMeta) => {
    confirm({
        title: '确认删除',
        content: `是否确定删除表【${record.name}】？`,
        okText: '确认',
        cancelText: '取消',
        onOk: () => {
            // TODO: 调用删除 API
            setTableData(tableData.filter(item => item.id !== record.id));
            message.success('删除成功');
        },
    });
};


// 初始化加载数据
useEffect(() => {
    fetchTableData();
}, []);

// 工具栏菜单
const toolMenuItems: MenuProps['items'] = [
    {key: 'export', label: '导出数据', icon: <DownloadOutlined/>},
    {key: 'refresh', label: '刷新数据', icon: <ReloadOutlined/>},
    {key: 'setting', label: '列表设置', icon: <SettingOutlined/>},
];

return (
    <Layout style={{minHeight: '100vh'}}>
        {/* 顶部Header */}
        <Header style={{background: '#fff', padding: '0 20px', boxShadow: '0 1px 4px rgba(0,21,41,.08)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%'}}>
                <Title level={4} style={{margin: 0}}>
                    <DatabaseOutlined style={{marginRight: 8}}/>
                    元数据表管理平台
                </Title>
                <Space>
                    <ImportTable/>
                    <Button type="primary" icon={<PlusOutlined/>} onClick={()=>setTableEditModalVisible(true)}>
                        新增表
                    </Button>
                    <Dropdown menu={{items: toolMenuItems}}>
                        <Button icon={<SettingOutlined/>}>更多操作</Button>
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
                style={{background: '#fff', borderRight: '1px solid #f0f0f0'}}
            >
                <div style={{padding: '16px', borderBottom: '1px solid #f0f0f0'}}>
                    <Input
                        placeholder="搜索主题/表"
                        size="small"
                        prefix={<SearchOutlined/>}
                        style={{marginBottom: 0}}
                    />
                </div>
                <Tree
                    treeData={subjectTreeData}
                    defaultSelectedKeys={['all']}
                    onSelect={onTreeSelect}
                    showIcon
                    style={{padding: '16px'}}
                    switcherIcon={<FilterOutlined/>}
                />
            </Sider>

            {/* 右侧表管理内容 */}
            <Content style={{margin: '0px', background: '#fff', borderRadius: '1px'}}>
                <Card style={{marginBottom: 8}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <div>
                            <Title level={5} style={{margin: 0, display: 'inline-block'}}>
                                {selectedThemeKey === 'all' ? '全部表' : getThemeName(selectedThemeKey)}
                            </Title>
                            <Text type="secondary" style={{marginLeft: 8}}>
                                共 {tableData.length} 张表
                            </Text>
                        </div>
                        <Space>
                            <Input
                                placeholder="搜索表名称/备注"
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                onPressEnter={handleSearch}
                                style={{width: 300}}
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
                                pageSize: 10,
                                showSizeChanger: true,
                                showTotal: (total) => `共 ${total} 条记录`
                            }}
                            scroll={{x: 'max-content'}}
                            bordered
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

        {/* 新增/编辑表弹窗 */}
        <TableEditModal visible={tableEditModalVisible} onClose={() => setTableEditModalVisible(false)}/>
    </Layout>
);
}
;

export default MetaDataManagement;