# Phase 2 学习指南: ZAP 自动化扫描

## 学习目标

通过 OWASP ZAP 学习自动化安全扫描，掌握：
- ZAP API 使用
- 自动化扫描工作流
- Spider (爬虫) 和扫描配置
- 告警分析与报告生成
- CI/CD 集成

---

## 1. 环境准备

### 启动 ZAP 环境

```bash
# 进入项目目录
cd /Users/michaelzhou/Documents/github/michael-zhou-qa-portfolio/security-testing-demo

# 启动 Docker 环境 (包含 ZAP 和 DVWA)
docker compose -f docker/docker-compose.yml up -d

# 等待 ZAP 启动 (约 30-60 秒)
sleep 60
```

### 验证 ZAP 连接

```bash
# 检查 ZAP API
curl http://localhost:8090/JSON/core/view/version/

# 预期响应:
# {"version":"2.x.x"}

# 如果连接失败，检查容器状态
docker compose -f docker/docker-compose.yml ps
docker compose -f docker/docker-compose.yml logs zap
```

### Host 头问题解决

如果遇到 502 错误，添加 Host 头：

```bash
curl http://localhost:8090/JSON/core/view/version/ -H "Host: zap"
```

### 安装 Python 依赖

```bash
# 安装 ZAP Python 客户端
pip3 install python-owasp-zap-v2.4
```

### 运行 ZAP 测试

```bash
# 运行所有 ZAP 测试
python3 -m pytest tests/test_zap_scan.py -v

# 运行快速测试 (跳过慢速测试)
python3 -m pytest tests/test_zap_scan.py -v -m "not slow"

# 运行带详细输出
python3 -m pytest tests/test_zap_scan.py -v -s
```

---

## 2. ZAP 核心概念

### 扫描类型

| 类型 | 描述 | 风险 | 用途 |
|------|------|------|------|
| Spider | 爬取网站链接 | 无 | 发现 URL |
| Passive Scan | 分析已有流量 | 无 | 快速检测 |
| Active Scan | 主动发送攻击 | 高 | 深度检测 |
| AJAX Spider | 处理 JavaScript | 无 | SPA 应用 |

### ZAP 架构

```
┌─────────────────────────────────────────┐
│                 ZAP                      │
├─────────────────────────────────────────┤
│  Spider ──> Sites Tree ──> Alerts       │
│     │                         │         │
│     ▼                         ▼         │
│  Passive    ──────────>   Reports       │
│  Scanner                                │
│     │                                   │
│     ▼                                   │
│  Active                                 │
│  Scanner                                │
├─────────────────────────────────────────┤
│  REST API (Port 8090)                   │
└─────────────────────────────────────────┘
```

### Context (上下文)

Context 用于定义扫描范围：

```python
# 创建 Context
context_id = zap.context.new_context("DVWA Test")

# 添加 URL 模式
zap.context.include_in_context("DVWA Test", "http://localhost.*")

# 排除 URL
zap.context.exclude_from_context("DVWA Test", "http://localhost/logout.*")
```

---

## 3. ZAPHelper 类使用

### 类结构

```python
from utils.zap_helper import ZAPHelper

# 初始化
helper = ZAPHelper(
    host="localhost",     # ZAP 主机
    port=8090,           # ZAP 端口
    api_key=""           # API Key (可选)
)
```

### 主要方法

| 方法 | 描述 | 返回值 |
|------|------|--------|
| `is_connected()` | 检查连接 | bool |
| `get_version()` | 获取版本 | str |
| `spider(url)` | 爬取 URL | List[str] |
| `passive_scan()` | 被动扫描 | None |
| `active_scan(url)` | 主动扫描 | str (scan_id) |
| `get_alerts()` | 获取告警 | List[Dict] |
| `get_alert_summary()` | 告警摘要 | Dict |
| `generate_html_report()` | HTML 报告 | str |
| `clear_session()` | 清除会话 | None |

### 使用示例

