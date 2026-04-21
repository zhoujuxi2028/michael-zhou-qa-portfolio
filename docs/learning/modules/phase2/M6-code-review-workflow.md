# M6: 代码审查加速工作流

## 概览

代码审查是确保代码质量、知识共享和风险把控的关键环节。Copilot CLI 可以加速审查流程：自动生成 PR 描述、生成代码审查建议、检查常见的代码问题、验证测试覆盖率。本模块教你如何用 Copilot CLI 打造高效的审查工作流，减少手工审查时间，提升审查质量。

---

## 核心概念 (理论 ~ 30-40%)

### 概念 1: Code Review 的角色定位

**Code Review 不仅仅是找 Bug**，现代 Code Review 的三个关键角色：

| 角色 | 目标 | 实施方式 | 自动化程度 |
|------|------|--------|----------|
| **质量检查（QA）** | 找到 Bug、安全漏洞、性能问题 | Linter、SAST 工具、Copilot 建议 | 80-90% 自动化 |
| **知识传递（Learning）** | 代码标准化、最佳实践分享 | Reviewer 评论、Copilot 教学性建议 | 50% 自动化 |
| **架构审查（Architecture）** | 验证设计决策、确保可维护性 | 手工审查、架构 review 会议 | 20% 自动化 |

**Copilot CLI 的强项**：自动化 QA 检查 + 生成教学性建议，减轻 Reviewer 的重复劳动。

### 概念 2: PR 描述的标准结构

一个清晰的 PR 描述可以：
- 快速让 Reviewer 理解变更意图
- 自动生成 Release Notes
- 便于事后追踪（Git Blame、Issue 关联）

**标准 PR 描述结构**：

```markdown
# 📝 Title
[简明的改动摘要，40-50 字]

## 🎯 目的（Why）
[为什么需要这个改动？关联的 Issue 或需求]
- Issue: #123
- Feature: 支持多语言
- Bug Fix: 修复...

## 📋 改动内容（What）
[具体改了什么]
- [ ] 新增 translate() 函数
- [ ] 更新 en.json 和 zh.json
- [ ] 添加 translation.test.js

## 🧪 测试方式（How to Test）
[Reviewer 如何验证改动]
- 在本地运行：npm test
- 手工测试步骤：1. 访问 /settings，2. 改变语言...
- 预期结果：显示中文界面

## ⚠️ 风险评估（Risk）
- Breaking Changes: 无
- 性能影响: 无
- 依赖更新: 无

## 📚 相关资源
- Design Doc: https://...
- API Spec: https://...
```

### 概念 3: Reviewer 的常见检查清单

Professional Reviewers 会自动检查这些项：

**代码质量**
- ✅ 变量命名清晰，遵循命名规范
- ✅ 函数长度 < 50 行
- ✅ 复杂度（Cyclomatic Complexity）< 10
- ✅ 无硬编码（magic numbers）

**测试覆盖**
- ✅ 新代码有对应的单元测试
- ✅ 关键路径有集成测试
- ✅ Edge cases 被覆盖
- ✅ 测试描述清晰

**安全性**
- ✅ 无 SQL 注入漏洞（参数化查询）
- ✅ 无敏感信息泄露（密码、密钥、令牌）
- ✅ 无 XSS 漏洞（输出转义）
- ✅ 无 CSRF 漏洞（Token 验证）

**可维护性**
- ✅ 注释解释 Why，不重复 What
- ✅ API 文档完整
- ✅ 向后兼容或明确的 Breaking Changes
- ✅ 没有遗留的调试代码或 TODO

**性能**
- ✅ 没有引入 N+1 查询
- ✅ 没有新的内存泄漏
- ✅ 循环的时间复杂度 O(n) 以内

这份清单很长，Copilot CLI 可以自动检查 70-80% 的项。

### 概念 4: Git Workflow 的审查集成

现代 Git Workflow 中，Code Review 的位置：

```
Feature Branch
    ↓ (Push)
GitHub Pull Request
    ↓ (Open PR)
自动检查 (Lint、CI、SAST)
    ↓
Copilot 生成审查建议
    ↓
Reviewer 手工审查 + Copilot 建议结合
    ↓ (Approve)
Merge to Main
    ↓ (Release)
自动发布 + 生成 Release Notes
```

