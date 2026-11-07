# System Update 测试用例文档

## 文档概述

- **文档版本**: 1.0.0
- **最后更新**: 2026-02-17
- **作者**: QA Automation Team
- **项目**: Selenium Tests - IWSVA System Updates Module
- **测试框架**: Selenium WebDriver + Pytest + Allure

---

## 测试用例统计

| 指标 | 数值 |
|------|------|
| **总测试用例数** | 2 (已实现) |
| **自动化覆盖率** | 100% |
| **通过率** | 100% (最近执行) |
| **优先级分布** | P0: 1, Normal: 1 |
| **测试分类** | Multi-Level Verification: 1, Backend Verification: 1 |

---

## 测试用例分类

### Category 1: 多层级验证测试 (Multi-Level Verification)

展示企业级测试框架的验证能力，跨多个层级验证系统状态的一致性。

- **TC-VERIFY-001**: Multi-Level Kernel Version Verification ✅ (已实现)
- **TC-VERIFY-003**: Update Log Verification (计划中)

### Category 2: 后端验证测试 (Backend Verification)

通过 SSH 后端验证系统状态，不涉及 UI 交互。

- **TC-VERIFY-002**: System Information Backend Verification ✅ (已实现)

### Category 3: 系统更新测试 (未来扩展)

参考 Cypress 项目的 77 个测试用例，计划扩展以下测试：

- **Normal Update Tests** (9个) - 每个组件一个
- **Forced Update Tests** (9个)
- **Rollback Tests** (8个) - TMUFEENG 除外
- **Update All Tests** (5个)
- **Error Handling Tests** (13个)
- **UI Interaction Tests** (15个)
- **Schedule Tests** (6个)
- **Proxy Tests** (3个)
- **其他测试** (9个)

**参考**: 可参照 Cypress 项目 `cypress-tests/docs/test-cases/UPDATE_TEST_CASES.md` 扩展完整测试套件。

---

## 已实现测试用例

### TC-VERIFY-001: Multi-Level Kernel Version Verification

**测试用例 ID**: TC-VERIFY-001
**标题**: 多层级 Kernel 版本验证
**优先级**: P0 (Critical)
**分类**: Multi-Level Verification
**类型**: Functional Test
**自动化状态**: ✅ 已实现
**测试文件**: `src/tests/ui_tests/test_multi_level_verification_demo.py`
**测试方法**: `test_kernel_version_multi_level`
**Allure Epic**: Phase 2: Multi-Level Verification
**Allure Feature**: Verification Framework Demo
**Pytest Markers**: `@pytest.mark.smoke`, `@pytest.mark.P0`

#### 描述

验证 IWSVA System Updates 页面显示的 kernel 版本与后端实际 kernel 版本的一致性。这是一个典型的多层级验证测试，展示了企业级测试框架的验证能力（UI + Backend + 交叉验证）。

本测试是 **ISSUE-004 修复的核心验证用例**，确保通过菜单导航到 System Updates 页面后，能够正确提取 kernel 版本信息，并与后端实际版本进行对比验证。

#### 前置条件

1. IWSVA 服务器运行正常并可访问 (`https://10.206.201.9:8443`)
2. SSH 连接配置正确（.env 文件中配置）
3. 用户具有管理员权限 (username: `admin`)
4. System Updates 页面可访问（通过菜单导航）
5. IWSVA 3-frame 架构完整（tophead, left, right）

#### 测试数据

```json
{
  "baseUrl": "https://10.206.201.9:8443",
  "username": "admin",
  "expectedKernelVersion": "5.14.0-427.24.1.el9_4.x86_64",
  "sshConfig": {
    "host": "10.206.201.9",
    "port": 22,
    "username": "root"
  },
  "timeout": 30
}
```

**数据来源**: `.env` 文件（gitignored，使用 `.env.example` 模板）

#### 测试步骤

