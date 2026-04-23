# SOP: Preflight Check Script 使用指南

## 🎯 目的

`scripts/preflight-check.sh` 用于**自动验证和准备** Stage 4 集成测试环境。本脚本会：

1. 清理孤立的 Node 进程
2. 检查系统资源（Load、Memory、CPU）
3. **自动启动 Docker/OrbStack**（如果未启动）

---

## 📋 快速使用

### 基础使用（系统资源检查）

```bash
bash scripts/preflight-check.sh
```

**输出示例**:

```
==================================================
  Performance Test Pre-flight Check
==================================================

[ 1/4 ] Checking for orphaned node processes...
  No orphaned processes found.

[ 2/4 ] Checking Load Average (threshold: < 10)...
  Current: 4.43
  ✅ Load Average OK

[ 3/4 ] Checking Available Memory (min: 2 GB)...
  Available: 4526 MB  (required: 2048 MB / 2 GB)
  ✅ Memory OK

[ 4/4 ] Checking CPU Idle (min: 50%)...
  Current idle: 74.1%
  ✅ CPU Idle OK

==================================================
  ✅ Preflight passed — environment ready for testing
==================================================
```

### Stage 4 集成测试模式（含 Docker 检查 + 自动启动）

```bash
bash scripts/preflight-check.sh --stage4
```

**行为**:

- ✅ 如果 Docker 已运行 → 继续
- 🔧 如果 Docker 未运行 → **自动尝试启动** (OrbStack → Docker → Colima)
- ❌ 如果启动失败 → 报错并退出

---

## 📊 检查项详解

### Step 1: 清理孤立进程

```
检查: ps aux | grep 'node -e'
清理: kill -9 <pid>
说明: 移除上次测试的临时 Node 脚本，防止端口占用
```

**异常排查**:

```bash
# 如果提示 "Found orphaned processes"：
ps aux | grep node  # 查看所有 Node 进程
npm stop             # 或手工清理
```

---

### Step 2: Load Average 检查

```
阈值: < 10 (可自定义: LOAD_THRESHOLD=5)
检查: sysctl -n vm.loadavg
说明: 系统负载过高会导致测试结果不稳定
```

**异常排查**:

```bash
# 查看当前负载
uptime
# 或
sysctl vm.loadavg

# 降低负载
killall node  # 关闭其他 Node 进程
killall npm   # 关闭 npm
# 等待几分钟
```

---

### Step 3: Available Memory 检查

```
阈值: ≥ 2 GB (可自定义: MEM_MIN_GB=4)
检查: vm_stat 计算可用内存
说明: 集成测试需要足够内存运行多个 Node 实例 + Docker
```

**异常排查**:

```bash
# 查看内存使用
top -l 1 | head -20

# 清理 node_modules 缓存
npm run clean
rm -rf node_modules
npm install

# 关闭其他应用
killall Chrome
killall "Visual Studio Code"
```

---

### Step 4: CPU Idle 检查

```
阈值: ≥ 50% (可自定义: CPU_IDLE_MIN=70)
检查: top -l 1 | grep "CPU usage"
说明: CPU 占用过高会导致测试超时
```

**异常排查**:

```bash
# 查看 CPU 占用
top -l 1 | grep "CPU usage"

# 关闭后台应用
# Activity Monitor → Force Quit
```

---

### Step 5: Docker Check (--stage4 only)

```
检查: docker info
自动启动: OrbStack (推荐) → Docker Desktop → Colima
超时: 15 秒 (每个容器运行时)
```

**启动优先级**:

| 优先级 | 容器           | 启动时间 | 平台          | 推荐度     |
| ------ | -------------- | -------- | ------------- | ---------- |
| 1      | OrbStack       | 3-5s     | macOS         | ⭐⭐⭐⭐⭐ |
| 2      | Docker Desktop | 8-15s    | macOS/Windows | ⭐⭐⭐     |
| 3      | Colima         | 5-8s     | macOS/Linux   | ⭐⭐⭐⭐   |

**安装 OrbStack** (推荐):

```bash
# 官网下载: https://orbstack.dev
# 或 Homebrew
brew install orbstack
# 启动
open -a OrbStack
```

---

## 🔧 环境变量定制

### 自定义阈值

```bash
# 提高 Load Average 阈值 (系统繁忙时)
export LOAD_THRESHOLD=15
bash scripts/preflight-check.sh

# 提高 Memory 要求 (确保更充足的内存)
export MEM_MIN_GB=4
bash scripts/preflight-check.sh

# 提高 CPU Idle 要求 (确保 CPU 充足)
export CPU_IDLE_MIN=70
bash scripts/preflight-check.sh --stage4
```

