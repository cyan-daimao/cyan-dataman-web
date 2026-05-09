import { datametricRequest } from './Request';
import { ChartType, FilterOperator, OrderDirection, ChartDataDTO, MetricBiAnalysisCmd } from './DatabiApi';
import { Response } from './Response';

export interface MetricBiListItem {
  id: string;
  metricCode: string;
  metricName: string;
  metricType: string;
  subjectCode: string;
  subjectName: string;
  statFunc?: string;
  dataType: string;
  description?: string;
  tableRef?: string;
}

export interface DimensionBiListItem {
  id: string;
  dimCode: string;
  dimName: string;
  dimType: string;
  dataType: string;
  tableName?: string;
  columnName: string;
  displayColumn?: string;
  categoryName?: string;
}

export const metricBiApi = {
  execute: async (data: MetricBiAnalysisCmd): Promise<Response<ChartDataDTO>> =>
    datametricRequest.post('/api/v1/metrics/bi/analysis/execute', data),

  previewSql: async (data: MetricBiAnalysisCmd): Promise<Response<string>> =>
    datametricRequest.post('/api/v1/metrics/bi/analysis/preview-sql', data),
};

export const metricBiListApi = {
  list: async (params?: { name?: string; subjectCode?: string; metricType?: string }): Promise<Response<MetricBiListItem[]>> =>
    datametricRequest.get('/api/v1/metrics/bi/list', { params }),
};

export const dimensionBiListApi = {
  list: async (params?: { name?: string; categoryId?: string }): Promise<Response<DimensionBiListItem[]>> =>
    datametricRequest.get('/api/v1/metrics/bi/dimensions', { params }),
};

export interface DimensionValueItem {
  value: string;
  label: string;
}

export const dimensionValueApi = {
  list: async (dimCode: string): Promise<Response<DimensionValueItem[]>> =>
    datametricRequest.get(`/api/v1/metrics/bi/dimensions/${dimCode}/values`),
};