| 步骤 | 操作 | 预期结果 | 实际执行时间 |
|------|------|----------|------------|
| 1 | 导航到 System Updates 页面（通过菜单：Administration → System Updates） | 页面成功加载，3-frame 结构保持完整，无 404 错误 | ~3s |
| 2 | 验证页面加载状态（frame-based 验证） | `system_update_page.verify_page_loaded()` 返回 True | ~1s |
| 3 | 从 UI 提取 kernel 版本 | 成功提取版本号（非空字符串，格式: x.x.x-x.elX_X.arch） | ~2s |
| 4 | 通过 SSH 执行 `uname -r` 获取后端版本 | 成功获取后端 kernel 版本，SSH 连接正常 | ~3s |
| 5 | 比较 UI 和 Backend 版本 | 两个版本完全匹配（字符串相等） | <1s |
| 6 | 与配置中的预期版本对比 | Backend 版本与预期版本匹配（软断言） | <1s |

**总执行时长**: ~14 秒

#### 验证点

##### UI 验证 (UI Level)

- [x] System Updates 页面成功加载
- [x] 页面内容包含 "Kernel" 关键字
- [x] Kernel 版本号成功提取
- [x] 版本号格式正确（x.x.x-x.elX_X.arch）
- [x] 页面无 404 错误
- [x] 3-frame 结构完整（tophead, left, right）

##### Backend 验证 (Backend Level)

- [x] SSH 连接成功建立
- [x] `uname -r` 命令执行成功
- [x] 返回非空版本字符串
- [x] 版本格式符合 Linux kernel 规范
- [x] SSH 认证成功（Paramiko transport）

##### 交叉验证 (Cross-Level Verification)

- [x] UI 版本 = Backend 版本（字符串完全匹配）
- [x] Backend 版本 = 预期版本（软断言，允许版本升级）

##### 日志验证 (Log Level) - 已禁用

- [ ] ~~日志文件路径问题需调查~~ (已知限制：`/var/log/iwss/update.log` 不存在)

#### 测试环境

- **操作系统**: Linux 5.14.0-611.16.1.el9_7.x86_64
- **Python 版本**: 3.9.25
- **Pytest 版本**: 7.4.3
- **Selenium 版本**: 4.x
- **浏览器**: Chrome 145.0.7632.76 (headless mode)
- **WebDriver Manager**: WDM (自动管理 ChromeDriver)
- **SSH 客户端**: Paramiko (OpenSSH_8.7)
- **IWSVA 服务器**: 10.206.201.9:8443

#### 执行历史

| 日期 | 结果 | 执行时长 | 通过率 | 备注 |
|------|------|---------|--------|------|
| 2026-02-17 18:23 | ✅ PASS | 14s | 100% | 所有验证通过，ISSUE-004 修复验证成功 |
| 2026-02-16 | ✅ PASS | 13s | 100% | ISSUE-004 修复后首次运行 |

#### 验证结果示例

**UI 层级验证结果**:
```
UI Kernel Version: 5.14.0-427.24.1.el9_4.x86_64
Status: ✅ PASS (非空且格式正确)
```

**Backend 层级验证结果**:
```
Backend Kernel Version: 5.14.0-427.24.1.el9_4.x86_64
SSH Connection: ✅ Connected (version 2.0, client OpenSSH_8.7)
Authentication: ✅ Successful
Status: ✅ PASS
```

**交叉验证结果**:
```
UI vs Backend: ✅ MATCH (5.14.0-427.24.1.el9_4.x86_64)
Backend vs Expected: ✅ MATCH (5.14.0-427.24.1.el9_4.x86_64)
Status: ✅ PASS (100% 一致性)
```

#### 相关测试用例

- **TC-VERIFY-002**: System Information Backend Verification (同一测试套件)
- **TC-VERIFY-003**: Update Log Verification (计划中)

#### 关联需求

- **REQ-VERIFY-001**: 系统信息准确性 - 系统显示的信息必须与后端实际状态一致
- **REQ-UI-001**: Frame 导航 - 必须通过菜单导航而非直接 URL 访问
- **REQ-BACKEND-001**: 后端访问能力 - 测试必须能通过 SSH 访问后端验证系统状态

#### 已知问题

**1. 日志文件路径问题** (独立 Issue，不影响本测试)

- **描述**: `/var/log/iwss/update.log` 文件不存在
- **影响**: Log 验证步骤已在测试中禁用
- **优先级**: Low
- **建议**: 作为新的 issue 单独跟踪，调查正确的日志文件路径

