import React, {useEffect, useState} from 'react';
import {Button, Card, Empty, Input, Layout, Modal, Space, Spin, Table, Tree, Typography} from 'antd';
import {DatabaseOutlined, ReloadOutlined, SearchOutlined, UploadOutlined} from "@ant-design/icons";
import {getTableInfo, listCatalog, listSchema, listTable, TableDTO} from "../../../api/DataSourceApi.ts";
import Sider from 'antd/es/layout/Sider';
import {Content} from "antd/es/layout/layout";
import {ColumnType} from "antd/es/table";
import IcebergTableForm from "./TableEditModal.tsx";

const {Title} = Typography;

interface DataNode {
    title: string;
    key: string;
    isLeaf?: boolean;
    icon: React.ReactNode;
    children?: DataNode[];
}


interface SchemaData {
    id: number,
    schema: string;
}

const App: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isIcebergTableEditOpen, setIsIcebergTableEditOpen] = useState(false);
    const [loading, setLoading] = useState(false)
    const [searchValue, setSearchValue] = useState('')
    const [treeData, setTreeData] = useState<DataNode[]>([])
    const [schemaData, setSchemaData] = useState<SchemaData[]>([])
    const [tableData, setTableData] = useState<TableDTO[]>([])
    const [selectedCatalog, setSelectedCatalog] = useState<string>()
    const [selectedSchema, setSelectedSchema] = useState<string>()
    const [selectedTable, setSelectedTable] = useState<string>()
    // 获得表信息传入TableEditModal
    const [tableInfo, setTableInfo] = useState<TableDTO>()

    useEffect(() => {
        fetchCatalog().then()
    }, [])

    useEffect(() => {
        if (!searchValue) {
            if (selectedCatalog) {
                fetchDatabase(selectedCatalog).then()
            }
            if (selectedSchema) {
                fetchTables(selectedCatalog, selectedSchema).then()
            }
        }
        if (searchValue) {
            handleSearchValue(searchValue).then()
        }
    }, [selectedCatalog, selectedSchema, searchValue])

    useEffect(() => {
        if (selectedCatalog && selectedSchema && selectedTable) {
            getTableInfo(selectedCatalog, selectedSchema, selectedTable).then(data => {
                setTableInfo(data)
            })
        }
    }, [selectedCatalog, selectedSchema, selectedTable])

    const schemaColumns: ColumnType<SchemaData>[] = [{
        title: `${selectedCatalog || '默认'} - 库`,
        dataIndex: 'schema',
        key: 'schema',
        render: (text: string) => (
            <Button color="primary" variant="text" onClick={() => setSelectedSchema(text)}>
                {text}
            </Button>
        )
    }]

    const tableColumns: ColumnType<TableDTO>[] = [{
        title: ` ${selectedCatalog}.${selectedSchema || '默认'}  - 表`,
        dataIndex: 'name',
        key: 'name',
        render: (text: string) => (
            <Button color="primary" variant="text" onClick={() => console.log(text)}>
                {text}
            </Button>
        )
    }, {
        title: '注释',
        dataIndex: 'comment',
        key: 'comment'
    }, {
        title: '操作',
        dataIndex: 'action',
        key: 'action',
        render: (_, record: TableDTO) => (
            <Button type="primary" onClick={() => {
                setIsIcebergTableEditOpen(true)
                setSelectedTable(record.name)
            }}>
                同步到Iceberg
            </Button>
        )
    }]

    // 修改搜索内容，库/表
    const handleSearchValue = async (searchValue: string) => {
        // 查询表
        if (selectedCatalog && selectedSchema) {
            const data = tableData.filter(table => table.name.includes(searchValue));
            setTableData(data)
        } else {
            const data = schemaData.filter(schema => schema.schema.includes(searchValue));
            setSchemaData(data)
        }
    }

    // 获取目录
    const fetchCatalog = async () => {
        listCatalog().then(catalogs => {
            const tree = catalogs.filter(catalog => catalog.datasourceType !== 'ICEBERG').map((catalog) => ({
                key: catalog.name,
                title: catalog.name,
                icon: <DatabaseOutlined/>
            }))
            setTreeData(tree)
        })
    }

    // 获取库
    const fetchDatabase = async (catalogName: string) => {
        setLoading(true)
        if (!catalogName || catalogName === 'undefined') {
            return
        }
        listSchema(catalogName).then(schemas => {
            const data = schemas.map((item, i) => ({
                id: i,
                schema: item.name,
            }))
            setSchemaData(data)
            setTableData([])
        }).finally(() => {
            setLoading(false)
        })
    }

    // 获取表
    const fetchTables = async (selectedCatalog: string | undefined, selectedSchema: string) => {
        setLoading(true)
        if (selectedCatalog && selectedSchema) {
            listTable(selectedCatalog, selectedSchema).then(tables => {
                setTableData(tables)
                setSchemaData([])
            }).finally(() => {
                setLoading(false)
            })
        }
    }

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
            <Button onClick={showModal} icon={<UploadOutlined/>}>
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
                        style={{background: '#fff', borderRight: '1px solid #f0f0f0'}}
                    >
                        <div style={{padding: '16px', borderBottom: '1px solid #f0f0f0'}}>
                            <Title level={4} style={{margin: 0}}>
                                数据源目录
                            </Title>
                        </div>
                        <Tree
                            treeData={treeData}
                            onSelect={(_, info) => {
                                setSelectedCatalog(info.node.key)
                                setSelectedSchema('')
                            }
                            }
                            showIcon
                            style={{padding: '16px'}}
                        />
                    </Sider>

                    {/* 右侧表管理内容 */}
                    <Content style={{margin: '0px', background: '#fff', borderRadius: '1px'}}>
                        <Card style={{marginBottom: 8}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <Space>
                                    <Input
                                        placeholder="搜索表名称/备注"
                                        value={searchValue}
                                        onChange={(e) => setSearchValue(e.target.value)}
                                        style={{width: 300}}
                                        prefix={<SearchOutlined/>}
                                    />
                                    <Button icon={<SearchOutlined/>}>搜索</Button>
                                    <Button onClick={() => setSearchValue('')} icon={<ReloadOutlined/>}>重置</Button>
                                </Space>
                            </div>
                        </Card>

                        <Spin spinning={loading}>
                            {
                                schemaData.length > 0 ? (
                                    <Table
                                        columns={schemaColumns}
                                        dataSource={schemaData}
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
                                    tableData.length > 0 ? (
                                        <Table
                                            columns={tableColumns}
                                            dataSource={tableData}
                                            rowKey="name"
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
                                    )
                                )
                            }
                        </Spin>
                    </Content>
                </Layout>
            </Modal>
            <IcebergTableForm
                visible={isIcebergTableEditOpen}
                onClose={() => setIsIcebergTableEditOpen(false)}
                initialData={tableInfo}
            />
        </>
    );
};

export default App;