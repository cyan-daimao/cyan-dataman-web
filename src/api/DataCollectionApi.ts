import { dataCollectionRequest } from './Request';
import { ApiResponse } from './Response';

export interface PageResult<T> {
    list?: T[];
    records?: T[];
    total: number;
    pageNum?: number;
    pageNo?: number;
    pageSize: number;
}

// ==================== 埋点需求 ====================

export interface TrackingDemandDTO {
    id: string;
    demandCode: string;
    demandName: string;
    businessDomain: string;
    productLine: string;
    terminalTypes: string[];
    priority: string;
    businessGoal: string;
    analysisGoal: string;
    productOwner: string;
    techOwner: string;
    testOwner: string;
    dataOwner: string;
    expectedReleaseDate: string;
    status: string;
    createdAt: string;
    updatedAt: string;
}

export interface TrackingDemandSaveRequest {
    demandName: string;
    businessDomain: string;
    productLine: string;
    terminalTypes: string[];
    priority: string;
    businessGoal: string;
    analysisGoal: string;
    productOwner: string;
    techOwner?: string;
    testOwner?: string;
    dataOwner: string;
    expectedReleaseDate?: string;
}

export interface TrackingDemandUpdateRequest extends TrackingDemandSaveRequest {
    id: string;
}

export interface TrackingDemandPageQuery {
    pageNo?: number;
    pageSize?: number;
    demandName?: string;
    businessDomain?: string;
    productLine?: string;
    terminalTypes?: string[];
    status?: string;
    priority?: string;
    productOwner?: string;
    startTime?: string;
    endTime?: string;
}

export const demandApi = {
    page: async (query: TrackingDemandPageQuery): Promise<ApiResponse<PageResult<TrackingDemandDTO>>> =>
        dataCollectionRequest.post('/api/data-collection/demands/page', query),
    create: async (data: TrackingDemandSaveRequest): Promise<ApiResponse<TrackingDemandDTO>> =>
        dataCollectionRequest.post('/api/data-collection/demands', data),
    update: async (id: string, data: TrackingDemandSaveRequest): Promise<ApiResponse<TrackingDemandDTO>> =>
        dataCollectionRequest.put(`/api/data-collection/demands/${id}`, data),
    getById: async (id: string): Promise<ApiResponse<TrackingDemandDTO>> =>
        dataCollectionRequest.get(`/api/data-collection/demands/${id}`),
    submitDesign: async (id: string): Promise<ApiResponse<void>> =>
        dataCollectionRequest.post(`/api/data-collection/demands/${id}/submit-design`, {}),
    close: async (id: string): Promise<ApiResponse<void>> =>
        dataCollectionRequest.post(`/api/data-collection/demands/${id}/close`, {}),
};

// ==================== 埋点方案 ====================

export interface TrackingPlanEventDTO {
    eventId: string;
    eventCode: string;
    eventName: string;
    eventType: string;
    isRequired: boolean;
}

export interface TrackingPlanDTO {
    id: string;
    planCode: string;
    planName: string;
    demandId: string;
    version: number;
    description: string;
    status: string;
    reviewer: string;
    publishedVersionId: string;
    events?: TrackingPlanEventDTO[];
    createdAt: string;
    updatedAt: string;
}

export interface TrackingPlanSaveRequest {
    planName: string;
    demandId?: string;
    description?: string;
}

export interface TrackingPlanUpdateRequest extends TrackingPlanSaveRequest {
    id: string;
}

export interface TrackingPlanPageQuery {
    pageNo?: number;
    pageSize?: number;
    planName?: string;
    status?: string;
}

export const planApi = {
    page: async (query: TrackingPlanPageQuery): Promise<ApiResponse<PageResult<TrackingPlanDTO>>> =>
        dataCollectionRequest.post('/api/data-collection/plans/page', query),
    create: async (data: TrackingPlanSaveRequest): Promise<ApiResponse<TrackingPlanDTO>> =>
        dataCollectionRequest.post('/api/data-collection/plans', data),
    update: async (id: string, data: TrackingPlanSaveRequest): Promise<ApiResponse<TrackingPlanDTO>> =>
        dataCollectionRequest.put(`/api/data-collection/plans/${id}`, data),
    getById: async (id: string): Promise<ApiResponse<TrackingPlanDTO>> =>
        dataCollectionRequest.get(`/api/data-collection/plans/${id}`),
    addEvent: async (planId: string, eventId: string): Promise<ApiResponse<void>> =>
        dataCollectionRequest.post(`/api/data-collection/plans/${planId}/events`, [eventId]),
    removeEvent: async (planId: string, eventId: string): Promise<ApiResponse<void>> =>
        dataCollectionRequest.delete(`/api/data-collection/plans/${planId}/events/${eventId}`),
    submitReview: async (id: string): Promise<ApiResponse<void>> =>
        dataCollectionRequest.post(`/api/data-collection/plans/${id}/submit-review`, {}),
    approve: async (id: string): Promise<ApiResponse<void>> =>
        dataCollectionRequest.post(`/api/data-collection/plans/${id}/approve`, {}),
    reject: async (id: string): Promise<ApiResponse<void>> =>
        dataCollectionRequest.post(`/api/data-collection/plans/${id}/reject`, {}),
};

