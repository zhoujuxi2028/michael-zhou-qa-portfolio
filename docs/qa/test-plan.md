# Test Plan — Dependabot Groups 聚合配置

**Issue:** #813
**变更类型:** 纯配置变更（.github/dependabot.yml）
**测试目标:** 验证 groups 配置语法正确、结构完整，不破坏现有 Dependabot 扫描行为

## 测试策略

本次变更为纯 YAML 配置，无运行时代码，测试分三层：

1. **语法验证**（自动）— YAML 解析器检查
2. **语义结构验证**（自动）— Python 脚本检查 groups 字段在正确层级
3. **功能行为观测**（人工）— 合并后等待实际 Dependabot 扫描结果

## 测试用例

### TC-01: YAML 语法验证

- **工具:** `python3 -c "import yaml; yaml.safe_load(open('.github/dependabot.yml'))"`
- **预期:** 无异常，退出码 0
- **通过标准:** 文件可被 YAML 解析器成功加载

### TC-02: yamllint 风格检查

- **工具:** `yamllint .github/dependabot.yml`
- **预期:** 无 ERROR 级别输出
- **通过标准:** 输出为空或仅含 WARNING

### TC-03: 条目数量验证

- **命令:** `grep -c "package-ecosystem" .github/dependabot.yml`
- **预期输出:** `22`
- **通过标准:** 条目数量与变更前一致，覆盖范围无缩减

### TC-04: groups 语义结构验证（关键）

```bash
python3 -c "
import yaml
data = yaml.safe_load(open('.github/dependabot.yml'))
entries_with_groups = [u for u in data['updates'] if 'groups' in u]
total = len(data['updates'])
covered = len(entries_with_groups)
print(f'{covered} / {total} entries have groups configured')
assert covered == total, f'Missing groups on {total - covered} entries!'
print('All entries covered. Verification PASSED.')
"
```

- **预期输出:** `22 / 22 entries have groups configured` + `All entries covered. Verification PASSED.`
- **通过标准:** 所有 22 个条目均在正确层级包含 groups 字段（语义验证，非字符串匹配）

### TC-05: Dependabot 实际行为观测（人工，合并后执行）

- **方式:** 合并 PR → 等待下一次周一 Dependabot 扫描
- **观测指标:** GitHub 仓库 Pull Requests 页面中 Dependabot 创建的 PR 数量
- **通过标准:** 单次扫描 PR 数量 ≤ 22
- **观测周期:** 连续观测 2 个扫描周期（2周）确认稳定
- **注意:** docker 条目（6个）因单镜像无聚合效果，实际降幅可能低于理论值

## 回滚计划

如 groups 配置导致 Dependabot 异常（停止扫描、PR 频率异常等），通过以下步骤回滚：

```bash
git revert <commit-sha>
git push origin HEAD
gh pr create --title "revert: remove dependabot groups config" --body "Reverts #<PR号> due to abnormal Dependabot behavior"
```
