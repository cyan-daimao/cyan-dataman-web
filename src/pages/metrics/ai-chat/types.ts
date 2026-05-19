import type { StatFunc, FilterCondition, GroupByField } from '@/api/MetricApi';

/**
 * AI 创建指标定义（平铺格式，直接对接 MetricController 创建 API）
 */
export interface MetricDefinitionJSON {
  metricType: 'ATOMIC' | 'DERIVED' | 'COMPOSITE';
  metricName: string;
  bizCaliber: string;
  techCaliber?: string;
  subjectCode: string;
  securityLevel?: string;
  owner?: string;

  // 原子指标字段（平铺）
  statFunc?: StatFunc;
  dsName?: string;
  dbName?: string;
  tblName?: string;
  colName?: string;
  filterCondition?: FilterCondition[];

  // 派生指标字段（平铺）
  atomicMetricId?: string;
  timePeriodId?: string;
  modifierIds?: string[];
  dimensionIds?: string[];
  groupByFields?: GroupByField[];

  // 复合指标字段（平铺）
  formula?: string;
  metricRefs?: string[];
}

/**
 * 从 Agent 回复内容中提取 <metric_definition> 标签内的 JSON
 */
export function extractMetricDefinition(content: string): MetricDefinitionJSON | null {
  const match = content.match(/<metric_definition>([\s\S]*?)<\/metric_definition>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim()) as MetricDefinitionJSON;
  } catch {
    return null;
  }
}

/**
 * 从 Agent 回复内容中移除 <metric_definition> 标签（用于纯文本展示）
 */
export function stripMetricDefinition(content: string): string {
  return content.replace(/<metric_definition>[\s\S]*?<\/metric_definition>/, '').trim();
}
