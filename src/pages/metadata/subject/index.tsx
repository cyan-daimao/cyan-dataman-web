import React, {useEffect, useState} from 'react';
import {
    Button,
    Card,
    Col,
    Divider,
    Form,
    Input,
    message,
    Modal,
    Popconfirm,
    Row,
    Space,
    Table,
    Tree,
    Typography
} from 'antd';
import {
    ArrowLeftOutlined,
    DeleteOutlined,
    EditOutlined,
    FolderOpenOutlined,
    FolderOutlined,
    PlusOutlined
} from '@ant-design/icons';
import {deleteSubject, editSubject, listSubjects, saveSubject, SubjectDTO} from "../../../api/MetadataSubjectAPI.ts";
import EmployeeSelect from "../../../component/employee/EmployeeSelect.tsx";

const {Title, Text} = Typography;

// 定义类型接口


interface SubTheme {
    key: string;
    title: string;
    parentId: string;
    description: string;
    children?: SubTheme[];
}


const initialSubThemes: SubTheme[] = [
    {
        key: '1-1',
        title: '用户基本信息',
        parentId: '1',
        description: '用户姓名、年龄、性别等基础信息'
    },
    {
        key: '1-2',
        title: '用户行为数据',
        parentId: '1',
        description: '用户点击、浏览、收藏等行为数据'
    },
    {
        key: '2-1',
        title: '商品基础信息',
        parentId: '2',
        description: '商品名称、价格、分类等基础信息'
    },
    {
        key: '2-2',
        title: '商品库存数据',
        parentId: '2',
        description: '商品库存、销量等数据'
    },
    {
        key: '3-1',
        title: '订单基础信息',
        parentId: '3',
        description: '订单号、金额、状态等信息'
    },
    {
        key: '3-2',
        title: '支付相关数据',
        parentId: '3',
        description: '支付方式、金额、时间等数据'
    }
];

