import { datamanRequest } from './Request';
import { ApiResponse } from './Response';

// ==================== 数据源相关类型 ====================

export interface DataSourceDTO {
    id: string;
    name: string;
    type: 'mysql' | 'postgresql' | 'oracle' | 'sqlserver' | 'clickhouse';
    host: string;
    port: number;
    username: string;
    password?: string;
    description?: string;
    status: 'connected' | 'disconnected' | 'error';
    createdAt: string;
    updatedAt: string;
}

export interface CreateDataSourceCmd {
    name: string;
    type: DataSourceDTO['type'];
    host: string;
    port: number;
    username: string;
    password: string;
    description?: string;
}

export interface UpdateDataSourceCmd extends CreateDataSourceCmd {
    id: string;
}

// ==================== 数据库相关类型 ====================

export interface DatabaseDTO {
    id: string;
    datasourceId: string;
    datasourceName: string;
    name: string;
    characterSet?: string;
    collation?: string;
    description?: string;
    environment: 'test' | 'prod';
    createdAt: string;
    updatedAt: string;
}

export interface CreateDatabaseCmd {
    datasourceId: string;
    name: string;
    characterSet?: string;
    collation?: string;
    description?: string;
}

// ==================== 表结构相关类型 ====================

export interface TableColumnDTO {
    id: string;
    name: string;
    dataType: string;
    length?: number;
    precision?: number;
    scale?: number;
    isPrimaryKey: boolean;
    isNullable: boolean;
    defaultValue?: string;
    comment?: string;
    ordinalPosition: number;
}

export interface TableIndexDTO {
    id: string;
    name: string;
    type: 'PRIMARY' | 'UNIQUE' | 'INDEX' | 'FULLTEXT';
    columns: string[];
    comment?: string;
}

export interface TableSchemaDTO {
    id: string;
    databaseId: string;
    databaseName: string;
    datasourceId: string;
    datasourceName: string;
    name: string;
    engine?: string;
    characterSet?: string;
    collation?: string;
    comment?: string;
    columns: TableColumnDTO[];
    indexes: TableIndexDTO[];
    cdcEnabled: boolean;
    environmentStatus: 'synced' | 'pending' | 'test_behind' | 'approving' | 'rejected';
    lastSyncAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTableSchemaCmd {
    databaseId: string;
    name: string;
    engine?: string;
    characterSet?: string;
    collation?: string;
    comment?: string;
    columns: Omit<TableColumnDTO, 'id'>[];
    indexes: Omit<TableIndexDTO, 'id'>[];
    cdcEnabled?: boolean;
}

export interface UpdateTableSchemaCmd extends CreateTableSchemaCmd {
    id: string;
}

export interface TableSchemaQuery {
    databaseId?: string;
    datasourceId?: string;
    name?: string;
    current: number;
    size: number;
}

export interface TableSchemaPageResult {
    data: TableSchemaDTO[];
    total: number;
    current: number;
    size: number;
}

export interface EnvironmentDiff {
    fieldName: string;
    testValue?: string;
    prodValue?: string;
    diffType: 'add' | 'delete' | 'modify';
}

export interface TableEnvironmentCompare {
    tableName: string;
    testEnvironment: Partial<TableSchemaDTO>;
    prodEnvironment: Partial<TableSchemaDTO>;
    diffs: EnvironmentDiff[];
}

export interface SyncHistoryDTO {
    id: string;
    tableId: string;
    tableName: string;
    operation: 'create' | 'alter' | 'drop';
    ddlStatement: string;
    status: 'pending' | 'approving' | 'approved' | 'rejected' | 'executed' | 'failed';
    operator: string;
    reviewer?: string;
    rejectReason?: string;
    createdAt: string;
    executedAt?: string;
}

// ==================== 数据源 API ====================

export const listDataSources = async (): Promise<DataSourceDTO[]> => {
    const response = await datamanRequest.get<ApiResponse<DataSourceDTO[]>>('/api/v1/ds/datasources');
    return response.data;
};

export const getDataSource = async (id: string): Promise<DataSourceDTO> => {
    const response = await datamanRequest.get<ApiResponse<DataSourceDTO>>(`/api/v1/ds/datasources/${id}`);
    return response.data;
};

export const createDataSource = async (cmd: CreateDataSourceCmd): Promise<DataSourceDTO> => {
    const response = await datamanRequest.post<ApiResponse<DataSourceDTO>>('/api/v1/ds/datasources', cmd);
    return response.data;
};

export const updateDataSource = async (cmd: UpdateDataSourceCmd): Promise<DataSourceDTO> => {
    const response = await datamanRequest.put<ApiResponse<DataSourceDTO>>(`/api/v1/ds/datasources/${cmd.id}`, cmd);
    return response.data;
};

export const deleteDataSource = async (id: string): Promise<void> => {
    await datamanRequest.delete(`/api/v1/ds/datasources/${id}`);
};

export const testDataSourceConnection = async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await datamanRequest.post<ApiResponse<{ success: boolean; message: string }>>(
        `/api/v1/ds/datasources/${id}/test`
    );
    return response.data;
};

