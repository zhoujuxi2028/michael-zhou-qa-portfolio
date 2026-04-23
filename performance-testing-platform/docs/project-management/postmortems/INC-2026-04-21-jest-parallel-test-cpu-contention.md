# [INC-2026-04-21] Jest 并行测试 CPU 争用导致 3 个用例假阳性失败

## 基本信息

| 项 | 值 |
| --- | --- |
| 日期 | 2026-04-21 |
| 问题类型 | 测试基础设施（P2） |
| 严重度 | P2（本地开发体验受损；CI 未受影响） |
| 影响范围 | 本地 `npm test` 在 8 核机器上稳定出现 3 个假阳性失败 |
| 负责人 | Michael Zhou |
| 状态 | ✅ 已修复（commit 待登记） |

---

## 1. 问题摘要

本地运行 `npm test` 时，`tests/unit/utils/delay.test.js`、`tests/unit/scripts/server-sh.test.js`、`tests/unit/scripts/integration-test-phase7-soak.test.js` 同时失败。单独运行每个用例 100% 通过，且 `--maxWorkers=4` 下全量 322 测试通过。

**业务影响**: 开发者无法通过默认 `npm test` 命令获得稳定绿灯，需自行猜测 `--maxWorkers` 参数；`docs/qa/test-plan.md` 中"提交前 `npm test` 全绿"的门禁失效。

---

## 2. 根因映射

| 失败表现 | 表层错误 | 实际根因 |
| --- | --- | --- |
| `delay.test.js`: `elapsed=420 > 200` | 计时断言上限过紧 | 事件循环被并行 worker 阻塞 → `setTimeout(50)` 拉长到 420ms；200ms 上限本就缺乏余量 |
| `server-sh.test.js`: `Converting circular structure to JSON` | jest-worker IPC 无法序列化错误 | `execSync` 15s 超时（CPU 饥饿）抛出含自引用的 `Error`（`err.error === err`），worker 向父进程发送结果时 `JSON.stringify` 崩溃，整个 suite 标为 "failed to run" |
| `integration-test-phase7-soak.test.js`: `status: null` ×2 | `spawnSync` 30s 超时被命中 | 测试在 PATH 中放置 node/python3 写的 mock（curl/docker），CPU 争用下多次 fork/exec 启动延迟累加超过 30s |

**统一根因**: Jest 默认 `maxWorkers = ncpu - 1`，在 8 核机器上即 7 个 worker 并行。`tests/unit/scripts/*.test.js` 与 `tests/integration/*.test.js` 中多套件会 fork bash/node/python3 子进程，7 个 worker 同时启动子进程时 CPU 饱和，触发上述三类超时。

---

## 3. 修复

| 文件 | 改动 | 理由 |
| --- | --- | --- |
| `jest.config.js` | 新增 `maxWorkers: '50%'` | 限制并行度：8 核 → 4 worker；CI runner（2 核）本来默认即 1 worker，不受影响 |
| `tests/unit/utils/delay.test.js:9` | 上限 `200` → `2000` | 上限只为防死循环，`setTimeout(50)` 在任何并行负载下 4× 容差都不安全 |

**验证**:

| 场景 | 结果 |
| --- | --- |
| 单独运行 3 个失败用例 | ✅ PASS |
| `npm test`（修复后，2 次连续） | ✅ 40 suites / 322 tests @ 71s |
| `npx jest --maxWorkers=4`（修复前） | ✅ PASS（交叉验证根因假设） |

---

## 4. 预防措施（Prevention）

| 措施 | 类型 | 适用范围 |
| --- | --- | --- |
| Jest 配置必须显式声明 `maxWorkers`，禁止依赖默认值 | 配置约束 | `jest.config.js`；所有项目 |
| 计时断言上限必须 ≥ 预期均值的 10 倍，或直接省略（交给 `jest.setTimeout`） | 测试规范 | 所有 `expect(elapsed).toBeLessThan(X)` |
| subprocess-heavy 测试集中的 suite 必须标注并限制并行（未来用 `jest --projects` 拆分） | 架构约束 | `tests/unit/scripts/`、`tests/integration/` |
| PR code review checklist 新增"是否新增 fork/exec 子进程 → 评估并行影响" | 流程 | 所有测试 PR |
| CLAUDE.md `Common Pitfalls` 表追加一行：`Jest 默认并行度对 subprocess-heavy 套件不安全，必须显式 cap maxWorkers` | 知识沉淀 | 根 `CLAUDE.md` |

---

## 5. 后续改进（Follow-up Actions）

| 改进项 | 优先级 | 负责人 | 截止日期 | Issue |
| --- | --- | --- | --- | --- |
| 用 `jest --projects` 将 `tests/unit/scripts/` 与 `tests/integration/` 拆成独立 project，`maxWorkers: 1` 串行；纯 JS 单测保持 `50%` 并行 | P2 | Michael | 2026-05-05 | TBD |
| 在 `execSync` 包装器中 `delete err.error` 防御自引用，避免 jest-worker IPC 二次崩溃 | P2 | Michael | 2026-05-05 | TBD |
| 重命名 `tests/unit/scripts/*.test.js` 为 `tests/integration/scripts/` 或增加 `@integration` 标记，避免"unit"命名误导 | P3 | Michael | 2026-05-12 | TBD |
| 为所有计时相关测试统一审计上限，补齐 ≥10× 容差 | P3 | Michael | 2026-05-12 | TBD |
| CI workflow 中显式加 `--maxWorkers=2`（CI runner 2 核），防止未来 runner 升级后重现 | P3 | Michael | 2026-05-12 | TBD |

---

## 6. 诊断启发（可复用）

| 症状模式 | 首选假设 | 最快验证 |
| --- | --- | --- |
| 单独跑 PASS、整体跑 FAIL | 资源争用 / 并行度 | 先 `--maxWorkers=2` 验证，再查具体断言 |
| `spawnSync` / `execSync` 间歇 timeout | 子进程 fork 争用 CPU | 降并行或增 timeout 二选一，优先降并行 |
| jest-worker `Converting circular structure to JSON` | Worker 试图序列化 Node.js 自引用 Error | 查最近是否有 `execSync`/`spawnSync` 抛错未被 catch |
| 计时断言 `toBeLessThan(X)` 偶发失败 | X 容差不足 | 看实测均值与 X 的比例，< 5× 即过紧 |

---

## 7. 关联

| 资源 | 链接 |
| --- | --- |
| 修复 commit | （填入 commit hash） |
| 配置文件 | `jest.config.js`、`tests/unit/utils/delay.test.js` |
| 相关 Pitfall | CLAUDE.md `Common Pitfalls` 表（待追加） |
