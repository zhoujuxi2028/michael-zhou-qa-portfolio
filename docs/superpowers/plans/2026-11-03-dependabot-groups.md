# Dependabot Groups 聚合配置 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 .github/dependabot.yml 的全部 22 个 updates 条目添加 groups 配置，将每个条目内的多包升级聚合为 routine-updates 和 major-updates 两类 PR，预计将每周 PR 数从 ~53 降至 ~22

**Architecture:** 纯配置变更，不涉及代码逻辑。在每个 updates 条目内添加 groups 块，按 update-type 分组：minor-and-patch 合并为一个 PR，major 升级单独一个 PR。安全更新不受影响，始终独立创建。

**Tech Stack:** GitHub Dependabot YAML schema v2，gh CLI，yamllint

---

## 背景与可行性说明

**Issue #813** — 为 dependabot.yml 添加 groups 聚合配置，减少每周 PR 数量。

当前状态：**22 个** updates 条目（github-actions×1, npm×7, terraform×1, docker×6, pip×7），每周产生约 53 个 PR，review 和合并开销大。

> ⚠️ Issue #813 原文写"24个条目"有误，实际 dependabot.yml 经核实为 22 个条目。

**技术约束（可行性分析结论）**：

- `groups` **只作用于单个 updates 条目内部**（相同目录 + 相同 ecosystem 的多个包 → 合并为 1 个 PR）
- **无法跨目录或跨 ecosystem 合并**，22 个条目是每周 PR 数量的理论下限
- 安全更新（security updates）始终单独创建 PR，不受 groups 影响
- 分组策略：`routine-updates`（minor+patch，低风险批量合并），`major-updates`（需人工 review）
- docker 条目每个目录通常只有 1 个镜像，groups 对单包条目无聚合效果，但统一添加保持配置一致性

**预期效果**：每个条目内的多包升级聚合为最多 2 个 PR（routine / major），将每周 ~53 个 PR 降至约 ~22 个。

---

### Task 1: 创建 Stage 2 文档骨架

**目的**：补充本次变更所需的架构说明、测试计划、风险清单文档，作为后续 PR 审查的参考基础。

**Files:**
- Create: `docs/architecture/architecture.md`
- Create: `docs/qa/test-plan.md`
- Create: `docs/project-management/risks.md`

- [ ] **Step 1: 创建 `docs/architecture/architecture.md`**

  文件内容如下：

  ```markdown
  # Architecture — Dependabot Groups 聚合配置

  ## 变更类型

  纯配置变更（YAML），不涉及应用代码逻辑。

  ## 当前架构

  `.github/dependabot.yml` 包含 **22 个** updates 条目：

  | Ecosystem       | 条目数 | 目录                                                                  |
  |-----------------|--------|-----------------------------------------------------------------------|
  | github-actions  | 1      | /                                                                     |
  | npm             | 7      | /, /cicd-demo, /playwright-demo, /microservice-testing-platform,      |
  |                 |        | /performance-testing-platform, /api-testing-demo, /iwsva-cypress-e2e |
  | terraform       | 1      | /cicd-demo/terraform                                                  |
  | docker          | 6      | /cicd-demo, /k8s-auto-testing-platform/app,                          |
  |                 |        | /microservice-testing-platform/services/inventory-service,            |
  |                 |        | /microservice-testing-platform/services/order-service,                |
  |                 |        | /microservice-testing-platform/services/payment-service,              |
  |                 |        | /performance-testing-platform                                         |
  | pip             | 7      | /ai-testing-platform, /k8s-auto-testing-platform,                    |
  |                 |        | /k8s-auto-testing-platform/app, /robot-framework-demo,               |
  |                 |        | /security-testing-demo, /selenium-demo, /sid-iam-testing-platform    |
  | **合计**        | **22** |                                                                       |

  每次 Dependabot 扫描，22 个条目各自独立产生 PR，无聚合，导致每周约 53 个 PR。

  ## 目标架构

  在每个 updates 条目内增加 `groups` 字段，按 `update-type` 分为两组：

  - `minor-and-patch`：包含 `minor` 和 `patch` 类型升级 → 同条目内合为 1 个 PR
  - `major`：包含 `major` 类型升级 → 同条目内合为 1 个 PR（需人工审查）

  安全更新（`security updates`）不受 groups 影响，始终独立创建 PR。

  ## 约束

  - `groups` 仅作用于同一 updates 条目内部（相同目录 + 相同 ecosystem）
  - 跨目录、跨 ecosystem 的合并不受支持
  - 22 个条目是每周 PR 数量的理论下限
  - docker 条目单镜像场景下 groups 无实际聚合效果，但统一添加保持配置一致性

  ## 预期效果

  每个条目内的多包升级从 N 个 PR 降为最多 2 个（routine 和 major），全局每周 PR 从 ~53 降至 ~22。
  ```

