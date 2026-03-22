# Phase 6 学习指南: OpenVAS 开源漏洞扫描

## 学习目标

通过 OpenVAS (Greenbone) 学习和掌握开源漏洞扫描方案，包括：
- OpenVAS (Greenbone) 架构理解
- Docker 部署与配置
- 扫描任务管理
- 开源方案 vs 商业方案对比

---

## 1. 环境配置

### OpenVAS 简介

OpenVAS (Open Vulnerability Assessment Scanner) 是 Greenbone Vulnerability Management (GVM) 框架的核心扫描引擎，是业界领先的开源漏洞扫描解决方案。

```
发展历程:
├── Nessus 开源版本 (2005年之前)
├── OpenVAS 分支 (2005年)
├── GVM 9/10 (2017-2019)
├── GVM 20/21 (2020-2021)
└── GVM 22+ (2022-至今)
```

### Docker 部署 OpenVAS

```bash
# 拉取官方 Greenbone 镜像 (约 5GB)
docker pull greenbone/openvas-scanner

# 或使用社区维护的一体化镜像 (推荐学习使用)
docker pull mikesplain/openvas

# 运行容器
docker run -d \
  --name openvas \
  -p 443:443 \
  -p 9390:9390 \
  -e OV_PASSWORD=admin \
  mikesplain/openvas

# 查看启动日志 (首次启动需要同步漏洞数据库，可能需要 15-30 分钟)
docker logs -f openvas
```

### 使用 Docker Compose 部署

```yaml
# 创建 docker-compose-openvas.yml
version: '3.8'

services:
  openvas:
    image: mikesplain/openvas
    container_name: openvas
    ports:
      - "443:443"
      - "9390:9390"
    environment:
      - OV_PASSWORD=admin
    volumes:
      - openvas_data:/var/lib/openvas
    restart: unless-stopped

volumes:
  openvas_data:
```

```bash
# 启动
docker compose -f docker-compose-openvas.yml up -d

# 等待初始化完成
docker logs -f openvas
```

### Web UI 访问

1. 等待容器完全初始化（查看日志确认）
2. 访问: https://localhost
3. 接受自签名证书警告
4. 默认凭据:
   - 用户名: `admin`
   - 密码: `admin` (或 OV_PASSWORD 设置的值)

### 验证服务状态

```bash
# 检查容器状态
docker ps | grep openvas

# 检查服务端口
curl -k https://localhost

# 进入容器检查服务
docker exec -it openvas bash
greenbone-nvt-sync --version
gvmd --version
```

---

## 2. OpenVAS 架构

### 核心组件

```
Greenbone Vulnerability Management (GVM) 架构:

┌─────────────────────────────────────────────────────────┐
│                    Web Browser                          │
│                  (GSA Web UI)                           │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────────┐
│              GSA (Greenbone Security Assistant)         │
│              - Web 前端界面                              │
│              - 用户交互                                  │
└─────────────────────┬───────────────────────────────────┘
                      │ GMP (Greenbone Management Protocol)
┌─────────────────────▼───────────────────────────────────┐
│              GVMD (Greenbone Vulnerability Manager)     │
│              - 核心管理服务                              │
│              - 任务调度                                  │
│              - 数据库管理                                │
│              - 报告生成                                  │
└─────────────────────┬───────────────────────────────────┘
                      │ OSP (Open Scanner Protocol)
┌─────────────────────▼───────────────────────────────────┐
│              OpenVAS Scanner                            │
│              - 实际漏洞扫描引擎                          │
│              - NVT (Network Vulnerability Tests) 执行   │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│              NVT (Network Vulnerability Tests)          │
│              - 漏洞检测脚本库                            │
│              - 定期从 Greenbone Feed 更新               │
└─────────────────────────────────────────────────────────┘
```

### 组件详细说明

| 组件 | 全称 | 功能 |
|------|------|------|
| GSA | Greenbone Security Assistant | Web 界面，用户交互入口 |
| GVMD | Greenbone Vulnerability Manager Daemon | 核心管理服务，处理扫描任务 |
| OpenVAS Scanner | OpenVAS Scanner | 漏洞扫描引擎 |
| OSP | Open Scanner Protocol | 扫描器通信协议 |
| GMP | Greenbone Management Protocol | 管理服务 API 协议 |
| NVT | Network Vulnerability Tests | 漏洞测试脚本 (NASL 语言) |

