import { datametricRequest } from './Request';
import { ApiResponse } from './Response';
import { AxiosRequestConfig } from 'axios';

// ==================== 枚举定义 ====================

export enum MetricType {
    ATOMIC = 'ATOMIC',
    DERIVED = 'DERIVED',
    COMPOSITE = 'COMPOSITE',
}

export enum MetricStatus {
    DRAFT = 'DRAFT',
    PUBLISHED = 'PUBLISHED',
    OFFLINE = 'OFFLINE',
}

export enum StatFunc {
    SUM = 'SUM',
    AVG = 'AVG',
    COUNT = 'COUNT',
    COUNT_DISTINCT = 'COUNT_DISTINCT',
    MAX = 'MAX',
    MIN = 'MIN',
}

export enum PeriodType {
    RELATIVE = 'RELATIVE',
    ABSOLUTE = 'ABSOLUTE',
}

export enum RelativeUnit {
    DAY = 'DAY',
    WEEK = 'WEEK',
    MONTH = 'MONTH',
    YEAR = 'YEAR',
}

export enum NodeType {
    METRIC = 'METRIC',
    TABLE = 'TABLE',
    COLUMN = 'COLUMN',
}

export enum LineageDirection {
    UPSTREAM = 'UPSTREAM',
    DOWNSTREAM = 'DOWNSTREAM',
    BOTH = 'BOTH',
}

// ==================== 通用类型 ====================

export interface PageQuery {
    pageNum?: number;
    pageSize?: number;
}

export interface PageResult<T> {
    list: T[];
    total: number;
    pageNum: number;
    pageSize: number;
}

export interface FilterCondition {
    field: string;
    op: string;
    value: string;
}

export interface GroupByField {
    col: string;
}

// ==================== 指标定义 DTO ====================

export interface MetricDTO {
    id: string;
    metricCode: string;
    metricName: string;
    metricType: MetricType;
    subjectCode: string;
    subjectName: string;
    bizCaliber: string;
    techCaliber: string;
    status: MetricStatus;
    owner: string;
    statFunc?: StatFunc;
    dsName?: string;
    dbName?: string;
    tblName?: string;
    colName?: string;
    version: number;
    updatedAt: string;
    createdAt?: string;
    atomic?: MetricAtomicExt;
    derived?: MetricDerivedExt;
    composite?: MetricCompositeExt;
}

export interface MetricListItem {
    id: string;
    metricCode: string;
    metricName: string;
    metricType: MetricType;
    subjectCode: string;
    subjectName: string;
    bizCaliber: string;
    status: MetricStatus;
    owner: string;
    statFunc?: StatFunc;
    version: number;
    updatedAt: string;
}

export interface MetricDetail {
    id: string;
    metricCode: string;
    metricName: string;
    metricType: MetricType;
    subjectCode: string;
    subjectName: string;
    bizCaliber: string;
    techCaliber: string;
    status: MetricStatus;
    owner: string;
    statFunc?: StatFunc;
    dsName?: string;
    dbName?: string;
    tblName?: string;
    colName?: string;
    version: number;
    updatedAt: string;
    createdAt?: string;
    atomic?: MetricAtomicExt;
    derived?: MetricDerivedExt;
    composite?: MetricCompositeExt;
}

export interface MetricAtomicExt {
    statFunc: StatFunc;
    dsName: string;
    dbName: string;
    tblName: string;
    colName: string;
    filterCondition?: FilterCondition[];
}

export interface MetricDerivedExt {
    atomicMetricId: string;
    timePeriodId: string;
    modifierIds?: string[];
    dimensionIds?: string[];
    groupByFields?: GroupByField[];
}

export interface MetricCompositeExt {
    formula: string;
    metricRefs: string[];
}

export interface MetricPageQuery extends PageQuery {
    metricName?: string;
    metricType?: MetricType;
    subjectCode?: string;
    status?: MetricStatus;
}

export interface MetricStatusCmd {
    status: MetricStatus;
}

export interface MetricVersionItem {
    version: number;
    metricName: string;
    status: MetricStatus;
    snapshotTime: string;
    updateBy: string;
}

// ==================== 原子指标 Cmd ====================

export interface AtomicMetricCmd {
    metricName: string;
    bizCaliber: string;
    techCaliber?: string;
    statFunc: StatFunc;
    dsName: string;
    dbName: string;
    tblName: string;
    colName: string;
    filterCondition?: FilterCondition[];
    subjectCode: string;
}

