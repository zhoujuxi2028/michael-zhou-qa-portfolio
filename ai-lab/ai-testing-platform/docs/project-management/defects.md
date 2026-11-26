# 缺陷登记表

| 字段 | 说明 |
|------|------|
| ID 格式 | `DEF-AI-NNN` |
| 严重程度 | P0 阻断 / P1 严重 / P2 一般 / P3 轻微 |
| 状态 | Open / In Progress / Fixed / Closed |

---

## 缺陷列表

| ID | 标题 | 模块 | 严重程度 | 状态 | 发现日期 |
|----|------|------|----------|------|----------|
| DEF-AI-001 | `_extract_boundaries()` 无法解析 Markdown 表格格式边界条件 | `case_generator` | P2 | Fixed | 2026-07-19 |
| DEF-AI-002 | LLM 指标阈值与 deepeval 4.x 语义不符，测试未断言通过结果（#947） | `llm_evaluator` | P1 | Fixed | 2026-11-26 |

---

## DEF-AI-001 详情

| 属性 | 内容 |
|------|------|
| **标题** | `_extract_boundaries()` 无法解析 Markdown 表格格式边界条件 |
| **模块** | `src/case_generator/generator.py` |
| **函数** | `_extract_boundaries()` 第 361-387 行 |
| **严重程度** | P2 一般 |
| **状态** | Fixed |
| **发现日期** | 2026-07-19 |
| **修复日期** | 2026-07-19 |

**问题描述：**

`_extract_boundaries()` 声称能从需求文本中提取边界条件，但正则表达式仅匹配纯文本格式（如 `256 characters`），无法解析 Markdown 表格格式（如 `\| 256 字符 \|`）。

**复现步骤：**

1. 准备含表格边界条件的需求文档（如 `docs/requirements/LOGIN-REQUIREMENTS.md`）
2. 调用 `generator.generate_from_requirement(req_text, module="login")`
3. 观察输出：边界类测试用例数量为 0

**期望结果：** 生成用户名最大长度（256）、密码最大长度（128）、密码最小长度（8）等边界测试用例

**实际结果：** 0 个边界用例生成，原因是正则 `(\d+)\s*(characters?|...)` 无法匹配表格单元格内容

**根因：**

```python
# 当前正则只能匹配：
"username max length 256 characters"   ✅

# 无法匹配：
"| 用户名最大长度 | 256 字符 |"          ❌
"| 256 字符 |"                           ❌
```

**修复方向：** 扩展 `_extract_boundaries()` 支持从 Markdown 表格单元格提取数字+单位

---

### 设计方案

**修改范围：** `src/case_generator/generator.py` — `_extract_boundaries()` 方法

**方案：** 在现有纯文本正则之后，新增第二段正则专门匹配 Markdown 表格单元格格式，两者结果合并，用 `seen` 集合去重避免重复用例。

```
输入文本
  │
  ├─ 正则 A（原有）：(\d+)\s*(characters?|bytes?|...)
  │   → 匹配纯文本格式：256 characters
  │
  └─ 正则 B（新增）：\|\s*(\d+)\s*(字符|字节|个|秒|characters?|...)\s*\|
      → 匹配表格格式：| 256 字符 |
  │
  ├─ seen 集合去重（避免同一数值被两段正则各命中一次）
  │
  └─ 合并输出 boundaries 列表
```

**支持的中文单位映射：**

| 中文单位 | 对应含义 |
|---------|---------|
| 字符 | characters |
| 字节 | bytes |
| 个 | items |
| 秒 | seconds |

**不改动范围：** `CRUD_KEYWORDS`、`SECURITY_KEYWORDS`、`PRIORITY_RULES`、其他方法均不涉及。

---

### 开发变更

**文件：** `src/case_generator/generator.py`

**变更前（第 361-377 行）：**

```python
def _extract_boundaries(self, text: str) -> list:
    boundaries: list = []
    numbers = re.findall(
        r"(\d+)\s*(characters?|items?|users?|requests?|seconds?|bytes?|MB|GB)",
        text, re.IGNORECASE,
    )
    for num, unit in numbers:
        boundaries.append({...})
```

**变更后（新增 13 行）：**

