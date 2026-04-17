# Git Commit 消息规范

遵循 **Conventional Commits 2.0** + 本项目自定义扩展，规范所有 commits 格式。

---

## 📋 Commit 格式

### 基础格式

```
<type>(<scope>): <subject> [<issue>]

<body>

<footer>
```

### 完整示例

```
feat(phase7): #121 - InfluxDB 1.8 版本兼容性

- 添加环境要求表格：InfluxDB 1.8 + Grafana 10.2.0
- 说明使用 InfluxQL 查询语言
- 明确版本兼容性和升级路径

Fixes: #121
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

---

## 🎯 Commit Type（提交类型）

| Type | 用途 | 例子 |
|------|------|------|
| `feat` | 新功能或特性 | `feat(phase7): add webhook receiver` |
| `fix` | Bug 修复 | `fix(phase6): resolve rate limit issue` |
| `docs` | 文档修改 | `docs(architecture): update design diagram` |
| `test` | 测试代码 | `test(k6): add soak test scenarios` |
| `refactor` | 代码重构（无功能变更） | `refactor(api): simplify request handler` |
| `perf` | 性能优化 | `perf(k6): reduce setup time by 40%` |
| `style` | 代码格式调整（不影响逻辑） | `style: fix eslint warnings` |
| `chore` | 构建脚本、依赖更新等 | `chore: update npm packages` |
| `ci` | CI/CD 工作流修改 | `ci: add k6 smoke test to pipeline` |

---

## 🔍 Scope（作用域）

> 指出 commit 影响的组件或模块

| Scope | 含义 | 适用 |
|-------|------|------|
| `phase7` | Phase 7 阶段工作 | performance-testing-platform |
| `phase6` | Phase 6 阶段工作 | performance-testing-platform |
| `api` | API 层改动 | 所有项目 |
| `k6` | k6 脚本改动 | performance-testing-platform |
| `jmeter` | JMeter 脚本改动 | performance-testing-platform |
| `grafana` | Grafana 配置改动 | performance-testing-platform |
| `middleware` | 中间件改动 | performance-testing-platform |
| `architecture` | 架构设计文档 | 所有项目 |
| `qa` | 测试相关 | 所有项目 |

**跨多个作用域时：** 使用主要作用域，或用逗号分隔（最多 2 个）

```bash
feat(k6,grafana): add metric aggregation pipeline
```

---

## 📝 Subject（主题 / 标题）

### 规则

1. **中英文混用** - 技术术语保持英文，描述用中文
2. **使用祈使句（命令式）** - 不用过去式、第三人称
   - ✅ `add webhook receiver`
   - ❌ `added webhook receiver`
   - ❌ `adds webhook receiver`
3. **首字母小写** - 除非是专有名词或缩写
   - ✅ `feat(phase7): InfluxDB 1.8 版本兼容性`
   - ❌ `Feat(phase7): Influxdb 1.8 版本兼容性`
4. **不超过 50 字符**（GitHub 建议）- 保持简洁
5. **不用句号结尾**

### Subject 中的 Issue 引用

**包含 Issue 号时的格式：**

```
feat(phase7): #121 - InfluxDB 1.8 版本兼容性
```

- Issue 号在最前面：`#XXX`
- 用 ` - ` 分隔
- 然后是简洁描述

### 示例

| ✅ 好的 | ❌ 不好的 |
|--------|---------|
| `feat(k6): #50 - add breakpoint detection logic` | `feat(k6): Add breakpoint detection logic. Fixes issue #50` |
| `fix(api): resolve connection timeout in soak test` | `fix(api): Fixed connection timeout error` |
| `docs(qa): update test case specification` | `docs(qa): Documentation updates` |
| `perf(middleware): reduce p95 by 100ms` | `perf(middleware): Performance: p95 reduced by 100ms` |

---

## 📄 Body（详细描述）

### 规则

1. **逐条列举改动**（使用 `-` 或 `*` ）
2. **每行 72 字符左右** - 便于终端显示
3. **空一行** - 与 subject 隔开
4. **中英混用**

### Body 示例

```
- 添加环境要求表格：InfluxDB 1.8 + Grafana 10.2.0
- 说明使用 InfluxQL 查询语言
- 明确版本兼容性和升级路径
- 验证所有查询语句符合 InfluxQL 1.8 标准
```

### 何时省略 Body

