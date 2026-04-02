import {datagatewayRequest} from "./Request";
import {Response} from './Response'

// SQL 执行结果
export interface SqlResultDTO {
    executeId: string,
    status: string,
    costTimeMs: number,
    data: {}[],
    errorMessage: string
}

// 执行SQL
export const executeSql = async (sql: string): Promise<Response<SqlResultDTO>> => {
    try {
        return  await datagatewayRequest.post('/api/v1/sql/execute', {
            sql: sql
        });
    } catch (e) {
        throw new Error(e);
    }
}