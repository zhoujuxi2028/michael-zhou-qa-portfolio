# Phase 5 学习指南: Nessus Essentials 漏洞扫描

## 学习目标

通过 Nessus Essentials 学习和掌握系统/网络层漏洞扫描，包括：
- Nessus Essentials 安装与配置
- 漏洞扫描原理与策略
- 扫描结果分析与报告
- 与 ZAP (DAST) 的互补使用

---

## 1. 环境配置

### 注册 Nessus Essentials

1. 访问 https://www.tenable.com/products/nessus/nessus-essentials
2. 填写注册表单获取激活码（免费，限制 16 个 IP）
3. 激活码将发送到注册邮箱

### 安装 Nessus Essentials (macOS)

```bash
# 下载 macOS 安装包
# 访问 https://www.tenable.com/downloads/nessus 下载对应版本

# 安装 DMG 包
# 双击下载的 .dmg 文件，按照向导安装

# 启动 Nessus 服务
sudo launchctl start com.tenablesecurity.nessusd

# 检查服务状态
sudo launchctl list | grep nessus

# 停止服务
sudo launchctl stop com.tenablesecurity.nessusd
```

### 访问 Web UI

1. 打开浏览器访问: https://localhost:8834
2. 接受自签名证书警告
3. 首次访问会进入初始化向导

### 初始化配置

```
初始化向导步骤:
1. 选择 "Nessus Essentials" 版本
2. 输入注册时获取的激活码
3. 创建管理员账户
4. 等待插件下载和编译 (可能需要 30-60 分钟)
```

### 测试目标准备

```bash
# 进入项目目录
cd /Users/michaelzhou/Documents/github/michael-zhou-qa-portfolio/security-testing-demo

# 启动 Docker 环境 (DVWA + Juice Shop)
docker compose -f docker/docker-compose.yml up -d

# 验证服务运行
curl -I http://localhost       # DVWA
curl -I http://localhost:3000  # Juice Shop

# 获取 Docker 网络 IP
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' docker-dvwa-1
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' docker-juice-shop-1
```

---

## 2. Nessus 核心概念

### 扫描类型对比表

| 扫描类型 | 用途 | 深度 | 耗时 |
|----------|------|------|------|
| Host Discovery | 发现活跃主机 | 浅 | 快 |
| Basic Network Scan | 通用网络漏洞扫描 | 中 | 中 |
| Advanced Scan | 自定义高级扫描 | 自定义 | 自定义 |
| Web Application Tests | Web 应用漏洞测试 | 深 | 慢 |
| Credentialed Patch Audit | 认证补丁审计 | 深 | 中 |
| Malware Scan | 恶意软件检测 | 深 | 慢 |

### DAST vs 漏洞扫描对比

| 维度 | ZAP (DAST) | Nessus (漏洞扫描) |
|------|------------|-------------------|
| 扫描层 | 应用层 (HTTP/HTTPS) | 系统/网络层 |
| 漏洞类型 | XSS, SQLi, CSRF, IDOR | CVE, 补丁缺失, 配置错误 |
| 认证方式 | 表单/Cookie 认证 | SSH/WMI/SNMP 认证 |
| 目标 | Web 应用 | 主机/服务/网络设备 |
| 报告内容 | Web 漏洞详情 | CVE 编号, CVSS 评分 |
| 使用场景 | 应用上线前测试 | 资产漏洞管理 |

### 扫描工作流程

```
+----------------+     +----------------+     +----------------+
|   目标发现     | --> |   漏洞扫描     | --> |   结果分析     |
|  Host Discovery|     |  Vulnerability |     |   Analysis     |
+----------------+     +----------------+     +----------------+
        |                     |                      |
        v                     v                      v
+----------------+     +----------------+     +----------------+
| 识别活跃主机   |     | 端口扫描       |     | 漏洞分类       |
| 开放端口/服务  |     | 服务识别       |     | 优先级排序     |
| 操作系统指纹   |     | 漏洞检测       |     | 修复建议       |
+----------------+     +----------------+     +----------------+
                              |
                              v
                    +------------------+
                    | 认证扫描 (可选)  |
                    | - SSH/WMI 登录   |
                    | - 深度补丁检查   |
                    | - 配置审计       |
                    +------------------+
```