```python
from utils.zap_helper import ZAPHelper

# 连接 ZAP
helper = ZAPHelper(host="localhost", port=8090)

# 检查连接
if helper.is_connected():
    print(f"ZAP Version: {helper.get_version()}")

# 运行 Spider
urls = helper.spider("http://localhost", max_duration=60)
print(f"Found {len(urls)} URLs")

# 等待被动扫描
helper.passive_scan(wait_time=30)

# 获取告警
alerts = helper.get_alerts()
summary = helper.get_alert_summary(alerts)
print(f"Alerts: {summary}")

# 生成报告
report = helper.generate_html_report()
with open("report.html", "w") as f:
    f.write(report)
```

---

## 4. API 使用教程

### 直接调用 ZAP API

#### 练习 1: 连接测试

```bash
# 获取 ZAP 版本
curl http://localhost:8090/JSON/core/view/version/

# 获取运行状态
curl http://localhost:8090/JSON/core/view/mode/

# 获取已扫描的站点
curl http://localhost:8090/JSON/core/view/sites/
```

#### 练习 2: Spider 操作

```bash
# 启动 Spider
curl "http://localhost:8090/JSON/spider/action/scan/?url=http://localhost&maxChildren=10"

# 获取 Spider 状态 (scan_id 从上一步响应获取)
curl "http://localhost:8090/JSON/spider/view/status/?scanId=0"

# 获取 Spider 结果
curl "http://localhost:8090/JSON/spider/view/results/?scanId=0"
```

#### 练习 3: 告警操作

```bash
# 获取所有告警
curl "http://localhost:8090/JSON/core/view/alerts/"

# 获取特定 URL 的告警
curl "http://localhost:8090/JSON/core/view/alerts/?baseurl=http://localhost"

# 获取告警数量
curl "http://localhost:8090/JSON/core/view/numberOfAlerts/"
```

#### 练习 4: 报告生成

```bash
# 生成 HTML 报告
curl "http://localhost:8090/OTHER/core/other/htmlreport/" -o zap-report.html

# 生成 JSON 报告
curl "http://localhost:8090/JSON/core/view/alerts/" -o zap-alerts.json

# 生成 XML 报告
curl "http://localhost:8090/OTHER/core/other/xmlreport/" -o zap-report.xml
```

### Python 脚本示例

```python
#!/usr/bin/env python3
"""ZAP API 使用示例"""

from zapv2 import ZAPv2
import time

# 连接 ZAP
zap = ZAPv2(
    apikey="",
    proxies={
        "http": "http://localhost:8090",
        "https": "http://localhost:8090"
    }
)

# 目标 URL
target = "http://localhost"

# 1. 启动 Spider
print("[*] Starting Spider...")
scan_id = zap.spider.scan(target)

# 等待 Spider 完成
while int(zap.spider.status(scan_id)) < 100:
    print(f"    Spider progress: {zap.spider.status(scan_id)}%")
    time.sleep(2)

# 获取结果
urls = zap.spider.results(scan_id)
print(f"[+] Spider found {len(urls)} URLs")

# 2. 等待被动扫描
print("[*] Waiting for passive scan...")
while int(zap.pscan.records_to_scan) > 0:
    print(f"    Records to scan: {zap.pscan.records_to_scan}")
    time.sleep(2)

# 3. 获取告警
alerts = zap.core.alerts(baseurl=target)
print(f"[+] Found {len(alerts)} alerts")

# 按风险级别统计
summary = {"High": 0, "Medium": 0, "Low": 0, "Informational": 0}
for alert in alerts:
    risk = alert.get("risk", "Informational")
    if risk in summary:
        summary[risk] += 1

print(f"    High: {summary['High']}")
print(f"    Medium: {summary['Medium']}")
print(f"    Low: {summary['Low']}")
print(f"    Informational: {summary['Informational']}")
```

---

## 5. 扫描工作流

### 基线扫描流程

