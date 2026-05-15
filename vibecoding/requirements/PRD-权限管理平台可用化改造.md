# PRD：权限管理平台可用化改造

## 1. 问题诊断

### 1.1 核心结论：权限平台处于"有界面无能力"状态

经过对前后端代码的深度审查，当前权限管理平台**界面齐全但核心能力断裂**。具体表现为：

| 模块 | 表面状态 | 真实状态 | 严重程度 |
|------|---------|---------|---------|
| 角色管理 | 有页面 | 功能权限配置保存后数据直接丢弃 | 🔴 |
| 用户权限 | 有页面 | 列表展示 passport 而非姓名，分配角色可用 | 🟡 |
| 指标平台权限 | 有页面 | 主题域权限保存硬编码，配置形同虚设 | 🔴 |
| 审批管理 | 有页面 | 只能审批，无法申请，审批通过不授权 | 🔴 |
| 我的权限 | 有页面 | "申请新权限"是空按钮 | 🔴 |
| 指标平台打通 | 部分打通 | 仅 BI 分析有权限校验，datagateway SQL 执行绕过 | 🔴 |
| 元数据平台打通 | 未打通 | 元数据表、SQL 执行、业务数据库均无权限控制 | 🔴 |

### 1.2 根因分析

**根因一：前端后端体系不匹配**
- 前端功能权限树是硬编码的菜单路径（如 `meta:business-ds:datasource`）
- 后端 `assignPermissions` 分配的是数据库权限项 ID（`auth_permission` 表主键）
- 两者没有任何桥接，角色保存时功能权限数据直接被丢弃

**根因二：审批流程纯状态机**
- 审批提交 → 审批操作 → 状态变更，仅此而已
- 审批通过后**没有任何权限变更逻辑**，用户申请了也白申请

**根因三：SQL 执行绕过了权限中心**
- `sql-editor`、`data-work`、元数据 SQL 执行均直接调用 `datagateway`
- `datagateway` 没有接入 `dataauth` 校验，成为权限黑洞

**根因四：降级策略过于宽松**
- `PermissionGuard` 接口异常时默认放行（应 fail-closed）
- 多处"接口异常返回全量"的设计违背安全原则

---

## 2. 目标与范围

### 2.1 目标

**让权限管理平台从"有界面"变成"真的能用"**：
1. 用户能发起权限申请，审批通过后自动获得权限
2. 功能权限配置真正生效，控制页面访问和按钮显示
3. 指标平台、元数据平台、SQL 执行均接入权限控制
4. 权限降级策略改为 fail-closed（异常时拒绝而非放行）

### 2.2 范围（MVP，不做过度设计）

| 做 | 不做 |
|---|---|
| 审批申请表单 + 审批通过后自动授权 | SQL 行级过滤/列脱敏改写（阶段二再做） |
| 功能权限树真正存储到数据库并生效 | 复杂的 Policy 策略模型 |
| 指标/元数据/SQL 执行的权限校验接入 | 权限生命周期管理（过期自动回收） |
| 修复现有 Bug（硬编码、空按钮、默认放行） | 数据脱敏 UDF |

---

## 3. 方案设计

### 3.1 审批流程闭环（最优先）

```
用户视角：
    我的权限 → 点击"申请新权限" → 填写表单（资源类型/资源/操作/理由）
        → 提交审批 → 查看"我发起的审批"进度

审批人视角：
    审批管理 → 待我审批 → 通过/驳回 → 审批单状态变更

系统视角（审批通过后）：
    状态变更为 APPROVED → 触发权限自动授权
        → 数据权限：创建 auth_permission + auth_role_permission（或 auth_user_permission）
        → 角色变更：创建 auth_user_role 关联
        → 指标权限：创建 METRIC/DIMENSION 类型的 auth_permission
```

**新增页面/功能：**

| 功能 | 位置 | 说明 |
|------|------|------|
| 申请权限表单 Drawer | `/auth/my` | 选择资源类型 → 选择具体资源 → 选择操作 → 填写理由 → 提交 |
| 我发起的审批 Tab | `/auth/approval` | 新增 Tab，展示用户自己提交的审批单 |
| 审批通过后自动授权 | 后端 | `AuthApprovalServiceImpl.action()` 中 approve 后根据审批内容创建权限项 |

