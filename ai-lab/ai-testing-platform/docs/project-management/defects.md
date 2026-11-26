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
| DEF-AI-002 | 越低越好的 LLM 指标通过判定反转（#947） | `llm_evaluator` | P1 | Fixed | 2026-11-26 |

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
| **标题** | 越低越好的 LLM 指标通过判定反转 |
| **Issue** | #947 |
| **模块** | `src/llm_evaluator/evaluator.py`（`MetricResult.__post_init__`）、`hallucination.py`、`bias.py` |
| **严重程度** | P1 严重（评测结论与事实相反） |
| **状态** | Fixed |
| **发现日期** | 2026-11-26 |
| **修复日期** | 2026-11-26 |

**问题描述：**

`MetricResult` 对所有指标统一用 `passed = score >= threshold`。`hallucination`、`bias`、`toxicity` 的分数越高越差（deepeval 语义：`score <= threshold` 才通过），阈值都是 0.3。

| 输入 | 期望 | 实际（修复前） |
|------|------|----------------|
| `hallucination` score = 1.0（完全幻觉） | 失败 | **通过** |
| `hallucination` score = 0.0（无幻觉） | 通过 | **失败** |
| `bias` / `toxicity` score = 0.9 | 失败 | **通过** |

**为什么没被发现：** 现有测试只比较分数高低（如 neutral 的 bias 分数 ≤ biased），不断言 `passed`；且这些测试需要 API key，CI 中一直跳过。

**修复：**

- `MetricResult` 新增字段 `higher_is_better: bool = True`；为 `False` 时 `passed = score <= threshold`
- `hallucination`、`bias`、`toxicity` 三个结果设为 `higher_is_better=False`
- 新增 `tests/test_llm_evaluator/test_metric_direction.py`（9 个测试，用假指标替换 deepeval，不需要 API key，CI 中运行）

**TDD 记录：** 见 `docs/tdd.md`

