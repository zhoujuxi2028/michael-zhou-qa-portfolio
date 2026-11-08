# Robot Framework Demo — Pabot + Selenium Grid + Rebot

基于 **Pabot 并行执行 + Selenium Grid 分布式 + Rebot 报告合并** 的 Robot Framework 测试演示项目。

> **Version**: robot-framework-demo/v1.0.0-pabot-grid-rebot (2026-07-13, 9/9 PASS)

## 技术栈

| 组件 | 版本 | 用途 |
|------|------|------|
| Robot Framework | 7.4 | 关键字驱动测试框架 |
| Pabot | 5.2 | 并行测试执行引擎 |
| SeleniumLibrary | 6.9 | Selenium WebDriver 封装 |
| Selenium Grid 4 | 4.21.0 | 分布式浏览器节点管理 |
| Rebot | (内置) | 测试结果合并与报告生成 |
| Docker Compose | v2 | Grid 环境编排（macOS 可用 OrbStack 替代 Docker Desktop） |

## 架构概述

```
┌─────────────────────────────────────────────────┐
│                  Pabot 调度器                     │
│         (N 个并行进程分配测试用例)                  │
├────────────┬────────────┬────────────────────────┤
│  Process 1 │  Process 2 │  Process N             │
└─────┬──────┴─────┬──────┴──────┬─────────────────┘
      │            │             │
      ▼            ▼             ▼
┌─────────────────────────────────────────────────┐
│              Selenium Grid Hub                    │
│          (路由请求到可用节点)                      │
├──────────────┬───────────────┬───────────────────┤
│ Chrome Node  │ Chrome Node   │  Firefox Node     │
│  (Session 1) │  (Session 2)  │   (Session 3)     │
└──────────────┴───────────────┴───────────────────┘
      │            │             │
      ▼            ▼             ▼
┌─────────────────────────────────────────────────┐
│                 Rebot 合并                        │
│      (合并各进程 output.xml → 统一报告)           │
└─────────────────────────────────────────────────┘
```

## 快速开始

### 1. 安装依赖

```bash
cd robot-framework-demo
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. 启动 Selenium Grid

```bash
# 确保 OrbStack 或 Docker Desktop 已启动
docker-compose up -d
# 等待 Grid 就绪
curl -s http://localhost:4444/wd/hub/status | python3 -m json.tool
```

### 3. 运行测试

```bash
# 使用 Pabot 并行执行（4 进程，test-level 分配）
pabot --processes 4 --pabotlib \
  --outputdir results \
  --variable SELENIUM_GRID:http://localhost:4444/wd/hub \
  tests/

# 或使用脚本
bash scripts/run_pabot.sh --processes 4

# 仅运行 smoke 标签用例
bash scripts/run_pabot.sh --include smoke
```

### 4. 合并报告（Rebot）

```bash
# Pabot 自动合并，也可手动执行
bash scripts/run_rebot_merge.sh results/
```

### 5. 关闭 Grid

```bash
docker-compose down
```

## 项目结构

```
robot-framework-demo/
├── tests/                      # 测试套件
│   ├── 01_navigation.robot     # 导航功能测试 (3 cases)
│   ├── 02_interaction.robot    # 交互功能测试 (3 cases)
│   └── 03_multi_browser.robot  # 多浏览器兼容性 (3 cases)
├── resources/                  # 共享资源
│   └── common.robot            # 通用关键字和变量
├── scripts/                    # 执行脚本
│   ├── run_pabot.sh            # Pabot 并行执行
│   └── run_rebot_merge.sh      # Rebot 报告合并
├── results/                    # 测试结果（gitignore）
├── docker-compose.yml          # Selenium Grid 编排
├── requirements.txt            # Python 依赖（>= 版本约束，兼容 Python 3.14）
├── docs/                       # 设计文档
│   └── architecture/DESIGN.md  # 架构设计 + 设计决策 + 优化记录
└── README.md                   # 本文件
```

## CI/CD 集成

GitHub Actions workflow: `.github/workflows/robot-framework-ci.yml`

- 自动启动 Selenium Grid (Hub + Chrome + Firefox)
- Pabot 并行执行 smoke 测试（CI 2 进程）
- Rebot 合并报告并上传 artifact

## 测试用例统计

| 套件 | 用例数 | 标签 |
|------|--------|------|
| 01_navigation | 3 | smoke, navigation, P0/P1 |
| 02_interaction | 3 | smoke, interaction, P0/P1 |
| 03_multi_browser | 3 | cross-browser, P0/P1 |
| **合计** | **9** | — |

## 可行性分析

### ✅ GitHub Actions 中可行

| 项目 | 结论 |
|------|------|
| Selenium Grid 启动 | ✅ 通过 `services` 配置容器化 Grid |
| Pabot 并行 | ✅ `pip install` 后直接可用 |
| Rebot 合并 | ✅ Robot Framework 内置，无额外依赖 |
| Chrome/Firefox 双浏览器 | ✅ 官方 Docker 镜像支持 |
| 测试报告归档 | ✅ `upload-artifact` 保存 HTML 报告 |

### 🔧 本地环境

本机使用 **OrbStack**（macOS Docker Desktop 替代品），使用方法与 Docker 完全相同：

```bash
# 先确认 OrbStack 已启动
ls /Users/michaelzhou/.orbstack/run/docker.sock
# 再执行 docker-compose 命令
docker-compose up -d
```

### ⚠️ 注意事项

1. **GitHub Actions 资源限制**: 免费版 2 core / 7GB RAM，并行进程建议 ≤ 3
2. **Grid 启动时间**: 需等待 Hub 和 Node 就绪（约 10-20 秒）
3. **网络访问**: 测试目标需要从 runner 可达（example.com 始终可用）
4. **shm_size**: Chrome Node 需 `--shm-size 2g` 避免 OOM crash