### 插件 (Plugin) 系统

```
Nessus 插件分类:
├── Family (插件族)
│   ├── Web Servers
│   ├── Databases
│   ├── CGI abuses
│   ├── Ubuntu Local Security Checks
│   └── ...
├── Severity (严重性)
│   ├── Critical (紧急)
│   ├── High (高)
│   ├── Medium (中)
│   ├── Low (低)
│   └── Info (信息)
└── Plugin ID
    ├── 10287 (Traceroute Information)
    ├── 11219 (Nessus SYN scanner)
    └── ...
```

---

## 3. 基础扫描练习

### 练习 1: 注册并安装 Nessus Essentials

**目标**: 完成 Nessus Essentials 的注册、安装和初始化

**步骤**:

1. 注册账号:
   - 访问 https://www.tenable.com/products/nessus/nessus-essentials
   - 填写邮箱获取激活码

2. 下载安装:
   ```bash
   # macOS 下载页面
   open https://www.tenable.com/downloads/nessus

   # 安装后启动服务
   sudo launchctl start com.tenablesecurity.nessusd
   ```

3. 初始化配置:
   - 访问 https://localhost:8834
   - 选择 Nessus Essentials
   - 输入激活码
   - 创建管理员账户
   - 等待插件编译完成

**验证**:
```bash
# 检查服务运行
curl -k https://localhost:8834/server/status
```

---

### 练习 2: 首次扫描 - Host Discovery

**目标**: 使用 Host Discovery 发现本地网络中的活跃主机

**步骤**:

1. 在 Nessus Web UI 中:
   - 点击 "New Scan"
   - 选择 "Host Discovery"
   - 填写扫描名称: `Local Host Discovery`
   - 填写目标: `127.0.0.1` 或本地 Docker 网段

2. 配置选项:
   ```
   Discovery:
   ├── Ping Methods: ARP, TCP, UDP, ICMP
   ├── Port scan range: 1-1024
   └── Network timeout: 5 seconds
   ```

3. 启动扫描并等待完成

**预期结果**:
```
发现主机信息:
├── IP 地址
├── 开放端口
├── 操作系统猜测
└── MAC 地址 (如适用)
```

---

### 练习 3: 扫描 DVWA Docker 容器

**目标**: 对 DVWA 容器进行基础漏洞扫描

**步骤**:

1. 获取 DVWA 容器 IP:
   ```bash
   # 启动环境
   docker compose -f docker/docker-compose.yml up -d

   # 获取 IP
   DVWA_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' docker-dvwa-1)
   echo "DVWA IP: $DVWA_IP"
   ```

2. 创建扫描:
   - New Scan > Basic Network Scan
   - Name: `DVWA Container Scan`
   - Targets: 容器 IP 或 `localhost`

3. 扫描配置:
   ```
   Assessment:
   ├── Scan Type: Scan for all web vulnerabilities
   └── Web Application: Enable CGI scanning

   Discovery:
   ├── Port scan range: 80,443,3306
   └── Service detection: ON
   ```

4. 启动扫描

**分析要点**:
- 发现的 Web 服务漏洞
- Apache/Nginx 版本泄露
- PHP 相关漏洞
- MySQL 端口暴露 (如果有)

---

### 练习 4: 扫描本地 macOS 系统

**目标**: 对本地 macOS 进行系统漏洞扫描

**步骤**:

1. 创建扫描:
   - New Scan > Basic Network Scan
   - Name: `macOS Local Scan`
   - Targets: `127.0.0.1`

2. 扫描配置:
   ```
   Assessment:
   ├── Scan Type: Scan for known vulnerabilities
   └── Accuracy: Show potential false alarms

   Discovery:
   ├── Port scan range: 1-65535
   ├── Scan Type: SYN scan
   └── Service detection: ON
   ```

