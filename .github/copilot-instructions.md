# GitHub Copilot Instructions for Michael Zhou QA Portfolio

## 语言偏好 (Language Preference)

**请优先使用中文回复所有问题、代码注释和文档。**

### 中文输出规范 (Chinese Output Standards)

1. **代码注释和文档** — 使用中文
   - 类、函数、变量的注释用中文
   - 测试用例的描述用中文
   - README、CLAUDE.md 等文档用中文

2. **技术术语保持英文** — 保持专业性
   - 库名称：`pytest`, `jest`, `k6`, `Grafana`
   - 技术概念：`AAA pattern`, `DRY`, `TDD`, `coverage`
   - API 名称：保持原样（如 `getByRole`, `fireEvent`）

3. **回复和解释** — 优先中文
   - 技术方案讲解用中文
   - 错误排查用中文
   - 学习内容用中文
   - 代码审查反馈用中文

### 双语并存原则 (Bilingual Coexistence)

- 核心代码逻辑保持现有风格（可中可英）
- 新增注释统一中文
- 代码变量名保持一致性（不混用）
- 必要时英中并注，例：
  ```python
  # 计算折扣 (calculate discount)
  def calc_discount():
      pass
  ```

---

## 项目上下文 (Project Context)

**Portfolio Type**: QA Testing & DevOps Automation (10 projects)

**Main Branch**: `main` (Default)

**Feature Branches**: See CLAUDE.md for active development branches

**Key Technologies**: 
- Testing: Pytest, Jest, Cypress, Playwright, Selenium, k6, JMeter
- DevOps: Kubernetes, Terraform, ArgoCD, Prometheus, Grafana

---

## 开发规范摘要 (Development Standards Summary)

### 流程 (Process)
- 遵循 5 阶段开发流程（需求 → 设计 → 开发 → 测试 → 收尾）
- 每阶段完成后需暂停等待评审
- TDD：先写测试，再实现代码

### 代码质量 (Code Quality)
- **覆盖率目标**: statements ≥ 80%, branches ≥ 70%
- **Linting**: ESLint (Node.js) / Black + Flake8 (Python)
- **Commit规范**: `feat:`, `fix:`, `docs:`, `test:` 开头，附加 Co-authored-by Copilot trailer

### Git规范 (Git Conventions)
- 每 commit 包含 Co-authored-by 信息：
  ```
  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
  ```

---

## M4-M6 学习计划相关 (M4-M6 Learning Curriculum)

**当前状态**: M4 (GitHub Copilot 测试代码生成) — ✅ 100% 完成

**M4 核心成果** (M4 Key Achievements):
- 3 种 Copilot 生成模式：Code-Driven, Documentation-Driven, Error-Driven
- 4 个框架特定模式：Pytest, Jest, Cypress, Playwright
- 覆盖的 4 个维度：Statement, Branch, Boundary, Exception
- 4 个常见陷阱及解决方案

**相关文件**:
- 学习文档：`docs/M4-LEARNING-COMPLETION.md`
- 实战代码：`performance-testing-platform/tests/unit/utils/csv-loader.test.js` (37 tests)

---

## 快速命令参考 (Quick Commands)

```bash
# 性能测试平台 (performance-testing-platform)
npm start              # 启动目标 API（集群模式，port 3000）
npm test              # 单元测试（95 tests）
npm run setup         # 一键初始化：安装 + lint + 测试
npm run k6:smoke      # k6 smoke test
npm run jmeter:smoke  # JMeter smoke test

# 项目根目录命令
cd michael-zhou-qa-portfolio
git status            # 查看当前分支和状态
git branch -a         # 查看所有分支
```

---

## 需要帮助时 (When You Need Help)

- **问题诊断**: 提供完整的错误日志和上下文
- **架构问题**: 参考 `docs/architecture/` 目录
- **Test 设计**: 查阅 `docs/M4-LEARNING-COMPLETION.md` 了解最佳实践
- **CI/CD**: 检查 `.github/workflows/` 中的工作流示例

---

**Last Updated**: 2026-04-15  
**Language Priority**: 中文优先 (Chinese First)
