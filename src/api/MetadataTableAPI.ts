import {datamanRequest} from "./Request.ts";
import {AxiosRequestConfig} from "axios";

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
export const createMetadataTable = async (cmd: MetadataTableCmd): Promise<MetadataTableDTO> => {
    try {
        const resp = await datamanRequest.post('/api/v1/metadata/tables', cmd);
        return resp.data;
    } catch (error) {
        console.error('创建表失败:', error);
        throw new Error('创建表失败，请稍后重试');
    }
};

// 更新表
export const updateMetadataTable = async (id: string, cmd: MetadataTableCmd): Promise<MetadataTableDTO> => {
    try {
        const resp = await datamanRequest.put(`/api/v1/metadata/tables/${id}`, cmd);
        return resp.data;
    } catch (error) {
        console.error('更新表失败:', error);
        throw new Error('更新表失败，请稍后重试');
    }
};

// 删除表
export const deleteMetadataTable = async (id: string): Promise<void> => {
    try {
        await datamanRequest.delete(`/api/v1/metadata/tables/${id}`);
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

