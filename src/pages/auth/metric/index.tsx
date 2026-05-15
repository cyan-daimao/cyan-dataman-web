import React, { useEffect, useState, useCallback } from 'react';
import {
    Card,
    Table,
    Space,
    Tag,
    message,
    Spin,
    Empty,
    Radio,
    Input,
    Modal,
    Form,
    Select,
    Typography,
    Descriptions,
    Badge,
} from 'antd';
import { SafetyOutlined } from '@ant-design/icons';
import PermissionButton from '@/component/permission/PermissionButton';
import {
    submitApproval,
    ApprovalSubmitCmd,
} from '@/api/DataAuthApi';
import { MetricDictionaryApi, DictionaryMetricDTO } from '@/api/MetricApi';
import { DimensionApi, DimensionDTO } from '@/api/MetricConfigApi';

const { Title, Text } = Typography;
const { TextArea } = Input;

// 从 localStorage 解析当前用户 passport
const getCurrentPassport = (): string => {
    try {
        const currentRaw = localStorage.getItem('current');
        if (currentRaw) {
            const current = JSON.parse(currentRaw) as { passport?: string };
            return current.passport || '';
        }
    } catch {
        // ignore
    }
    return '';
};

type ResourceType = 'metric' | 'dimension';

interface MetricItem extends DictionaryMetricDTO {
    resourceType: 'metric';
}

interface DimensionItem extends DimensionDTO {
    resourceType: 'dimension';
}

type ResourceItem = MetricItem | DimensionItem;

const securityLevelColor: Record<string, string> = {
    L1: 'green',
    L2: 'blue',
    L3: 'orange',
    L4: 'red',
};

