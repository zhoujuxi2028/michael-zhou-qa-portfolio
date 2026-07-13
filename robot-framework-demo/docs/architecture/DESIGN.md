# Robot Framework Demo — Design Document

> Pabot + Selenium Grid + Rebot 三组件并行测试演示项目
> **Version**: robot-framework-demo/v1.0.0-pabot-grid-rebot (2026-07-13, 9/9 PASS, 26.14s, 4 proc + pabotlib)

---

## 1. Project Overview

基于 Robot Framework 生态的并行测试演示，验证三组件组合在生产级场景下的可行性。

**Key Metrics**:
- 9 test cases, 3 suite files, 2 browser engines
- 2x Chrome nodes + 2x Firefox nodes (Grid)
- 4 parallel processes (local) / 2 parallel processes (CI)
- 9/9 PASS, ~30s total execution (4 processes, local)

**Components**:

| 组件 | 版本 | 角色 |
|------|------|------|
| Robot Framework | 7.4 | 关键字驱动测试框架 |
| Pabot | 5.2 | 并行执行调度器 |
| SeleniumLibrary | 6.9 | WebDriver 封装 |
| Selenium Grid 4 | 4.21.0 | 分布式浏览器节点管理 |
| Rebot | (内置) | 测试结果合并与报告生成 |
| Docker Compose | v2 | Grid 环境编排 |

---

## 2. Architecture

### 2.1 Three-Component Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        Pabot 调度器                           │
│   启动 N 个子进程，通过 PabotLib Server 动态分配任务            │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  P1      │  │  P2      │  │  P3      │  │  P4      │    │
│  │  suite_A │  │  suite_B │  │  suite_C │  │  (idle)  │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────┘    │
│       │              │              │                         │
│       ▼              ▼              ▼                         │
│  ┌─────────────────────────────────────────────────────┐     │
│  │              Selenium Grid Hub                        │     │
│  │  127.0.0.1:4444 ← 路由 WebDriver 请求到可用节点       │     │
│  ├───────────────┬───────────────┬──────────────────────┤     │
│  │ Chrome Node 1 │ Chrome Node 2 │ Firefox Node 1 / 2   │     │
│  │ max_sessions  │ max_sessions  │ max_sessions=3       │     │
│  │ =3            │ =3            │                       │     │
│  └───────┬───────┴───────┬───────┴──────┬───────────────┘     │
│          │               │              │                      │
│          ▼               ▼              ▼                      │
│  ┌─────────────────────────────────────────────────────┐     │
│  │               Rebot 报告合并                          │     │
│  │  pabot_results/     ┌──────────────────────┐         │     │
│  │  0/output.xml  ───→ │  rebot --merge       │         │     │
│  │  1/output.xml  ───→ │  → output.xml       │         │     │
│  │  2/output.xml  ───→ │  → report.html      │         │     │
│  │                     │  → log.html          │         │     │
│  │                     └──────────────────────┘         │     │
│  └─────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Execution Sequence

```
User/CI                    Pabot            Grid Hub       Browser Nodes    Rebot
  │                         │                 │                │             │
  │  pabot --processes 4    │                 │                │             │
  │────────────────────────→│                 │                │             │
  │                         │  PabotLib       │                │             │
  │                         │  Server:8270    │                │             │
  │                         │────────────────→│                │             │
  │                         │                 │                │             │
  │                         │ 分配 suite_A    │                │             │
  │                         │──── P1 ───────→│                │             │
  │                         │                 │ Route to Node  │             │
  │                         │                 │───────────────→│             │
  │                         │ 分配 suite_B    │                │             │
  │                         │──── P2 ───────→│                │             │
  │                         │                 │                │             │
  │                         │ 分配 suite_C    │                │             │
  │                         │──── P3 ───────→│                │             │
  │                         │                 │                │             │
  │                         │  P1/P2/P3 执行  │                │             │
  │                         │  ← ← ← ← ← ←  │← ← ← ← ← ← ← │             │
  │                         │                 │                │             │
  │                         │ output.xml x3   │                │             │
  │                         │─────────────────────────────────→│  rebot     │
  │                         │                                  │  --merge   │
  │                         │                                  │────────    │
  │                         │               report.html        │             │
  │                         │← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← │             │
```

