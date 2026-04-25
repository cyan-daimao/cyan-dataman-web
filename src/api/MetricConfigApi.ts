import { datametricRequest, datamanRequest } from './Request';
import { ApiResponse } from './Response';
import { AxiosRequestConfig } from 'axios';
import { PageResult, PageQuery, PeriodType, RelativeUnit } from './MetricApi';

// ==================== 修饰词 ====================

export interface ModifierDTO {
    id: string;
    modifierCode: string;
    modifierName: string;
    fieldName: string;
    operator: string;
    fieldValues: string[];
    description: string;
}

export interface ModifierCmd {
    modifierName: string;
    fieldName: string;
    operator: string;
    fieldValues: string[];
    description?: string;
}

export interface ModifierPageQuery extends PageQuery {
    modifierName?: string;
}

// ==================== 时间周期 ====================

export interface TimePeriodDTO {
    id: string;
    periodCode: string;
    periodName: string;
    periodType: PeriodType;
    relativeValue?: number;
    relativeUnit?: RelativeUnit;
    startDate?: string;
    endDate?: string;
}

export interface TimePeriodCmd {
    periodName: string;
    periodType: PeriodType;
    relativeValue?: number;
    relativeUnit?: RelativeUnit;
    startDate?: string;
    endDate?: string;
}

// ==================== 公共维度 ====================

export enum DimType {
    ENUM = 'ENUM',
    STRING = 'STRING',
    DATE = 'DATE',
    NUMBER = 'NUMBER',
    GEO = 'GEO',
}

export enum DataType {
    STRING = 'STRING',
    INT = 'INT',
    BIGINT = 'BIGINT',
    DECIMAL = 'DECIMAL',
    DATE = 'DATE',
    DATETIME = 'DATETIME',
}

export interface DimensionDTO {
    id: string;
    dimCode: string;
    dimName: string;
    dimType: DimType;
    dataType: DataType;
    dimValues?: string[];
    categoryId?: string;
    categoryName?: string;
    tableName?: string;
    columnName?: string;
    description?: string;
}

export interface DimensionCmd {
    dimName: string;
    dimType: DimType;
    dataType: DataType;
    dimValues?: string[];
    categoryId?: string;
    tableName?: string;
    columnName?: string;
    description?: string;
}

export interface DimensionPageQuery extends PageQuery {
    dimName?: string;
    categoryId?: string;
}

// ==================== API 常量 ====================

const BASE = '/api/v1/metrics';

// ==================== 修饰词 API ====================

export const ModifierApi = {
    /**
     * 分页查询修饰词
     * GET /api/v1/metrics/modifiers/page
     */
    page: async (query: ModifierPageQuery): Promise<ApiResponse<PageResult<ModifierDTO>>> => {
        const config: AxiosRequestConfig = { params: query };
        return datametricRequest.get(`${BASE}/modifiers/page`, config);
    },

    /**
     * 查询修饰词详情
     * GET /api/v1/metrics/modifiers/{id}
     */
    detail: async (id: string): Promise<ApiResponse<ModifierDTO>> => {
        return datametricRequest.get(`${BASE}/modifiers/${id}`);
    },

    /**
     * 创建修饰词
     * POST /api/v1/metrics/modifiers
     */
    create: async (data: ModifierCmd): Promise<ApiResponse<ModifierDTO>> => {
        return datametricRequest.post(`${BASE}/modifiers`, data);
    },

    /**
     * 更新修饰词
     * PUT /api/v1/metrics/modifiers/{id}
     */
    update: async (id: string, data: ModifierCmd): Promise<ApiResponse<ModifierDTO>> => {
        return datametricRequest.put(`${BASE}/modifiers/${id}`, data);
    },

    /**
     * 删除修饰词
     * DELETE /api/v1/metrics/modifiers/{id}
     */
    delete: async (id: string): Promise<ApiResponse<void>> => {
        return datametricRequest.delete(`${BASE}/modifiers/${id}`);
    },
};

// ==================== 时间周期 API ====================