3. 高级选项 (可选):
   ```
   Advanced:
   ├── Low bandwidth links: OFF
   ├── Fragile devices: OFF
   └── Slow down when network congestion: ON
   ```

**预期发现**:
- 开放的服务端口 (SSH, Screen Sharing 等)
- 系统信息泄露
- 服务版本信息
- 可能的配置问题

---

### 练习 5: 创建自定义扫描策略

**目标**: 创建针对 Web 服务器的自定义扫描策略

**步骤**:

1. 创建策略:
   - 进入 Policies > New Policy
   - 选择 "Advanced Scan" 作为模板
   - Name: `Web Server Security Audit`

2. 配置 Discovery:
   ```
   Port Scanning:
   ├── Port scan range: 80,443,8080,8443
   ├── Network port scanners: SYN scanner
   └── Service detection: ON
   ```

3. 配置 Assessment:
   ```
   General:
   ├── Accuracy: Show potential false alarms
   └── Perform thorough tests: ON

   Web Applications:
   ├── Scan web applications: ON
   ├── Maximum pages to crawl: 1000
   └── Maximum depth to crawl: 6
   ```

4. 配置插件:
   ```
   Plugin Families:
   ├── Web Servers: Enabled
   ├── CGI abuses: Enabled
   ├── CGI abuses: XSS: Enabled
   ├── Databases: Enabled (部分)
   └── 其他: 按需启用
   ```

5. 保存策略

**使用策略**:
- New Scan > User Defined > 选择创建的策略
- 填写目标执行扫描

---

## 4. 高级扫描配置

### 认证扫描 (Credentialed Scan)

认证扫描允许 Nessus 登录目标系统进行深度检查。

**SSH 认证配置** (Linux/macOS):

```
Credentials > SSH:
├── Authentication method: Password 或 SSH Key
├── Username: [管理员用户]
├── Password: [密码] 或
├── Private Key: [SSH 私钥内容]
├── Elevate privileges: sudo
└── Escalation password: [sudo 密码]
```

**Windows 认证配置**:

```
Credentials > Windows:
├── Authentication method: Password
├── Username: Administrator
├── Password: [密码]
└── Domain: [域名，可选]
```

**认证扫描优势**:

| 非认证扫描 | 认证扫描 |
|------------|----------|
| 仅外部可见漏洞 | 系统内部漏洞 |
| 服务版本推测 | 精确版本检测 |
| 无法检查补丁 | 补丁状态审计 |
| 配置推测 | 配置详细检查 |

---

### 合规性检查 (Compliance)

**常见合规标准**:

| 标准 | 描述 | 适用范围 |
|------|------|----------|
| CIS Benchmarks | 安全配置基准 | 操作系统, 数据库 |
| PCI DSS | 支付卡行业标准 | 电商, 支付系统 |
| HIPAA | 医疗信息安全 | 医疗行业 |
| DISA STIG | 美国国防部标准 | 政府, 国防 |

**CIS Benchmark 扫描**:

1. New Scan > Compliance > CIS macOS Benchmark
2. 配置认证信息 (需要登录检查)
3. 执行扫描

**合规报告内容**:
```
合规检查结果:
├── Passed: 符合标准的配置
├── Failed: 不符合标准的配置
├── Warning: 需要人工审核
└── Not Checked: 无法检查的项目
```

---

### 自定义插件配置

**禁用特定插件**:

```
Settings > Plugins:
├── 搜索插件 ID 或名称
├── 点击插件查看详情
└── 设置 Status: Disabled
```

**插件过滤场景**:

| 场景 | 操作 |
|------|------|
| 减少误报 | 禁用已知误报插件 |
| 加速扫描 | 禁用不需要的插件族 |
| 合规要求 | 仅启用合规相关插件 |
| 特定漏洞 | 仅启用 CVE-XXXX-XXXX 相关插件 |

---

## 5. 结果分析

### 漏洞严重性级别