const MetricPage: React.FC = () => {
    const [resourceType, setResourceType] = useState<ResourceType>('metric');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [dataList, setDataList] = useState<ResourceItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
    const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
    const [applyModalVisible, setApplyModalVisible] = useState(false);
    const [applyForm] = Form.useForm();
    const [applying, setApplying] = useState(false);

    const fetchData = useCallback(async (pageNum = 1, pageSize = 20, keyword = '') => {
        setLoading(true);
        try {
            if (resourceType === 'metric') {
                const res = await MetricDictionaryApi.page({
                    pageNum,
                    pageSize,
                    metricName: keyword || undefined,
                });
                if (res.code === 200 && res.data) {
                    const list = res.data.list.map(m => ({ ...m, resourceType: 'metric' as const }));
                    setDataList(list);
                    setPagination({
                        current: res.data.pageNum,
                        pageSize: res.data.pageSize,
                        total: res.data.total,
                    });
                }
            } else {
                const res = await DimensionApi.page({
                    pageNum,
                    pageSize,
                    dimName: keyword || undefined,
                });
                if (res.code === 200 && res.data) {
                    const list = res.data.list.map(d => ({ ...d, resourceType: 'dimension' as const }));
                    setDataList(list);
                    setPagination({
                        current: res.data.pageNum,
                        pageSize: res.data.pageSize,
                        total: res.data.total,
                    });
                }
            }
        } catch {
            message.error('获取数据失败');
        } finally {
            setLoading(false);
        }
    }, [resourceType]);

    useEffect(() => {
        fetchData(1, 20, searchKeyword);
        setSelectedRowKeys([]);
        setExpandedRowKeys([]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resourceType, fetchData]);

    const handleSearch = () => {
        fetchData(1, pagination.pageSize, searchKeyword);
    };

    const handleTableChange = (page: number, pageSize: number) => {
        fetchData(page, pageSize, searchKeyword);
    };

    const handleApply = async (values: { actions: string[]; reason: string }) => {
        const passport = getCurrentPassport();
        if (!passport) {
            message.error('未获取到当前用户信息');
            return;
        }
        if (selectedRowKeys.length === 0) {
            message.warning('请至少选择一个资源');
            return;
        }

        setApplying(true);
        const successList: string[] = [];
        const failList: string[] = [];

        try {
            for (const key of selectedRowKeys) {
                const item = dataList.find(d => {
                    if (resourceType === 'metric') {
                        return (d as MetricItem).metricCode === key;
                    }
                    return (d as DimensionItem).dimCode === key;
                });
                if (!item) continue;

                const resourceId = resourceType === 'metric'
                    ? (item as MetricItem).metricCode
                    : (item as DimensionItem).dimCode;

                for (const action of values.actions) {
                    const cmd: ApprovalSubmitCmd = {
                        applicantPassport: passport,
                        approvalType: resourceType === 'metric' ? 'METRIC_PERMISSION' : 'METRIC_PERMISSION',
                        resourceType: resourceType.toUpperCase(),
                        resourceId,
                        action: action as ApprovalSubmitCmd['action'],
                        reason: values.reason,
                    };
                    try {
                        const res = await submitApproval(cmd);
                        if (res.code === 200) {
                            successList.push(`${resourceId}(${action})`);
                        } else {
                            failList.push(`${resourceId}(${action})`);
                        }
                    } catch {
                        failList.push(`${resourceId}(${action})`);
                    }
                }
            }

            if (failList.length === 0) {
                message.success(`成功提交 ${successList.length} 条权限申请`);
            } else {
                message.warning(`成功 ${successList.length} 条，失败 ${failList.length} 条`);
            }
            setApplyModalVisible(false);
            applyForm.resetFields();
            setSelectedRowKeys([]);
        } finally {
            setApplying(false);
        }
    };

    const metricColumns = [
        {
            title: '指标名称',
            dataIndex: 'metricName',
            key: 'metricName',
            render: (text: string, record: MetricItem) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{text}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{record.metricCode}</Text>
                </Space>
            ),
        },
        {
            title: '主题域',
            dataIndex: 'subjectName',
            key: 'subjectName',
            render: (text: string) => text || '-',
        },
        {
            title: '密级',
            dataIndex: 'securityLevel',
            key: 'securityLevel',
            render: (text: string) => (
                <Tag color={securityLevelColor[text] || 'default'}>{text || '未知'}</Tag>
            ),
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (text: string) => (
                <Badge status={text === 'PUBLISHED' ? 'success' : 'default'} text={text === 'PUBLISHED' ? '已发布' : text} />
            ),
        },
        {
            title: '更新时间',
            dataIndex: 'updatedAt',
            key: 'updatedAt',
            render: (text: string) => text ? new Date(text).toLocaleString() : '-',
        },
    ];

    const dimensionColumns = [
        {
            title: '维度名称',
            dataIndex: 'dimName',
            key: 'dimName',
            render: (text: string, record: DimensionItem) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{text}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{record.dimCode}</Text>
                </Space>
            ),
        },
        {
            title: '分类',
            dataIndex: 'categoryName',
            key: 'categoryName',
            render: (text: string) => text || '-',
        },
        {
            title: '数据类型',
            dataIndex: 'dataType',
            key: 'dataType',
            render: (text: string) => <Tag>{text}</Tag>,
        },
        {
            title: '关联表',
            dataIndex: 'tableName',
            key: 'tableName',
            render: (_: string, record: DimensionItem) => (
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {record.schemaName}.{record.tableName}.{record.columnName}
                </Text>
            ),
        },
    ];

    const expandedRowRender = (record: ResourceItem) => {
        if (record.resourceType === 'metric') {
            const r = record as MetricItem;
            return (
                <Descriptions bordered size="small" column={2} style={{ margin: '8px 0' }}>
                    <Descriptions.Item label="指标编码">{r.metricCode}</Descriptions.Item>
                    <Descriptions.Item label="指标名称">{r.metricName}</Descriptions.Item>
                    <Descriptions.Item label="主题域">{r.subjectName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="密级">
                        <Tag color={securityLevelColor[r.securityLevel || ''] || 'default'}>
                            {r.securityLevel || '未知'}
                        </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="指标类型">{r.metricType}</Descriptions.Item>
                    <Descriptions.Item label="状态">
                        <Badge status={r.status === 'PUBLISHED' ? 'success' : 'default'} text={r.status === 'PUBLISHED' ? '已发布' : r.status} />
                    </Descriptions.Item>
                    <Descriptions.Item label="业务口径" span={2}>{r.bizCaliber || '-'}</Descriptions.Item>
                    <Descriptions.Item label="更新时间">{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '-'}</Descriptions.Item>
                </Descriptions>
            );
        }
        const r = record as DimensionItem;
        return (
            <Descriptions bordered size="small" column={2} style={{ margin: '8px 0' }}>
                <Descriptions.Item label="维度编码">{r.dimCode}</Descriptions.Item>
                <Descriptions.Item label="维度名称">{r.dimName}</Descriptions.Item>
                <Descriptions.Item label="分类">{r.categoryName || '-'}</Descriptions.Item>
                <Descriptions.Item label="数据类型"><Tag>{r.dataType}</Tag></Descriptions.Item>
                <Descriptions.Item label="关联字段">{r.schemaName}.{r.tableName}.{r.columnName}</Descriptions.Item>
                <Descriptions.Item label="展示字段">{r.displayColumn || '-'}</Descriptions.Item>
                <Descriptions.Item label="描述" span={2}>{r.description || '-'}</Descriptions.Item>
            </Descriptions>
        );
    };

    const rowKey = (record: ResourceItem) => {
        if (record.resourceType === 'metric') {
            return (record as MetricItem).metricCode;
        }
        return (record as DimensionItem).dimCode;
    };

    const selectedItems = dataList.filter(d => {
        if (resourceType === 'metric') {
            return selectedRowKeys.includes((d as MetricItem).metricCode);
        }
        return selectedRowKeys.includes((d as DimensionItem).dimCode);
    });

    return (
        <div style={{ padding: '0 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>指标平台权限</Title>
            </div>

            <Card style={{ marginBottom: 16 }}>
                <Space size="large" wrap>
                    <Radio.Group
                        value={resourceType}
                        onChange={(e) => setResourceType(e.target.value)}
                        buttonStyle="solid"
                    >
                        <Radio.Button value="metric">指标</Radio.Button>
                        <Radio.Button value="dimension">维度</Radio.Button>
                    </Radio.Group>

                    <Input.Search
                        placeholder={resourceType === 'metric' ? '搜索指标名称' : '搜索维度名称'}
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        onSearch={handleSearch}
                        onPressEnter={handleSearch}
                        style={{ width: 280 }}
                        allowClear
                    />

                    <PermissionButton
                        type="primary"
                        icon={<SafetyOutlined />}
                        disabled={selectedRowKeys.length === 0}
                        onClick={() => {
                            applyForm.resetFields();
                            setApplyModalVisible(true);
                        }}
                    >
                        批量申请权限 ({selectedRowKeys.length})
                    </PermissionButton>
                </Space>
            </Card>

            <Card>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                        <Spin size="large" />
                    </div>
                ) : dataList.length === 0 ? (
                    <Empty description={`暂无${resourceType === 'metric' ? '指标' : '维度'}数据`} />
                ) : (
                    <Table
                        columns={resourceType === 'metric' ? metricColumns : dimensionColumns}
                        dataSource={dataList}
                        rowKey={rowKey}
                        expandable={{
                            expandedRowRender,
                            expandedRowKeys,
                            onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as string[]),
                        }}
                        rowSelection={{
                            type: 'checkbox',
                            selectedRowKeys,
                            onChange: (keys) => setSelectedRowKeys(keys as string[]),
                        }}
                        pagination={{
                            current: pagination.current,
                            pageSize: pagination.pageSize,
                            total: pagination.total,
                            onChange: handleTableChange,
                            showSizeChanger: true,
                            showTotal: (total) => `共 ${total} 条`,
                        }}
                    />
                )}
            </Card>

            {/* 批量申请权限弹窗 */}
            <Modal
                title="批量申请权限"
                open={applyModalVisible}
                onOk={() => applyForm.submit()}
                onCancel={() => setApplyModalVisible(false)}
                confirmLoading={applying}
                width={700}
            >
                <Form form={applyForm} layout="vertical" onFinish={handleApply}>
                    <Form.Item label="已选资源">
                        <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: 4, padding: '8px 12px' }}>
                            {selectedItems.map(item => (
                                <Tag key={rowKey(item)} style={{ marginBottom: 4 }}>
                                    {item.resourceType === 'metric'
                                        ? (item as MetricItem).metricName
                                        : (item as DimensionItem).dimName}
                                </Tag>
                            ))}
                        </div>
                    </Form.Item>

                    <Form.Item
                        name="actions"
                        label="申请权限"
                        rules={[{ required: true, message: '请至少选择一项权限' }]}
                    >
                        <Select mode="multiple" placeholder="请选择要申请的权限">
                            <Select.Option value="VIEW">查看 (VIEW)</Select.Option>
                            <Select.Option value="USE">使用 (USE)</Select.Option>
                            <Select.Option value="EDIT">编辑 (EDIT)</Select.Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="reason"
                        label="申请理由"
                        rules={[{ required: true, message: '请填写申请理由' }]}
                    >
                        <TextArea rows={3} placeholder="请说明申请权限的理由..." />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default MetricPage;