// ==================== 事件管理 ====================

export interface EventPropertyDTO {
    id: string;
    propertyId: string;
    propertyCode: string;
    propertyName: string;
    dataType: string;
    enumValues: string[];
    maxLength: number;
    validationRule: string;
    isSensitive: boolean;
    isRequired: boolean;
    defaultValue: string;
    sampleValue: string;
    description: string;
}

export interface TrackingEventDTO {
    id: string;
    eventCode: string;
    eventName: string;
    eventType: string;
    businessDomain: string;
    description: string;
    triggerTiming: string;
    terminalTypes: string[];
    owner: string;
    isCore: boolean;
    status: string;
    version: number;
    properties?: EventPropertyDTO[];
    createdAt: string;
    updatedAt: string;
}

export interface TrackingEventSaveRequest {
    eventCode: string;
    eventName: string;
    eventType: string;
    businessDomain: string;
    description: string;
    triggerTiming: string;
    terminalTypes: string[];
    owner: string;
    isCore: boolean;
}

export interface TrackingEventUpdateRequest extends TrackingEventSaveRequest {
    id: string;
}

export interface TrackingEventPageQuery {
    pageNo?: number;
    pageSize?: number;
    eventCode?: string;
    eventName?: string;
    eventType?: string;
    businessDomain?: string;
    status?: string;
    isCore?: boolean;
    owner?: string;
}

export interface EventPropertyConfigRequest {
    propertyId: string;
    isRequired?: boolean;
    defaultValue?: string;
    sampleValue?: string;
    description?: string;
}

export interface EventMetricSyncRequest {
    metricCode?: string;
    metricName?: string;
    subjectCode?: string;
    statFunc?: string;
    owner?: string;
    securityLevel?: string;
}

export interface EventMetricMappingDTO {
    id: string;
    eventId: string;
    eventCode: string;
    metricId?: string;
    metricCode: string;
    syncStatus: string;
    errorMessage?: string;
}

export const eventApi = {
    page: async (query: TrackingEventPageQuery): Promise<ApiResponse<PageResult<TrackingEventDTO>>> =>
        dataCollectionRequest.post('/api/data-collection/events/page', query),
    create: async (data: TrackingEventSaveRequest): Promise<ApiResponse<TrackingEventDTO>> =>
        dataCollectionRequest.post('/api/data-collection/events', data),
    update: async (id: string, data: TrackingEventSaveRequest): Promise<ApiResponse<TrackingEventDTO>> =>
        dataCollectionRequest.put(`/api/data-collection/events/${id}`, data),
    getById: async (id: string): Promise<ApiResponse<TrackingEventDTO>> =>
        dataCollectionRequest.get(`/api/data-collection/events/${id}`),
    publish: async (id: string): Promise<ApiResponse<void>> =>
        dataCollectionRequest.post(`/api/data-collection/events/${id}/publish`, {}),
    deprecate: async (id: string): Promise<ApiResponse<void>> =>
        dataCollectionRequest.post(`/api/data-collection/events/${id}/deprecate`, {}),
    usage: async (id: string): Promise<ApiResponse<unknown>> =>
        dataCollectionRequest.get(`/api/data-collection/events/${id}/usage`),
    configProperties: async (id: string, data: EventPropertyConfigRequest[]): Promise<ApiResponse<void>> =>
        dataCollectionRequest.put(`/api/data-collection/events/${id}/properties`, data),
    getProperties: async (id: string): Promise<ApiResponse<EventPropertyDTO[]>> =>
        dataCollectionRequest.get(`/api/data-collection/events/${id}/properties`),
    syncMetric: async (id: string, data: EventMetricSyncRequest = {}): Promise<ApiResponse<EventMetricMappingDTO>> =>
        dataCollectionRequest.post(`/api/data-collection/events/${id}/sync-metric`, data),
    getMetricMapping: async (id: string): Promise<ApiResponse<EventMetricMappingDTO>> =>
        dataCollectionRequest.get(`/api/data-collection/events/${id}/metric-mapping`),
};