**2. TestLogger API 不完整** (代码质量改进)

- **描述**: 部分 TestLogger 方法不存在（已临时移除调用）
- **影响**: 代码可读性降低
- **建议**: 补充缺失的方法：`log_info()`, `log_warning()`, `log_test_result()`

#### ISSUE-004 修复验证

本测试是 **ISSUE-004 修复的核心验证用例**，验证了以下修复点：

| 修复前问题 | 修复后状态 | 验证方式 |
|-----------|-----------|---------|
| ❌ 404 错误（直接访问 URL） | ✅ 无错误（菜单导航） | 页面成功加载，无 404 |
| ❌ Frame 结构破坏 | ✅ Frame 结构完整 | 3-frame 验证通过 |
| ❌ 无法提取版本 | ✅ 版本提取成功 | Kernel 版本非空且格式正确 |
| ❌ 导航方式不一致 | ✅ 对齐 Cypress 实现 | 使用菜单导航方式 |

**修复方法**: 使用 `BasePage.navigate_to_system_updates()` 方法，通过菜单导航（Administration → System Updates）而非直接访问 `/jsp/system_update.jsp`。

#### 测试设计原理

本测试展示了以下测试设计模式和最佳实践：

**1. AAA 模式** (Arrange-Act-Assert)
- **Arrange**: 导航到页面，准备测试环境
- **Act**: 提取 UI 版本，获取 Backend 版本
- **Assert**: 验证版本一致性，断言结果

**2. 多层级验证模式**
- UI Level → Backend Level → Cross-Level → Expected Level
- 逐层验证，确保数据一致性

**3. Page Object Model (POM)**
- 使用 `system_update_page` fixture
- 封装页面交互，提高可维护性

**4. Fixture 依赖注入**
- `system_update_page`, `backend_verifier`, `ui_verifier`
- Pytest fixture 自动管理测试资源

**5. Allure 报告集成**
- `@allure.step()` 标记测试步骤
- `allure.attach()` 附加验证数据
- 生成详细的测试报告

#### 备注

- 这是框架能力展示用的 **Demo 测试**
- 使用 **Allure 报告**集成，生成可视化测试报告
- **多层级验证**是 Selenium 项目的核心设计理念
- 参考 **ISSUE-004** 修复文档：`ISSUE-004-FIX-COMPLETED.md`
- 必须使用**菜单导航**而非直接 URL，以保持 frame 结构完整性
- 测试执行速度快（~14s），适合作为**烟雾测试**（smoke test）

---

### TC-VERIFY-002: System Information Backend Verification

**测试用例 ID**: TC-VERIFY-002
**标题**: 系统信息后端综合验证
**优先级**: Normal
**分类**: Backend Verification
**类型**: Integration Test
**自动化状态**: ✅ 已实现
**测试文件**: `src/tests/ui_tests/test_multi_level_verification_demo.py`
**测试方法**: `test_system_information_backend`
**Allure Epic**: Phase 2: Multi-Level Verification
**Allure Feature**: Verification Framework Demo
**Pytest Markers**: `@pytest.mark.smoke`, `@pytest.mark.P0`

#### 描述

通过 SSH 后端验证 IWSVA 系统信息的完整性，包括 kernel 版本、操作系统版本、主机名、系统正常运行时间和 IWSS 服务状态。

本测试是**纯后端验证测试**，不涉及 UI 交互，专注于验证后端系统状态和 SSH 访问能力。

#### 前置条件

1. IWSVA 服务器运行正常 (`10.206.201.9`)
2. SSH 访问权限配置正确（root 用户）
3. IWSS 服务已安装
4. 网络连接正常，SSH 端口（22）可访问

#### 测试数据

```json
{
  "sshConfig": {
    "host": "10.206.201.9",
    "port": 22,
    "username": "root",
    "password": "configured_in_env"
  },
  "requiredFields": [
    "kernel_version",
    "os_version",
    "hostname",
    "uptime",
    "current_time"
  ]
}
```

**数据来源**: `.env` 文件（gitignored）

#### 测试步骤

