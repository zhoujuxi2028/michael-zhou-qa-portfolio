# QA-CICD-SCENARIOS 场景 10 性能基线验证 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `cicd-demo/docs/reference/QA-CICD-SCENARIOS.md` 插入场景 10（性能基线验证），原场景 10/11 顺延为 11/12，并同步更新 MVP 说明文字和反模式引用。

**Architecture:** 纯文档修改，无代码变更。所有改动集中在单一 Markdown 文件，按顺序执行 6 项变更，最后运行 markdown link check 验证，提交并开 PR。

**Tech Stack:** Markdown、bash（`check-markdown-links.sh`）

---

### Task 1: 插入场景 10，并顺延场景 10/11 编号

**Files:**
- Modify: `cicd-demo/docs/reference/QA-CICD-SCENARIOS.md`

- [ ] **Step 1: 在场景 9 结尾后插入新场景 10**

  在 `## 场景 9：生产质量反馈` 段落的 **重点** 行之后、`## 场景 10：Flaky Test 治理` 之前，插入以下内容：

  ```markdown
  ## 场景 10：性能基线验证（Performance Baseline Gate）

  **适用时机**：staging 部署后、生产发布前、回归周期性执行。

  | 项目 | 操作建议 |
  |------|----------|
  | 推荐工具 | k6、JMeter、InfluxDB + Grafana |
  | 质量门禁 | P95 ≤ 基线阈值；错误率 < 1%；吞吐量不低于基线 90% |
  | 输出产物 | k6 HTML report、JUnit XML、基线对比差值 |
  | 失败处理 | 阻断生产部署；区分环境抖动与真实回归 |
  | Demo 映射 | `performance-testing-platform/`、`performance-ci.yml`、`nightly-soak.yml` |

  **重点**：性能基线验证的核心不是追求绝对性能，而是在每次发布前检测性能退化。区分"环境抖动"和"真实回归"是门禁可信度的关键。
  ```

- [ ] **Step 2: 将原 `## 场景 10：Flaky Test 治理` 改为 `## 场景 11：Flaky Test 治理`**

- [ ] **Step 3: 将原 `## 场景 11：测试数据管理` 改为 `## 场景 12：测试数据管理`**

- [ ] **Step 4: 验证文件结构**

  ```bash
  grep -n "^## 场景" cicd-demo/docs/reference/QA-CICD-SCENARIOS.md
  ```

  预期输出（12 行，编号连续 1-12）：
  ```
  ## 场景 1：...
  ## 场景 2：...
  ...
  ## 场景 10：性能基线验证...
  ## 场景 11：Flaky Test 治理...
  ## 场景 12：测试数据管理...
  ```

---

### Task 2: 更新反模式引用和 MVP 说明

**Files:**
- Modify: `cicd-demo/docs/reference/QA-CICD-SCENARIOS.md`

- [ ] **Step 1: 更新反模式表中的场景编号引用**

  将：
  ```
  建立 Flaky Test 治理（场景 10）
  ```
  改为：
  ```
  建立 Flaky Test 治理（场景 11）
  ```

- [ ] **Step 2: 更新 MVP 说明文字**

  将：
  ```
  如果团队刚开始建设 CI/CD QA，建议先实现以下 5 项：
  ```
  改为：
  ```
  如果团队刚开始建设 CI/CD QA，建议先实现以下 6 项：
  ```

- [ ] **Step 3: 在 MVP 表格末尾新增第 6 行**

  在现有第 5 行（产物归档）之后追加：

  ```markdown
  | 6 | 性能基线验证 | staging 后跑 k6 smoke，P95 超阈值阻断 production |
  ```

- [ ] **Step 4: 验证反模式和 MVP**

  ```bash
  grep -n "场景 1[012]" cicd-demo/docs/reference/QA-CICD-SCENARIOS.md
  grep -n "6 项\|性能基线" cicd-demo/docs/reference/QA-CICD-SCENARIOS.md
  ```

  预期：
  - `场景 11` 出现在反模式表中
  - `6 项` 出现在 MVP 说明文字中
  - `性能基线` 出现在 MVP 表和场景 10 标题

---

### Task 3: 验证并提交

**Files:**
- Modify: `cicd-demo/docs/reference/QA-CICD-SCENARIOS.md`

- [ ] **Step 1: 运行 markdown link check**

  ```bash
  bash scripts/check-markdown-links.sh
  ```

  预期：无报错（新场景无新增外部链接）

- [ ] **Step 2: 确认变更**

  ```bash
  git diff cicd-demo/docs/reference/QA-CICD-SCENARIOS.md
  ```

  确认包含：新场景 10 标题、场景 11/12 标题、`6 项`、MVP 第 6 行、`（场景 11）`。

- [ ] **Step 3: 提交**

  ```bash
  git add cicd-demo/docs/reference/QA-CICD-SCENARIOS.md
  git commit -m "docs(cicd-demo): add scenario 10 perf baseline, renumber 10-11 (#283)"
  ```

  > ⚠️ Subject 长度硬上限 72 字符，提交前验证：
  > ```bash
  > SUBJECT="docs(cicd-demo): add scenario 10 perf baseline, renumber 10-11 (#283)"
  > echo "len=${#SUBJECT}"
  > ```

---

### Task 4: 推送并开 PR

- [ ] **Step 1: 推送分支**

  ```bash
  git push -u origin docs/qa-cicd-scenario-perf-baseline
  ```

- [ ] **Step 2: 创建 PR**

  ```bash
  gh pr create \
    --title "docs(cicd-demo): add scenario 10 perf baseline, renumber 10→11/12 (#283)" \
    --body "$(cat <<'EOF'
  ## Summary

  - 新增场景 10：性能基线验证（Performance Baseline Gate）
  - 原场景 10（Flaky Test 治理）顺延为场景 11
  - 原场景 11（测试数据管理）顺延为场景 12
  - 反模式引用更新：`（场景 10）` → `（场景 11）`
  - MVP 说明更新：`5 项` → `6 项`，新增第 6 行

  Closes #283

  ## Test plan

  - [ ] `grep -n "^## 场景" cicd-demo/docs/reference/QA-CICD-SCENARIOS.md` 输出 12 行连续编号
  - [ ] MVP 表有 6 行，说明文字为"6 项"
  - [ ] 反模式表引用为"场景 11"
  - [ ] `bash scripts/check-markdown-links.sh` 无报错

  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  EOF
  )"
  ```

  > ⚠️ PR title 同样受 72 字符限制校验，提交前确认长度：
  > ```bash
  > TITLE="docs(cicd-demo): add scenario 10 perf baseline, renumber 10→11/12 (#283)"
  > echo "len=${#TITLE}"
  > ```
