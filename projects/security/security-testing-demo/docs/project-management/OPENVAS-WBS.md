# OpenVAS 集成 WBS

## WBS 结构

```
1.0 OpenVAS 集成
├── 1.1 Docker 配置
│   └── docker/docker-compose.yml (添加 openvas 服务)
│
├── 1.2 依赖配置
│   ├── requirements.txt (添加 python-gvm)
│   └── .env.example (添加环境变量)
│
├── 1.3 核心代码
│   ├── utils/openvas_helper.py (新建 ~400行)
│   └── tests/conftest.py (添加 fixtures)
│
├── 1.4 测试用例
│   └── tests/test_openvas_scan.py (新建 ~300行)
│
├── 1.5 文档
│   └── CLAUDE.md (更新)
│
└── 1.6 验证
    ├── 环境启动
    └── 测试运行
```

---

## 文件变更

| 文件 | 操作 |
|------|------|
| `docker/docker-compose.yml` | 修改 |
| `requirements.txt` | 修改 |
| `.env.example` | 修改 |
| `utils/openvas_helper.py` | 新建 |
| `tests/conftest.py` | 修改 |
| `tests/test_openvas_scan.py` | 新建 |
| `CLAUDE.md` | 修改 |

---

## OpenVASHelper 方法

```python
# 连接
is_connected() -> bool
authenticate() -> bool
get_version() -> str

# 扫描
create_target(name, hosts) -> target_id
create_task(name, target_id, config) -> task_id
start_task(task_id) -> report_id
wait_for_task(task_id, timeout) -> bool

# 结果
get_results(task_id) -> list
get_report_summary(task_id) -> dict

# 清理
delete_task(task_id) -> bool
delete_target(target_id) -> bool
```

---

## 测试用例

| 类 | 测试 |
|----|------|
| TestOpenVASConnection | 连接、版本、认证、NVT检查 |
| TestOpenVASTargetManagement | 创建目标 |
| TestOpenVASHostDiscovery | 主机发现扫描 |
| TestOpenVASVulnerabilityScan | DVWA扫描、漏洞检测 |
| TestOpenVASVulnerabilities | 严重性分类、漏洞详情 |
| TestOpenVASReporting | 报告摘要、配置选项 |
| TestOpenVASIntegration | 与Nessus/ZAP互补 |

---

## 验证命令

```bash
# 启动
docker compose -f docker/docker-compose.yml up -d
# 等待 5 分钟

# 测试
pytest -m openvas -v

# Web UI
# https://127.0.0.1:9392 (admin/admin)
```

---

## 验收标准

- [x] OpenVAS 容器启动成功
- [x] Web UI 可访问 (rsync 下载 NVT 时可能卡住)
- [x] pytest -m openvas 通过 (10 pass, 10 skip when unavailable)
- [x] 服务不可用时优雅跳过

## 完成状态

**Status: COMPLETED** (2024-03-11)

所有代码已实现并提交到 `feature/security-testing` 分支。

已知问题: OpenVAS 容器首次启动时 rsync 下载 NVT 数据库可能卡住，需要稳定网络连接。