| 步骤 | 操作 | 预期结果 | 实际执行时间 |
|------|------|----------|------------|
| 1 | 通过 SSH 建立连接 | SSH 连接成功，认证通过 | ~2s |
| 2 | 获取综合系统信息 (`backend_verifier.get_system_info()`) | 成功返回系统信息字典 | ~2s |
| 3 | 验证必填字段存在 | 所有 5 个必填字段都存在 | <1s |
| 4 | 验证字段值非空 | 所有字段值都非空且格式正确 | <1s |
| 5 | 检查 IWSS 服务状态 | 服务状态查询成功（软断言） | ~1s |

**总执行时长**: ~6 秒

#### 验证点

##### Backend 验证 (Backend Level)

- [x] SSH 连接成功
- [x] SSH 认证成功（Paramiko transport）
- [x] 系统信息字典包含 5 个必填字段
- [x] `kernel_version` 存在且非空
- [x] `os_version` 存在且非空
- [x] `hostname` 存在且非空
- [x] `uptime` 存在且非空
- [x] `current_time` 存在且非空
- [x] IWSS 服务状态查询成功

##### 数据完整性验证

- [x] 所有字段格式正确
- [x] 时间戳有效（`current_time` 是有效日期时间）
- [x] 版本号格式符合规范（`kernel_version`, `os_version`）
- [x] 主机名非空（`hostname`）
- [x] 系统运行时间合理（`uptime`）

#### 测试环境

与 TC-VERIFY-001 相同（参见上方）

#### 执行历史

| 日期 | 结果 | 执行时长 | 通过率 | 备注 |
|------|------|---------|--------|------|
| 2026-02-17 18:23 | ✅ PASS | 6s | 100% | 所有字段验证通过 |

#### 验证结果示例

**系统信息验证结果**:
```json
{
  "kernel_version": "5.14.0-427.24.1.el9_4.x86_64",
  "os_version": "Rocky Linux 9.4",
  "hostname": "iwsva.trend.com",
  "uptime": "up 5 days, 3:24",
  "current_time": "2026-02-17 18:23:15"
}
```

**字段验证状态**:
```
✅ kernel_version: Present and non-empty
✅ os_version: Present and non-empty
✅ hostname: Present and non-empty
✅ uptime: Present and non-empty
✅ current_time: Present and non-empty
✅ All required fields: PASS
```

**IWSS 服务状态**:
```
Service Status Query: ✅ SUCCESS
Service Running: ✅ (软断言，服务可能因维护停止)
```

#### 相关测试用例

- **TC-VERIFY-001**: Multi-Level Kernel Version Verification
- **TC-VERIFY-003**: Update Log Verification (计划中)

#### 关联需求

- **REQ-BACKEND-001**: 后端访问能力 - 系统信息必须可通过 SSH 访问
- **REQ-VERIFY-002**: 系统信息完整性 - 所有必需字段必须存在且有效

#### 已知问题

无已知问题。

#### 测试设计原理

本测试展示了以下测试设计模式：

**1. 纯后端验证**
- 无 UI 交互
- 专注于 SSH 系统命令验证
- 适合作为**健康检查**测试

**2. 数据完整性检查**
- 验证所有必需字段存在
- 验证字段值非空
- 验证数据格式正确

**3. 软断言模式**
- IWSS 服务状态使用软断言
- 允许服务因维护停止，不阻塞测试
- 记录警告但不失败

**4. Fixture 依赖注入**
- 使用 `backend_verifier` fixture
- 自动管理 SSH 连接生命周期

#### 备注

- 此测试**不涉及 UI 交互**
- **纯 SSH 后端验证**
- 展示 `backend_verifier` 的系统信息获取能力
- 适合作为**先决条件测试**（Prerequisite Test）
- 可用于验证测试环境是否准备就绪

---

## 计划中的测试用例（参考 Cypress）

### 未来扩展测试套件

基于 Cypress 项目的 **77 个测试用例**，Selenium 项目可以扩展以下测试：

#### Category 1: Normal Update Tests (9个)

- **TC-UPDATE-001**: PTN Normal Update
- **TC-UPDATE-002**: SPYWARE Normal Update
- **TC-UPDATE-003**: BOT Normal Update
- **TC-UPDATE-004**: ITP Normal Update
- **TC-UPDATE-005**: ITE Normal Update
- **TC-UPDATE-006**: ICRCAGENT Normal Update
- **TC-UPDATE-007**: ENG Normal Update
- **TC-UPDATE-008**: ATSEENG Normal Update
- **TC-UPDATE-009**: TMUFEENG Normal Update

