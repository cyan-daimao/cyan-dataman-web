import React, {useEffect, useState} from "react";
import {
    Button,
    Card,
    Cascader,
    Col,
    Form,
    Input,
    InputNumber,
    message,
    Popconfirm,
    Row,
    Select,
    Space,
    Table,
    TableProps,
    Typography
} from "antd";
import {ArrowLeftOutlined, SaveOutlined} from "@ant-design/icons";
import {useLocation, useNavigate} from "react-router-dom";
import {
    createMetadataTable,
    getMetadataTableById,
    MetadataTableDTO,
    PartitionType,
    updateMetadataTable
} from "@/api/MetadataTableAPI.ts";
import {EmployeeDTO as EmployeeAPIDTO, listEmployees} from "../../../api/EmployeeApi";
import {SubjectDTO, treeSubjects,} from "@/api/MetadataSubjectAPI.ts";
import {ErrorCode} from "@/api/Response.ts";

// 定义字段结构类型
export interface TableColumnField {
    id: string; // 唯一标识，用于 Table 操作
    name: string; // 字段名
    type: string; // 字段类型
    comment: string; // 字段注释
    nullable: boolean; // 是否可为空
    secretLevel: string; // 字段密级
}

export interface TablePartitionField {
    id: string; // 唯一标识，用于 Table 操作
    columnName: string; // 分区字段
    partitionType: PartitionType; // 分区类型
    param?: number; // BUCKET/TRUNCATE 参数
    sortOrder?: number; // 分区顺序
}

const {Title, Text} = Typography;
const {Option} = Select;

