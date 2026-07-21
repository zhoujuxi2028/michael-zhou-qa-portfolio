# AI Testing Platform — 需求文档

## REQ-AI-001：TestCaseGenerator 支持 DBCS 字符集边界测试用例生成

| 属性 | 内容 |
|------|------|
| **ID** | REQ-AI-001 |
| **优先级** | Medium |
| **状态** | Approved |
| **提出日期** | 2026-07-19 |
| **关联 Issue** | #509 |
| **影响模块** | `src/case_generator/generator.py` |

### 背景

当前 `TestCaseGenerator` 的关键词映射和边界条件提取完全基于 ASCII/英文场景，未考虑双字节字符集（DBCS）。对于支持多语言的系统（如含中文、日文、韩文用户名/密码），DBCS 是重要测试维度。

### 用户故事

- **作为** QA 工程师测试多语言登录表单，**我希望** 生成器能产生 DBCS 相关测试用例，**以便** 验证系统对非 ASCII 输入的处理正确性。
- **作为** QA 工程师，**我希望** 能测试字节长度 vs 字符长度的边界差异，**以便** 确认系统按正确单位做限制。

### 详细需求

| 需求 ID | 描述 | 验收标准 |
|---------|------|---------|
| DBCS-01 | 需求文档含 DBCS 关键词时生成 DBCS 输入测试用例 | 含 "unicode/DBCS/多语言/中文" 时，自动生成 ≥ 1 个 DBCS 用例，`tags` 含 `"dbcs"` 或 `"unicode"` |
| DBCS-02 | 生成字节 vs 字符长度边界差异用例 | 识别 "byte/字节 vs character/字符" 场景，生成对应边界用例 |
| DBCS-03 | 生成 ASCII + DBCS 混合字符集测试用例 | 识别 "混合/mixed" 关键词，生成混合输入场景用例 |
| DBCS-04 | 生成特殊 Unicode 测试用例（Emoji、全角、零宽字符） | 识别 "emoji/全角/zero-width" 关键词，生成特殊字符测试用例 |

### Scope

- ✅ `src/case_generator/generator.py` — 扩展 keyword mapping 和 `_generate_boundary_cases()`
- ❌ `DefectPredictor`、`LLMEvaluator` — 不在本次 scope 内

### 依赖

- 无新外部依赖（Python `re` 原生支持 Unicode）
- 现有 `pytest` + `venv` 环境即可
