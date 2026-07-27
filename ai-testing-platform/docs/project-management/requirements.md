# AI Testing Platform — 需求文档

## REQ-AI-001：TestCaseGenerator 支持 DBCS 字符集边界测试用例生成

| 属性 | 内容 |
|------|------|
| **ID** | REQ-AI-001 |
| **优先级** | Medium |
| **状态** | Done |
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

---

## REQ-AI-002：DefectPredictor 激活 dependency_count 和 last_modified_days 因子

| 属性 | 内容 |
|------|------|
| **ID** | REQ-AI-002 |
| **优先级** | Medium |
| **状态** | Done |
| **提出日期** | 2026-07-22 |
| **影响模块** | `src/defect_predictor/predictor.py` |

### 背景

`ModuleMetrics` 已有 `dependency_count` 和 `last_modified_days` 字段，但评分模型从未使用它们，导致依赖耦合度和代码陈旧度两个风险信号被忽略。

### 详细需求

| 需求 ID | 描述 | 验收标准 |
|---------|------|---------|
| PRD-014 | dependency 因子激活 | `dependency_count=20` vs `0` 评分差距 ≥ 5 分 |
| PRD-015 | staleness 因子激活 | `last_modified_days=365` vs `0` 评分差距 ≥ 4 分 |
| PRD-016 | 权重总和为 1.0 | 7 个因子权重相加 = 1.0 |
| PRD-017 | 模型版本标识 | `model_version == "rule-based-v1.1"` |

### 权重调整

| 因子 | 旧权重 | 新权重 |
|------|--------|--------|
| complexity | 25% | 22% |
| churn | 25% | 22% |
| coverage_gap | 20% | 18% |
| bug_history | 20% | 18% |
| size | 10% | 8% |
| dependency | — | 7% |
| staleness | — | 5% |

### Scope

- ✅ `predictor.py` — `_calculate_factors()` 新增两个因子，更新 RISK_WEIGHTS、recommendations、model_version
- ❌ 不新增 `ModuleMetrics` 字段
- ❌ 不修改风险等级阈值

### 依赖

- 无新外部依赖

---

## REQ-AI-003：DefectPredictor 真实代码扫描器（自动采集 ModuleMetrics）

| 属性 | 内容 |
|------|------|
| **ID** | REQ-AI-003 |
| **优先级** | Medium |
| **状态** | Proposed |
| **提出日期** | 2026-07-23 |
| **关联 Issue** | [#513](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/513) |
| **影响模块** | `src/code_scanner/`, `scripts/scan_and_predict.py` |
| **依赖** | REQ-AI-002 |

### 背景

`DefectPredictor` 评分引擎已完整，但输入全靠手动构造。需要一个采集层自动扫描真实 Python 项目。

### 用户故事

- **作为** QA 工程师，**我希望** 能一键扫描项目目录获取风险排名，**以便** 快速定位高风险模块。
- **作为** 开发负责人，**我希望** 代码度量从真实源码自动采集，**以便** 避免手动输入偏差。

### 详细需求

| 需求 ID | 描述 | 验收标准 |
|---------|------|---------|
| SCN-01 | 扫描目录下所有 .py 文件 | `rglob("*.py")` 排除 venv/\_\_pycache\_\_ |
| SCN-02 | 采集代码行数 | `_count_lines` 统计非空行 |
| SCN-03 | 采集依赖数 | AST 解析 Import + ImportFrom 节点 |
| SCN-04 | 采集圈复杂度 | radon 计算函数平均 CC |
| SCN-05 | 采集代码陈旧度 | `git log -1 --format=%at` |
| SCN-06 | 采集变更频率 | `git log --oneline --since=30days` |
| SCN-07 | 采集 bug 历史 | git log 搜索 fix/bug 关键词 |
| SCN-08 | CLI 输出风险排名 | `scan_and_predict.py --path src/` 打印表格 |

### Scope

- ✅ `src/code_scanner/scanner.py` — CodeScanner 类
- ✅ `scripts/scan_and_predict.py` — CLI 工具
- ❌ 非 Python 语言支持
- ❌ CI 自动触发扫描
- ❌ Web UI 或 API 接口

### 依赖

- `radon==6.0.1` — 圈复杂度分析
- `git` CLI — 变更指标采集（系统安装）
- Python `ast`, `subprocess`, `pathlib` — stdlib
