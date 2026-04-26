import { datamanRequest } from './Request';
import { ApiResponse } from './Response';
import { AxiosRequestConfig } from 'axios';

export interface ManualUploadRecordDTO {
    id: number;
    fileName: string;
    fileType: 'excel' | 'csv';
    uploadMode: 'overwrite' | 'append';
    rowCount: number;
    uploaderName: string;
    status: 'success' | 'failed';
    errorMessage?: string;
    createdAt: string;
}

export interface PageQuery {
    pageNum?: number;
    pageSize?: number;
}

export interface PageResult<T> {
    data: T[];
    total: number;
    current: number;
    size: number;
}

export const ManualUploadApi = {
    upload: async (tableId: string, file: File, uploadMode: 'overwrite' | 'append'): Promise<ApiResponse<ManualUploadRecordDTO>> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('uploadMode', uploadMode);
        return datamanRequest.post(`/api/v1/metadata/tables/${tableId}/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    listRecords: async (tableId: string, query: PageQuery): Promise<ApiResponse<PageResult<ManualUploadRecordDTO>>> => {
        const config: AxiosRequestConfig = { params: query };
        return datamanRequest.get(`/api/v1/metadata/tables/${tableId}/upload/records`, config);
    },
};