// ==================== 属性管理 ====================

export interface TrackingPropertyDTO {
    id: string;
    propertyCode: string;
    propertyName: string;
    propertyType: string;
    dataType: string;
    description: string;
    isRequired: boolean;
    isSensitive: boolean;
    securityLevel: string;
    enumValues: string[];
    maxLength: number;
    validationRule: string;
    standardCode: string;
    status: string;
    version: number;
    createdAt: string;
    updatedAt: string;
}

export interface TrackingPropertySaveRequest {
    propertyCode: string;
    propertyName: string;
    propertyType: string;
    dataType: string;
    description: string;
    isRequired: boolean;
    isSensitive: boolean;
    securityLevel?: string;
    enumValues?: string[];
    maxLength?: number;
    validationRule?: string;
    standardCode?: string;
}

export interface TrackingPropertyUpdateRequest extends TrackingPropertySaveRequest {
    id: string;
}

export interface TrackingPropertyPageQuery {
    pageNo?: number;
    pageSize?: number;
    propertyCode?: string;
    propertyName?: string;
    propertyType?: string;
    dataType?: string;
    isSensitive?: boolean;
    status?: string;
}

export interface PropertyDimensionSyncRequest {
    dimCode?: string;
    dimName?: string;
    dimType?: string;
    categoryId?: string;
    owner?: string;
}

export interface PropertyDimensionMappingDTO {
    id: string;
    propertyId: string;
    propertyCode: string;
    dimId?: string;
    dimCode: string;
    syncStatus: string;
    errorMessage?: string;
}

export const propertyApi = {
    page: async (query: TrackingPropertyPageQuery): Promise<ApiResponse<PageResult<TrackingPropertyDTO>>> =>
        dataCollectionRequest.post('/api/data-collection/properties/page', query),
    create: async (data: TrackingPropertySaveRequest): Promise<ApiResponse<TrackingPropertyDTO>> =>
        dataCollectionRequest.post('/api/data-collection/properties', data),
    update: async (id: string, data: TrackingPropertySaveRequest): Promise<ApiResponse<TrackingPropertyDTO>> =>
        dataCollectionRequest.put(`/api/data-collection/properties/${id}`, data),
    getById: async (id: string): Promise<ApiResponse<TrackingPropertyDTO>> =>
        dataCollectionRequest.get(`/api/data-collection/properties/${id}`),
    publish: async (id: string): Promise<ApiResponse<void>> =>
        dataCollectionRequest.post(`/api/data-collection/properties/${id}/publish`, {}),
    deprecate: async (id: string): Promise<ApiResponse<void>> =>
        dataCollectionRequest.post(`/api/data-collection/properties/${id}/deprecate`, {}),
    usage: async (id: string): Promise<ApiResponse<unknown>> =>
        dataCollectionRequest.get(`/api/data-collection/properties/${id}/usage`),
    syncDimension: async (id: string, data: PropertyDimensionSyncRequest = {}): Promise<ApiResponse<PropertyDimensionMappingDTO>> =>
        dataCollectionRequest.post(`/api/data-collection/properties/${id}/sync-dimension`, data),
    getDimensionMapping: async (id: string): Promise<ApiResponse<PropertyDimensionMappingDTO>> =>
        dataCollectionRequest.get(`/api/data-collection/properties/${id}/dimension-mapping`),
};

// ==================== 接入应用 ====================

export interface TrackingAppDTO {
    id: string;
    appCode: string;
    appName: string;
    appType: string;
    description: string;
    secretKey: string;
    reportUrl: string;
    status: string;
    createdAt: string;
    updatedAt: string;
}

export interface TrackingAppSaveRequest {
    appCode: string;
    appName: string;
    appType: string;
    description?: string;
    reportUrl?: string;
}

export interface TrackingAppUpdateRequest extends TrackingAppSaveRequest {
    id: string;
}

export interface TrackingAppPageQuery {
    pageNo?: number;
    pageSize?: number;
    appCode?: string;
    appName?: string;
    appType?: string;
    status?: string;
}

