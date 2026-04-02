// 数据加工页面相关类型定义

// SQL 引擎类型
export type SQLEngine = 'spark' | 'flink';

// 调度配置
export interface ScheduleConfig {
    id?: string;
    name: string;
    description?: string;
    cronExpression: string;
    engine: SQLEngine;
    enabled: boolean;
    retryTimes: number;
    retryInterval: number; // 分钟
    timeout: number; // 分钟
    alertEmails?: string[];
    alertDingTalk?: string;
}

// 调度任务实例
export interface ScheduleInstance {
    id: string;
    scheduleId: string;
    scheduleName: string;
    status: 'pending' | 'running' | 'success' | 'failed' | 'timeout';
    startTime: string;
    endTime?: string;
    duration?: number;
    sql: string;
    engine: SQLEngine;
    errorMessage?: string;
}

// 查询历史记录
export interface QueryHistory {
    id: string;
    sql: string;
    executeTime: string;
    duration: number;
    status: 'success' | 'error';
    engine: SQLEngine;
    rowCount?: number;
    errorMessage?: string;
}

// 收藏的查询
export interface FavoriteQuery {
    id: string;
    name: string;
    sql: string;
    engine: SQLEngine;
    createTime: string;
}

// 执行结果
export interface QueryResult {
    columns: string[];
    rows: Record<string, any>[];
    total: number;
    duration: number;
}

// 执行计划
export interface ExecutionPlan {
    id: string;
    operation: string;
    rowCount: number;
    cost: number;
    details?: string;
}

// 表信息
export interface TableInfo {
    name: string;
    catalog: string;
    schema: string;
    comment?: string;
    columns?: ColumnInfo[];
}

// 列信息
export interface ColumnInfo {
    name: string;
    type: string;
    comment?: string;
    nullable: boolean;
}