### NVT Feed 类型

| Feed 类型 | 描述 | 更新频率 | 费用 |
|-----------|------|----------|------|
| Greenbone Community Feed | 社区版本 | 每日 | 免费 |
| Greenbone Enterprise Feed | 企业版本 | 实时 | 付费 |

### 数据库结构

```
GVM 数据存储:

PostgreSQL Database (gvmd)
├── Hosts - 扫描目标
├── Tasks - 扫描任务
├── Results - 扫描结果
├── Reports - 报告数据
├── Configs - 扫描配置
├── Schedules - 定时计划
└── Alerts - 告警规则

Redis Cache
├── NVT 缓存
├── 扫描状态
└── 临时数据

File System
├── /var/lib/openvas/plugins - NVT 脚本
├── /var/lib/gvm/scap-data - SCAP 数据
└── /var/lib/gvm/cert-data - 证书数据
```

---

## 3. 基础扫描练习

### 练习 1: 部署 OpenVAS 环境

**目标**: 完成 OpenVAS Docker 部署和初始化

**步骤**:

```bash
# 1. 创建专用目录
mkdir -p ~/openvas-lab
cd ~/openvas-lab

# 2. 创建 docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  openvas:
    image: mikesplain/openvas
    container_name: openvas
    ports:
      - "443:443"
      - "9390:9390"
    environment:
      - OV_PASSWORD=admin123
    volumes:
      - openvas_data:/var/lib/openvas
    restart: unless-stopped

volumes:
  openvas_data:
EOF

# 3. 启动容器
docker compose up -d

# 4. 监控初始化进度
docker logs -f openvas
```

**初始化完成标志**:
```
# 看到类似以下日志表示初始化完成
Starting OpenVAS Scanner...
Starting GVMD...
Starting GSA...
Web server ready
```

**验证**:
```bash
# 检查端口
curl -k -I https://localhost

# 登录测试
# 访问 https://localhost
# 用户: admin
# 密码: admin123
```

---

### 练习 2: 创建首个扫描目标

**目标**: 在 OpenVAS 中添加扫描目标

**步骤**:

1. 登录 GSA Web UI (https://localhost)

2. 创建目标:
   ```
   Configuration > Targets > New Target

   Name: DVWA Container
   Hosts: [DVWA 容器 IP 或 host.docker.internal]
   Port List: All TCP and Nmap top 100 UDP

   Credentials (可选):
   └── SSH, SMB, ESXi, SNMP
   ```

3. 获取测试目标 IP:
   ```bash
   # 启动 DVWA
   cd /Users/michaelzhou/Documents/github/michael-zhou-qa-portfolio/security-testing-demo
   docker compose -f docker/docker-compose.yml up -d

   # 获取 DVWA IP (如果在同一网络)
   docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' docker-dvwa-1

   # 或者使用 host.docker.internal (macOS/Windows Docker)
   ```

4. 保存目标配置

**端口列表说明**:

| 端口列表 | 描述 | 端口数量 |
|----------|------|----------|
| All TCP | 全部 TCP 端口 | 65535 |
| All IANA assigned TCP | IANA 注册端口 | ~5000 |
| All privileged TCP | 特权端口 | 1-1024 |
| OpenVAS Default | 默认常用端口 | ~4500 |

---

### 练习 3: 执行 Host Discovery

**目标**: 发现目标主机和开放端口

**步骤**:

1. 创建扫描任务:
   ```
   Scans > Tasks > New Task

   Name: Host Discovery Scan
   Target: [选择创建的目标]
   Scanner: OpenVAS Default
   Scan Config: Host Discovery
   ```

2. 扫描配置说明:
   ```
   Host Discovery 配置:
   ├── ICMP Ping
   ├── TCP ACK Ping
   ├── TCP SYN Ping
   ├── ARP Ping (同网段)
   └── UDP Ping
   ```

3. 启动扫描:
   - 点击 "Start" 按钮
   - 查看扫描进度

4. 查看结果:
   ```
   Scans > Reports > [选择报告]

   发现信息:
   ├── 主机状态 (Up/Down)
   ├── 开放端口
   ├── 操作系统猜测
   └── MAC 地址
   ```

---

### 练习 4: Full and Fast 扫描

**目标**: 执行完整漏洞扫描

**步骤**:

1. 创建扫描任务:
   ```
   Scans > Tasks > New Task

   Name: Full and Fast Scan - DVWA
   Target: DVWA Container
   Scanner: OpenVAS Default
   Scan Config: Full and fast
   ```

2. 扫描配置对比:

   | 配置名称 | 描述 | NVT 数量 | 速度 |
   |----------|------|----------|------|
   | Discovery | 仅发现主机 | 少 | 快 |
   | Host Discovery | 主机和端口发现 | 少 | 快 |
   | Full and fast | 完整扫描，优化速度 | 多 | 中 |
   | Full and fast ultimate | 包含破坏性测试 | 多 | 中 |
   | Full and very deep | 深度扫描 | 全部 | 慢 |
   | Full and very deep ultimate | 最深度扫描 | 全部 | 最慢 |

3. 启动扫描并等待完成

4. 分析结果:
   - 漏洞列表
   - 严重性分布
   - 受影响主机
   - 修复建议

---

### 练习 5: 创建自定义扫描配置

**目标**: 创建针对 Web 服务的自定义扫描配置

**步骤**:

1. 基于现有配置创建:
   ```
   Configuration > Scan Configs

   选择 "Full and fast" > Clone
   重命名: Web Server Security Scan
   ```

2. 编辑 NVT 选择:
   ```
   编辑配置 > Edit NVT Families

   启用:
   ├── Web Servers
   ├── CGI abuses
   ├── CGI abuses: XSS
   ├── Databases
   ├── General
   └── Service detection

   禁用 (加速扫描):
   ├── Windows
   ├── SMTP problems
   ├── Peer-To-Peer File Sharing
   └── 其他不相关的
   ```

3. 配置扫描参数:
   ```
   Scanner Preferences:

   max_hosts: 5         # 并行扫描主机数
   max_checks: 4        # 每主机并行检查数
   network_timeout: 30  # 网络超时(秒)
   ```

4. 保存并使用:
   - 创建新任务
   - 选择自定义配置
   - 执行扫描

---

### 练习 6: 定时扫描任务

**目标**: 配置自动定时扫描

**步骤**:

1. 创建计划:
   ```
   Configuration > Schedules > New Schedule

   Name: Weekly Security Scan
   First Run: [选择日期时间]
   Period: 1 Week
   Duration: 0 (无限制)
   Timezone: Asia/Shanghai
   ```

2. 创建任务关联:
   ```
   Scans > Tasks > New Task

   Name: Weekly DVWA Scan
   Target: DVWA Container
   Scan Config: Full and fast
   Schedule: Weekly Security Scan
   ```

3. 验证配置:
   ```
   任务列表显示:
   ├── 下次执行时间
   ├── 执行周期
   └── 状态 (Scheduled)
   ```

---

### 练习 7: 扫描报告分析与导出

**目标**: 分析扫描结果并导出报告

**步骤**:

1. 查看报告:
   ```
   Scans > Reports > [选择报告]

   报告概览:
   ├── 扫描日期
   ├── 目标主机
   ├── 漏洞统计
   └── 任务信息
   ```

2. 漏洞详情分析:
   ```
   点击具体漏洞:

   详情包含:
   ├── 漏洞名称
   ├── 严重性 (CVSS)
   ├── QoD (检测质量)
   ├── 主机
   ├── 端口
   ├── 漏洞描述
   ├── 影响
   ├── 解决方案
   ├── 参考链接
   └── CVE/BID/其他编号
   ```

3. QoD (Quality of Detection) 理解:

   | QoD | 描述 | 可信度 |
   |-----|------|--------|
   | 100% | Exploit | 确认可利用 |
   | 99% | Remote_vul | 远程验证 |
   | 97% | Remote_active | 主动检测 |
   | 80% | Remote_banner | Banner 识别 |
   | 70% | Remote_analysis | 远程分析 |
   | 50% | Remote_probe | 远程探测 |
   | 30% | Remote_banner_unreliable | 不可靠 Banner |
   | 1% | General_note | 一般提示 |

4. 导出报告:
   ```
   报告页面 > Download

   可用格式:
   ├── PDF
   ├── HTML
   ├── CSV
   ├── XML
   ├── TXT
   └── Anonymous XML
   ```

---

### 练习 8: 对比 Nessus 与 OpenVAS 扫描

**目标**: 理解两种工具的差异和适用场景

**步骤**:

1. 使用相同目标分别扫描

2. 对比结果:

   | 维度 | OpenVAS | Nessus Essentials |
   |------|---------|-------------------|
   | 发现漏洞数 | 记录 | 记录 |
   | 高危漏洞 | 记录 | 记录 |
   | 误报率 | 评估 | 评估 |
   | 扫描时间 | 记录 | 记录 |
   | 报告质量 | 评估 | 评估 |

3. 分析差异:
   ```
   可能的差异原因:
   ├── NVT/Plugin 数量差异
   ├── 检测方法不同
   ├── 更新频率差异
   ├── QoD/置信度差异
   └── 扫描配置差异
   ```

---

## 4. Nessus vs OpenVAS 对比

### 功能对比表

| 功能 | Nessus Essentials | OpenVAS |
|------|-------------------|---------|
| **成本** | 免费 (16 IP) | 完全免费 |
| **开源** | 否 | 是 (GPLv2) |
| **漏洞库大小** | ~70,000+ 插件 | ~50,000+ NVT |
| **更新频率** | 实时 | 每日 (社区版) |
| **企业支持** | 有 (付费) | Greenbone (付费) |
| **部署难度** | 简单 | 中等 |
| **资源消耗** | 中 | 高 |
| **Web UI** | 优秀 | 良好 |
| **API** | 完整 | GMP 协议 |
| **合规扫描** | 丰富 | 基础 |
| **调度扫描** | 支持 | 支持 |
| **报告格式** | 多种 | 多种 |
| **认证扫描** | SSH/WMI/SNMP | SSH/SMB/ESXi/SNMP |

### 适用场景

```
选择 Nessus Essentials:
├── 小型环境 (≤16 IP)
├── 需要快速部署
├── 重视易用性
├── 需要合规审计
└── 需要官方支持

选择 OpenVAS:
├── 无 IP 限制需求
├── 预算有限
├── 需要定制开发
├── 学习/研究目的
└── 大规模扫描需求
```

### 技术对比

```
扫描引擎:
├── Nessus: 专有引擎 + NASL
└── OpenVAS: 开源引擎 + NASL

漏洞检测脚本:
├── Nessus: Plugins (专有 NASL)
└── OpenVAS: NVT (开源 NASL)

数据库:
├── Nessus: 专有数据库
└── OpenVAS: PostgreSQL + Redis

API:
├── Nessus: RESTful API
└── OpenVAS: GMP (XML-based)
```

### 性能对比

| 指标 | Nessus | OpenVAS |
|------|--------|---------|
| 内存使用 | ~2GB | ~4GB+ |
| 磁盘空间 | ~5GB | ~10GB+ |
| 扫描速度 | 快 | 中等 |
| 初始化时间 | 快 | 慢 (NVT 同步) |
| 并发能力 | 优秀 | 良好 |

---

## 5. 高级配置

### GMP API 使用

```python
#!/usr/bin/env python3
"""GMP API 示例 - 获取任务列表"""

from gvm.connections import TLSConnection
from gvm.protocols.gmp import Gmp
from gvm.transforms import EtreeCheckCommandTransform

# 连接配置
hostname = 'localhost'
port = 9390
username = 'admin'
password = 'admin123'

# 建立连接
connection = TLSConnection(hostname=hostname, port=port)
transform = EtreeCheckCommandTransform()

with Gmp(connection=connection, transform=transform) as gmp:
    # 认证
    gmp.authenticate(username, password)

    # 获取版本
    version = gmp.get_version()
    print(f"GVM Version: {version}")

    # 获取任务列表
    tasks = gmp.get_tasks()
    for task in tasks.findall('task'):
        print(f"Task: {task.find('name').text}")
```

### 安装 Python GVM 库

```bash
pip install python-gvm
```

### 命令行工具

```bash
# 进入容器
docker exec -it openvas bash

# 使用 gvm-cli
gvm-cli --gmp-username admin --gmp-password admin123 \
  socket --xml "<get_version/>"

# 获取任务
gvm-cli --gmp-username admin --gmp-password admin123 \
  socket --xml "<get_tasks/>"
```

### 自定义 NVT

```nasl
# 示例 NVT 脚本 (NASL 语言)
# /var/lib/openvas/plugins/custom_check.nasl

if (description) {
  script_id(900001);
  script_name("Custom Security Check");
  script_category(ACT_GATHER_INFO);
  script_family("Custom Checks");

  script_tag(name:"summary",
    value:"Custom security verification script");

  exit(0);
}

# 实际检测逻辑
port = get_http_port(default:80);

if (!get_port_state(port)) {
  exit(0);
}

# 发送请求并检查响应
req = http_get(item:"/", port:port);
res = http_keepalive_send_recv(port:port, data:req);

if ("vulnerable-pattern" >< res) {
  security_message(port:port, data:"Vulnerability found!");
}

exit(0);
```

---

## 6. 告警与通知

### 配置邮件告警

```
Configuration > Alerts > New Alert

Name: High Severity Alert
Event: Task run status changed
Condition: Severity at least High
Method: Email

Email Settings:
├── To: security@example.com
├── From: openvas@example.com
├── Subject: [OpenVAS] High Severity Vulnerability Found
└── Content: Include report summary
```

### 告警条件

| 条件 | 描述 |
|------|------|
| Always | 总是触发 |
| Severity at least | 严重性达到阈值 |
| Severity changed | 严重性变化 |
| Filter count at least | 符合过滤器的结果达到数量 |
| Filter count changed | 符合过滤器的结果数量变化 |

### 告警方法

| 方法 | 描述 |
|------|------|
| Email | 发送邮件 |
| HTTP Get | 调用 HTTP GET |
| Start Task | 触发另一个任务 |
| SCP | 复制报告到远程服务器 |
| Send | 发送到指定主机端口 |
| SMB | 复制到 SMB 共享 |
| SNMP | 发送 SNMP Trap |
| Sourcefire Connector | Sourcefire 集成 |
| Syslog | 发送到 Syslog |
| verinice Connector | verinice 集成 |

---

## 7. 学习检查清单

### 知识掌握

- [ ] 理解 GVM 架构和各组件作用
- [ ] 理解 NVT 和漏洞检测原理
- [ ] 理解 QoD (检测质量) 概念
- [ ] 理解 OpenVAS vs Nessus 的差异
- [ ] 理解开源与商业方案的权衡

### 实操技能

- [ ] 能使用 Docker 部署 OpenVAS
- [ ] 能创建和管理扫描目标
- [ ] 能配置和执行各类扫描
- [ ] 能创建自定义扫描配置
- [ ] 能分析扫描结果和漏洞详情
- [ ] 能导出各种格式的报告
- [ ] 能配置定时扫描任务

### 工具熟练度

- [ ] 熟悉 GSA Web UI 界面
- [ ] 能使用 GMP API 基础功能
- [ ] 能配置告警通知
- [ ] 能进行基础故障排查

---

## 8. 常见问题 (FAQ)

### Q: OpenVAS 容器启动很慢怎么办？

```bash
# 首次启动需要同步 NVT，可能需要 15-30 分钟
# 查看进度
docker logs -f openvas

# 等待看到 "Starting GSA" 或 "Web server ready"

# 如果长时间无响应，检查网络
docker exec openvas ping -c 3 feed.community.greenbone.net
```

### Q: 登录失败怎么办？

```bash
# 重置密码
docker exec -it openvas bash
gvmd --user=admin --new-password=newpassword

# 或者重建容器
docker rm -f openvas
docker volume rm openvas_openvas_data
# 重新创建
```

### Q: NVT 更新失败怎么办？

```bash
# 进入容器手动更新
docker exec -it openvas bash

# 同步 NVT
greenbone-nvt-sync

# 同步 SCAP 数据
greenbone-scapdata-sync

# 同步 CERT 数据
greenbone-certdata-sync

# 重建缓存
openvas -u
```

### Q: 扫描结果为空怎么办？

```
检查清单:
├── 目标主机是否可达 (ping)
├── 端口列表是否正确
├── 防火墙是否阻挡
├── 扫描配置是否正确
└── NVT 是否已更新
```

### Q: 如何减少资源消耗？

```
优化建议:
├── 限制并行扫描数 (max_hosts)
├── 使用精简扫描配置
├── 定期清理历史报告
├── 使用 SSD 存储
└── 分配足够内存 (建议 4GB+)
```

### Q: 容器占用太多磁盘空间？

```bash
# 清理旧报告
docker exec openvas gvmd --delete-report=[report_id]

# 查看磁盘使用
docker system df

# 清理 Docker 缓存
docker system prune -a
```

---

## 9. 扩展学习

### Greenbone 企业版

| 产品 | 描述 | 特点 |
|------|------|------|
| Greenbone Community Edition | 社区开源版 | 免费，社区 Feed |
| Greenbone Enterprise TRIAL | 试用版 | 14 天企业 Feed |
| Greenbone Enterprise | 企业版 | 完整功能，付费支持 |

### 与其他工具集成

```
集成方案:

CI/CD 集成:
├── Jenkins + GMP API
├── GitLab CI + 脚本
└── GitHub Actions + API 调用

SIEM 集成:
├── Splunk
├── Elastic Stack
└── Graylog

工单系统:
├── Jira
├── ServiceNow
└── OTRS
```

### 相关认证

| 认证 | 颁发机构 | 相关性 |
|------|----------|--------|
| CEH | EC-Council | 漏洞评估 |
| OSCP | Offensive Security | 渗透测试 |
| GPEN | SANS/GIAC | 渗透测试 |
| CompTIA Security+ | CompTIA | 安全基础 |

### 推荐资源

| 资源 | 链接 | 描述 |
|------|------|------|
| Greenbone 官方文档 | https://docs.greenbone.net | 官方文档 |
| OpenVAS Wiki | https://github.com/greenbone/openvas | GitHub Wiki |
| GVM 架构文档 | https://greenbone.github.io/docs/ | 架构详解 |
| NASL 参考 | https://docs.greenbone.net/API/ | 脚本语言 |

---

## 10. 下一步学习

完成 Phase 6 学习后，建议继续:

1. **漏洞管理实践** - 建立漏洞修复流程和优先级
2. **GMP API 开发** - 使用 Python 开发自动化脚本
3. **自定义 NVT** - 学习 NASL 语言编写检测脚本
4. **集成实践** - 将 OpenVAS 集成到 CI/CD 流程
5. **对比测试** - 深入对比多种扫描工具

### 安全测试工具全景

```
安全测试工具栈:

应用层 (DAST):
├── OWASP ZAP (开源)
├── Burp Suite (商业/社区)
└── Acunetix (商业)

系统层 (漏洞扫描):
├── Nessus (商业/免费版)
├── OpenVAS (开源)
└── Qualys (云端/商业)

代码层 (SAST):
├── SonarQube (开源/商业)
├── Checkmarx (商业)
└── Fortify (商业)

依赖层 (SCA):
├── OWASP Dependency-Check (开源)
├── Snyk (商业/免费版)
└── npm audit / pip-audit (免费)
```

### 完整安全测试流程

```
DevSecOps 安全测试流程:

开发阶段:
├── SAST - 静态代码分析
├── SCA - 依赖安全检查
└── IDE 插件 - 实时检查

CI/CD 阶段:
├── 自动化 SAST
├── 依赖漏洞扫描
└── 容器镜像扫描

测试阶段:
├── DAST - 动态应用测试 (ZAP)
├── 漏洞扫描 (Nessus/OpenVAS)
└── 渗透测试 (Burp Suite)

生产阶段:
├── 持续漏洞监控
├── WAF 部署
└── 安全事件响应
```
