# 问题排查记录

**日期**: 2026-03-10

---

## 问题清单

### #1 Docker Daemon 未运行

| 项目 | 内容 |
|------|------|
| 现象 | `Cannot connect to the Docker daemon at unix:///Users/michaelzhou/.docker/run/docker.sock. Is the docker daemon running?` |
| 原因 | Docker Desktop 应用未启动 |
| 解决 | 启动 Docker Desktop: `open -a Docker` |

**诊断命令**:
```bash
# 检查 Docker 是否运行
docker info

# 如果报错，启动 Docker Desktop
open -a Docker

# 等待 Docker 启动后重试
docker compose -f docker/docker-compose.yml up -d
```

### #2 docker-compose.yml `version` 警告

| 项目 | 内容 |
|------|------|
| 现象 | `WARN: the attribute 'version' is obsolete, it will be ignored` |
| 原因 | Docker Compose V2 不再需要 `version` 属性 |
| 解决 | 移除 docker-compose.yml 中的 `version: '3.8'` 行 |

**已修复**: 2026-03-10

### #3 ZAP 连接失败

| 项目 | 内容 |
|------|------|
| 现象 | `Failed to connect to ZAP` 或 pytest 跳过 ZAP 测试 |
| 原因 | ZAP 容器未启动或启动中 |
| 解决 | 等待 ZAP 完全启动（约 60 秒） |

**诊断命令**:
```bash
# 检查 ZAP 容器状态
docker compose -f docker/docker-compose.yml ps

# 检查 ZAP 是否就绪
curl http://localhost:8090/JSON/core/view/version/

# 查看 ZAP 日志
docker compose -f docker/docker-compose.yml logs zap
```

### #4 DVWA 数据库未初始化

| 项目 | 内容 |
|------|------|
| 现象 | DVWA 登录后显示数据库错误 |
| 原因 | DVWA 首次启动需要初始化数据库 |
| 解决 | 访问 http://localhost/setup.php 点击 "Create / Reset Database" |

**初始化步骤**:
1. 访问 http://localhost/setup.php
2. 点击 "Create / Reset Database"
3. 使用 admin/password 登录

### #5 端口冲突

| 项目 | 内容 |
|------|------|
| 现象 | `Bind for 0.0.0.0:80 failed: port is already allocated` |
| 原因 | 端口 80/3000/8090 被其他进程占用 |
| 解决 | 停止占用端口的进程或修改 docker-compose.yml 端口映射 |

**诊断命令**:
```bash
# 查看端口占用
lsof -i :80
lsof -i :3000
lsof -i :8090

# 停止占用进程
kill -9 <PID>

# 或修改端口映射
# docker-compose.yml 中将 "80:80" 改为 "8081:80"
```

### #6 代理干扰

| 项目 | 内容 |
|------|------|
| 现象 | 请求返回 502 Bad Gateway 或连接超时 |
| 原因 | 本地代理拦截了 localhost 请求 |
| 解决 | 设置 `no_proxy` 环境变量或使用 `--noproxy '*'` |

**解决方案**:
```bash
# 临时绕过代理
curl --noproxy '*' http://localhost:8090/JSON/core/view/version/

# 永久配置（添加到 ~/.zshrc）
export no_proxy="localhost,127.0.0.1,.local"
```

### #7 pip 命令损坏 (bad interpreter)

| 项目 | 内容 |
|------|------|
| 现象 | `zsh: /usr/local/bin/pip: bad interpreter: /usr/local/opt/python@3.9/bin/python3.9: no such file or directory` |
| 原因 | Homebrew Python 被卸载或升级，但旧的 pip 符号链接仍指向已删除的解释器 |
| 解决 | 使用系统的 `pip3` 或 `python3 -m pip` |

**诊断命令**:
```bash
# 检查可用的 Python
which python3 && python3 --version

# 检查 pip3 是否可用
which pip3 && pip3 --version

# 查看损坏的 pip 链接
ls -la /usr/local/bin/pip
```

**解决方案**:
```bash
# 方案 1：使用 pip3（推荐）
pip3 install -r requirements.txt

# 方案 2：使用 python3 -m pip
python3 -m pip install -r requirements.txt

# 方案 3：删除损坏的符号链接（可选）
rm /usr/local/bin/pip
```

**已确认环境** (2026-03-10):
- macOS Darwin 25.2.0 x86_64
- /usr/bin/python3: Python 3.9.6
- /usr/bin/pip3: pip 21.2.4

### #8 ZAP API 返回 502 代理错误

| 项目 | 内容 |
|------|------|
| 现象 | 访问 ZAP API 返回 `ZAP Error [HttpHostConnectException]: Connect to http://localhost:8090 failed: Connection refused` |
| 原因 | ZAP 根据 Host 头判断请求类型，当 Host 是 localhost:8090 时，ZAP 把它当作代理请求处理，尝试转发到容器内部的 localhost:8090，而非 API 请求 |
| 解决 | 使用自定义 Host 头（如 `Host: zap`）告诉 ZAP 这是 API 请求 |

**错误示例**:
```
# 502 错误 - ZAP 把请求当作代理请求
curl http://localhost:8090/JSON/core/view/version/
```

**正确方式**:
```bash
# 使用 Host: zap 头，告诉 ZAP 这是 API 请求
curl http://localhost:8090/JSON/core/view/version/ -H "Host: zap"
# 返回: {"version":"2.17.0"}
```

**Python 代码修复**:
```python
import requests

# 错误：ZAP 当作代理请求
# response = requests.get("http://localhost:8090/JSON/core/view/version/")

# 正确：使用自定义 Host 头
response = requests.get(
    "http://localhost:8090/JSON/core/view/version/",
    headers={"Host": "zap"}
)
```

**技术原因**:
- ZAP 同时作为代理和 API 服务器运行
- 当 Host 头是 `localhost` 或 `127.0.0.1` + 端口时，ZAP 认为这是代理请求
- ZAP 尝试连接容器内部的 localhost:8090（不存在），返回 502
- 使用非 localhost 的 Host 头（如 `zap`）可以让 ZAP 正确识别为 API 请求

**已修复文件** (2026-03-10):
- `tests/conftest.py`: `_is_zap_available()` 函数添加 `headers={"Host": "zap"}`

---

## 环境配置

### 推荐配置

```bash
# ~/.zshrc 添加
export no_proxy="localhost,127.0.0.1,kubernetes.docker.internal,.local"
```

### Docker 资源配置

OWASP ZAP 需要较多内存，建议：
- Docker Desktop → Settings → Resources
- Memory: 至少 4GB
- CPUs: 至少 2 核

---

## 快速检查清单

启动环境前检查：

- [ ] Docker Desktop 已启动（菜单栏图标为绿色）
- [ ] 端口 80, 3000, 8090 未被占用
- [ ] `no_proxy` 已配置（如使用代理）

启动后验证：

```bash
# 1. 检查容器状态
docker compose -f docker/docker-compose.yml ps

# 2. 检查 ZAP
curl http://localhost:8090/JSON/core/view/version/

# 3. 检查 DVWA
curl -I http://localhost

# 4. 检查 Juice Shop
curl -I http://localhost:3000
```

---

## 测试结果

| 类别 | 通过 | 跳过 | 失败 |
|------|------|------|------|
| XSS | 5 | 0 | 0 |
| SQL Injection | 5 | 0 | 0 |
| CSRF | 4 | 0 | 0 |
| Auth | 6 | 0 | 0 |
| Headers | 5 | 0 | 0 |
| **合计** | **25** | **0** | **0** |

*最后更新: 2026-03-10*
