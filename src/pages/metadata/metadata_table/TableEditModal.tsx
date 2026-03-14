// TableEditModal.tsx
import React, {useEffect, useState} from "react";
import {
    Button,
    Cascader,
    Col,
    Form,
    Input,
    message,
    Modal,
    Popconfirm,
    Row,
    Select,
    Space,
    Table,
    TableProps,
    Typography
} from "antd";
import {createMetadataTable, MetadataTableDTO, updateMetadataTable} from "../../../api/MetadataTableAPI.ts";
import {EmployeeDTO, EmployeeDTO as EmployeeAPIDTO, listEmployees} from "../../../api/EmployeeApi.ts";
import {getStorage, KEY} from "../../../utils/storage.ts";
import {SubjectDTO, treeSubjects,} from "../../../api/MetadataSubjectAPI.ts";

// 定义字段结构类型
export interface TableColumnField {
    id: string; // 唯一标识，用于 Table 操作
    name: string; // 字段名
    type: string; // 字段类型
    comment: string; // 字段注释
    nullable: boolean; // 是否可为空
    secretLevel: string; // 字段密级
}

// 定义组件 Props 类型
export interface TableEditModalProps {
    visible: boolean; // 弹窗显隐
    onClose: () => void; // 关闭弹窗回调
    onSuccess?: () => void; // 成功后的回调
    initialData?: MetadataTableDTO; // 初始数据，用于编辑模式
}

const {Title, Text} = Typography;
const {Option} = Select;

// 常用字段类型
const FIELD_TYPE_OPTIONS = [
    "STRING",
    "INT",
    "BIGINT",
    "FLOAT",
    "DOUBLE",
    "BOOLEAN",
    "DATE",
    "TIMESTAMP",
    "DECIMAL",
    "ARRAY",
    "MAP",
];

// 数据层级选项
const LAYER_OPTIONS = [
    {value: "ODS", label: "ODS - 数据源层"},
    {value: "DWD", label: "DWD - 数据明细层"},
    {value: "DWM", label: "DWM - 数据中间层"},
    {value: "DWS", label: "DWS - 数据服务层"},
    {value: "ADS", label: "ADS - 数据应用层"},
    {value: "DIM", label: "DIM - 维度表"},
];

// 密级选项
const SECRET_LEVEL_OPTIONS = [
    {value: "L1", label: "L1 - 公开"},
    {value: "L2", label: "L2 - 内部"},
    {value: "L3", label: "L3 - 机密"},
    {value: "L4", label: "L4 - 绝密"},
];

// 上线状态选项
const ONLINE_STATUS_OPTIONS = [
    {value: "ONLINE", label: "已上线"},
    {value: "OFFLINE", label: "已下线"},
];