---

## 3. Pabot Parallel Execution Design

### 3.1 Architecture

Pabot 是 Robot Framework 的并行执行扩展。核心机制：

```
Pabot 主进程
  ├── 启动 PabotLib Server (TCP 127.0.0.1:8270)
  ├── 扫描 tests/ 目录获取 .robot 文件列表
  ├── 缓存套件结构到 .pabotsuitenames
  ├── 启动 N 个子进程
  │   ├── 子进程通过 PabotLib 向 Server 请求任务
  │   ├── Server 从队列按序分配 .robot 套件
  │   └── 子进程执行完毕后报告结果
  └── 收集所有 output.xml → 输出到统一目录
```

### 3.2 Process Allocation Strategy

| 模式 | 粒度 | 命令 | 适用场景 |
|------|------|------|----------|
| Suite-level (默认) | .robot 文件 | `pabot --processes N` | 套件间无依赖 |
| Test-level | 单个 Test Case | `pabot --pabotlib --testlevel` | 套件内用例独立 |
| PabotLib 动态分配 | 文件级 | `pabot --pabotlib` | 进程空闲时自动取下一个任务 |

本项目使用 **suite-level + PabotLib**：
- 3 个 .robot 套件 + 1 空闲进程
- PabotLib 确保空闲进程可被后续任务复用

### 3.3 Process Count Decision

| 环境 | 核数 | Pabot 进程 | 原因 |
|------|------|-----------|------|
| Local (本机) | 4 | 4 | 匹配 CPU 核数，3 套件全并行 |
| CI (GitHub Actions) | 2 | 2 | 免费 runner 2 核限制 |

---

## 4. Selenium Grid Topology

### 4.1 Hub + Node 架构

```
┌─────────────────────────────────────┐
│         Selenium Grid Hub            │
│         Port: 4444                   │
│         Max Session: 6               │
│         Timeout: 120s                │
├──────────────────┬──────────────────┤
│   Chrome Node 1  │  Firefox Node 1  │
│   shm_size: 2gb  │  shm_size: 2gb   │
│   max_sessions:3 │  max_sessions:3  │
├──────────────────┼──────────────────┤
│   Chrome Node 2  │  Firefox Node 2  │
│   shm_size: 2gb  │  shm_size: 2gb   │
│   max_sessions:3 │  max_sessions:3  │
└──────────────────┴──────────────────┘
```

### 4.2 Session Routing

测试通过 `remote_url=http://localhost:4444/wd/hub` 连接到 Hub，Hub 按可用性将请求路由到任意注册的 Node。`SE_NODE_MAX_SESSIONS=3` 允许每个 Node 同时处理最多 3 个浏览器会话。

### 4.3 Docker Compose Configuration

```yaml
services:
  selenium-hub:
    image: selenium/hub:4.21.0
    ports: ["4444:4444"]
    environment:
      - GRID_MAX_SESSION=6
      - GRID_BROWSER_TIMEOUT=60

  chrome-node:
    image: selenium/node-chrome:4.21.0
    shm_size: 2gb
    deploy: { replicas: 2 }
    environment:
      - SE_NODE_MAX_SESSIONS=3

  firefox-node:
    image: selenium/node-firefox:4.21.0
    shm_size: 2gb
    deploy: { replicas: 2 }
    environment:
      - SE_NODE_MAX_SESSIONS=3
```

---

## 5. Rebot Report Merge

### 5.1 Merge Flow