export const appApi = {
    page: async (query: TrackingAppPageQuery): Promise<ApiResponse<PageResult<TrackingAppDTO>>> =>
        dataCollectionRequest.post('/api/data-collection/apps/page', query),
    create: async (data: TrackingAppSaveRequest): Promise<ApiResponse<TrackingAppDTO>> =>
        dataCollectionRequest.post('/api/data-collection/apps', data),
    update: async (id: string, data: TrackingAppSaveRequest): Promise<ApiResponse<TrackingAppDTO>> =>
        dataCollectionRequest.put(`/api/data-collection/apps/${id}`, data),
    getById: async (id: string): Promise<ApiResponse<TrackingAppDTO>> =>
        dataCollectionRequest.get(`/api/data-collection/apps/${id}`),
    rotateSecret: async (id: string): Promise<ApiResponse<void>> =>
        dataCollectionRequest.post(`/api/data-collection/apps/${id}/secret/rotate`, {}),
    integrationCode: async (id: string): Promise<ApiResponse<string>> =>
        dataCollectionRequest.get(`/api/data-collection/apps/${id}/integration-code`),
};

// ==================== 事件上报 ====================

export interface CollectEventRequest {
    appCode: string;
    debugToken?: string;
    eventCode: string;
    eventTime: string;
    terminalType: string;
    environment: string;
    userId?: string;
    anonymousId?: string;
    sessionId?: string;
    deviceId?: string;
    sdkVersion?: string;
    appVersion?: string;
    pageCode?: string;
    requestId?: string;
    properties?: Record<string, unknown>;
}

export interface CollectEventResponse {
    accepted: boolean;
    sampleId: string;
    validateStatus: string;
    errors: string[];
}

export const collectApi = {
    collect: async (data: CollectEventRequest): Promise<ApiResponse<CollectEventResponse>> =>
        dataCollectionRequest.post('/api/data-collection/collect/events', data),
    collectBatch: async (data: CollectEventRequest[]): Promise<ApiResponse<CollectEventResponse[]>> =>
        dataCollectionRequest.post('/api/data-collection/collect/events/batch', data),
};

// ==================== Debug 控制台 ====================

export interface DebugSessionDTO {
    id: string;
    debugToken: string;
    appCode: string;
    userId: string;
    anonymousId: string;
    deviceId: string;
    environment: string;
    expiredAt: string;
    status: string;
    createdAt: string;
}

export interface DebugSessionSaveRequest {
    debugToken: string;
    appCode?: string;
    userId?: string;
    anonymousId?: string;
    deviceId?: string;
    environment?: string;
    expiredAt?: string;
}

export interface EventSampleDTO {
    id: string;
    appCode: string;
    debugToken: string;
    eventCode: string;
    eventTime: string;
    ingestionTime: string;
    terminalType: string;
    environment: string;
    userId: string;
    anonymousId: string;
    sessionId: string;
    deviceId: string;
    sdkVersion: string;
    appVersion: string;
    pageCode: string;
    requestId: string;
    payload: string;
    validateStatus: string;
    validateErrors: string;
}

export interface EventSamplePageQuery {
    pageNo?: number;
    pageSize?: number;
    debugToken?: string;
    userId?: string;
    anonymousId?: string;
    deviceId?: string;
    eventCode?: string;
    environment?: string;
    startTime?: string;
    endTime?: string;
}

export const debugApi = {
    createSession: async (data: DebugSessionSaveRequest): Promise<ApiResponse<DebugSessionDTO>> =>
        dataCollectionRequest.post('/api/data-collection/debug/sessions', data),
    getSession: async (id: string): Promise<ApiResponse<DebugSessionDTO>> =>
        dataCollectionRequest.get(`/api/data-collection/debug/sessions/${id}`),
    listSessions: async (): Promise<ApiResponse<DebugSessionDTO[]>> =>
        dataCollectionRequest.get('/api/data-collection/debug/sessions'),
    pageEvents: async (query: EventSamplePageQuery): Promise<ApiResponse<PageResult<EventSampleDTO>>> =>
        dataCollectionRequest.post('/api/data-collection/debug/events/page', query),
    getEvent: async (id: string): Promise<ApiResponse<EventSampleDTO>> =>
        dataCollectionRequest.get(`/api/data-collection/debug/events/${id}`),
};

// ==================== 验收中心 ====================

export interface TrackingAcceptanceTaskDTO {
    id: string;
    taskCode: string;
    planId: string;
    debugToken: string;
    environment: string;
    status: string;
    eventCoverageRate: number;
    requiredPropertyCompleteRate: number;
    typeValidRate: number;
    resultSummary: string;
    createdAt: string;
    updatedAt: string;
}

