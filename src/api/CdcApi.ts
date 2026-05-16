import { datamanRequest } from "./Request";
import { Response } from './Response';

// ==================== DTO 定义 ====================

/**
 * CDC 配置 DTO（与后端 CdcConfigDTO 对应）
 */
export interface CdcConfigDTO {
    id: string;
    name: string;
    dsName: string;
    dbName: string;
    tableName: string;
    icebergTableName: string;
    syncTool: 'SPARK' | 'FLINK';
    syncSql?: string;
    enabled: boolean;
    description?: string;
    connectorName?: string;
    runningStatus: 'INIT' | 'RUNNING' | 'STOP' | 'SUCCESS' | 'ERROR';
    msg?: string;
    createBy?: string;
    updateBy?: string;
    createdAt?: string;
    updatedAt?: string;
}

/**
 * CDC 配置创建/更新请求
 */
export interface CdcConfigCmd {
    name: string;
    dsName: string;
    dbName: string;
    tableName: string;
    icebergTableName: string;
    syncTool: 'SPARK' | 'FLINK';
    syncSql?: string;
    description?: string;
    createBy?: string;
    updateBy?: string;
}

/**
 * CDC 列表查询参数
 */
export interface CdcConfigListQuery {
    dsName?: string;
    dbName?: string;
    tableName?: string;
    enabled?: boolean;
    syncTool?: 'SPARK' | 'FLINK';
}

// ==================== API 函数 ====================

/**
 * 查询 CDC 配置列表
 */
export const listCdcConfigs = async (query: CdcConfigListQuery): Promise<Response<CdcConfigDTO[]>> => {
    return await datamanRequest.get('/api/v1/cdc', { params: query });
};

/**
 * 根据名称获取 CDC 配置
 */
export const getCdcConfig = async (cdcName: string): Promise<Response<CdcConfigDTO>> => {
    return await datamanRequest.get(`/api/v1/cdc/${cdcName}`);
};

/**
 * 创建 CDC 配置
 */
export const createCdcConfig = async (body: CdcConfigCmd): Promise<Response<CdcConfigDTO>> => {
    return await datamanRequest.post('/api/v1/cdc', body);
};

/**
 * 更新 CDC 配置
 */
export const updateCdcConfig = async (cdcName: string, body: CdcConfigCmd): Promise<Response<CdcConfigDTO>> => {
    return await datamanRequest.put(`/api/v1/cdc/${cdcName}`, body);
};

/**
 * 启用/禁用 CDC 配置
 */
export const toggleCdcConfig = async (cdcName: string, enabled: boolean): Promise<Response<void>> => {
    return await datamanRequest.put(`/api/v1/cdc/${cdcName}/open`, null, { params: { enabled } });
};

/**
 * 删除 CDC 配置
 */
export const deleteCdcConfig = async (cdcName: string): Promise<Response<void>> => {
    return await datamanRequest.delete(`/api/v1/cdc/${cdcName}`);
};
