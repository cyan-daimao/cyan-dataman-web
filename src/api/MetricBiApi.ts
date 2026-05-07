import { datametricRequest } from './Request';
import { ChartType, FilterOperator, OrderDirection, ChartDataDTO } from './DatabiApi';
import { Response } from './Response';

export interface MetricBiAnalysisCmd {
  chartType: ChartType;
  metrics: MetricRef[];
  dimensions: DimensionRef[];
  filters: FilterRef[];
  orders: OrderRef[];
  limitValue?: number;
}

export interface MetricRef {
  metricCode: string;
  alias?: string;
}

export interface DimensionRef {
  dimCode: string;
  alias?: string;
}

export interface FilterRef {
  metricCode?: string;
  dimCode?: string;
  operator: FilterOperator;
  values: string[];
}

export interface OrderRef {
  metricCode?: string;
  dimCode?: string;
  direction: OrderDirection;
}

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
}

export interface DimensionBiListItem {
  id: string;
  dimCode: string;
  dimName: string;
  dimType: string;
  dataType: string;
  tableName?: string;
  columnName: string;
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