每个环节中，Copilot CLI 都可以参与：
1. **PR 创建前**：生成优质的 PR 描述
2. **CI 过程中**：补充静态分析的建议
3. **Review 过程中**：生成针对性的审查意见
4. **Release 前**：生成变更日志

---

## 实战应用 (70% 以上)

### 场景 1: 从代码变更自动生成 PR 描述

**问题描述**

你完成了一个功能，提交了代码改动，现在需要创建 PR 但描述太冗长或不够清晰。需要快速生成规范的 PR 描述。

```bash
# 步骤 1: 查看你的 Git Diff
git diff main..HEAD

# 输出示例：
# - 新增 translate() 函数
# - 更新 i18n 配置
# - 添加 20+ 行测试代码
# ...（很多细节）
```

**Copilot CLI 解决方案**

```bash
# 步骤 1: 让 Copilot 分析你的改动并生成 PR 描述框架
gh copilot suggest "根据以下代码改动生成一个清晰的 GitHub PR 描述：\
改动摘要：新增多语言支持、添加国际化（i18n）配置、更新路由组件以支持中英文切换\
具体改动：\
- 新增 src/utils/translate.js（150 行）\
- 新增 src/locales/en.json 和 zh.json\
- 修改 src/components/Header.jsx（添加语言选择器）\
- 新增 tests/translate.test.js（25 个单元测试）\
\
PR 描述需要包括：\
1. 简明标题（40-50 字）\
2. 目的部分（为什么）\
3. 改动内容（清晰的列表）\
4. 测试方式\
5. 风险评估\
使用 Markdown 格式，符合 GitHub PR 标准"

# 步骤 2: 复制生成的描述到 GitHub PR
```

**预期生成的 PR 描述**

```markdown
# ✨ Add Multi-language Support with i18n Integration

## 🎯 Purpose
Implements internationalization (i18n) support to enable the application to serve users in multiple languages. This addresses #156 and is part of the Q2 global expansion initiative.

- Issue: #156 (Add Chinese language support)
- Feature: Multi-language support infrastructure
- Release: v2.5.0

## 📋 Changes
- **New**: `src/utils/translate.js` — Core translation engine with dynamic locale switching
  - `translate(key, locale)` function for string translation
  - Locale detection from browser and user preferences
  - Fallback mechanism (missing translation → English)
  
- **New**: Locale files
  - `src/locales/en.json` — English translations (450+ keys)
  - `src/locales/zh.json` — Simplified Chinese translations (450+ keys)
  
- **Modified**: `src/components/Header.jsx`
  - Added language selector dropdown
  - Stores user preference in localStorage
  - Triggers page re-render on language change
  
- **New**: `tests/translate.test.js` — Comprehensive test coverage
  - 25 unit tests covering normal cases, edge cases, and error handling
  - Tests for missing keys, invalid locales, fallback behavior

## 🧪 Testing Instructions
1. **Local testing**:
   ```bash
   npm test  # All tests pass (25/25)
   npm run dev  # Start dev server
   ```

2. **Manual testing**:
   - Open http://localhost:3000 in your browser
   - Click language selector in top-right corner
   - Verify UI switches from English to Chinese
   - Refresh page and confirm language persists
   - Test with missing translation key (should fallback to English)

3. **Cross-browser validation**:
   - Chrome (latest)
   - Firefox (latest)
   - Safari (on macOS)

## ⚠️ Risk Assessment
- **Breaking Changes**: None. Existing features work in English by default.
- **Performance Impact**: Minimal. Translation lookup is O(1) dictionary access.
- **Database Changes**: None.
- **Dependency Updates**: No new dependencies added.
- **Backwards Compatibility**: ✅ Fully backward compatible.

## 📚 Related Resources
- [i18n Design Doc](https://docs.example.com/i18n-design)
- [Locale Keys Reference](./docs/LOCALES.md)
- [Release Notes Template](./RELEASE.md)

## ✅ Checklist
- [x] Code follows style guide
- [x] All tests pass
- [x] Documentation updated
- [x] No breaking changes
- [x] Performance impact validated

---
*Generated by Copilot CLI | Manual review recommended*
```

**关键学习点**

1. **标题要精准**：告诉 Reviewer 这个 PR 的核心意图，避免模糊
2. **改动列表要有层级**：新增、修改、删除要清楚区分
3. **测试方式要可复现**：Reviewer 能按步骤验证改动
4. **风险评估很重要**：明确说明是否有破坏性更改、性能影响

