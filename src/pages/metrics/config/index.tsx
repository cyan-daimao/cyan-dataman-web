import React, { useEffect, useState } from 'react';
import {
    Tabs, Table, Button, Space, Modal, Form, Input, Select, InputNumber, message,
    Empty, Popconfirm, Tag,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
    ModifierApi, ModifierDTO, ModifierCmd,
    TimePeriodApi, TimePeriodDTO, TimePeriodCmd,
    DimensionApi, DimensionDTO, DimensionCmd,
} from '@/api/MetricConfigApi';
import { PeriodType, RelativeUnit } from '@/api/MetricApi';

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
            width: 150,
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
                pagination={{ current: pageNum, pageSize, total, onChange: setPageNum }}
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
                            <Form.Item name="startDate" label="开始日期" rules={[{ required: true }]}>
                                <Input type="date" />
                            </Form.Item>
                            <Form.Item name="endDate" label="结束日期" rules={[{ required: true }]}>
                                <Input type="date" />
                            </Form.Item>
                        </>
                    )}
                </Form>
            </Modal>
        </div>
    );
};

// ==================== 公共维度管理 ====================

const DimensionManager: React.FC = () => {
    const [data, setData] = useState<DimensionDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState<DimensionDTO | null>(null);
    const [form] = Form.useForm();
    const [pageNum, setPageNum] = useState(1);
    const [pageSize] = useState(20);
    const [total, setTotal] = useState(0);

    const fetchData = async (page = 1) => {
        setLoading(true);
        try {
            const res = await DimensionApi.page({ pageNum: page, pageSize });
            if (res.code === 200 && res.data) {
                setData(res.data.list);
                setTotal(res.data.total);
            }
        } catch {
            message.error('获取维度列表失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSave = async (values: DimensionCmd) => {
        try {
            if (editing) {
                await DimensionApi.update(editing.id, values);
                message.success('更新成功');
            } else {
                await DimensionApi.create(values);
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
            await DimensionApi.delete(id);
            message.success('删除成功');
            fetchData(pageNum);
        } catch {
            message.error('删除失败');
        }
    };

    const columns = [
        { title: '维度编码', dataIndex: 'dimCode', key: 'dimCode' },
        { title: '维度名称', dataIndex: 'dimName', key: 'dimName' },
        { title: '数据源', dataIndex: 'dsName', key: 'dsName' },
        { title: '数据库', dataIndex: 'dbName', key: 'dbName' },
        { title: '表', dataIndex: 'tblName', key: 'tblName' },
        { title: '字段', dataIndex: 'colName', key: 'colName' },
        { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
        {
            title: '操作',
            key: 'action',
            width: 150,
            render: (_: unknown, record: DimensionDTO) => (
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
                    新增维度
                </Button>
            </div>
            <Table
                rowKey="id"
                columns={columns}
                dataSource={data}
                loading={loading}
                pagination={{ current: pageNum, pageSize, total, onChange: setPageNum }}
                locale={{ emptyText: <Empty description="暂无维度" /> }}
            />
            <Modal
                title={editing ? '编辑维度' : '新增维度'}
                open={modalVisible}
                onOk={() => form.submit()}
                onCancel={() => { setModalVisible(false); form.resetFields(); setEditing(null); }}
                destroyOnClose
            >
                <Form form={form} onFinish={handleSave} layout="vertical">
                    <Form.Item name="dimName" label="维度名称" rules={[{ required: true }]}>
                        <Input placeholder="如：日期维度" />
                    </Form.Item>
                    <Form.Item name="dsName" label="数据源" rules={[{ required: true }]}>
                        <Input placeholder="数据源名称" />
                    </Form.Item>
                    <Form.Item name="dbName" label="数据库" rules={[{ required: true }]}>
                        <Input placeholder="数据库名称" />
                    </Form.Item>
                    <Form.Item name="tblName" label="表名" rules={[{ required: true }]}>
                        <Input placeholder="表名" />
                    </Form.Item>
                    <Form.Item name="colName" label="字段名" rules={[{ required: true }]}>
                        <Input placeholder="字段名" />
                    </Form.Item>
                    <Form.Item name="description" label="描述">
                        <TextArea rows={2} placeholder="描述该维度的业务含义" />
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
                <TabPane tab="公共维度管理" key="dimension">
                    <DimensionManager />
                </TabPane>
            </Tabs>
        </div>
    );
};

export default MetricsConfig;