**资源选择器设计（申请表单）：**

```
资源类型 [单选]: 数据表 / 指标 / 维度 / 角色
├── 选择"数据表" → 级联选择: 数据源 → 数据库 → 表（调用 metadata API）
├── 选择"指标" → 搜索选择指标（调用 datametric API）
├── 选择"维度" → 搜索选择维度（调用 datametric API）
└── 选择"角色" → 下拉选择角色（调用 listRoles）

操作权限 [多选]: VIEW / USE / EDIT / EXECUTE
申请理由 [文本域]
有效期 [可选，默认永久]
```

### 3.2 功能权限真正生效

**当前问题：** 前端功能权限树和后端权限项体系完全不匹配。

**解决方案：统一体系**

方案 A（推荐）：将功能权限树节点持久化到 `auth_permission` 表
- 新增 Flyway 迁移，将功能权限树节点预录入 `auth_permission` 表
- `resourceType=MENU/BUTTON`，`resourceId=meta:business-ds:datasource`，`action=VIEW`
- 角色保存时，前端将选中的功能权限 key 数组传给后端
- 后端根据 key 查找对应的 `auth_permission` 记录，通过 `assignPermissions` 关联到角色

方案 B：简化设计，不持久化功能权限项
- 功能权限直接存储在 `auth_role` 表的 `function_permissions` JSON 字段中
- 后端 `AuthMyPermissionController` 从该字段解析功能权限返回给前端
- 权限校验时直接从 `auth_role` 表读取

**推荐方案 A**，因为：
- 与现有 `auth_permission` 体系一致
- 未来扩展（如按钮级权限）更方便
- 审批通过后自动授权也能统一处理

**实施步骤：**
1. 数据库迁移：预录入功能权限树节点到 `auth_permission`
2. 后端 `RoleCreateCmd` / `RoleUpdateCmd` 新增 `functionPermissionKeys: string[]`
3. `AuthRoleServiceImpl.save()` 中根据 key 查找 permissionId 并关联
4. `AuthMyPermissionController` 从 `auth_role_permission` + `auth_permission` 聚合功能权限
5. 前端 `handleSave` 将 `functionPermissions` 作为 `functionPermissionKeys` 传给后端

### 3.3 指标平台打通

**已打通的部分：**
- `MetricBiAnalysisServiceImpl.execute()` 已调用 `dataauth` 校验指标/维度权限
- `listDimensions` 已调用 `dataauth` 过滤无权限维度

**未打通的部分：**
- SQL 执行（`DatagawayApi`）没有调用 `authFilterSql`
- 指标字典列表没有按权限过滤
- 看板查看时没有校验看板内各图表的指标权限

**打通方案：**

| 接入点 | 改造方式 | 优先级 |
|--------|---------|--------|
| `sql-editor` SQL 执行前 | 调用 `authFilterSql` 校验表权限 | P0 |
| `data-work` SparkSQL/FlinkSQL 执行前 | 调用 `authFilterSql` 校验表权限 | P0 |
| 元数据 SQL 执行前 | 调用 `authFilterSql` 校验表权限 | P0 |
| 指标字典列表 | 后端查询后过滤掉无 VIEW 权限的指标 | P1 |
| 看板查看 | 加载看板时校验各图表指标的 USE 权限 | P1 |

**关于 `authFilterSql` 的当前能力：**
- 当前实现只是"表级校验"，不会改写 SQL
- 产品预期：先做到"无表权限则拒绝执行"，行级/列级过滤放到阶段二
- 因此接入方式是：执行前调用 `authFilterSql`，如果 `permitted=false` 则拒绝执行并提示

### 3.4 元数据平台打通

**当前状态：** 完全无权限控制。

**打通方案：**

| 资源 | 权限控制点 | 实现方式 |
|------|-----------|---------|
| 数据源列表 | `DsConfigApi` 列表查询 | 后端接入 `dataauth`，只返回有 VIEW 权限的数据源 |
| 数据库列表 | `DSApi` 数据库查询 | 后端接入 `dataauth`，按数据源权限过滤 |
| 表结构查看 | `DSApi` 表结构查询 | 后端接入 `dataauth`，校验 TABLE 的 VIEW 权限 |
| 元数据表列表 | `MetadataTableAPI` | 后端接入 `dataauth`，校验 TABLE 的 VIEW 权限 |
| 元数据表详情/数据预览 | `MetadataTableAPI` | 后端接入 `dataauth`，校验 TABLE 的 VIEW 权限 |
| SQL 执行 | `DsConfigServiceImpl.executeSql()` | 执行前调用 `authFilterSql` 校验 |

