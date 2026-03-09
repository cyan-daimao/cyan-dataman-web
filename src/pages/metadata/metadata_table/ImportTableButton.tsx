import React, {useEffect, useState} from 'react';
import {Button, Card, Empty, Form, Input, Layout, Modal, Select, Space, Spin, Table, Tree, Typography} from 'antd';
import {DatabaseOutlined, FilterOutlined, SearchOutlined, UploadOutlined} from "@ant-design/icons";
import {listCatalog} from "../../../api/DataSourceApi.ts";
import Sider from 'antd/es/layout/Sider';
import {Content} from "antd/es/layout/layout";
const { Title, Text } = Typography;

interface DataNode {
    title: string;
    key: string;
    isLeaf?: boolean;
    icon: React.ReactNode;
    children?: DataNode[];
}

const App: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading,setLoading] = useState(true)
    const [treeData,setTreeData] = useState<DataNode[]>([])
    const [tableData,setTableData] = useState<[]>([])
    const [selectedCatalog,setSelectedCatalog] = useState<string>()
    useEffect(()=>{
        listCatalog().then( catalogs=>{
            const tree = catalogs.map(catalog=>({
                key: catalog.name,
                title: catalog.name,
                icon: <DatabaseOutlined />
            }))
            setTreeData(tree)
        })
    },[])

    const showModal = () => {
        setIsModalOpen(true);
    };

    const handleOk = () => {
        setIsModalOpen(false);
    };

    const handleCancel = () => {
        setIsModalOpen(false);
    };

    return (
        <>
            <Button onClick={showModal} icon={<UploadOutlined />}>
                导入表
            </Button>
            <Modal
                // closable={{ 'aria-label': 'Custom Close Button' }}
                maskClosable={false}
                width={1200}
                height={600}
                open={isModalOpen}
                onOk={handleOk}
                onCancel={handleCancel}
            >
                <Layout>
                    {/* 左侧主题树 */}
                    <Sider
                        style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}
                    >
                        <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
                            <Title level={4} style={{ margin: 0 }}>
                                数据源目录
                            </Title>
                        </div>
                        <Tree
                            treeData={treeData}
                            onSelect={key=> setSelectedCatalog(key.values.name)}
                            showIcon
                            style={{ padding: '16px' }}
                        />
                    </Sider>

                    {/* 右侧表管理内容 */}
                    <Content style={{ margin: '0px', background: '#fff', borderRadius: '1px' }}>
                        <Card style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <Title level={5} style={{ margin: 0, display: 'inline-block' }}>
                                        {/*{selectedThemeKey === 'all' ? '全部表' : getThemeName(selectedThemeKey)}*/}
                                        表
                                    </Title>
                                    <Text type="secondary" style={{ marginLeft: 8 }}>
                                        共 {tableData.length} 张表
                                    </Text>
                                </div>
                                <Space>
                                    <Input
                                        placeholder="搜索表名称/备注"
                                        // value={searchValue}
                                        // onChange={(e) => setSearchValue(e.target.value)}
                                        // onPressEnter={handleSearch}
                                        style={{ width: 300 }}
                                        prefix={<SearchOutlined />}
                                    />
                                    <Button icon={<SearchOutlined />}>搜索</Button>
                                    <Button >重置</Button>
                                </Space>
                            </div>
                        </Card>

                         表列表
                        <Spin spinning={loading}>
                            {tableData.length > 0 ? (
                                <Table
                                    // columns={columns}
                                    // dataSource={tableData}
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

            </Modal>
        </>
    );
};

export default App;