// ==================== 派生指标 Cmd ====================

export interface DerivedMetricCmd {
    metricName: string;
    bizCaliber: string;
    techCaliber?: string;
    atomicMetricId: string;
    timePeriodId: string;
    modifierIds?: string[];
    dimensionIds?: string[];
    groupByFields?: GroupByField[];
    subjectCode: string;
}

// ==================== 复合指标 Cmd ====================

export interface CompositeMetricCmd {
    metricName: string;
    bizCaliber: string;
    techCaliber?: string;
    formula: string;
    metricRefs: string[];
    subjectCode: string;
}

// ==================== SQL 预览与试算 ====================

export interface PreviewSqlCmd {
    metricType: MetricType;
    definitionBody: Record<string, unknown>;
}

export interface TrialCmd {
    metricType: MetricType;
    definitionBody: Record<string, unknown>;
    limit?: number;
}

export interface TrialResult {
    columns: { name: string; type: string }[];
    rows: unknown[][];
    sql: string;
    costTime: number;
}

// ==================== 指标字典 ====================

export interface DictionaryMetricDTO {
    id: string;
    metricCode: string;
    metricName: string;
    metricType: MetricType;
    subjectCode: string;
    subjectName: string;
    bizCaliber: string;
    status: MetricStatus;
    updatedAt: string;
    isFavorite: boolean;
}

// ==================== 血缘 ====================

export interface LineageNode {
    id: string;
    name: string;
    nodeType: NodeType;
    children: LineageNode[];
}

export interface LineageResult {
    upstream: LineageNode;
    downstream: LineageNode;
}

// ==================== Dashboard ====================

export interface SubjectDistribution {
    subjectCode: string;
    subjectName: string;
    count: number;
}

export interface RecentUpdate {
    metricCode: string;
    metricName: string;
    action: string;
    operator: string;
    time: string;
}

export interface DashboardStats {
    totalMetrics: number;
    atomicCount: number;
    derivedCount: number;
    compositeCount: number;
    publishedCount: number;
    draftCount: number;
    offlineCount: number;
    subjectDistribution: SubjectDistribution[];
    recentUpdates: RecentUpdate[];
}

// ==================== 分析 ====================

export interface SubjectDrilldownDTO {
    subjectCode: string;
    subjectName: string;
    totalMetrics: number;
    typeDistribution: Record<string, number>;
    statusDistribution: Record<string, number>;
    children: SubjectDrilldownDTO[];
}

// ==================== API 常量 ====================

const BASE = '/api/v1/metrics';

// ==================== 指标定义 API ====================

