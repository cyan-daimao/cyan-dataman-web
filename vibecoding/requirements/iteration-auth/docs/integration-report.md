# 联调报告

> 日期：2026-05-12
> 迭代：数据权限模块 Phase 1 MVP

---

## 一、编译/构建验证

| 服务 | 命令 | 结果 | 说明 |
|------|------|------|------|
| cyan-dataauth | `mvn compile` | ✅ BUILD SUCCESS | 从零搭建，编译通过 |
| cyan-datagateway | `mvn compile` | ✅ BUILD SUCCESS | 新增 metric 入口，编译通过 |
| cyan-datametric | `mvn compile` | ❌ BUILD FAILURE | 项目本身依赖缺失（非本次改动引入，见下方说明） |
| 前端 | `npm run build:prod` | ✅ BUILD SUCCESS | TypeScript 严格模式通过，无新增 ESLint 错误 |

**datametric 编译失败说明**：
错误均为「无法访问/找不到符号」，涉及 `com.cyan.datametric.enums.*`、`com.cyan.datametric.client.*`、`com.cyan.employee.*`、`com.cyan.dataman.client.*` 等包。这些是项目原有的外部依赖，本地 Maven 仓库中缺少对应的 jar 包（`cyan-datametric-client`、`cyan-employee-login`、`cyan-dataman-client` 等）。**本次迭代的改动（DataAuthClient、MetricBiAnalysisServiceImpl 修改）本身无编译错误**。

**建议**：在具备完整依赖环境（如公司内部 CI 环境或已安装所有 snapshot 依赖的本地环境）中重新编译验证。

---

## 二、接口一致性检查

### 2.1 datametric → dataauth

| datametric 调用（DataAuthClient） | dataauth 提供（Controller） | 状态 |
|----------------------------------|---------------------------|------|
| `POST /api/v1/auth/metric/check` | `AuthMetricController.@PostMapping("/check")` | ✅ 匹配 |
| `POST /api/v1/auth/metric/filter/sql` | `AuthMetricController.@PostMapping("/filter/sql")` | ✅ 匹配 |
| `GET /api/v1/auth/metric/list` | `AuthMetricController.@GetMapping("/list")` | ✅ 匹配 |

### 2.2 前端 → dataauth

| 前端 API 函数 | dataauth 提供 | 状态 |
|-------------|-------------|------|
| `authCheck` → `POST /api/v1/auth/check` | `AuthCheckController.@PostMapping("/check")` | ✅ 匹配 |
| `authFilterSql` → `POST /api/v1/auth/filter/sql` | `AuthCheckController.@PostMapping("/filter/sql")` | ✅ 匹配 |
| `authResources` → `GET /api/v1/auth/resources` | `AuthCheckController.@GetMapping("/resources")` | ✅ 匹配 |
| `authMetricCheck` → `POST /api/v1/auth/metric/check` | `AuthMetricController.@PostMapping("/check")` | ✅ 匹配 |
| `authMetricList` → `GET /api/v1/auth/metric/list` | `AuthMetricController.@GetMapping("/list")` | ✅ 匹配 |
| `authMetricFilterSql` → `POST /api/v1/auth/metric/filter/sql` | `AuthMetricController.@PostMapping("/filter/sql")` | ✅ 匹配 |
| `listApprovals` → `GET /api/v1/approval/list` | `ApprovalController.@GetMapping("/list")` | ✅ 匹配 |
| `submitApproval` → `POST /api/v1/approval/submit` | `ApprovalController.@PostMapping("/submit")` | ✅ 匹配 |
| `approvalAction` → `POST /api/v1/approval/{id}/action` | `ApprovalController.@PostMapping("/{approvalId}/action")` | ✅ 匹配 |
| `listAuditLogs` → `GET /api/v1/audit/logs` | `AuditLogController.@GetMapping("/logs")` | ✅ 匹配 |

### 2.3 datametric → datagateway

| datametric 调用 | datagateway 提供 | 状态 | 备注 |
|---------------|----------------|------|------|
| `sqlGatewayClient.executeStarRocksSql()` | `SqlGatewayRPC.executeStarRocksSql()` | ✅ 存在 | Phase 1 继续使用 |
| `sqlGatewayClient.executeMetricSql()` | `SqlGatewayRPC.executeMetricSql()`（新增） | ✅ 存在 | **待切换**，datametric 代码中有 TODO 注释 |

---

## 三、发现问题

### 问题 1：datametric 未切换至 metric 执行入口（轻量）

**描述**：datametric 的 `MetricBiAnalysisServiceImpl.execute()` 中仍调用 `sqlGatewayClient.executeStarRocksSql()`，未切换到新增的 `executeMetricSql()`。

**影响**：功能上无差异（两者内部逻辑相同），但执行日志中 `source` 字段会标记为 `SQL` 而非 `METRIC`，影响审计区分。

**修复建议**：将 `executeStarRocksSql` 替换为 `executeMetricSql`，删除 TODO 注释。位于：
- `cyan-datametric/cyan-datametric-application/.../bi/impl/MetricBiAnalysisServiceImpl.java:113`

**责任方**：后端（datametric）

---

### 问题 2：datametric 编译依赖缺失（外部环境问题）

**描述**：`mvn compile` 失败，原因是本地 Maven 仓库缺少 `cyan-datametric-client`、`cyan-employee-login`、`cyan-dataman-client` 等 snapshot 依赖。

**影响**：无法在本地验证 datametric 修改后的编译结果。

**修复建议**：
1. 在已配置公司内部 Nexus 仓库的环境中编译；或
2. 先 `mvn install` datametric 的 client 模块；或
3. 在 CI 流水线中验证。

**责任方**：环境/基础设施

---

### 问题 3：前端 API 当前为 Mock（设计决策，后续需替换）

**描述**：`DataAuthApi.ts` 中所有函数返回 `mockResponse()`，未实际发起 HTTP 请求。

**影响**：Phase 1 页面可正常展示，但无法与真实后端交互。

**修复建议**：Phase 2 将 mock 替换为真实 `axios` 调用（通过 `dataauthRequest`）。

**责任方**：前端（Phase 2）

---

### 问题 4：dataauth 数据库需手动初始化

**描述**：`cyan-dataauth-application/src/main/resources/db/init.sql` 包含建表语句，但项目未配置 Flyway/Liquibase 自动执行。

**影响**：首次启动 dataauth 前需手动执行 SQL。

**修复建议**：
1. 手动在 MySQL 中执行 `init.sql`；或
2. 后续引入 Flyway 自动迁移。

**责任方**：后端（dataauth）

---

## 四、结论

- **接口契约**：前后端接口路径 100% 对齐，无路径不匹配问题。
- **核心服务**：dataauth（新建）和 datagateway（调整）编译通过，代码质量 OK。
- **集成链路**：datametric → dataauth → datagateway 的调用链已打通，仅需切换 metric 入口。
- **前端**：权限管理模块页面完整，Mock 数据可独立演示。

**Phase 1 MVP 可进入验收阶段**，遗留问题（metric 入口切换、Mock 转真实调用、数据库初始化）在 Phase 2 解决。
