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
- [ ] 需求已编号（如 `AUTH-01`、`SM-01`），便于后续追溯
- [ ] 需求描述已写入 `docs/project-management/requirements.md`
- [ ] 新项目：基础文档骨架已创建（CLAUDE.md、README.md、docs/ 标准结构）

**评审要点：** scope 是否合理、本机环境是否支持、是否有遗漏的依赖、需求编号完整且已文档化、新项目文档骨架是否完整

---

## 2. 设计阶段

- [ ] 实施计划已编写（文件结构、任务拆分、代码示例）
- [ ] Plan Reviewer 已执行
- [ ] Reviewer 问题已全部修复
- [ ] 架构设计文档已产出 → `docs/architecture/architecture.md`（数据流、模块职责、接口定义）
- [ ] 测试策略文档已产出 → `docs/test-cases/test-cases.md`（测试类型、用例表、覆盖目标、阈值）
- [ ] 与现有项目模式一致（目录结构、配置文件、命名规范）

**评审要点：** 架构合理、任务拆分清晰、reviewer 问题已修复、交付文档齐全

---

## 3. 开发阶段

- [ ] 前置条件已验证 → 实施计划 Prerequisites 中的工具已安装、依赖版本正确（`which <tool>` / `<tool> --version`）
- [ ] TDD：先写失败测试，再写实现（RED → GREEN → REFACTOR）
- [ ] 源代码已产出 → `src/` 目录（按实施计划的模块结构）
- [ ] 测试代码已产出 → `tests/` 目录（单元测试、集成测试等）
- [ ] 配置文件已产出 → `package.json` / `requirements.txt`、`jest.config.js` / `pytest.ini`、`.eslintrc.*` / `.prettierrc` 等
- [ ] 每个 Task 完成后独立 commit
- [ ] Commit message 遵循 conventional commits（`feat:`, `fix:`, `test:`, `docs:`）
- [ ] 代码符合项目 lint 规范（ESLint/Prettier 或 black/flake8）
- [ ] 新依赖已添加到 `package.json` 或 `requirements.txt`
- [ ] 无硬编码路径、密钥、凭证
- [ ] 配置文件格式一致 → `.properties` / `.env` / `config/*.json` 遵循项目已有命名和注释规范
- [ ] 自测验证已执行 → 每项功能有实际运行证据（命令输出），不能仅凭文件存在就视为完成

**评审要点：** 代码质量、测试覆盖、commit 规范、源代码与测试代码结构完整、配置文件规范一致、自测证据齐全

---

## 4. 测试阶段

- [ ] 所有单元测试 PASS → `npm test` / `pytest tests/ -v`
- [ ] Lint 检查通过 → `npx eslint .` 或 `black --check src/ tests/`
- [ ] Format 检查通过 → `npx prettier --check .` 或 `isort --check-only src/ tests/`
- [ ] 覆盖率达标 → `npm test -- --coverage`（按 `jest.config.js` 阈值）或 `pytest --cov`（按项目要求）
- [ ] 集成/E2E 测试通过（如适用）→ `npm run test:integration` / `npm run test:e2e`
- [ ] 测试报告已产出（如适用）→ `coverage/` 目录、测试结果截图
- [ ] CI 流水线绿灯 → push 后检查 GitHub Actions → `.github/workflows/*.yml`
- [ ] CI workaround 复验 → 移除所有 `continue-on-error`、`|| true`、`skip` 后再跑一次，确认真实结果为 0 failures（防止 #27/#34 假绿灯）
- [ ] CI 报红验证 → 故意让测试失败一次，确认 CI 能正确检测到失败
- [ ] 本地 pre-commit checklist 全部通过（参考根 CLAUDE.md Pre-commit Checklist）

**评审要点：** lint 通过、所有测试 PASS、覆盖率达标、CI 绿灯且无 workaround 掩盖

---

## 5. 收尾阶段

- [ ] PR 已创建 → `gh pr create`（标题简洁、描述包含 Summary + Test Plan）
- [ ] 项目 README.md 已完善 → `<project>/README.md`（需求阶段创建骨架，收尾阶段补充最终内容）
- [ ] 项目 CLAUDE.md 已完善 → `<project>/CLAUDE.md`（需求阶段创建骨架，收尾阶段补充最终内容）
- [ ] 根 CLAUDE.md 已注册 → `CLAUDE.md`（Projects 表、Quick Commands、GitHub Actions 三处）
- [ ] 根 README.md 已注册 → `README.md`（项目列表）
- [ ] Wiki 已同步（如需要）→ GitHub Wiki 页面
- [ ] PR merged → `gh pr merge`

