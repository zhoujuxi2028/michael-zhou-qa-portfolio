# 需求 Backlog

| 字段 | 说明 |
|------|------|
| ID 格式 | `REQ-AI-NNN` |
| 优先级 | High / Medium / Low |
| 状态 | Proposed / Approved / In Progress / Done |

---

## 需求列表

| ID | 标题 | 模块 | 优先级 | 状态 | 提出日期 |
|----|------|------|--------|------|----------|
| REQ-AI-001 | TestCaseGenerator 支持 DBCS 字符集边界测试用例生成 | `case_generator` | Medium | Done | 2026-07-19 |
| REQ-AI-002 | DefectPredictor 激活 dependency_count 和 last_modified_days 因子 | `defect_predictor` | Medium | Approved | 2026-07-22 |
| REQ-AI-003 | DefectPredictor 真实代码扫描器（自动采集 ModuleMetrics） | `code_scanner` | Medium | Proposed | 2026-07-23 |

---

## REQ-AI-002 详情

| 属性 | 内容 |
|------|------|
| **标题** | DefectPredictor 激活 dependency_count 和 last_modified_days 因子 |
| **模块** | `src/defect_predictor/predictor.py` |
| **优先级** | Medium |
| **状态** | Approved |
| **提出日期** | 2026-07-22 |

**背景：**
`ModuleMetrics` 已定义 `dependency_count`（依赖数量）和 `last_modified_days`（距今天数）两个字段，但 `_calculate_factors()` 从未使用它们，导致评分模型不完整。

**需求描述：**

| 新增因子 | 归一化公式 | 满分条件 | 权重 |
|---------|----------|---------|------|
| dependency | `min(100, dependency_count × 5)` | 20 个依赖 | 7% |
| staleness | `min(100, last_modified_days / 3.65)` | 365 天未修改 | 5% |

原有 5 个因子权重同步下调（总和保持 1.0）：

| 因子 | 旧权重 | 新权重 |
|------|--------|--------|
| complexity | 25% | 22% |
| churn | 25% | 22% |
| coverage_gap | 20% | 18% |
| bug_history | 20% | 18% |
| size | 10% | 8% |
| dependency | — | 7% |
| staleness | — | 5% |

**验收标准：**
- `analyze_module()` 返回的 `factors` 包含 `dependency` 和 `staleness` 两个新 key
- 相同模块 `dependency_count=20` vs `dependency_count=0`，评分差距 ≥ 5 分
- 相同模块 `last_modified_days=365` vs `last_modified_days=0`，评分差距 ≥ 4 分
- 所有原有 13 个测试仍 PASS
- `model_version` 更新为 `"rule-based-v1.1"`

---

## REQ-AI-003 详情

| 属性 | 内容 |
|------|------|
| **标题** | DefectPredictor 真实代码扫描器（自动采集 ModuleMetrics） |
| **模块** | `src/code_scanner/scanner.py` |
| **优先级** | Medium |
| **状态** | Proposed |
| **提出日期** | 2026-07-23 |
| **GitHub Issue** | [#513](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/513) |
| **依赖** | REQ-AI-002（dependency + staleness 因子已激活） |

**背景：**
`DefectPredictor` 评分引擎已完整，但输入 `ModuleMetrics` 全靠手动构造（mock 数据）。需要一个「采集层」，自动扫描真实 Python 项目的 `.py` 文件，将代码度量数据转换为 `ModuleMetrics`，直接驱动现有引擎。

**需求描述：**

| 指标 | 采集方式 | 可行性 |
|------|---------|--------|
| `lines_of_code` | `ast` 统计节点 / `wc -l` | ✅ stdlib |
| `cyclomatic_complexity` | `radon cc` | ⚠️ 需安装 radon |
| `dependency_count` | `ast` 解析 import 语句 | ✅ stdlib |
| `last_modified_days` | `git log -1 --format="%at"` | ✅ git |
| `code_churn` | `git log --since="30 days ago" -- <file>` | ✅ git |
| `test_coverage` | `pytest --cov` JSON 报告 | ✅ 已有 |
| `bug_history` | `git log` 搜索 fix/bug commit（近似值） | ⚠️ 近似 |

**验收标准：**
- `python scripts/scan_and_predict.py --path src/` 输出当前项目各模块风险排行
- 相同输入下扫描结果与手动 `ModuleMetrics` 评分一致
- `radon` 加入 `requirements.txt`
- `CodeScanner` 核心逻辑有单元测试覆盖（mock git/文件系统）

**范围外：**
- 非 Python 语言支持
- CI 自动触发扫描

---

## REQ-AI-001 详情

| 属性 | 内容 |
|------|------|
| **标题** | TestCaseGenerator 支持 DBCS 字符集边界测试用例生成 |
| **模块** | `src/case_generator/generator.py` |
| **优先级** | Medium |
| **状态** | Proposed |
| **提出日期** | 2026-07-19 |

**背景：**

当前引擎的关键词映射和边界条件提取完全基于 ASCII/英文场景，未考虑双字节字符集（DBCS）。对于支持多语言的系统（如含中文、日文、韩文用户名/密码），DBCS 是重要测试维度。

**需求描述：**

扩展 `TestCaseGenerator` 以支持生成 DBCS 相关测试用例，包括：

| 测试点 | 示例场景 |
|--------|---------|
| DBCS 字符输入 | 用户名/密码含中文、日文、韩文字符 |
| 字节长度 vs 字符长度 | 256 个汉字 vs 256 字节的边界差异 |
| 混合字符集 | ASCII + DBCS 混合输入 |
| 特殊 Unicode | Emoji、全角字符、零宽字符 |

**实现方向：**

1. 在 `SECURITY_KEYWORDS` 或新增 `ENCODING_KEYWORDS` 中添加 DBCS 相关映射
2. `_extract_boundaries()` 能识别需求文档中的 DBCS 相关描述
3. 生成的测试用例包含 DBCS 输入样本作为 `steps` 数据

**验收标准：**

- 需求文档含 "unicode / DBCS / 多语言 / 中文" 等关键词时，自动生成至少 1 个 DBCS 测试用例
- 生成用例的 `tags` 包含 `"dbcs"` 或 `"unicode"`
