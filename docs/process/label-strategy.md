# GitHub Labels Strategy

**Last Updated**: 2026-04-21  
**Current Total Labels**: 31  
**New Labels Created**: 5 (bug/security, phase-6, test-gap, performance-testing, workaround)

---

## 1. Label Categories

### 1.1 缺陷分类 (Bug Category)
用于对缺陷进行分类，帮助快速定位问题所在。

| 标签 | 颜色 | 说明 | 示例 |
|------|------|------|------|
| `bug/security` | 🔴 FF0000 | 安全相关缺陷 | X-XSS-Protection header disabled (Issue #111) |
| `bug/performance` | 🟠 (待创建) | 性能/资源相关 | Memory leak, slow query |
| `bug/test` | 🔴 e99695 | 测试代码问题 | Flaky test, bad assertion |
| `bug/ci` | 🔴 d73a4a | CI/CD 流程问题 | Helm upgrade, GitHub Actions |
| `bug/code` | 🔴 b60205 | 业务代码缺陷 | Wrong calculation, logic error |

### 1.2 项目标签 (Project)
用于标识 Issue 属于哪个项目/代码库。

> **推荐使用 `proj:xxx` 格式**（统一命名空间，便于过滤）。旧格式标签保留兼容。
> 可通过 `.github/workflows/setup-labels.yml` (`workflow_dispatch`) 一键创建。

#### 1.2.1 新格式 `proj:xxx`（推荐）

| 标签 | 颜色 | 子项目 |
|------|------|--------|
| `proj:performance` | 🔵 0052cc | performance-testing-platform |
| `proj:playwright` | 🟣 7057ff | playwright-demo |
| `proj:api-testing` | 🔵 0075ca | api-testing-demo |
| `proj:selenium` | 🟠 f9a03f | selenium-demo |
| `proj:cypress-e2e` | 🟣 5319e7 | iwsva-cypress-e2e |
| `proj:security` | 🔴 d73a4a | security-testing-demo |
| `proj:k8s` | 🟢 006b75 | k8s-auto-testing-platform |
| `proj:sid-iam` | 🔵 1d76db | sid-iam-testing-platform |
| `proj:microservice` | 🟢 0e8a16 | microservice-testing-platform |
| `proj:cicd` | 🔵 c5def5 | cicd-demo |
| `proj:ai-testing` | 🟡 e4e669 | ai-testing-platform |

#### 1.2.2 旧格式（兼容保留）

| 标签 | 颜色 | 说明 |
|------|------|------|
| `performance-testing` | 🔵 0066ff | Performance Testing Platform (k6 + JMeter) |
| `sid-iam` | 🔵 1d76db | SID IAM Platform |
| `microservice` | 🟢 0e8a16 | Microservice Platform |
| `cypress-e2e` | 🟣 5319e7 | Cypress E2E |
| `k8s` | 🟢 006b75 | K8S Testing |
| `security` | 🟡 fbca04 | Security Testing Demo |
| `cicd` | 🔵 c5def5 | CICD Demo |
| `api-testing` | 🔵 bfdadc | API Testing Demo |
| `playwright` | 🟣 d9c5f9 | Playwright Demo |
| `selenium` | 🟠 f9d0c4 | Selenium Demo |

### 1.3 阶段标签 (Phase) - **NEW**
用于追踪 Issue 在哪个开发阶段被发现/关闭。

| 标签 | 颜色 | 说明 |
|------|------|------|
| `phase-1` | 🟠 FF6600 | Phase 1: Dual-Engine Performance Testing |
| `phase-2` | 🟠 FF6600 | Phase 2: System Metrics + Capacity |
| `phase-3` | 🟠 FF6600 | Phase 3: JWT Authentication |
| `phase-4` | 🟠 FF6600 | Phase 4: Soak Test + Observability |
| `phase-5` | 🟠 FF6600 | Phase 5: Infrastructure Upgrades |
| `phase-6` | 🟠 FF6600 | Phase 6: Testing Capability Enhancement |
| `phase-7` | 🟠 FF6600 | Phase 7: CI/CD + Observability |

### 1.4 测试相关 (Test) - **NEW**
用于标识与测试覆盖相关的 Issue。

| 标签 | 颜色 | 说明 | 示例 |
|------|------|------|------|
| `test-gap` | 🟡 FFCC00 | 测试覆盖缺口 | Issue #111: Security headers not validated |
| `test-coverage` | 🟡 (待创建) | 测试覆盖改进 | Add unit tests for X endpoint |

### 1.5 优先级 (Priority)
用于确定 Issue 的处理优先级。

| 标签 | 颜色 | 说明 |
|------|------|------|
| `P0` | 🔴 ff0000 | Critical - Blocks release |
| `P1` | 🟠 ff6600 | High - Should fix soon |
| `P2` | 🟡 ffcc00 | Medium - Nice to have |

### 1.6 其他标签 (Misc)
| 标签 | 用途 |
|------|------|
| `documentation` | 文档改进 |
| `enhancement` | 新功能请求 |
| `known-issue/external` | 上游/第三方问题 |
| `workaround` | 临时绕过方案，必须附 deadline（默认 5 天），超期升级 P1，详见 `docs/process/workaround-tracking.md` |
| `good first issue` | 适合新手的任务 |
| `help wanted` | 需要帮助 |
| `duplicate` | 重复 Issue |
| `invalid` | 无效 Issue |
| `wontfix` | 不修复 |

---

## 2. 标签使用规范

### 2.1 何时应用标签

**新 Issue 创建时：**
- ✅ 必须标记：项目标签 (1 个)
- ✅ 必须标记：缺陷分类 (1 个，如果是 bug)
- ✅ 应该标记：阶段标签 (1 个，如果关联阶段)
- ✅ 可选标记：优先级 (P0-P2，如果需要)
- ✅ 可选标记：测试标签 (test-gap, test-coverage)

**例子：**
```
Issue #111 (Helmet v8 XSS-Protection bug):
  bug/security        ← 缺陷分类
  performance-testing ← 项目标签
  phase-6             ← 发现阶段
  test-gap            ← 测试覆盖缺口
```

### 2.2 标签组合规则

| 场景 | 推荐标签组合 |
|------|-------------|
| 新功能请求 | enhancement + performance-testing |
| 文档改进 | documentation + performance-testing |
| 安全缺陷 | bug/security + performance-testing + phase-6 + test-gap |
| 性能缺陷 | bug/performance + performance-testing + P0/P1 |
| 测试相关 | test-gap + phase-N + bug/test |
| CI 问题 | bug/ci + phase-N |

### 2.3 标签搜索用法

**按项目查看 Issue：**
```bash
gh issue list --label performance-testing
```

**按缺陷类型查看：**
```bash
gh issue list --label bug/security
```

**按阶段查看：**
```bash
gh issue list --label phase-6
```

**按测试缺口查看：**
```bash
gh issue list --label test-gap
```

---

## 3. 缺陷 #111 标签应用

**Issue**: Helmet v8: X-XSS-Protection header disabled  
**标签**:
- `bug/security` — 安全相关缺陷
- `performance-testing` — 性能测试平台
- `phase-6` — Phase 6 Stage 4 发现
- `test-gap` — 测试覆盖缺口

**分析**:
```
为什么未被捕捉 (Test Gap Analysis):

Unit Tests:        ❌ Only test business logic
                      Not response headers

Integration Tests: ❌ Only test API flows
                      Not security headers

Manual:            ✅ curl verification
                      Found X-XSS-Protection: 0

Root Cause:        Test design gap
                   Infrastructure-level validation missing
```

---

## 4. 后续标签创建清单

### 待创建标签 (Future)
- [ ] `bug/performance` — 性能缺陷
- [ ] `test-coverage` — 测试覆盖改进
- [ ] `phase-2`, `phase-3`, `phase-4`, `phase-5`, `phase-7` — 其他阶段
- [x] ~~`workaround`~~ — ✅ 已创建 (2026-04-21, Issue #68)

### 可选增强标签 (Optional)
- [ ] `breaking-change` — 破坏性变更
- [ ] `security-audit` — 安全审计相关
- [ ] `regression` — 回归缺陷

---

## 5. 标签规范总结

| 维度 | 规范 |
|------|------|
| **颜色** | 按类型区分（红=安全/缺陷，黄=优先级/测试，蓝=项目） |
| **命名** | 使用 / 分层 (bug/security, phase-6) |
| **数量** | 每个 Issue 3-4 个标签为佳 |
| **审核** | Code review 时确保标签准确 |

---

## 6. 相关文档

- [CLAUDE.md](../../CLAUDE.md) — 项目规范
- [Issue #111](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/111) — Helmet v8 缺陷
- [Phase 6 Test Gap](../../performance-testing-platform/docs/qa/reports/execution/phase6-stage4-verification-report.md) — 测试缺口分析
