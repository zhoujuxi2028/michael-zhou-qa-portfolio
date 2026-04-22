# Postmortem — 2026 Q1 Closed Defects 分析

> 时间范围: 2026-03-21 ~ 2026-04-02 | 分析对象: 25 个 closed defect | 涉及 7 个项目

## 目录

- [1. Defect 总表](#1-defect-总表)
- [2. 统计分析](#2-统计分析)
- [3. 逐项分析](#3-逐项分析)
- [4. 已建立的防御措施](#4-已建立的防御措施)
- [5. 改进计划追踪](#5-改进计划追踪)

---

## 1. Defect 总表

| # | Title | 引入阶段 | 根因类别 | 项目 |
|---|-------|---------|---------|------|
| #8 | ISS-001: black formatting failure | 开发 | 代码规范 | sid-iam |
| #9 | ISS-002: isort import ordering | 开发 | 代码规范 | sid-iam |
| #10 | ISS-003: missing jsonschema dependency | 开发 | 依赖遗漏 | sid-iam |
| #11 | ISS-004: unregistered contract marker | 开发 | 配置遗漏 | sid-iam |
| #12 | ISS-005: SAML schema mismatch | 设计 | 接口理解错误 | sid-iam |
| #13 | ISS-006: OIDC auth param wrong | 设计 | 接口理解错误 | sid-iam |
| #24 | ISS-007: flake8 command not found | 开发 | 依赖遗漏 | selenium |
| #25 | ISS-008: Newman test failures (workaround) | 开发 | 测试数据 + 假绿灯 | api-testing |
| #27 | selenium-ci smoke 占位符 | 开发 | 假绿灯 | selenium |
| #34 | ISS-010: 22 Newman failures masked | 开发 | 假绿灯(遗留) | api-testing |
| #35 | trivy-action Node.js 20 | 外部 | 第三方依赖 | cicd |
| #36 | K8S namespace missing | 开发 | 环境差异 | k8s |
| #37 | ZAP issue writing 变更 | 外部 | 权限模型变更 | security |
| #38 | 缺少 workflow_dispatch | 开发 | 配置遗漏 | microservice/sid-iam |
| #39 | k6 action Node.js 20 | 外部 | 第三方依赖 | performance |
| #41 | 假 deployment environment | 开发 | CI 误用 | cicd |
| #43 | ESLint no-console warning | 设计 | lint 规则粗粒度 | performance |
| #45 | JMeter smoke 报告无数据 | 设计 | 参数过小 | performance |
| #47 | smoke 参数设计根因 | 设计 | 验收标准模糊 | performance |
| #48 | Phase 4 验证不完整 | 测试 | 未对照 checklist | performance |
| #50 | JMX 字段名错误 | 开发 | 未对照源码 | performance |
| #51 | JM-LOAD-02 吞吐量不达标 | 设计 | 阈值不合理 | performance |
| #61 | preflight MEM_MIN_GB=0 | 开发 | shell 输出污染 | performance |
| #62 | k6 setup 污染 metrics | 开发 | k6 机制理解不足 | performance |
| #63 | k6 setup timeout bcrypt | 开发 | 性能预估不足 | performance |

---

## 2. 统计分析

### 按引入阶段

| 引入阶段 | 数量 | 占比 | Issues |
|----------|------|------|--------|
| 开发 | 15 | 60% | #8-11, #24-25, #27, #34, #36, #38, #41, #50, #61-63 |
| 设计 | 5 | 20% | #12, #13, #43, #47, #51 |
| 测试 | 1 | 4% | #48 |
| 外部 | 3 | 12% | #35, #37, #39 |
| 设计+开发 | 1 | 4% | #45 |

### 按根因类别

| 根因类别 | 数量 | Issues |
|----------|------|--------|
| 依赖/配置遗漏 | 5 | #10, #11, #24, #38, #41 |
| 假绿灯 (CI 掩盖失败) | 3 | #25, #27, #34 |
| 接口/字段不一致 | 3 | #12, #13, #50 |
| 代码规范未执行 | 2 | #8, #9 |
| 参数/阈值设计不合理 | 3 | #45, #47, #51 |
| Shell/工具机制理解不足 | 3 | #61, #62, #63 |
| 第三方依赖 | 3 | #35, #37, #39 |
| 环境路径未覆盖 | 1 | #36 |
| 验收不完整 | 1 | #48 |
| Lint 规则粗粒度 | 1 | #43 |

### Top 3 高频模式

**1. 假绿灯 (#25, #27, #34)** — 最严重。`continue-on-error` / `|| true` / `--collect-only` 掩盖真实失败，#34 遗留 9 天。

**2. 接口/字段不一致 (#12, #13, #50)** — 传导性最强。设计阶段一个字段名错误导致下游多个 issue。

**3. 依赖/配置遗漏 (#10, #11, #24, #38, #41)** — 最高频。新工具/新依赖未同步到配置文件。

---

## 3. 逐项分析

### #8 ISS-001: black formatting failure
- **现象：** PR #7 CI 报红，3 个文件未格式化
- **根因：** 提交前未运行 `black`
- **修复：** `black --line-length 120 tests/test_contract/`
- **防御措施：** Pre-commit Checklist 加入 `black --check`
- **改进计划：** 引入 `pre-commit` hook 自动运行 black → [#74](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/74)

### #9 ISS-002: isort import ordering
- **现象：** PR #7 CI 报红，conftest.py import 顺序不对
- **根因：** 提交前未运行 `isort`
- **修复：** `isort --profile black tests/test_contract/`
- **防御措施：** Pre-commit Checklist 加入 `isort --check-only`
- **改进计划：** 同 #8 → [#74](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/74)

### #10 ISS-003: missing jsonschema dependency
- **现象：** CI `ModuleNotFoundError: No module named 'jsonschema'`
- **根因：** 代码引用了 jsonschema 但未加入 `requirements.txt`
- **修复：** 添加 `jsonschema==4.21.1`
- **防御措施：** CLAUDE.md Pitfall: "New imports → requirements.txt"
- **改进计划：** CI 加 `pip check` 验证依赖完整性

### #11 ISS-004: unregistered contract marker
- **现象：** CI `'contract' not found in markers configuration option`
- **根因：** `--strict-markers` 下新 marker 未声明
- **修复：** `pytest.ini` 添加 `contract: Contract tests`
- **防御措施：** CLAUDE.md Pitfall: "New markers → pytest.ini"
- **改进计划：** 设计阶段实施计划中明确列出 pytest.ini 变更项

### #12 ISS-005: SAML schema mismatch
- **现象：** 合约测试失败，`is not of type 'string'`（实际返回 object）
- **根因：** 编写 schema 时**假设** SAML 返回 string，未对照实际 API 返回值
- **修复：** schema 改为 `type: object` + required fields
- **防御措施：** CLAUDE.md Pitfall: "Contract schemas match actual responses"
- **改进计划：** 设计阶段接口定义附源码行号引用 → [#77](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/77)

### #13 ISS-006: OIDC auth param wrong
- **现象：** 测试 401，expected 200
- **根因：** 测试用 `headers=` 传 auth，但 FastAPI 端点用 query param（无 `Header()` 注解）
- **修复：** 改为 `params={"authorization": ...}`
- **防御措施：** 同 #12
- **改进计划：** 同 #12 → [#77](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/77)

### #24 ISS-007: flake8 command not found
- **现象：** CI exit 127，`flake8: command not found`
- **根因：** CI workflow 写了 flake8 步骤但 `requirements.txt` 没有 flake8
- **修复：** 添加 `flake8==7.0.0`
- **防御措施：** CLAUDE.md Pitfall: "CI tools must be in dependency files"
- **改进计划：** CI workflow 编写时强制自检 → [#75](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/75)

### #25 ISS-008: Newman test failures (workaround)
- **现象：** Newman 测试失败，用 `continue-on-error: true` 绕过
- **根因：** `db.json` 数据与 Collection 断言不匹配
- **修复：** 临时 workaround，**未真正修复** → 直接导致 #34
- **防御措施：** CLAUDE.md 禁止 `continue-on-error` 作为最终方案
- **改进计划：** workaround 到期机制 → [#68](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/68)

### #27 selenium-ci smoke 占位符
- **现象：** CI 永远绿灯，实际无任何测试执行
- **根因：** `--collect-only` + `|| true`，`tests/smoke/` 为空目录
- **修复：** 标记为 known placeholder
- **防御措施：** CLAUDE.md 禁止 `|| true` / `--collect-only` 作为最终方案
- **改进计划：** CI 残留 continue-on-error 清理 → [#76](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/76)

### #34 ISS-010: 22 Newman failures masked

> **本项目最严重的 defect。** `continue-on-error` 掩盖 22 个断言失败长达 9 天。

- **现象：** CI 绿灯但 316 个断言中 22 个失败
- **根因：** 3 层叠加 — db.json 缺 id=1 / 污染数据 / json-server 行为差异
- **修复：** 修复 db.json + 适配断言 + 移除 `continue-on-error`
- **防御措施：** Phase 4 增加 "移除 workaround 复验 + 故意失败验证"；ISS-012/013 规则
- **改进计划：** Newman 显式断言验证 → [#72](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/72)

### #35 trivy-action Node.js 20
- **现象：** trivy-action 内部依赖 `actions/cache@v4.2.4`（Node 20）
- **根因：** 第三方 action 硬编码 SHA
- **修复：** 标记 `known-issue/external`，已记录在 [README Known Issues](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio?tab=readme-ov-file#known-issues--%E5%B7%B2%E7%9F%A5%E9%97%AE%E9%A2%98)
- **防御措施：** `known-issue/external` label 追踪
- **改进计划：** 季度巡检 → [#71](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/71)

### #36 K8S namespace missing
- **现象：** `workflow_dispatch` 触发时 `namespace "k8s-testing" not found`
- **根因：** push/PR 路径下该 job 被 skip，只在手动触发才暴露
- **修复：** 添加 `kubectl create namespace k8s-testing`
- **防御措施：** ISS-009: 升级后需全量验证所有 trigger 路径
- **改进计划：** trigger 路径验证 checklist → [#73](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/73)

### #37 ZAP issue writing 变更
- **现象：** ZAP 升级后 403，不再自动创建 GitHub issues
- **根因：** `workflow_dispatch` 的 GITHUB_TOKEN 是 read-only
- **修复：** `allow_issue_writing: false`，报告走 artifact
- **防御措施：** 升级 action 时检查 changelog 和权限变化
- **改进计划：** 季度巡检 → [#71](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/71)

### #38 缺少 workflow_dispatch
- **现象：** 无法手动触发 microservice-ci 和 sid-iam-ci
- **根因：** 编写 workflow 时只加了 push/PR trigger
- **修复：** 添加 `workflow_dispatch:`
- **防御措施：** 已修复
- **改进计划：** CI workflow 模板 → [#75](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/75)

### #39 k6 action Node.js 20
- **现象：** `grafana/setup-k6-action@v1` 无 Node 24 版本
- **根因：** 上游未更新
- **修复：** 替换为手动 `curl + tar` 安装 k6
- **防御措施：** 已替换，不再依赖该 action
- **改进计划：** 季度巡检 → [#71](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/71)

### #41 假 deployment environment
- **现象：** GitHub Deployments 25+ 条空记录
- **根因：** `pipeline.yml` 用 `environment:` 但只有 echo
- **修复：** 移除 `environment:` 配置
- **防御措施：** 已修复并清理
- **改进计划：** CI workflow 模板 → [#75](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/75)

### #43 ESLint no-console warning
- **现象：** CI annotation warning `Unexpected console statement`
- **根因：** eslint 规则一刀切，server.js 入口 log 属合理用法
- **修复：** `.eslintrc.js` overrides 对 server.js 豁免
- **防御措施：** 已添加 overrides
- **改进计划：** pre-commit hook 补全 → [#74](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/74)

### #45 JMeter smoke 报告无数据
- **现象：** HTML 报告图表空白，样本仅 18 个
- **根因：** threads=2, duration=30s，数据量不足
- **修复：** 调整为 threads=5, duration=60s
- **防御措施：** Memory: JMeter HTML 需 ≥60s + ≥5 threads
- **改进计划：** JMeter dry-run 验证步骤 → [#70](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/70)

### #47 smoke 参数设计根因
- **现象：** #45 根因追溯到设计阶段
- **根因：** 设计文档参数过小；验收标准只写"成功运行"无量化
- **修复：** 参数已调整
- **防御措施：** 验收标准已量化（`test-cases.md`）
- **改进计划：** 禁止模糊验收标准，强制量化

### #48 Phase 4 验证不完整
- **现象：** 只验证 smoke，遗漏 load/stress/spike
- **根因：** 测试阶段未对照实施计划逐项列 checklist
- **修复：** 逐一补验
- **防御措施：** Checklist 规则: "每阶段开始先列出所有交付物"
- **改进计划：** Phase 4 生成 RTM 验证表（已有 `rtm.md`）

### #50 JMX 字段名错误
- **现象：** load test 32.5% 错误率，POST 返回 400
- **根因：** JMX 写 `productId`，API 期望 `product_id`
- **修复：** 已修复 6 处
- **防御措施：** 已修复
- **改进计划：** JMeter dry-run 验证 → [#70](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/70)；接口行号引用 → [#77](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/77)

### #51 JM-LOAD-02 吞吐量不达标
- **现象：** 阈值 >10 req/s，实际 8.6 req/s
- **根因：** 阈值未考虑 think time 对吞吐量的影响
- **修复：** 调整阈值
- **防御措施：** `performance-testing-parameters.md` 含 Little's Law 推导
- **改进计划：** 性能阈值必须附推导公式

### #61 preflight MEM_MIN_GB=0
- **现象：** 5297 MB ≥ 0 MB 应 PASS，实际 FAIL
- **根因：** `$(node -e ...)` 输出被 warning 污染，bash `-ge` 比较异常
- **修复：** `| tail -1 | tr -dc '0-9'` 清洗
- **防御措施：** CLAUDE.md ISS-010 规则
- **改进计划：** 统一清洗模式 → [#78](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/78)

### #62 k6 setup 污染 metrics
- **现象：** `http_req_failed` 1.35%，100 个 setup 请求被计入
- **根因：** k6 `setup()` HTTP 请求默认计入全局 metrics
- **修复：** tag-based thresholds 隔离
- **防御措施：** CLAUDE.md ISS-011 规则
- **改进计划：** k6 脚本 tag 隔离 + 模板 → [#69](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/69)

### #63 k6 setup timeout bcrypt
- **现象：** setup() 注册 500 用户超时（60s 默认限制）
- **根因：** bcrypt 10 rounds ≈ 100ms/hash × 500 = 50s+
- **修复：** `setupTimeout: '120s'`
- **防御措施：** 已修复
- **改进计划：** k6 脚本模板含 setupTimeout → [#69](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/69)

---

## 4. 已建立的防御措施

| 规则 | 来源 | 载体 |
|------|------|------|
| Pre-commit: black/isort/flake8 | #8, #9 | CLAUDE.md |
| New imports → requirements.txt | #10, #24 | CLAUDE.md Pitfall |
| New markers → pytest.ini | #11 | CLAUDE.md Pitfall |
| Contract schema 对照实际响应 | #12, #13 | CLAUDE.md Pitfall |
| CI tools in dependency files | #24 | CLAUDE.md Pitfall |
| 本地跑测试再推 CI | #25 | CLAUDE.md Pitfall |
| 禁止 `continue-on-error` 作为最终方案 | #25, #27, #34 | CLAUDE.md + Checklist Phase 4 |
| Phase 4 移除 workaround 复验 + 故意失败 | #34 | Checklist Phase 4 |
| 每阶段先列 checklist 再执行 | #48 | Checklist 规则 |
| `$(cmd)` 输出清洗 | #61 | CLAUDE.md ISS-010 |
| k6 setup() 用 tag 隔离 | #62 | CLAUDE.md ISS-011 |
| 升级 action 全量扫描 + 全 workflow 验证 | #36, #37 | CLAUDE.md ISS-009 |
| JMeter HTML 需 ≥60s + ≥5 threads | #45 | Memory |

---

## 5. 改进计划追踪

| Issue | 改进项 | 优先级 | 状态 |
|-------|--------|--------|------|
| [#68](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/68) | workaround 到期机制 | P1 | ✅ Done (2026-04-21, `docs/guides/workaround-tracking.md`, CLAUDE.md 规则更新, LABEL_STRATEGY.md `workaround` label) |
| [#69](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/69) | k6 setup tag 隔离 + 模板 | P2 | Open |
| [#70](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/70) | JMeter dry-run 验证 | P2 | Open |
| [#71](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/71) | 第三方 action 季度巡检 | P3 | ✅ Done (2026-04-21, `docs/guides/third-party-action-audit.md`) |
| [#72](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/72) | Newman 断言数量验证 | P1 | Open |
| [#73](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/73) | CI trigger 路径验证 checklist | P2 | Open |
| [#74](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/74) | pre-commit hook 补全 | P2 | Open |
| [#75](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/75) | CI workflow 模板 | P2 | ✅ Done (2026-04-03, `.github/workflow-template.yml`) |
| [#76](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/76) | 移除残留 continue-on-error | P1 | Open |
| [#77](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/77) | 设计文档源码行号引用 | P1 | ✅ Done (2026-04-03, `architecture.md` 已有行号引用) |
| [#78](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/78) | shell 输出清洗统一 | P3 | Open |
