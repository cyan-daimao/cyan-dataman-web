import {datamanRequest, getBaseURL} from "./Request";
import {AxiosRequestConfig} from "axios";
import {Response as ApiResponse} from './Response'
import {getStorage, KEY} from "../utils/storage";

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
export const createMetadataTable = async (cmd: MetadataTableCmd): Promise<ApiResponse<MetadataTableDTO>> => {
    try {
        return await datamanRequest.post('/api/v1/metadata/tables', cmd);
    } catch (error) {
        console.error('创建表失败:', error);
        throw new Error('创建表失败，请稍后重试');
    }
};

// 更新表
export const updateMetadataTable = async (id: string, cmd: MetadataTableCmd): Promise<ApiResponse<MetadataTableDTO>> => {
    try {
        return await datamanRequest.put(`/api/v1/metadata/tables/${id}`, cmd);
    } catch (error) {
        console.error('更新表失败:', error);
        throw new Error('更新表失败，请稍后重试');
    }
};

// 删除表
export const deleteMetadataTable = async (id: string): Promise<ApiResponse<void>> => {
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
export const snapshots = async (fullName: string): Promise<ApiResponse<TableSnapshotDTO[]>> => {
    return await datamanRequest.get(`/api/v1/metadata/tables/${fullName}/snapshots`)
}

// 快照回滚
export const rollback = async (fullName: string, snapshotID: string): Promise<ApiResponse<void>> => {
    return await datamanRequest.post(`/api/v1/metadata/tables/${fullName}/snapshots/${snapshotID}/rollback`)
}

// 合并小文件-清理快照
export const maintenance = async (fullName: string): Promise<ApiResponse<void>> => {
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

// AI 关联推荐流式事件
export type AiRelationSuggestStreamEvent =
    | { event: 'status'; message: string }
    | { event: 'answer'; content: string }
    | { event: 'result'; data: AiRelationSuggestionDTO[] }
    | { event: 'error'; message: string }
    | { event: 'done'; message: string };

// 表关联关系响应
export interface TableRelationsResponse {
    outgoing: TableRelationDTO[];
    incoming: TableRelationDTO[];
}

const parseAiSuggestStreamBlock = (block: string): AiRelationSuggestStreamEvent | null => {
    let eventName = 'message';
    const dataLines: string[] = [];
    block.split(/\r?\n/).forEach(line => {
        if (line.startsWith('event:')) {
            eventName = line.slice(6).trim();
        }
        if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trimStart());
        }
    });
    if (dataLines.length === 0) {
        return null;
    }

    const dataText = dataLines.join('\n');
    let data: Record<string, unknown>;
    try {
        data = JSON.parse(dataText);
    } catch (error) {
        data = {message: dataText, content: dataText};
    }

    if (eventName === 'status') {
        return {event: 'status', message: String(data.message || '')};
    }
    if (eventName === 'answer') {
        return {event: 'answer', content: String(data.content || '')};
    }
    if (eventName === 'result') {
        return {event: 'result', data: Array.isArray(data.data) ? data.data as AiRelationSuggestionDTO[] : []};
    }
    if (eventName === 'error') {
        return {event: 'error', message: String(data.message || '')};
    }
    if (eventName === 'done') {
        return {event: 'done', message: String(data.message || '')};
    }
    return null;
};

const readAiSuggestStream = async (
    response: globalThis.Response,
    onEvent: (event: AiRelationSuggestStreamEvent) => void,
) => {
    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error('浏览器不支持读取 SSE 响应流');
    }

    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    while (true) {
        const {done, value} = await reader.read();
        if (done) {
            break;
        }
        buffer += decoder.decode(value, {stream: true});
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() || '';
        blocks.forEach(block => {
            const event = parseAiSuggestStreamBlock(block);
            if (event) {
                onEvent(event);
            }
        });
    }

    buffer += decoder.decode();
    const tailEvent = parseAiSuggestStreamBlock(buffer);
    if (tailEvent) {
        onEvent(tailEvent);
    }
};

// 表关联关系 API
export const tableRelationApi = {
    getRelations: (catalog: string, schema: string, table: string): Promise<ApiResponse<TableRelationsResponse>> =>
        datamanRequest.get(`/api/v1/metadata/tables/${catalog}/${schema}/${table}/relations`),

    create: (data: Omit<TableRelationDTO, 'id'>): Promise<ApiResponse<TableRelationDTO>> =>
        datamanRequest.post('/api/v1/metadata/tables/relations', data),

    aiSuggest: (data: AiRelationSuggestRequest): Promise<ApiResponse<AiRelationSuggestionDTO[]>> =>
        datamanRequest.post('/api/v1/metadata/tables/relations/ai-suggest', data),

    aiSuggestStream: async (
        data: AiRelationSuggestRequest,
        onEvent: (event: AiRelationSuggestStreamEvent) => void,
    ): Promise<void> => {
        const token = getStorage(KEY.TOKEN, '');
        const response = await fetch(new URL('/api/v1/metadata/tables/relations/ai-suggest/stream', getBaseURL('dataman')).toString(), {
            method: 'POST',
            headers: {
                Accept: 'text/event-stream',
                'Content-Type': 'application/json;charset=UTF-8',
                Authorization: token ? `Bearer ${token}` : '',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`${response.status} ${response.statusText}${errorText ? `\n${errorText}` : ''}`);
        }

        await readAiSuggestStream(response, onEvent);
    },

    delete: (id: string): Promise<ApiResponse<void>> =>
        datamanRequest.delete(`/api/v1/metadata/tables/relations/${id}`),
};
