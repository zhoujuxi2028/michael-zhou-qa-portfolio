# Pre-commit Hook Coverage Improvement Plan

**Issue:** #74  
**Date:** 2026-04-14  
**Status:** Planning Document

## 目标

完成 Husky pre-commit hook 覆盖，确保所有 Python 和 JavaScript 项目在提交前都能通过 lint 验证。

## 现状分析

| 项目 | Python | JS | Commit-Msg |
|------|--------|-----|-----------|
| root | ⚠️ ruff only | ❌ | ✅ |
| api-testing-demo | N/A | ✅ lint-staged | ✅ |
| cicd-demo | N/A | ⚠️ (eslint only) | ❌ |
| performance-testing-platform | N/A | ⚠️ (手动配置，非lint-staged) | N/A |
| k8s-auto-testing-platform | ⚠️ | N/A | N/A |
| sid-iam-testing-platform | ⚠️ | N/A | N/A |
| security-testing-demo | ⚠️ | N/A | N/A |
| microservice-testing-platform | ⚠️ | N/A | N/A |

## 改进方案

### 1. Root Pre-commit Hook 改进

**目标:** 统一 Python 和 JS lint 工具，扩展覆盖范围

**当前实现:**
```bash
# Python: ruff only
ruff check $CHANGED_PY
ruff format --check $CHANGED_PY

# JS: performance-testing-platform only
cd performance-testing-platform && npx eslint $CHANGED_JS
```

**改进方案 A: 使用 lint-staged（推荐）**
```bash
#!/bin/sh
# Root pre-commit hook delegates to individual projects
npx lint-staged
```

每个项目在自己的 package.json 中配置 lint-staged：
```json
{
  "lint-staged": {
    "*.py": ["black --check", "isort --check-only", "ruff check"],
    "src/**/*.js": ["eslint --fix"],
    "tests/**/*.js": ["eslint --fix"]
  }
}
```

**改进方案 B: 集中式 Hook（如果项目不使用 npm）**

对于 Python 项目，在 root 添加：
```bash
# Python formatting + linting
CHANGED_PY=$(git diff --cached --name-only -- '*.py' | grep -v venv/)
if [ -n "$CHANGED_PY" ]; then
  source venv/bin/activate
  black --check $CHANGED_PY
  isort --check-only $CHANGED_PY
  ruff check $CHANGED_PY
fi
```

### 2. Performance-testing-platform Lint-Staged 配置

**文件:** `performance-testing-platform/package.json`

```json
{
  "lint-staged": {
    "src/**/*.js": "eslint --fix",
    "tests/unit/**/*.js": "eslint --fix"
  }
}
```

**状态:** ✅ DONE (已在 package.json 中配置)

### 3. Commit-msg Hook 增强

**目标:** 确保所有项目均有规范的 commit message 验证

**当前:** Root 已有验证，但 cicd-demo 缺失

**改进:** 为缺少 commit-msg hook 的项目添加规范检查

### 4. Coverage 扩展

#### Python 项目列表
- k8s-auto-testing-platform
- sid-iam-testing-platform
- security-testing-demo
- microservice-testing-platform

**改进方案:** 在 root pre-commit 中循环检查各项目

```bash
# Lint each Python project
for project_dir in k8s-auto-testing-platform sid-iam-testing-platform security-testing-demo microservice-testing-platform; do
  if [ -f "$project_dir/requirements.txt" ]; then
    CHANGED_PY=$(git diff --cached --name-only -- "$project_dir/*.py" | grep -v venv/)
    if [ -n "$CHANGED_PY" ]; then
      echo "Linting $project_dir..."
      cd "$project_dir" && source venv/bin/activate
      black --check $CHANGED_PY
      isort --check-only $CHANGED_PY
      cd ..
    fi
  fi
done
```

## 实现步骤

1. **Phase 1: Performance-testing-platform**
   - ✅ 添加 lint-staged 到 package.json
   - 在 root pre-commit 中调用 `cd performance-testing-platform && npx lint-staged`

2. **Phase 2: Root Hook 重构**
   - 统一 Python lint 工具链（black + isort + ruff）
   - 添加 JS 项目的自动发现和 lint

3. **Phase 3: 其他项目覆盖**
   - 为 Python 项目增加 pre-commit hook
   - 为 cicd-demo 增加 commit-msg hook

4. **Phase 4: 验证**
   - 测试所有触发场景（新提交、修改、删除）
   - 确保不影响非 node/python 项目

## 优先级

| Phase | 工作量 | 影响 | 优先级 |
|-------|--------|------|--------|
| 1 | 15 min | 中 | 🔴 高 |
| 2 | 1h | 高 | 🟡 中 |
| 3 | 2h | 中 | 🟢 低 |
| 4 | 30 min | 中 | 🔴 高 |

## 关键指标

**成功标准:**
- ✅ 所有 JS 项目提交前 lint 检查通过
- ✅ 所有 Python 项目提交前 format + lint 检查通过
- ✅ 所有项目 commit-msg 规范验证通过
- ✅ CI 绿灯率不因 hook 增加而下降

**测试方案:**
```bash
# Test: Intentional lint error
echo 'x=1' >> src/test.js
git add src/test.js
git commit -m "test: invalid syntax" # Should fail

# Test: Valid commit
echo 'const x = 1;' >> src/test.js
git add src/test.js
git commit -m "test: valid syntax" # Should pass
```

## 参考

- Husky: https://typicode.github.io/husky/
- lint-staged: https://github.com/okonet/lint-staged
- Postmortem Issues: #8, #9, #43

---

**Next Steps:** Implement Phase 1 and 2 in next dev cycle