- [ ] **Step 2: 创建 `docs/qa/test-plan.md`**

  文件内容如下：

  ```markdown
  # Test Plan — Dependabot Groups 聚合配置

  **Issue:** #813
  **变更类型:** 纯配置变更（.github/dependabot.yml）
  **测试目标:** 验证 groups 配置语法正确，不破坏现有 Dependabot 行为

  ## 测试策略

  本次变更为纯 YAML 配置，无运行时代码，测试重点为：

  1. YAML 语法验证
  2. Dependabot schema 合规性验证
  3. 功能行为观测（通过 Dependabot 实际扫描结果）

  ## 测试用例

  ### TC-01: YAML 语法验证

  - **工具:** `python3 -c "import yaml; yaml.safe_load(open('.github/dependabot.yml'))"`
  - **预期:** 无异常输出，退出码 0
  - **通过标准:** 文件可被 YAML 解析器成功加载

  ### TC-02: yamllint 风格检查

  - **工具:** `yamllint .github/dependabot.yml`
  - **预期:** 无 ERROR 级别警告
  - **通过标准:** 输出为空或仅含 WARNING

  ### TC-03: 条目数量验证

  - **命令:** `grep -c "package-ecosystem" .github/dependabot.yml`
  - **预期输出:** `22`
  - **通过标准:** 条目数量未减少，覆盖范围完整

  ### TC-04: groups 语义结构验证（优先于 grep）

  - **命令:**
    ```bash
    python3 -c "
    import yaml
    data = yaml.safe_load(open('.github/dependabot.yml'))
    entries_with_groups = [u for u in data['updates'] if 'groups' in u]
    print(f'{len(entries_with_groups)} / {len(data[\"updates\"])} entries have groups configured')
    assert len(entries_with_groups) == len(data['updates']), 'Missing groups!'
    print('All entries covered.')
    "
    ```
  - **预期输出:** `22 / 22 entries have groups configured` + `All entries covered.`
  - **通过标准:** 所有 22 个条目均已在正确层级添加 groups（语义验证，非字符串匹配）

  ### TC-05: Dependabot 实际行为观测（人工）

  - **方式:** 合并 PR 后，等待下一次 Dependabot 每周扫描（周一）
  - **观测指标:** 创建的 PR 数量是否显著减少
  - **通过标准:** 每次扫描 PR 数量 ≤ 22（含 major-updates 组 PR）
  - **注意:** 若 PR 数量降幅不明显，检查是否因 docker 单镜像条目占比高（docker 6个条目对 groups 无实际聚合效果）

  ## 回滚计划

  如 groups 配置导致 Dependabot 异常行为（如停止创建 PR 或频率异常），
  通过 revert commit 还原至添加 groups 前的版本。
  ```

- [ ] **Step 3: 创建 `docs/project-management/risks.md`**

  文件内容如下：

  ```markdown
  # Risks — Dependabot Groups 聚合配置

  **Issue:** #813
  **更新日期:** 2026-11-03

  ## 风险清单

  | ID    | 风险描述                                              | 概率 | 影响 | 缓解措施                                              |
  |-------|-------------------------------------------------------|------|------|-------------------------------------------------------|
  | R-001 | groups 配置导致 Dependabot 停止扫描某些条目           | 低   | 高   | 合并后观测首次周一扫描结果；若异常立即 revert          |
  | R-002 | major 组 PR 积压，人工 review 滞后                    | 中   | 低   | major 组 PR 较少，滞后可接受；必要时将 major 设为忽略 |
  | R-003 | YAML 语法错误导致 dependabot.yml 整体失效             | 低   | 高   | PR 合并前运行 yamllint + python yaml 双重语法验证      |
  | R-004 | 安全更新被 groups 抑制（误解）                         | 低   | 高   | Dependabot 安全更新机制独立于 groups，不受影响         |
  | R-005 | 条目覆盖不完整（少于 22 个条目添加 groups）           | 中   | 低   | Python 语义验证：检查所有 updates 条目均含 groups 字段 |
  | R-006 | docker 单镜像条目 groups 无聚合效果，PR 降幅不及预期  | 中   | 低   | 合并后观测 2 个周期（2周）实际 PR 数量；基线 ~53，目标 ~22 |

  ## 不在范围内的风险

  - 应用运行时稳定性（本次为纯配置变更，不影响代码）
  - CI/CD 流水线中断（dependabot.yml 语法错误会让 Dependabot 停止更新，但不影响其他 workflow）
  ```

