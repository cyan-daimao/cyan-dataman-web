import { databiRequest } from './Request';
import { Response } from './Response';
import { AxiosRequestConfig } from 'axios';

// ==================== 枚举定义 ====================

export enum SourceType {
    TABLE = 'TABLE',
    SQL = 'SQL',
}

export enum FieldRole {
    DIMENSION = 'DIMENSION',
    METRIC = 'METRIC',
}

export enum ChartType {
    TABLE = 'TABLE',
    BAR = 'BAR',
    LINE = 'LINE',
    PIE = 'PIE',
    SCATTER = 'SCATTER',
    AREA = 'AREA',
    NUMBER = 'NUMBER',
    FILTER_SELECT = 'FILTER_SELECT',
    FILTER_MULTI = 'FILTER_MULTI',
    FILTER_DATE = 'FILTER_DATE',
    FILTER_DATE_RANGE = 'FILTER_DATE_RANGE',
}

export enum AggregateType {
    SUM = 'SUM',
    AVG = 'AVG',
    COUNT = 'COUNT',
    MAX = 'MAX',
    MIN = 'MIN',
    COUNT_DISTINCT = 'COUNT_DISTINCT',
}

export enum FilterOperator {
    EQ = 'EQ',
    NE = 'NE',
    GT = 'GT',
    GTE = 'GTE',
    LT = 'LT',
    LTE = 'LTE',
    LIKE = 'LIKE',
    NOT_LIKE = 'NOT_LIKE',
    IN = 'IN',
    NOT_IN = 'NOT_IN',
    IS_NULL = 'IS_NULL',
    IS_NOT_NULL = 'IS_NOT_NULL',
    BETWEEN = 'BETWEEN',
}

export enum OrderDirection {
    ASC = 'ASC',
    DESC = 'DESC',
}

export enum AnalysisType {
    DATASET = 'DATASET',
    METRICS = 'METRICS',
}

// ==================== 指标 BI 分析类型 ====================

export interface MetricBiAnalysisCmd {
    chartType: ChartType;
    metrics: MetricRef[];
    dimensions: DimensionRef[];
    filters: FilterRef[];
    orders: OrderRef[];
    limitValue?: number;
}

export interface MetricRef {
    metricCode: string;
    alias?: string;
}

export interface DimensionRef {
    dimCode: string;
    alias?: string;
}

export interface FilterRef {
    metricCode?: string;
    dimCode?: string;
    operator: FilterOperator;
    values: string[];
}

export interface OrderRef {
    metricCode?: string;
    dimCode?: string;
    direction: OrderDirection;
}

// ==================== 分页类型 ====================

export interface Page<T> {
    data: T[];
    current: number;
    size: number;
    total: number;
}

// ==================== 数据集类型 ====================

export interface DatasetField {
    name: string;
    comment: string;
    dataType: string;
    role: FieldRole;
}

export interface DatasetDTO {
    id: string;
    name: string;
    description?: string;
    sourceType: SourceType;
    sourceTable?: string;
    sourceSql?: string;
    fields: DatasetField[];
    createdBy?: string;
    updatedAt?: string;
    createdAt?: string;
}

export interface DatasetCmd {
    name: string;
    description?: string;
    sourceType: SourceType;
    sourceTable?: string;
    sourceSql?: string;
    fields?: DatasetField[];
}

// ==================== 图表类型 ====================

export interface DimensionConfig {
    field: string;
    alias?: string;
}

export interface MetricConfig {
    field: string;
    aggregate: AggregateType;
    alias?: string;
}

export interface FilterConfig {
    field: string;
    operator: FilterOperator;
    values: string[];
}

export interface OrderConfig {
    field: string;
    direction: OrderDirection;
}