| 级别 | CVSS 分数 | 颜色 | 描述 | 修复优先级 |
|------|-----------|------|------|------------|
| Critical | 9.0-10.0 | 紫色 | 可被远程利用，影响严重 | 立即修复 |
| High | 7.0-8.9 | 红色 | 高风险漏洞 | 24-48 小时 |
| Medium | 4.0-6.9 | 橙色 | 中等风险 | 一周内 |
| Low | 0.1-3.9 | 绿色 | 低风险，信息泄露 | 计划修复 |
| Info | 0 | 蓝色 | 信息收集，非漏洞 | 评估处理 |

### CVSS 评分理解

```
CVSS v3.1 向量示例:
CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H

解读:
├── AV:N (Attack Vector: Network) - 网络远程攻击
├── AC:L (Attack Complexity: Low) - 攻击难度低
├── PR:N (Privileges Required: None) - 无需权限
├── UI:N (User Interaction: None) - 无需用户交互
├── S:U (Scope: Unchanged) - 影响范围未变
├── C:H (Confidentiality: High) - 机密性影响高
├── I:H (Integrity: High) - 完整性影响高
└── A:H (Availability: High) - 可用性影响高

分数: 9.8 (Critical)
```

### 练习 6: 分析扫描结果与漏洞详情

**目标**: 学会解读 Nessus 扫描结果

**步骤**:

1. 打开已完成的扫描结果

2. 结果概览页:
   ```
   Summary:
   ├── Hosts: 扫描的主机数
   ├── Critical: 紧急漏洞数
   ├── High: 高危漏洞数
   ├── Medium: 中危漏洞数
   ├── Low: 低危漏洞数
   └── Info: 信息项数
   ```

3. 漏洞详情分析:
   - 点击任意漏洞查看详情
   - 记录以下信息:

   ```
   漏洞详情:
   ├── Plugin ID: 插件编号
   ├── Name: 漏洞名称
   ├── Synopsis: 简短描述
   ├── Description: 详细描述
   ├── Solution: 修复建议
   ├── See Also: 参考链接
   ├── Risk Factor: 风险等级
   ├── CVSS Score: CVSS 分数
   ├── CVE: CVE 编号 (如有)
   └── Output: 检测输出
   ```

4. 分析真实漏洞 vs 信息收集:
   ```
   真实漏洞示例:
   - SSL Certificate Cannot Be Trusted
   - PHP < 7.4.x Multiple Vulnerabilities

   信息收集示例:
   - HTTP Server Type and Version
   - SSL Certificate Information
   - TCP/IP Timestamps Supported
   ```

---

### 练习 7: 生成 PDF/HTML 报告

**目标**: 导出专业的漏洞扫描报告

**步骤**:

1. 进入扫描结果页

2. 点击 "Export" 按钮

3. 选择报告格式:
   ```
   可用格式:
   ├── Nessus (.nessus) - Nessus 原生格式，可导入
   ├── PDF - 专业报告格式
   ├── HTML - 网页格式
   └── CSV - 电子表格格式
   ```

4. 配置报告选项:
   ```
   Report Options:
   ├── Executive Summary: 执行摘要
   ├── Vulnerabilities by Host: 按主机分组
   ├── Vulnerabilities by Plugin: 按漏洞分组
   └── Remediation: 修复建议

   Content:
   ├── Include: Critical, High, Medium, Low, Info
   └── Chapters: 根据需要勾选
   ```

5. 生成并下载报告

**报告结构**:
```
专业报告结构:
├── 封面
├── 目录
├── 执行摘要
│   ├── 风险概述
│   ├── 漏洞统计
│   └── 建议优先级
├── 漏洞详情
│   ├── 按严重性排序
│   └── 每个漏洞的完整信息
├── 修复建议
│   ├── 优先修复列表
│   └── 具体修复步骤
└── 附录
    ├── 扫描配置
    └── 插件信息
```

---

## 6. 与现有工具集成

### 练习 8: 对比 Nessus 与 ZAP 扫描结果

