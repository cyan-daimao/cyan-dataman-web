// IcebergTableForm.tsx
import React, {useEffect, useState} from 'react';
import {Cascader, TableProps} from 'antd';
import {Button, Col, Form, Input, message, Modal, Popconfirm, Row, Select, Space, Table, Typography} from 'antd';
import {TableDTO} from "../../../api/DataSourceApi.ts";
import {EmployeeDTO} from "../../../api/EmployeeApi.ts";
const { SHOW_CHILD } = Cascader;


// 定义Iceberg字段结构类型
export interface IcebergField {
    id: string; // 唯一标识，用于Table操作
    name: string; // 字段名
    type: string; // 字段类型
    comment?: string; // 字段注释
    isNullable: boolean; // 是否可为空
}

// 定义组件Props类型
export interface IcebergTableFormProps {
    visible: boolean; // 弹窗显隐
    onClose: () => void; // 关闭弹窗回调
    initialData?: TableDTO
}

const {Title, Text} = Typography;
const {Option} = Select;

// Iceberg常用字段类型
const FIELD_TYPE_OPTIONS = [
    'STRING', 'INT', 'BIGINT', 'FLOAT', 'DOUBLE',
    'BOOLEAN', 'DATE', 'TIMESTAMP', 'DECIMAL', 'ARRAY', 'MAP'
];
interface Option {
    value: string;
    label: string;
    children?: Option[];
}