**前端配合：**
- `PermissionGuard` 包裹元数据平台路由
- 编辑/删除按钮使用 `PermissionButton` 组件（已封装但未使用）
- 无权限的数据源/数据库/表不展示或置灰

### 3.5 安全降级策略修复

**当前问题：** 多处"接口异常返回全量/放行"。

**修复清单：**

| 位置 | 当前行为 | 修复后行为 |
|------|---------|-----------|
| `PermissionGuard` 接口异常 | `setChecked(true)` 放行 | `setChecked(false)` 拒绝，导向 `/403` |
| `listDimensions` dataauth 异常 | 返回全量维度 | 返回空数组 |
| `authMetricCheck` 异常 | 返回 `allPermitted: true` | 返回 `allPermitted: false` |
| `getMyPermissions` 异常 | 页面报错 | 展示空状态 |

---

## 4. 新增/改造页面清单

### 4.1 前端页面改造

| 页面 | 改造内容 | 优先级 |
|------|---------|--------|
| `/auth/my` | 新增"申请新权限"Drawer 表单 | P0 |
| `/auth/approval` | 新增"我发起的"Tab；修复 passport 硬编码 | P0 |
| `/auth/role` | 修复功能权限保存；修复 data/metric 权限编辑丢失 | P0 |
| `/auth/metric` | 修复主题域权限硬编码；展示已有权限配置 | P0 |
| `/auth/user` | 用户姓名二次查询回填；分页修复 | P1 |
| `sql-editor` | SQL 执行前调用 `authFilterSql` | P0 |
| `data-work` | SQL 执行前调用 `authFilterSql` | P0 |
| 元数据平台各页面 | 接入 `PermissionButton`，无权限按钮隐藏 | P1 |
| `router/index.tsx` | `PermissionGuard` 异常时拒绝；登出清除权限缓存 | P0 |

### 4.2 后端接口改造

| 接口 | 改造内容 | 优先级 |
|------|---------|--------|
| `POST /api/v1/auth/roles` | 接收 `functionPermissionKeys`，关联到 `auth_permission` | P0 |
| `PUT /api/v1/auth/roles/{id}` | 同上 | P0 |
| `POST /api/v1/approval/{id}/action` | approve 后根据审批内容自动创建权限项 | P0 |
| `GET /api/v1/auth/my/permissions` | 从 `auth_role_permission` + `auth_permission` 正确聚合功能权限 | P0 |
| `GET /api/v1/auth/users/permissions` | 对接员工服务获取真实姓名（或前端二次查询） | P1 |
| `GET /api/v1/auth/roles/{id}/members` | 对接员工服务获取真实姓名 | P1 |
| `POST /api/v1/auth/filter/sql` | 当前能力足够（表级校验），无需改造 | — |
| 新增 `GET /api/v1/auth/check/batch` | 批量权限校验（看板加载时批量校验各图表指标） | P1 |

---

## 5. 数据库变更

### 5.1 预录入功能权限树节点