基线扫描适用于 CI/CD，执行快速被动扫描：

```
Spider ──> Passive Scan ──> Get Alerts ──> Generate Report
  │            │               │               │
  │            │               │               │
 2-5 min     1-2 min        即时           即时
```

```bash
# 使用基线扫描脚本
python zap/zap-baseline.py --target http://localhost --report html

# 参数说明:
# --target: 目标 URL
# --zap-host: ZAP 主机 (默认 localhost)
# --zap-port: ZAP 端口 (默认 8090)
# --output: 报告目录 (默认 ./reports)
# --report: 报告格式 (html/json/xml)
```

### 全量扫描流程

全量扫描包含主动扫描，更全面但耗时更长：

```
Spider ──> AJAX Spider ──> Passive Scan ──> Active Scan ──> Report
  │            │               │               │            │
  │            │               │               │            │
 5 min       3 min          2 min          15-30 min      即时
```

```bash
# 使用全量扫描脚本
python zap/zap-full-scan.py --target http://localhost --policy aggressive

# 参数说明:
# --policy: 扫描策略 (default/aggressive)
# --skip-ajax: 跳过 AJAX Spider
```

### 扫描策略对比

| 策略 | Spider | Passive | Active | 适用场景 |
|------|--------|---------|--------|----------|
| Baseline | 完整 | 完整 | 无 | CI/CD 快速检测 |
| Full (Default) | 完整 | 完整 | 标准 | 常规安全测试 |
| Full (Aggressive) | 完整 | 完整 | 深度 | 详细安全评估 |

---

## 6. 告警分析

### 告警结构

```json
{
    "sourceid": "3",
    "other": "",
    "method": "GET",
    "evidence": "X-Frame-Options header not found",
    "pluginId": "10020",
    "cweid": "1021",
    "confidence": "Medium",
    "wascid": "15",
    "description": "X-Frame-Options header is not included...",
    "messageId": "1",
    "inputVector": "",
    "url": "http://localhost/",
    "tags": {...},
    "reference": "https://developer.mozilla.org/...",
    "solution": "Most modern Web browsers support the X-Frame-Options...",
    "alert": "Missing Anti-clickjacking Header",
    "param": "x-frame-options",
    "attack": "",
    "name": "Missing Anti-clickjacking Header",
    "risk": "Medium",
    "id": "0",
    "alertRef": "10020"
}
```

### 风险级别

| 级别 | 颜色 | 描述 | 处理优先级 |
|------|------|------|------------|
| High | 红色 | 严重漏洞，可能被利用 | 立即修复 |
| Medium | 橙色 | 中等风险，需要关注 | 尽快修复 |
| Low | 黄色 | 低风险，建议修复 | 计划修复 |
| Informational | 蓝色 | 信息性，供参考 | 可选修复 |

### 常见告警类型

| 告警名称 | 风险 | 描述 |
|----------|------|------|
| SQL Injection | High | SQL 注入漏洞 |
| Cross Site Scripting | High | XSS 漏洞 |
| Missing Anti-CSRF Tokens | Medium | 缺少 CSRF 防护 |
| X-Frame-Options Header Not Set | Medium | 点击劫持风险 |
| Cookie Without Secure Flag | Low | Cookie 安全标志缺失 |
| Server Leaks Version | Low | 服务器版本泄露 |

### 告警分析脚本

```python
#!/usr/bin/env python3
"""告警分析脚本"""

from utils.zap_helper import ZAPHelper
import json

helper = ZAPHelper(host="localhost", port=8090)

# 获取告警
alerts = helper.get_alerts(target="http://localhost")

# 按风险级别分组
by_risk = {"High": [], "Medium": [], "Low": [], "Informational": []}
for alert in alerts:
    risk = alert.get("risk", "Informational")
    if risk in by_risk:
        by_risk[risk].append(alert)

# 输出分析报告
print("=" * 60)
print("ZAP Alert Analysis Report")
print("=" * 60)

for risk in ["High", "Medium", "Low", "Informational"]:
    print(f"\n[{risk}] - {len(by_risk[risk])} alerts")

    # 按告警名称去重
    unique_alerts = {}
    for alert in by_risk[risk]:
        name = alert.get("name", "Unknown")
        if name not in unique_alerts:
            unique_alerts[name] = alert

    for name, alert in unique_alerts.items():
        print(f"  - {name}")
        print(f"    URL: {alert.get('url', 'N/A')}")
        print(f"    Solution: {alert.get('solution', 'N/A')[:80]}...")
```