**验证层级**: UI + Backend + Log + Business

#### Category 2: Forced Update Tests (9个)

- **TC-FORCED-001**: PTN Forced Update
- **TC-FORCED-002**: SPYWARE Forced Update
- ... (同上 9 个组件)

**验证层级**: UI + Backend + Log

#### Category 3: Rollback Tests (8个)

- **TC-ROLLBACK-001**: PTN Rollback
- **TC-ROLLBACK-002**: SPYWARE Rollback
- ... (TMUFEENG 除外，不支持回滚)

**验证层级**: UI + Backend + Log + Business

#### Category 4: Update All Tests (5个)

- **TC-UPDATEALL-001**: Update All Components
- **TC-UPDATEALL-002**: Update All with Proxy
- **TC-UPDATEALL-003**: Update All Patterns Only
- **TC-UPDATEALL-004**: Update All Engines Only
- **TC-UPDATEALL-005**: Update All with Schedule

**验证层级**: UI + Backend + Log

#### Category 5: Error Handling Tests (13个)

- **TC-ERROR-001**: Network Connection Lost
- **TC-ERROR-002**: Insufficient Disk Space
- **TC-ERROR-003**: Permission Denied
- **TC-ERROR-004**: Invalid Component ID
- **TC-ERROR-005**: Update Server Unreachable
- **TC-ERROR-006**: Corrupted Update Package
- **TC-ERROR-007**: Component Already Updating
- **TC-ERROR-008**: Component Locked
- **TC-ERROR-009**: Service Restart Failure
- **TC-ERROR-010**: Rollback Failure
- **TC-ERROR-011**: Update Timeout
- **TC-ERROR-012**: Version Mismatch
- **TC-ERROR-013**: Dependency Conflict

**验证层级**: UI + Backend + Log

#### Category 6: UI Interaction Tests (15个)

- **TC-UI-001**: Progress Bar Display
- **TC-UI-002**: Cancel Update
- **TC-UI-003**: Refresh Page During Update
- **TC-UI-004**: Multiple Component Selection
- **TC-UI-005**: Component Deselection
- **TC-UI-006**: Update Button State
- **TC-UI-007**: Version Display
- **TC-UI-008**: Status Display
- **TC-UI-009**: Error Message Display
- **TC-UI-010**: Success Message Display
- **TC-UI-011**: Update History Display
- **TC-UI-012**: Component Filter
- **TC-UI-013**: Search Functionality
- **TC-UI-014**: Sort Functionality
- **TC-UI-015**: Pagination

**验证层级**: UI

#### Category 7: Schedule Tests (6个)

- **TC-SCHEDULE-001**: Schedule Update Daily
- **TC-SCHEDULE-002**: Schedule Update Weekly
- **TC-SCHEDULE-003**: Schedule Update Monthly
- **TC-SCHEDULE-004**: Edit Scheduled Update
- **TC-SCHEDULE-005**: Delete Scheduled Update
- **TC-SCHEDULE-006**: Scheduled Update Execution

**验证层级**: UI + Backend + Log

#### Category 8: Proxy Tests (3个)

- **TC-PROXY-001**: Update with HTTP Proxy
- **TC-PROXY-002**: Update with HTTPS Proxy
- **TC-PROXY-003**: Update with Proxy Authentication

**验证层级**: UI + Backend + Log

#### Category 9: Performance Tests (3个)

- **TC-PERF-001**: Update Performance Baseline
- **TC-PERF-002**: Concurrent Update Performance
- **TC-PERF-003**: Large Component Update Performance

**验证层级**: Performance

#### Category 10: Security Tests (3个)

- **TC-SEC-001**: CSRF Token Validation
- **TC-SEC-002**: Session Timeout During Update
- **TC-SEC-003**: Unauthorized Access

**验证层级**: Security

#### Category 11: Compatibility Tests (3个)

- **TC-COMPAT-001**: Browser Compatibility (Chrome)
- **TC-COMPAT-002**: Browser Compatibility (Firefox)
- **TC-COMPAT-003**: OS Compatibility

