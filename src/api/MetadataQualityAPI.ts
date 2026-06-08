import {datamanRequest, getBaseURL} from './Request';
import {Response as ApiResponse} from './Response';
import {getStorage, KEY} from '@/utils/storage';

export type QualityRuleType =
    | 'TABLE_ROW_COUNT'
    | 'CONDITION_MATCH_RATE'
    | 'NULL_COUNT'
    | 'NULL_COUNT_ZERO'
    | 'NULL_RATE'
    | 'REGEX_FORMAT'
    | 'DATE_FORMAT'
    | 'EMAIL_FORMAT'
    | 'ID_CARD_FORMAT'
    | 'MOBILE_FORMAT'
    | 'CURRENCY_FORMAT'
    | 'NUMERIC_FORMAT'
    | 'PHONE_FORMAT'
    | 'DUPLICATE_COUNT'
    | 'DUPLICATE_COUNT_ZERO'
    | 'DUPLICATE_RATE'
    | 'MULTI_FIELD_DUPLICATE_COUNT_ZERO'
    | 'DISTINCT_COUNT'
    | 'DISTINCT_RATE'
    | 'MIN_VALUE'
    | 'MAX_VALUE'
    | 'AVG_VALUE'
    | 'SUM_VALUE'
    | 'ENUM_MISMATCH_COUNT'
    | 'ENUM_MISMATCH_COUNT_ZERO'
    | 'ENUM_MISMATCH_DISTINCT_COUNT'
    | 'DISCRETE_GROUP_COUNT'
    | 'FIELD_VALUE_RANGE'
    | 'CUSTOM_SQL'
    | 'ROW_COUNT'
    | 'FRESHNESS'
    | 'NOT_NULL'
    | 'UNIQUE'
    | 'ENUM'
    | 'RANGE';
export type QualitySeverity = 'WARN' | 'FAIL';
export type QualityStatus = 'PASS' | 'WARN' | 'FAIL' | 'RUNNING' | 'SUCCESS' | 'FAILED';
export type ApiDateTime = string | number | number[];

export interface MetadataQualityRuleTemplateDTO {
    ruleType: QualityRuleType;
    dimension: string;
    name: string;
    description: string;
    columnRequired: boolean;
    configExample: string;
}

export interface MetadataQualityRuleDTO {
    id: string;
    tableId: string;
    ruleName: string;
    ruleType: QualityRuleType;
    dimension: string;
    columnName?: string;
    configJson?: string;
    filterSql?: string;
    severity: QualitySeverity;
    enabled: boolean;
    createdAt?: ApiDateTime;
    updatedAt?: ApiDateTime;
}

export interface MetadataQualityRuleRequestDTO {
    ruleName: string;
    ruleType: QualityRuleType;
    dimension: string;
    columnName?: string;
    configJson?: string;
    filterSql?: string;
    severity: QualitySeverity;
    enabled: boolean;
}

export interface MetadataQualityRuleSuggestionDTO extends MetadataQualityRuleRequestDTO {
    reason?: string;
    confidence?: number;
    exists?: boolean;
}

export type MetadataQualityRecommendStreamEvent =
    | { event: 'status'; message?: string }
    | { event: 'answer'; content?: string }
    | { event: 'suggestions'; data?: MetadataQualityRuleSuggestionDTO[] }
    | { event: 'error'; message?: string }
    | { event: 'done'; message?: string };

export interface MetadataQualitySummaryDTO {
    tableId: string;
    score?: number;
    latestRunId?: string;
    latestRunStatus?: string;
    latestRunTime?: ApiDateTime;
    passCount: number;
    warnCount: number;
    failCount: number;
    ruleCount: number;
    enabledRuleCount: number;
    openAlertCount: number;
}

export interface MetadataQualityResultDTO {
    id: string;
    runId: string;
    ruleId: string;
    ruleName: string;
    ruleType: QualityRuleType;
    dimension: string;
    columnName?: string;
    status: 'PASS' | 'WARN' | 'FAIL';
    actualValue?: string;
    expectedValue?: string;
    totalCount?: number;
    failCount?: number;
    sampleSql?: string;
    detailJson?: string;
    createdAt?: ApiDateTime;
}

export interface MetadataQualityRunDTO {
    id: string;
    tableId: string;
    status: 'RUNNING' | 'SUCCESS' | 'FAILED';
    score?: number;
    passCount: number;
    warnCount: number;
    failCount: number;
    errorMessage?: string;
    startedAt?: ApiDateTime;
    endedAt?: ApiDateTime;
    results?: MetadataQualityResultDTO[];
}

export interface MetadataQualityAlertDTO {
    id: string;
    tableId: string;
    runId: string;
    resultId: string;
    ruleId: string;
    title: string;
    message?: string;
    severity: QualitySeverity;
    status: 'OPEN' | 'CLOSED';
    closedBy?: string;
    closedAt?: ApiDateTime;
    createdAt?: ApiDateTime;
}

