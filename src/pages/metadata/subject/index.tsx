import React, {useEffect, useState} from 'react';
import {Button, Card, Col, Divider, Form, Input, message, Modal, Popconfirm, Row, Space, Table, Typography} from 'antd';
import {ArrowLeftOutlined, DeleteOutlined, EditOutlined, FolderOpenOutlined, PlusOutlined} from '@ant-design/icons';
import PermissionButton from '@/component/permission/PermissionButton';
import {deleteSubject, editSubject, listSubjects, saveSubject, SubjectDTO} from "../../../api/MetadataSubjectAPI";
import EmployeeSelect from "../../../component/employee/EmployeeSelect";
import {ColumnType} from "antd/es/table";

const {Title, Text} = Typography;

const SubjectManagement: React.FC = () => {
    // 状态管理
    const [subjects, setSubjects] = useState<SubjectDTO[]>();
    const [subSubject, setSubSubject] = useState<SubjectDTO[]>();
    const [selectSubject, setSelectSubject] = useState<SubjectDTO | null>(null);

    // 弹窗状态
    const [subjectModalVisible, setSubjectModalVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // 表单实例
    const [subjectForm] = Form.useForm();

    useEffect(() => {
        fetchSubjects().then()
    }, []);

    useEffect(() => {
        if (selectSubject) {
            fetchSubSubjects(selectSubject.id).then()
        }
    }, [selectSubject]);

    // 获取主题
    const fetchSubjects = async () => {
        const data = await listSubjects({parentId:'0'});
        setSubjects(data)
    }

    //获得二级主题
    const fetchSubSubjects = async (id: string) => {
        const data = await listSubjects({parentId: id});
        setSubSubject(data)
    }


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
        const cmd = {
            ...values,
            parentId: selectSubject ? selectSubject.id : '0'
        }
        editSubject(values.id, cmd).then(() => {
            if (!selectSubject) {
                fetchSubjects()
            } else {
                fetchSubSubjects(selectSubject.id)
            }
            setSubjectModalVisible(false)
        })
    };
    // 处理一级主题删除
    const handleDeleteSubject = (id: string) => {
        try {
            deleteSubject(id).then(() => {
                if (!selectSubject) {
                    fetchSubjects().then()
                } else {
                    fetchSubSubjects(selectSubject.id).then()
                }
            })
        } catch (e) {
            console.error('主题删除失败:', e)
            message.error('主题删除失败！').then();
        }
    };

    // 处理一级主题保存
    const handleSaveSubject = async () => {
        try {
            //一级主题
            const values = await subjectForm.validateFields();
            if (!selectSubject) {
                saveSubject(values).then(() => {
                    setSubjectModalVisible(false);
                    fetchSubjects()
                })
            } else {
                //二级主题
                saveSubject({parentId: selectSubject.id, ...values}).then(() => {
                    setSubjectModalVisible(false);
                    fetchSubSubjects(selectSubject.id)
                })
            }


        } catch (error) {
            console.error('表单验证失败:', error);
        }
    };
    // 选择一级主题
    const handleSubjectSelect = (record: SubjectDTO) => {
        setSelectSubject(record);
    };

    // 返回按钮
    const handleBack = () => {
        setSelectSubject(null);
    };

    // 一级主题表格列配置
    const subjectColumns: ColumnType<SubjectDTO>[] = [
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
            render: (_: SubjectDTO, record: SubjectDTO) => (
                <Space size="small">
                    {!selectSubject ? <Button
                        type="primary"
                        size="small"
                        icon={<FolderOpenOutlined/>}
                        onClick={() => handleSubjectSelect(record)}
                    >
                        查看二级主题
                    </Button> : <div/>
                    }
                    <PermissionButton
                        size="small"
                        icon={<EditOutlined/>}
                        onClick={() => openEditSubject(record)}
                        permission="MENU:meta:subject:UPDATE"
                    />
                    <Popconfirm
                        title="确定删除该主题吗？"
                        onConfirm={() => handleDeleteSubject(record.id)}
                        okText="确定"
                        cancelText="取消"
                    >
                        <PermissionButton
                            size="small"
                            danger
                            icon={<DeleteOutlined/>}
                            permission="MENU:meta:subject:DELETE"
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

                {!selectSubject ? (
                    // 一级主题展示区域
                    <div>
                        <Row justify="space-between" align="middle" style={{marginBottom: 16}}>
                            <Col>
                                <Text strong>一级主题管理</Text>
                            </Col>
                            <Col>
                                <PermissionButton
                                    type="primary"
                                    icon={<PlusOutlined/>}
                                    onClick={handleAddSubject}
                                    permission="MENU:meta:subject:CREATE"
                                >
                                    新增主题
                                </PermissionButton>
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
                                        {selectSubject.subjectName} - 二级主题管理
                                    </Title>
                                </Space>
                            </Col>
                            <Col>
                                <PermissionButton
                                    type="primary"
                                    icon={<PlusOutlined/>}
                                    onClick={handleAddSubject}
                                    permission="MENU:meta:subject:CREATE"
                                >
                                    新增二级主题
                                </PermissionButton>
                            </Col>
                        </Row>

                        <Divider/>

                        <Table
                            columns={subjectColumns}
                            dataSource={subSubject}
                            rowKey="id"
                            bordered
                            pagination={{pageSize: 10}}
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
                        hidden={true}
                    >
                        <Input disabled/>
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

        </div>
    );
};

export default SubjectManagement;