```python
def _extract_boundaries(self, text: str) -> list:
    boundaries: list = []
    # 纯文本格式：256 characters
    numbers = re.findall(...)
    for num, unit in numbers:
        boundaries.append({...})

    # Markdown 表格格式：| 256 字符 | 或 | 256 characters |
    seen = {(num, unit) for num, unit in numbers}
    table_numbers = re.findall(
        r"\|\s*(\d+)\s*(字符|字节|个|秒|characters?|items?|bytes?|seconds?)\s*\|",
        text, re.IGNORECASE,
    )
    for num, unit in table_numbers:
        if (num, unit) not in seen:
            seen.add((num, unit))
            boundaries.append({...})
```

---

### 验证结果

**测试用例：** TC-GEN-015、TC-GEN-016（新增，见 `docs/TEST-CASES.md`）

**执行结果：**

| 测试 | 修复前 | 修复后 |
|------|--------|--------|
| TC-GEN-015：纯表格格式提取 ≥ 3 个边界用例 | ❌ FAIL（得到 0） | ✅ PASS（得到 3） |
| TC-GEN-016：混合格式提取 ≥ 2 个边界用例 | ✅ PASS | ✅ PASS |
| 全套回归（65 个用例）| — | ✅ 65/65 PASS |

**生成效果对比（`scripts/generate_test_cases.py`）：**

| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| 总用例数 | 5 | 8 |
| 边界用例数 | 0 | 3（256字符/128字符/8字符） |
| 覆盖率评分 | 80.0 | 71.2（类型多样性提升，P0 占比下降） |

---

## DEF-AI-002 详情

| 属性 | 内容 |
|------|------|
| **标题** | LLM 指标阈值与 deepeval 4.x 语义不符，测试未断言通过结果 |
| **Issue** | #947 |
| **模块** | `src/llm_evaluator/evaluator.py`、`hallucination.py`、`bias.py`；`tests/test_llm_evaluator/test_bias.py` |
| **严重程度** | P1 严重（评测标准过松，测试发现不了） |
| **状态** | Fixed |
| **发现日期** | 2026-11-26 |
| **修复日期** | 2026-11-26 |

**背景：deepeval 4.x 的分数方向**

deepeval 4.3.4 把所有指标统一为"越高越好"：`score_qag_verdicts()` 计算通过判定的比例（`deepeval/metrics/utils/qag.py`），`is_successful()` 统一用 `score >= threshold`（`base_metric.py`）。

| 指标 | 统计的"通过判定" | 方向 |
|------|------------------|------|
| `hallucination` | 输出与资料**一致**的比例（`passing=(Verdict.YES,)`） | 越高越好 |
| `bias` / `toxicity` | **没有**偏见 / 毒性的比例（`passing=(Verdict.NO,)`） | 越高越好 |

**问题：**

| # | 问题 | 影响 |
|---|------|------|
| 1 | `hallucination` / `bias` / `toxicity` 阈值是 0.3（旧版"越低越好"时的取值） | 只有 30% 内容一致就判通过，标准过松：一半矛盾（0.5）的输出判为**通过** |
| 2 | `MetricResult` 遇到 `score=None` 直接 `TypeError` | 指标异常时程序崩溃，而不是判失败 |
| 3 | `test_neutral_output_lower_bias_score` 断言 `neutral <= biased`（旧语义） | 断言方向反了；只因两者分数相同才通过 |
| 4 | 测试只比较分数，不断言 `passed` | 以上问题都发现不了 |

**修复：**

- 三个指标阈值 0.3 → 0.7（与 `faithfulness`、`answer_relevancy` 一致）
- `MetricResult.passed = score is not None and score >= threshold`（缺分数判失败）
- 偏见测试断言改为 `neutral >= biased`
- 新增 `test_metric_direction.py`（10 个，假指标，不需要 API key）和 TC-LLM-025（真实 API 端到端断言 `passed`）

**过程记录（如实保留）：** 首次分析按旧版 deepeval"越低越好"的语义，误判为"判定方向反转"，并在 PR #948 中加入 `higher_is_better=False`。配置 DeepSeek key 实跑后发现：编造回答的 `hallucination` 为 0.00、忠实回答为 1.00，与"越低越好"相反；查 deepeval 4.3.4 源码确认方向已统一，随即撤回该改动，按上表修复。教训：结论要以锁定版本的源码和真实运行结果为准。

**TDD 记录：** 见 `docs/tdd.md`
