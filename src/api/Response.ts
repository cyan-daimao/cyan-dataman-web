/**
 * 后端响应
 */
export interface Response<T> {
    code: ErrorCode;
    message: string;
    data: T; // 泛型数据字段，对应后端的T
    traceId: string;
}

// 错误码
export enum ErrorCode{
    SUCCESS= 200,
    FAIL= 500,
}