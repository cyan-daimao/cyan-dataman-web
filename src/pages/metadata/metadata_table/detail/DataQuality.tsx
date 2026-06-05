import React, {useCallback, useEffect, useMemo, useState} from "react";
import {
    Badge,
    Button,
    Card,
    Col,
    Drawer,
    Empty,
    Form,
    Input,
    message,
    Modal,
    Popconfirm,
    Progress,
    Row,
    Select,
    Space,
    Statistic,
    Switch,
    Table,
    TableProps,
    Tabs,
    Tag,
    Typography,
} from "antd";
import {
    CheckCircleOutlined,
    DeleteOutlined,
    EditOutlined,
    EyeOutlined,
    PlusOutlined,
    ThunderboltOutlined,
} from "@ant-design/icons";
import {ColumnVO, getMetadataTableById, MetadataTableDTO} from "@/api/MetadataTableAPI";
import {
    metadataQualityApi,
    MetadataQualityAlertDTO,
    MetadataQualityResultDTO,
    MetadataQualityRuleDTO,
    MetadataQualityRuleRequestDTO,
    MetadataQualityRuleTemplateDTO,
    MetadataQualityRunDTO,
    MetadataQualitySummaryDTO,
    QualityRuleType,
} from "@/api/MetadataQualityAPI";

interface DataQualityProps {
    tableId: string;
}

const statusBadgeMap: Record<string, "success" | "warning" | "error" | "processing" | "default"> = {
    PASS: "success",
    WARN: "warning",
    FAIL: "error",
    SUCCESS: "success",
    FAILED: "error",
    RUNNING: "processing",
    OPEN: "error",
    CLOSED: "default",
};

const statusTextMap: Record<string, string> = {
    PASS: "通过",
    WARN: "警告",
    FAIL: "失败",
    SUCCESS: "成功",
    FAILED: "失败",
    RUNNING: "运行中",
    OPEN: "未关闭",
    CLOSED: "已关闭",
};

const severityColorMap: Record<string, string> = {
    WARN: "orange",
    FAIL: "red",
};