- 只有 1-2 个简单改动
- 改动很明显且不需要解释

```bash
git commit -m "style: fix eslint indentation issues"
```

---

## 🔗 Footer（脚注）

### 必需部分

#### 1. Issue 关联

| 关键词 | 含义 |
|--------|------|
| `Fixes: #XXX` | 修复该 issue（关闭）|
| `Refs: #XXX` | 参考该 issue（不关闭）|
| `Related: #XXX` | 相关但不直接关联 |

```
Fixes: #121
Refs: #122, #132
```

#### 2. Co-authored-by（协作署名）

所有由 Copilot 协助的 commits **必须包含**：

```
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

### 可选部分

```
Breaking-Change: description of what breaks
Tested-By: @reviewer-name
Reviewed-By: @reviewer-name
```

### Footer 示例

```
Fixes: #121
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

---

## 📚 完整 Commit 示例集

### 示例 1: Feature with Issue

```
feat(phase7): #121 - InfluxDB 1.8 版本兼容性

- 添加环境要求表格：InfluxDB 1.8 + Grafana 10.2.0
- 说明使用 InfluxQL 查询语言
- 明确版本兼容性和升级路径

Fixes: #121
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

### 示例 2: Bug Fix

```
fix(api): resolve connection timeout in soak test

原因：连接池在高并发场景未释放
解决：增加连接超时时间从 30s 到 60s

Fixes: #98
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

### 示例 3: Documentation

```
docs(architecture): update system design for Phase 7

- 添加 Grafana 告警架构图
- 补充 Webhook 集成说明
- 更新性能指标定义
```

### 示例 4: Performance

```
perf(middleware): reduce p95 latency by 100ms

通过优化请求队列管理：
- 预分配缓冲区而非动态创建
- 使用 object pool 减少 GC 压力

基准测试：p95 从 450ms 降至 350ms
```

### 示例 5: Simple Fix (无 Body)

```
fix(eslint): remove unused import in metrics.js
```

---

## ✅ Checklist（提交前检查）

在执行 `git commit` 前，检查：

- [ ] **Type 正确** - feat / fix / docs / test / refactor / perf / style / chore / ci
- [ ] **Scope 有意义** - 指出影响的组件
- [ ] **Subject 简洁** - < 50 字，首字母小写，祈使句
- [ ] **含 Issue 号** - 如果关联 issue，使用 `#XXX - ` 格式
- [ ] **Body 清晰** - 逐条列举，每行 ~72 字
- [ ] **Footer 完整** - Fixes / Refs + Copilot 署名（如需）
- [ ] **中文和英文** - 技术词汇英文，描述中文
- [ ] **无句号** - Subject 和 Body 末尾都不加句号

---

## 🛠️ 工具支持

### Git Hook (可选)

在 `.git/hooks/commit-msg` 中验证消息格式：

```bash
#!/bin/bash
# commit-msg hook to validate conventional commits format

msg="$(cat $1)"

# 检查格式：type(scope): subject
if ! echo "$msg" | grep -qE "^(feat|fix|docs|test|refactor|perf|style|chore|ci)(\([^)]+\))?: "; then
    echo "❌ Commit 消息格式不符合规范"
    echo "应该是: <type>(<scope>): <subject>"
    exit 1
fi

echo "✅ Commit 消息格式正确"
exit 0
```

### EditorConfig 建议

在 `.editorconfig` 中配置：

```ini
[COMMIT_EDITMSG]
max_line_length = 72
```

---

## 📊 应用到本项目

### Phase 7 Stage 4 & 5 所有 Commits 已应用规范

| Commit | Type | Scope | Subject |
|--------|------|-------|---------|
| 1cd4c161 | feat | phase7 | #121 - InfluxDB 1.8 版本兼容性 |
| 435ec689 | feat | phase7 | #122 - 三级告警阈值体系 |
| 054b56c8 | feat | phase7 | #132 - Webhook 配置示例和实现 |
| 1418359b | feat | phase7 | #123 - k6 helpers 模块化结构 |

---

## 📖 参考

- [Conventional Commits 2.0](https://www.conventionalcommits.org/)
- [Angular Commit Guidelines](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#-commit-message-guidelines)
- [GitHub Issue Linking](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue)

---

**最后更新:** 2026-04-18  
**适用范围:** 所有项目（michael-zhou-qa-portfolio）  
**强制执行:** 从下一个 Phase 开始