export const MetricApi = {
    /**
     * 分页查询指标列表
     * GET /api/v1/metrics/page
     */
    page: async (query: MetricPageQuery): Promise<ApiResponse<PageResult<MetricListItem>>> => {
        const config: AxiosRequestConfig = { params: query };
        return datametricRequest.get(`${BASE}/page`, config);
    },

    /**
     * 查询指标详情
     * GET /api/v1/metrics/{id}
     */
    detail: async (id: string): Promise<ApiResponse<MetricDetail>> => {
        return datametricRequest.get(`${BASE}/${id}`);
    },

    /**
     * 创建原子指标
     * POST /api/v1/metrics/atomic
     */
    createAtomic: async (data: AtomicMetricCmd): Promise<ApiResponse<MetricDTO>> => {
        return datametricRequest.post(`${BASE}/atomic`, data);
    },

    /**
     * 更新原子指标
     * PUT /api/v1/metrics/atomic/{id}
     */
    updateAtomic: async (id: string, data: AtomicMetricCmd): Promise<ApiResponse<MetricDTO>> => {
        return datametricRequest.put(`${BASE}/atomic/${id}`, data);
    },

    /**
     * 创建派生指标
     * POST /api/v1/metrics/derived
     */
    createDerived: async (data: DerivedMetricCmd): Promise<ApiResponse<MetricDTO>> => {
        return datametricRequest.post(`${BASE}/derived`, data);
    },

    /**
     * 更新派生指标
     * PUT /api/v1/metrics/derived/{id}
     */
    updateDerived: async (id: string, data: DerivedMetricCmd): Promise<ApiResponse<MetricDTO>> => {
        return datametricRequest.put(`${BASE}/derived/${id}`, data);
    },

    /**
     * 创建复合指标
     * POST /api/v1/metrics/composite
     */
    createComposite: async (data: CompositeMetricCmd): Promise<ApiResponse<MetricDTO>> => {
        return datametricRequest.post(`${BASE}/composite`, data);
    },

    /**
     * 更新复合指标
     * PUT /api/v1/metrics/composite/{id}
     */
    updateComposite: async (id: string, data: CompositeMetricCmd): Promise<ApiResponse<MetricDTO>> => {
        return datametricRequest.put(`${BASE}/composite/${id}`, data);
    },

    /**
     * 删除指标
     * DELETE /api/v1/metrics/{id}
     */
    delete: async (id: string): Promise<ApiResponse<void>> => {
        return datametricRequest.delete(`${BASE}/${id}`);
    },

    /**
     * 更新指标状态
     * PUT /api/v1/metrics/{id}/status
     */
    updateStatus: async (id: string, data: MetricStatusCmd): Promise<ApiResponse<MetricDTO>> => {
        return datametricRequest.put(`${BASE}/${id}/status`, data);
    },

    /**
     * SQL 预览
     * POST /api/v1/metrics/preview-sql
     */
    previewSql: async (data: PreviewSqlCmd): Promise<ApiResponse<string>> => {
        return datametricRequest.post(`${BASE}/preview-sql`, data);
    },

    /**
     * SQL 试算
     * POST /api/v1/metrics/trial
     */
    trial: async (data: TrialCmd): Promise<ApiResponse<TrialResult>> => {
        return datametricRequest.post(`${BASE}/trial`, data);
    },

    listVersions: async (id: string): Promise<ApiResponse<MetricVersionItem[]>> => {
        return datametricRequest.get(`${BASE}/${id}/versions`);
    },

    rollback: async (id: string, version: number): Promise<ApiResponse<MetricDetail>> => {
        return datametricRequest.post(`${BASE}/${id}/rollback/${version}`, {});
    },
};

// ==================== 指标字典 API ====================

export const MetricDictionaryApi = {
    /**
     * 指标字典分页检索
     * GET /api/v1/metrics/dictionary/page
     */
    page: async (query: MetricPageQuery): Promise<ApiResponse<PageResult<DictionaryMetricDTO>>> => {
        const config: AxiosRequestConfig = { params: query };
        return datametricRequest.get(`${BASE}/dictionary/page`, config);
    },

    /**
     * 收藏指标
     * POST /api/v1/metrics/{id}/favorite
     */
    favorite: async (id: string): Promise<ApiResponse<void>> => {
        return datametricRequest.post(`${BASE}/${id}/favorite`, {});
    },

    /**
     * 取消收藏
     * DELETE /api/v1/metrics/{id}/favorite
     */
    unfavorite: async (id: string): Promise<ApiResponse<void>> => {
        return datametricRequest.delete(`${BASE}/${id}/favorite`);
    },
};

// ==================== 血缘 API ====================

export const MetricLineageApi = {
    /**
     * 查询指标血缘
     * GET /api/v1/metrics/{id}/lineage
     */
    getLineage: async (id: string, direction?: LineageDirection, maxLevel?: number): Promise<ApiResponse<LineageResult>> => {
        const config: AxiosRequestConfig = {
            params: { direction: direction || 'BOTH', maxLevel: maxLevel || 3 },
        };
        return datametricRequest.get(`${BASE}/${id}/lineage`, config);
    },
};

// ==================== Dashboard API ====================

export const MetricDashboardApi = {
    /**
     * Dashboard 统计数据
     * GET /api/v1/metrics/dashboard/stats
     */
    stats: async (): Promise<ApiResponse<DashboardStats>> => {
        return datametricRequest.get(`${BASE}/dashboard/stats`);
    },
};

// ==================== 分析 API ====================

export const MetricAnalysisApi = {
    /**
     * 主题域下钻分析
     * GET /api/v1/metrics/analysis/subject-drilldown
     */
    subjectDrilldown: async (subjectCode?: string): Promise<ApiResponse<SubjectDrilldownDTO[]>> => {
        const config: AxiosRequestConfig = {
            params: subjectCode ? { subjectCode } : {},
        };
        return datametricRequest.get(`${BASE}/analysis/subject-drilldown`, config);
    },
};
