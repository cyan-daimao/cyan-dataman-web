import {datamanRequest} from './Request';
import {Response as ApiResponse} from './Response';

export type QualityRuleType = 'ROW_COUNT' | 'FRESHNESS' | 'CUSTOM_SQL' | 'NOT_NULL' | 'UNIQUE' | 'ENUM' | 'RANGE';
export type QualitySeverity = 'WARN' | 'FAIL';
export type QualityStatus = 'PASS' | 'WARN' | 'FAIL' | 'RUNNING' | 'SUCCESS' | 'FAILED';

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
    createdAt?: string;
    updatedAt?: string;
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

export interface MetadataQualitySummaryDTO {
    tableId: string;
    score?: number;
    latestRunId?: string;
    latestRunStatus?: string;
    latestRunTime?: string;
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
    createdAt?: string;
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
    startedAt?: string;
    endedAt?: string;
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
    closedAt?: string;
    createdAt?: string;
}

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
