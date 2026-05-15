/**
 * DataAuth API 封装
 * 权限管理中心：角色、用户权限、审批、审计、指标平台权限
 */

import { ApiResponse } from './Response';
import { dataauthRequest } from './Request';

// ---------------------------------------------------------------------------
// 通用类型
// ---------------------------------------------------------------------------

export type ResourceType =
  | 'DATASOURCE'
  | 'DB'
  | 'TABLE'
  | 'COLUMN'
  | 'ROW'
  | 'SUBJECT'
  | 'METRIC'
  | 'DIMENSION'
  | 'MODIFIER'
  | 'MENU'
  | 'BUTTON'
  | 'API';

export type ActionType =
  | 'VIEW'
  | 'USE'
  | 'EDIT'
  | 'EXECUTE'
  | 'EXPORT'
  | 'ALL'
  | 'SELECT'
  | 'INSERT'
  | 'UPDATE'
  | 'DELETE'
  | 'PUBLISH'
  | 'OFFLINE'
  | 'VALUES';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ApprovalType = 'METRIC_PERMISSION' | 'DATA_PERMISSION' | 'ROLE_CHANGE';

export interface PageResult<T> {
  list: T[];
  total: number;
  pageNum: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// 角色管理
// ---------------------------------------------------------------------------

export interface RoleDTO {
  id: string;
  name: string;
  code: string;
  description: string;
  maxSecurityLevel?: string;
  memberCount: number;
  permissionCount: number;
  createdAt: string;
  functionPermissions?: string[];
}

export interface RoleCmd {
  id?: string;
  name: string;
  code: string;
  description: string;
  maxSecurityLevel?: string;
  functionPermissions: string[];
  dataPermissions: DataPermissionItem[];
  metricPermissions: MetricPermissionItem[];
}

export interface DataPermissionItem {
  resourceType: ResourceType;
  resourceId: string;
  action: ActionType;
}

export interface MetricPermissionItem {
  permissionType: 'SUBJECT' | 'METRIC' | 'DIMENSION' | 'MODIFIER';
  resourceId: string;
  actions: ActionType[];
}

export interface RoleMemberDTO {
  id: string;
  passport: string;
  cnName: string;
  deptName: string;
  jobTitle: string;
}

// ---------------------------------------------------------------------------
// 用户权限
// ---------------------------------------------------------------------------

export interface UserPermissionDTO {
  passport: string;
  cnName: string;
  roles: RoleDTO[];
  directPermissions: PermissionItemDTO[];
  dataPermissions: DataPermissionItem[];
  metricPermissions: MetricPermissionItem[];
}

export interface PermissionItemDTO {
  resourceType: ResourceType;
  resourceId: string;
  action: ActionType;
  resourceName?: string;
}

// ---------------------------------------------------------------------------
// 指标平台权限
// ---------------------------------------------------------------------------

export interface SubjectPermissionDTO {
  subjectCode: string;
  subjectName: string;
  actions: ActionType[];
  targets: PermissionTargetDTO[];
}

export interface MetricPermissionConfigDTO {
  metricId: string;
  metricCode: string;
  metricName: string;
  subjectCode: string;
  subjectName: string;
  status: string;
  visibility: 'PUBLIC' | 'ROLE' | 'PRIVATE';
  allowedRoles: string[];
}

export interface DimensionPermissionConfigDTO {
  dimensionId: string;
  dimensionCode: string;
  dimensionName: string;
  category: string;
  relatedField: string;
  actions: ActionType[];
  allowValuesQuery: boolean;
  targets: PermissionTargetDTO[];
}

export interface PermissionTargetDTO {
  targetType: 'USER' | 'ROLE' | 'DEPT' | 'GROUP';
  targetId: string;
  targetName: string;
}

// ---------------------------------------------------------------------------
// 审批
// ---------------------------------------------------------------------------

export interface ApprovalDTO {
  approvalId: string;
  applicantPassport: string;
  applicantName: string;
  approvalType: ApprovalType;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  action: ActionType;
  reason: string;
  status: ApprovalStatus;
  currentNode: string;
  submittedAt: string;
  handledAt?: string;
  comment?: string;
}

export interface ApprovalSubmitCmd {
  applicantPassport: string;
  approvalType: ApprovalType;
  resourceType: string;
  resourceId: string;
  action: ActionType;
  reason: string;
  expireDays?: number;
}

export interface ApprovalActionCmd {
  operatorPassport: string;
  action: 'APPROVE' | 'REJECT' | 'TRANSFER';
  comment?: string;
  transferTo?: string;
}

// ---------------------------------------------------------------------------
// 审计日志
// ---------------------------------------------------------------------------

export type AuditAction = 'LOGIN' | 'LOGOUT' | 'SQL_EXECUTE' | 'PERMISSION_CHANGE' | 'APPROVAL';

export interface AuditLogDTO {
  id: string;
  userId: string;
  userName: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  originalSql?: string;
  rewrittenSql?: string;
  ip: string;
  costTimeMs: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  timestamp: string;
}

export interface AuditLogQuery {
  passport?: string;
  action?: AuditAction;
  resourceType?: string;
  startTime?: string;
  endTime?: string;
  pageNum?: number;
  pageSize?: number;
}

// ---------------------------------------------------------------------------
// 我的权限
// ---------------------------------------------------------------------------

export interface MyPermissionDTO {
  functionPermissions: FunctionPermissionModuleDTO[];
  dataPermissions: MyDataPermissionDTO[];
  metricPermissions: MyMetricPermissionDTO[];
  pendingApprovals: ApprovalDTO[];
}

export interface FunctionPermissionModuleDTO {
  moduleName: string;
  permissions: string[];
}

export interface MyDataPermissionDTO {
  datasourceName: string;
  databases: MyDatabasePermissionDTO[];
}

export interface MyDatabasePermissionDTO {
  databaseName: string;
  tables: MyTablePermissionDTO[];
}

export interface MyTablePermissionDTO {
  tableName: string;
  action: ActionType;
  rowFilter?: string;
  columnMasks?: string[];
}

export interface MyMetricPermissionDTO {
  subjectName: string;
  metrics: string[];
  dimensions: string[];
}

// ---------------------------------------------------------------------------
// 元数据权限接口（按契约）
// ---------------------------------------------------------------------------

export interface AuthCheckCmd {
  passport: string;
  resourceType: ResourceType;
  resourceId: string;
  action: ActionType;
}

export interface AuthCheckResult {
  permitted: boolean;
  reason?: string;
}

export interface AuthResourceNode {
  id: string;
  name: string;
  type: ResourceType;
  permission?: string;
  children?: AuthResourceNode[];
}

export interface SqlFilterCmd {
  passport: string;
  sql: string;
  engine?: string;
}

export interface SqlFilterResult {
  permitted: boolean;
  originalSql: string;
  rewrittenSql?: string;
  rowFilters?: string[];
  columnMasks?: ColumnMaskDTO[];
  reason?: string;
}

export interface ColumnMaskDTO {
  column: string;
  maskType: string;
}

// ---------------------------------------------------------------------------
// 指标平台权限接口（按契约）
// ---------------------------------------------------------------------------

export interface MetricCheckItem {
  resourceType: 'SUBJECT' | 'METRIC' | 'DIMENSION' | 'MODIFIER';
  resourceId: string;
  action: ActionType;
}

export interface MetricCheckCmd {
  passport: string;
  checkItems: MetricCheckItem[];
}

export interface MetricCheckResultItem {
  resourceType: string;
  resourceId: string;
  permitted: boolean;
  reason?: string;
}

export interface MetricCheckResult {
  allPermitted: boolean;
  results: MetricCheckResultItem[];
}

export interface MetricResourceDTO {
  id: string;
  code: string;
  name: string;
  subjectCode?: string;
  subjectName?: string;
}

export interface MetricFilterSqlCmd {
  passport: string;
  sql: string;
  metricCodes: string[];
  dimCodes: string[];
  engine?: string;
}

export interface MetricFilterSqlResult {
  permitted: boolean;
  originalSql: string;
  rewrittenSql?: string;
  rowFilters?: string[];
  reason?: string;
}

// ---------------------------------------------------------------------------
// API 函数
// ---------------------------------------------------------------------------

// ==================== 角色管理 ====================

export const listRoles = (): Promise<ApiResponse<RoleDTO[]>> =>
  dataauthRequest.get('/api/v1/auth/roles');

export const getRole = (id: string): Promise<ApiResponse<RoleDTO>> =>
  listRoles().then(res => {
    const role = res.data?.find(r => r.id === id);
    return { code: 200, message: 'success', data: role || res.data?.[0] } as ApiResponse<RoleDTO>;
  });

export const saveRole = (cmd: RoleCmd): Promise<ApiResponse<RoleDTO>> => {
  if (cmd.id) {
    return dataauthRequest.put(`/api/v1/auth/roles/${cmd.id}`, cmd);
  }
  return dataauthRequest.post('/api/v1/auth/roles', cmd);
};

export const deleteRole = (id: string): Promise<ApiResponse<void>> =>
  dataauthRequest.delete(`/api/v1/auth/roles/${id}`);

export const listRoleMembers = (roleId: string): Promise<ApiResponse<RoleMemberDTO[]>> =>
  dataauthRequest.get(`/api/v1/auth/roles/${roleId}/members`);

export const addRoleMembers = (roleId: string, passports: string[]): Promise<ApiResponse<void>> =>
  dataauthRequest.post(`/api/v1/auth/roles/${roleId}/members`, { passports });

export const removeRoleMember = (roleId: string, passport: string): Promise<ApiResponse<void>> =>
  dataauthRequest.delete(`/api/v1/auth/roles/${roleId}/members/${passport}`);

// ==================== 用户权限 ====================

export const listUserPermissions = (params?: { pageNum?: number; pageSize?: number; keyword?: string }): Promise<ApiResponse<PageResult<UserPermissionDTO>>> =>
  dataauthRequest.get('/api/v1/auth/users/permissions', { params });

export const getUserPermission = (passport: string): Promise<ApiResponse<UserPermissionDTO>> => {
  // TODO: 后端暂无单用户权限查询接口，暂用列表接口过滤
  return listUserPermissions({ pageNum: 1, pageSize: 1, keyword: passport }).then(res => {
    const user = res.data?.list?.[0];
    return { code: 200, message: 'success', data: user } as ApiResponse<UserPermissionDTO>;
  });
};

export const assignUserRoles = (passport: string, roleIds: string[]): Promise<ApiResponse<void>> =>
  dataauthRequest.post(`/api/v1/auth/users/${passport}/roles`, { roleIds });

export const revokeUserPermission = (_passport: string, _permissionId: string): Promise<ApiResponse<void>> => {
  // TODO: 后端暂无直接权限回收接口（本期只支持角色授权）
  return Promise.resolve({ code: 200, message: 'success', data: undefined } as ApiResponse<void>);
};

// ==================== 指标平台权限 ====================

export const listSubjectPermissions = (): Promise<ApiResponse<SubjectPermissionDTO[]>> =>
  dataauthRequest.get('/api/v1/auth/metric/subject-permissions');

export const saveSubjectPermission = (cmd: SubjectPermissionDTO): Promise<ApiResponse<void>> =>
  dataauthRequest.post('/api/v1/auth/metric/subject-permissions', cmd);

export const listMetricPermissions = (params?: { pageNum?: number; pageSize?: number; subjectCode?: string }): Promise<ApiResponse<PageResult<MetricPermissionConfigDTO>>> =>
  dataauthRequest.get('/api/v1/auth/metric/metric-permissions', { params });

export const batchUpdateMetricVisibility = (metricIds: string[], visibility: 'PUBLIC' | 'ROLE' | 'PRIVATE', allowedRoles?: string[]): Promise<ApiResponse<void>> =>
  dataauthRequest.post('/api/v1/auth/metric/metric-permissions/batch-update', { metricIds, visibility, allowedRoles });

export const listDimensionPermissions = (): Promise<ApiResponse<DimensionPermissionConfigDTO[]>> =>
  dataauthRequest.get('/api/v1/auth/metric/dimension-permissions');

export const saveDimensionPermission = (cmd: DimensionPermissionConfigDTO): Promise<ApiResponse<void>> =>
  dataauthRequest.post('/api/v1/auth/metric/dimension-permissions', cmd);

// ==================== 审批管理 ====================

export const listApprovals = (params: { passport: string; status?: ApprovalStatus; type?: ApprovalType; pageNum?: number; pageSize?: number }): Promise<ApiResponse<{ list: ApprovalDTO[]; total: number }>> =>
  dataauthRequest.get('/api/v1/approval/list', { params }).then((res: ApiResponse<{ list: ApprovalDTO[]; total: number }>) => res);

export const submitApproval = (cmd: ApprovalSubmitCmd): Promise<ApiResponse<ApprovalDTO>> =>
  dataauthRequest.post('/api/v1/approval/submit', cmd);

export const approvalAction = (approvalId: string, cmd: ApprovalActionCmd): Promise<ApiResponse<ApprovalDTO>> =>
  dataauthRequest.post(`/api/v1/approval/${approvalId}/action`, cmd);

// ==================== 审计日志 ====================

export const listAuditLogs = (query: AuditLogQuery): Promise<ApiResponse<{ list: AuditLogDTO[]; total: number }>> =>
  dataauthRequest.get('/api/v1/audit/logs', { params: query }).then((res: ApiResponse<{ list: AuditLogDTO[]; total: number }>) => res);

// ==================== 我的权限 ====================

export const getMyPermissions = (): Promise<ApiResponse<MyPermissionDTO>> => {
  const currentRaw = localStorage.getItem('current');
  let passport = '';
  if (currentRaw) {
    try {
      const current = JSON.parse(currentRaw) as { passport?: string };
      passport = current.passport || '';
    } catch {
      // ignore
    }
  }
  return dataauthRequest.get('/api/v1/auth/my/permissions', { params: { passport } });
};

// ==================== 元数据权限接口（按契约） ====================

export const authCheck = (cmd: AuthCheckCmd): Promise<ApiResponse<AuthCheckResult>> =>
  dataauthRequest.post('/api/v1/auth/check', cmd);

export const authFilterSql = (cmd: SqlFilterCmd): Promise<ApiResponse<SqlFilterResult>> =>
  dataauthRequest.post('/api/v1/auth/filter/sql', cmd);

export const authResources = (params: { passport: string; resourceType?: string }): Promise<ApiResponse<AuthResourceNode[]>> =>
  dataauthRequest.get('/api/v1/auth/resources', { params });

// ==================== 指标平台权限接口（按契约） ====================

export const authMetricCheck = (cmd: MetricCheckCmd): Promise<ApiResponse<MetricCheckResult>> => {
  // TODO: 后端指标批量校验接口未确认实现，暂默认放行
  return Promise.resolve({
    code: 200, message: 'success', data: {
      allPermitted: true,
      results: cmd.checkItems.map(item => ({
        resourceType: item.resourceType,
        resourceId: item.resourceId,
        permitted: true,
      })),
    },
  } as ApiResponse<MetricCheckResult>);
};

export const authMetricList = (_params: { passport: string; resourceType: string; subjectCode?: string; action?: string }): Promise<ApiResponse<MetricResourceDTO[]>> => {
  // TODO: 后端指标资源列表接口未确认实现，暂返回空列表
  return Promise.resolve({ code: 200, message: 'success', data: [] } as ApiResponse<MetricResourceDTO[]>);
};

export const authMetricFilterSql = (cmd: MetricFilterSqlCmd): Promise<ApiResponse<MetricFilterSqlResult>> => {
  // TODO: 后端指标 SQL 过滤接口未确认实现，暂原样返回
  return Promise.resolve({
    code: 200, message: 'success', data: {
      permitted: true,
      originalSql: cmd.sql,
      rewrittenSql: cmd.sql,
      rowFilters: [],
    },
  } as ApiResponse<MetricFilterSqlResult>);
};

// ==================== 功能权限查询（前端路由/菜单/按钮控制） ====================

export interface FunctionPermissionNode {
  key: string;
  name: string;
  type: 'MENU' | 'BUTTON' | 'API';
  children?: FunctionPermissionNode[];
}

export interface UserFunctionPermissionDTO {
  passport: string;
  permissions: string[];
}

export const getUserFunctionPermissions = (): Promise<ApiResponse<FunctionPermissionNode[]>> =>
  dataauthRequest.get('/api/v1/auth/function-permissions/tree');