export interface ChartDTO {
    id: string;
    name: string;
    description?: string;
    datasetId?: string;
    analysisType: AnalysisType;
    metricAnalysisCmd?: MetricBiAnalysisCmd;
    chartType: ChartType;
    dimensions?: DimensionConfig[];
    metrics?: MetricConfig[];
    filters?: FilterConfig[];
    orders?: OrderConfig[];
    limitValue?: number;
    sqlContent?: string;
    createdBy?: string;
    updatedAt?: string;
    createdAt?: string;
}

export interface ChartCmd {
    name: string;
    description?: string;
    datasetId?: string;
    analysisType: AnalysisType;
    metricAnalysisCmd?: MetricBiAnalysisCmd;
    chartType: ChartType;
    dimensions?: DimensionConfig[];
    metrics?: MetricConfig[];
    filters?: FilterConfig[];
    orders?: OrderConfig[];
    limitValue?: number;
    sqlContent?: string;
}

// ==================== 看板类型 ====================

export interface ChartRef {
    chartId: string;
    x: number;
    y: number;
    w: number;
    h: number;
    titleVisible?: boolean;
    borderStyle?: string;
    bgColor?: string | null;
    cascadeFrom?: string[];
}

export interface DashboardDTO {
    id: string;
    name: string;
    description?: string;
    layoutConfig?: string;
    chartRefs?: ChartRef[];
    createdBy?: string;
    updatedAt?: string;
    createdAt?: string;
}

export interface DashboardCmd {
    name: string;
    description?: string;
    layoutConfig?: string;
    chartRefs?: ChartRef[];
}

export interface DashboardChartItem {
    chartId: string;
    x: number;
    y: number;
    w: number;
    h: number;
    titleVisible?: boolean;
    borderStyle?: string;
    bgColor?: string | null;
    cascadeFrom?: string[];
    chart: ChartDTO;
}

// ==================== 分析执行类型 ====================

export interface AnalysisCmd {
    datasetId: string;
    chartType: ChartType;
    dimensions?: DimensionConfig[];
    metrics?: MetricConfig[];
    filters?: FilterConfig[];
    orders?: OrderConfig[];
    limitValue?: number;
}

export interface ChartDataDTO {
    status: string;
    costTimeMs: number;
    columns: string[];
    rows: Record<string, unknown>[];
    sql: string;
    /** 图表类型，execute 时后端返回，便于前端识别数据对应的图表类型 */
    chartType?: ChartType;
    errorMessage?: string;
}

// ==================== 数据集 API ====================

export const datasetApi = {
    /**
     * 分页查询数据集
     */
    page: async (params?: { name?: string; current?: number; size?: number }): Promise<Response<Page<DatasetDTO>>> => {
        const config: AxiosRequestConfig = { params };
        return databiRequest.get('/api/v1/datasets', config);
    },

    /**
     * 列表查询数据集
     */
    list: async (name?: string): Promise<Response<DatasetDTO[]>> => {
        const config: AxiosRequestConfig = { params: { name } };
        return databiRequest.get('/api/v1/datasets/list', config);
    },

    /**
     * 获取数据集详情
     */
    getById: async (id: string): Promise<Response<DatasetDTO>> => {
        return databiRequest.get(`/api/v1/datasets/${id}`);
    },

    /**
     * 创建数据集
     */
    create: async (data: DatasetCmd): Promise<Response<DatasetDTO>> => {
        return databiRequest.post('/api/v1/datasets', data);
    },

    /**
     * 更新数据集
     */
    update: async (id: string, data: DatasetCmd): Promise<Response<DatasetDTO>> => {
        return databiRequest.put(`/api/v1/datasets/${id}`, data);
    },

    /**
     * 删除数据集
     */
    delete: async (id: string): Promise<Response<void>> => {
        return databiRequest.delete(`/api/v1/datasets/${id}`);
    },
};

// ==================== 图表 API ====================