### 场景 2: 为 Pull Request 生成审查建议

**问题描述**

一个新 PR 已打开，你是 Reviewer。代码有 150+ 行改动，手工逐行检查耗时。需要用 Copilot CLI 快速生成审查建议，指出可能的问题。

```bash
# 步骤 1: 获取 PR 的 diff
gh pr diff 42  # PR #42 的完整 diff

# 步骤 2: 保存 diff 到临时文件
gh pr diff 42 > /tmp/pr42.diff

# 步骤 3: 让 Copilot 分析并生成审查建议
gh copilot explain "审查这个 PR 的代码改动，生成详细的审查意见：\
[粘贴 PR diff 内容]\
\
请检查以下方面并给出建议：\
1. 代码质量：变量命名、函数长度、复杂度\
2. 测试覆盖：新增代码是否有对应测试\
3. 安全性：是否有注入漏洞、敏感信息泄露\
4. 性能：是否有 N+1 查询、内存泄漏风险\
5. 可维护性：注释、API 文档、向后兼容性\
\
对于每个问题，给出：\
- 问题描述\
- 代码行号\
- 修复建议"
```

**预期生成的审查意见**

```markdown
# Code Review Feedback for PR #42: "Add User Search Filter"

## ✅ Positive Aspects
- Tests are comprehensive (18 new test cases)
- No security vulnerabilities detected
- Backward compatibility maintained

## ⚠️ Issues Found

### 1. [MUST FIX] SQL Injection Vulnerability - Line 45
**Severity**: Critical

**Issue**:
```javascript
// 危险：用户输入直接拼接到 SQL
const query = `SELECT * FROM users WHERE name LIKE '%${searchTerm}%'`;
```

**Recommended Fix**:
```javascript
// 安全：使用参数化查询
const query = 'SELECT * FROM users WHERE name LIKE ?';
db.query(query, [`%${searchTerm}%`]);
```

---

### 2. [SHOULD FIX] Missing Test for Edge Case - Line 52
**Severity**: Medium

**Issue**:
The `formatUserName()` function handles special characters but the test doesn't cover:
- Input: `"<script>alert('xss')</script>"` (XSS attempt)
- Input: `"O'Brien"` (apostrophe, common in names)

**Suggested Test**:
```javascript
test('should escape special characters in user name', () => {
  expect(formatUserName("<script>alert('xss')</script>"))
    .toBe("&lt;script&gt;alert('xss')&lt;/script&gt;");
});
```

---

### 3. [SHOULD FIX] N+1 Query Problem - Line 78
**Severity**: Medium (Performance)

**Issue**:
```javascript
const users = db.query('SELECT * FROM users WHERE active = 1');
// Loop creates N additional queries
users.forEach(user => {
  const profile = db.query(`SELECT * FROM profiles WHERE user_id = ${user.id}`);
});
```

**Recommended Fix** (Eager Loading):
```javascript
const users = db.query(`
  SELECT u.*, p.* FROM users u
  LEFT JOIN profiles p ON u.id = p.user_id
  WHERE u.active = 1
`);
```

**Performance Impact**: 100+ queries → 1 query for 100 users

---

### 4. [STYLE] Long Function Length - Line 120-180
**Severity**: Minor (Maintainability)

**Issue**: `searchAndFilter()` is 61 lines long. Consider breaking into smaller functions:
- `buildSearchQuery()`
- `applyFilters()`
- `sortResults()`

**Current Code Quality**: 7/10 (good, but room for improvement)

---

## 📊 Summary
| Category | Status | Details |
|----------|--------|---------|
| Security | ❌ 1 Critical Issue | SQL injection at line 45 |
| Tests | ✅ Good Coverage | 18 new tests, missing 2 edge cases |
| Performance | ⚠️ N+1 Query | Line 78 needs eager loading |
| Code Quality | ✅ Good | Minor refactor for readability |
| Documentation | ✅ Good | Docstrings are clear |

## ✅ Approval Conditions
- [x] Security issues fixed (1 critical)
- [ ] Edge case tests added (2 cases)
- [ ] Performance optimized (N+1 query)
- [x] Backward compatible
- [x] Tests passing

**Approval Status**: **Request Changes** (可以改进但不阻塞，取决于团队标准)

---
*Generated by Copilot CLI - Manual review by [Human Reviewer] still required*
```

