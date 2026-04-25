import { datametricRequest } from "./Request";
import { AxiosRequestConfig } from "axios";

export interface MetricSubject {
    id: string;
    subjectCode: string;
    subjectName: string;
    subjectDesc: string;
    parentId: string;
    level: number;
    sortOrder: number;
    children: MetricSubject[];
}

export interface MetricSubjectQuery {
    parentId?: string;
}

export interface MetricSubjectCmd {
    subjectCode: string;
    subjectName: string;
    subjectDesc: string;
    parentId?: string;
    sortOrder?: number;
}

export const MetricSubjectApi = {
    list: async (query?: MetricSubjectQuery): Promise<MetricSubject[]> => {
        try {
            const config: AxiosRequestConfig = query ? { params: query } : {};
            const data = await datametricRequest.get('/api/v1/metrics/subjects', config);
            return data.data;
        } catch (error) {
            console.error('获取指标主题域列表失败:', error);
            throw new Error('获取指标主题域列表失败，请稍后重试');
        }
    },

    tree: async (): Promise<MetricSubject[]> => {
        try {
            const data = await datametricRequest.get('/api/v1/metrics/subjects/tree');
            return data.data;
        } catch (error) {
            console.error('获取指标主题域树失败:', error);
            throw new Error('获取指标主题域树失败，请稍后重试');
        }
    },

    getById: async (id: string): Promise<MetricSubject> => {
        try {
            const data = await datametricRequest.get(`/api/v1/metrics/subjects/${id}`);
            return data.data;
        } catch (error) {
            console.error('获取指标主题域详情失败:', error);
            throw new Error('获取指标主题域详情失败，请稍后重试');
        }
    },

    create: async (data: MetricSubjectCmd): Promise<MetricSubject> => {
        try {
            const resp = await datametricRequest.post('/api/v1/metrics/subjects', data);
            return resp.data;
        } catch (error) {
            console.error('创建指标主题域失败:', error);
            throw new Error('创建指标主题域失败，请稍后重试');
        }
    },

    update: async (id: string, data: MetricSubjectCmd): Promise<void> => {
        try {
            await datametricRequest.put(`/api/v1/metrics/subjects/${id}`, data);
        } catch (error) {
            console.error('更新指标主题域失败:', error);
            throw new Error('更新指标主题域失败，请稍后重试');
        }
    },

    deleteById: async (id: string): Promise<void> => {
        try {
            await datametricRequest.delete(`/api/v1/metrics/subjects/${id}`);
        } catch (error) {
            console.error('删除指标主题域失败:', error);
            throw new Error('删除指标主题域失败，请稍后重试');
        }
    },
};
