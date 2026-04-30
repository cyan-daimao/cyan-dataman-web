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
    taskId: string;
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
 * 获取任务调度配置
 */
export const getTaskSchedule = async (taskId: string): Promise<ScheduleConfigDTO> => {
    const resp = await dataworksRequest.get(`/api/v1/data-work/tasks/${taskId}/schedule`);
    return resp.data;
};

/**
 * 保存任务调度配置
 */
export const saveTaskSchedule = async (taskId: string, body: { cronExpression: string; enabled: boolean }): Promise<Response<ScheduleConfigDTO>> => {
    return await dataworksRequest.put(`/api/v1/data-work/tasks/${taskId}/schedule`, body);
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
 * 获取执行记录详情
 */
export const getExecutionRecord = async (id: string): Promise<ExecutionRecordDTO> => {
    const resp = await dataworksRequest.get(`/api/v1/data-work/executions/${id}`);
    return resp.data;
};
