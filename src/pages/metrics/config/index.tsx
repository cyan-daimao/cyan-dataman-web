import React, { useEffect, useState } from 'react';
import {
    Tabs, Table, Button, Space, Modal, Form, Input, Select, InputNumber, message,
    Empty, Popconfirm, Tag, Tree, TreeSelect, Spin, Typography, Card, DatePicker,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
    ModifierApi, ModifierDTO, ModifierCmd,
    TimePeriodApi, TimePeriodDTO, TimePeriodCmd,
} from '@/api/MetricConfigApi';
import { PeriodType, RelativeUnit } from '@/api/MetricApi';
import dayjs from 'dayjs';
import { MetricSubjectApi, MetricSubject, MetricSubjectCmd } from '@/api/MetricSubjectApi';

const { TabPane } = Tabs;
const { TextArea } = Input;

// ==================== 修饰词管理 ====================

const ModifierManager: React.FC = () => {
    const [data, setData] = useState<ModifierDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState<ModifierDTO | null>(null);
    const [form] = Form.useForm();
    const [pageNum, setPageNum] = useState(1);
    const [pageSize] = useState(20);
    const [total, setTotal] = useState(0);

    const fetchData = async (page = 1) => {
        setLoading(true);
        try {
            const res = await ModifierApi.page({ pageNum: page, pageSize });
            if (res.code === 200 && res.data) {
                setData(res.data.list);
                setTotal(res.data.total);
            }
        } catch {
            message.error('获取修饰词列表失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSave = async (values: ModifierCmd) => {
        try {
            if (editing) {
                await ModifierApi.update(editing.id, values);
                message.success('更新成功');
            } else {
                await ModifierApi.create(values);
                message.success('创建成功');
            }
            setModalVisible(false);
            form.resetFields();
            setEditing(null);
            fetchData(pageNum);
        } catch {
            message.error('保存失败');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await ModifierApi.delete(id);
            message.success('删除成功');
            fetchData(pageNum);
        } catch {
            message.error('删除失败');
        }
    };

    const columns = [
        { title: '修饰词名称', dataIndex: 'modifierName', key: 'modifierName' },
        { title: '字段名', dataIndex: 'fieldName', key: 'fieldName' },
        { title: '运算符', dataIndex: 'operator', key: 'operator' },
        {
            title: '可选值',
            dataIndex: 'fieldValues',
            key: 'fieldValues',
            render: (vals: string[]) => (
                <Space size="small" wrap>
                    {vals.map(v => <Tag key={v}>{v}</Tag>)}
                </Space>
            ),
        },
        { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
        {
            title: '操作',
            key: 'action',
            render: (_: unknown, record: ModifierDTO) => (
                <Space>
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => {
                            setEditing(record);
                            form.setFieldsValue({
                                modifierName: record.modifierName,
                                fieldName: record.fieldName,
                                operator: record.operator,
                                fieldValues: record.fieldValues.join(','),
                                description: record.description,
                            });
                            setModalVisible(true);
                        }}
                    >
                        编辑
                    </Button>
                    <Popconfirm
                        title="确认删除？"
                        onConfirm={() => handleDelete(record.id)}
                    >
                        <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: 16, textAlign: 'right' }}>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                        setEditing(null);
                        form.resetFields();
                        setModalVisible(true);
                    }}
                >
                    新增修饰词
                </Button>
            </div>
            <Table
                rowKey="id"
                columns={columns}
                dataSource={data}
                loading={loading}
                pagination={{ current: pageNum, pageSize, total, onChange: setPageNum, showTotal: (t) => `共 ${t} 条` }}
                locale={{ emptyText: <Empty description="暂无修饰词" /> }}
            />
            <Modal
                title={editing ? '编辑修饰词' : '新增修饰词'}
                open={modalVisible}
                onOk={() => form.submit()}
                onCancel={() => { setModalVisible(false); form.resetFields(); setEditing(null); }}
                destroyOnClose
            >
                <Form form={form} onFinish={handleSave} layout="vertical">
                    <Form.Item name="modifierName" label="修饰词名称" rules={[{ required: true }]}>
                        <Input placeholder="如：APP渠道" />
                    </Form.Item>
                    <Form.Item name="fieldName" label="字段名" rules={[{ required: true }]}>
                        <Input placeholder="如：channel" />
                    </Form.Item>
                    <Form.Item name="operator" label="运算符" rules={[{ required: true }]}>
                        <Select placeholder="选择运算符">
                            <Select.Option value="=">等于(=)</Select.Option>
                            <Select.Option value="!=">不等于(!=)</Select.Option>
                            <Select.Option value="IN">包含(IN)</Select.Option>
                            <Select.Option value="NOT_IN">不包含(NOT IN)</Select.Option>
                            <Select.Option value=">">大于(&gt;)</Select.Option>
                            <Select.Option value="<">小于(&lt;)</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item
                        name="fieldValues"
                        label="可选值（逗号分隔）"
                        rules={[{ required: true }]}
                        getValueFromEvent={(e: React.ChangeEvent<HTMLInputElement>) => e.target.value.split(',').map(s => s.trim()).filter(Boolean)}
                        getValueProps={(value: string[] | string) => ({ value: Array.isArray(value) ? value.join(',') : value })}
                    >
                        <Input placeholder="如：APP,WEB,H5" />
                    </Form.Item>
                    <Form.Item name="description" label="描述">
                        <TextArea rows={2} placeholder="描述该修饰词的业务含义" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

// ==================== 时间周期管理 ====================

const TimePeriodManager: React.FC = () => {
    const [data, setData] = useState<TimePeriodDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState<TimePeriodDTO | null>(null);
    const [form] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await TimePeriodApi.list();
            if (res.code === 200 && res.data) {
                setData(res.data);
            }
        } catch {
            message.error('获取时间周期列表失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async (values: TimePeriodCmd) => {
        try {
            if (editing) {
                await TimePeriodApi.update(editing.id, values);
                message.success('更新成功');
            } else {
                await TimePeriodApi.create(values);
                message.success('创建成功');
            }
            setModalVisible(false);
            form.resetFields();
            setEditing(null);
            fetchData();
        } catch {
            message.error('保存失败');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await TimePeriodApi.delete(id);
            message.success('删除成功');
            fetchData();
        } catch {
            message.error('删除失败');
        }
    };

    const periodType = Form.useWatch('periodType', form);

    const columns = [
        { title: '周期编码', dataIndex: 'periodCode', key: 'periodCode' },
        { title: '周期名称', dataIndex: 'periodName', key: 'periodName' },
        {
            title: '类型',
            dataIndex: 'periodType',
            key: 'periodType',
            render: (v: PeriodType) => v === PeriodType.RELATIVE ? '相对' : '绝对',
        },
        {
            title: '规则',
            key: 'rule',
            render: (_: unknown, record: TimePeriodDTO) => {
                if (record.periodType === PeriodType.RELATIVE) {
                    return `前 ${record.relativeValue} ${record.relativeUnit === RelativeUnit.DAY ? '天' : record.relativeUnit === RelativeUnit.WEEK ? '周' : record.relativeUnit === RelativeUnit.MONTH ? '月' : '年'}`;
                }
                return `${record.startDate} ~ ${record.endDate}`;
            },
        },
        {
            title: '操作',
            key: 'action',
            width: 150,
            render: (_: unknown, record: TimePeriodDTO) => (
                <Space>
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => {
                            setEditing(record);
                            form.setFieldsValue(record);
                            setModalVisible(true);
                        }}
                    >
                        编辑
                    </Button>
                    <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
                        <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: 16, textAlign: 'right' }}>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                        setEditing(null);
                        form.resetFields();
                        setModalVisible(true);
                    }}
                >
                    新增时间周期
                </Button>
            </div>
            <Table
                rowKey="id"
                columns={columns}
                dataSource={data}
                loading={loading}
                pagination={false}
                locale={{ emptyText: <Empty description="暂无时间周期" /> }}
            />
            <Modal
                title={editing ? '编辑时间周期' : '新增时间周期'}
                open={modalVisible}
                onOk={() => form.submit()}
                onCancel={() => { setModalVisible(false); form.resetFields(); setEditing(null); }}
                destroyOnClose
            >
                <Form form={form} onFinish={handleSave} layout="vertical">
                    <Form.Item
                        name="periodCode"
                        label="周期编码"
                        rules={[{ required: true, message: '请输入周期编码' }]}
                    >
                        <Input placeholder="如：LAST_7D" disabled={!!editing} />
                    </Form.Item>
                    <Form.Item name="periodName" label="周期名称" rules={[{ required: true }]}>
                        <Input placeholder="如：近7天" />
                    </Form.Item>
                    <Form.Item name="periodType" label="类型" rules={[{ required: true }]}>
                        <Select placeholder="选择类型">
                            <Select.Option value={PeriodType.RELATIVE}>相对偏移</Select.Option>
                            <Select.Option value={PeriodType.ABSOLUTE}>绝对日期</Select.Option>
                        </Select>
                    </Form.Item>
                    {periodType === PeriodType.RELATIVE && (
                        <>
                            <Form.Item name="relativeValue" label="相对偏移值" rules={[{ required: true }]}>
                                <InputNumber style={{ width: '100%' }} placeholder="如：-7" />
                            </Form.Item>
                            <Form.Item name="relativeUnit" label="单位" rules={[{ required: true }]}>
                                <Select placeholder="选择单位">
                                    <Select.Option value={RelativeUnit.DAY}>天</Select.Option>
                                    <Select.Option value={RelativeUnit.WEEK}>周</Select.Option>
                                    <Select.Option value={RelativeUnit.MONTH}>月</Select.Option>
                                    <Select.Option value={RelativeUnit.YEAR}>年</Select.Option>
                                </Select>
                            </Form.Item>
                        </>
                    )}
                    {periodType === PeriodType.ABSOLUTE && (
                        <>
                            <Form.Item
                                name="startDate"
                                label="开始日期"
                                rules={[{ required: true }]}
                                getValueProps={(value) => ({ value: value ? dayjs(value) : null })}
                                getValueFromEvent={(date) => date ? date.format('YYYY-MM-DD') : undefined}
                            >
                                <DatePicker style={{ width: '100%' }} placeholder="选择开始日期" />
                            </Form.Item>
                            <Form.Item
                                name="endDate"
                                label="结束日期"
                                rules={[{ required: true }]}
                                getValueProps={(value) => ({ value: value ? dayjs(value) : null })}
                                getValueFromEvent={(date) => date ? date.format('YYYY-MM-DD') : undefined}
                            >
                                <DatePicker style={{ width: '100%' }} placeholder="选择结束日期" />
                            </Form.Item>
                        </>
                    )}
                </Form>
            </Modal>
        </div>
    );
};