```
Pabot 执行完毕
     │
     ├── results/pabot_results/0/output.xml  ← suite_A
     ├── results/pabot_results/1/output.xml  ← suite_B
     ├── results/pabot_results/2/output.xml  ← suite_C
     │
     ▼
rebot --outputdir results/merged --merge results/output.xml
     │
     ├── results/merged/report.html  ← 统一 HTML 报告
     ├── results/merged/log.html     ← 统一日志
     └── results/output.xml          ← 合并后的 XML
```

### 5.2 Key Parameters

| 参数 | 值 | 说明 |
|------|-----|------|
| `--merge` | — | 合并多个 XML 为一个 |
| `--name` | "CI 并行测试合并报告" | 报告标题 |
| `--outputdir` | results/merged | 输出目录 |

---

## 6. Test Design

### 6.1 Suite Structure

| 套件 | 文件 | 用例数 | 标签 | 测试目标 |
|------|------|--------|------|----------|
| Navigation | `01_navigation.robot` | 3 | smoke, navigation, P0/P1 | 页面加载、标题、DOM 元素 |
| Interaction | `02_interaction.robot` | 3 | smoke, interaction, P0/P1 | 链接点击、元素属性、href |
| Multi Browser | `03_multi_browser.robot` | 3 | cross-browser, P0/P1 | Chrome/Firefox 一致性 |

### 6.2 Test Case Design

每套件 3 用例，遵循 Arrange-Act-Assert 模式：

```robot
*** Test Cases ***
TC-NAV-001: 验证首页加载成功
    [Tags]    smoke    navigation    P0
    Open Browser To Grid    https://example.com
    Verify Page Title Contains    Example Domain
    [Teardown]    Close Browser Safely
```

### 6.3 Tag Strategy

| 标签 | 用途 | CI 执行 |
|------|------|---------|
| smoke | 冒烟测试（P0 级别） | 所有 PR |
| regression | 回归测试（P1 级别） | 手动触发 |
| cross-browser | 跨浏览器验证 | 所有 PR |
| P0/P1 | 优先级 | 分类报表 |

---

## 7. Environment Design

### 7.1 Local Environment

```bash
# macOS + OrbStack（Docker Desktop 替代品）
# OrbStack 兼容 Docker CLI，docker-compose 命令无需改动

source venv/bin/activate
pip install -r requirements.txt
docker-compose up -d           # OrbStack 自动处理容器运行时
pabot --processes 4 --pabotlib tests/
```

### 7.2 Proxy Handling (PDEF-009)

**设计缺陷**: Docker 容器继承宿主机 `HTTP_PROXY=http://127.0.0.1:7890`，但容器内 `127.0.0.1` 指向容器自身而非宿主机，导致 Chrome/Firefox 访问外网时 `ERR_PROXY_CONNECTION_FAILED`。

**修复**: 在 `docker-compose.yml` 各 service 中添加 `no_proxy` / `NO_PROXY` 覆盖：

```yaml
environment:
  - no_proxy=localhost,127.0.0.1,example.com,selenium-hub
  - NO_PROXY=localhost,127.0.0.1,example.com,selenium-hub
```

**技术选择**: 通过 `NO_PROXY` 绕过代理比通过 `host.docker.internal` 转发更可靠，因为本地代理不一定监听 `0.0.0.0`。

### 7.3 CI Environment

GitHub Actions 使用 `services` 关键字启动 Grid 容器，与 runner 同网络，无代理问题：

```yaml
services:
  selenium-hub:
    image: selenium/hub:4.21.0
    ports: [4444:4444]
  chrome-node:
    image: selenium/node-chrome:4.21.0
    options: --shm-size 2g
```

---

## 8. CI/CD Design

### 8.1 Workflow: `robot-framework-ci.yml`

