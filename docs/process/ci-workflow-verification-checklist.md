# CI Workflow Verification Checklist

**Issue:** #73  
**Date:** 2026-04-14  
**Related:** Postmortem #14 (Issue #36 namespace failure under workflow_dispatch)

## 目标

建立 CI workflow 变更验证流程，确保所有 trigger 类型（push/PR/workflow_dispatch）都能正确执行。

## 背景

**Incident:** Issue #36  
K8S CI workflow 在 workflow_dispatch 触发下，namespace 不存在错误从未被暴露，因为该错误仅在此 trigger 下出现，push/PR 路径下被 skip。

**Root Cause:** workflow 变更后，开发者仅在 PR 中验证，未在 workflow_dispatch 和 push 场景下验证。

## 验证清单

### 1. Workflow 新增/修改时必做

**Timing:** 每个 workflow 文件 (.github/workflows/*.yml) 的变更都需要完整验证

**检查项:**

- [ ] **Trigger 配置正确**
  - [ ] `on.push.branches` 配置了正确的分支
  - [ ] `on.pull_request.branches` 配置了正确的分支
  - [ ] `on.workflow_dispatch` 参数正确（如有）
  - [ ] 避免多个 trigger 相互冲突

- [ ] **Path Filter 验证**
  - [ ] 如果设置了 `paths` 过滤，验证改动文件确实触发工作流
  - [ ] 如果改动了 trigger 条件，重新验证边界情况
  - Example: 修改了 `paths: ['src/**']` 后，提交 `README.md` 应该被 skip

- [ ] **权限配置**
  - [ ] `permissions` 字段是否正确（read/write）
  - [ ] 需要访问 GitHub token 的步骤是否有权限

### 2. 三种 Trigger 验证

**所有变更的 workflow 必须在这三种 trigger 下至少运行一次：**

#### A. 常规 PR 验证（Developer 常用）
```bash
git checkout -b feature/test-workflow
# 修改 workflow 文件
git push origin feature/test-workflow
# 在 PR 中验证结果（自动触发 on.pull_request）
```

**检查点:**
- [ ] PR 中工作流自动触发
- [ ] 所有 job 执行且状态正确
- [ ] 无环境初始化错误（如命名空间不存在）

#### B. Push to main 验证（Merge 后）
```bash
# Merge PR 后，监控工作流
# 或手动推送到 main
git push origin feature/test-workflow:main

# 在 GitHub Actions 中验证
# https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions
```

**检查点:**
- [ ] 工作流自动触发（不依赖 PR）
- [ ] Path filter 生效（如有）
- [ ] 所有 step 通过

#### C. Workflow_dispatch 验证（手动触发）
```
GitHub → Actions → [Workflow Name] → Run workflow
- 选择分支（通常 main）
- 填写参数（如有）
- 点击 "Run workflow"
```

**检查点:**
- [ ] 能否成功触发
- [ ] 所有参数正确传递
- [ ] 无环境假设错误（如命名空间必须存在）

### 3. 常见陷阱

| 陷阱 | 症状 | 检查方法 |
|------|------|----------|
| **Path filter 过度限制** | PR 中不触发 | 检查 `paths` 字段 |
| **环境特定假设** | workflow_dispatch 失败，push/PR 正常 | 检查 mkdir/初始化步骤 |
| **权限不足** | 创建 PR/发布 release 失败 | 检查 `permissions` 字段 |
| **分支名称硬编码** | Develop 分支上无法触发 | 使用 `${{ github.ref_name }}` |
| **缓存版本过旧** | 本地测试通过，CI 失败 | 清除 GitHub Actions 缓存 |
| **secrets 缺失** | 环境变量为空 | 检查 repo settings → Secrets |

### 4. 验证模板

**为每个 workflow 创建验证记录:**

```markdown
## Workflow: [name]
- **Date:** YYYY-MM-DD
- **Modifier:** @username
- **Change:** Brief description

### Verification Results
- [ ] PR Trigger: ✅ Pass / ⚠️ Failed / ❌ Not tested
- [ ] Push Trigger: ✅ Pass / ⚠️ Failed / ❌ Not tested  
- [ ] Dispatch Trigger: ✅ Pass / ⚠️ Failed / ❌ Not tested

### Issues Found
- Issue 1: [description]
- Issue 2: [description]

### Sign-off
- **Verified by:** @reviewer
- **Status:** ✅ Ready to merge / 🔴 Blocked
```

### 5. 快速验证脚本

**为避免遗漏，在 PR 描述中添加清单:**

```markdown
## Workflow Changes Checklist
- [ ] PR trigger verified (auto)
- [ ] Push trigger verified manually
- [ ] Workflow_dispatch tested (if applicable)
- [ ] Path filters tested
- [ ] No new environment assumptions
```

## Integration with Dev Process

**位置:** `docs/dev-process-checklist.md` — Phase 4 (Testing)

**新增项目:**

```markdown
### 4.6 CI Workflow Verification (if workflow modified)

**Scope:** All `.github/workflows/*.yml` changes

**Checklist:**
- [ ] PR trigger: 工作流自动在 PR 中运行
- [ ] Push trigger: 合并 PR 后在 main 上验证
- [ ] Dispatch trigger: 手动 Actions 页面验证（如需）
- [ ] Path filters: 确认边界情况（改动/未改动文件）
- [ ] No env assumptions: 检查 mkdir/initialize 步骤

**验证时间:** 5-10 min per workflow

**Reference:** [CI Workflow Verification Checklist](../process/ci-workflow-verification-checklist.md)
```

## 实施方案

### Step 1: 文档发布
- ✅ 创建本指南
- [ ] 添加到 dev-process-checklist.md

### Step 2: 应用于当前项目
- [ ] 审查所有现有 workflow（.github/workflows/）
- [ ] 为每个 workflow 创建验证记录
- [ ] 标记缺失验证的 workflow

### Step 3: PR 模板更新
在 `.github/pull_request_template.md` 中添加：

```markdown
## 如果修改了 CI workflow

- [ ] PR 中工作流正常运行
- [ ] Push to main 验证通过
- [ ] 如果有 workflow_dispatch，已手动测试
```

### Step 4: 定期审计
- **Quarterly:** 检查所有 workflow 上次验证日期
- **On Change:** 任何 workflow 修改都重新验证

## 监控指标

| 指标 | 目标 | 当前 |
|------|------|------|
| Workflow 覆盖率 | 100% | 100%（push / PR / workflow_dispatch 三触发均覆盖） |
| 平均验证时间 | < 10 min | ~6 min（基于 2026-Q2 实测，见 [git-push-benchmark](git-push-benchmark/)） |
| Incident 率（trigger 相关） | 0 | 1 (Issue #36) |

## 参考资源

- GitHub Actions Docs: https://docs.github.com/en/actions
- Workflow Syntax: https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions
- Postmortem #14: Issue #36 K8S namespace failure

---

**Status:** 📋 Ready for implementation  
**Assigned:** Dev team  
**Target:** Include in Phase 4 checklist before next release