**目标**: 理解不同工具的扫描范围和互补性

**步骤**:

1. 准备测试目标:
   ```bash
   # 确保 DVWA 运行
   docker compose -f docker/docker-compose.yml up -d
   ```

2. 执行 Nessus 扫描:
   - Target: localhost
   - Scan Type: Basic Network Scan + Web Application Tests

3. 执行 ZAP 扫描:
   ```bash
   # 运行 ZAP Baseline 扫描
   python zap/zap-baseline.py --target http://localhost
   ```

4. 对比结果:

   | 维度 | Nessus 发现 | ZAP 发现 |
   |------|-------------|----------|
   | Web 漏洞 | ☐ | ☑ XSS, SQLi, CSRF |
   | 系统漏洞 | ☑ CVE | ☐ |
   | 配置错误 | ☑ 安全头缺失 | ☑ 安全头缺失 |
   | 版本泄露 | ☑ 服务版本 | ☑ 服务版本 |
   | SSL/TLS | ☑ 证书问题 | ☑ 证书问题 |

5. 总结互补性:
   ```
   最佳实践组合:

   ZAP (应用层):
   ├── 应用逻辑漏洞
   ├── 注入攻击
   ├── 认证绕过
   └── 业务逻辑缺陷

   Nessus (系统层):
   ├── CVE 漏洞
   ├── 补丁缺失
   ├── 服务配置
   └── 合规检查
   ```

### Nessus + ZAP 互补策略

```
完整安全测试流程:

1. 资产发现 (Nessus Host Discovery)
   └── 发现所有活跃主机和服务

2. 系统漏洞扫描 (Nessus)
   └── 检测 CVE、补丁、配置

3. Web 应用扫描 (ZAP)
   └── 检测 XSS、SQLi、CSRF

4. 手动验证 (Burp Suite)
   └── 验证高危漏洞

5. 合规检查 (Nessus Compliance)
   └── CIS Benchmark 审计

6. 报告整合
   └── 合并各工具发现
```

### 漏洞优先级排序

```
优先级矩阵:

                可利用性
              低    中    高
         ┌────────────────────┐
      高 │  中   │  高  │ 紧急 │
影    中 │  低   │  中  │  高  │
响    低 │ 信息  │  低  │  中  │
力       └────────────────────┘

决策:
├── 紧急: 立即修复，可远程利用的高危漏洞
├── 高: 24-48 小时内修复
├── 中: 一周内规划修复
├── 低: 下个迭代处理
└── 信息: 评估是否需要处理
```

---

## 7. 学习检查清单

### 知识掌握

- [ ] 理解 Nessus 与 DAST 工具 (ZAP) 的区别
- [ ] 理解漏洞严重性级别和 CVSS 评分
- [ ] 理解认证扫描与非认证扫描的区别
- [ ] 理解合规性检查的作用
- [ ] 理解插件系统的工作原理

### 实操技能

- [ ] 能完成 Nessus Essentials 安装和配置
- [ ] 能创建并执行 Host Discovery 扫描
- [ ] 能创建并执行 Basic Network Scan
- [ ] 能创建自定义扫描策略
- [ ] 能分析扫描结果和漏洞详情
- [ ] 能生成专业格式的扫描报告

### 工具熟练度

- [ ] 熟悉 Nessus Web UI 界面
- [ ] 能配置认证扫描
- [ ] 能使用插件过滤和配置
- [ ] 能对比 Nessus 和 ZAP 扫描结果

---

## 8. 常见问题 (FAQ)

### Q: Nessus 插件更新失败怎么办？

```bash
# 检查网络连接
ping plugins.nessus.org

# 手动更新插件
# 在 Web UI 中: Settings > Software Update > Update Plugins

# 检查服务状态
sudo launchctl list | grep nessus

# 重启服务
sudo launchctl stop com.tenablesecurity.nessusd
sudo launchctl start com.tenablesecurity.nessusd
```

### Q: 扫描速度太慢怎么办？