```
Trigger: push/PR to main (robot-framework-demo/**)
                    │
                    ▼
┌──────────────────────────────────────────────┐
│  1. Checkout + Setup Python 3.12              │
│  2. pip install -r requirements.txt            │
│  3. Wait for Selenium Grid (services)          │
│     ┌──────────────────────────────────┐       │
│     │ Hub:4444 + Chrome Node + Firefox  │       │
│     └──────────────────────────────────┘       │
│  4. pabot --processes 2 --include smoke        │
│     └─ Grid URL: http://localhost:4444/wd/hub  │
│  5. rebot --merge (always, even on failure)    │
│  6. upload-artifact: robot-results/             │
└──────────────────────────────────────────────┘
```

### 8.2 Local vs CI Differences

| 项目 | Local | CI |
|------|-------|----|
| Process count | 4 | 2 |
| Grid startup | `docker-compose up -d` | `services` 自动管理 |
| Test filter | 全部 | `--include smoke` |
| Proxy | OrbStack (需 NO_PROXY) | 无代理 |

---

## 9. Performance Optimization

### 9.1 Optimization Record

| 方案 | 进程 | 模式 | 耗时 | 提升 |
|------|------|------|------|------|
| Baseline | 2 | suite-level | 46.8s | — |
| Optimized | 4 + pabotlib | suite-level + 动态分配 | 29.9s | **+36%** |

### 9.2 Bottleneck Analysis

3 套件全部并行（PID 0/1/2），第 4 进程空闲。瓶颈在于 `03_multi_browser.robot` 最慢 (~28s)，因每个用例依次切换 Chrome/Firefox。

### 9.3 Further Optimization

拆分 `03_multi_browser.robot` 为 3 个独立 .robot 文件，配合 `--testlevel`，可使 9 用例自由分配到 4 进程，预计耗时 ~15s。

---

## 10. Design Decisions

### 10.1 Framework Selection: Robot Framework vs Playwright vs Cypress

**选择: Robot Framework**

| 维度 | Robot Framework | Playwright | Cypress |
|------|----------------|------------|---------|
| **语言** | Python + 关键字 DSL | TypeScript/JavaScript | JavaScript |
| **并行** | Pabot (多进程) | Built-in workers (多进程) | Cypress Cloud (付费) / 手动分片 |
| **浏览器** | Selenium Grid (Chrome/Firefox/Edge/Safari) | Chromium + Firefox + WebKit | Chromium + Firefox (limited) |
| **报告** | Rebot (内置) | HTML + Trace Viewer (内置) | Mocha reporter (内置) |
| **关键字驱动** | 原生支持 (核心特性) | 需自建抽象 (Page Object) | 需自建抽象 (Custom Commands) |
| **数据驱动** | Template test cases + 内置变量 | forEach + parameterized | .each() + fixtures |
| **学习曲线** | 中 (DSL 易读) | 中高 (TypeScript + async) | 低 (JS + Cypress API) |
| **社区生态** | 丰富 (1500+ libraries) | 快速增长 (Microsoft 支持) | 成熟 (商业公司) |
| **非浏览器测试** | SSHLibrary, DatabaseLibrary, RESTinstance | API testing (内置) | cy.request (有限) |
| **CI 成本** | 免费 (开源) | 免费 (开源) | 并行需付费 Cloud |

**选择 Robot Framework 的具体原因**：

1. **关键字驱动 (Keyword-Driven)**：Robot Framework 的核心设计哲学。测试用例由自然语言关键字组成，业务人员可阅读和维护：
   ```robot
   # 自然语言可读
   Open Browser To Grid    https://example.com
   Verify Page Title Contains    Example Domain
   Close Browser Safely
   ```
   相比 Playwright 的代码式测试，关键字驱动在非技术团队成员参与评审时有明显优势。

2. **Pabot 原生并行**：Pabot 是 Robot Framework 生态的标准并行扩展，无需额外配置或付费。与 Cypress Cloud 的付费并行模式形成对比。

3. **Rebot 内置报告**：Robot Framework 内建 Rebot，无需第三方工具即可生成美观的 HTML 报告。Playwright 虽然也有内置报告，但 Rebout 的合并能力 (--merge) 对并行测试的报告聚合有原生优势。

