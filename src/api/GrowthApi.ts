import { datagrowthRequest } from './Request';
import { Response } from './Response';
import { FilterRef, MetricRef, DimensionRef, OrderRef } from './DatabiApi';

export interface MetricAudienceSelectionCmd {
    entityType?: string;
    entityIdDimCode?: string;
    metrics: MetricRef[];
    dimensions: DimensionRef[];
    filters: FilterRef[];
    orders: OrderRef[];
    limitValue?: number;
}

export interface SelectionEstimateDTO {
    queryHash: string;
    estimatedCount: number;
    countSql: string;
}

export interface GrowthTaskDTO {
    id: string;
    snapshotId?: string;
    status: string;
    resultCount?: number;
    errorMessage?: string;
    startedAt?: string;
    finishedAt?: string;
}

export interface AudienceDTO {
    id: string;
    audienceName: string;
    audienceDesc?: string;
    entityType: string;
    status: string;
    latestTaskId?: string;
    latestSnapshotId?: string;
    latestCount?: number;
    createBy?: string;
    createdAt?: string;
    updatedAt?: string;
    ruleJson?: string;
    latestTask?: GrowthTaskDTO;
}

export interface TagDTO {
    id: string;
    tagCode: string;
    tagName: string;
    tagDesc?: string;
    entityType: string;
    tagValue: string;
    status: string;
    latestTaskId?: string;
    latestSnapshotId?: string;
    latestCount?: number;
    createBy?: string;
    createdAt?: string;
    updatedAt?: string;
    ruleJson?: string;
    latestTask?: GrowthTaskDTO;
}

export interface AudienceCreateRequest {
    audienceName: string;
    audienceDesc?: string;
    selection: MetricAudienceSelectionCmd;
}

export interface TagCreateRequest {
    tagCode: string;
    tagName: string;
    tagDesc?: string;
    tagValue?: string;
    selection: MetricAudienceSelectionCmd;
}

export const growthSelectionApi = {
    estimate: async (selection: MetricAudienceSelectionCmd): Promise<Response<SelectionEstimateDTO>> =>
        datagrowthRequest.post('/api/v1/growth/selection/estimate', { selection }),
};

export const audienceApi = {
    create: async (data: AudienceCreateRequest): Promise<Response<AudienceDTO>> =>
        datagrowthRequest.post('/api/v1/growth/audiences', data),
    list: async (params?: { keyword?: string }): Promise<Response<AudienceDTO[]>> =>
        datagrowthRequest.get('/api/v1/growth/audiences', { params }),
    getById: async (id: string): Promise<Response<AudienceDTO>> =>
        datagrowthRequest.get(`/api/v1/growth/audiences/${id}`),
    run: async (id: string): Promise<Response<AudienceDTO>> =>
        datagrowthRequest.post(`/api/v1/growth/audiences/${id}/run`),
};

export const tagApi = {
    create: async (data: TagCreateRequest): Promise<Response<TagDTO>> =>
        datagrowthRequest.post('/api/v1/growth/tags', data),
    list: async (params?: { keyword?: string }): Promise<Response<TagDTO[]>> =>
        datagrowthRequest.get('/api/v1/growth/tags', { params }),
    getById: async (id: string): Promise<Response<TagDTO>> =>
        datagrowthRequest.get(`/api/v1/growth/tags/${id}`),
    run: async (id: string): Promise<Response<TagDTO>> =>
        datagrowthRequest.post(`/api/v1/growth/tags/${id}/run`),
};