### 禁用自动启动 (如需完全控制)

```bash
# 当前不支持，但可以手动启动
open -a OrbStack
sleep 5
bash scripts/preflight-check.sh --stage4
```

---

## ❌ 常见问题

### Q1: "❌ Docker daemon not running" 怎么办？

**脚本会自动尝试启动**。如果失败：

```bash
# 手动启动 OrbStack
open -a OrbStack
sleep 5

# 验证
docker info

# 重新运行脚本
bash scripts/preflight-check.sh --stage4
```

### Q2: "❌ Load Average 超过阈值"

**解决方案**:

```bash
# 1. 查看占用资源的进程
top

# 2. 关闭不必要的应用
killall node
killall npm

# 3. 等待几分钟
sleep 120

# 4. 重试
bash scripts/preflight-check.sh
```

### Q3: "❌ Available Memory 不足"

**解决方案**:

```bash
# 1. 清理 npm 缓存
npm cache clean --force

# 2. 删除 node_modules
rm -rf node_modules

# 3. 关闭 Docker（临时）
killall Docker

# 4. 重启机器（最后手段）
reboot
```

### Q4: 脚本卡住/无法启动 Docker

**排查**:

```bash
# 1. 查看 Docker 日志
log stream --predicate 'process == "Docker"'

# 2. 强制重启 Docker
killall Docker
sleep 3
open -a Docker
sleep 15

# 3. 检查磁盘空间
df -h

# 4. 清理 Docker
docker system prune --all
```

---

## 📈 Stage 4 集成测试完整流程

```bash
# 1️⃣ 预检查（环境验证）
bash scripts/preflight-check.sh --stage4
# ✅ Preflight passed

# 2️⃣ 启动 API 服务器
npm start &
# 或单机模式：npm start:single &

# 3️⃣ 等待服务器就绪
sleep 5
curl http://localhost:3000/health

# 4️⃣ 运行集成测试
npm run test:integration
# ✅ All tests passed

# 5️⃣ 停止服务器
npm stop
```

---

## 📝 脚本输出解释

### ✅ 成功

```
[ X/X ] Checking ...
  ✅ <Check Name> OK
```

→ 此检查通过，无需操作

### ⚠️ 警告 (自动修复中)

```
[ 5/5 ] Checking Docker ...
  ⏳ Docker daemon not running — attempting auto-start...
  → Starting OrbStack...
  ✅ Docker daemon started successfully
```

→ 自动启动成功，继续流程

### ❌ 失败

```
[ X/X ] Checking ...
  ❌ <Check Name> FAILED
  → Action required: <解决方案>
```

→ 需要手工干预，参考上文"常见问题"

---

## 🔍 调试模式

### 查看详细日志

```bash
# 显示每一步执行
bash -x scripts/preflight-check.sh --stage4

# 只看错误步骤
bash scripts/preflight-check.sh 2>&1 | grep -E "❌|ERROR|failed"
```

### 手动测试单个检查

```bash
# 测试 Docker
docker info

# 测试 Load Average
sysctl -n vm.loadavg

# 测试内存
vm_stat | grep "Pages free"

# 测试 CPU
top -l 1 | grep "CPU usage"
```

---

## 📋 集成到 CI/CD

### GitHub Actions 中使用

```yaml
name: Preflight Check before Integration Tests

on: [push, pull_request]

jobs:
  preflight:
    runs-on: macos-latest # 需要 macOS 以支持 OrbStack
    steps:
      - uses: actions/checkout@v4
      - name: Run preflight check
        run: bash scripts/preflight-check.sh --stage4
      - name: Run integration tests
        if: success()
        run: npm run test:integration
```

---

## 🚀 最佳实践

| 操作           | 推荐                | 原因               |
| -------------- | ------------------- | ------------------ | -------- |
| **何时运行**   | 每次 Stage 4 测试前 | 确保环境干净       |
| **频率**       | 每天至少一次        | 防止资源积累       |
| **并行执行**   | ❌ 不要并行         | 可能导致端口冲突   |
| **自定义阈值** | 根据硬件调整        | 低端机器降低阈值   |
| **保存日志**   | `...                | tee preflight.log` | 事后分析 |

---

## 📞 支持

遇到问题？

1. 查看本 SOP 的"常见问题"
2. 检查 `/docs/project-management/postmortems/INC-2026-04-21-*.md` (架构设计详解)
3. 查看脚本源代码: `scripts/preflight-check.sh`

---

**文档版本**: 1.0  
**最后更新**: 2026-04-21  
**下次审查**: 2026-05-21