---

## 7. CI/CD 集成

### GitHub Actions 配置

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # 每天凌晨 2 点

jobs:
  zap-scan:
    runs-on: ubuntu-latest

    services:
      dvwa:
        image: vulnerables/web-dvwa
        ports:
          - 80:80

    steps:
      - uses: actions/checkout@v4

      - name: Start ZAP
        run: |
          docker run -d --name zap \
            -p 8090:8090 \
            ghcr.io/zaproxy/zaproxy:stable \
            zap.sh -daemon -host 0.0.0.0 -port 8090 \
            -config api.disablekey=true
          sleep 60

      - name: Run Baseline Scan
        run: |
          pip install python-owasp-zap-v2.4
          python zap/zap-baseline.py --target http://localhost --output ./reports

      - name: Upload Report
        uses: actions/upload-artifact@v4
        with:
          name: zap-report
          path: reports/

      - name: Check Results
        run: |
          # 如果有 High 风险告警则失败
          python -c "
          import json
          with open('reports/zap_baseline_*.json') as f:
              data = json.load(f)
          high_alerts = [a for a in data.get('alerts', []) if a.get('risk') == 'High']
          if high_alerts:
              print(f'Found {len(high_alerts)} high risk alerts!')
              exit(1)
          "
```

### 扫描阈值设置

```python
# 定义可接受的告警阈值
THRESHOLDS = {
    "High": 0,      # 不允许 High 告警
    "Medium": 5,    # 最多 5 个 Medium
    "Low": 20,      # 最多 20 个 Low
}

def check_thresholds(summary):
    """检查是否超过阈值"""
    for risk, threshold in THRESHOLDS.items():
        count = summary.get(risk, 0)
        if count > threshold:
            print(f"[FAIL] {risk}: {count} > {threshold}")
            return False
    print("[PASS] All thresholds met")
    return True

# 使用示例
alerts = helper.get_alerts()
summary = helper.get_alert_summary(alerts)
if not check_thresholds(summary):
    sys.exit(1)
