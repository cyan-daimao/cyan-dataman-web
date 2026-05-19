import type { StatFunc, FilterCondition, GroupByField } from '@/api/MetricApi';

/**
 * 数据源选择器（与前端表单 dsSelector 字段对齐）
 */
export interface DsSelector {
  dsName: string;
  dbName: string;
  tblName: string;
  colName: string;
}

/**
 * AI 创建指标表单预填对象（与前端 Form.Item name 对齐）
 */
export interface MetricFormValues {
  metricType: 'ATOMIC' | 'DERIVED' | 'COMPOSITE';
  metricName: string;
  bizCaliber: string;
  techCaliber?: string;
  subjectCode: string;
  securityLevel?: string;
  owner?: string;

  // 原子指标字段
  statFunc?: StatFunc;
  dsSelector?: DsSelector;
  filterCondition?: FilterCondition[];

  // 派生指标字段
  atomicMetricId?: string;
  timePeriodId?: string;
  modifierIds?: string[];
  dimensionIds?: string[];
  groupByFields?: GroupByField[];

  // 复合指标字段
  formula?: string;
  metricRefs?: string[];
}

/**
 * 从 Agent 回复内容中提取 <metric_form> 标签内的 JSON
 */
export function extractMetricForm(content: string): MetricFormValues | null {
  const match = content.match(/<metric_form>([\s\S]*?)<\/metric_form>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim()) as MetricFormValues;
  } catch {
    return null;
  }
}

/**
 * 从 Agent 回复内容中移除 <metric_form> 标签（用于纯文本展示）
 */
export function stripMetricForm(content: string): string {
  return content.replace(/<metric_form>[\s\S]*?<\/metric_form>/, '').trim();
}