**关键学习点**

1. **分级很重要**：Critical（必须修）vs Should Fix（建议修）vs Style（可选）
2. **具体举例**：不要笼统说"代码复杂"，要指出具体行号和修复建议
3. **性能分析**：指出具体的性能问题（N+1 查询）和改进方案

### 场景 3: 从失败测试自动生成修复建议和回归测试

**问题描述**

CI 测试失败了，错误信息堆栈很长。需要快速理解失败原因并生成修复方案 + 回归测试。

```bash
# 步骤 1: 获取失败的测试输出
npm test 2>&1 | tee /tmp/test_failure.log

# 输出示例：
# ❌ FAIL src/components/UserProfile.test.js
# ●  UserProfile › should display user name
# 
# expect(received).toBe(expected)
# expected: "John Doe"
# received: "John"
# at src/components/UserProfile.test.js:45:10
```

**Copilot CLI 解决方案**

```bash
# 步骤 1: 让 Copilot 分析失败并生成修复建议
gh copilot suggest "这个测试失败了，帮我诊断和修复：\
\
失败信息：\
●  UserProfile › should display user name\
expect(received).toBe(expected)\
expected: 'John Doe'\
received: 'John'\
at src/components/UserProfile.test.js:45:10\
\
相关代码：\
[粘贴 UserProfile.jsx 和 test 文件]\
\
请提供：\
1. 失败原因分析\
2. 修复方案（代码片段）\
3. 回归测试代码（确保同样问题不会再发生）"
```

**预期生成的修复和回归测试**

```javascript
// UserProfile.jsx - 修复前
export const UserProfile = ({ user }) => {
  return <div>{user.firstName}</div>;  // ❌ 只显示名，没有显示姓
};

// UserProfile.jsx - 修复后
export const UserProfile = ({ user }) => {
  return <div>{`${user.firstName} ${user.lastName}`}</div>;  // ✅ 显示全名
};

// UserProfile.test.js - 修复前
test('should display user name', () => {
  const user = { firstName: 'John' };  // ❌ 缺少 lastName
  render(<UserProfile user={user} />);
  expect(screen.getByText('John Doe')).toBeInTheDocument();
});

// UserProfile.test.js - 修复后 + 回归测试
test('should display user full name', () => {
  const user = { firstName: 'John', lastName: 'Doe' };
  render(<UserProfile user={user} />);
  expect(screen.getByText('John Doe')).toBeInTheDocument();
});

// 新增：回归测试，确保不会再犯
test('should handle missing lastName gracefully', () => {
  const user = { firstName: 'John', lastName: undefined };
  render(<UserProfile user={user} />);
  // 期望显示 "John undefined" 或处理为空字符串
  const text = screen.getByText(/^John/);
  expect(text).toBeInTheDocument();
});

test('should handle empty names', () => {
  const user = { firstName: '', lastName: '' };
  render(<UserProfile user={user} />);
  // 期望显示 " "（空格）或什么都不显示
  expect(screen.queryByText(/\S/)).toBeInTheDocument(); // 至少有非空字符
});

test('should handle special characters in names', () => {
  const user = { firstName: "O'Brien", lastName: "Murphy-Smith" };
  render(<UserProfile user={user} />);
  expect(screen.getByText("O'Brien Murphy-Smith")).toBeInTheDocument();
});
```

**关键学习点**

1. **回归测试很重要**：修复一个 Bug 时，要补充测试确保不会重复
2. **Edge cases 不要遗漏**：考虑 undefined、empty string、special characters
3. **测试的目的不只是验证正常情况**，也要验证边界

---

## 最佳实践速查表

| 场景 | Prompt 框架 | 关键内容 |
|------|-----------|---------|
| 生成 PR 描述 | "根据改动内容生成 PR 描述，包括目的、改动、测试方式、风险评估" | 指定标准结构 |
| 审查建议 | "审查这个 PR：[diff]，检查代码质量、安全性、性能、测试覆盖" | 给出具体的代码行号 |
| 修复建议 | "这个测试失败了：[错误]，给出修复和回归测试代码" | 包括失败信息和相关代码 |
| Git Commit 信息 | "根据改动生成规范的 git commit 信息，使用 Conventional Commits 格式" | 遵循 feat:、fix:、docs: 等 |