**验证层级**: UI

**每个测试用例将遵循相同的文档模板**（参见下方模板结构）。

---

## 测试用例模板

### 新测试用例文档模板

创建新测试用例时，请遵循以下模板结构：

```markdown
### TC-XXX-NNN: [Title]

**测试用例 ID**: TC-XXX-NNN
**标题**: [中文标题]
**优先级**: P0/P1/P2
**分类**: [Category]
**类型**: Functional/Integration/Negative/Performance/Security
**自动化状态**: ✅ 已实现 / ⏳ 计划中 / 🚧 进行中
**测试文件**: `src/modules/[module]/tests/test_xxx.py`
**测试方法**: `test_xxx_xxx`
**Allure Epic**: [Epic Name]
**Allure Feature**: [Feature Name]
**Pytest Markers**: `@pytest.mark.xxx`

#### 描述

[2-3 句话描述测试目的和验证内容]

#### 前置条件

1. 前置条件 1
2. 前置条件 2
3. ...

#### 测试数据

\```json
{
  "field1": "value1",
  "field2": "value2"
}
\```

**数据来源**: [数据来源说明]

#### 测试步骤

| 步骤 | 操作 | 预期结果 | 实际执行时间 |
|------|------|----------|------------|
| 1 | ... | ... | ... |
| 2 | ... | ... | ... |

**总执行时长**: ~XX 秒

#### 验证点

##### UI 验证 (UI Level)
- [ ] 验证点 1
- [ ] 验证点 2

##### Backend 验证 (Backend Level)
- [ ] 验证点 1
- [ ] 验证点 2

##### Log 验证 (Log Level)
- [ ] 验证点 1
- [ ] 验证点 2

##### Business 验证 (Business Level)
- [ ] 验证点 1
- [ ] 验证点 2

#### 测试环境

[环境信息或引用标准环境]

#### 执行历史

| 日期 | 结果 | 执行时长 | 通过率 | 备注 |
|------|------|---------|--------|------|
| YYYY-MM-DD | ✅/❌ | XXs | XX% | ... |

#### 验证结果示例

[展示典型的验证结果输出]

#### 相关测试用例

- **TC-XXX-XXX**: [描述]
- **TC-YYY-YYY**: [描述]

#### 关联需求

- **REQ-XXX-XXX**: [需求描述]

#### 已知问题

[任何已知问题或限制]

#### 测试设计原理

[解释测试设计模式和原理]

#### 备注

[额外备注和说明]
```

---

## 多层级验证策略

Selenium 测试项目的核心设计理念是**多层级验证**，确保系统状态在多个层级的一致性。

### Level 1: UI 验证 (UI Level)

验证用户界面显示的内容和交互行为。

**验证内容**:
- 页面元素可见性
- 文本内容正确性
- 用户交互响应
- 状态显示
- 错误消息

**示例**: 验证 System Updates 页面显示的 kernel 版本

### Level 2: Backend 验证 (Backend Level)

通过 SSH 后端验证系统实际状态。

**验证内容**:
- INI 配置文件
- 系统命令输出（`uname -r`, `systemctl status`, etc.）
- 组件文件存在性
- 服务运行状态
- 版本号

**示例**: 通过 `uname -r` 获取实际 kernel 版本

### Level 3: Log 验证 (Log Level)

验证系统日志记录的完整性和准确性。

**验证内容**:
- 操作日志记录
- 错误日志
- 时间戳
- 日志格式
- 日志完整性

**示例**: 验证更新日志是否记录版本变更（计划中）

### Level 4: Business 验证 (Business Level)

验证系统功能是否正常工作。

**验证内容**:
- 端到端流程
- 功能可用性
- 业务规则
- 性能指标

**示例**: 验证更新后扫描功能是否正常（计划中）

### 验证层级关系

```
┌─────────────────────────────────────────────┐
│  Business Level (Business Verification)    │  ← 最高层：功能验证
├─────────────────────────────────────────────┤
│  Log Level (Log Verification)              │  ← 日志验证
├─────────────────────────────────────────────┤
│  Backend Level (Backend Verification)      │  ← 后端状态验证
├─────────────────────────────────────────────┤
│  UI Level (UI Verification)                │  ← 基础层：UI 验证
└─────────────────────────────────────────────┘
```