```
优化建议:
├── 减少端口范围: 仅扫描必要端口
├── 禁用不需要的插件族
├── 减少并行扫描主机数
├── 启用 "Low bandwidth links" 选项
└── 使用 Host Discovery 预筛选目标
```

### Q: 如何减少误报？

```
减少误报策略:
├── 使用认证扫描获取精确信息
├── 调整 "Show potential false alarms" 选项
├── 手动验证高危漏洞
├── 排除已知误报的插件
└── 添加漏洞排除规则
```

### Q: Nessus Essentials 与 Professional 的区别？

| 功能 | Essentials (免费) | Professional (付费) |
|------|-------------------|---------------------|
| IP 限制 | 16 个 | 无限制 |
| 合规扫描 | 有限 | 完整 |
| 技术支持 | 社区 | 专业支持 |
| 移动设备扫描 | 无 | 支持 |
| 调度扫描 | 基础 | 高级 |

### Q: 扫描 Docker 容器有什么注意事项？

```bash
# 1. 使用容器 IP 而非 localhost
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' <container_name>

# 2. 确保容器端口映射正确
docker port <container_name>

# 3. Docker 网络模式考虑
# - bridge: 使用容器 IP
# - host: 使用主机 IP
# - macvlan: 使用分配的 IP
```

---

## 9. 扩展学习

### Tenable.io (云版本)

- **官网**: https://www.tenable.com/products/tenable-io
- **特点**:
  - 云端管理，无需本地安装
  - 多租户支持
  - API 集成更丰富
  - 漏洞管理仪表板

### Nessus Professional 功能对比

| 功能 | Essentials | Professional | Tenable.io |
|------|------------|--------------|------------|
| 部署 | 本地 | 本地 | 云端 |
| IP 数量 | 16 | 无限制 | 按资产计费 |
| 合规审计 | 有限 | 完整 | 完整 |
| 仪表板 | 基础 | 高级 | 高级 |
| API | 基础 | 完整 | 完整 |
| 集成 | 有限 | 丰富 | 丰富 |

### CVSS 评分系统深入

**CVSS v3.1 完整向量**:

```
基本指标 (Base):
├── 攻击向量 (AV): Network/Adjacent/Local/Physical
├── 攻击复杂度 (AC): Low/High
├── 权限要求 (PR): None/Low/High
├── 用户交互 (UI): None/Required
├── 影响范围 (S): Unchanged/Changed
├── 机密性影响 (C): None/Low/High
├── 完整性影响 (I): None/Low/High
└── 可用性影响 (A): None/Low/High

时间指标 (Temporal):
├── 利用代码成熟度 (E): Not Defined/Unproven/PoC/Functional/High
├── 修复级别 (RL): Not Defined/Official Fix/Temporary Fix/Workaround/Unavailable
└── 报告可信度 (RC): Not Defined/Unknown/Reasonable/Confirmed

环境指标 (Environmental):
├── 修改后的基本指标
└── 安全需求 (CR/IR/AR): Low/Medium/High
```

**计算器**: https://www.first.org/cvss/calculator/3.1

### 推荐资源

| 资源 | 链接 | 描述 |
|------|------|------|
| Tenable 文档 | https://docs.tenable.com/nessus | 官方文档 |
| Tenable 大学 | https://www.tenable.com/education | 免费培训 |
| CVSS 规范 | https://www.first.org/cvss | CVSS 标准 |
| CVE 数据库 | https://cve.mitre.org | 漏洞编号查询 |
| NVD | https://nvd.nist.gov | 国家漏洞数据库 |

---

## 10. 下一步学习

完成 Phase 5 学习后，建议继续:

1. **Phase 6: OpenVAS** - 学习开源替代方案
2. **认证扫描实践** - 深入学习 SSH/WMI 认证扫描
3. **合规审计** - CIS Benchmark 深入学习
4. **漏洞管理** - 建立漏洞修复流程
5. **自动化集成** - Nessus API 与 CI/CD 集成