export interface TrackingAcceptanceResultDTO {
    id: string;
    taskId: string;
    eventId: string;
    eventCode: string;
    status: string;
    errorItems: string[];
    sampleIds: string[];
}

export interface TrackingAcceptanceTaskCreateRequest {
    planId: string;
    debugToken: string;
    environment?: string;
}

export interface TrackingAcceptanceTaskPageQuery {
    pageNo?: number;
    pageSize?: number;
    planId?: string;
    status?: string;
}

export const acceptanceApi = {
    create: async (data: TrackingAcceptanceTaskCreateRequest): Promise<ApiResponse<TrackingAcceptanceTaskDTO>> =>
        dataCollectionRequest.post('/api/data-collection/acceptance/tasks', data),
    page: async (query: TrackingAcceptanceTaskPageQuery): Promise<ApiResponse<PageResult<TrackingAcceptanceTaskDTO>>> =>
        dataCollectionRequest.post('/api/data-collection/acceptance/tasks/page', query),
    getById: async (id: string): Promise<ApiResponse<TrackingAcceptanceTaskDTO>> =>
        dataCollectionRequest.get(`/api/data-collection/acceptance/tasks/${id}`),
    run: async (id: string): Promise<ApiResponse<TrackingAcceptanceTaskDTO>> =>
        dataCollectionRequest.post(`/api/data-collection/acceptance/tasks/${id}/run`, {}),
    approve: async (id: string): Promise<ApiResponse<TrackingAcceptanceTaskDTO>> =>
        dataCollectionRequest.post(`/api/data-collection/acceptance/tasks/${id}/approve`, {}),
    reject: async (id: string): Promise<ApiResponse<TrackingAcceptanceTaskDTO>> =>
        dataCollectionRequest.post(`/api/data-collection/acceptance/tasks/${id}/reject`, {}),
};

// ==================== 发布中心 ====================