4. **生态丰富度**：RF 拥有 1500+ 标准库和第三方库 (SeleniumLibrary, SSHLibrary, DatabaseLibrary 等)，覆盖各种测试场景。

### 10.2 Parallel Execution: Pabot vs pytest-xdist vs Custom

**选择: Pabot**

| 方案 | 原理 | 适用场景 | 限制 |
|------|------|----------|------|
| Pabot | 多进程 + PabotLib Server 动态调度 | Robot Framework 项目 | 仅支持 .robot 文件 |
| pytest-xdist | 多进程 (CPU 亲和) | pytest 项目 | 非 RF 生态 |
| 自建 (GitHub Actions matrix) | CI-level 分片 | 简单拆分 | 无动态负载均衡，硬编码分片 |

Pabot 的优势在于：suite-level 和 test-level 双模式支持、PabotLib 动态负载均衡、与 Robot Framework 输出格式原生兼容。

### 10.3 Browser Management: Selenium Grid vs BrowserStack vs Local

**选择: Selenium Grid**

- **Selenium Grid**: 开源、Docker 化、GitHub Actions services 原生支持
- **BrowserStack/SauceLabs**: 云端 300+ 浏览器组合，但付费、依赖网络
- **本地浏览器**: 简单但限于单机，无法模拟 Grid 分布式

本项目选择 Selenium Grid 的核心原因是 **CI services 模式**：GitHub Actions 支持 `services` 关键字直接在 runner 上启动容器，与本机 `docker-compose` 完全一致，无需额外配置或第三方服务。

### 10.4 Container Runtime: Docker Desktop vs OrbStack

**选择: OrbStack (本地)**

| 方案 | macOS 性能 | 资源占用 | 启动速度 | Docker CLI 兼容 |
|------|-----------|----------|----------|-----------------|
| OrbStack | ✅ 原生 (VM-less) | ~200MB RAM | ~3s | 完全兼容 |
| Docker Desktop | 中等 (VM) | ~2GB RAM | ~15s | 标准 |

OrbStack 作为 Docker Desktop 的轻量替代，提供相同的 Docker CLI 体验。

### 10.5 Report Merge: Rebot vs Allure vs Custom

**选择: Rebot**

| 方案 | 集成度 | 安装步骤 | 报告美观度 | 并行合并 |
|------|--------|----------|-----------|----------|
| Rebot | 内置 (零依赖) | 无 | 中等 (标准 RF 报告) | `--merge` 原生支持 |
| Allure | RF 插件 | 需安装 allure + listener | 高 (交互式) | 需额外脚本 |
| 自建 HTML | 手动 | 需开发 | 自定义 | 需额外开发 |

Rebot 选择理由：零依赖、与 Pabot 无缝集成、`rebot --merge` 一行命令完成 N 份 XML 合并。

### 10.6 Python Version: 3.12 vs 3.14

**选择: CI 3.12 / Local 3.14**

本机 macOS 预装 Python 3.14，但 `robotframework-seleniumlibrary` 部分旧版本 (<6.8) 不支持 3.14。CI 固定 3.12 确保依赖兼容性和可复现性。

---

## 11. Comparison with Playwright Demo

| Capability | Robot Framework Demo | Playwright Demo |
|------------|---------------------|-----------------|
| Language | Python + RF keywords | TypeScript |
| Test framework | Robot Framework 7.x | Playwright 1.x |
| Parallel execution | Pabot (multi-process) | Built-in workers |
| Browser grid | Selenium Grid 4 | Direct browser launch |
| Cross-browser | Chrome + Firefox | Chromium + Firefox + WebKit |
| Report | Rebot HTML | Playwright HTML + Trace Viewer |
| Test count | 9 | 38 |
| Dependencies | 4 Python packages | 3 npm packages |
