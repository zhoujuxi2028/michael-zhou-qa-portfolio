# Robot Framework Demo - CLAUDE.md

## Quick Commands

```bash
cd robot-framework-demo
source venv/bin/activate
pip install -r requirements.txt

# 确保 OrbStack / Docker Desktop 已启动
# 启动 Selenium Grid
docker-compose up -d

# Pabot 并行执行（4 进程，pabotlib 动态分配）
pabot --processes 4 --pabotlib --outputdir results --variable SELENIUM_GRID:http://localhost:4444/wd/hub tests/

# 或使用脚本（默认 4 进程）
bash scripts/run_pabot.sh

# 单独运行 (非并行)
robot --outputdir results --variable SELENIUM_GRID:http://localhost:4444/wd/hub tests/

# Rebot 合并报告
rebot --outputdir results/merged --merge results/output.xml

# 关闭 Grid
docker-compose down
```

## 设计文档

详细设计决策、架构图、优化记录见 `docs/architecture/DESIGN.md`。

## Branch

- 开发分支: 已合并至 `main`
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

## Smoke 测试设计规范（PDEF-020）

CI smoke suite（`--include smoke`）测试第三方外部 URL 时：

| 允许断言 | 禁止断言 |
|----------|----------|
| HTTP 响应状态、页面 title（`Get Title`） | `xpath://h1` 等 DOM 内部结构（Element 存在性） |
| 页面包含特定文本（`Page Should Contain`） | CSS/XPath 选择器断言特定 HTML 元素 |

**原因**：外部 URL 由 CDN 分发，不同数据中心（尤其 Azure CI）返回的 HTML 结构可能与本地不同，导致 DOM 断言在 CI 中不可重复（见 PDEF-020 RCA）。