- [ ] **Step 4: 验证文档目录结构**

  ```bash
  ls docs/architecture/ docs/qa/ docs/project-management/
  ```

  预期输出包含：
  ```
  docs/architecture/:
  architecture.md

  docs/qa/:
  test-plan.md

  docs/project-management/:
  risks.md
  ```

---

### Task 2: 添加 groups 到 github-actions + npm 条目（共 8 个：1+7）

**目的**：为 1 个 github-actions 条目和 7 个 npm 条目添加 groups 聚合配置。

**Files:**
- Modify: `.github/dependabot.yml`

每个条目统一插入以下 groups 块（位于 `commit-message` 字段之后）：

```yaml
    groups:
      routine-updates:
        update-types:
          - "minor"
          - "patch"
      major-updates:
        update-types:
          - "major"
```

- [ ] **Step 1: 为 `github-actions @ /` 添加 groups**

  定位条目：
  ```yaml
  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
  ```

  修改后完整条目：
  ```yaml
  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    labels:
      - "enhancement"
    commit-message:
      prefix: "chore(actions)"
    groups:
      routine-updates:
        update-types:
          - "minor"
          - "patch"
      major-updates:
        update-types:
          - "major"
  ```

- [ ] **Step 2: 为 `npm @ /`（root）添加 groups**

  修改后完整条目：
  ```yaml
  # npm — root
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    labels:
      - "enhancement"
    commit-message:
      prefix: "chore(root)"
    groups:
      routine-updates:
        update-types:
          - "minor"
          - "patch"
      major-updates:
        update-types:
          - "major"
  ```

- [ ] **Step 3: 为 `npm @ /cicd-demo` 添加 groups**

  修改后完整条目：
  ```yaml
  # npm — cicd-demo
  - package-ecosystem: "npm"
    directory: "/cicd-demo"
    schedule:
      interval: "weekly"
      day: "monday"
    labels:
      - "enhancement"
      - "cicd"
    commit-message:
      prefix: "chore(cicd-demo)"
    groups:
      routine-updates:
        update-types:
          - "minor"
          - "patch"
      major-updates:
        update-types:
          - "major"
  ```

- [ ] **Step 4: 为 `npm @ /playwright-demo` 添加 groups**

  修改后完整条目：
  ```yaml
  # npm — playwright-demo
  - package-ecosystem: "npm"
    directory: "/playwright-demo"
    schedule:
      interval: "weekly"
      day: "monday"
    labels:
      - "enhancement"
      - "playwright"
    commit-message:
      prefix: "chore(playwright-demo)"
    groups:
      routine-updates:
        update-types:
          - "minor"
          - "patch"
      major-updates:
        update-types:
          - "major"
  ```

- [ ] **Step 5: 为 `npm @ /microservice-testing-platform` 添加 groups**

  修改后完整条目：
  ```yaml
  # npm — microservice-testing-platform
  - package-ecosystem: "npm"
    directory: "/microservice-testing-platform"
    schedule:
      interval: "weekly"
      day: "monday"
    labels:
      - "enhancement"
      - "microservice"
    commit-message:
      prefix: "chore(microservice)"
    groups:
      routine-updates:
        update-types:
          - "minor"
          - "patch"
      major-updates:
        update-types:
          - "major"
  ```

- [ ] **Step 6: 为 `npm @ /performance-testing-platform` 添加 groups**

  修改后完整条目：
  ```yaml
  # npm — performance-testing-platform
  - package-ecosystem: "npm"
    directory: "/performance-testing-platform"
    schedule:
      interval: "weekly"
      day: "monday"
    labels:
      - "enhancement"
      - "performance-testing"
    commit-message:
      prefix: "chore(perf)"
    groups:
      routine-updates:
        update-types:
          - "minor"
          - "patch"
      major-updates:
        update-types:
          - "major"
  ```

