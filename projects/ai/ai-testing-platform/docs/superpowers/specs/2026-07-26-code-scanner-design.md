# Design Spec: REQ-AI-003 CodeScanner — 自动代码度量采集

| 属性 | 内容 |
|------|------|
| **日期** | 2026-07-26 |
| **需求** | REQ-AI-003 |
| **方案** | A：AST + radon + git subprocess |
| **影响文件** | 见下方清单 |

---

## 1. 方案对比

| 方案 | 方法 | 优点 | 缺点 |
|------|------|------|------|
| **A（选中）** | ast + radon + git subprocess | 纯 Python stdlib + 轻量 radon，零外部服务 | git 信息依赖 .git 目录 |
| B | pylint / flake8 插件 | 现成度量输出 | 依赖外部工具版本，CI 复杂度高 |
| C | GitHub API | 仓库级数据准确 | 需 API token，离线不可用 |

**选择 A**，理由：零外部服务依赖、Python stdlib 即可完成 AST 分析、radon 是唯一第三方依赖且轻量（纯 Python）。

---

## 2. 数据流

```
目录路径
   ↓ scan()
   ├─ rglob("*.py") → [file_path, ...]
   └─ scan_file(file_path)
       ├─ _count_lines(source)          → lines_of_code       (ast)
       ├─ _count_dependencies(source)   → dependency_count    (ast)
       ├─ _get_cyclomatic_complexity()  → cyclomatic_complexity (radon)
       ├─ _get_last_modified_days()     → last_modified_days  (git log)
       ├─ _get_code_churn()             → code_churn          (git log --since)
       └─ _get_bug_history()            → bug_history         (git log grep)
   ↓ list[ModuleMetrics]
   → DefectPredictor.rank_modules_by_risk()
   → RiskReport[]
```

---

## 3. 接口设计

### CodeScanner

```python
class CodeScanner:
    def __init__(self, base_path: str | Path, git_root: str | Path | None = None)
    def scan(self) -> list[ModuleMetrics]
    def scan_file(self, file_path: Path) -> ModuleMetrics
    def _count_lines(self, source: str) -> int
    def _count_dependencies(self, source: str) -> int
    def _get_cyclomatic_complexity(self, source: str) -> float
    def _get_last_modified_days(self, file_path: Path) -> int
    def _get_code_churn(self, file_path: Path) -> int
    def _get_bug_history(self, file_path: Path) -> int
```

### 异常类

```python
class ScanError(Exception): pass
```

---

## 4. 数据类

复用 `defect_predictor.predictor.ModuleMetrics`，不新增数据类。`test_coverage` 字段暂设为 `0.0`（待未来对接覆盖率工具）。

---

## 5. 各指标采集策略

| 指标 | 工具 | 策略 | fallback |
|------|------|------|----------|
| lines_of_code | `str.splitlines` | 统计非空行 | — |
| dependency_count | `ast.parse` + walk | 统计 Import + ImportFrom 节点 | SyntaxError → 0 |
| cyclomatic_complexity | `radon.cc_visit` | 全函数平均 | 异常/无函数 → 1.0 |
| last_modified_days | `git log -1 --format=%at` | 最近一次 commit 距今天数 | git 失败 → 0 |
| code_churn | `git log --oneline --since=30 days` | 近 30 天 commit 数 | 失败 → 0 |
| bug_history | `git log --oneline --since=365 days` + fix/bug 正则 | 含 fix/bug 关键词 commit 数 | 失败 → 0 |

---

## 6. CLI 设计

```bash
python scripts/scan_and_predict.py --path src/ [--git-root .]
```

输出格式（按 risk_score 降序排列）：

```
Rank  Module                                        Score  Level    Defects
----------------------------------------------------------------------
1     defect_predictor/predictor.py                 XX.X   MEDIUM         X
...
```

---

## 7. 测试策略

| 测试类 | 覆盖方法 | 测试数 |
|--------|---------|--------|
| `TestCountLines` | `_count_lines` | 3 |
| `TestCountDependencies` | `_count_dependencies` | 3 |
| `TestCyclomaticComplexity` | `_get_cyclomatic_complexity` | 3 |
| `TestGitMetrics` | `_get_last_modified_days`, `_get_code_churn` | 4 |
| `TestBugHistory` | `_get_bug_history` | 2 |
| `TestScanOrchestration` | `scan_file`, `scan` | 3 |

Git 调用通过 `unittest.mock.patch` mock；AST 和 radon 使用真实临时文件。

所有测试标记 `@pytest.mark.scanner`，CI 中通过 `-m "scanner"` 选择运行。

---

## 8. 文件变更清单

| 操作 | 文件 |
|------|------|
| Create | `src/code_scanner/__init__.py` |
| Create | `src/code_scanner/scanner.py` |
| Create | `tests/test_code_scanner/__init__.py` |
| Create | `tests/test_code_scanner/conftest.py` |
| Create | `tests/test_code_scanner/test_scanner.py` |
| Create | `scripts/scan_and_predict.py` |
| Modify | `requirements.txt` — add `radon==6.0.1` |
| Modify | `pytest.ini` — add `scanner` marker |
| Modify | `docs/ARCHITECTURE.md` — add CodeScanner section |

---

## 9. 不在 Scope 内

- 不修改 `DefectPredictor` 算法或权重
- 不集成实际覆盖率工具（`test_coverage` 暂硬编码为 `0.0`）
- 不支持非 Python 文件的扫描
- 不提供 web UI 或 API 接口
- 不修改 `case_generator` / `script_generator` / `llm_evaluator`