```sql
-- 功能权限树节点预录入
INSERT INTO auth_permission (resource_type, resource_id, action, description) VALUES
('MENU', 'meta', 'VIEW', '元数据平台'),
('MENU', 'meta:business-ds', 'VIEW', '业务数据库'),
('MENU', 'meta:business-ds:datasource', 'VIEW', '数据源管理'),
('MENU', 'meta:business-ds:database', 'VIEW', '数据库管理'),
('MENU', 'meta:business-ds:table-schema', 'VIEW', '表结构管理'),
('MENU', 'meta:business-ds:sql', 'EXECUTE', 'SQL执行'),
('MENU', 'meta:metadata', 'VIEW', '元数据数据源'),
('MENU', 'meta:metadata:datasource', 'VIEW', '目录管理'),
('MENU', 'meta:metadata:subject', 'VIEW', 'Schema管理'),
('MENU', 'meta:metadata:metadata_table', 'VIEW', '表管理'),
('MENU', 'metrics', 'VIEW', '指标平台'),
('MENU', 'metrics:dashboard', 'VIEW', '指标概览'),
('MENU', 'metrics:definition', 'VIEW', '指标定义'),
('MENU', 'metrics:dictionary', 'VIEW', '指标字典'),
('MENU', 'metrics:analysis', 'USE', '指标分析'),
('MENU', 'metrics:config', 'VIEW', '指标配置'),
('MENU', 'metrics:dimension', 'VIEW', '维度管理'),
('MENU', 'sql-editor', 'USE', 'SQL查询'),
('MENU', 'data-work', 'USE', '数据加工'),
('MENU', 'bi', 'VIEW', '智能分析'),
('MENU', 'bi:chart', 'VIEW', '图表分析'),
('MENU', 'bi:dashboard', 'VIEW', '看板管理'),
('MENU', 'bi:dataset', 'VIEW', '数据集管理'),
('MENU', 'auth', 'VIEW', '权限管理'),
('MENU', 'auth:role', 'VIEW', '角色管理'),
('MENU', 'auth:user', 'VIEW', '用户权限'),
('MENU', 'auth:metric', 'VIEW', '指标平台权限'),
('MENU', 'auth:approval', 'VIEW', '审批管理'),
('MENU', 'auth:audit', 'VIEW', '审计日志');
```

### 5.2 审批单与权限变更关联（可选）

```sql
-- 审批单新增字段，记录审批通过后创建的权限项
ALTER TABLE auth_approval ADD COLUMN granted_permission_id BIGINT COMMENT '审批通过后创建的权限项ID';
ALTER TABLE auth_approval ADD COLUMN granted_role_id BIGINT COMMENT '审批通过后关联的角色ID';
```

---

## 6. 实施计划

### Round 1：审批流程闭环 + 安全修复（1 周）

| 任务 | 前后端 |
|------|--------|
| 申请权限表单 Drawer（前端） | FE |
| "我发起的审批"Tab（前端） | FE |
| 审批 passport 硬编码修复（前端） | FE |
| PermissionGuard 异常拒绝 + 登出清缓存（前端） | FE |
| 审批通过后自动授权逻辑（后端） | BE |
| 功能权限树节点预录入 Flyway 迁移（后端） | BE |

### Round 2：功能权限真正生效（1 周）

| 任务 | 前后端 |
|------|--------|
| 角色保存接收 functionPermissionKeys 并关联（后端） | BE |
| 我的权限功能权限正确聚合（后端） | BE |
| 角色管理页面功能权限保存修复（前端） | FE |
| 角色管理 data/metric 权限编辑回填修复（前端） | FE |
| 主题域权限配置修复（前端） | FE |

### Round 3：指标/元数据/SQL 执行打通（1 周）

| 任务 | 前后端 |
|------|--------|
| sql-editor 执行前调用 authFilterSql（前端） | FE |
| data-work 执行前调用 authFilterSql（前端） | FE |
| datagateway 接入 dataauth 校验（后端） | BE |
| 元数据平台列表查询接入权限过滤（后端） | BE |
| 指标字典列表接入权限过滤（后端） | BE |
| 各页面 PermissionButton 落地（前端） | FE |

### Round 4：体验优化（0.5 周）

| 任务 | 前后端 |
|------|--------|
| 用户权限列表/角色成员列表真实姓名展示 | FE + BE |
| 指标权限列表真实指标名称展示 | FE |
| 回归测试 + Bug 修复 | FE + BE |

---

## 7. 验收标准

- [ ] 用户能在"我的权限"页面点击"申请新权限"，填写表单并提交审批
- [ ] 审批人能在"待我审批"中看到申请单，并通过/驳回
- [ ] 审批通过后，申请人的权限列表中能立即看到新权限
- [ ] 角色管理页面配置的功能权限保存后真正生效，控制页面访问
- [ ] PermissionGuard 异常时拒绝访问（而非放行）
- [ ] sql-editor 执行无权限的 SQL 时被拒绝并提示
- [ ] 元数据平台无权限的数据源/表不展示或无法访问
- [ ] 指标平台无权限的指标在字典中不展示，BI 分析时无法使用
- [ ] 登出后重新登录，权限缓存不残留上一用户数据