- [ ] **Step 7: 为 `npm @ /api-testing-demo` 添加 groups**

  修改后完整条目：
  ```yaml
  # npm — api-testing-demo
  - package-ecosystem: "npm"
    directory: "/api-testing-demo"
    schedule:
      interval: "weekly"
      day: "monday"
    labels:
      - "enhancement"
      - "api-testing"
    commit-message:
      prefix: "chore(api-testing)"
    groups:
      routine-updates:
        update-types:
          - "minor"
          - "patch"
      major-updates:
        update-types:
          - "major"
  ```

- [ ] **Step 8: 为 `npm @ /iwsva-cypress-e2e` 添加 groups**

  修改后完整条目：
  ```yaml
  # npm — iwsva-cypress-e2e
  - package-ecosystem: "npm"
    directory: "/iwsva-cypress-e2e"
    schedule:
      interval: "weekly"
      day: "monday"
    labels:
      - "enhancement"
      - "cypress-e2e"
    commit-message:
      prefix: "chore(cypress)"
    groups:
      routine-updates:
        update-types:
          - "minor"
          - "patch"
      major-updates:
        update-types:
          - "major"
  ```

- [ ] **Step 9: 阶段性语法验证**

  ```bash
  python3 -c "import yaml; yaml.safe_load(open('.github/dependabot.yml')); print('OK')"
  grep -c "minor-and-patch" .github/dependabot.yml
  ```

  预期输出：
  ```
  OK
  8
  ```

---

### Task 3: 添加 groups 到 terraform + docker 条目（共 7 个：1+6）

**目的**：为 1 个 terraform 条目和 6 个 docker 条目添加 groups 配置。注意：docker 条目每目录通常只有 1 个镜像，groups 对单包条目无实际聚合效果，但统一添加保持配置一致性，并为未来多镜像场景预备。

**Files:**
- Modify: `.github/dependabot.yml`

- [ ] **Step 1: 为 `terraform @ /cicd-demo/terraform` 添加 groups**

  修改后完整条目：
  ```yaml
  # Terraform — cicd-demo
  - package-ecosystem: "terraform"
    directory: "/cicd-demo/terraform"
    schedule:
      interval: "weekly"
      day: "monday"
    labels:
      - "enhancement"
      - "cicd"
    commit-message:
      prefix: "chore(terraform)"
    groups:
      routine-updates:
        update-types:
          - "minor"
          - "patch"
      major-updates:
        update-types:
          - "major"
  ```

- [ ] **Step 2: 为 `docker @ /cicd-demo` 添加 groups**

  修改后完整条目：
  ```yaml
  # Docker — cicd-demo
  - package-ecosystem: "docker"
    directory: "/cicd-demo"
    schedule:
      interval: "weekly"
      day: "monday"
    labels:
      - "enhancement"
      - "cicd"
    commit-message:
      prefix: "chore(docker-cicd)"
    groups:
      routine-updates:
        update-types:
          - "minor"
          - "patch"
      major-updates:
        update-types:
          - "major"
  ```

- [ ] **Step 3: 为 `docker @ /k8s-auto-testing-platform/app` 添加 groups**

  修改后完整条目：
  ```yaml
  # Docker — k8s-auto-testing-platform
  - package-ecosystem: "docker"
    directory: "/k8s-auto-testing-platform/app"
    schedule:
      interval: "weekly"
      day: "monday"
    labels:
      - "enhancement"
      - "k8s"
    commit-message:
      prefix: "chore(docker-k8s)"
    groups:
      routine-updates:
        update-types:
          - "minor"
          - "patch"
      major-updates:
        update-types:
          - "major"
  ```

- [ ] **Step 4: 为 `docker @ /microservice-testing-platform/services/inventory-service` 添加 groups**

  修改后完整条目：
  ```yaml
  # Docker — microservice inventory-service
  - package-ecosystem: "docker"
    directory: "/microservice-testing-platform/services/inventory-service"
    schedule:
      interval: "weekly"
      day: "monday"
    labels:
      - "enhancement"
      - "microservice"
    commit-message:
      prefix: "chore(docker-microservice)"
    groups:
      routine-updates:
        update-types:
          - "minor"
          - "patch"
      major-updates:
        update-types:
          - "major"
  ```