// ==================== 主题域管理 ====================

const { Text } = Typography;

const SubjectDomainManager: React.FC = () => {
    const [treeData, setTreeData] = useState<MetricSubject[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState<MetricSubject | null>(null);
    const [form] = Form.useForm();

    const fetchTree = async () => {
        setLoading(true);
        try {
            const data = await MetricSubjectApi.tree();
            setTreeData(data);
        } catch {
            message.error('加载主题域失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTree();
    }, []);

    const handleSave = async (values: MetricSubjectCmd) => {
        try {
            const payload = { ...values, parentId: values.parentId || '0' };
            if (editing) {
                await MetricSubjectApi.update(editing.id, payload);
                message.success('更新成功');
            } else {
                await MetricSubjectApi.create(payload);
                message.success('创建成功');
            }
            setModalVisible(false);
            form.resetFields();
            setEditing(null);
            fetchTree();
        } catch {
            message.error('保存失败');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await MetricSubjectApi.deleteById(id);
            message.success('删除成功');
            fetchTree();
        } catch {
            message.error('删除失败');
        }
    };

    const handleAddRoot = () => {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({ parentId: '0', sortOrder: 0 });
        setModalVisible(true);
    };

    const handleAddChild = (parent: MetricSubject) => {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({ parentId: parent.id, sortOrder: 0 });
        setModalVisible(true);
    };

    const handleEdit = (record: MetricSubject) => {
        setEditing(record);
        form.setFieldsValue({
            subjectCode: record.subjectCode,
            subjectName: record.subjectName,
            subjectDesc: record.subjectDesc,
            parentId: record.parentId === '0' ? undefined : record.parentId,
            sortOrder: record.sortOrder,
        });
        setModalVisible(true);
    };

    const buildTreeNodes = (list: MetricSubject[]): React.ComponentProps<typeof Tree>['treeData'] => {
        return list.map(item => ({
            key: item.id,
            title: (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span>
                        <Text strong>{item.subjectName}</Text>
                        <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                            ({item.subjectCode})
                        </Text>
                    </span>
                    <Space size="small">
                        {item.level < 3 && (
                            <Button
                                type="link"
                                size="small"
                                onClick={(e) => { e.stopPropagation(); handleAddChild(item); }}
                            >
                                新增子级
                            </Button>
                        )}
                        <Button
                            type="link"
                            size="small"
                            onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                        >
                            编辑
                        </Button>
                        <Popconfirm
                            title="确认删除？"
                            onConfirm={() => handleDelete(item.id)}
                        >
                            <Button
                                type="link"
                                size="small"
                                danger
                                onClick={(e) => e.stopPropagation()}
                            >
                                删除
                            </Button>
                        </Popconfirm>
                    </Space>
                </div>
            ),
            children: item.children ? buildTreeNodes(item.children) : undefined,
        }));
    };

    const buildParentTreeData = (
        list: MetricSubject[],
        excludeId?: string
    ): React.ComponentProps<typeof TreeSelect>['treeData'] => {
        return list
            .filter(item => item.id !== excludeId)
            .map(item => ({
                key: item.id,
                value: item.id,
                title: item.subjectName,
                children: item.children
                    ? buildParentTreeData(item.children, excludeId)
                    : undefined,
            }));
    };

    return (
        <div>
            <div style={{ marginBottom: 16, textAlign: 'right' }}>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddRoot}
                >
                    新增主题域
                </Button>
            </div>
            {loading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                    <Spin tip="加载中..." />
                </div>
            ) : (
                <Card>
                    <Tree
                        treeData={buildTreeNodes(treeData)}
                        defaultExpandAll
                        blockNode
                    />
                </Card>
            )}
            <Modal
                title={editing ? '编辑主题域' : '新增主题域'}
                open={modalVisible}
                onOk={() => form.submit()}
                onCancel={() => { setModalVisible(false); form.resetFields(); setEditing(null); }}
                destroyOnClose
            >
                <Form form={form} onFinish={handleSave} layout="vertical">
                    <Form.Item name="subjectCode" label="主题编码" rules={[{ required: true, message: '请输入主题编码' }]}>
                        <Input placeholder="请输入主题编码" />
                    </Form.Item>
                    <Form.Item name="subjectName" label="主题名称" rules={[{ required: true, message: '请输入主题名称' }]}>
                        <Input placeholder="请输入主题名称" />
                    </Form.Item>
                    <Form.Item name="subjectDesc" label="主题描述">
                        <Input.TextArea rows={2} placeholder="请输入主题描述" />
                    </Form.Item>
                    <Form.Item name="parentId" label="父主题域">
                        <TreeSelect
                            treeData={buildParentTreeData(treeData, editing?.id)}
                            placeholder="选择父主题域（不选则为根节点）"
                            allowClear
                            treeDefaultExpandAll
                        />
                    </Form.Item>
                    <Form.Item name="sortOrder" label="排序号">
                        <InputNumber style={{ width: '100%' }} placeholder="请输入排序号" min={0} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

// ==================== 指标配置主页面 ====================

const MetricsConfig: React.FC = () => {
    return (
        <div style={{ padding: '0 8px' }}>
            <Tabs defaultActiveKey="modifier" type="card">
                <TabPane tab="修饰词管理" key="modifier">
                    <ModifierManager />
                </TabPane>
                <TabPane tab="时间周期管理" key="timePeriod">
                    <TimePeriodManager />
                </TabPane>
                <TabPane tab="主题域管理" key="subject">
                    <SubjectDomainManager />
                </TabPane>
            </Tabs>
        </div>
    );
};

export default MetricsConfig;
