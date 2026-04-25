import { datametricRequest } from './Request';
import { ApiResponse } from './Response';

export interface DimensionCategory {
    id: string;
    name: string;
    parentId?: string;
    level: number;
    sortOrder: number;
    children?: DimensionCategory[];
}

export interface DimensionCategoryCmd {
    name: string;
    parentId?: string;
    sortOrder?: number;
}

const BASE = '/api/v1/metrics/dimension-categories';

export const DimensionCategoryApi = {
    /**
     * 查询维度分类树
     * GET /api/v1/metrics/dimension-categories/tree
     */
    tree: async (): Promise<ApiResponse<DimensionCategory[]>> => {
        return datametricRequest.get(`${BASE}/tree`);
    },

    /**
     * 查询维度分类列表
     * GET /api/v1/metrics/dimension-categories
     */
    list: async (): Promise<ApiResponse<DimensionCategory[]>> => {
        return datametricRequest.get(`${BASE}`);
    },

    /**
     * 创建维度分类
     * POST /api/v1/metrics/dimension-categories
     */
    create: async (data: DimensionCategoryCmd): Promise<ApiResponse<DimensionCategory>> => {
        return datametricRequest.post(`${BASE}`, data);
    },

    /**
     * 更新维度分类
     * PUT /api/v1/metrics/dimension-categories/{id}
     */
    update: async (id: string, data: DimensionCategoryCmd): Promise<ApiResponse<DimensionCategory>> => {
        return datametricRequest.put(`${BASE}/${id}`, data);
    },

    /**
     * 删除维度分类
     * DELETE /api/v1/metrics/dimension-categories/{id}
     */
    deleteById: async (id: string): Promise<ApiResponse<void>> => {
        return datametricRequest.delete(`${BASE}/${id}`);
    },
};