export interface TrackingReleaseDTO {
    id: string;
    releaseCode: string;
    planId: string;
    version: number;
    status: string;
    diffSummary: string;
    publishedAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface TrackingReleaseItemDTO {
    id: string;
    releaseId: string;
    itemType: string;
    itemId: string;
    itemCode: string;
    changeType: string;
    snapshot: string;
}

export interface TrackingReleaseCreateRequest {
    planId: string;
}

export interface TrackingReleasePageQuery {
    pageNo?: number;
    pageSize?: number;
    planId?: string;
    status?: string;
}

export const releaseApi = {
    create: async (data: TrackingReleaseCreateRequest): Promise<ApiResponse<TrackingReleaseDTO>> =>
        dataCollectionRequest.post('/api/data-collection/releases', data),
    page: async (query: TrackingReleasePageQuery): Promise<ApiResponse<PageResult<TrackingReleaseDTO>>> =>
        dataCollectionRequest.post('/api/data-collection/releases/page', query),
    getById: async (id: string): Promise<ApiResponse<TrackingReleaseDTO>> =>
        dataCollectionRequest.get(`/api/data-collection/releases/${id}`),
    getDiff: async (id: string): Promise<ApiResponse<TrackingReleaseItemDTO[]>> =>
        dataCollectionRequest.get(`/api/data-collection/releases/${id}/diff`),
    submit: async (id: string): Promise<ApiResponse<TrackingReleaseDTO>> =>
        dataCollectionRequest.post(`/api/data-collection/releases/${id}/submit`, {}),
    publish: async (id: string): Promise<ApiResponse<TrackingReleaseDTO>> =>
        dataCollectionRequest.post(`/api/data-collection/releases/${id}/publish`, {}),
};

// ==================== 质量监控 ====================

export interface QualityOverviewDTO {
    appCode: string;
    eventCode: string;
    totalCount: number;
    passCount: number;
    warnCount: number;
    failCount: number;
    passRate: number;
}

export interface QualityTrendDTO {
    timeLabel: string;
    totalCount: number;
    passCount: number;
    warnCount: number;
    failCount: number;
}

export interface TrackingAlertDTO {
    id: string;
    alertType: string;
    appCode: string;
    eventCode: string;
    alertLevel: string;
    alertMessage: string;
    status: string;
    triggeredAt: string;
    closedAt: string;
}

export interface QualityOverviewRequest {
    appCode?: string;
    eventCode?: string;
}

export interface QualityTrendRequest {
    appCode?: string;
    eventCode?: string;
    startTime?: string;
    endTime?: string;
}

export interface TrackingAlertPageQuery {
    pageNo?: number;
    pageSize?: number;
    appCode?: string;
    eventCode?: string;
    alertType?: string;
    alertLevel?: string;
    status?: string;
}

export const qualityApi = {
    overview: async (data: QualityOverviewRequest): Promise<ApiResponse<QualityOverviewDTO[]>> =>
        dataCollectionRequest.post('/api/data-collection/quality/events/overview', data),
    trend: async (data: QualityTrendRequest): Promise<ApiResponse<QualityTrendDTO[]>> =>
        dataCollectionRequest.post('/api/data-collection/quality/events/trend', data),
    alertPage: async (query: TrackingAlertPageQuery): Promise<ApiResponse<PageResult<TrackingAlertDTO>>> =>
        dataCollectionRequest.post('/api/data-collection/quality/alerts/page', query),
    closeAlert: async (id: string): Promise<ApiResponse<void>> =>
        dataCollectionRequest.post(`/api/data-collection/quality/alerts/${id}/close`, {}),
};

// ==================== 工作台 ====================

export interface WorkbenchSummaryDTO {
    eventCount: number;
    propertyCount: number;
    planCount: number;
    todaySampleCount: number;
    todayFailSampleCount: number;
    reviewingPlanCount: number;
    pendingTaskCount: number;
    openAlertCount: number;
}

export interface WorkbenchTodoDTO {
    id: string;
    todoType: string;
    todoCode: string;
    todoName: string;
    todoStatus: string;
    todoTime: string;
}

export interface WorkbenchQualityRiskDTO {
    id: string;
    alertType: string;
    appCode: string;
    eventCode: string;
    alertLevel: string;
    alertMessage: string;
    triggeredAt: string;
}

export const workbenchApi = {
    summary: async (): Promise<ApiResponse<WorkbenchSummaryDTO>> =>
        dataCollectionRequest.get('/api/data-collection/workbench/summary'),
    todos: async (): Promise<ApiResponse<WorkbenchTodoDTO[]>> =>
        dataCollectionRequest.get('/api/data-collection/workbench/todos'),
    qualityRisks: async (): Promise<ApiResponse<WorkbenchQualityRiskDTO[]>> =>
        dataCollectionRequest.get('/api/data-collection/workbench/quality-risks'),
};

// ==================== 采集指标链路 ====================

export interface TrackingMetricPipelineDTO {
    id: string;
    metricCode: string;
    metricName: string;
    eventCode: string;
    appCode: string;
    topicName: string;
    odsTableName: string;
    dwdTableName: string;
    dwsTableName: string;
    adsTableName: string;
    dataworksJobId: string;
    dataworksInstanceId: string;
    flinkDeploymentName: string;
    status: string;
    errorMessage: string;
    createdAt: string;
    updatedAt: string;
    createBy: string;
}

export interface TrackingMetricPipelineCreateRequest {
    metricCode: string;
    metricName: string;
    eventCode: string;
    appCode?: string;
    dimensions?: string[];
    measures?: { name: string; expr: string }[];
}

export interface TrackingMetricPipelinePageQuery {
    pageNo?: number;
    pageNum?: number;
    pageSize?: number;
    metricCode?: string;
    metricName?: string;
    status?: string;
}

export const metricPipelineApi = {
    page: async (query: TrackingMetricPipelinePageQuery): Promise<ApiResponse<PageResult<TrackingMetricPipelineDTO>>> =>
        dataCollectionRequest.post('/api/data-collection/metric-pipelines/page', query),
    create: async (data: TrackingMetricPipelineCreateRequest): Promise<ApiResponse<TrackingMetricPipelineDTO>> =>
        dataCollectionRequest.post('/api/data-collection/metric-pipelines', data),
    getById: async (id: string): Promise<ApiResponse<TrackingMetricPipelineDTO>> =>
        dataCollectionRequest.get(`/api/data-collection/metric-pipelines/${id}`),
    provision: async (id: string): Promise<ApiResponse<TrackingMetricPipelineDTO>> =>
        dataCollectionRequest.post(`/api/data-collection/metric-pipelines/${id}/provision`, {}),
    start: async (id: string): Promise<ApiResponse<TrackingMetricPipelineDTO>> =>
        dataCollectionRequest.post(`/api/data-collection/metric-pipelines/${id}/start`, {}),
};
