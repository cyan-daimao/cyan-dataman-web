import {datamanRequest} from "./Request";
import {AxiosRequestConfig} from "axios";
import {Response} from './Response'

// 字段值对象
export interface ColumnVO {
    name: string;
    type: string;
    comment: string;
    nullable: boolean;
    autoIncrement: boolean;
    defaultValue?: string;
    secretLevel: string;
}

// 索引值对象
export interface IndexVO {
    name: string;
    indexType: string;
    fieldNames: string[];
}

// 表结构值对象
export interface TableVO {
    catalog: string;
    schema: string;
    name: string;
    comment: string;
    columns: ColumnVO[];
    indexes?: IndexVO[];
}

// 元数据表 DTO
export interface MetadataTableDTO {
    id: string;
    name: string;
    owner: string;
    subjectCode: string;
    datasourceType: string;
    layerCode: string;
    comment: string;
    accessCount: string;
    lastAccessTime: string;
    heatLevel: string;
    secretLevel: string;
    onlineStatus: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    table?: TableVO;
}

// 分页查询参数
export interface MetadataTablePageQuery {
    content?: string;
    subjectCode?: string;
    owner?: string;
    current?: number;
    size?: number;
}

// 分页响应
export interface Page<T> {
    data: T[];
    current: number;
    size: number;
    total: number;
}

// 创建/更新表的命令对象
export interface MetadataTableCmd {
    name: string;
    owner: string;
    subjectCode: string;
    layerCode: string;
    comment: string;
    heatLevel: string;
    secretLevel: string;
    onlineStatus: string;
    tableValObj: TableVO;
}

// 获取表列表（分页）
export const pageMetadataTables = async (query: MetadataTablePageQuery): Promise<Page<MetadataTableDTO>> => {
    try {
        const config: AxiosRequestConfig = {
            params: query
        };
        const resp = await datamanRequest.get('/api/v1/metadata/tables', config);
        return resp.data;
    } catch (error) {
        console.error('获取表列表失败:', error);
        throw new Error('获取表列表失败，请稍后重试');
    }
};

// 根据 ID 获取表详情
export const getMetadataTableById = async (id: string): Promise<MetadataTableDTO> => {
    try {
        const resp = await datamanRequest.get(`/api/v1/metadata/tables/${id}`);
        return resp.data;
    } catch (error) {
        console.error('获取表详情失败:', error);
        throw new Error('获取表详情失败，请稍后重试');
    }
};

// 创建表
export const createMetadataTable = async (cmd: MetadataTableCmd): Promise<Response<MetadataTableDTO>> => {
    try {
        return await datamanRequest.post('/api/v1/metadata/tables', cmd);
    } catch (error) {
        console.error('创建表失败:', error);
        throw new Error('创建表失败，请稍后重试');
    }
};

// 更新表
export const updateMetadataTable = async (id: string, cmd: MetadataTableCmd): Promise<Response<MetadataTableDTO>> => {
    try {
        return await datamanRequest.put(`/api/v1/metadata/tables/${id}`, cmd);
    } catch (error) {
        console.error('更新表失败:', error);
        throw new Error('更新表失败，请稍后重试');
    }
};

// 删除表
export const deleteMetadataTable = async (id: string): Promise<Response<void>> => {
    try {
        return datamanRequest.delete(`/api/v1/metadata/tables/${id}`);
    } catch (error) {
        console.error('删除表失败:', error);
        throw new Error('删除表失败，请稍后重试');
    }
};

// 主题-表树型结构
export interface SubjectTableTreeDTO {
    key: string;
    title: string;
    type: 'subject' | 'table';
    subjectCode?: string;
    tableId?: string;
    catalog?: string;
    schema?: string;
    tableName?: string;
    isLeaf: boolean;
    children?: SubjectTableTreeDTO[];
    // 表字段信息（用于SQL提示）
    columns?: ColumnVO[];
}

// 获取主题-表树型结构
export const getSubjectTableTree = async (content?: string): Promise<SubjectTableTreeDTO[]> => {
    const resp = await datamanRequest.get(`/api/v1/metadata/tables/tree`, {
        params: { content: content || '' }
    });
    return resp.data;
}

export interface TableSnapshotDTO {
    snapshotID: string
    operation: string
    sequenceNumber: string
    createdAt: string
    manifestListLocation: string
    totalRecords: string
    addedRecords: string
}
// 获取表快照
export const snapshots = async (fullName: string): Promise<Response<TableSnapshotDTO[]>> => {
    return await datamanRequest.get(`/api/v1/metadata/tables/${fullName}/snapshots`)
}

// 快照回滚
export const rollback = async (fullName: string, snapshotID: string): Promise<Response<void>> => {
    return await datamanRequest.post(`/api/v1/metadata/tables/${fullName}/snapshots/${snapshotID}/rollback`)
}

// 合并小文件-清理快照
export const maintenance = async (fullName: string): Promise<Response<void>> => {
    return await datamanRequest.post(`/api/v1/metadata/tables/${fullName}/maintenance`)
}

// 表关联关系 DTO
export interface TableRelationDTO {
    id: string;
    sourceCatalog: string;
    sourceSchema: string;
    sourceTable: string;
    sourceColumn: string;
    targetCatalog: string;
    targetSchema: string;
    targetTable: string;
    targetColumn: string;
    joinType: 'LEFT' | 'INNER' | 'RIGHT';
    description?: string;
    sourceTableComment?: string;
    targetTableComment?: string;
}

// AI 关联推荐字段
export interface AiRelationColumnDTO {
    name: string;
    type: string;
    comment?: string;
}

// AI 关联推荐候选
export interface AiRelationSuggestionDTO {
    sourceCatalog: string;
    sourceSchema: string;
    sourceTable: string;
    sourceTableComment?: string;
    sourceColumn: string;
    sourceColumns: AiRelationColumnDTO[];
    targetCatalog: string;
    targetSchema: string;
    targetTable: string;
    targetTableComment?: string;
    targetColumn: string;
    targetColumns: AiRelationColumnDTO[];
    joinType: 'LEFT' | 'INNER' | 'RIGHT';
    confidence: number;
    reason?: string;
    description?: string;
}

// AI 关联推荐请求
export interface AiRelationSuggestRequest {
    catalog: string;
    schema: string;
    table: string;
    maxCandidates?: number;
}

// 表关联关系响应
export interface TableRelationsResponse {
    outgoing: TableRelationDTO[];
    incoming: TableRelationDTO[];
}

// 表关联关系 API
export const tableRelationApi = {
    getRelations: (catalog: string, schema: string, table: string): Promise<Response<TableRelationsResponse>> =>
        datamanRequest.get(`/api/v1/metadata/tables/${catalog}/${schema}/${table}/relations`),

    create: (data: Omit<TableRelationDTO, 'id'>): Promise<Response<TableRelationDTO>> =>
        datamanRequest.post('/api/v1/metadata/tables/relations', data),

    aiSuggest: (data: AiRelationSuggestRequest): Promise<Response<AiRelationSuggestionDTO[]>> =>
        datamanRequest.post('/api/v1/metadata/tables/relations/ai-suggest', data),

    delete: (id: string): Promise<Response<void>> =>
        datamanRequest.delete(`/api/v1/metadata/tables/relations/${id}`),
};