- [ ] **Step 5: 为 `docker @ /microservice-testing-platform/services/order-service` 添加 groups**

  修改后完整条目：
  ```yaml
  # Docker — microservice order-service
  - package-ecosystem: "docker"
    directory: "/microservice-testing-platform/services/order-service"
    schedule:
      interval: "weekly"
      day: "monday"
    labels:
      - "enhancement"
      - "microservice"
    commit-message:
      prefix: "chore(docker-microservice)"
    groups:
      routine-updates:
        update-types:
          - "minor"
          - "patch"
      major-updates:
        update-types:
          - "major"
  ```

- [ ] **Step 6: 为 `docker @ /microservice-testing-platform/services/payment-service` 添加 groups**

  修改后完整条目：
  ```yaml
  # Docker — microservice payment-service
  - package-ecosystem: "docker"
    directory: "/microservice-testing-platform/services/payment-service"
    schedule:
      interval: "weekly"
      day: "monday"
    labels:
      - "enhancement"
      - "microservice"
    commit-message:
      prefix: "chore(docker-microservice)"
    groups:
      routine-updates:
        update-types:
          - "minor"
          - "patch"
      major-updates:
        update-types:
          - "major"
  ```

- [ ] **Step 7: 为 `docker @ /performance-testing-platform` 添加 groups**

  修改后完整条目：
  ```yaml
  # Docker — performance-testing-platform
  - package-ecosystem: "docker"
    directory: "/performance-testing-platform"
    schedule:
      interval: "weekly"
      day: "monday"
    labels:
      - "enhancement"
      - "performance-testing"
    commit-message:
      prefix: "chore(docker-perf)"
    groups:
      routine-updates:
        update-types:
          - "minor"
          - "patch"
      major-updates:
        update-types:
          - "major"
  ```

- [ ] **Step 8: 阶段性语法验证**

  ```bash
  python3 -c "import yaml; yaml.safe_load(open('.github/dependabot.yml')); print('OK')"
  python3 -c "
  import yaml
  data = yaml.safe_load(open('.github/dependabot.yml'))
  n = sum(1 for u in data['updates'] if 'groups' in u)
  print(f'{n} entries have groups')
  "
  ```

  预期输出：
  ```
  OK
  15 entries have groups
  ```

---

### Task 4: 添加 groups 到 pip 条目（共 7 个）

**目的**：为全部 7 个 pip 条目添加 groups 配置，完成对 22 个 updates 条目的全覆盖。

**Files:**
- Modify: `.github/dependabot.yml`

- [ ] **Step 1: 为 `pip @ /ai-testing-platform` 添加 groups**

  修改后完整条目：
  ```yaml
  # pip — ai-testing-platform
  - package-ecosystem: "pip"
    directory: "/ai-testing-platform"
    schedule:
      interval: "weekly"
      day: "monday"
    labels:
      - "enhancement"
      - "ai-testing"
    commit-message:
      prefix: "chore(ai-testing)"
    groups:
      routine-updates:
        update-types:
          - "minor"
          - "patch"
      major-updates:
        update-types:
          - "major"
  ```

- [ ] **Step 2: 为 `pip @ /k8s-auto-testing-platform`（root）添加 groups**

  修改后完整条目：
  ```yaml
  # pip — k8s-auto-testing-platform (root)
  - package-ecosystem: "pip"
    directory: "/k8s-auto-testing-platform"
    schedule:
      interval: "weekly"
      day: "monday"
    labels:
      - "enhancement"
      - "k8s"
    commit-message:
      prefix: "chore(k8s)"
    groups:
      routine-updates:
        update-types:
          - "minor"
          - "patch"
      major-updates:
        update-types:
          - "major"
  ```

- [ ] **Step 3: 为 `pip @ /k8s-auto-testing-platform/app` 添加 groups**

  修改后完整条目：
  ```yaml
  # pip — k8s-auto-testing-platform (app)
  - package-ecosystem: "pip"
    directory: "/k8s-auto-testing-platform/app"
    schedule:
      interval: "weekly"
      day: "monday"
    labels:
      - "enhancement"
      - "k8s"
    commit-message:
      prefix: "chore(k8s)"
    groups:
      routine-updates:
        update-types:
          - "minor"
          - "patch"
      major-updates:
        update-types:
          - "major"
  ```

