import React, {useCallback, useEffect, useMemo, useState} from "react";
import {
    Alert,
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
    MetadataQualityRecommendStreamEvent,
    MetadataQualityRuleDTO,
    MetadataQualityRuleRequestDTO,
    MetadataQualityRuleSuggestionDTO,
    MetadataQualityRuleTemplateDTO,
    MetadataQualityRunDTO,
    MetadataQualitySummaryDTO,
    QualityRuleType,
} from "@/api/MetadataQualityAPI";

interface DataQualityProps {
    tableId: string;
}

interface ConfigJsonHelp {
    purpose: string;
    fields: string[];
    example: string;
    notes?: string[];
}

interface QualityRuleFormValues extends MetadataQualityRuleRequestDTO {
    configColumns?: string[];
}

interface AiRecommendLog {
    type: "status" | "answer" | "error" | "done";
    message: string;
}

const ruleTypeGroupOrder = ["表行数", "空值行数", "格式校验", "重复值行数", "唯一值数", "统计值", "及时性", "枚举值", "离散值", "自定义", "兼容旧规则"];

const ruleTypeGroupMap: Record<QualityRuleType, string> = {
    TABLE_ROW_COUNT: "表行数",
    CONDITION_MATCH_RATE: "表行数",
    NULL_COUNT: "空值行数",
    NULL_COUNT_ZERO: "空值行数",
    NULL_RATE: "空值行数",
    REGEX_FORMAT: "格式校验",
    DATE_FORMAT: "格式校验",
    EMAIL_FORMAT: "格式校验",
    ID_CARD_FORMAT: "格式校验",
    MOBILE_FORMAT: "格式校验",
    CURRENCY_FORMAT: "格式校验",
    NUMERIC_FORMAT: "格式校验",
    PHONE_FORMAT: "格式校验",
    DUPLICATE_COUNT: "重复值行数",
    DUPLICATE_COUNT_ZERO: "重复值行数",
    DUPLICATE_RATE: "重复值行数",
    MULTI_FIELD_DUPLICATE_COUNT_ZERO: "重复值行数",
    DISTINCT_COUNT: "唯一值数",
    DISTINCT_RATE: "唯一值数",
    MIN_VALUE: "统计值",
    MAX_VALUE: "统计值",
    AVG_VALUE: "统计值",
    SUM_VALUE: "统计值",
    ENUM_MISMATCH_COUNT: "枚举值",
    ENUM_MISMATCH_COUNT_ZERO: "枚举值",
    ENUM_MISMATCH_DISTINCT_COUNT: "枚举值",
    DISCRETE_GROUP_COUNT: "离散值",
    FIELD_VALUE_RANGE: "统计值",
    CUSTOM_SQL: "自定义",
    ROW_COUNT: "兼容旧规则",
    FRESHNESS: "及时性",
    NOT_NULL: "兼容旧规则",
    UNIQUE: "兼容旧规则",
    ENUM: "兼容旧规则",
    RANGE: "兼容旧规则",
};

const singleColumnRuleTypes = new Set<QualityRuleType>([
    "NULL_COUNT", "NULL_COUNT_ZERO", "NULL_RATE",
    "REGEX_FORMAT", "DATE_FORMAT", "EMAIL_FORMAT", "ID_CARD_FORMAT", "MOBILE_FORMAT",
    "CURRENCY_FORMAT", "NUMERIC_FORMAT", "PHONE_FORMAT",
    "DUPLICATE_COUNT", "DUPLICATE_COUNT_ZERO", "DUPLICATE_RATE",
    "DISTINCT_COUNT", "DISTINCT_RATE",
    "MIN_VALUE", "MAX_VALUE", "AVG_VALUE", "SUM_VALUE",
    "ENUM_MISMATCH_COUNT", "ENUM_MISMATCH_COUNT_ZERO", "ENUM_MISMATCH_DISTINCT_COUNT",
    "DISCRETE_GROUP_COUNT", "FIELD_VALUE_RANGE", "FRESHNESS",
    "NOT_NULL", "UNIQUE", "ENUM", "RANGE",
]);