export const chartApi = {
    /**
     * 分页查询图表
     */
    page: async (params?: { name?: string; datasetId?: string; analysisType?: AnalysisType; chartType?: ChartType; current?: number; size?: number }): Promise<Response<Page<ChartDTO>>> => {
        const config: AxiosRequestConfig = { params };
        return databiRequest.get('/api/v1/charts', config);
    },

    /**
     * 列表查询图表
     */
    list: async (name?: string, datasetId?: string, analysisType?: AnalysisType, chartType?: ChartType): Promise<Response<ChartDTO[]>> => {
        const config: AxiosRequestConfig = { params: { name, datasetId, analysisType, chartType } };
        return databiRequest.get('/api/v1/charts/list', config);
    },

    /**
     * 获取图表详情
     */
    getById: async (id: string): Promise<Response<ChartDTO>> => {
        return databiRequest.get(`/api/v1/charts/${id}`);
    },

    /**
     * 创建图表
     */
    create: async (data: ChartCmd): Promise<Response<ChartDTO>> => {
        return databiRequest.post('/api/v1/charts', data);
    },

    /**
     * 更新图表
     */
    update: async (id: string, data: ChartCmd): Promise<Response<ChartDTO>> => {
        return databiRequest.put(`/api/v1/charts/${id}`, data);
    },

    /**
     * 删除图表
     */
    delete: async (id: string): Promise<Response<void>> => {
        return databiRequest.delete(`/api/v1/charts/${id}`);
    },

    /**
     * 执行图表分析
     * @param id 图表ID
     * @param body 可选自定义DSL（用于级联筛选场景）
     */
    execute: async (id: string, body?: { metricAnalysisCmd?: MetricBiAnalysisCmd }): Promise<Response<ChartDataDTO>> => {
        return databiRequest.post(`/api/v1/charts/${id}/execute`, body);
    },

    /**
     * 预览图表 SQL
     */
    previewSql: async (id: string): Promise<Response<string>> => {
        return databiRequest.get(`/api/v1/charts/${id}/preview-sql`);
    },
};

// ==================== 看板 API ====================

export const dashboardApi = {
    /**
     * 分页查询看板
     */
    page: async (params?: { name?: string; current?: number; size?: number }): Promise<Response<Page<DashboardDTO>>> => {
        const config: AxiosRequestConfig = { params };
        return databiRequest.get('/api/v1/dashboards', config);
    },

    /**
     * 列表查询看板
     */
    list: async (name?: string): Promise<Response<DashboardDTO[]>> => {
        const config: AxiosRequestConfig = { params: { name } };
        return databiRequest.get('/api/v1/dashboards/list', config);
    },

    /**
     * 获取看板详情
     */
    getById: async (id: string): Promise<Response<DashboardDTO>> => {
        return databiRequest.get(`/api/v1/dashboards/${id}`);
    },

    /**
     * 创建看板
     */
    create: async (data: DashboardCmd): Promise<Response<DashboardDTO>> => {
        return databiRequest.post('/api/v1/dashboards', data);
    },

    /**
     * 更新看板
     */
    update: async (id: string, data: DashboardCmd): Promise<Response<DashboardDTO>> => {
        return databiRequest.put(`/api/v1/dashboards/${id}`, data);
    },

    /**
     * 删除看板
     */
    delete: async (id: string): Promise<Response<void>> => {
        return databiRequest.delete(`/api/v1/dashboards/${id}`);
    },

    /**
     * 查询看板内图表详情列表（含布局信息和图表完整元数据）
     */
    getDashboardCharts: async (id: string): Promise<Response<DashboardChartItem[]>> => {
        return databiRequest.get(`/api/v1/dashboards/${id}/charts`);
    },
};

// ==================== 分析执行 API ====================

export const analysisApi = {
    /**
     * 执行分析
     */
    execute: async (data: AnalysisCmd): Promise<Response<ChartDataDTO>> => {
        return databiRequest.post('/api/v1/analysis/execute', data);
    },

    /**
     * 预览 SQL
     */
    previewSql: async (data: AnalysisCmd): Promise<Response<string>> => {
        return databiRequest.post('/api/v1/analysis/preview-sql', data);
    },
};