**最佳实践**:
- 所有更新测试应至少覆盖 **3 个层级**（UI + Backend + Log）
- 关键功能测试应覆盖 **4 个层级**（UI + Backend + Log + Business）
- 纯后端验证测试可以只覆盖 **Backend 层级**

---

## 测试数据管理

### 数据来源

1. **配置文件** (`.env`)
   - 服务器地址、用户凭证
   - SSH 配置
   - 预期版本号

2. **组件注册表** (`ComponentRegistry.py` - 未来)
   - 组件元数据
   - 超时配置
   - 回滚支持标志

3. **测试数据字典** (`test-data-dictionary.md` - 待创建)
   - 数据字段定义
   - 数据类型和约束
   - 示例值

### 数据安全

- **敏感数据**: 不提交 `.env` 文件到 Git
- **模板文件**: 使用 `.env.example` 作为模板
- **密码管理**: 在 CI/CD 环境中使用加密的环境变量

---

## 测试执行指南

### 本地执行

```bash
# 运行所有测试
pytest src/tests/ui_tests/test_multi_level_verification_demo.py -v

# 运行特定测试
pytest src/tests/ui_tests/test_multi_level_verification_demo.py::TestMultiLevelVerification::test_kernel_version_multi_level -v

# 运行 P0 测试
pytest -m P0 -v

# 运行烟雾测试
pytest -m smoke -v

# 生成 Allure 报告
pytest --alluredir=reports/allure-results
allure serve reports/allure-results
```

### CI/CD 执行（未来）

```bash
# Jenkins / GitLab CI
pytest src/tests/ui_tests/ -v --html=reports/report.html --json-report --json-report-file=reports/report.json
```

---

## 质量指标

### 测试覆盖率

| 指标 | 当前值 | 目标值 |
|------|--------|--------|
| **自动化覆盖率** | 100% (2/2) | 100% |
| **代码覆盖率** | N/A | 80%+ |
| **需求覆盖率** | 50% (2/4) | 90%+ |

### 测试执行指标

| 指标 | 当前值 | 目标值 |
|------|--------|--------|
| **通过率** | 100% | 95%+ |
| **平均执行时间** | 10s/test | <30s/test |
| **Flaky Rate** | 0% | <5% |

---

## 维护和更新

### 文档更新规则

1. **新增测试用例**: 立即更新本文档和 `test-case-metadata.json`
2. **测试修改**: 更新相应测试用例的描述和验证点
3. **执行历史**: 每次测试执行后更新执行历史表
4. **已知问题**: 发现问题时立即记录

### 版本控制

| 版本 | 日期 | 更新内容 | 作者 |
|------|------|---------|------|
| 1.0.0 | 2026-02-17 | 初始版本，文档化 2 个已实现测试用例 | QA Team |

---

## 参考文档

### 内部文档

- **测试用例元数据**: `docs/test-cases/test-case-metadata.json` (待创建)
- **可追溯性矩阵**: `docs/test-cases/traceability-matrix.md` (待创建)
- **测试数据字典**: `docs/test-cases/test-data-dictionary.md` (待创建)
- **验证清单**: `docs/test-cases/verification-checklist.md` (待创建)
- **测试计划**: `docs/test-plans/Selenium-Test-Plan.md` (待创建)
- **测试策略**: `docs/test-plans/Test-Strategy.md` (待创建)
- **设计规范**: `docs/implementation/DESIGN_SPECIFICATION.md`
- **Phase 2 实现**: `docs/implementation/PHASE_2_IMPLEMENTATION.md`
- **ISSUE-004 修复**: `ISSUE-004-FIX-COMPLETED.md`

### 外部参考

- **Cypress 测试用例**: `../../cypress-tests/docs/test-cases/UPDATE_TEST_CASES.md`
- **Pytest 文档**: https://docs.pytest.org/
- **Allure 文档**: https://docs.qameta.io/allure/
- **Selenium 文档**: https://www.selenium.dev/documentation/

---

## 联系方式

如有问题或建议，请联系 **QA Automation Team**。

---

**文档结束**
