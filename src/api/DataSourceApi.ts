import {datamanRequest} from "./Request";
import {TableVO} from "./MetadataTableAPI";

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


// 获取schema下的表
export const listTable = async (catalogName: string, schemaName: string): Promise<TableVO[]> => {
    try {
        const data = await datamanRequest.get(`/api/v1/gravitino/catalogs/${catalogName}/schemas/${schemaName}/tables`)
        return data.data
    }catch ( error){
        console.error('获取schema下的表失败:', error);
        throw new Error('获取schema下的表失败，请稍后重试');
    }
}

// 获取表信息
export const getTableInfo = async (catalogName: string, schemaName: string, tableName: string): Promise<TableVO> => {
    try {
        const data = await datamanRequest.get(`/api/v1/gravitino/catalogs/${catalogName}/schemas/${schemaName}/tables/${tableName}`)
        return data.data
    }catch ( error){
        console.error('获取表信息失败:', error);
        throw new Error('获取表信息失败，请稍后重试');
    }
}

// 预览表数据
export const previewTableData = async (catalogName: string, schemaName: string, tableName: string): Promise<any[]> => {
    try {
        const data = await datamanRequest.get(`/api/v1/gravitino/catalogs/${catalogName}/schemas/${schemaName}/tables/${tableName}/preview`)
        return data.data
    }catch ( error){
        console.error('获取表数据失败:', error);
        throw new Error('获取表数据失败，请稍后重试');
    }
}