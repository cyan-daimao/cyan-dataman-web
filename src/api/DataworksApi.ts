import { dataworksRequest } from "./Request";
import { Response } from './Response';
import { AxiosRequestConfig } from "axios";

// ==================== DTO 定义 ====================

/**
 * 数据加工任务 DTO
 */
export interface DataWorkTaskDTO {
    id: string;
    name: string;
    description?: string;
    engineType: 'SPARK' | 'FLINK';
    sqlContent: string;
    status: 'DRAFT' | 'ONLINE' | 'OFFLINE';
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
}

/**
 * 调度配置 DTO
 */
export interface ScheduleConfigDTO {
    id: string;
    jobId: string;
    cronExpression: string;
    enabled: boolean;
    nextExecuteTime?: string;
}

/**
 * 执行记录 DTO
 */
export interface ExecutionRecordDTO {
    id: string;
    taskId: string;
    taskName: string;
    engineType: 'SPARK' | 'FLINK';
    sqlContent: string;
    status: 'RUNNING' | 'SUCCESS' | 'FAILED';
    costTimeMs?: number;
    resultData?: string;
    errorMessage?: string;
    createdAt?: string;
}

// ==================== 分页类型 ====================

/**
 * 分页响应
 */
export interface Page<T> {
    data: T[];
    current: number;
    size: number;
    total: number;
}

/**
 * 任务分页查询参数
 */
export interface DataWorkTaskPageQuery {
    name?: string;
    engineType?: string;
    current?: number;
    size?: number;
}

/**
 * 执行记录分页查询参数
 */
export interface ExecutionPageQuery {
    current?: number;
    size?: number;
}

// ==================== 任务管理 API ====================

/**
 * 分页查询任务列表
 */
export const pageDataWorkTasks = async (query: DataWorkTaskPageQuery): Promise<Page<DataWorkTaskDTO>> => {
    const config: AxiosRequestConfig = {
        params: query
    };
    const resp = await dataworksRequest.get('/api/v1/data-work/tasks', config);
    return resp.data;
};

/**
 * 获取任务详情
 */
export const getDataWorkTask = async (id: string): Promise<DataWorkTaskDTO> => {
    const resp = await dataworksRequest.get(`/api/v1/data-work/tasks/${id}`);
    return resp.data;
};

/**
 * 创建任务
 */
export const createDataWorkTask = async (body: Omit<DataWorkTaskDTO, 'id' | 'status' | 'createdBy' | 'createdAt' | 'updatedAt'>): Promise<Response<DataWorkTaskDTO>> => {
    return await dataworksRequest.post('/api/v1/data-work/tasks', body);
};

/**
 * 更新任务
 */
export const updateDataWorkTask = async (id: string, body: Omit<DataWorkTaskDTO, 'id' | 'status' | 'createdBy' | 'createdAt' | 'updatedAt'>): Promise<Response<DataWorkTaskDTO>> => {
    return await dataworksRequest.put(`/api/v1/data-work/tasks/${id}`, body);
};

/**
 * 删除任务
 */
export const deleteDataWorkTask = async (id: string): Promise<Response<void>> => {
    return await dataworksRequest.delete(`/api/v1/data-work/tasks/${id}`);
};

// ==================== 调度配置 API ====================

/**
 * 获取作业调度配置
 */
export const getJobSchedule = async (jobId: string): Promise<ScheduleConfigDTO> => {
    const resp = await dataworksRequest.get(`/api/v1/data-work/jobs/${jobId}/schedule`);
    return resp.data;
};

/**
 * 保存作业调度配置
 */
export const saveJobSchedule = async (jobId: string, body: { cronExpression: string; enabled: boolean }): Promise<Response<ScheduleConfigDTO>> => {
    return await dataworksRequest.put(`/api/v1/data-work/jobs/${jobId}/schedule`, body);
};

// ==================== 执行 API ====================

/**
 * 手动执行任务
 */
export const executeTask = async (id: string): Promise<Response<ExecutionRecordDTO>> => {
    return await dataworksRequest.post(`/api/v1/data-work/tasks/${id}/execute`);
};

/**
 * 获取任务的执行记录列表
 */
export const pageTaskExecutions = async (taskId: string, query: ExecutionPageQuery): Promise<Page<ExecutionRecordDTO>> => {
    const config: AxiosRequestConfig = {
        params: query
    };
    const resp = await dataworksRequest.get(`/api/v1/data-work/tasks/${taskId}/executions`, config);
    return resp.data;
};

/**
 * 分页查询全部执行记录
 */
export const pageAllExecutions = async (query: ExecutionPageQuery): Promise<Page<ExecutionRecordDTO>> => {
    const config: AxiosRequestConfig = {
        params: query
    };
    const resp = await dataworksRequest.get('/api/v1/data-work/executions', config);
    return resp.data;
};