const options: Option[] = [
    {
        value: 'zhejiang',
        label: 'Zhejiang',
        children: [
            {
                value: 'hangzhou',
                label: 'Hangzhou',
                children: [
                    {
                        value: 'xihu',
                        label: 'West Lake',
                    },
                ],
            },
        ],
    },
    {
        value: 'jiangsu',
        label: 'Jiangsu',
        children: [
            {
                value: 'nanjing',
                label: 'Nanjing',
                children: [
                    {
                        value: 'zhonghuamen',
                        label: 'Zhong Hua Men',
                    },
                ],
            },
        ],
    },
];
const IcebergTableForm: React.FC<IcebergTableFormProps> = ({
                                                               visible,
                                                               onClose,
                                                               initialData
                                                           }) => {
    // 扩展表单类型，包含所有新增字段
    const [form] = Form.useForm<{
        tableName: string;
        subjectCode: string;
        layerCode: string;
        owner: string;
        secretLevel: string;
        onlineStatus: string;
        comment: string;
    }>();

    // 字段列表状态
    const [fields, setFields] = useState<IcebergField[]>([]);
    // 加载状态
    const [loading, setLoading] = useState(false);

    const current: EmployeeDTO = JSON.parse(String(localStorage.getItem('current')))

    // 初始化：编辑场景下加载父组件传入的表结构和表单值
    useEffect(() => {
        if (visible && initialData) {
            console.log(44, initialData)
            // 填充表名和其他表单字段
            form.setFieldsValue({
                tableName: initialData.name,
                ...initialData
            });
            // 填充字段（确保每个字段有唯一id）
            // setFields(
            //     initialData.fields.map(field => ({
            //         ...field,
            //         id: field.id || `${field.name}_${Date.now()}_${Math.random().toString(36).slice(2)}`
            //     }))
            // );
        } else if (!visible) {
            // 关闭弹窗时重置
            form.resetFields();
            setFields([]);
        }
    }, [visible, initialData, form]);

    // 新增字段
    const addField = () => {
        const newField: IcebergField = {
            id: `field_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            name: '',
            type: 'STRING',
            isNullable: true,
            comment: ''
        };
        setFields([...fields, newField]);
    };

    // 删除字段
    const deleteField = (id: string) => {
        setFields(fields.filter(field => field.id !== id));
    };

    // 编辑字段属性（通用方法）
    const updateField = (id: string, key: keyof IcebergField, value: any) => {
        setFields(
            fields.map(field =>
                field.id === id ? {...field, [key]: value} : field
            )
        );
    };

    // 表单提交
    const handleSubmit = async () => {
        try {
            setLoading(true);
            // 验证所有表单字段
            const formValues = await form.validateFields();
            const {tableName} = formValues;

            // 验证字段列表
            if (fields.length === 0) {
                message.warning('至少需要添加一个字段！');
                setLoading(false);
                return;
            }

            // 检查字段名重复
            const nameSet = new Set();
            for (const field of fields) {
                if (!field.name) {
                    message.warning(`存在未填写名称的字段，请完善！`);
                    setLoading(false);
                    return;
                }
                if (nameSet.has(field.name)) {
                    message.warning(`字段名【${field.name}】重复，请修改！`);
                    setLoading(false);
                    return;
                }
                nameSet.add(field.name);
            }

            // 提交给父组件（过滤掉id，只保留业务字段）
            const submitFields = fields.map(({id, ...rest}) => rest);
            console.log(submitFields)
            message.success(initialData ? '表结构编辑成功！' : '表结构创建成功！');
        } catch (error) {
            console.error('表单提交失败：', error);
            message.error('提交失败，请检查表单内容！');
        } finally {
            setLoading(false);
        }
    };

    // 字段列表列配置
    const columns: TableProps<IcebergField>['columns'] = [
        {
            title: '字段名',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <>
                    <Input
                        value={text}
                        placeholder="输入字段名"
                        onChange={(e) => updateField(record.id, 'name', e.target.value)}
                        maxLength={64}
                    />
                </>

            )
        },
        {
            title: '字段类型',
            dataIndex: 'type',
            key: 'type',
            render: (text, record) => (
                <Select
                    value={text}
                    onChange={(value) => updateField(record.id, 'type', value)}
                    style={{width: 120}}
                >
                    {FIELD_TYPE_OPTIONS.map(type => (
                        <Option key={type} value={type}>{type}</Option>
                    ))}
                </Select>
            )
        },
        {
            title: '是否可为空',
            dataIndex: 'isNullable',
            key: 'isNullable',
            render: (text, record) => (
                <Select
                    value={text}
                    onChange={(value) => updateField(record.id, 'isNullable', value)}
                    style={{width: 100}}
                >
                    <Option value={true}>是</Option>
                    <Option value={false}>否</Option>
                </Select>
            )
        },
        {
            title: '字段注释',
            dataIndex: 'comment',
            key: 'comment',
            render: (text, record) => (
                <Input
                    value={text}
                    placeholder="输入字段注释"
                    onChange={(e) => updateField(record.id, 'comment', e.target.value)}
                />
            )
        },
        {
            title: '操作',
            key: 'action',
            render: (_, record) => (
                <Popconfirm
                    title="确定删除该字段吗？"
                    onConfirm={() => deleteField(record.id)}
                    okText="是"
                    cancelText="否"
                >
                    <Text type="danger">删除</Text>
                </Popconfirm>
            )
        }
    ];

    return (
        <Modal
            title={initialData ? '编辑Iceberg表结构' : '创建Iceberg表结构'}
            open={visible}
            onCancel={onClose}
            maskClosable={false}
            footer={[
                <Button key="cancel" onClick={onClose} disabled={loading}>
                    取消
                </Button>,
                <Button
                    key="submit"
                    type="primary"
                    onClick={handleSubmit}
                    loading={loading}
                >
                    {initialData ? '保存修改' : '创建表'}
                </Button>
            ]}
            width={800}
        >
            <Form form={form} layout="vertical">
                {/* 表名输入 */}
                <Form.Item
                    name="tableName"
                    label="表名"
                    rules={[
                        {required: true, message: '请输入Iceberg表名'},
                        {pattern: /^[a-zA-Z0-9_]+$/, message: '表名仅支持字母、数字、下划线'}
                    ]}
                >
                    <Input placeholder="例如：ods_order_info" maxLength={255}
                           prefix={
                               <span style={{
                                   color: 'rgba(0, 0, 0, 0.45)',
                                   display: 'inline-flex',
                                   alignItems: 'center',
                                   height: '100%'
                               }}>
                               {Form.useWatch('layerCode', form)}_{Form.useWatch('subjectCode', form)}_</span>
                           }/>
                </Form.Item>
                <Row gutter={16}>
                    <Col span={16}>
                        <Form.Item
                            name="subjectCode"
                            label="主题编码"
                            rules={[
                                {required: true, message: '请选择主题'},
                            ]}>
                            <Cascader showSearch
                                      options={options}
                                      changeOnSelect={true}
                                      onChange={(val)=>{console.log(val)}} />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item
                            name="layerCode"
                            label="表层级"
                            initialValue="ods"
                            rules={[{required: true, message: '请选择层级'}]}
                        >
                            <Select>
                                <Select.Option value="ods">ods</Select.Option>
                                <Select.Option value="dwd">dwd</Select.Option>
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item
                            name="owner"
                            label="负责人"
                            rules={[
                                {required: true, message: '请选择负责人'},
                            ]}
                        >
                            <Select defaultValue={current.passport}>
                                <Select.Option value="cyan1">闫晨阳</Select.Option>
                                <Select.Option value="xiaozhupeiqi">小猪佩奇</Select.Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item
                            name="secretLevel"
                            label="密级"
                            initialValue="L1"
                            rules={[{required: true, message: '请选择密级'}]}
                        >
                            <Select>
                                <Select.Option value="L1">L1</Select.Option>
                                <Select.Option value="L2">L2</Select.Option>
                                <Select.Option value="L3">L4</Select.Option>
                                <Select.Option value="L4">L4</Select.Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item
                            name="onlineStatus"
                            label="上线状态"
                            initialValue="OPEN"
                            rules={[{required: true, message: '请选择上线状态'}]}
                        >
                            <Select>
                                <Select.Option value="OPEN">OPEN</Select.Option>
                                <Select.Option value="CLOSE">CLOSE</Select.Option>
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item
                    name="comment"
                    label="表描述"
                    rules={[
                        {required: true, message: '请输入表描述'},
                    ]}
                >
                    <Input placeholder="请输入表描述" maxLength={255}/>
                </Form.Item>

                {/* 字段列表 */}
                <div style={{margin: '16px 0'}}>
                    <Space align="center" style={{marginBottom: 8}}>
                        <Title level={5} style={{margin: 0}}>字段列表</Title>
                        <Button type="dashed" size="small" onClick={addField}>
                            + 新增字段
                        </Button>
                    </Space>

                    {fields.length > 0 ? (
                        <Table
                            dataSource={fields}
                            columns={columns}
                            rowKey="id"
                            size="small"
                            pagination={false}
                        />
                    ) : (
                        <div style={{textAlign: 'center', padding: 16, color: '#999'}}>
                            暂无字段，请点击「新增字段」添加
                        </div>
                    )}
                </div>
            </Form>
        </Modal>
    );
};

export default IcebergTableForm;