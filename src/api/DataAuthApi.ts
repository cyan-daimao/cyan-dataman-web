/**
 * DataAuth API 封装
 * 权限管理中心：角色、用户权限、审批、审计、指标平台权限
 *
 * Phase 1：接口和类型定义按契约实现，数据使用 mock（后端并行开发中）
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import { ApiResponse } from './Response';

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
// Mock 数据
// ---------------------------------------------------------------------------

const MOCK_ROLES: RoleDTO[] = [
  { id: '1', name: '超级管理员', code: 'SUPER_ADMIN', description: '拥有全部权限', maxSecurityLevel: 'L4', memberCount: 2, permissionCount: 99, createdAt: '2024-01-15T10:00:00+08:00' },
  { id: '2', name: '数据治理员', code: 'DATA_GOVERNANCE', description: '元数据平台全部 + 权限管理中心全部', maxSecurityLevel: 'L4', memberCount: 3, permissionCount: 45, createdAt: '2024-02-20T14:30:00+08:00' },
  { id: '3', name: '数据分析师', code: 'DATA_ANALYST', description: '指标平台(只读) + SQL查询 + BI(编辑)', maxSecurityLevel: 'L3', memberCount: 12, permissionCount: 18, createdAt: '2024-03-10T09:00:00+08:00' },
  { id: '4', name: '数据开发工程师', code: 'DATA_DEV', description: '数据加工全部 + SQL查询 + 元数据(只读)', maxSecurityLevel: 'L2', memberCount: 8, permissionCount: 22, createdAt: '2024-03-15T11:00:00+08:00' },
  { id: '5', name: '业务运营', code: 'BUSINESS_OPS', description: '指标平台(只读) + BI(只读)', maxSecurityLevel: 'L1', memberCount: 25, permissionCount: 10, createdAt: '2024-04-01T08:00:00+08:00' },
];

const MOCK_ROLE_MEMBERS: Record<string, RoleMemberDTO[]> = {
  '1': [
    { id: 'u1', passport: 'admin1', cnName: '系统管理员', deptName: '技术部', jobTitle: '架构师' },
    { id: 'u2', passport: 'admin2', cnName: '安全管理员', deptName: '安全部', jobTitle: '安全专家' },
  ],
  '2': [
    { id: 'u3', passport: 'zhangsan', cnName: '张三', deptName: '数据平台', jobTitle: '数据治理专家' },
  ],
};

const MOCK_APPROVALS: ApprovalDTO[] = [
  {
    approvalId: 'APV-20260512-001',
    applicantPassport: 'zhangsan',
    applicantName: '张三',
    approvalType: 'METRIC_PERMISSION',
    resourceType: 'METRIC',
    resourceId: 'GMV',
    resourceName: '成交金额',
    action: 'USE',
    reason: '月度复盘需要查看 GMV 指标',
    status: 'PENDING',
    currentNode: '直属上级审批',
    submittedAt: '2026-05-12T10:30:00+08:00',
  },
  {
    approvalId: 'APV-20260511-002',
    applicantPassport: 'lisi',
    applicantName: '李四',
    approvalType: 'DATA_PERMISSION',
    resourceType: 'TABLE',
    resourceId: 'iceberg.order_db.orders',
    resourceName: 'orders',
    action: 'SELECT',
    reason: '订单分析需求',
    status: 'PENDING',
    currentNode: '数据Owner审批',
    submittedAt: '2026-05-11T14:20:00+08:00',
  },
  {
    approvalId: 'APV-20260510-003',
    applicantPassport: 'wangwu',
    applicantName: '王五',
    approvalType: 'ROLE_CHANGE',
    resourceType: 'ROLE',
    resourceId: 'DATA_ANALYST',
    resourceName: '数据分析师',
    action: 'ALL',
    reason: '转岗至数据分析团队',
    status: 'APPROVED',
    currentNode: '-',
    submittedAt: '2026-05-10T09:00:00+08:00',
    handledAt: '2026-05-10T11:30:00+08:00',
    comment: '同意',
  },
];

const MOCK_AUDIT_LOGS: AuditLogDTO[] = [
  {
    id: 'AUD-001',
    userId: 'zhangsan',
    userName: '张三',
    action: 'SQL_EXECUTE',
    resourceType: 'TABLE',
    resourceId: 'iceberg.order_db.orders',
    originalSql: 'SELECT * FROM orders',
    rewrittenSql: "SELECT user_id, name FROM orders WHERE region='华东'",
    ip: '10.0.1.23',
    costTimeMs: 125,
    riskLevel: 'LOW',
    timestamp: '2026-05-12T10:30:00+08:00',
  },
  {
    id: 'AUD-002',
    userId: 'lisi',
    userName: '李四',
    action: 'LOGIN',
    resourceType: 'SYSTEM',
    resourceId: 'datacenter',
    ip: '10.0.1.45',
    costTimeMs: 12,
    riskLevel: 'LOW',
    timestamp: '2026-05-12T09:00:00+08:00',
  },
  {
    id: 'AUD-003',
    userId: 'zhangsan',
    userName: '张三',
    action: 'PERMISSION_CHANGE',
    resourceType: 'ROLE',
    resourceId: 'DATA_ANALYST',
    ip: '10.0.1.23',
    costTimeMs: 50,
    riskLevel: 'MEDIUM',
    timestamp: '2026-05-11T16:00:00+08:00',
  },
];

const MOCK_METRIC_PERMISSIONS: MetricPermissionConfigDTO[] = [
  { metricId: 'm1', metricCode: 'GMV', metricName: '成交金额', subjectCode: 'TRADE', subjectName: '交易', status: 'PUBLISHED', visibility: 'PUBLIC', allowedRoles: [] },
  { metricId: 'm2', metricCode: 'ORDER_COUNT', metricName: '订单量', subjectCode: 'TRADE', subjectName: '交易', status: 'PUBLISHED', visibility: 'PUBLIC', allowedRoles: [] },
  { metricId: 'm3', metricCode: 'ARPU', metricName: '客单价', subjectCode: 'TRADE', subjectName: '交易', status: 'PUBLISHED', visibility: 'ROLE', allowedRoles: ['DATA_ANALYST', 'DATA_GOVERNANCE'] },
];

const MOCK_DIMENSION_PERMISSIONS: DimensionPermissionConfigDTO[] = [
  { dimensionId: 'd1', dimensionCode: 'REGION', dimensionName: '地区', category: '地理', relatedField: 'region', actions: ['VIEW', 'USE'], allowValuesQuery: true, targets: [{ targetType: 'ROLE', targetId: 'DATA_ANALYST', targetName: '数据分析师' }] },
  { dimensionId: 'd2', dimensionCode: 'CATEGORY', dimensionName: '品类', category: '业务', relatedField: 'category', actions: ['VIEW', 'USE'], allowValuesQuery: false, targets: [{ targetType: 'ROLE', targetId: 'BUSINESS_OPS', targetName: '业务运营' }] },
];

// ---------------------------------------------------------------------------
// API 函数
// ---------------------------------------------------------------------------

function mockResponse<T>(data: T, delay = 300): Promise<ApiResponse<T>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ code: 200, message: 'success', data });
    }, delay);
  });
}

// ==================== 角色管理 ====================

export const listRoles = (): Promise<ApiResponse<RoleDTO[]>> => {
  return mockResponse([...MOCK_ROLES]);
};

export const getRole = (_id: string): Promise<ApiResponse<RoleDTO>> => {
  const role = MOCK_ROLES.find(r => r.id === id);
  return mockResponse(role || MOCK_ROLES[0]);
};

export const saveRole = (cmd: RoleCmd): Promise<ApiResponse<string>> => {
  return mockResponse(cmd.id || 'new-role-id');
};

export const deleteRole = (_id: string): Promise<ApiResponse<void>> => {
  return mockResponse(undefined);
};

export const listRoleMembers = (roleId: string): Promise<ApiResponse<RoleMemberDTO[]>> => {
  return mockResponse(MOCK_ROLE_MEMBERS[roleId] || []);
};

export const addRoleMembers = (_roleId: string, _passports: string[]): Promise<ApiResponse<void>> => {
  return mockResponse(undefined);
};

export const removeRoleMember = (_roleId: string, _passport: string): Promise<ApiResponse<void>> => {
  return mockResponse(undefined);
};

// ==================== 用户权限 ====================

export const listUserPermissions = (): Promise<ApiResponse<UserPermissionDTO[]>> => {
  const users: UserPermissionDTO[] = [
    {
      passport: 'zhangsan',
      cnName: '张三',
      roles: [MOCK_ROLES[2]],
      directPermissions: [],
      dataPermissions: [{ resourceType: 'TABLE', resourceId: 'iceberg.order_db.orders', action: 'SELECT' }],
      metricPermissions: [{ permissionType: 'METRIC', resourceId: 'GMV', actions: ['VIEW', 'USE'] }],
    },
  ];
  return mockResponse(users);
};

export const getUserPermission = (passport: string): Promise<ApiResponse<UserPermissionDTO>> => {
  return mockResponse({
    passport,
    cnName: '张三',
    roles: [MOCK_ROLES[2]],
    directPermissions: [],
    dataPermissions: [{ resourceType: 'TABLE', resourceId: 'iceberg.order_db.orders', action: 'SELECT' }],
    metricPermissions: [{ permissionType: 'METRIC', resourceId: 'GMV', actions: ['VIEW', 'USE'] }],
  });
};

export const grantUserPermission = (_passport: string, _permissions: PermissionItemDTO[]): Promise<ApiResponse<void>> => {
  return mockResponse(undefined);
};

export const revokeUserPermission = (_passport: string, _permissionId: string): Promise<ApiResponse<void>> => {
  return mockResponse(undefined);
};

// ==================== 指标平台权限 ====================

export const listSubjectPermissions = (): Promise<ApiResponse<SubjectPermissionDTO[]>> => {
  return mockResponse([
    { subjectCode: 'EC', subjectName: '电商', actions: ['VIEW', 'USE'], targets: [{ targetType: 'ROLE', targetId: 'DATA_ANALYST', targetName: '数据分析师' }] },
    { subjectCode: 'TRADE', subjectName: '交易', actions: ['VIEW'], targets: [{ targetType: 'ROLE', targetId: 'BUSINESS_OPS', targetName: '业务运营' }] },
  ]);
};

export const saveSubjectPermission = (_cmd: SubjectPermissionDTO): Promise<ApiResponse<void>> => {
  return mockResponse(undefined);
};

export const listMetricPermissions = (): Promise<ApiResponse<MetricPermissionConfigDTO[]>> => {
  return mockResponse([...MOCK_METRIC_PERMISSIONS]);
};

export const batchUpdateMetricVisibility = (_metricIds: string[], _visibility: 'PUBLIC' | 'ROLE' | 'PRIVATE', _allowedRoles?: string[]): Promise<ApiResponse<void>> => {
  return mockResponse(undefined);
};

export const listDimensionPermissions = (): Promise<ApiResponse<DimensionPermissionConfigDTO[]>> => {
  return mockResponse([...MOCK_DIMENSION_PERMISSIONS]);
};

export const saveDimensionPermission = (_cmd: DimensionPermissionConfigDTO): Promise<ApiResponse<void>> => {
  return mockResponse(undefined);
};

// ==================== 审批管理 ====================

export const listApprovals = (params: { passport: string; status?: ApprovalStatus; type?: ApprovalType; pageNum?: number; pageSize?: number }): Promise<ApiResponse<{ list: ApprovalDTO[]; total: number }>> => {
  const list = MOCK_APPROVALS.filter(a => {
    if (params.status && a.status !== params.status) return false;
    if (params.type && a.approvalType !== params.type) return false;
    return true;
  });
  return mockResponse({ list, total: list.length });
};

export const submitApproval = (_cmd: ApprovalSubmitCmd): Promise<ApiResponse<{ approvalId: string; status: ApprovalStatus; currentNode: string; submittedAt: string }>> => {
  return mockResponse({
    approvalId: `APV-${Date.now()}`,
    status: 'PENDING',
    currentNode: '直属上级审批',
    submittedAt: new Date().toISOString(),
  });
};

export const approvalAction = (_approvalId: string, _cmd: ApprovalActionCmd): Promise<ApiResponse<void>> => {
  return mockResponse(undefined);
};

// ==================== 审计日志 ====================

export const listAuditLogs = (query: AuditLogQuery): Promise<ApiResponse<{ list: AuditLogDTO[]; total: number }>> => {
  let list = [...MOCK_AUDIT_LOGS];
  if (query.passport) {
    list = list.filter(a => a.userId === query.passport);
  }
  if (query.action) {
    list = list.filter(a => a.action === query.action);
  }
  return mockResponse({ list, total: list.length });
};

// ==================== 我的权限 ====================

export const getMyPermissions = (passport: string): Promise<ApiResponse<MyPermissionDTO>> => {
  return mockResponse({
    functionPermissions: [
      { moduleName: '元数据平台', permissions: ['业务数据库-查看', '表结构管理-查看'] },
      { moduleName: '指标平台', permissions: ['指标概览-查看', '指标字典-查看', '指标分析-使用'] },
      { moduleName: 'SQL查询', permissions: ['编辑器-使用', '结果导出-导出'] },
    ],
    dataPermissions: [
      {
        datasourceName: 'MySQL-PROD',
        databases: [
          {
            databaseName: 'order_db',
            tables: [
              { tableName: 'orders', action: 'SELECT', rowFilter: "region IN ('华东')" },
            ],
          },
        ],
      },
    ],
    metricPermissions: [
      { subjectName: '交易', metrics: ['GMV', '订单量'], dimensions: ['地区', '品类'] },
    ],
    pendingApprovals: MOCK_APPROVALS.filter(a => a.applicantPassport === passport && a.status === 'PENDING'),
  });
};

// ==================== 元数据权限接口（按契约） ====================

export const authCheck = (_cmd: AuthCheckCmd): Promise<ApiResponse<AuthCheckResult>> => {
  return mockResponse({ permitted: true });
};

export const authFilterSql = (cmd: SqlFilterCmd): Promise<ApiResponse<SqlFilterResult>> => {
  return mockResponse({
    permitted: true,
    originalSql: cmd.sql,
    rewrittenSql: cmd.sql,
    rowFilters: [],
    columnMasks: [],
  });
};

export const authResources = (_params: { passport: string; resourceType?: string }): Promise<ApiResponse<AuthResourceNode[]>> => {
  return mockResponse([
    {
      id: 'ds-001',
      name: 'MySQL-PROD',
      type: 'DATASOURCE',
      children: [
        {
          id: 'db-001',
          name: 'order_db',
          type: 'DB',
          children: [
            { id: 'tbl-001', name: 'orders', type: 'TABLE', permission: 'READ' },
          ],
        },
      ],
    },
  ]);
};

// ==================== 指标平台权限接口（按契约） ====================

export const authMetricCheck = (cmd: MetricCheckCmd): Promise<ApiResponse<MetricCheckResult>> => {
  return mockResponse({
    allPermitted: true,
    results: cmd.checkItems.map(item => ({
      resourceType: item.resourceType,
      resourceId: item.resourceId,
      permitted: true,
    })),
  });
};

export const authMetricList = (_params: { passport: string; resourceType: string; subjectCode?: string; action?: string }): Promise<ApiResponse<MetricResourceDTO[]>> => {
  return mockResponse([
    { id: 'metric-001', code: 'GMV', name: '成交金额', subjectCode: 'TRADE', subjectName: '交易' },
  ]);
};

export const authMetricFilterSql = (_cmd: MetricFilterSqlCmd): Promise<ApiResponse<MetricFilterSqlResult>> => {
  return mockResponse({
    permitted: true,
    originalSql: cmd.sql,
    rewrittenSql: cmd.sql,
    rowFilters: [],
  });
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

export const getUserFunctionPermissions = (_passport: string): Promise<ApiResponse<string[]>> => {
  return mockResponse([
    'meta',
    'meta:business-ds',
    'meta:business-ds:datasource',
    'meta:business-ds:database',
    'meta:business-ds:table-schema',
    'meta:business-ds:sql',
    'meta:metadata',
    'meta:metadata:datasource',
    'meta:metadata:subject',
    'meta:metadata:metadata_table',
    'metrics',
    'metrics:dashboard',
    'metrics:definition',
    'metrics:dictionary',
    'metrics:analysis',
    'metrics:config',
    'metrics:dimension',
    'sql-editor',
    'data-work',
    'bi',
    'bi:chart',
    'bi:dashboard',
    'bi:chatbi',
    'auth',
    'auth:role',
    'auth:user',
    'auth:metric',
    'auth:approval',
    'auth:audit',
    'auth:my',
  ]);
};
