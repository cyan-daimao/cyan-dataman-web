import React, { useEffect, useState } from 'react';
import {
    Button,
    Card,
    Form,
    Input,
    Radio,
    Table,
    Space,
    Select,
    message,
    Row,
    Col,
} from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { datasetApi, DatasetCmd, DatasetField, FieldRole, SourceType } from '@/api/DatabiApi';

const { TextArea } = Input;

const DatasetForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEdit = !!id;
    const [form] = Form.useForm();
    const [sourceType, setSourceType] = useState<SourceType>(SourceType.TABLE);
    const [fields, setFields] = useState<DatasetField[]>([]);
    const [sourceSql, setSourceSql] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isEdit && id) {
            setLoading(true);
            datasetApi
                .getById(id)
                .then((res) => {
                    if (res.code === 200) {
                        const d = res.data;
                        form.setFieldsValue({
                            name: d.name,
                            description: d.description,
                            sourceType: d.sourceType,
                            sourceTable: d.sourceTable,
                            sourceSql: d.sourceSql,
                        });
                        setSourceType(d.sourceType);
                        setSourceSql(d.sourceSql || '');
                        setFields(d.fields || []);
                    } else {
                        message.error(res.message || '获取数据集详情失败');
                    }
                })
                .catch(() => message.error('获取数据集详情失败'))
                .finally(() => setLoading(false));
        }
    }, [isEdit, id, form]);

    const handleAddField = () => {
        setFields([...fields, { name: '', comment: '', dataType: 'STRING', role: FieldRole.DIMENSION }]);
    };

    const handleRemoveField = (index: number) => {
        const next = [...fields];
        next.splice(index, 1);
        setFields(next);
    };

    const handleFieldChange = (index: number, key: keyof DatasetField, value: string) => {
        const next = [...fields];
        next[index] = { ...next[index], [key]: value };
        setFields(next);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            const cmd: DatasetCmd = {
                name: values.name,
                description: values.description,
                sourceType: values.sourceType,
                sourceTable: values.sourceType === SourceType.TABLE ? values.sourceTable : undefined,
                sourceSql: values.sourceType === SourceType.SQL ? values.sourceSql : undefined,
                fields: fields.filter((f) => f.name.trim()),
            };

            // 校验字段
            if (!cmd.fields || cmd.fields.length === 0) {
                message.warning('请至少配置一个字段');
                return;
            }

            setSaving(true);
            let res;
            if (isEdit && id) {
                res = await datasetApi.update(id, cmd);
            } else {
                res = await datasetApi.create(cmd);
            }
            if (res.code === 200) {
                message.success(isEdit ? '更新成功' : '创建成功');
                navigate('/bi/dataset');
            } else {
                message.error(res.message || '保存失败');
            }
        } catch (e) {
            // 表单校验失败
        } finally {
            setSaving(false);
        }
    };

    const fieldColumns = [
        {
            title: '字段名',
            dataIndex: 'name',
            key: 'name',
            render: (_: unknown, __: DatasetField, index: number) => (
                <Input
                    value={fields[index].name}
                    onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                    placeholder="字段名"
                />
            ),
        },
        {
            title: '中文名',
            dataIndex: 'comment',
            key: 'comment',
            render: (_: unknown, __: DatasetField, index: number) => (
                <Input
                    value={fields[index].comment}
                    onChange={(e) => handleFieldChange(index, 'comment', e.target.value)}
                    placeholder="中文名"
                />
            ),
        },
        {
            title: '类型',
            dataIndex: 'dataType',
            key: 'dataType',
            render: (_: unknown, __: DatasetField, index: number) => (
                <Select
                    value={fields[index].dataType}
                    onChange={(v) => handleFieldChange(index, 'dataType', v)}
                    style={{ width: 120 }}
                    options={[
                        { label: 'STRING', value: 'STRING' },
                        { label: 'NUMBER', value: 'NUMBER' },
                        { label: 'DATE', value: 'DATE' },
                        { label: 'DATETIME', value: 'DATETIME' },
                        { label: 'BOOLEAN', value: 'BOOLEAN' },
                    ]}
                />
            ),
        },
        {
            title: '角色',
            dataIndex: 'role',
            key: 'role',
            render: (_: unknown, __: DatasetField, index: number) => (
                <Select
                    value={fields[index].role}
                    onChange={(v) => handleFieldChange(index, 'role', v)}
                    style={{ width: 120 }}
                    options={[
                        { label: '维度', value: FieldRole.DIMENSION },
                        { label: '指标', value: FieldRole.METRIC },
                    ]}
                />
            ),
        },
        {
            title: '操作',
            key: 'action',
            render: (_: unknown, __: DatasetField, index: number) => (
                <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveField(index)}
                >
                    删除
                </Button>
            ),
        },
    ];

    return (
        <Card
            loading={loading}
            title={isEdit ? '编辑数据集' : '创建数据集'}
            extra={
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/bi/dataset')}>
                    返回
                </Button>
            }
        >
            <Form form={form} layout="vertical" initialValues={{ sourceType: SourceType.TABLE }}>
                <Row gutter={24}>
                    <Col span={12}>
                        <Form.Item
                            name="name"
                            label="数据集名称"
                            rules={[{ required: true, message: '请输入数据集名称' }]}
                        >
                            <Input placeholder="请输入数据集名称" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="description" label="描述">
                            <TextArea rows={1} placeholder="请输入描述" />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item
                    name="sourceType"
                    label="数据来源类型"
                    rules={[{ required: true }]}
                >
                    <Radio.Group
                        onChange={(e) => setSourceType(e.target.value)}
                        disabled={isEdit}
                    >
                        <Radio value={SourceType.TABLE}>数据表</Radio>
                        <Radio value={SourceType.SQL}>自定义SQL</Radio>
                    </Radio.Group>
                </Form.Item>

                {sourceType === SourceType.TABLE && (
                    <Form.Item
                        name="sourceTable"
                        label="表名"
                        rules={[{ required: true, message: '请输入表名' }]}
                    >
                        <Input placeholder="请输入数据表名，如 db.table" />
                    </Form.Item>
                )}

                {sourceType === SourceType.SQL && (
                    <Form.Item
                        name="sourceSql"
                        label="SQL 语句"
                        rules={[{ required: true, message: '请输入 SQL 语句' }]}
                    >
                        <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, overflow: 'hidden' }}>
                            <Editor
                                height={200}
                                defaultLanguage="sql"
                                value={sourceSql}
                                onChange={(v) => {
                                    setSourceSql(v || '');
                                    form.setFieldValue('sourceSql', v || '');
                                }}
                                options={{ minimap: { enabled: false }, scrollBeyondLastLine: false }}
                            />
                        </div>
                    </Form.Item>
                )}

                <div style={{ marginBottom: 12, fontWeight: 'bold' }}>字段配置</div>
                <Table
                    rowKey={(record, index) => `${record.name}-${index}`}
                    dataSource={fields}
                    columns={fieldColumns}
                    pagination={false}
                    size="small"
                    locale={{ emptyText: '暂无字段，请点击下方按钮添加' }}
                />
                <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={handleAddField}
                    style={{ marginTop: 12, width: '100%' }}
                >
                    添加字段
                </Button>

                <div style={{ marginTop: 24, textAlign: 'right' }}>
                    <Space>
                        <Button onClick={() => navigate('/bi/dataset')}>取消</Button>
                        <Button type="primary" loading={saving} onClick={handleSave}>
                            保存
                        </Button>
                    </Space>
                </div>
            </Form>
        </Card>
    );
};

export default DatasetForm;
