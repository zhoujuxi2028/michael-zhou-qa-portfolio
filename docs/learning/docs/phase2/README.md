# Phase 2: GitHub Copilot QA 工作流 - 支持文档

本目录包含 Phase 2（M4-M6）的支持文档和资源。

## 📚 Phase 2 概览

| 模块 | 主题 | 核心技能 | 学习时间 |
|------|------|--------|--------|
| **M4** | 测试代码生成 | Pytest/Jest/Cypress 快速生成、覆盖率优化 | 90 分钟 |
| **M5** | 文档生成工作流 | Docstring、API 文档、OpenAPI 生成 | 90 分钟 |
| **M6** | 代码审查加速 | PR 描述、审查建议、修复方案生成 | 90 分钟 |

**总时间**：270 分钟（4.5 小时）

## 🎯 Phase 2 学习路径

**推荐顺序**：M4 → M5 → M6

```
M3: CLI 生态（前置）
    ↓
M4: 测试生成 ← 从代码/文档快速生成测试用例
    ↓
M5: 文档生成 ← 为测试和代码补充 Docstring、API 文档
    ↓
M6: Code Review ← 用 Copilot 加速审查流程
    ↓
Phase 3: 高阶提示工程（M7-M9）
```

## 📋 学习前检查清单

- [ ] 完成 Phase 1 (M1-M3)
- [ ] GitHub CLI 和 Copilot CLI 已安装
- [ ] Python 或 Node.js 环境就绪
- [ ] 有可执行的项目代码（用于实践）

## 🔧 环境设置

### Python 依赖
```bash
python3 -m venv venv && source venv/bin/activate
pip install pytest pytest-cov black isort flake8
```

### Node.js 依赖
```bash
npm install --save-dev @testing-library/react jest eslint
```

### 验证 Copilot CLI
```bash
gh copilot --version && gh auth status
```

## 📖 三个模块快速导航

| 模块 | 链接 | 学习内容 |
|------|------|---------|
| M4 | [测试生成](../../modules/phase2/M4-test-generation.md) | Pytest/Jest 测试快速生成、覆盖率优化 |
| M5 | [文档生成](../../modules/phase2/M5-doc-generation.md) | Docstring、OpenAPI、README 自动生成 |
| M6 | [代码审查](../../modules/phase2/M6-code-review-workflow.md) | PR 描述、审查建议、修复方案 |

## 🚀 推荐学习流程

**M4（测试生成）** → 90 分钟
1. 核心概念（15 分钟）：三种测试模式、框架差异
2. 场景 1（30 分钟）：为 Python 函数生成 Pytest
3. 场景 2（30 分钟）：从 User Story 生成 Jest
4. 自主练习（15 分钟）：为你的代码生成测试

**M5（文档生成）** → 90 分钟
1. 核心概念（15 分钟）：Docstring 标准、文档四层级
2. 场景 1（30 分钟）：补充 Python Docstring
3. 场景 2（30 分钟）：生成 OpenAPI 规范
4. 自主练习（15 分钟）：为你的 API 生成文档

**M6（代码审查）** → 90 分钟
1. 核心概念（15 分钟）：Review 的角色、PR 描述结构
2. 场景 1（30 分钟）：生成规范的 PR 描述
3. 场景 2（30 分钟）：生成审查建议清单
4. 自主练习（15 分钟）：审查真实的 PR

## ✅ 完成证明

完成 Phase 2 后，你应该能够：

- ✅ 从任何函数快速生成符合标准的单元测试
- ✅ 为代码补充符合标准的 Docstring（Google/NumPy/JSDoc）
- ✅ 生成专业的 OpenAPI 规范文档
- ✅ 用 Copilot 协助生成和审查 PR 描述
- ✅ 快速诊断代码问题并生成修复方案

## 📊 学习成果评估

| 能力 | 初级（刚学） | 中级（熟练） | 高级（精通） |
|------|----------|----------|----------|
| M4: 测试生成 | 知道命令用法 | 能独立生成可用的测试 | 生成的测试覆盖完整，有边界值检查 |
| M5: 文档生成 | 能生成基础文档 | 文档符合标准，例子清晰 | 文档完整，包括 Examples、Note、Warning |
| M6: Code Review | 能生成 PR 描述 | PR 描述规范，审查建议有深度 | 建议具体指出问题所在和修复方案 |

## 🔗 相关资源

**官方文档**
- [Pytest](https://docs.pytest.org/)
- [Jest](https://jestjs.io/)
- [Google Docstring 指南](https://google.github.io/styleguide/pyguide.html#38-comments-and-docstrings)
- [OpenAPI 3.0 规范](https://spec.openapis.org/oas/v3.0.3)

**推荐工具**
- [Swagger UI](https://swagger.io/tools/swagger-ui/) - OpenAPI 可视化
- [Coverage.py](https://coverage.readthedocs.io/) - Python 覆盖率检测
- [Postman](https://www.postman.com/) - API 测试和文档

## ❓ 常见问题

**Q: 必须按顺序学习 M4 → M5 → M6 吗？**

A: 推荐按顺序，但如果你已有相关经验可以跳过。M4 基础概念最重要。

**Q: 生成的代码能直接用于生产吗？**

A: 70-80% 可用，需要人工审核。特别检查：安全性、性能、业务逻辑。

**Q: Phase 2 完成后呢？**

A: 进入 Phase 3（高阶提示工程）：上下文管理、多轮对话、调试技巧。

---

相关学习模块：[Phase 2 学习模块](../../modules/phase2/)

*最后更新：2026-04-14 | 状态：完整 ✅*