- [ ] **Step 4: 为 `pip @ /robot-framework-demo` 添加 groups**

  修改后完整条目：
  ```yaml
  # pip — robot-framework-demo
  - package-ecosystem: "pip"
    directory: "/robot-framework-demo"
    schedule:
      interval: "weekly"
      day: "monday"
    labels:
      - "enhancement"
      - "robot-framework"
    commit-message:
      prefix: "chore(robot)"
    groups:
      routine-updates:
        update-types:
          - "minor"
          - "patch"
      major-updates:
        update-types:
          - "major"
  ```

- [ ] **Step 5: 为 `pip @ /security-testing-demo` 添加 groups**

  修改后完整条目：
  ```yaml
  # pip — security-testing-demo
  - package-ecosystem: "pip"
    directory: "/security-testing-demo"
    schedule:
      interval: "weekly"
      day: "monday"
    labels:
      - "enhancement"
      - "security-testing"
    commit-message:
      prefix: "chore(security)"
    groups:
      routine-updates:
        update-types:
          - "minor"
          - "patch"
      major-updates:
        update-types:
          - "major"
  ```

- [ ] **Step 6: 为 `pip @ /selenium-demo` 添加 groups**

  修改后完整条目：
  ```yaml
  # pip — selenium-demo
  - package-ecosystem: "pip"
    directory: "/selenium-demo"
    schedule:
      interval: "weekly"
      day: "monday"
    labels:
      - "enhancement"
      - "selenium"
    commit-message:
      prefix: "chore(selenium)"
    groups:
      routine-updates:
        update-types:
          - "minor"
          - "patch"
      major-updates:
        update-types:
          - "major"
  ```

- [ ] **Step 7: 为 `pip @ /sid-iam-testing-platform` 添加 groups**

  修改后完整条目：
  ```yaml
  # pip — sid-iam-testing-platform
  - package-ecosystem: "pip"
    directory: "/sid-iam-testing-platform"
    schedule:
      interval: "weekly"
      day: "monday"
    labels:
      - "enhancement"
      - "sid-iam"
    commit-message:
      prefix: "chore(sid-iam)"
    groups:
      routine-updates:
        update-types:
          - "minor"
          - "patch"
      major-updates:
        update-types:
          - "major"
  ```

- [ ] **Step 8: 阶段性验证（Task 4 完成后）**

  ```bash
  python3 -c "
  import yaml
  data = yaml.safe_load(open('.github/dependabot.yml'))
  entries_with_groups = [u for u in data['updates'] if 'groups' in u]
  print(f'{len(entries_with_groups)} / {len(data[\"updates\"])} entries have groups configured')
  assert len(entries_with_groups) == len(data['updates']), 'Missing groups on some entries!'
  print('All entries covered.')
  "
  ```

  预期输出：
  ```
  22 / 22 entries have groups configured
  All entries covered.
  ```

---

### Task 5: 验证与提交

**目的**：验证 YAML 语法正确、groups 覆盖完整，提交变更并开 PR 关联 Issue #813。

**Files:**
- Modify: `.github/dependabot.yml`（最终验证）

- [ ] **Step 1: YAML 语法验证（python3）**

  ```bash
  python3 -c "import yaml; yaml.safe_load(open('.github/dependabot.yml')); print('YAML syntax OK')"
  ```

  预期输出：
  ```
  YAML syntax OK
  ```

  若失败（YAML 解析错误），检查报错行号，修正缩进或引号问题后重新验证。

- [ ] **Step 2: yamllint 风格验证（可选，推荐）**

  ```bash
  yamllint .github/dependabot.yml
  ```

  预期输出：空（无 ERROR），或仅含 `warning` 级别提示（如行长度）。

  若未安装 yamllint，可跳过此步，python3 验证已足够。

- [ ] **Step 3: 条目数量验证**

  ```bash
  grep -c "package-ecosystem" .github/dependabot.yml
  ```

  预期输出：
  ```
  22
  ```

  确认条目数量未减少，覆盖范围完整。