```

### Jenkins Pipeline 示例

```groovy
pipeline {
    agent any

    stages {
        stage('Start Environment') {
            steps {
                sh 'docker compose -f docker/docker-compose.yml up -d'
                sh 'sleep 60'
            }
        }

        stage('ZAP Baseline Scan') {
            steps {
                sh '''
                    python3 -m pip install python-owasp-zap-v2.4
                    python3 zap/zap-baseline.py \
                        --target http://localhost \
                        --output ./reports \
                        --report html
                '''
            }
        }

        stage('Publish Report') {
            steps {
                publishHTML([
                    reportDir: 'reports',
                    reportFiles: 'zap_baseline_*.html',
                    reportName: 'ZAP Security Report'
                ])
            }
        }
    }

    post {
        always {
            sh 'docker compose -f docker/docker-compose.yml down'
        }
    }
}
```

---

## 8. 测试结果分析

### 测试通过含义

| 测试 | 含义 |
|------|------|
| test_zap_connection | ZAP API 可访问 |
| test_zap_version | ZAP 版本可获取 |
| test_spider_discovers_urls | Spider 能发现 URL |
| test_passive_scan_completes | 被动扫描能完成 |
| test_get_alerts_returns_list | 能获取告警列表 |
| test_html_report_generation | 能生成 HTML 报告 |
| test_baseline_scan_workflow | 完整基线扫描流程正常 |

### 常见问题排查

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 连接超时 | ZAP 未启动 | 等待或重启 ZAP |
| 502 错误 | Host 头问题 | 添加 `-H "Host: zap"` |
| 无告警 | 目标无漏洞 | 正常，使用 DVWA 测试 |
| Spider 超时 | 目标过大 | 增加 max_duration |

---

## 9. 学习检查清单

### 知识掌握

- [ ] 理解 ZAP 的扫描类型和区别
- [ ] 理解 Spider、被动扫描、主动扫描的工作原理
- [ ] 理解告警风险级别的含义
- [ ] 理解基线扫描和全量扫描的区别
- [ ] 理解 Context 的作用

### 实操技能

- [ ] 能使用 curl 调用 ZAP API
- [ ] 能使用 ZAPHelper 类进行扫描
- [ ] 能运行基线扫描脚本
- [ ] 能分析扫描报告和告警
- [ ] 能将 ZAP 集成到 CI/CD

### 工具使用

- [ ] 能启动和配置 ZAP Docker
- [ ] 能使用 pytest 运行 ZAP 测试
- [ ] 能生成和解读扫描报告

---

## 10. 常见问题

### Q: ZAP 连接失败怎么办？

```bash
# 1. 检查容器状态
docker compose -f docker/docker-compose.yml ps

# 2. 查看 ZAP 日志
docker compose -f docker/docker-compose.yml logs zap

# 3. 重启 ZAP
docker compose -f docker/docker-compose.yml restart zap

# 4. 等待 ZAP 启动完成
sleep 60
curl http://localhost:8090/JSON/core/view/version/
```

### Q: 扫描结果为空怎么办？

1. 确认目标 URL 可访问
2. 确认 Spider 正常运行
3. 检查 Context 配置是否正确
4. 使用 DVWA 等已知漏洞靶机测试

### Q: 如何加速扫描？

```python
# 1. 限制 Spider 深度
helper.spider(target, max_duration=30)  # 缩短时间

# 2. 跳过 AJAX Spider
scanner.run(target, skip_ajax=True)

# 3. 仅运行被动扫描 (基线扫描)
# 使用 zap-baseline.py 而非 zap-full-scan.py
```

### Q: 如何处理 HTTPS 目标？

```bash
# ZAP 需要安装 CA 证书才能扫描 HTTPS
# 1. 获取 ZAP CA 证书
curl http://localhost:8090/OTHER/core/other/rootcert/ -o zap-ca.crt

# 2. 在系统或浏览器中安装证书
# 或配置目标接受不受信任的证书
```

### Q: 如何排除特定 URL？

```python
# 使用 Context 排除
zap.context.exclude_from_context(
    "MyContext",
    "http://localhost/logout.*"  # 排除登出页面
)

# 或使用正则表达式排除
zap.spider.exclude_from_scan(".*\\.pdf$")  # 排除 PDF 文件
```

---

## 11. 扩展学习

### ZAP 官方资源

- [ZAP Documentation](https://www.zaproxy.org/docs/)
- [ZAP API Documentation](https://www.zaproxy.org/docs/api/)
- [ZAP Marketplace](https://www.zaproxy.org/addons/)

### 进阶主题

| 主题 | 描述 |
|------|------|
| 认证扫描 | 配置登录会话进行扫描 |
| API 扫描 | 使用 OpenAPI/Swagger 扫描 API |
| 自定义规则 | 编写自定义扫描规则 |
| 脚本扩展 | 使用 Python/JavaScript 扩展 ZAP |

### 相关工具对比

| 工具 | 类型 | 优势 |
|------|------|------|
| OWASP ZAP | 开源 | 免费、功能全面、API 丰富 |
| Burp Suite | 商业 | 手动测试强大、UI 友好 |
| Nikto | 开源 | 快速、轻量 |
| Acunetix | 商业 | 准确度高、企业级 |