const multiColumnRuleTypes = new Set<QualityRuleType>(["MULTI_FIELD_DUPLICATE_COUNT_ZERO"]);

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

const configJsonHelpMap: Record<QualityRuleType, ConfigJsonHelp> = {
    TABLE_ROW_COUNT: {
        purpose: "检查表行数是否满足固定阈值，常用于空表、异常暴增或异常下降检测。",
        fields: ["operator：比较符，支持 >、>=、<、<=、=、==、!=。", "expected：期望值。", "兼容旧写法 minCount/maxCount。"],
        example: JSON.stringify({operator: ">=", expected: 1}, null, 2),
    },
    CONDITION_MATCH_RATE: {
        purpose: "检查满足指定 SQL 条件的数据占比。",
        fields: ["condition：SQL 布尔表达式。", "operator：比较符。", "expected：期望匹配率，0 到 1。"],
        example: JSON.stringify({condition: "status = 'SUCCESS'", operator: ">=", expected: 0.99}, null, 2),
    },
    NULL_COUNT: {
        purpose: "统计所选字段空值行数，并按阈值判断。",
        fields: ["operator：比较符。", "expected：允许的空值行数。"],
        example: JSON.stringify({operator: "<=", expected: 0}, null, 2),
    },
    NULL_COUNT_ZERO: {
        purpose: "检查所选字段空值行数是否为 0。",
        fields: ["该规则不需要额外配置，填写空 JSON 对象即可。"],
        example: JSON.stringify({}, null, 2),
    },
    NULL_RATE: {
        purpose: "统计所选字段空值占比，并按阈值判断。",
        fields: ["operator：比较符。", "expected：允许的空值率，0 到 1。"],
        example: JSON.stringify({operator: "<=", expected: 0.01}, null, 2),
    },
    REGEX_FORMAT: {
        purpose: "使用自定义正则检查字段格式。",
        fields: ["pattern：Java/SQL 正则表达式。", "allowNull：是否允许空值，false 时空值也计为失败。"],
        example: JSON.stringify({pattern: "^1[3-9][0-9]{9}$", allowNull: false}, null, 2),
    },
    DATE_FORMAT: {
        purpose: "检查字段是否符合日期格式，默认按 yyyy-MM-dd 校验。",
        fields: ["pattern：可选，自定义日期正则。", "allowNull：是否允许空值。"],
        example: JSON.stringify({pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$", allowNull: true}, null, 2),
    },
    EMAIL_FORMAT: {
        purpose: "检查字段是否符合邮箱格式。",
        fields: ["allowNull：是否允许空值。"],
        example: JSON.stringify({allowNull: true}, null, 2),
    },
    ID_CARD_FORMAT: {
        purpose: "检查字段是否符合中国居民身份证号码格式。",
        fields: ["allowNull：是否允许空值。"],
        example: JSON.stringify({allowNull: true}, null, 2),
    },
    MOBILE_FORMAT: {
        purpose: "检查字段是否符合中国大陆手机号格式。",
        fields: ["allowNull：是否允许空值。"],
        example: JSON.stringify({allowNull: true}, null, 2),
    },
    CURRENCY_FORMAT: {
        purpose: "检查字段是否符合金额格式，默认最多两位小数。",
        fields: ["allowNull：是否允许空值。", "pattern：可选，自定义金额正则。"],
        example: JSON.stringify({allowNull: true}, null, 2),
    },
    NUMERIC_FORMAT: {
        purpose: "检查字段是否符合通用数值格式。",
        fields: ["allowNull：是否允许空值。", "pattern：可选，自定义数值正则。"],
        example: JSON.stringify({allowNull: true}, null, 2),
    },
    PHONE_FORMAT: {
        purpose: "检查字段是否符合座机或手机号格式。",
        fields: ["allowNull：是否允许空值。", "pattern：可选，自定义电话正则。"],
        example: JSON.stringify({allowNull: true}, null, 2),
    },
    DUPLICATE_COUNT: {
        purpose: "统计所选字段重复值行数，并按阈值判断。",
        fields: ["operator：比较符。", "expected：允许的重复值行数。"],
        example: JSON.stringify({operator: "<=", expected: 0}, null, 2),
    },
    DUPLICATE_COUNT_ZERO: {
        purpose: "检查所选字段重复值行数是否为 0。",
        fields: ["该规则不需要额外配置，填写空 JSON 对象即可。"],
        example: JSON.stringify({}, null, 2),
    },
    DUPLICATE_RATE: {
        purpose: "统计所选字段重复值占比，并按阈值判断。",
        fields: ["operator：比较符。", "expected：允许的重复率，0 到 1。"],
        example: JSON.stringify({operator: "<=", expected: 0.01}, null, 2),
    },
    MULTI_FIELD_DUPLICATE_COUNT_ZERO: {
        purpose: "检查多个字段组合后的联合键是否存在重复。",
        fields: ["columns：字段名数组；可通过下方多字段选择自动写入。"],
        example: JSON.stringify({columns: ["user_id", "order_id"]}, null, 2),
    },
    DISTINCT_COUNT: {
        purpose: "统计所选字段唯一值数量，并按阈值判断。",
        fields: ["operator：比较符。", "expected：期望唯一值数量。"],
        example: JSON.stringify({operator: ">=", expected: 1}, null, 2),
    },
    DISTINCT_RATE: {
        purpose: "统计所选字段唯一值占比，并按阈值判断。",
        fields: ["operator：比较符。", "expected：期望唯一值率，0 到 1。"],
        example: JSON.stringify({operator: ">=", expected: 0.8}, null, 2),
    },
    MIN_VALUE: {
        purpose: "统计所选字段最小值，并按阈值判断。",
        fields: ["operator/expected：固定值比较。", "min/max：也可使用区间比较。"],
        example: JSON.stringify({operator: ">=", expected: 0}, null, 2),
    },
    MAX_VALUE: {
        purpose: "统计所选字段最大值，并按阈值判断。",
        fields: ["operator/expected：固定值比较。", "min/max：也可使用区间比较。"],
        example: JSON.stringify({operator: "<=", expected: 100}, null, 2),
    },
    AVG_VALUE: {
        purpose: "统计所选字段平均值，并按阈值判断。",
        fields: ["operator/expected：固定值比较。", "min/max：区间比较。"],
        example: JSON.stringify({min: 0, max: 100}, null, 2),
    },
    SUM_VALUE: {
        purpose: "统计所选字段汇总值，并按阈值判断。",
        fields: ["operator/expected：固定值比较。", "min/max：也可使用区间比较。"],
        example: JSON.stringify({operator: ">=", expected: 0}, null, 2),
    },
    ENUM_MISMATCH_COUNT: {
        purpose: "统计不在枚举集合内的行数，并按阈值判断。",
        fields: ["values：允许值数组。", "allowNull：是否允许空值。", "operator/expected：失败行数阈值。"],
        example: JSON.stringify({values: ["A", "B"], allowNull: true, operator: "<=", expected: 0}, null, 2),
    },
    ENUM_MISMATCH_COUNT_ZERO: {
        purpose: "检查字段值是否都在枚举集合内。",
        fields: ["values：允许值数组。", "allowNull：是否允许空值。"],
        example: JSON.stringify({values: ["A", "B"], allowNull: true}, null, 2),
    },
    ENUM_MISMATCH_DISTINCT_COUNT: {
        purpose: "统计不在枚举集合内的不同取值数量，并按阈值判断。",
        fields: ["values：允许值数组。", "allowNull：是否允许空值。", "operator/expected：失败去重数阈值。"],
        example: JSON.stringify({values: ["A", "B"], allowNull: true, operator: "<=", expected: 0}, null, 2),
    },
    DISCRETE_GROUP_COUNT: {
        purpose: "统计字段离散取值分组数量，并按阈值判断。",
        fields: ["operator：比较符。", "expected：允许或期望的分组数量。"],
        example: JSON.stringify({operator: "<=", expected: 100}, null, 2),
    },
    FIELD_VALUE_RANGE: {
        purpose: "检查字段值是否落在上下限范围内。",
        fields: ["min：最小值，可不填。", "max：最大值，可不填。", "allowNull：是否允许空值。"],
        example: JSON.stringify({min: 0, max: 100, allowNull: true}, null, 2),
    },
    CUSTOM_SQL: {
        purpose: "执行自定义 SQL，适合复杂业务校验或临时规则。",
        fields: ["sql：要执行的查询语句。", "fail_count：SQL 必须返回的失败数量字段。", "total_count：SQL 可选返回的检查总数字段。"],
        example: JSON.stringify({sql: "select 0 as fail_count, count(1) as total_count from iceberg.ods.example_table"}, null, 2),
        notes: ["CUSTOM_SQL 的 sql 会按原文执行，filter_sql 不会自动拼接，扫描范围请写在自定义 SQL 的 WHERE 中。"],
    },
    ROW_COUNT: {
        purpose: "旧版表行数规则，后端会按 TABLE_ROW_COUNT 执行。",
        fields: ["minCount：最小行数，可不填。", "maxCount：最大行数，可不填。"],
        example: JSON.stringify({minCount: 1, maxCount: 10000000}, null, 2),
    },
    FRESHNESS: {
        purpose: "旧版数据及时性规则，检查时间字段最大值距离当前时间是否超出阈值。",
        fields: ["maxDelayMinutes：最大延迟分钟数。", "maxDelayHours：最大延迟小时数；和 maxDelayMinutes 二选一。"],
        example: JSON.stringify({maxDelayMinutes: 1440}, null, 2),
    },
    NOT_NULL: {
        purpose: "旧版字段非空规则，后端会按 NULL_COUNT_ZERO 执行。",
        fields: ["该规则不需要额外配置，填写空 JSON 对象即可。"],
        example: JSON.stringify({}, null, 2),
    },
    UNIQUE: {
        purpose: "旧版字段唯一规则，后端会按 DUPLICATE_COUNT_ZERO 执行。",
        fields: ["该规则不需要额外配置，填写空 JSON 对象即可。"],
        example: JSON.stringify({}, null, 2),
    },
    ENUM: {
        purpose: "旧版枚举规则，后端会按 ENUM_MISMATCH_COUNT_ZERO 执行。",
        fields: ["values：允许出现的枚举值数组，元素按字符串比较。"],
        example: JSON.stringify({values: ["A", "B", "C"]}, null, 2),
    },
    RANGE: {
        purpose: "旧版范围规则，后端会按 FIELD_VALUE_RANGE 执行。",
        fields: ["min：最小值，可不填。", "max：最大值，可不填。"],
        example: JSON.stringify({min: 0, max: 100}, null, 2),
    },
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
    const [aiRecommendOpen, setAiRecommendOpen] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<MetadataQualityRuleSuggestionDTO[]>([]);
    const [selectedAiKeys, setSelectedAiKeys] = useState<string[]>([]);
    const [aiLogs, setAiLogs] = useState<AiRecommendLog[]>([]);
    const [aiRawAnswer, setAiRawAnswer] = useState("");
    const [saveAiLoading, setSaveAiLoading] = useState(false);
    const [form] = Form.useForm<QualityRuleFormValues>();

    const columns = useMemo<ColumnVO[]>(() => tableInfo?.table?.columns || [], [tableInfo]);

    const templateOptions = useMemo(() => {
        const grouped = new Map<string, {label: string; value: QualityRuleType}[]>();
        templates.forEach(template => {
            const group = ruleTypeGroupMap[template.ruleType] || template.dimension || "其他";
            const options = grouped.get(group) || [];
            options.push({label: template.name, value: template.ruleType});
            grouped.set(group, options);
        });
        return ruleTypeGroupOrder
            .filter(group => grouped.has(group))
            .map(group => ({label: group, options: grouped.get(group) || []}));
    }, [templates]);

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
            ruleType: firstTemplate?.ruleType || "NULL_COUNT_ZERO",
            ruleName: firstTemplate?.name || "空值行数为0",
            dimension: firstTemplate?.dimension || "空值",
            columnName: undefined,
            configColumns: undefined,
            configJson: firstTemplate?.configExample || "{}",
            severity: "WARN",
            enabled: true,
        });
        setRuleModalOpen(true);
    };

    const openEditModal = (rule: MetadataQualityRuleDTO) => {
        setEditingRule(rule);
        const parsedConfig = parseConfigJson(rule.configJson);
        form.setFieldsValue({
            ruleName: rule.ruleName,
            ruleType: rule.ruleType,
            dimension: rule.dimension,
            columnName: rule.columnName,
            configColumns: Array.isArray(parsedConfig.columns) ? parsedConfig.columns.map(String) : undefined,
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
                columnName: singleColumnRuleTypes.has(ruleType) ? form.getFieldValue("columnName") : undefined,
                configColumns: multiColumnRuleTypes.has(ruleType) ? form.getFieldValue("configColumns") : undefined,
            });
        }
    };

    const handleRuleSubmit = async () => {
        const values = await form.validateFields();
        let configObject: Record<string, unknown> = {};
        if (values.configJson) {
            try {
                configObject = JSON.parse(values.configJson);
            } catch (error) {
                message.error("规则配置JSON格式不正确");
                return;
            }
        }
        if (multiColumnRuleTypes.has(values.ruleType)) {
            configObject = {...configObject, columns: values.configColumns || []};
        }
        const payload: MetadataQualityRuleRequestDTO = {
            ruleName: values.ruleName,
            ruleType: values.ruleType,
            dimension: values.dimension,
            columnName: singleColumnRuleTypes.has(values.ruleType) ? values.columnName : undefined,
            filterSql: values.ruleType === "CUSTOM_SQL" ? undefined : values.filterSql,
            severity: values.severity,
            configJson: JSON.stringify(configObject, null, 2),
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

    const appendAiLog = (type: AiRecommendLog["type"], messageText: string) => {
        setAiLogs(prev => [...prev, {type, message: messageText}]);
    };

    const handleAiRecommendEvent = (event: MetadataQualityRecommendStreamEvent) => {
        if (event.event === "status") {
            appendAiLog("status", event.message || "");
            return;
        }
        if (event.event === "answer") {
            const content = event.content || "";
            setAiRawAnswer(prev => prev + content);
            return;
        }
        if (event.event === "suggestions") {
            const suggestions = event.data || [];
            setAiSuggestions(suggestions);
            setSelectedAiKeys(suggestions
                .map((item, index) => ({item, key: getAiSuggestionKey(item, index)}))
                .filter(({item}) => !item.exists)
                .map(({key}) => key));
            appendAiLog("status", `收到 ${suggestions.length} 条推荐候选`);
            return;
        }
        if (event.event === "error") {
            appendAiLog("error", event.message || "AI 推荐失败");
            message.error("AI 推荐失败");
            return;
        }
        if (event.event === "done") {
            appendAiLog("done", event.message || "AI 推荐完成");
        }
    };

    const handleRecommendRules = async () => {
        setAiRecommendOpen(true);
        setRecommending(true);
        setAiSuggestions([]);
        setSelectedAiKeys([]);
        setAiLogs([]);
        setAiRawAnswer("");
        appendAiLog("status", "正在连接 AI 推荐服务");
        try {
            await metadataQualityApi.recommendRulesStream(tableId, handleAiRecommendEvent);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            appendAiLog("error", errorMessage);
            message.error("AI 推荐失败");
        } finally {
            setRecommending(false);
        }
    };

    const updateAiSuggestion = (index: number, patch: Partial<MetadataQualityRuleSuggestionDTO>) => {
        setAiSuggestions(prev => prev.map((item, itemIndex) => itemIndex === index ? {...item, ...patch} : item));
    };

    const handleSaveAiSuggestions = async () => {
        const selected = aiSuggestions.filter((item, index) => selectedAiKeys.includes(getAiSuggestionKey(item, index)));
        if (selected.length === 0) {
            message.warning("请先选择要保存的推荐规则");
            return;
        }
        setSaveAiLoading(true);
        let successCount = 0;
        let skipCount = 0;
        try {
            for (const item of selected) {
                if (item.exists) {
                    skipCount += 1;
                    continue;
                }
                try {
                    JSON.parse(item.configJson || "{}");
                    await metadataQualityApi.createRule(tableId, {
                        ruleName: item.ruleName,
                        ruleType: item.ruleType,
                        dimension: item.dimension,
                        columnName: item.columnName,
                        configJson: item.configJson || "{}",
                        filterSql: item.ruleType === "CUSTOM_SQL" ? undefined : item.filterSql,
                        severity: item.severity,
                        enabled: true,
                    });
                    successCount += 1;
                } catch (error) {
                    console.error("保存AI推荐规则失败:", error);
                    skipCount += 1;
                }
            }
            message.success(`已创建 ${successCount} 条规则，跳过 ${skipCount} 条重复/无效候选`);
            setAiRecommendOpen(false);
            await loadData();
        } finally {
            setSaveAiLoading(false);
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

    const aiSuggestionColumns: TableProps<MetadataQualityRuleSuggestionDTO>["columns"] = [
        {
            title: "规则",
            dataIndex: "ruleName",
            width: 220,
            render: (value: string, record, index) => (
                <Space direction="vertical" size={4} style={{width: "100%"}}>
                    <Input
                        size="small"
                        value={value}
                        onChange={event => updateAiSuggestion(index, {ruleName: event.target.value})}
                    />
                    <Space size={4} wrap>
                        <Tag>{record.dimension}</Tag>
                        <Tag>{record.ruleType}</Tag>
                        {record.exists && <Tag color="orange">已存在</Tag>}
                    </Space>
                </Space>
            ),
        },
        {
            title: "字段",
            dataIndex: "columnName",
            width: 160,
            render: (value: string | undefined, record, index) => (
                <Select
                    size="small"
                    allowClear
                    showSearch
                    disabled={!singleColumnRuleTypes.has(record.ruleType)}
                    optionFilterProp="searchText"
                    value={value}
                    options={columnOptions(columns)}
                    style={{width: "100%"}}
                    onChange={columnName => updateAiSuggestion(index, {columnName})}
                />
            ),
        },
        {
            title: "等级",
            dataIndex: "severity",
            width: 100,
            render: (value: string, _, index) => (
                <Select
                    size="small"
                    value={value}
                    style={{width: "100%"}}
                    options={[
                        {label: "WARN", value: "WARN"},
                        {label: "FAIL", value: "FAIL"},
                    ]}
                    onChange={severity => updateAiSuggestion(index, {severity})}
                />
            ),
        },
        {
            title: "配置JSON",
            dataIndex: "configJson",
            width: 260,
            render: (value: string | undefined, _, index) => (
                <Input.TextArea
                    value={value || "{}"}
                    autoSize={{minRows: 2, maxRows: 5}}
                    onChange={event => updateAiSuggestion(index, {configJson: event.target.value})}
                />
            ),
        },
        {
            title: "过滤条件",
            dataIndex: "filterSql",
            width: 180,
            render: (value: string | undefined, _, index) => (
                <Input.TextArea
                    value={value}
                    placeholder="例如 dt = current_date()"
                    autoSize={{minRows: 2, maxRows: 4}}
                    onChange={event => updateAiSuggestion(index, {filterSql: event.target.value})}
                />
            ),
        },
        {
            title: "原因",
            dataIndex: "reason",
            width: 260,
            ellipsis: true,
            render: (value?: string, record) => (
                <Space direction="vertical" size={2}>
                    <Typography.Text>{value || "-"}</Typography.Text>
                    {record.confidence != null && (
                        <Typography.Text type="secondary">置信度 {Math.round(Number(record.confidence) * 100)}%</Typography.Text>
                    )}
                </Space>
            ),
        },
    ];

    const watchedRuleType = Form.useWatch("ruleType", form);
    const watchedTemplate = templates.find(item => item.ruleType === watchedRuleType);
    const configJsonHelp = watchedRuleType ? configJsonHelpMap[watchedRuleType] : undefined;
    const requiresSingleColumn = watchedRuleType ? singleColumnRuleTypes.has(watchedRuleType) : false;
    const requiresMultiColumn = watchedRuleType ? multiColumnRuleTypes.has(watchedRuleType) : false;
    const isCustomSqlRule = watchedRuleType === "CUSTOM_SQL";

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
                title="AI 推荐质量规则"
                open={aiRecommendOpen}
                onCancel={() => setAiRecommendOpen(false)}
                width={1180}
                destroyOnClose
                footer={[
                    <Button key="cancel" onClick={() => setAiRecommendOpen(false)}>
                        取消
                    </Button>,
                    <Button
                        key="save"
                        type="primary"
                        loading={saveAiLoading}
                        disabled={selectedAiKeys.length === 0}
                        onClick={handleSaveAiSuggestions}
                    >
                        保存选中
                    </Button>,
                ]}
            >
                <Row gutter={12}>
                    <Col span={16}>
                        <Table
                            rowKey={(_, index) => getAiSuggestionKey(_, index || 0)}
                            size="small"
                            loading={recommending}
                            dataSource={aiSuggestions}
                            columns={aiSuggestionColumns}
                            pagination={{pageSize: 5}}
                            scroll={{x: "max-content"}}
                            rowSelection={{
                                selectedRowKeys: selectedAiKeys,
                                getCheckboxProps: record => ({disabled: Boolean(record.exists)}),
                                onChange: keys => setSelectedAiKeys(keys.map(String)),
                            }}
                            locale={{emptyText: recommending ? "AI 分析中..." : "暂无推荐候选"}}
                        />
                    </Col>
                    <Col span={8}>
                        <Card size="small" title="AI 分析过程" style={{marginBottom: 12}}>
                            <Space direction="vertical" size={6} style={{width: "100%", maxHeight: 220, overflow: "auto"}}>
                                {aiLogs.length ? aiLogs.map((log, index) => (
                                    <Typography.Text
                                        key={`${log.type}-${index}`}
                                        type={log.type === "error" ? "danger" : log.type === "done" ? "success" : "secondary"}
                                    >
                                        [{log.type}] {log.message}
                                    </Typography.Text>
                                )) : <Typography.Text type="secondary">等待 AI 输出...</Typography.Text>}
                            </Space>
                        </Card>
                        <Card size="small" title="AI 原始回答">
                            <Input.TextArea
                                readOnly
                                value={aiRawAnswer}
                                rows={12}
                                placeholder="AI 原始回答会显示在这里"
                            />
                        </Card>
                    </Col>
                </Row>
            </Modal>

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
                                <Select options={templateOptions} onChange={handleRuleTypeChange}/>
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
                        {requiresMultiColumn ? (
                            <Col span={12}>
                                <Form.Item
                                    name="configColumns"
                                    label="联合字段"
                                    rules={[{required: true, message: "请选择联合字段"}]}
                                >
                                    <Select
                                        mode="multiple"
                                        allowClear
                                        showSearch
                                        optionFilterProp="searchText"
                                        options={columnOptions(columns)}
                                    />
                                </Form.Item>
                            </Col>
                        ) : (
                            <Col span={12}>
                                <Form.Item
                                    name="columnName"
                                    label="字段名"
                                    rules={[{required: requiresSingleColumn, message: "请选择字段"}]}
                                >
                                    <Select
                                        allowClear
                                        showSearch
                                        disabled={!requiresSingleColumn}
                                        optionFilterProp="searchText"
                                        options={columnOptions(columns)}
                                    />
                                </Form.Item>
                            </Col>
                        )}
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
                    <Form.Item
                        name="filterSql"
                        label="过滤条件SQL"
                        extra={isCustomSqlRule ? "CUSTOM_SQL 不会自动拼接 filter_sql，请在自定义 SQL 的 WHERE 中写扫描范围。" : undefined}
                    >
                        <Input.TextArea rows={2} placeholder="例如 dt = current_date()"/>
                    </Form.Item>
                    {configJsonHelp && (
                        <Alert
                            type="info"
                            showIcon
                            style={{marginBottom: 12}}
                            message={`${watchedTemplate?.name || watchedRuleType} 配置说明`}
                            description={
                                <Space direction="vertical" size={8} style={{width: "100%"}}>
                                    <Typography.Text>{configJsonHelp.purpose}</Typography.Text>
                                    <div>
                                        <Typography.Text strong>可用字段：</Typography.Text>
                                        <ul style={{margin: "4px 0 0 18px", padding: 0}}>
                                            {configJsonHelp.fields.map(field => (
                                                <li key={field}>
                                                    <Typography.Text>{field}</Typography.Text>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <Typography.Text strong>示例：</Typography.Text>
                                        <Typography.Paragraph
                                            copyable={{text: configJsonHelp.example}}
                                            style={{
                                                margin: "4px 0 0",
                                                padding: "8px 10px",
                                                background: "#f6f8fa",
                                                borderRadius: 4,
                                                fontFamily: "monospace",
                                                whiteSpace: "pre-wrap",
                                            }}
                                        >
                                            {configJsonHelp.example}
                                        </Typography.Paragraph>
                                    </div>
                                    <Typography.Text type="secondary">
                                        过滤条件请填写在上方 filter_sql 中，用于限制扫描范围；不要写进 configJson。
                                    </Typography.Text>
                                    {configJsonHelp.notes?.map(note => (
                                        <Typography.Text key={note} type="secondary">{note}</Typography.Text>
                                    ))}
                                </Space>
                            }
                        />
                    )}
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

const formatTime = (value?: unknown) => {
    if (value == null || value === "") {
        return "-";
    }
    if (typeof value === "string") {
        return value.replace("T", " ");
    }
    if (typeof value === "number") {
        return new Date(value).toLocaleString();
    }
    if (Array.isArray(value)) {
        const [year, month, day, hour = 0, minute = 0, second = 0] = value;
        if ([year, month, day].every(item => typeof item === "number")) {
            return `${year}-${padTime(month)}-${padTime(day)} ${padTime(hour)}:${padTime(minute)}:${padTime(second)}`;
        }
    }
    return String(value);
};

const padTime = (value: unknown) => String(value ?? 0).padStart(2, "0");

const parseConfigJson = (configJson?: string): Record<string, unknown> => {
    if (!configJson) {
        return {};
    }
    try {
        return JSON.parse(configJson);
    } catch {
        return {};
    }
};

const columnOptions = (columns: ColumnVO[]) => columns.map(column => ({
    value: column.name,
    searchText: `${column.name} ${column.comment || ""} ${column.type}`,
    label: (
        <Space>
            <span>{column.name}</span>
            <Typography.Text type="secondary">{column.type}</Typography.Text>
        </Space>
    ),
}));

const getAiSuggestionKey = (_: MetadataQualityRuleSuggestionDTO, index: number) => `ai-quality-${index}`;

export default DataQuality;
