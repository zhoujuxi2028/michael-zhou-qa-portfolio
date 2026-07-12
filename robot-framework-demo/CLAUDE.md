# Robot Framework Demo - CLAUDE.md

## Quick Commands

```bash
cd robot-framework-demo
source venv/bin/activate
pip install -r requirements.txt

# 启动 Selenium Grid
docker-compose up -d

# Pabot 并行执行
pabot --processes 2 --outputdir results --variable SELENIUM_GRID:http://localhost:4444/wd/hub tests/

# 单独运行 (非并行)
robot --outputdir results --variable SELENIUM_GRID:http://localhost:4444/wd/hub tests/

# Rebot 合并报告
rebot --outputdir results/merged --merge results/output.xml

# 关闭 Grid
docker-compose down
```

## Branch

- 开发分支: `feature/robot-framework-demo` 或 `copilot/pabot-selenium-grid-rebot`
- 主分支: `main`

## 技术路线

**Pabot + Selenium Grid + Rebot** 三件套:
1. **Pabot** — 将测试套件拆分为 N 个并行进程执行
2. **Selenium Grid** — 管理多个浏览器节点，接收 RemoteWebDriver 请求
3. **Rebot** — 合并各进程的 output.xml 为统一报告

## Port Allocation

| 端口 | 服务 |
|------|------|
| 4444 | Selenium Grid Hub |
| 5900 | VNC (debug 模式, 可选) |

## 测试标签

| 标签 | 含义 |
|------|------|
| smoke | 冒烟测试 |
| regression | 回归测试 |
| navigation | 导航功能 |
| interaction | 交互功能 |
| cross-browser | 跨浏览器 |
| P0 | 最高优先级 |
| P1 | 高优先级 |
