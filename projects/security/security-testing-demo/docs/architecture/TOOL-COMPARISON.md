# 安全测试工具对比

## 工具选择说明

本项目使用 OWASP ZAP 作为主要扫描工具，以下是与其他常用工具的对比和使用场景说明。

## 工具对比矩阵

| 特性 | OWASP ZAP | Burp Suite | Nessus | OpenVAS |
|------|-----------|------------|--------|---------|
| **类型** | DAST | DAST | 漏洞扫描器 | 漏洞扫描器 |
| **目标** | Web 应用 | Web 应用 | 网络/系统 | 网络/系统 |
| **开源** | 是 | 否 (社区版有限) | 否 | 是 |
| **API/CLI** | 完整支持 | 有限 | 支持 | 支持 |
| **CI/CD 集成** | 原生支持 | 需额外配置 | 支持 | 支持 |
| **自动化友好** | 高 | 中 | 高 | 高 |
| **学习曲线** | 中等 | 中等 | 低 | 中等 |
| **价格** | 免费 | $449+/年 | $2,990+/年 | 免费 |

## 本项目选择 OWASP ZAP 的原因

### 1. CI/CD 集成友好

```yaml
# GitHub Actions 原生支持
- uses: zaproxy/action-baseline@v0.12.0
  with:
    target: 'http://localhost'
```

### 2. 完全免费开源

- 无许可证限制
- 可在任何环境部署
- 社区活跃，持续更新

### 3. 完整的 API 支持

```python
# Python API 完整控制
from zapv2 import ZAPv2
zap = ZAPv2()
zap.spider.scan(target)
zap.ascan.scan(target)
alerts = zap.core.alerts()
```

### 4. Docker 支持

```bash
docker run ghcr.io/zaproxy/zaproxy:stable zap.sh -daemon
```

## 工具使用场景

### OWASP ZAP - Web 应用安全测试（本项目使用）

**适用场景**：
- CI/CD 自动化安全测试
- Web 应用漏洞扫描
- API 安全测试
- DevSecOps 流水线

**本项目实现**：
```
security-testing-demo/
├── zap/
│   ├── zap-baseline.py      # 基线扫描
│   ├── zap-full-scan.py     # 全量扫描
│   └── zap-api-scan.py      # API 扫描
```

### Burp Suite - 手动渗透测试

**适用场景**：
- 手动安全测试
- 复杂业务逻辑测试
- 深度漏洞挖掘
- 安全研究

**与本项目的关系**：
- 学习笔记在 `security-tools/burp-suite/`
- Burp Suite 学到的技术可用于理解 ZAP 的工作原理
- 手动测试发现问题后，可编写 ZAP 自动化脚本

### Nessus / OpenVAS - 网络和系统漏洞扫描

**适用场景**：
- 网络基础设施扫描
- 操作系统漏洞检测
- 合规性检查（CIS、PCI-DSS）
- 服务器安全审计

**与 Web 应用测试的区别**：

| 对比项 | Nessus/OpenVAS | ZAP/Burp |
|--------|----------------|----------|
| 扫描目标 | 网络、OS、服务 | Web 应用 |
| 检测内容 | CVE、配置问题、补丁缺失 | XSS、SQLi、CSRF |
| 扫描方式 | 端口扫描、协议探测 | HTTP 请求分析 |
| 凭证需求 | 系统凭证（深度扫描） | 应用账号（认证测试） |

**学习笔记位置**：
- `security-tools/nessus/`

## 完整安全测试方案

### 推荐工具组合

```
┌─────────────────────────────────────────────────────────────┐
│                    完整安全测试方案                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐    ┌─────────────────┐                 │
│  │   网络/系统层    │    │    应用层        │                 │
│  │                 │    │                 │                 │
│  │  Nessus/OpenVAS │    │  OWASP ZAP      │ ← 本项目        │
│  │  - 端口扫描     │    │  - Web 漏洞     │                 │
│  │  - CVE 检测     │    │  - API 安全     │                 │
│  │  - 合规检查     │    │  - CI/CD 集成   │                 │
│  │                 │    │                 │                 │
│  │  (security-tools│    │  Burp Suite     │ ← 手动测试      │
│  │   学习项目)     │    │  - 深度测试     │                 │
│  │                 │    │  - 业务逻辑     │                 │
│  └─────────────────┘    └─────────────────┘                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 测试流程建议

1. **基础设施扫描** (Nessus/OpenVAS)
   - 扫描服务器和网络设备
   - 检测操作系统漏洞
   - 检查配置合规性

2. **自动化 Web 扫描** (OWASP ZAP) - 本项目
   - CI/CD 集成基线扫描
   - API 安全测试
   - 定期全量扫描

3. **手动渗透测试** (Burp Suite)
   - 深度业务逻辑测试
   - 复杂认证绕过
   - 零日漏洞挖掘

## 扩展本项目

如果需要集成 Nessus 或 OpenVAS，可以添加：

### Nessus API 集成示例

```python
# nessus/nessus_scan.py
import requests

class NessusScanner:
    def __init__(self, host, username, password):
        self.host = host
        self.session = requests.Session()
        self._login(username, password)

    def scan(self, target):
        # 创建扫描任务
        pass

    def get_results(self, scan_id):
        # 获取扫描结果
        pass
```

### OpenVAS 集成示例

```python
# openvas/openvas_scan.py
from gvm.connections import UnixSocketConnection
from gvm.protocols.gmp import Gmp

class OpenVASScanner:
    def __init__(self):
        connection = UnixSocketConnection()
        self.gmp = Gmp(connection)

    def scan(self, target):
        # 创建扫描任务
        pass
```