// ==================== 数据库 API ====================

export const listDatabases = async (datasourceId?: string): Promise<DatabaseDTO[]> => {
    const params = datasourceId ? { datasourceId } : {};
    const response = await datamanRequest.get<ApiResponse<DatabaseDTO[]>>('/api/v1/ds/databases', { params });
    return response.data;
};

export const getDatabase = async (id: string): Promise<DatabaseDTO> => {
    const response = await datamanRequest.get<ApiResponse<DatabaseDTO>>(`/api/v1/ds/databases/${id}`);
    return response.data;
};

export const createDatabase = async (cmd: CreateDatabaseCmd): Promise<DatabaseDTO> => {
    const response = await datamanRequest.post<ApiResponse<DatabaseDTO>>('/api/v1/ds/databases', cmd);
    return response.data;
};

export const deleteDatabase = async (id: string): Promise<void> => {
    await datamanRequest.delete(`/api/v1/ds/databases/${id}`);
};

// ==================== 表结构 API ====================

export const pageTableSchemas = async (query: TableSchemaQuery): Promise<TableSchemaPageResult> => {
    const response = await datamanRequest.get<ApiResponse<TableSchemaPageResult>>('/api/v1/ds/table-schemas', {
        params: query
    });
    return response.data;
};

export const getTableSchema = async (id: string): Promise<TableSchemaDTO> => {
    const response = await datamanRequest.get<ApiResponse<TableSchemaDTO>>(`/api/v1/ds/table-schemas/${id}`);
    return response.data;
};

export const createTableSchema = async (cmd: CreateTableSchemaCmd): Promise<TableSchemaDTO> => {
    const response = await datamanRequest.post<ApiResponse<TableSchemaDTO>>('/api/v1/ds/table-schemas', cmd);
    return response.data;
};

export const updateTableSchema = async (cmd: UpdateTableSchemaCmd): Promise<TableSchemaDTO> => {
    const response = await datamanRequest.put<ApiResponse<TableSchemaDTO>>(`/api/v1/ds/table-schemas/${cmd.id}`, cmd);
    return response.data;
};

export const deleteTableSchema = async (id: string): Promise<void> => {
    await datamanRequest.delete(`/api/v1/ds/table-schemas/${id}`);
};

export const toggleTableCdc = async (id: string, enabled: boolean): Promise<TableSchemaDTO> => {
    const response = await datamanRequest.put<ApiResponse<TableSchemaDTO>>(
        `/api/v1/ds/table-schemas/${id}/cdc`,
        { enabled }
    );
    return response.data;
};

export const compareTableEnvironment = async (id: string): Promise<TableEnvironmentCompare> => {
    const response = await datamanRequest.get<ApiResponse<TableEnvironmentCompare>>(
        `/api/v1/ds/table-schemas/${id}/compare`
    );
    return response.data;
};

export const generateDDL = async (id: string): Promise<string> => {
    const response = await datamanRequest.get<ApiResponse<string>>(
        `/api/v1/ds/table-schemas/${id}/ddl`
    );
    return response.data;
};

export const previewCreateDDL = async (cmd: CreateTableSchemaCmd): Promise<string> => {
    const response = await datamanRequest.post<ApiResponse<string>>(
        '/api/v1/ds/table-schemas/preview-ddl',
        cmd
    );
    return response.data;
};

export const publishTableSchema = async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await datamanRequest.post<ApiResponse<{ success: boolean; message: string }>>(
        `/api/v1/ds/table-schemas/${id}/publish`
    );
    return response.data;
};

export const getTableSyncHistory = async (tableId: string): Promise<SyncHistoryDTO[]> => {
    const response = await datamanRequest.get<ApiResponse<SyncHistoryDTO[]>>(
        `/api/v1/ds/table-schemas/${tableId}/history`
    );
    return response.data;
};

export const saveDraftTableSchema = async (cmd: CreateTableSchemaCmd | UpdateTableSchemaCmd): Promise<TableSchemaDTO> => {
    const response = await datamanRequest.post<ApiResponse<TableSchemaDTO>>(
        '/api/v1/ds/table-schemas/draft',
        cmd
    );
    return response.data;
};