---

## 常见错误与调试

| 错误 | 症状 | 原因 | 解决方案 |
|------|------|------|---------|
| **审查意见重复** | 多个 Review Comments 说同样的问题 | Copilot 和 Linter 的检查重复 | 优先使用 Linter，Copilot 补充复杂分析 |
| **假设的 Bug 实际不是 Bug** | Reviewer 反馈 "这不是问题" | Copilot 对上下文理解不足 | 提供更多上下文（业务逻辑、前置条件） |
| **修复建议引入新 Bug** | 按照建议修改后，其他测试失败 | 建议不完整或遗漏依赖 | 修复后本地运行完整测试套件 |
| **PR 描述太冗长** | PR 描述 500+ 字，难以快速理解 | Prompt 中包含过多细节 | 在 PR 描述中链接到设计文档，而不是全部复述 |
| **安全建议误报** | 被标记为 SQL 注入，实际安全 | 未理解参数化框架的自动转义 | 明确说明使用的 ORM 或数据库库 |

---

## 与其他模块的关系

- **← M4 前置**：审查测试代码的覆盖率和质量
- **← M5 前置**：审查文档的准确性和完整性
- **← M3 前置**：CLI 命令的基础用法
- **→ Phase 3**：更复杂的代码架构审查

---

## Review Workflow 集成示例

```bash
# 完整的 PR 到 Merge 工作流

# 1️⃣ 创建 Feature Branch 并完成开发
git checkout -b feature/add-search

# 2️⃣ 提交代码
git commit -m "feat: add user search with filters"

# 3️⃣ 在创建 PR 前，用 Copilot 生成 PR 描述
gh copilot suggest "我的改动是：[...]，帮我生成 GitHub PR 描述"

# 4️⃣ 创建 PR，粘贴生成的描述
gh pr create --title "feat: Add user search" --body "[粘贴生成的描述]"

# 5️⃣ CI 自动运行，同时让 Copilot 生成审查建议
# (可选) 在 PR 中评论：@copilot review
# 或本地运行：gh pr diff | copilot explain

# 6️⃣ Reviewer 阅读 Copilot 建议 + 手工审查，给出意见

# 7️⃣ 如果 Reviewer 指出问题，Copilot 帮助生成修复
gh copilot suggest "Reviewer 说：[反馈]，帮我生成修复代码"

# 8️⃣ 修复后，push 新 commit
git commit -m "fix: address review feedback"
git push origin feature/add-search

# 9️⃣ Reviewer 再次确认，批准
gh pr review --approve

# 🔟 Merge 到 main
gh pr merge --squash
```

---

---

## GitHub Actions 集成

本项目使用 `anthropics/claude-code-action` 将 Claude Code Review **自动化集成到 CI/CD 流水线**中。

### 工作流位置

`.github/workflows/claude-code-review.yml`

### 触发时机

| 事件 | 是否触发 | 说明 |
|------|---------|------|
| PR 打开（`opened`） | ✅ | 首次创建 PR 时审查 |
| 新 push（`synchronize`） | ✅ | 新提交推送时重新审查 |
| Draft → Ready（`ready_for_review`） | ✅ | 草稿转正式时审查 |
| Draft PR | ❌ 跳过 | 未完成的工作无需审查 |
| Dependabot PR | ❌ 跳过 | 自动依赖更新无需 AI 审查 |
| 纯文档改动 | ❌ 跳过 | `.md` 文件变更不触发 |

### 性能优化（2026-04-21 更新）

每次 Claude 审查约需 **3-4 分钟**（受 AI API 推理时间限制）。通过以下方式减少不必要运行：

- **并发控制** (`concurrency`)：同一 PR 有新 push 时，取消前一次未完成的运行
- **路径过滤** (`paths`)：只对代码文件（.js/.ts/.py/.yml/.json）触发
- **条件过滤** (`if`)：跳过 Draft PR 和 bot PR

详见：[claude-code-review-optimization.md](../../../guides/claude-code-review-optimization.md)

---

**下一步**：[Phase 3 - 高阶提示工程](../phase3/M7-context-management.md)

*最后更新：2026-04-21 | 状态：完整* | 预计学习时间：90 分钟 | 代码示例：可复制