/**
 * 获取执行记录详情
 */
export const getExecutionRecord = async (id: string): Promise<ExecutionRecordDTO> => {
    const resp = await dataworksRequest.get(`/api/v1/data-work/executions/${id}`);
    return resp.data;
};

// ==================== Job / JobInstance API（新领域模型） ====================

/**
 * 数据加工作业 DTO
 */
export interface JobDTO {
    id: string;
    folderId?: number;
    name: string;
    description?: string;
    engineType: 'SPARK' | 'FLINK';
    sqlContent: string;
    status: 'DRAFT' | 'ONLINE' | 'OFFLINE';
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
}

/**
 * 数据加工作业实例 DTO
 */
export interface JobInstanceDTO {
    id: string;
    jobId: string;
    jobName: string;
    engineType: 'SPARK' | 'FLINK';
    sqlContent: string;
    status: 'RUNNING' | 'SUCCESS' | 'FAILED';
    costTimeMs?: number;
    resultData?: string;
    errorMessage?: string;
    createdAt?: string;
}

/**
 * 分页查询作业列表
 */
export const pageJobs = async (query: { name?: string; engineType?: string; folderId?: number; current?: number; size?: number }): Promise<Page<JobDTO>> => {
    const config: AxiosRequestConfig = { params: query };
    const resp = await dataworksRequest.get('/api/v1/data-work/jobs', config);
    return resp.data;
};

/**
 * 获取作业详情
 */
export const getJob = async (id: string): Promise<JobDTO> => {
    const resp = await dataworksRequest.get(`/api/v1/data-work/jobs/${id}`);
    return resp.data;
};

/**
 * 创建作业
 */
export const createJob = async (body: Omit<JobDTO, 'id' | 'status' | 'createdBy' | 'createdAt' | 'updatedAt'>): Promise<Response<JobDTO>> => {
    return await dataworksRequest.post('/api/v1/data-work/jobs', body);
};

/**
 * 更新作业
 */
export const updateJob = async (id: string, body: Omit<JobDTO, 'id' | 'status' | 'createdBy' | 'createdAt' | 'updatedAt'>): Promise<Response<JobDTO>> => {
    return await dataworksRequest.put(`/api/v1/data-work/jobs/${id}`, body);
};

/**
 * 删除作业
 */
export const deleteJob = async (id: string): Promise<Response<void>> => {
    return await dataworksRequest.delete(`/api/v1/data-work/jobs/${id}`);
};

/**
 * 手动执行作业，生成实例
 */
export const executeJob = async (jobId: string): Promise<Response<JobInstanceDTO>> => {
    return await dataworksRequest.post(`/api/v1/data-work/jobs/${jobId}/execute`);
};

/**
 * 分页查询作业实例（按作业）
 */
export const pageJobInstances = async (jobId: string, query: { status?: string; current?: number; size?: number }): Promise<Page<JobInstanceDTO>> => {
    const config: AxiosRequestConfig = { params: query };
    const resp = await dataworksRequest.get(`/api/v1/data-work/jobs/${jobId}/instances`, config);
    return resp.data;
};

/**
 * 分页查询全部实例
 */
export const pageAllJobInstances = async (query: { status?: string; current?: number; size?: number }): Promise<Page<JobInstanceDTO>> => {
    const config: AxiosRequestConfig = { params: query };
    const resp = await dataworksRequest.get('/api/v1/data-work/instances', config);
    return resp.data;
};

/**
 * 获取实例详情
 */
export const getJobInstance = async (id: string): Promise<JobInstanceDTO> => {
    const resp = await dataworksRequest.get(`/api/v1/data-work/instances/${id}`);
    return resp.data;
};

/**
 * 重试实例
 */
export const retryJobInstance = async (id: string): Promise<Response<JobInstanceDTO>> => {
    return await dataworksRequest.post(`/api/v1/data-work/instances/${id}/retry`);
};

/**
 * 终止实例
 */
export const terminateJobInstance = async (id: string): Promise<Response<JobInstanceDTO>> => {
    return await dataworksRequest.post(`/api/v1/data-work/instances/${id}/terminate`);
};

/**
 * 发布作业（状态变为 ONLINE）
 */
export const publishJob = async (id: string): Promise<Response<JobDTO>> => {
    return await dataworksRequest.put(`/api/v1/data-work/jobs/${id}/publish`);
};

/**
 * 下线作业（状态变为 OFFLINE）
 */
export const offlineJob = async (id: string): Promise<Response<JobDTO>> => {
    return await dataworksRequest.put(`/api/v1/data-work/jobs/${id}/offline`);
};