const SubjectManagement: React.FC = () => {
    // 状态管理
    const [subjects, setSubjects] = useState<SubjectDTO[]>();
    const [subThemes, setSubThemes] = useState<SubTheme[]>(initialSubThemes);
    const [selectedTheme, setSelectedTheme] = useState<SubjectDTO | null>(null);
    const [currentSubTheme, setCurrentSubTheme] = useState<SubTheme | null>(null);

    // 弹窗状态
    const [subjectModalVisible, setSubjectModalVisible] = useState(false);
    const [subThemeModalVisible, setSubThemeModalVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // 表单实例
    const [subjectForm] = Form.useForm();
    const [subsubjectForm] = Form.useForm();

    useEffect(() => {
        fetchSubjects().then()
    }, []);

    const fetchSubjects = async () => {
        const data = await listSubjects();
        setSubjects(data)
    }

    // 筛选当前选中主题的二级主题
    const filteredSubThemes = selectedTheme
        ? subThemes.filter(item => item.parentId === selectedTheme.id)
        : [];

    // 格式化树形数据
    const treeData = filteredSubThemes.map(item => ({
        title: (
            <Space>
                <Text>{item.title}</Text>
                <Space size="small">
                    <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined/>}
                        onClick={() => handleEditSubTheme(item)}
                    />
                    <Popconfirm
                        title="确定删除该二级主题吗？"
                        onConfirm={() => handleDeleteSubTheme(item.key)}
                        okText="确定"
                        cancelText="取消"
                    >
                        <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined/>}
                        />
                    </Popconfirm>
                </Space>
            </Space>
        ),
        key: item.key,
        icon: <FolderOutlined/>
    }));

    // 处理一级主题操作
    const handleAddSubject = () => {
        setIsEditing(false);
        subjectForm.resetFields();
        setSubjectModalVisible(true);
    };

    // 打开一级主题编辑
    const openEditSubject = async (record: SubjectDTO) => {
        subjectForm.setFieldsValue({
            id: record.id,
            subjectName: record.subjectName,
            subjectCode: record.subjectCode,
            owner: record.owner,
            subjectDesc: record.subjectDesc
        });
        setIsEditing(true);
        setSubjectModalVisible(true);
    };

    // 处理一级主题编辑
    const handleEditSubject = async () => {
        const values = await subjectForm.validateFields();
        editSubject(values.id, values).then(() => {
            fetchSubjects()
            setSubjectModalVisible(false)
        })
    };
    // 处理一级主题删除
    const handleDeleteSubject = (id: string) => {
        try {
            deleteSubject(id).then(() => {
                fetchSubjects().then()
            })
        } catch (e) {
            console.error('主题删除失败:', e)
            message.error('主题删除失败！').then();
        }
    };

    // 处理一级主题保存
    const handleSaveSubject = async () => {
        try {
            const values = await subjectForm.validateFields();
            saveSubject(values).then(() => {
                setSubjectModalVisible(false);
                fetchSubjects()
            })

        } catch (error) {
            console.error('表单验证失败:', error);
        }
    };

    // 处理二级主题操作
    const handleAddSubTheme = () => {
        if (!selectedTheme) {
            message.warning('请先选择一个一级主题！');
            return;
        }

        setIsEditing(false);
        subsubjectForm.resetFields();
        setSubThemeModalVisible(true);
    };

    const handleEditSubTheme = (subTheme: SubTheme) => {
        setIsEditing(true);
        setCurrentSubTheme(subTheme);
        subsubjectForm.setFieldsValue({
            title: subTheme.title,
            description: subTheme.description
        });
        setSubThemeModalVisible(true);
    };

    const handleDeleteSubTheme = (key: string) => {
        setSubThemes(subThemes.filter(item => item.key !== key));
        message.success('二级主题删除成功！');
    };

    const handleSaveSubTheme = async () => {
        try {
            if (!selectedTheme) return;

            const values = await subsubjectForm.validateFields();

            if (isEditing && currentSubTheme) {
                // 编辑模式
                setSubThemes(subThemes.map(item =>
                    item.key === currentSubTheme.key
                        ? {...item, ...values}
                        : item
                ));
                message.success('二级主题编辑成功！');
            } else {
                // 新增模式
                const newSubTheme: SubTheme = {
                    key: `${selectedTheme.id}-${Date.now()}`,
                    title: values.title,
                    parentId: selectedTheme.id,
                    description: values.description
                };
                setSubThemes([...subThemes, newSubTheme]);
                message.success('二级主题创建成功！');
            }

            setSubThemeModalVisible(false);
        } catch (error) {
            console.error('表单验证失败:', error);
        }
    };

    // 选择一级主题
    const handleThemeSelect = (record: SubjectDTO) => {
        setSelectedTheme(record);
    };

    // 返回按钮
    const handleBack = () => {
        setSelectedTheme(null);
    };

    // 一级主题表格列配置
    const subjectColumns = [
        {
            title: '主题名称',
            dataIndex: 'subjectName',
            key: 'subjectName',
        },
        {
            title: '主题编码',
            dataIndex: 'subjectCode',
            key: 'subjectCode'
        },
        {
            title: '描述',
            dataIndex: 'subjectDesc',
            key: 'subjectDesc'
        },
        {
            title: '负责人',
            dataIndex: 'owner',
            key: 'owner'
        },
        {
            title: '上线状态',
            dataIndex: 'openStatus',
            key: 'openStatus'
        },
        {
            title: '创建时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
        },
        {
            title: '更新时间',
            dataIndex: 'updatedAt',
            key: 'updatedAt',
        },
        {
            title: '操作',
            key: 'action',
            render: (_: never, record: SubjectDTO) => (
                <Space size="small">
                    <Button
                        type="primary"
                        size="small"
                        icon={<FolderOpenOutlined/>}
                        onClick={() => handleThemeSelect(record)}
                    >
                        查看二级主题
                    </Button>
                    <Button
                        size="small"
                        icon={<EditOutlined/>}
                        onClick={() => openEditSubject(record)}
                    />
                    <Popconfirm
                        title="确定删除该主题吗？"
                        onConfirm={() => handleDeleteSubject(record.id)}
                        okText="确定"
                        cancelText="取消"
                    >
                        <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined/>}
                        />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div style={{padding: '24px'}}>
            <Card>
                <Title level={3}>主题域管理</Title>

                {!selectedTheme ? (
                    // 一级主题展示区域
                    <div>
                        <Row justify="space-between" align="middle" style={{marginBottom: 16}}>
                            <Col>
                                <Text strong>一级主题管理</Text>
                            </Col>
                            <Col>
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined/>}
                                    onClick={handleAddSubject}
                                >
                                    新增主题
                                </Button>
                            </Col>
                        </Row>

                        <Table
                            columns={subjectColumns}
                            dataSource={subjects}
                            rowKey="id"
                            bordered
                            pagination={{pageSize: 10}}
                        />
                    </div>
                ) : (
                    // 二级主题展示区域
                    <div>
                        <Row justify="space-between" align="middle" style={{marginBottom: 16}}>
                            <Col>
                                <Space>
                                    <Button
                                        icon={<ArrowLeftOutlined/>}
                                        onClick={handleBack}
                                    >
                                        返回
                                    </Button>
                                    <Title level={4} style={{margin: 0}}>
                                        {selectedTheme.name} - 二级主题管理
                                    </Title>
                                </Space>
                            </Col>
                            <Col>
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined/>}
                                    onClick={handleAddSubTheme}
                                >
                                    新增二级主题
                                </Button>
                            </Col>
                        </Row>

                        <Divider/>

                        <Tree
                            treeData={treeData}
                            showIcon
                            defaultExpandAll
                            style={{
                                border: '1px solid #e8e8e8',
                                borderRadius: 4,
                                padding: 16,
                                minHeight: 300
                            }}
                        />
                    </div>
                )}
            </Card>

            {/* 一级主题弹窗 */}
            <Modal
                title={isEditing ? '编辑一级主题' : '新增一级主题'}
                open={subjectModalVisible}
                onCancel={() => setSubjectModalVisible(false)}
                onOk={isEditing ? handleEditSubject : handleSaveSubject}
                destroyOnHidden
            >
                <Form
                    form={subjectForm}
                    layout="vertical"
                    labelCol={{span: 6}}
                    wrapperCol={{span: 18}}
                >
                    <Form.Item
                        name="id"
                        label="主题id"
                        rules={[{required: true, message: '请输入主题名称'}]}
                        hidden={true}
                    >
                        <Input disabled placeholder="请输入主题名称"/>
                    </Form.Item>

                    <Form.Item
                        name="subjectName"
                        label="主题名称"
                        rules={[{required: true, message: '请输入主题名称'}]}
                    >
                        <Input placeholder="请输入主题名称"/>
                    </Form.Item>
                    <Form.Item
                        name="subjectCode"
                        label="主题编码"
                        rules={[{required: true, message: '请输入主题编码'}]}
                    >
                        <Input placeholder="请输入主题编码"/>
                    </Form.Item>
                    <Form.Item
                        name="owner"
                        label="主题负责人"
                        rules={[{required: true, message: '请输入主题负责人'}]}
                    >
                        <EmployeeSelect placeholder="请选择主题负责人"/>
                    </Form.Item>
                    <Form.Item
                        name="subjectDesc"
                        label="主题描述"
                        rules={[{required: true, message: '请输入主题描述'}, {
                            max: 255,
                            message: '长度不能超过255个字符'
                        }]}
                    >
                        <Input.TextArea
                            placeholder="请输入主题描述"
                            rows={3}
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* 二级主题弹窗 */}
            <Modal
                title={isEditing ? '编辑二级主题' : '新增二级主题'}
                open={subThemeModalVisible}
                onCancel={() => setSubThemeModalVisible(false)}
                onOk={handleSaveSubTheme}
                destroyOnHidden
            >
                <Form
                    form={subsubjectForm}
                    layout="vertical"
                    labelCol={{span: 6}}
                    wrapperCol={{span: 18}}
                >
                    <Form.Item
                        name="title"
                        label="二级主题名称"
                        rules={[{required: true, message: '请输入二级主题名称'}]}
                    >
                        <Input placeholder="请输入二级主题名称"/>
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label="二级主题描述"
                        rules={[{required: true, message: '请输入二级主题描述'}]}
                    >
                        <Input.TextArea
                            placeholder="请输入二级主题描述"
                            rows={4}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default SubjectManagement;