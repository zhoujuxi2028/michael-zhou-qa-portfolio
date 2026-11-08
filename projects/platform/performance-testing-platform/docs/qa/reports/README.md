# QA 报告目录 (Test Reports)

> **作用:** 所有"过程性"或"一次性"的测试/验收/分析输出，按类型分类归档。
> **与 `gates/`、`defects/` 的区别:** `gates/` 与 `defects/` 是**长期资产**（模板与登记表）；`reports/` 是**时间点产出**。

---

## 1. 子目录约定

| 子目录            | 收纳内容                                            | 命名模式                                  |
| ----------------- | --------------------------------------------------- | ----------------------------------------- |
| `execution/`      | 验收/Stage Gate 执行报告、自测报告、版本验证报告    | `<scope>-execution-<YYYY-MM-DD>.md` 等    |
| `rca/`            | 根因分析（Root Cause Analysis）                     | `rca-<short-topic>.md`                    |
| `investigations/` | Issue 专项调查、深度分析（非根因结论性文档）        | `issue-<NNN>-<short-topic>.md`            |
| `capacity/`       | 容量测试报告、瓶颈分析                              | `capacity-<scope>-<YYYY-MM-DD>.md`        |
| `checklists/`     | Stage 4 / Stage 5 / 发布前的人工验收 checklist 实例 | `<phase|stage>-<purpose>-checklist.md`    |
| `logs/`           | CI 日志获取指引（**实际日志不入仓库**）             | 仅 `README.md`                            |
| `archive/`        | 已停止维护、仅供参考的历史过程文件                  | `<原文件名>` + `archive/README.md` 说明  |

---

## 2. 命名约定

通用模板：

```
<type>-<scope>-<date|id>.md
```

例：

| 文件名                                      | 解析                                       |
| ------------------------------------------- | ------------------------------------------ |
| `stage4-execution-2026-04-24.md`            | type=stage4-execution，date=2026-04-24     |
| `rca-prettier-ci-failure.md`                | type=rca，scope=prettier-ci-failure        |
| `issue-129-self-verification-report.md`     | type=issue，id=129，scope=self-verification |
| `capacity-report.md`                        | （历史命名，新增请加日期/版本后缀）        |

---

## 3. 提交规则

1. **新增报告**：放入对应子目录；如类型不在上表，先 PR 调整本约定。
2. **大日志/二进制**：不入仓库。CI 日志通过 GitHub Actions Artifacts 获取，详见 [logs/README.md](logs/README.md)。
3. **过期报告**：不要直接删除，移入 `archive/` 并在 `archive/README.md` 说明归档原因与最终交付物链接。
4. **变更追踪**：结构性新增/移动同步登记到上层 [`../CHANGELOG.md`](../CHANGELOG.md)。