// 常用字段类型
const FIELD_TYPE_OPTIONS = [
    "STRING",
    "LONG",
    "FLOAT",
    "DOUBLE",
    "BOOLEAN",
    "DATE",
    "TIMESTAMP",
    "TIMESTAMP_TZ",
    "TIME",
    "BINARY",
    "UUID",
    "DECIMAL",
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

// 分区类型选项
const PARTITION_TYPE_OPTIONS: { value: PartitionType; label: string; needParam?: boolean }[] = [
    {value: "IDENTITY", label: "原始字段"},
    {value: "DAY", label: "按天"},
    {value: "HOUR", label: "按小时"},
    {value: "MONTH", label: "按月"},
    {value: "YEAR", label: "按年"},
    {value: "BUCKET", label: "分桶", needParam: true},
    {value: "TRUNCATE", label: "截断", needParam: true},
];

const DATE_PARTITION_TYPES: PartitionType[] = ["DAY", "HOUR", "MONTH", "YEAR"];

// 页面模式类型
type PageMode = 'create' | 'edit' | 'import' | 'copy';

const TableEditPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // 从 location.state 获取传递的数据
    const locationState = location.state as {
        mode?: PageMode;
        tableId?: string;
        importData?: MetadataTableDTO;
    } | null;

    const mode: PageMode = locationState?.mode || 'create';
    const tableId = locationState?.tableId;
    const importData = locationState?.importData;

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
    // 分区列表状态
    const [partitions, setPartitions] = useState<TablePartitionField[]>([]);
    // 主题树数据
    const [subjectTreeData, setSubjectTreeData] = useState<SubjectDTO[]>([]);
    // 员工列表数据
    const [employeeList, setEmployeeList] = useState<EmployeeAPIDTO[]>([]);
    // 加载状态
    const [loading, setLoading] = useState(false);
    // 页面加载状态
    const [pageLoading, setPageLoading] = useState(true);
    // 主题加载状态
    const [subjectLoading, setSubjectLoading] = useState(false);
    // 初始数据
    const [initialData, setInitialData] = useState<MetadataTableDTO | null>(null);

    // 根据主题编码在主题树中查找完整路径
    const findSubjectPath = (subjectCode: string, nodes: SubjectDTO[], path: string[] = []): string[] | null => {
        for (const node of nodes) {
            const currentPath = [...path, node.subjectCode];
            if (node.subjectCode === subjectCode) {
                return currentPath;
            }
            if (node.children && node.children.length > 0) {
                const found = findSubjectPath(subjectCode, node.children, currentPath);
                if (found) return found;
            }
        }
        return null;
    };

    // 根据主题编码找到其所属的一级主题（根节点）
    const findRootSubject = (subjectCode: string, nodes: SubjectDTO[]): SubjectDTO | null => {
        for (const node of nodes) {
            if (node.subjectCode === subjectCode) {
                return node;
            }
            if (node.children && node.children.length > 0) {
                const findInChildren = (targetCode: string, children: SubjectDTO[]): boolean => {
                    for (const child of children) {
                        if (child.subjectCode === targetCode) return true;
                        if (child.children) {
                            if (findInChildren(targetCode, child.children)) return true;
                        }
                    }
                    return false;
                };
                if (findInChildren(subjectCode, node.children)) {
                    return node;
                }
            }
        }
        return null;
    };

    // 获取可用的主题树数据（编辑模式下只显示当前主题所在的树）
    const getAvailableSubjectTree = (): SubjectDTO[] => {
        if (!initialData?.subjectCode) {
            return subjectTreeData;
        }
        const rootSubject = findRootSubject(initialData.subjectCode, subjectTreeData);
        return rootSubject ? [rootSubject] : subjectTreeData;
    };

    // 获取页面标题
    const getPageTitle = () => {
        switch (mode) {
            case 'edit':
                return '编辑元数据表';
            case 'import':
                return '导入元数据表';
            case 'copy':
                return '复制元数据表';
            default:
                return '创建元数据表';
        }
    };

    // 初始化加载
    useEffect(() => {
        const init = async () => {
            try {
                setPageLoading(true);
                // 并行加载主题树和员工列表
                await Promise.all([loadSubjectTree(), loadEmployeeList()]);

                // 如果是编辑模式，加载表详情
                if (mode === 'edit' && tableId) {
                    const data = await getMetadataTableById(tableId);
                    setInitialData(data);
                } else if ((mode === 'import' || mode === 'copy') && importData) {
                    setInitialData(importData);
                }
            } catch (error) {
                console.error("初始化失败:", error);
                message.error("初始化失败");
            } finally {
                setPageLoading(false);
            }
        };
        init();
    }, [mode, tableId, importData]);

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

    const loadEmployeeList = async () => {
        try {
            const data = await listEmployees();
            setEmployeeList(data.data || []);
        } catch (error) {
            console.error("加载员工列表失败:", error);
            message.error("加载员工列表失败");
        }
    };

    // 初始化表单数据
    useEffect(() => {
        if (!pageLoading && initialData && subjectTreeData.length > 0) {
            const isEditMode = mode === 'edit';

            if (isEditMode) {
                // 编辑模式：处理 subjectCode 和 layerCode
                let subjectCodePath: string[] = [];
                if (initialData.subjectCode) {
                    const foundPath = findSubjectPath(initialData.subjectCode, subjectTreeData);
                    subjectCodePath = foundPath || [initialData.subjectCode];
                }
                // 取一级主题
                let firstSubjectIndex = -1;
                subjectTreeData.forEach((subject, i) => {
                    if (subject.subjectCode === initialData.subjectCode) {
                        firstSubjectIndex = i;
                    } else {
                        if (subject.children && subject.children.length > 0) {
                            subject.children.forEach((childSubject) => {
                                if (childSubject.subjectCode === initialData.subjectCode) {
                                    firstSubjectIndex = i;
                                }
                            });
                        }
                    }
                });

                // 处理表名：从完整表名中提取后缀
                const tableNameSuffix = firstSubjectIndex >= 0
                    ? initialData.name.replace(initialData.layerCode + '_' + subjectTreeData[firstSubjectIndex].subjectCode + '_', '')
                    : initialData.name;

                form.setFieldsValue({
                    name: tableNameSuffix,
                    subjectCode: subjectCodePath,
                    layerCode: initialData.layerCode,
                    owner: initialData.owner,
                    secretLevel: initialData.secretLevel || "L1",
                    onlineStatus: initialData.onlineStatus || "ONLINE",
                    comment: initialData.comment,
                    catalog: initialData.table?.catalog,
                    schema: initialData.table?.schema,
                });
            } else if (mode === 'copy') {
                // 复制模式：保留主题和分层，清空表名和负责人
                let subjectCodePath: string[] = [];
                if (initialData.subjectCode) {
                    const foundPath = findSubjectPath(initialData.subjectCode, subjectTreeData);
                    subjectCodePath = foundPath || [initialData.subjectCode];
                }
                form.setFieldsValue({
                    name: '',
                    subjectCode: subjectCodePath,
                    layerCode: initialData.layerCode || 'ODS',
                    owner: '',
                    secretLevel: initialData.secretLevel || 'L1',
                    onlineStatus: initialData.onlineStatus || 'ONLINE',
                    comment: initialData.comment || '',
                    catalog: initialData.table?.catalog,
                    schema: initialData.table?.schema,
                });
            } else {
                // 导入模式：只有表结构信息
                form.setFieldsValue({
                    name: initialData.name,
                    subjectCode: [],
                    layerCode: "ODS",
                    owner: "",
                    secretLevel: "L1",
                    onlineStatus: "ONLINE",
                    comment: initialData.comment || "",
                    catalog: initialData.table?.catalog,
                    schema: initialData.table?.schema,
                });
            }

            // 填充字段列表
            if (initialData.table?.columns) {
                setFields(
                    initialData.table.columns.map((column, index) => ({
                        id: `field_${index}_${Date.now()}`,
                        name: column.name,
                        type: column.type,
                        comment: column.comment || "",
                        nullable: column.nullable,
                        secretLevel: column.secretLevel || "L1"
                    })),
                );
            }
            if (initialData.table?.partitions) {
                setPartitions(
                    initialData.table.partitions.map((partition, index) => ({
                        id: `partition_${index}_${Date.now()}`,
                        columnName: partition.columnName,
                        partitionType: partition.partitionType,
                        param: partition.param,
                        sortOrder: partition.sortOrder ?? index,
                    })),
                );
            } else {
                setPartitions([]);
            }
        }
    }, [pageLoading, initialData, subjectTreeData, mode]);

    // 返回列表页
    const handleBack = (tableName?: string) => {
        if (tableName && typeof tableName === 'string') {
            navigate(`/meta/metadata/metadata_table?search=${encodeURIComponent(tableName)}`);
        } else {
            navigate('/meta/metadata/metadata_table');
        }
    };

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
        const target = fields.find((field) => field.id === id);
        setFields(fields.filter((field) => field.id !== id));
        if (target?.name) {
            setPartitions(partitions.filter((partition) => partition.columnName !== target.name));
        }
    };

    // 编辑字段属性
    const updateField = (id: string, key: keyof TableColumnField, value: any) => {
        const oldField = fields.find((field) => field.id === id);
        setFields(
            fields.map((field) =>
                field.id === id ? {...field, [key]: value} : field,
            ),
        );
        if (key === "name" && oldField?.name) {
            setPartitions(partitions.map((partition) =>
                partition.columnName === oldField.name ? {...partition, columnName: value} : partition
            ));
        }
    };

    // 新增分区
    const addPartition = () => {
        const firstField = fields[0]?.name || "";
        const newPartition: TablePartitionField = {
            id: `partition_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            columnName: firstField,
            partitionType: "IDENTITY",
            sortOrder: partitions.length,
        };
        setPartitions([...partitions, newPartition]);
    };

    // 删除分区
    const deletePartition = (id: string) => {
        setPartitions(partitions.filter((partition) => partition.id !== id));
    };

    // 编辑分区属性
    const updatePartition = (id: string, key: keyof TablePartitionField, value: any) => {
        setPartitions(partitions.map((partition) => {
            if (partition.id !== id) {
                return partition;
            }
            const next = {...partition, [key]: value};
            if (key === "partitionType" && !["BUCKET", "TRUNCATE"].includes(value)) {
                next.param = undefined;
            }
            return next;
        }));
    };

    // 获取分区类型选项
    const getPartitionTypeOptions = (columnName: string) => {
        const field = fields.find((item) => item.name === columnName);
        const isDateField = ["DATE", "TIMESTAMP", "TIMESTAMP_TZ", "TIME"].includes(field?.type || "");
        if (isDateField) {
            return PARTITION_TYPE_OPTIONS;
        }
        return PARTITION_TYPE_OPTIONS.filter((option) => !DATE_PARTITION_TYPES.includes(option.value));
    };

    // 校验分区配置
    const validatePartitions = () => {
        const fieldNames = new Set(fields.map((field) => field.name).filter(Boolean));
        const partitionKeys = new Set<string>();
        for (const partition of partitions) {
            if (!partition.columnName) {
                message.warning("存在未选择字段的分区，请完善！");
                return false;
            }
            if (!fieldNames.has(partition.columnName)) {
                message.warning(`分区字段【${partition.columnName}】不存在，请修改！`);
                return false;
            }
            const key = `${partition.partitionType}:${partition.columnName}`;
            if (partitionKeys.has(key)) {
                message.warning(`分区配置【${partition.partitionType}(${partition.columnName})】重复，请修改！`);
                return false;
            }
            partitionKeys.add(key);
            if (["BUCKET", "TRUNCATE"].includes(partition.partitionType) && (!partition.param || partition.param <= 0)) {
                message.warning(`${partition.partitionType} 分区参数必须为正整数！`);
                return false;
            }
        }
        return true;
    };

    // 表单提交
    const handleSubmit = async () => {
        try {
            setLoading(true);
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

            if (mode !== 'edit' && !validatePartitions()) {
                setLoading(false);
                return;
            }

            // 构建 TableValObj
            const tableValObj = {
                catalog: formValues.catalog || "iceberg",
                schema: formValues.layerCode?.toLowerCase() || "ods",
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
                partitions: mode === 'edit' ? undefined : partitions.map((partition, index) => ({
                    columnName: partition.columnName,
                    partitionType: partition.partitionType,
                    param: ["BUCKET", "TRUNCATE"].includes(partition.partitionType) ? partition.param : undefined,
                    sortOrder: index,
                })),
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

            if (mode === 'edit' && tableId) {
                await updateMetadataTable(tableId, cmd).then(res=>{
                    if (res.code === ErrorCode.SUCCESS){
                        // 返回列表页，带上表名搜索参数
                        handleBack(tableValObj.name);
                    }
                });
            } else {
                await createMetadataTable(cmd).then(res=>{
                    if (res.code === ErrorCode.SUCCESS){
                        // 返回列表页，带上表名搜索参数
                        handleBack(tableValObj.name);
                    }
                });
            }
        } catch (error: any) {
            console.error("表单提交失败:", error);
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
            width: 200,
            render: (text, record) => (
                <Input
                    value={text}
                    placeholder="输入字段名"
                    onChange={(e) => updateField(record.id, "name", e.target.value)}
                    maxLength={64}
                />
            ),
        },
        {
            title: "字段类型",
            dataIndex: "type",
            key: "type",
            width: 150,
            render: (text, record) => (
                <Select
                    value={text}
                    onChange={(value) => updateField(record.id, "type", value)}
                    style={{width: 130}}
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
            width: 120,
            render: (text, record) => (
                <Select
                    value={text}
                    onChange={(value) => updateField(record.id, "nullable", value)}
                    style={{width: 100}}
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
            width: 140,
            render: (text, record) => (
                <Select
                    options={SECRET_LEVEL_OPTIONS}
                    value={text}
                    style={{width: 120}}
                    onChange={(value) => updateField(record.id, "secretLevel", value)}
                    placeholder="请选择密级"
                />
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
            width: 80,
            render: (_, record) => (
                <Popconfirm
                    title="确定删除该字段吗？"
                    onConfirm={() => deleteField(record.id)}
                    okText="是"
                    cancelText="否"
                >
                    <Text type="danger" style={{cursor: 'pointer'}}>删除</Text>
                </Popconfirm>
            ),
        },
    ];

    // 分区列表列配置
    const partitionColumns: TableProps<TablePartitionField>["columns"] = [
        {
            title: "分区字段",
            dataIndex: "columnName",
            key: "columnName",
            width: 220,
            render: (text, record) => mode === 'edit' ? (
                <Text>{text || '-'}</Text>
            ) : (
                <Select
                    value={text || undefined}
                    placeholder="请选择字段"
                    style={{width: 200}}
                    onChange={(value) => updatePartition(record.id, "columnName", value)}
                    options={fields.map((field) => ({
                        label: `${field.name || '未命名字段'} (${field.type})`,
                        value: field.name,
                        disabled: !field.name,
                    }))}
                />
            ),
        },
        {
            title: "分区类型",
            dataIndex: "partitionType",
            key: "partitionType",
            width: 180,
            render: (text, record) => mode === 'edit' ? (
                <Text>{PARTITION_TYPE_OPTIONS.find((option) => option.value === text)?.label || text}</Text>
            ) : (
                <Select
                    value={text}
                    style={{width: 150}}
                    onChange={(value) => updatePartition(record.id, "partitionType", value)}
                    options={getPartitionTypeOptions(record.columnName)}
                />
            ),
        },
        {
            title: "参数",
            dataIndex: "param",
            key: "param",
            width: 160,
            render: (text, record) => {
                const needParam = ["BUCKET", "TRUNCATE"].includes(record.partitionType);
                if (mode === 'edit') {
                    return <Text>{needParam ? text || '-' : '-'}</Text>;
                }
                return (
                    <InputNumber
                        min={1}
                        precision={0}
                        disabled={!needParam}
                        value={needParam ? text : undefined}
                        placeholder={needParam ? (record.partitionType === "BUCKET" ? "桶数" : "截断长度") : "无需参数"}
                        style={{width: 130}}
                        onChange={(value) => updatePartition(record.id, "param", value || undefined)}
                    />
                );
            },
        },
        {
            title: "说明",
            key: "description",
            render: (_, record) => {
                if (record.partitionType === "BUCKET") {
                    return <Text type="secondary">按字段哈希分桶，参数为桶数</Text>;
                }
                if (record.partitionType === "TRUNCATE") {
                    return <Text type="secondary">按字段值截断，参数为截断长度</Text>;
                }
                if (DATE_PARTITION_TYPES.includes(record.partitionType)) {
                    return <Text type="secondary">适用于日期/时间字段</Text>;
                }
                return <Text type="secondary">按字段原值分区</Text>;
            },
        },
        {
            title: "操作",
            key: "action",
            width: 80,
            render: (_, record) => mode === 'edit' ? null : (
                <Popconfirm
                    title="确定删除该分区吗？"
                    onConfirm={() => deletePartition(record.id)}
                    okText="是"
                    cancelText="否"
                >
                    <Text type="danger" style={{cursor: 'pointer'}}>删除</Text>
                </Popconfirm>
            ),
        },
    ];

    return (
        <div style={{padding: 0}}>
            {/* 页面头部 */}
            <div style={{
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Space>
                    <Button icon={<ArrowLeftOutlined/>} onClick={handleBack}>
                        返回
                    </Button>
                    <Title level={4} style={{margin: 0}}>{getPageTitle()}</Title>
                </Space>
                <Space>
                    <Button onClick={handleBack}>取消</Button>
                    <Button
                        type="primary"
                        icon={<SaveOutlined/>}
                        onClick={handleSubmit}
                        loading={loading}
                    >
                        {mode === 'edit' ? '保存修改' : (mode === 'copy' ? '创建表' : '创建表')}
                    </Button>
                </Space>
            </div>

            {/* 表单内容 */}
            <Form form={form} layout="vertical">
                <Row gutter={24}>
                    {/* 左侧：基本信息 */}
                    <Col span={12}>
                        <Card title="基本信息" size="small" loading={pageLoading}>
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
                                extra="表名将自动生成：{layerCode}_{一级主题subjectCode}_{name}"
                            >
                                <Input
                                    placeholder="例如：order_info"
                                    maxLength={255}
                                    disabled={mode === 'edit'}
                                    prefix={
                                        <span style={{color: "rgba(0, 0, 0, 0.45)"}}>
                                            {Form.useWatch("layerCode", form)?.toLowerCase()}_
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
                                            options={getAvailableSubjectTree().map((item) => ({
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
                                        <Select
                                            options={LAYER_OPTIONS}
                                            placeholder="请选择数据分层"
                                            disabled={mode === 'edit'}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Form.Item
                                name="comment"
                                label="表描述"
                                rules={[{required: true, message: "请输入表描述"}]}
                            >
                                <Input.TextArea
                                    placeholder="请输入表描述"
                                    maxLength={500}
                                    rows={3}
                                    showCount
                                />
                            </Form.Item>
                        </Card>
                    </Col>

                    {/* 右侧：管理信息 */}
                    <Col span={12}>
                        <Card title="管理信息" size="small" loading={pageLoading}>
                            <Row gutter={16}>
                                <Col span={12}>
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
                                <Col span={12}>
                                    <Form.Item
                                        name="secretLevel"
                                        label="密级"
                                        initialValue="L1"
                                        rules={[{required: true, message: "请选择密级"}]}
                                    >
                                        <Select options={SECRET_LEVEL_OPTIONS} placeholder="请选择密级"/>
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Row gutter={16}>
                                <Col span={12}>
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
                        </Card>
                    </Col>
                </Row>

                {/* 字段列表 */}
                <Card
                    title={
                        <Space>
                            <span>字段列表</span>
                            <Button type="dashed" size="small" onClick={addField}>
                                + 新增字段
                            </Button>
                        </Space>
                    }
                    size="small"
                    style={{marginTop: 16}}
                >
                    {fields.length > 0 ? (
                        <Table
                            dataSource={fields}
                            columns={columns}
                            rowKey="id"
                            size="small"
                            pagination={false}
                            scroll={{x: 'max-content'}}
                            bordered
                        />
                    ) : (
                        <div style={{textAlign: "center", padding: 40, color: "#999"}}>
                            暂无字段，请点击「新增字段」添加
                        </div>
                    )}
                </Card>

                {/* 分区配置 */}
                <Card
                    title={
                        <Space>
                            <span>分区配置</span>
                            {mode !== 'edit' && (
                                <Button type="dashed" size="small" onClick={addPartition} disabled={fields.length === 0}>
                                    + 新增分区
                                </Button>
                            )}
                        </Space>
                    }
                    size="small"
                    style={{marginTop: 16}}
                    extra={mode === 'edit' ? <Text type="secondary">已有表分区仅展示，本次不支持修改</Text> : <Text type="secondary">可选，不配置则创建非分区表</Text>}
                >
                    {partitions.length > 0 ? (
                        <Table
                            dataSource={partitions}
                            columns={partitionColumns}
                            rowKey="id"
                            size="small"
                            pagination={false}
                            scroll={{x: 'max-content'}}
                            bordered
                        />
                    ) : (
                        <div style={{textAlign: "center", padding: 32, color: "#999"}}>
                            未设置分区
                        </div>
                    )}
                </Card>
            </Form>
        </div>
    );
};

export default TableEditPage;
