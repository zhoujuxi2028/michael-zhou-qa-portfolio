# Bug 列表与回归测试

## 🐛 Bug #1: Newman HTMLExtra 报告缺失

### 问题
```bash
# 运行时显示警告
newman: could not find 'htmlextra' reporter
# 结果：没有生成 newman/api-report.html
```

### 原因
官方镜像 `postman/newman:6-alpine` 没有安装 htmlextra reporter

### 修复
创建 `Dockerfile.newman`:
```dockerfile
FROM postman/newman:6-alpine
RUN npm install -g newman-reporter-htmlextra
```

修改 `docker-compose.yml`:
```yaml
newman:
  build:
    context: .
    dockerfile: Dockerfile.newman
```

### 回归测试
```bash
cd test-project

# 1. 构建镜像
docker compose build newman

# 2. 清理旧报告
rm -f newman/api-report.html

# 3. 运行测试
docker compose up newman

# 4. 验证
ls -lh newman/api-report.html
# ✅ 应该存在，大小 > 200KB
```

**验证点**:
- [ ] 没有 "could not find" 警告
- [ ] 文件存在: `newman/api-report.html`
- [ ] 文件大小 > 200KB
- [ ] 可以在浏览器打开

---

## 🐛 Bug #2: Cypress 测试被中断

### 问题
```bash
# 使用旧命令
docker compose up --abort-on-container-exit

# 结果：
# - 只跑了 01-api-tests.cy.js (7个测试)
# - 02-ui-tests.cy.js 没运行 (9个测试)
# - Cypress exit code: 137 (被杀)
# - 只有1个视频文件
```

### 原因
- Newman 6.2秒完成退出
- `--abort-on-container-exit` 杀掉还在运行的 Cypress（需要14秒）
- Cypress 被 SIGKILL 中断

### 修复
使用后台运行 + 等待所有容器完成：
```bash
# 旧命令（有问题 - 会提前中断）
docker compose up --abort-on-container-exit

# 方法1：后台运行 + 等待完成（推荐）
docker compose up -d
docker compose wait cypress newman

# 方法2：使用npm脚本
npm run docker:test:detached
```

更新 `package.json`:
```json
"docker:test:detached": "docker compose up -d && docker compose wait cypress newman"
```

**为什么这样解决**:
- `-d` 后台运行，不会在任何容器退出时自动停止
- `wait` 命令等待指定的容器全部完成
- Newman (6秒) 和 Cypress (15秒) 都能完整执行

### 回归测试

#### 方法1: 使用带日志的测试脚本（推荐）
```bash
cd test-project

# 运行完整回归测试（生成详细日志）
./run-regression-test-with-logs.sh

# 查看测试总结
cat test-logs/test-summary-*.txt

# 查看详细日志
ls -lh test-logs/
```

#### 方法2: 手动测试
```bash
cd test-project

# 1. 清理旧数据
rm -rf cypress/videos/*

# 2. 后台运行测试
docker compose up -d

# 3. 等待完成
docker compose wait cypress newman

# 4. 检查视频数量
ls cypress/videos/*.mp4 | wc -l
# ✅ 应该是 2

# 5. 检查测试数量
docker compose logs cypress | grep "All specs"
# ✅ 应该显示 16 passing

# 6. 清理
docker compose down
```

#### 方法3: 使用npm脚本
```bash
npm run docker:test        # 运行测试
npm run docker:test:logs   # 运行测试并生成日志
```

**验证点**:
- [ ] Newman 完成后 Cypress 继续运行（不被杀）
- [ ] Cypress exit code = 0（不是137）
- [ ] 生成2个视频文件
- [ ] 执行16个测试（不是7个）

---

## 🐛 Bug #3: 回归测试脚本日志解析错误

### 问题
```bash
# 运行测试脚本时显示错误的统计数据
[2026-02-21 14:15:25] ⚠️  Cypress: 39/16 测试执行（预期 16）
./run-regression-test-with-logs.sh: line 183: [: assertions: integer expression expected
[2026-02-21 14:15:25] ⚠️  Newman: assertions 断言（预期 18）
```