- [ ] **Step 4: groups 语义结构验证（关键）**

  ```bash
  python3 -c "
  import yaml
  data = yaml.safe_load(open('.github/dependabot.yml'))
  entries_with_groups = [u for u in data['updates'] if 'groups' in u]
  total = len(data['updates'])
  covered = len(entries_with_groups)
  print(f'{covered} / {total} entries have groups configured')
  assert covered == total, f'Missing groups on {total - covered} entries!'
  print('All entries covered. Verification PASSED.')
  "
  ```

  预期输出：
  ```
  22 / 22 entries have groups configured
  All entries covered. Verification PASSED.
  ```

  此验证为语义级检查（groups 字段确实存在于每个条目中），优于 grep 字符串匹配。

- [ ] **Step 5: 通过 gh API 验证文件更新已提交**

  ```bash
  gh api repos/zhoujuxi2028/michael-zhou-qa-portfolio/contents/.github/dependabot.yml \
    --jq '.sha'
  ```

  预期：返回当前文件的 SHA 值（非空字符串），确认文件已存在于远端仓库。

- [ ] **Step 6: 提交变更**

  ```bash
  git add .github/dependabot.yml docs/architecture/architecture.md docs/qa/test-plan.md docs/project-management/risks.md
  git commit -m "chore: add dependabot groups config for all 22 entries (issue #813)

  - Add groups with routine-updates and major-updates to all 22 updates entries
  - Cover github-actions (1), npm (7), terraform (1), docker (6), pip (7) entries
  - Expected weekly PR reduction: ~53 -> ~22
  - Add supporting docs: architecture.md, test-plan.md, risks.md"
  ```

- [ ] **Step 7: 推送并开 PR**

  ```bash
  git push origin HEAD
  gh pr create \
    --title "chore: add dependabot groups config to all 22 entries (closes #813)" \
    --body "## Summary

  Adds \`groups\` configuration to all 22 \`.github/dependabot.yml\` update entries to reduce weekly PR count.

  ## Changes

  - Added \`routine-updates\` (minor+patch) and \`major-updates\` groups to all 22 updates entries
  - Ecosystems covered: github-actions (1), npm (7), terraform (1), docker (6), pip (7) entries
  - Added supporting documentation: architecture.md, test-plan.md, risks.md

  ## Expected Impact

  | Metric | Before | After |
  |--------|--------|-------|
  | Updates entries | 22 | 22 (unchanged) |
  | Estimated weekly PRs | ~53 | ~22 |
  | Security update behavior | Independent | Independent (unchanged) |

  ## Technical Notes

  - \`groups\` applies within a single updates entry only (same directory + ecosystem)
  - Cross-directory merging is not supported by Dependabot
  - Security updates are always created as separate PRs, unaffected by groups config
  - 22 entries are the theoretical minimum for weekly PR count
  - docker entries (6) have single images per directory — groups adds no PR reduction there, but is added for consistency

  ## Verification

  - [ ] YAML syntax validated: \`python3 -c \"import yaml; yaml.safe_load(open('.github/dependabot.yml'))\"\`
  - [ ] 22 entries confirmed: \`grep -c package-ecosystem .github/dependabot.yml\`
  - [ ] Semantic groups coverage: Python assertion all 22 entries contain groups field

  Closes #813" \
    --label "enhancement"
  ```

  预期输出：PR URL（格式为 `https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/pull/NNN`）

- [ ] **Step 8: 验证 PR 已创建并关联 Issue**

  ```bash
  gh pr view --web
  ```

  在浏览器中确认：
  - PR 标题正确
  - PR 描述包含 `Closes #813`
  - PR 关联到 Issue #813
  - CI checks 通过（若有）

---

## 附录：完整 groups 模板

每个 updates 条目统一使用以下 groups 块，缩进对齐 `commit-message` 字段（4 个空格）：

```yaml
    groups:
      routine-updates:
        update-types:
          - "minor"
          - "patch"
      major-updates:
        update-types:
          - "major"
```

**说明：**

- `routine-updates` 组：将同一条目内所有 minor 和 patch 版本升级合并为 1 个 PR，降低 review 开销
- `major-updates` 组：将同一条目内所有 major 版本升级合并为 1 个 PR，需人工审查破坏性变更
- 安全更新（CVE 修复）：始终由 Dependabot 单独创建 PR，与 groups 配置无关
- 分组名称（`routine-updates`、`major-updates`）可自定义，但需在同一条目内唯一
- ⚠️ `update-types` 字段只接受 `"patch"` / `"minor"` / `"major"` 三个独立字符串值；分组名是用户自定义标识符，不要与这三个值混淆

---

*Plan generated for Issue #813 | 2026-11-03*