const DataQuality: React.FC<DataQualityProps> = ({tableId}) => {
    const [loading, setLoading] = useState(false);
    const [running, setRunning] = useState(false);
    const [recommending, setRecommending] = useState(false);
    const [summary, setSummary] = useState<MetadataQualitySummaryDTO>();
    const [rules, setRules] = useState<MetadataQualityRuleDTO[]>([]);
    const [runs, setRuns] = useState<MetadataQualityRunDTO[]>([]);
    const [alerts, setAlerts] = useState<MetadataQualityAlertDTO[]>([]);
    const [templates, setTemplates] = useState<MetadataQualityRuleTemplateDTO[]>([]);
    const [tableInfo, setTableInfo] = useState<MetadataTableDTO>();
    const [ruleModalOpen, setRuleModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<MetadataQualityRuleDTO>();
    const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
    const [detailRun, setDetailRun] = useState<MetadataQualityRunDTO>();
    const [form] = Form.useForm<MetadataQualityRuleRequestDTO>();

    const columns = useMemo<ColumnVO[]>(() => tableInfo?.table?.columns || [], [tableInfo]);

    const loadData = useCallback(async () => {
        if (!tableId) {
            return;
        }
        setLoading(true);
        try {
            const [summaryResp, ruleResp, runResp, alertResp, templateResp, tableResp] = await Promise.all([
                metadataQualityApi.getSummary(tableId),
                metadataQualityApi.listRules(tableId),
                metadataQualityApi.listRuns(tableId),
                metadataQualityApi.listAlerts(tableId),
                metadataQualityApi.listRuleTemplates(),
                getMetadataTableById(tableId),
            ]);
            setSummary(summaryResp.data);
            setRules(ruleResp.data || []);
            setRuns(runResp.data || []);
            setAlerts(alertResp.data || []);
            setTemplates(templateResp.data || []);
            setTableInfo(tableResp);
        } catch (error) {
            console.error("加载数据质量失败:", error);
            message.error("加载数据质量失败");
        } finally {
            setLoading(false);
        }
    }, [tableId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const openCreateModal = () => {
        setEditingRule(undefined);
        const firstTemplate = templates[0];
        form.setFieldsValue({
            ruleType: firstTemplate?.ruleType || "NOT_NULL",
            ruleName: firstTemplate?.name || "字段非空检查",
            dimension: firstTemplate?.dimension || "完整性",
            configJson: firstTemplate?.configExample || "{}",
            severity: "WARN",
            enabled: true,
        });
        setRuleModalOpen(true);
    };

    const openEditModal = (rule: MetadataQualityRuleDTO) => {
        setEditingRule(rule);
        form.setFieldsValue({
            ruleName: rule.ruleName,
            ruleType: rule.ruleType,
            dimension: rule.dimension,
            columnName: rule.columnName,
            configJson: rule.configJson || "{}",
            filterSql: rule.filterSql,
            severity: rule.severity,
            enabled: rule.enabled,
        });
        setRuleModalOpen(true);
    };

    const handleRuleTypeChange = (ruleType: QualityRuleType) => {
        const template = templates.find(item => item.ruleType === ruleType);
        if (template) {
            form.setFieldsValue({
                ruleName: template.name,
                dimension: template.dimension,
                configJson: template.configExample || "{}",
                columnName: template.columnRequired ? form.getFieldValue("columnName") : undefined,
            });
        }
    };

    const handleRuleSubmit = async () => {
        const values = await form.validateFields();
        if (values.configJson) {
            try {
                JSON.parse(values.configJson);
            } catch (error) {
                message.error("规则配置JSON格式不正确");
                return;
            }
        }
        const payload: MetadataQualityRuleRequestDTO = {
            ...values,
            configJson: values.configJson || "{}",
            enabled: values.enabled ?? true,
        };
        try {
            if (editingRule) {
                await metadataQualityApi.updateRule(tableId, editingRule.id, payload);
                message.success("规则已更新");
            } else {
                await metadataQualityApi.createRule(tableId, payload);
                message.success("规则已创建");
            }
            setRuleModalOpen(false);
            await loadData();
        } catch (error) {
            console.error("保存质量规则失败:", error);
        }
    };

    const handleDeleteRule = async (ruleId: string) => {
        await metadataQualityApi.deleteRule(tableId, ruleId);
        message.success("规则已删除");
        await loadData();
    };

    const handleRecommendRules = async () => {
        setRecommending(true);
        try {
            await metadataQualityApi.recommendRules(tableId);
            message.success("推荐规则已生成");
            await loadData();
        } finally {
            setRecommending(false);
        }
    };

    const handleRun = async () => {
        setRunning(true);
        try {
            const resp = await metadataQualityApi.run(tableId);
            setDetailRun(resp.data);
            setDetailDrawerOpen(true);
            message.success("质量检查完成");
            await loadData();
        } finally {
            setRunning(false);
        }
    };

    const handleViewRun = async (runId: string) => {
        const resp = await metadataQualityApi.getRunDetail(runId);
        setDetailRun(resp.data);
        setDetailDrawerOpen(true);
    };

    const handleCloseAlert = async (id: string) => {
        await metadataQualityApi.closeAlert(id);
        message.success("告警已关闭");
        await loadData();
    };

    const score = Number(summary?.score || 0);

    const ruleTableColumns: TableProps<MetadataQualityRuleDTO>["columns"] = [
        {
            title: "规则名称",
            dataIndex: "ruleName",
            width: 220,
            ellipsis: true,
        },
        {
            title: "规则类型",
            dataIndex: "ruleType",
            width: 130,
            render: (value: string, record) => <Tag>{record.dimension} / {value}</Tag>,
        },
        {
            title: "字段",
            dataIndex: "columnName",
            width: 150,
            render: (value?: string) => value || "-",
        },
        {
            title: "严重等级",
            dataIndex: "severity",
            width: 100,
            render: (value: string) => <Tag color={severityColorMap[value]}>{value}</Tag>,
        },
        {
            title: "状态",
            dataIndex: "enabled",
            width: 90,
            render: (enabled: boolean) => <Badge status={enabled ? "success" : "default"} text={enabled ? "启用" : "停用"}/>,
        },
        {
            title: "更新时间",
            dataIndex: "updatedAt",
            width: 180,
            render: formatTime,
        },
        {
            title: "操作",
            key: "action",
            width: 140,
            fixed: "right",
            render: (_, record) => (
                <Space size={4}>
                    <Button size="small" type="text" icon={<EditOutlined/>} onClick={() => openEditModal(record)}/>
                    <Popconfirm title="确认删除该规则？" onConfirm={() => handleDeleteRule(record.id)}>
                        <Button size="small" type="text" danger icon={<DeleteOutlined/>}/>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const runTableColumns: TableProps<MetadataQualityRunDTO>["columns"] = [
        {
            title: "运行状态",
            dataIndex: "status",
            width: 120,
            render: renderStatus,
        },
        {
            title: "质量分",
            dataIndex: "score",
            width: 100,
            render: (value?: number) => value == null ? "-" : `${value}`,
        },
        {
            title: "通过/警告/失败",
            key: "counts",
            width: 160,
            render: (_, record) => `${record.passCount || 0} / ${record.warnCount || 0} / ${record.failCount || 0}`,
        },
        {
            title: "开始时间",
            dataIndex: "startedAt",
            width: 180,
            render: formatTime,
        },
        {
            title: "结束时间",
            dataIndex: "endedAt",
            width: 180,
            render: formatTime,
        },
        {
            title: "错误信息",
            dataIndex: "errorMessage",
            ellipsis: true,
            render: (value?: string) => value || "-",
        },
        {
            title: "操作",
            key: "action",
            width: 100,
            fixed: "right",
            render: (_, record) => (
                <Button size="small" icon={<EyeOutlined/>} onClick={() => handleViewRun(record.id)}>
                    详情
                </Button>
            ),
        },
    ];

    const alertTableColumns: TableProps<MetadataQualityAlertDTO>["columns"] = [
        {
            title: "告警标题",
            dataIndex: "title",
            width: 240,
            ellipsis: true,
        },
        {
            title: "严重等级",
            dataIndex: "severity",
            width: 100,
            render: (value: string) => <Tag color={severityColorMap[value]}>{value}</Tag>,
        },
        {
            title: "状态",
            dataIndex: "status",
            width: 100,
            render: renderStatus,
        },
        {
            title: "内容",
            dataIndex: "message",
            ellipsis: true,
            render: (value?: string) => value || "-",
        },
        {
            title: "创建时间",
            dataIndex: "createdAt",
            width: 180,
            render: formatTime,
        },
        {
            title: "操作",
            key: "action",
            width: 100,
            fixed: "right",
            render: (_, record) => record.status === "OPEN" ? (
                <Button size="small" icon={<CheckCircleOutlined/>} onClick={() => handleCloseAlert(record.id)}>
                    关闭
                </Button>
            ) : "-",
        },
    ];

    const resultTableColumns: TableProps<MetadataQualityResultDTO>["columns"] = [
        {
            title: "规则名称",
            dataIndex: "ruleName",
            width: 220,
            ellipsis: true,
        },
        {
            title: "状态",
            dataIndex: "status",
            width: 100,
            render: renderStatus,
        },
        {
            title: "字段",
            dataIndex: "columnName",
            width: 140,
            render: (value?: string) => value || "-",
        },
        {
            title: "实际值",
            dataIndex: "actualValue",
            width: 140,
            render: (value?: string) => value || "-",
        },
        {
            title: "期望值",
            dataIndex: "expectedValue",
            width: 180,
            render: (value?: string) => value || "-",
        },
        {
            title: "失败数",
            dataIndex: "failCount",
            width: 100,
            render: (value?: number) => value ?? "-",
        },
        {
            title: "样本SQL",
            dataIndex: "sampleSql",
            ellipsis: true,
            render: (value?: string) => value ? (
                <Typography.Text copyable style={{maxWidth: 360}}>
                    {value}
                </Typography.Text>
            ) : "-",
        },
    ];

    const watchedRuleType = Form.useWatch("ruleType", form);
    const watchedTemplate = templates.find(item => item.ruleType === watchedRuleType);

    return (
        <div>
            <Row gutter={12} style={{marginBottom: 12}}>
                <Col span={6}>
                    <Card size="small">
                        <Space align="center" size={16}>
                            <Progress type="circle" size={68} percent={score} status={score >= 80 ? "success" : score >= 60 ? "normal" : "exception"}/>
                            <Statistic title="质量分" value={score} precision={2}/>
                        </Space>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small">
                        <Statistic title="启用规则" value={summary?.enabledRuleCount || 0} suffix={`/ ${summary?.ruleCount || 0}`}/>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small">
                        <Space direction="vertical" size={4}>
                            <Badge status="success" text={`通过 ${summary?.passCount || 0}`}/>
                            <Badge status="warning" text={`警告 ${summary?.warnCount || 0}`}/>
                            <Badge status="error" text={`失败 ${summary?.failCount || 0}`}/>
                        </Space>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small">
                        <Statistic title="未关闭告警" value={summary?.openAlertCount || 0}/>
                        <Typography.Text type="secondary">{formatTime(summary?.latestRunTime)}</Typography.Text>
                    </Card>
                </Col>
            </Row>

            <Card
                size="small"
                loading={loading}
                title="数据质量"
                extra={
                    <Space>
                        <Button icon={<ThunderboltOutlined/>} loading={recommending} onClick={handleRecommendRules}>
                            推荐规则
                        </Button>
                        <Button icon={<PlusOutlined/>} onClick={openCreateModal}>
                            新增规则
                        </Button>
                        <Button type="primary" loading={running} icon={<CheckCircleOutlined/>} onClick={handleRun}>
                            立即运行
                        </Button>
                    </Space>
                }
            >
                <Tabs
                    items={[
                        {
                            key: "rules",
                            label: "规则管理",
                            children: rules.length ? (
                                <Table
                                    rowKey="id"
                                    size="small"
                                    dataSource={rules}
                                    columns={ruleTableColumns}
                                    pagination={{pageSize: 8}}
                                    scroll={{x: "max-content"}}
                                />
                            ) : <Empty description="暂无质量规则"/>,
                        },
                        {
                            key: "runs",
                            label: "运行历史",
                            children: runs.length ? (
                                <Table
                                    rowKey="id"
                                    size="small"
                                    dataSource={runs}
                                    columns={runTableColumns}
                                    pagination={{pageSize: 8}}
                                    scroll={{x: "max-content"}}
                                />
                            ) : <Empty description="暂无运行历史"/>,
                        },
                        {
                            key: "alerts",
                            label: "告警列表",
                            children: alerts.length ? (
                                <Table
                                    rowKey="id"
                                    size="small"
                                    dataSource={alerts}
                                    columns={alertTableColumns}
                                    pagination={{pageSize: 8}}
                                    scroll={{x: "max-content"}}
                                />
                            ) : <Empty description="暂无质量告警"/>,
                        },
                    ]}
                />
            </Card>

            <Modal
                title={editingRule ? "编辑质量规则" : "新增质量规则"}
                open={ruleModalOpen}
                onOk={handleRuleSubmit}
                onCancel={() => setRuleModalOpen(false)}
                destroyOnClose
                width={720}
            >
                <Form form={form} layout="vertical" preserve={false}>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="ruleType" label="规则类型" rules={[{required: true}]}>
                                <Select onChange={handleRuleTypeChange}>
                                    {templates.map(template => (
                                        <Select.Option key={template.ruleType} value={template.ruleType}>
                                            {template.name}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="dimension" label="质量维度" rules={[{required: true}]}>
                                <Input/>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="ruleName" label="规则名称" rules={[{required: true}]}>
                                <Input/>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="columnName" label="字段名" rules={[{required: Boolean(watchedTemplate?.columnRequired)}]}>
                                <Select allowClear showSearch disabled={!watchedTemplate?.columnRequired} optionFilterProp="label">
                                    {columns.map(column => (
                                        <Select.Option key={column.name} value={column.name} label={`${column.name} ${column.comment || ""}`}>
                                            <Space>
                                                <span>{column.name}</span>
                                                <Typography.Text type="secondary">{column.type}</Typography.Text>
                                            </Space>
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="severity" label="严重等级" rules={[{required: true}]}>
                                <Select
                                    options={[
                                        {label: "WARN", value: "WARN"},
                                        {label: "FAIL", value: "FAIL"},
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="enabled" label="启用规则" valuePropName="checked">
                                <Switch/>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="filterSql" label="过滤条件SQL">
                        <Input.TextArea rows={2} placeholder="例如 dt = current_date()"/>
                    </Form.Item>
                    <Form.Item name="configJson" label="规则配置JSON" rules={[{required: true}]}>
                        <Input.TextArea rows={5}/>
                    </Form.Item>
                </Form>
            </Modal>

            <Drawer
                title="质量运行详情"
                open={detailDrawerOpen}
                onClose={() => setDetailDrawerOpen(false)}
                width={960}
            >
                {detailRun ? (
                    <Space direction="vertical" size={12} style={{width: "100%"}}>
                        <Space size={16}>
                            {renderStatus(detailRun.status)}
                            <Tag>质量分 {detailRun.score ?? "-"}</Tag>
                            <Tag color="green">通过 {detailRun.passCount || 0}</Tag>
                            <Tag color="orange">警告 {detailRun.warnCount || 0}</Tag>
                            <Tag color="red">失败 {detailRun.failCount || 0}</Tag>
                        </Space>
                        {detailRun.errorMessage && <Typography.Text type="danger">{detailRun.errorMessage}</Typography.Text>}
                        <Table
                            rowKey="id"
                            size="small"
                            dataSource={detailRun.results || []}
                            columns={resultTableColumns}
                            pagination={false}
                            scroll={{x: "max-content"}}
                        />
                    </Space>
                ) : <Empty/>}
            </Drawer>
        </div>
    );
};

const renderStatus = (value?: string) => (
    <Badge status={statusBadgeMap[value || ""] || "default"} text={statusTextMap[value || ""] || value || "-"}/>
);

const formatTime = (value?: string) => value ? value.replace("T", " ") : "-";

export default DataQuality;
