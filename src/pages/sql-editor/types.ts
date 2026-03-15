// SQL 编辑器相关类型定义

// 查询历史记录
export interface QueryHistory {
    id: string;
    sql: string;
    executeTime: string;
    duration: number;
    status: 'success' | 'error';
    rowCount?: number;
    errorMessage?: string;
}

// 收藏的查询
export interface FavoriteQuery {
    id: string;
    name: string;
    sql: string;
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

// 主题节点
export interface SubjectNode {
    key: string;
    title: string;
    code: string;
    icon?: React.ReactNode;
    children?: SubjectNode[];
    tables?: TableInfo[];
}
