import {datagatewayRequest} from "./Request";
import {Response} from './Response'

// SQL 执行结果
export interface SqlResultDTO {
    executeId: string,
    status: string,
    costTimeMs: number,
    data: object[],
    errorMessage: string
}

// 执行SQL
export const executeSql = async (sql: string): Promise<Response<SqlResultDTO>> => {
    try {
        const response = await datagatewayRequest.post('/api/v1/starrocks/sql/execute', {
            sql: sql
        });
        if (response.data.status === 'FAILED') {
            throw new Error(response.data.errorMessage || 'SQL执行失败');
        }
        return response;
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(msg || 'SQL执行失败');
    }
}
// 执行SparkSQL
export const executeSparkSql = async (sql: string): Promise<Response<SqlResultDTO>> => {
    try {
        const response = await datagatewayRequest.post('/api/v1/spark/sql/execute', {
            sql: sql
        });
        if (response.data.status === 'FAILED') {
            throw new Error(response.data.errorMessage || 'SQL执行失败');
        }
        return response;
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(msg || 'SQL执行失败');
    }
}