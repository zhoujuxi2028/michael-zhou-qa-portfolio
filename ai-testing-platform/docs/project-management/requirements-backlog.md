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
