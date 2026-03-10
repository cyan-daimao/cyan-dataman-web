import {datamanRequest} from "./Request.ts";

interface CatalogDTO{
    name: string,
    datasourceType: string
}
// 获取所有目录
export const listCatalog = async (): Promise<CatalogDTO[]> => {
    try {
        const data = await datamanRequest.get('/api/v1/gravitino/catalogs')
        return data.data
    } catch (error) {
        console.error('获取目录失败:', error);
        throw new Error('获取目录失败，请稍后重试');
    }
}
interface SchemaDTO{
    name: string
}

// 获取目录下的schema
export const listSchema = async (catalogName: string): Promise<SchemaDTO[]> => {
    try {
        const data = await datamanRequest.get(`/api/v1/gravitino/catalogs/${catalogName}/schemas`)
        return data.data
    } catch (error) {
        console.error('获取目录下的schema失败:', error);
        throw new Error('获取目录下的schema失败，请稍后重试');
    }
}

export interface TableDTO{
    catalog: string
    schema: string
    name: string
    comment: string
    columns: []
    indexes: []
}

// 获取schema下的表
export const listTable = async (catalogName: string, schemaName: string): Promise<TableDTO[]> => {
    try {
        const data = await datamanRequest.get(`/api/v1/gravitino/catalogs/${catalogName}/schemas/${schemaName}/tables`)
        return data.data
    }catch ( error){
        console.error('获取schema下的表失败:', error);
        throw new Error('获取schema下的表失败，请稍后重试');
    }
}


export const getTableInfo = async (catalogName: string, schemaName: string, tableName: string): Promise<TableDTO> => {
    try {
        const data = await datamanRequest.get(`/api/v1/gravitino/catalogs/${catalogName}/schemas/${schemaName}/tables/${tableName}`)
        return data.data
    }catch ( error){
        console.error('获取表信息失败:', error);
        throw new Error('获取表信息失败，请稍后重试');
    }
}