### 原因
- **Cypress**: 正则表达式 `grep -o "[0-9]*$"` 提取了错误的数字
- **Newman**: `awk '{print $2}'` 提取了字段名 "assertions" 而不是数值 "18"
- **Shell 错误**: 在整数比较中使用了非整数字符串

### 修复
修改 `run-regression-test-with-logs.sh` (line 172-189):

```bash
# 提取 Cypress 测试数量（使用 awk 精确匹配）
CYPRESS_TESTS=$(docker compose logs cypress 2>/dev/null | \
    grep "All specs passed" | \
    awk '{for(i=1;i<=NF;i++) if($i~/^[0-9]+$/ && $(i+1)~/^[0-9]+$/) {print $(i+1); exit}}' | \
    head -1)

# 提取 Newman 断言数量（使用 Perl regex lookbehind）
NEWMAN_ASSERTIONS=$(docker compose logs newman 2>/dev/null | \
    grep "assertions" | \
    grep -oP 'assertions\s*│\s*\K\d+' | \
    head -1)

# 验证并设置默认值
CYPRESS_TESTS=${CYPRESS_TESTS:-0}
NEWMAN_ASSERTIONS=${NEWMAN_ASSERTIONS:-0}

# 确保是整数
if ! [[ "$CYPRESS_TESTS" =~ ^[0-9]+$ ]]; then
    CYPRESS_TESTS=0
fi

if ! [[ "$NEWMAN_ASSERTIONS" =~ ^[0-9]+$ ]]; then
    NEWMAN_ASSERTIONS=0
fi
```

### 回归测试
```bash
cd test-project

# 运行修复后的脚本
./run-regression-test-with-logs.sh

# 验证结果
cat test-logs/test-summary-*.txt | grep -E "Cypress:|Newman:"
# ✅ 应该显示: Cypress: 16/16
# ✅ 应该显示: Newman 断言: 18
```

**验证点**:
- [ ] 无 "39/16" 错误
- [ ] 无 "assertions" 字符串错误
- [ ] 无 "integer expression expected" 错误
- [ ] 正确显示 "Cypress: 16/16 测试通过"
- [ ] 正确显示 "Newman: 18 断言通过"

---

## ✅ 完整回归测试（一键执行）

```bash
#!/bin/bash
cd test-project

echo "=== 清理环境 ==="
rm -rf newman/api-report.html cypress/videos/*
docker compose down -v

echo ""
echo "=== Bug #1: 构建镜像 ==="
docker compose build newman

echo ""
echo "=== 运行所有测试 ==="
docker compose up --exit-code-from cypress

echo ""
echo "=== 验证结果 ==="
echo "Newman报告: $(ls -lh newman/api-report.html 2>/dev/null || echo '❌ 不存在')"
echo "视频数量: $(ls cypress/videos/*.mp4 2>/dev/null | wc -l)"
echo "退出码: $?"

# 快速检查
if [ -f newman/api-report.html ] && [ $(ls cypress/videos/*.mp4 2>/dev/null | wc -l) -eq 2 ]; then
  echo ""
  echo "✅ 所有Bug已修复！"
else
  echo ""
  echo "❌ 仍有问题，请检查上面的输出"
fi
```

**保存为**: `test-project/run-regression-test.sh`

**使用**:
```bash
chmod +x run-regression-test.sh
./run-regression-test.sh
```

---

## 📊 测试结果记录

| Bug | 描述 | 状态 | 备注 |
|-----|------|------|------|
| #1 | Newman HTMLExtra 缺失 | ☐ 通过 ☐ 失败 | 报告大小: _____ KB |
| #2 | Cypress 测试中断 | ☐ 通过 ☐ 失败 | 视频数量: _____ 个 |

**测试日期**: _______________
**测试人**: _______________

---

## 🎯 5分钟快速验证

```bash
cd test-project
docker compose build newman
rm -rf newman/api-report.html cypress/videos/*
docker compose up --exit-code-from cypress
ls -lh newman/api-report.html
ls cypress/videos/
```

**期望**:
- ✅ `newman/api-report.html` 存在
- ✅ `cypress/videos/` 有2个 .mp4 文件
- ✅ 退出码 = 0