export const TimePeriodApi = {
    /**
     * 全量列表
     * GET /api/v1/metrics/time-periods
     */
    list: async (): Promise<ApiResponse<TimePeriodDTO[]>> => {
        return datametricRequest.get(`${BASE}/time-periods`);
    },

    /**
     * 查询时间周期详情
     * GET /api/v1/metrics/time-periods/{id}
     */
    detail: async (id: string): Promise<ApiResponse<TimePeriodDTO>> => {
        return datametricRequest.get(`${BASE}/time-periods/${id}`);
    },

    /**
     * 创建时间周期
     * POST /api/v1/metrics/time-periods
     */
    create: async (data: TimePeriodCmd): Promise<ApiResponse<TimePeriodDTO>> => {
        return datametricRequest.post(`${BASE}/time-periods`, data);
    },

    /**
     * 更新时间周期
     * PUT /api/v1/metrics/time-periods/{id}
     */
    update: async (id: string, data: TimePeriodCmd): Promise<ApiResponse<TimePeriodDTO>> => {
        return datametricRequest.put(`${BASE}/time-periods/${id}`, data);
    },

    /**
     * 删除时间周期
     * DELETE /api/v1/metrics/time-periods/{id}
     */
    delete: async (id: string): Promise<ApiResponse<void>> => {
        return datametricRequest.delete(`${BASE}/time-periods/${id}`);
    },
};

// ==================== 维表选择 API ====================

export interface MetadataColumnDTO {
    id: string;
    col: string;
    dataType: string;
    comment?: string;
}

/**
 * dataman 分页结构（与 datametric 的 PageResult 不同）
 */
export interface DatamanPageResult<T> {
    data: T[];
    current: number;
    size: number;
    total: number;
    pageCount: number;
}

export interface MetadataTableItem {
    id: string;
    name: string;
    subjectName?: string;
    layerCode?: string;
    comment?: string;
    table?: {
        catalog: string;
        schema: string;
        name: string;
        comment?: string;
    };
}

export const MetadataTableSelectorApi = {
    /**
     * 获取 dataman 的元数据表列表（用于数仓表选择）
     * GET /api/v1/metadata/tables
     *
     * 注意：dataman 返回分页字段为 data/current/size/total/pageCount，
     * 与 datametric 的 list/pageNum/pageSize 不同，需单独定义类型。
     */
    list: async (query?: { layerCode?: string; keyword?: string }): Promise<ApiResponse<DatamanPageResult<MetadataTableItem>>> => {
        const config: AxiosRequestConfig = { params: query };
        return datamanRequest.get('/api/v1/metadata/tables', config);
    },

    /**
     * 获取 dataman 的元数据表字段列表
     * GET /api/v1/metadata/tables/{id}/columns
     */
    columns: async (tableId: string): Promise<ApiResponse<MetadataColumnDTO[]>> => {
        return datamanRequest.get(`/api/v1/metadata/tables/${tableId}/columns`);
    }
};

// ==================== 公共维度 API ====================

export const DimensionApi = {
    /**
     * 分页查询公共维度
     * GET /api/v1/metrics/dimensions/page
     */
    page: async (query: DimensionPageQuery): Promise<ApiResponse<PageResult<DimensionDTO>>> => {
        const config: AxiosRequestConfig = { params: query };
        return datametricRequest.get(`${BASE}/dimensions/page`, config);
    },

    /**
     * 查询公共维度详情
     * GET /api/v1/metrics/dimensions/{id}
     */
    detail: async (id: string): Promise<ApiResponse<DimensionDTO>> => {
        return datametricRequest.get(`${BASE}/dimensions/${id}`);
    },

    /**
     * 创建公共维度
     * POST /api/v1/metrics/dimensions
     */
    create: async (data: DimensionCmd): Promise<ApiResponse<DimensionDTO>> => {
        return datametricRequest.post(`${BASE}/dimensions`, data);
    },

    /**
     * 更新公共维度
     * PUT /api/v1/metrics/dimensions/{id}
     */
    update: async (id: string, data: DimensionCmd): Promise<ApiResponse<DimensionDTO>> => {
        return datametricRequest.put(`${BASE}/dimensions/${id}`, data);
    },

    /**
     * 删除公共维度
     * DELETE /api/v1/metrics/dimensions/{id}
     */
    delete: async (id: string): Promise<ApiResponse<void>> => {
        return datametricRequest.delete(`${BASE}/dimensions/${id}`);
    },
};
