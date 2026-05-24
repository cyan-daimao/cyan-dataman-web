import { datametricRequest } from './Request';
import { ChartDataDTO, MetricBiAnalysisCmd } from './DatabiApi';
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

export interface MetricAssociationSearchRequest {
  metricCodes?: string[];
  dimCodes?: string[];
  metricName?: string;
  subjectCode?: string;
  metricType?: string;
  dimName?: string;
  categoryId?: string;
  includeSelected?: boolean;
}

export interface MetricAssociationSearchResult {
  metrics: MetricBiListItem[];
  dimensions: DimensionBiListItem[];
}

export interface MetricAssociationGraphNode {
  id: string;
  code: string;
  name: string;
  nodeType: 'METRIC' | 'DIMENSION';
  metricType?: string;
  tableRef?: string;
}

export interface MetricAssociationGraphEdge {
  source: string;
  target: string;
  relationType: string;
  joinType?: string;
  sourceColumn?: string;
  targetColumn?: string;
  sourceTable?: string;
  targetTable?: string;
  description?: string;
}

export interface MetricAssociationGraphResult {
  center: MetricAssociationGraphNode;
  nodes: MetricAssociationGraphNode[];
  edges: MetricAssociationGraphEdge[];
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

export const metricAssociationApi = {
  search: async (data: MetricAssociationSearchRequest): Promise<Response<MetricAssociationSearchResult>> =>
    datametricRequest.post('/api/v1/metrics/bi/associations/search', data),

  graph: async (metricCode: string): Promise<Response<MetricAssociationGraphResult>> =>
    datametricRequest.get('/api/v1/metrics/bi/associations/graph', { params: { metricCode } }),
};

export interface DimensionValueItem {
  value: string;
  label: string;
}

export const dimensionValueApi = {
  list: async (dimCode: string): Promise<Response<DimensionValueItem[]>> =>
    datametricRequest.get(`/api/v1/metrics/bi/dimensions/${dimCode}/values`),
};
