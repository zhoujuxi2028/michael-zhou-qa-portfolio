# Postmortem — Issues #202–#205: k6 smoke baseline 启动稳健性

> **事件时间**: 2026-04-25（issue 登记）/ 2026-04-25（commit `f7f9c7d` 修复落地）  
> **影响范围**: `performance-testing-platform` 的 `npm run k6:smoke` baseline 路径  
> **严重级别**: P1 — 阻塞 RCA 对比与 baseline 复现  
> **解决时间**: 2026-04-25（修复合入 main，PR #221 + 单测稳定化 PR #222）  
> **关联 issue**: #202、#203、#204、#205  
> **修复 commit**: [`f7f9c7d`](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/commit/f7f9c7d) — `fix(perf): harden k6 smoke startup`  
> **修复 PR**: [#221](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/pull/221)（落地）+ [#222](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/pull/222)（单元测试稳定化）

---

## 1. 事件摘要

围绕 `npm run k6:smoke` baseline 调试，连续暴露出 4 个真实缺陷：

| Issue | 标题 | 现象 |
|-------|------|------|
| #202 | k6 smoke baseline fails with connection refused when API is down | smoke baseline 直接调用 `k6 run`，未自动启动本地 API；本地服务未起时立刻 `connect: connection refused` |
| #203 | resolve k6 open() path warning in smoke profile loader | `tests/performance/helpers/profile.js` 用 `open('../../profiles/...')`，触发 k6 future warning |
| #204 | normalize BASE_URL and PORT for k6 smoke target resolution | `BASE_URL=http://localhost` + `PORT=3001` 时，wrapper 启服务用 3001，但 health check / k6 仍可能落到默认端口 |
| #205 | prevent local autostart for remote k6 smoke targets | wrapper 一旦发现 health 失败就盲目执行 `bash scripts/server.sh start single`，远端目标也被偷偷拉起本地 API |

四个缺陷都集中在「smoke baseline 入口」，根因是同一段早期较薄的 wrapper 实现没有覆盖足够的目标场景与失败路径。

---

## 2. 根本原因分析 (RCA)

### 直接原因

| Issue | 直接原因 |
|-------|----------|
| #202 | `package.json` 中 `"k6:smoke": "k6 run ..."` 直接调用 k6，未在前置阶段做 health check 与本地 autostart |
| #203 | profile loader 用相对路径 `open('../../profiles/...')`，k6 即将变更 `open()` 的相对路径语义，触发 future warning |
| #204 | wrapper 仅取 `PORT` 启动服务，未把 `BASE_URL` 与 `PORT` 归一化成唯一 canonical target URL；HEALTH_URL / 导出的 BASE_URL 可能跟启动的端口不一致 |
| #205 | wrapper 在 health check 失败时无条件调用 `server.sh start`，未判断目标 host 是否属于本地 |

### 共同根因（Why-chain）

```
最初的 k6:smoke 只是「方便本地跑一次 k6」的薄封装
    → wrapper 没有把 baseline 当成「跨场景可重复运行的命令」来设计
        → 缺少：自动启动本地 API（#202）、canonical URL 推导（#204）、远端 fail-fast（#205）
            → 同一时期 k6 升级提示 open() 路径语义将变（#203）
                → 本地调试 baseline 时四个问题集中暴露
```

### 为什么没有提前发现

| 因素 | 说明 |
|------|------|
| smoke 只在本地跑 | CI 上跑的是 `npm run k6:smoke` 的容器化路径，没有覆盖「BASE_URL 含路径」「BASE_URL 不含端口」「远端目标」等组合 |
| 单元测试只看 profile / k6 脚本 | 历史 `tests/unit/helpers/smoke-config.test.js` 只覆盖 profile JSON 与 k6 脚本结构，没覆盖 wrapper 自身的 URL 解析与 fail-fast 行为 |
| 没有 focused 行为级测试 | 用 spawn 拉起 wrapper、断言 stdout/exit code 的测试此前不存在 |

---

## 3. 修复方案

修复均集中在 `performance-testing-platform/`（详见 commit `f7f9c7d`）：

| Issue | 修复要点 | 关键文件 |
|-------|----------|----------|
| #202 | `package.json` 改为 `"k6:smoke": "bash scripts/k6-smoke.sh"`；wrapper 在 health 失败时自动 `bash scripts/server.sh start single`，并支持 `K6_SMOKE_SKIP_AUTOSTART=true` 显式跳过 | `package.json`、`scripts/k6-smoke.sh` |
| #203 | profile loader 改为 `import.meta.resolve('../../../profiles/${name}.json')` + `open(resolveProfilePath(name))`，消除 future warning | `tests/performance/helpers/profile.js` |
| #204 | wrapper 把 `BASE_URL` 与 `PORT` 归一化为唯一 `SMOKE_BASE_URL`：解析 scheme / authority / path → 显式端口优先、否则注入 `PORT`；HEALTH_URL、导出的 BASE_URL/PORT 都从 canonical target 推导 | `scripts/k6-smoke.sh` L10-61 |
| #205 | wrapper 维护 `IS_LOCAL_TARGET`，仅 `localhost`/`127.0.0.1`/`::1`/`[::1]` 被视为本地；非本地目标 health 失败时直接 `exit 1` 并打印 `Remote target not reachable on $HEALTH_URL`，永远不会调用 `server.sh start` | `scripts/k6-smoke.sh` L52-78 |

**修复原则**:
- 单一 canonical URL：HEALTH_URL / k6 / autostart 三方共享同一目标
- 显式优先：`BASE_URL` 中已有的端口优先于环境变量 `PORT`
- fail-fast：远端目标永不偷偷启本地服务
- 向后兼容：`K6_SMOKE_SKIP_AUTOSTART=true` 保留显式跳过路径

---

## 4. 验证方式

### 静态测试（修复 PR 同步落地）

`tests/unit/helpers/smoke-config.test.js` 中新增 `K6-SMOKE-UT-25` ~ `K6-SMOKE-UT-32`，覆盖：
- wrapper 调用 `bash scripts/k6-smoke.sh`
- canonical URL 表达式 `SMOKE_BASE_URL="${SMOKE_SCHEME}://${SMOKE_HOST_PORT}${SMOKE_PATH}"`
- `IS_LOCAL_TARGET` 仅放行 `localhost|127.0.0.1|::1`
- 远端目标走 `Remote target not reachable on $HEALTH_URL`
- profile loader 改用 `import.meta.resolve`，不再硬编码 `open('../../profiles/')`

### 行为级 focused 测试（本 PR 补齐）

`tests/unit/scripts/k6-smoke-wrapper.test.js`（新增 5 个 case）通过注入伪造 `curl` / `k6` 进 `PATH`，无网络、无服务真启动地断言：

| Case | 验证目标 | 关联 issue |
|------|----------|-----------|
| BASE_URL=http://localhost + PORT=3001 → HEALTH_URL 注入 :3001 | canonical URL 带正确端口 | #204 |
| BASE_URL 已含端口（http://localhost:3005）时 PORT 被忽略 | 显式端口优先 | #204 |
| BASE_URL 含路径前缀时 canonical URL 保留 path | 路径不丢失 | #204 |
| BASE_URL=http://example.invalid:3000 直接 exit 1，不调用 server.sh、不调用 k6 | 远端 fail-fast | #205 |
| BASE_URL=http://[::1]:3000 + SKIP_AUTOSTART=true → 本地路径，不出现 "Remote target not reachable" | 本地目标分支正确识别 IPv6 loopback | #205 |

### 本地验证

```bash
cd performance-testing-platform
npm run lint                                # ✅ 无错误
npm test -- --testPathPattern='tests/unit'  # ✅ 33 suites / 311 tests pass
```

---

## 5. 改进措施 & 防御机制

| 措施 | 类型 | 状态 |
|------|------|------|
| 为 `scripts/k6-smoke.sh` 增加行为级 focused 测试（spawn 真实 wrapper，伪造网络） | 测试 | ✅ 本 PR 落地 |
| 在 postmortem 中固化 canonical target URL 三要素（scheme/authority/path）规则 | 文档 | ✅ 本 PR 落地 |
| 后续若引入新的 baseline wrapper（jmeter:smoke 之外的入口），按相同模式：canonical URL + 本地白名单 + skip flag | 流程 | 📅 跟进 |

### 5.1 PR #223 CI 复盘（次生事件）

PR #223 首次 push 后 `Performance Testing / Code Quality` job 失败，原因是新增的 `tests/unit/scripts/k6-smoke-wrapper.test.js` 未通过 `prettier --check`（`npm run format:check`）。

| 维度 | 详情 |
|------|------|
| 直接原因 | 文件由 `create` 工具一次性写入，未本地跑 `npm run format:check` 与 `prettier --write` |
| 根因 | 提交前 checklist 漏跑 prettier；本地只跑了 lint + jest |
| 修复 | `npx prettier --write tests/unit/scripts/k6-smoke-wrapper.test.js` 后重跑 `prettier --check` 通过 |
| 防御 | 在本仓库 `CLAUDE.md` 「Pre-commit Checklist (Node.js)」已要求 `npx prettier --check`；本次违反流程，记录提醒：**新增 JS 文件后必须 `prettier --write` 一次再提交** |

---

## 6. 时间线

| 时间 | 事件 |
|------|------|
| 2026-04-25 04:16 UTC | 用户登记四个 issue（#202、#203、#204、#205） |
| 2026-04-25 09:19 UTC | commit `f7f9c7d` 推入 PR #221 分支：wrapper 重写 + 单测扩展 |
| 2026-04-25 | PR #221 合入 main |
| 2026-04-25 | PR #222 修复合并后单元测试若干环境敏感断言 |
| 2026-04-26 13:16 UTC | 用户复核 main 状态，确认四个修复均已落地 |
| 2026-04-26 14:50 UTC | 本 PR 收尾：补齐 focused 行为级测试 + postmortem，触发 `Closes #202-#205` |

---

## 7. 经验教训 (Lessons Learned)

> **ISS-202-205**: 任何「测试入口包装脚本」（baseline / smoke / dryrun wrapper）都必须把目标 URL 当成一等公民来设计：归一化 → 全链路共用 → 本地白名单。否则 `BASE_URL` 与 `PORT` 任一被外部注入时都可能造成 health/k6/autostart 三方目标错位，影响 RCA 可信度。

**对应 CLAUDE.md Common Pitfalls 候选条目**：

| Check | Why | Issue |
|-------|-----|-------|
| smoke / baseline wrapper 必须输出唯一 canonical target URL，并在 health/k6/autostart 三方共享 | 不归一会让 health 与 k6 跑到不同端口，结果失真 | #204 |
| autostart 仅允许在 `localhost`/`127.0.0.1`/`::1` 类本地目标上发生，非本地需 fail-fast | 偷偷启动本地服务会污染远端 baseline 数据 | #205 |
| profile / 资源加载尽量使用 `import.meta.resolve` 等显式路径解析，避免依赖运行时 cwd | k6/Node 后续版本会变更 `open()` 相对路径语义 | #203 |
