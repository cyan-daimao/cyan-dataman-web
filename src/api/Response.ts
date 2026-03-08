/**
 * 后端响应
 */
export interface Response<T> {
    code: number;
    message: string;
    data: T; // 泛型数据字段，对应后端的T
    traceId: string;
}