**评审要点：** 文档完整、root 文件三处已注册、Wiki 同步

---

# English Version

Every new feature/project follows a 5-phase process. Each phase must pause for manual review before proceeding to the next.

## 1. Requirements Phase

- [ ] Issue read and objective clear
- [ ] Complete user stories and use cases defined
- [ ] Scope confirmed (phase breakdown, feature boundaries)
- [ ] Feasibility assessed (local environment, tool dependencies, technical risks)
- [ ] Dependencies identified (tools to install, libraries to add)
- [ ] Requirements numbered (e.g., `AUTH-01`, `SM-01`) for traceability
- [ ] Requirements documented in `docs/project-management/requirements.md`
- [ ] New project: scaffold base docs (CLAUDE.md, README.md, standard docs/ structure)

**Review focus:** Is scope reasonable? Does local environment support it? Any missing dependencies? Requirements numbered and documented? Are new project doc scaffolds in place?

---

## 2. Design Phase

- [ ] Implementation plan written (file structure, task breakdown, code examples)
- [ ] Plan Reviewer executed
- [ ] All reviewer issues resolved
- [ ] Architecture document produced → `docs/architecture/architecture.md` (data flow, module responsibilities, interface definitions)
- [ ] Test strategy document produced → `docs/test-cases/test-cases.md` (test types, case table, coverage targets, thresholds)
- [ ] Consistent with existing project patterns (directory structure, config files, naming conventions)

**Review focus:** Architecture sound, tasks clearly decomposed, reviewer issues fixed, all deliverable documents present

---

## 3. Development Phase

- [ ] Prerequisites verified → all tools from implementation plan installed and version-checked (`which <tool>` / `<tool> --version`)
- [ ] TDD: write failing test first, then implement (RED → GREEN → REFACTOR)
- [ ] Source code produced → `src/` directory (per implementation plan module structure)
- [ ] Test code produced → `tests/` directory (unit tests, integration tests, etc.)
- [ ] Config files produced → `package.json` / `requirements.txt`, `jest.config.js` / `pytest.ini`, `.eslintrc.*` / `.prettierrc`, etc.
- [ ] Independent commit after each task
- [ ] Commit messages follow conventional commits (`feat:`, `fix:`, `test:`, `docs:`)
- [ ] Code passes project lint rules (ESLint/Prettier or black/flake8)
- [ ] New dependencies added to `package.json` or `requirements.txt`
- [ ] No hardcoded paths, secrets, or credentials
- [ ] Config file format consistent → `.properties` / `.env` / `config/*.json` follow project naming and comment conventions
- [ ] Self-test verification executed → every feature has actual run evidence (command output), not just file existence

**Review focus:** Code quality, test coverage, commit conventions, source and test code structure complete, config files consistent, self-test evidence present

---

## 4. Testing Phase

- [ ] All unit tests PASS → `npm test` / `pytest tests/ -v`
- [ ] Lint check passes → `npx eslint .` or `black --check src/ tests/`
- [ ] Format check passes → `npx prettier --check .` or `isort --check-only src/ tests/`
- [ ] Coverage meets threshold → `npm test -- --coverage` (per `jest.config.js`) or `pytest --cov` (per project config)
- [ ] Integration/E2E tests pass (if applicable) → `npm run test:integration` / `npm run test:e2e`
- [ ] Test reports produced (if applicable) → `coverage/` directory, test result screenshots
- [ ] CI pipeline green → push then check GitHub Actions → `.github/workflows/*.yml`
- [ ] CI workaround re-verification → remove all `continue-on-error`, `|| true`, `skip`, re-run and confirm 0 failures (prevent #27/#34 false green)
- [ ] CI failure detection → intentionally break a test, confirm CI reports red
- [ ] Local pre-commit checklist fully passed (see root CLAUDE.md Pre-commit Checklist)

**Review focus:** Lint passes, all tests PASS, coverage meets threshold, CI green with no workarounds masking failures

---

## 5. Closing Phase

- [ ] PR created → `gh pr create` (concise title, description with Summary + Test Plan)
- [ ] Project README.md finalized → `<project>/README.md` (scaffold in requirements, finalize in closing)
- [ ] Project CLAUDE.md finalized → `<project>/CLAUDE.md` (scaffold in requirements, finalize in closing)
- [ ] Root CLAUDE.md registered → `CLAUDE.md` (Projects table, Quick Commands, GitHub Actions — all three sections)
- [ ] Root README.md registered → `README.md` (project listing)
- [ ] Wiki synced (if needed) → GitHub Wiki pages
- [ ] PR merged → `gh pr merge`

**Review focus:** Documentation complete, root files registered in all three sections, Wiki synced
