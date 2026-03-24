# Development Process Checklist（开发流程检查表）

每个新功能/项目遵循 5 阶段流程，每阶段结束必须暂停等待人工评审。

## 目录 / Table of Contents

- [1. 需求阶段](#1-需求阶段)
- [2. 设计阶段](#2-设计阶段)
- [3. 开发阶段](#3-开发阶段)
- [4. 测试阶段](#4-测试阶段)
- [5. 收尾阶段](#5-收尾阶段)
- [English Version](#english-version)

---

## 1. 需求阶段

- [ ] Issue 已读取，目标明确
- [ ] 需要完整用户故事，use cases
- [ ] Scope 已确认（Phase 划分、功能边界）
- [ ] 可行性评估（本机环境、依赖工具、技术风险）
- [ ] 依赖已识别（需安装的工具、需引入的库）
- [ ] 需求描述已产出（Issue 描述 或 需求文档）
- [ ] 新项目：基础文档骨架已创建（CLAUDE.md、README.md、docs/ 标准结构）

**评审要点：** scope 是否合理、本机环境是否支持、是否有遗漏的依赖、新项目文档骨架是否完整

---

## 2. 设计阶段

- [ ] 实施计划已编写（文件结构、任务拆分、代码示例）
- [ ] Plan Reviewer 已执行
- [ ] Reviewer 问题已全部修复
- [ ] 架构设计合理（数据流、模块职责、接口定义）
- [ ] 测试策略已确定（测试类型、覆盖目标、阈值）
- [ ] 与现有项目模式一致（目录结构、配置文件、命名规范）

**评审要点：** 架构合理、任务拆分清晰、reviewer 问题已修复

---

## 3. 开发阶段

- [ ] TDD：先写失败测试，再写实现
- [ ] 每个 Task 完成后独立 commit
- [ ] Commit message 遵循 conventional commits（`feat:`, `fix:`, `test:`, `docs:`）
- [ ] 代码符合项目 lint 规范（ESLint/Prettier 或 black/flake8）
- [ ] 新依赖已添加到 package.json 或 requirements.txt
- [ ] 无硬编码路径、密钥、凭证

**评审要点：** 代码质量、测试覆盖、commit 规范

---

## 4. 测试阶段

- [ ] 所有单元测试 PASS
- [ ] Lint 检查通过（`npx eslint` 或 `black --check`）
- [ ] Format 检查通过（`prettier --check` 或 `isort --check-only`）
- [ ] 覆盖率达标（按 jest.config.js 或项目要求）
- [ ] 集成/E2E 测试通过（如适用）
- [ ] CI 流水线绿灯（push 后检查 GitHub Actions）
- [ ] 本地 pre-commit checklist 全部通过

**评审要点：** lint 通过、所有测试 PASS、CI 绿灯

---

## 5. 收尾阶段

- [ ] PR 已创建（标题简洁、描述包含 Summary + Test Plan）
- [ ] 项目 README.md 已完善（需求阶段创建骨架，收尾阶段补充最终内容）
- [ ] 项目 CLAUDE.md 已完善（需求阶段创建骨架，收尾阶段补充最终内容）
- [ ] 根 CLAUDE.md 已注册（Projects 表、Quick Commands、GitHub Actions）
- [ ] 根 README.md 已注册
- [ ] Wiki 已同步（如需要）
- [ ] PR merged

**评审要点：** 文档完整、root 文件已注册、Wiki 同步

---

# English Version

Every new feature/project follows a 5-phase process. Each phase must pause for manual review before proceeding to the next.

## 1. Requirements Phase

- [ ] Issue read and objective clear
- [ ] Complete user stories and use cases defined
- [ ] Scope confirmed (phase breakdown, feature boundaries)
- [ ] Feasibility assessed (local environment, tool dependencies, technical risks)
- [ ] Dependencies identified (tools to install, libraries to add)
- [ ] Requirements document produced (Issue description or spec)
- [ ] New project: scaffold base docs (CLAUDE.md, README.md, standard docs/ structure)

**Review focus:** Is scope reasonable? Does local environment support it? Any missing dependencies? Are new project doc scaffolds in place?

---

## 2. Design Phase

- [ ] Implementation plan written (file structure, task breakdown, code examples)
- [ ] Plan Reviewer executed
- [ ] All reviewer issues resolved
- [ ] Architecture design sound (data flow, module responsibilities, interface definitions)
- [ ] Test strategy defined (test types, coverage targets, thresholds)
- [ ] Consistent with existing project patterns (directory structure, config files, naming conventions)

**Review focus:** Architecture sound, tasks clearly decomposed, reviewer issues fixed

---

## 3. Development Phase

- [ ] TDD: write failing test first, then implement
- [ ] Independent commit after each task
- [ ] Commit messages follow conventional commits (`feat:`, `fix:`, `test:`, `docs:`)
- [ ] Code passes project lint rules (ESLint/Prettier or black/flake8)
- [ ] New dependencies added to package.json or requirements.txt
- [ ] No hardcoded paths, secrets, or credentials

**Review focus:** Code quality, test coverage, commit conventions

---

## 4. Testing Phase

- [ ] All unit tests PASS
- [ ] Lint check passes (`npx eslint` or `black --check`)
- [ ] Format check passes (`prettier --check` or `isort --check-only`)
- [ ] Coverage meets threshold (per jest.config.js or project requirements)
- [ ] Integration/E2E tests pass (if applicable)
- [ ] CI pipeline green (check GitHub Actions after push)
- [ ] Local pre-commit checklist fully passed

**Review focus:** Lint passes, all tests PASS, CI green

---

## 5. Closing Phase

- [ ] PR created (concise title, description with Summary + Test Plan)
- [ ] Project README.md finalized (scaffold in requirements, finalize in closing)
- [ ] Project CLAUDE.md finalized (scaffold in requirements, finalize in closing)
- [ ] Root CLAUDE.md registered (Projects table, Quick Commands, GitHub Actions)
- [ ] Root README.md registered
- [ ] Wiki synced (if needed)
- [ ] PR merged

**Review focus:** Documentation complete, root files registered, Wiki synced