const TableEditModal: React.FC<TableEditModalProps> = ({
                                                           visible,
                                                           onClose,
                                                           onSuccess,
                                                           initialData,
                                                       }) => {

    // 表单类型定义
    interface TableFormData {
        name: string;
        subjectCode: string[];
        layerCode: string;
        owner: string;
        secretLevel: string;
        onlineStatus: string;
        comment: string;
        catalog?: string;
        schema?: string;
    }

    const [form] = Form.useForm<TableFormData>();

    // 字段列表状态
    const [fields, setFields] = useState<TableColumnField[]>([]);
    // 主题树数据
    const [subjectTreeData, setSubjectTreeData] = useState<SubjectDTO[]>([]);
    // 员工列表数据
    const [employeeList, setEmployeeList] = useState<EmployeeAPIDTO[]>([]);
    // 加载状态
    const [loading, setLoading] = useState(false);
    // 主题加载状态
    const [subjectLoading, setSubjectLoading] = useState(false);

    const current: EmployeeDTO = getStorage(KEY.CURRENT, {} as EmployeeDTO);

    // 加载主题树数据
    useEffect(() => {
        if (visible) {
            loadSubjectTree().then();
            loadEmployeeList().then();
        }
    }, [visible]);

    const loadSubjectTree = async () => {
        try {
            setSubjectLoading(true);
            const data = await treeSubjects();
            setSubjectTreeData(data);
        } catch (error) {
            console.error("加载主题树失败:", error);
            message.error("加载主题树失败");
        } finally {
            setSubjectLoading(false);
        }
    };

    // 加载员工列表
    const loadEmployeeList = async () => {
        try {
            const data = await listEmployees();
            setEmployeeList(data.data || []);
        } catch (error) {
            console.error("加载员工列表失败:", error);
            message.error("加载员工列表失败");
        }
    };

    // 初始化：编辑场景下加载父组件传入的表结构和表单值
    useEffect(() => {
        if (visible && initialData) {
            // 填充表单值
            form.setFieldsValue({
                name: initialData.name,
                subjectCode: initialData.subjectCode,
                layerCode: initialData.layerCode,
                owner: initialData.owner,
                secretLevel: initialData.heatLevel || "L1",
                onlineStatus: "ONLINE",
                comment: initialData.comment,
                catalog: initialData.table?.catalog || "iceberg_catalog",
                schema: initialData.table?.schema || "default",
            });

            // 填充字段列表
            if (initialData.table?.columns) {
                setFields(
                    initialData.table.columns.map((column, index) => ({
                        id: `field_${index}_${Date.now()}`,
                        name: column.name,
                        type: column.type,
                        comment: column.comment || "",
                        nullable: column.nullable,
                        secretLevel: column.secretLevel
                    })),
                );
            }
        } else if (!visible) {
            // 关闭弹窗时重置
            form.resetFields();
            setFields([]);
        }

    }, [visible, initialData, form]);

    // 新增字段
    const addField = () => {
        const newField: TableColumnField = {
            id: `field_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            name: "",
            type: "STRING",
            comment: "",
            nullable: true,
            secretLevel: "L1",
        };
        setFields([...fields, newField]);
    };

    // 删除字段
    const deleteField = (id: string) => {
        setFields(fields.filter((field) => field.id !== id));
    };

    // 编辑字段属性（通用方法）
    const updateField = (id: string, key: keyof TableColumnField, value: any) => {
        setFields(
            fields.map((field) =>
                field.id === id ? {...field, [key]: value} : field,
            ),
        );
    };

    // 表单提交
    const handleSubmit = async () => {
        try {
            setLoading(true);
            // 验证所有表单字段
            const formValues = await form.validateFields();

            // 验证字段列表
            if (fields.length === 0) {
                message.warning("至少需要添加一个字段！");
                setLoading(false);
                return;
            }

            // 检查字段名重复和完整性
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

            // 构建 TableValObj
            const tableValObj = {
                catalog: formValues.catalog || "iceberg_catalog",
                schema: formValues.schema || "default",
                name: `${formValues.layerCode.toLowerCase()}_${formValues.subjectCode?.[0]}_${formValues.name}`,
                comment: formValues.comment,
                columns: fields.map((field) => ({
                    name: field.name,
                    type: field.type,
                    comment: field.comment,
                    nullable: field.nullable,
                    secretLevel: field.secretLevel,
                    autoIncrement: false,
                    defaultValue: undefined,
                })),
                indexes: [],
            };

            // 构建 MetadataTableCmd
            const cmd = {
                name: tableValObj.name,
                owner: formValues.owner,
                subjectCode: formValues.subjectCode?.[formValues.subjectCode.length - 1],
                layerCode: formValues.layerCode,
                comment: formValues.comment,
                secretLevel: formValues.secretLevel,
                onlineStatus: formValues.onlineStatus,
                tableValObj: tableValObj,
            };

            console.log("提交表单数据:", cmd);
            // 调用 API
            if (initialData?.id) {
                // 更新模式
                await updateMetadataTable(initialData.id, cmd);
                message.success("表更新成功！");
            } else {
                // 创建模式
                await createMetadataTable(cmd);
                message.success("表创建成功！");
            }

            // 成功后回调
            if (onSuccess) {
                onSuccess();
            }

            // 关闭弹窗
            onClose();
        } catch (error: any) {
            console.error("表单提交失败:", error);
            // 错误已在拦截器处理，这里不需要重复提示
        } finally {
            setLoading(false);
        }
    };

    // 字段列表列配置
    const columns: TableProps<TableColumnField>["columns"] = [
        {
            title: "字段名",
            dataIndex: "name",
            key: "name",
            render: (text, record) => (
                <>
                    <Input
                        value={text}
                        placeholder="输入字段名"
                        onChange={(e) => updateField(record.id, "name", e.target.value)}
                        maxLength={64}
                    />
                </>
            ),
        },
        {
            title: "字段类型",
            dataIndex: "type",
            key: "type",
            render: (text, record) => (
                <Select
                    value={text}
                    onChange={(value) => updateField(record.id, "type", value)}
                    style={{width: 120}}
                >
                    {FIELD_TYPE_OPTIONS.map((type) => (
                        <Option key={type} value={type}>
                            {type}
                        </Option>
                    ))}
                </Select>
            ),
        },
        {
            title: "是否可为空",
            dataIndex: "nullable",
            key: "nullable",
            render: (text, record) => (
                <Select
                    value={text}
                    onChange={(value) => updateField(record.id, "nullable", value)}
                    style={{width: 80}}
                >
                    <Option value={true}>是</Option>
                    <Option value={false}>否</Option>
                </Select>
            ),
        },
        {
            title: "字段密级",
            dataIndex: "secretLevel",
            key: "secretLevel",
            render: (text, record) => (
                <Select options={SECRET_LEVEL_OPTIONS}
                        value={text}
                        style={{width: 100}}
                        onChange={(value) => updateField(record.id, "secretLevel", value)}
                        placeholder="请选择密级"/>
            ),
        },
        {
            title: "字段注释",
            dataIndex: "comment",
            key: "comment",
            render: (text, record) => (
                <Input
                    value={text}
                    placeholder="输入字段注释"
                    onChange={(e) => updateField(record.id, "comment", e.target.value)}
                />
            ),
        },
        {
            title: "操作",
            key: "action",
            render: (_, record) => (
                <Popconfirm
                    title="确定删除该字段吗？"
                    onConfirm={() => deleteField(record.id)}
                    okText="是"
                    cancelText="否"
                >
                    <Text type="danger">删除</Text>
                </Popconfirm>
            ),
        },
    ];

    return (
        <Modal
            title={initialData ? "编辑元数据表" : "创建元数据表"}
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
                    {initialData ? "保存修改" : "创建表"}
                </Button>,
            ]}
            width={900}
        >
            <Form form={form} layout="vertical">
                {/* 表名输入 */}
                <Form.Item
                    name="name"
                    label="表名"
                    rules={[
                        {required: true, message: "请输入表名"},
                        {
                            pattern: /^[a-zA-Z0-9_]+$/,
                            message: "表名仅支持字母、数字、下划线",
                        },
                    ]}
                    extra="表名将自动生成：{layerCode}_{subjectCode}_{name}"
                >
                    <Input
                        placeholder="例如：order_info"
                        maxLength={255}
                        prefix={
                            <span
                                style={{
                                    color: "rgba(0, 0, 0, 0.45)",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    height: "100%",
                                }}
                            >
                {Form.useWatch("layerCode", form)?.toLocaleLowerCase()}_
                                {Form.useWatch("subjectCode", form)?.[0]}_
              </span>
                        }
                    />
                </Form.Item>
                <Row gutter={16}>
                    <Col span={16}>
                        <Form.Item
                            name="subjectCode"
                            label="主题编码"
                            rules={[{required: true, message: "请选择主题"}]}
                        >
                            <Cascader
                                showSearch
                                options={subjectTreeData.map((item) => ({
                                    value: item.subjectCode,
                                    label: item.subjectName,
                                    children: item.children?.map((child) => ({
                                        value: child.subjectCode,
                                        label: child.subjectName,
                                    })),
                                }))}
                                changeOnSelect
                                placeholder="请选择主题"
                                loading={subjectLoading}
                                // onChange={(value) => {
                                //   // 只取最后一个值作为 subjectCode
                                //   const lastValue = Array.isArray(value) ? value[value.length - 1] : value;
                                //   form.setFieldsValue({ subjectCode: lastValue });
                                // }}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item
                            name="layerCode"
                            label="数据分层"
                            initialValue="ODS"
                            rules={[{required: true, message: "请选择数据分层"}]}
                        >
                            <Select options={LAYER_OPTIONS} placeholder="请选择数据分层"/>
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item
                            name="owner"
                            label="负责人"
                            rules={[{required: true, message: "请选择负责人"}]}
                        >
                            <Select
                                placeholder="请选择负责人"
                                showSearch
                                optionFilterProp="children"
                                filterOption={(input, option) =>
                                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                                options={employeeList.map((emp) => ({
                                    label: `${emp.cnName} (${emp.passport})`,
                                    value: emp.passport,
                                }))}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item
                            name="secretLevel"
                            label="密级"
                            initialValue="L1"
                            rules={[{required: true, message: "请选择密级"}]}
                        >
                            <Select options={SECRET_LEVEL_OPTIONS} placeholder="请选择密级"/>
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item
                            name="onlineStatus"
                            label="上线状态"
                            initialValue="ONLINE"
                            rules={[{required: true, message: "请选择上线状态"}]}
                        >
                            <Select
                                options={ONLINE_STATUS_OPTIONS}
                                placeholder="请选择上线状态"
                            />
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item
                    name="comment"
                    label="表描述"
                    rules={[{required: true, message: "请输入表描述"}]}
                >
                    <Input placeholder="请输入表描述" maxLength={255}/>
                </Form.Item>

                {/* 字段列表 */}
                <div style={{margin: "16px 0"}}>
                    <Space align="center" style={{marginBottom: 8}}>
                        <Title level={5} style={{margin: 0}}>
                            字段列表
                        </Title>
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
                        <div style={{textAlign: "center", padding: 16, color: "#999"}}>
                            暂无字段，请点击「新增字段」添加
                        </div>
                    )}
                </div>
            </Form>
        </Modal>
    );
};

export default TableEditModal;
