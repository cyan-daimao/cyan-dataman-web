import {datamanRequest} from "./Request.ts";

interface Catalog{
    name: string,
    datasourceType: string
}
// 获取所有目录
export const listCatalog = async (): Promise<Catalog[]> => {
    try {
        const data = await datamanRequest.get('/api/v1/gravitino/catalogs')
        return data.data
    } catch (error) {
        console.error('获取目录失败:', error);
        throw new Error('获取目录失败，请稍后重试');
    }
}

// 获取目录下的schema
export const listSchema = async (catalogName: string): Promise<string[]> => {
    try {
        const data = await datamanRequest.get(`/api/v1/gravitino/catalogs/${catalogName}/schemas`)
        return data.data
    } catch (error) {
        console.error('获取目录下的schema失败:', error);
        throw new Error('获取目录下的schema失败，请稍后重试');
    }
}