const parseQualityRecommendStreamBlock = (block: string): MetadataQualityRecommendStreamEvent | null => {
    if (!block.trim()) {
        return null;
    }
    const eventLine = block.split(/\r?\n/).find(line => line.startsWith('event:'));
    const dataLines = block.split(/\r?\n/).filter(line => line.startsWith('data:'));
    if (!eventLine || dataLines.length === 0) {
        return null;
    }
    const event = eventLine.slice(6).trim() as MetadataQualityRecommendStreamEvent['event'];
    const dataText = dataLines.map(line => line.slice(5).trim()).join('\n');
    const data = dataText ? JSON.parse(dataText) : {};
    return {event, ...data} as MetadataQualityRecommendStreamEvent;
};

const readQualityRecommendStream = async (
    response: Response,
    onEvent: (event: MetadataQualityRecommendStreamEvent) => void,
) => {
    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error('浏览器不支持读取 SSE 响应流');
    }
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    while (true) {
        const {done, value} = await reader.read();
        if (done) {
            break;
        }
        buffer += decoder.decode(value, {stream: true});
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() || '';
        blocks.forEach(block => {
            const event = parseQualityRecommendStreamBlock(block);
            if (event) {
                onEvent(event);
            }
        });
    }
    buffer += decoder.decode();
    const tailEvent = parseQualityRecommendStreamBlock(buffer);
    if (tailEvent) {
        onEvent(tailEvent);
    }
};

export const metadataQualityApi = {
    listRuleTemplates: (): Promise<ApiResponse<MetadataQualityRuleTemplateDTO[]>> =>
        datamanRequest.get('/api/v1/metadata/quality/rule-templates'),

    getSummary: (tableId: string): Promise<ApiResponse<MetadataQualitySummaryDTO>> =>
        datamanRequest.get(`/api/v1/metadata/tables/${tableId}/quality/summary`),

    listRules: (tableId: string): Promise<ApiResponse<MetadataQualityRuleDTO[]>> =>
        datamanRequest.get(`/api/v1/metadata/tables/${tableId}/quality/rules`),

    createRule: (tableId: string, data: MetadataQualityRuleRequestDTO): Promise<ApiResponse<MetadataQualityRuleDTO>> =>
        datamanRequest.post(`/api/v1/metadata/tables/${tableId}/quality/rules`, data),

    updateRule: (tableId: string, ruleId: string, data: MetadataQualityRuleRequestDTO): Promise<ApiResponse<MetadataQualityRuleDTO>> =>
        datamanRequest.put(`/api/v1/metadata/tables/${tableId}/quality/rules/${ruleId}`, data),

    deleteRule: (tableId: string, ruleId: string): Promise<ApiResponse<void>> =>
        datamanRequest.delete(`/api/v1/metadata/tables/${tableId}/quality/rules/${ruleId}`),

    recommendRules: (tableId: string): Promise<ApiResponse<MetadataQualityRuleDTO[]>> =>
        datamanRequest.post(`/api/v1/metadata/tables/${tableId}/quality/rules/recommend`),

    recommendRulesStream: async (
        tableId: string,
        onEvent: (event: MetadataQualityRecommendStreamEvent) => void,
    ): Promise<void> => {
        const token = getStorage(KEY.TOKEN, '');
        const response = await fetch(new URL(`/api/v1/metadata/tables/${tableId}/quality/rules/recommend/stream`, getBaseURL('dataman')).toString(), {
            method: 'POST',
            headers: {
                Accept: 'text/event-stream',
                'Content-Type': 'application/json;charset=UTF-8',
                Authorization: token ? `Bearer ${token}` : '',
            },
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`${response.status} ${response.statusText}${errorText ? `\n${errorText}` : ''}`);
        }
        await readQualityRecommendStream(response, onEvent);
    },

    run: (tableId: string): Promise<ApiResponse<MetadataQualityRunDTO>> =>
        datamanRequest.post(`/api/v1/metadata/tables/${tableId}/quality/runs`),

    listRuns: (tableId: string): Promise<ApiResponse<MetadataQualityRunDTO[]>> =>
        datamanRequest.get(`/api/v1/metadata/tables/${tableId}/quality/runs`),

    getRunDetail: (runId: string): Promise<ApiResponse<MetadataQualityRunDTO>> =>
        datamanRequest.get(`/api/v1/metadata/quality/runs/${runId}`),

    listAlerts: (tableId: string): Promise<ApiResponse<MetadataQualityAlertDTO[]>> =>
        datamanRequest.get(`/api/v1/metadata/tables/${tableId}/quality/alerts`),

    closeAlert: (id: string): Promise<ApiResponse<MetadataQualityAlertDTO>> =>
        datamanRequest.post(`/api/v1/metadata/quality/alerts/${id}/close`),
};
