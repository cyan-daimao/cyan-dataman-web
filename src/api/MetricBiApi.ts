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
  metricId: string;
  alias?: string;
}

export interface DimensionRef {
  dimId: string;
  alias?: string;
}

export interface FilterRef {
  metricId?: string;
  dimId?: string;
  operator: FilterOperator;
  values: string[];
}

export interface OrderRef {
  metricId?: string;
  dimId?: string;
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
