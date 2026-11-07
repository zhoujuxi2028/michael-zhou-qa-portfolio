# Design Spec: REQ-AI-001 DBCS 字符集边界测试用例生成

| 属性 | 内容 |
|------|------|
| **日期** | 2026-07-21 |
| **需求** | REQ-AI-001 / Issue #509 |
| **方案** | C：DBCS_KEYWORDS + 扩展 `_extract_boundaries()` |
| **影响文件** | `src/case_generator/generator.py`, `tests/test_case_generator/test_case_generator.py` |

---

## 1. 数据层：新增 `DBCS_KEYWORDS`

紧接 `SECURITY_KEYWORDS` 之后，新增模块级常量：

```python
DBCS_KEYWORDS = {
    "unicode":  ["unicode character input", "zero-width character input", "surrogate pair character input"],
    "dbcs":     ["double-byte character input", "DBCS boundary: byte vs char length"],
    "多语言":    ["multilingual CJK character input", "mixed ASCII+DBCS input"],
    "中文":     ["Chinese character input", "Chinese+ASCII mixed input"],
    "emoji":    ["emoji character input", "emoji in boundary value"],
    "全角":     ["fullwidth character input", "fullwidth+halfwidth mixed input"],
}
```

> 修正：`unicode` 和 `全角` 的 `"fullwidth character input"` 已拆分，避免两词同时出现时生成重复用例。`unicode` 改为覆盖 zero-width 和 surrogate pair（DBCS-04）。

**Tags 规则：**
- key ∈ `{unicode, emoji, 全角}` → `tags=["unicode", key]`
- key ∈ `{dbcs, 多语言, 中文}` → `tags=["dbcs", key]`

---

## 2. 特征提取：`_extract_features()` 扩展

在现有 `found_crud` / `found_security` 之后新增：

```python
found_dbcs = {kw: scenarios for kw, scenarios in DBCS_KEYWORDS.items() if kw in text_lower}
```

返回值增加 `"dbcs_keywords": found_dbcs`。

---

## 3. 用例生成：DBCS 循环

在 `generate_from_requirement()` 的边界用例循环之后，新增 DBCS 循环：

```python
for keyword, scenarios in extracted["dbcs_keywords"].items():
    for scenario in scenarios:
        tag = "unicode" if keyword in ("unicode", "emoji", "全角") else "dbcs"
        tc = TestCase(
            tc_id=f"TC-{module_upper}-DBCS-{len(test_cases) + 1:03d}",
            title=f"DBCS: {scenario}",
            description=f"Verify {module} handles {scenario} correctly",
            preconditions=["System is operational", "DBCS input data prepared"],
            steps=[
                f"Prepare {scenario} as input",
                "Submit input to system",
                "Verify system processes DBCS input without data loss or truncation",
            ],
            expected_result=f"System correctly processes {scenario}",
            priority=Priority.P1,
            test_type=TestType.BOUNDARY,
            tags=[tag, keyword],
        )
        test_cases.append(tc)
```

---

## 4. 边界提取：`_extract_boundaries()` 扩展（DBCS-02）

在现有两段正则之后，新增字节 vs 字符对比识别：

```python
# DBCS-02：字节 vs 字符长度差异，如 "256字节/256字符" 或 "256 bytes vs 256 characters"
byte_char = re.findall(
    r"(\d+)\s*(字节|bytes?)\s*(?:/|，|,|\s+vs\s+)\s*(\d+)\s*(字符|characters?)",
    text, re.IGNORECASE,
)
for b_num, b_unit, c_num, c_unit in byte_char:
    boundaries.append({
        "type": "dbcs-byte-char",
        "description": f"{b_num} {b_unit} vs {c_num} {c_unit} boundary",
        "expected": f"System distinguishes {b_num} {b_unit} limit from {c_num} {c_unit} limit",
    })
```

---

## 5. 测试策略

| 测试类 | 覆盖需求 | 测试文件 |
|--------|---------|---------|
| `TestDBCSKeywordGeneration` | DBCS-01/03/04 | `test_case_generator.py` |
| `TestDBCSBoundaryExtraction` | DBCS-02 | `test_case_generator.py` |

**TC 清单：**

| TC ID | 场景 | 断言 |
|-------|------|------|
| TC-DBCS-001 | 含 "unicode" 关键词 → 生成 ≥ 1 个 DBCS 用例 | `tags` 含 `"unicode"` |
| TC-DBCS-002 | 含 "中文" 关键词 → 生成 ≥ 1 个 DBCS 用例 | `tags` 含 `"dbcs"` |
| TC-DBCS-003 | 含 "emoji" 关键词 → 生成 ≥ 1 个 DBCS 用例 | `tags` 含 `"unicode"` |
| TC-DBCS-004 | 含 byte vs char 描述 → 生成 boundary 用例 | `type=="dbcs-byte-char"`，`test_type==BOUNDARY`，tags 含 `"boundary"` |
| TC-DBCS-005 | 无 DBCS 关键词 → 不生成 DBCS 用例 | `tags` 不含 `"dbcs"/"unicode"` |
| TC-DBCS-006 | 混合关键词（"unicode" + "中文"）→ 各自生成 | 两类 tags 均存在 |
| TC-DBCS-007 | 含 "全角" 关键词 → 生成 unicode 标签用例 | `tags` 含 `"unicode"` |

---

## 6. 不在 Scope 内

- `DefectPredictor`、`LLMEvaluator` 不做修改
- 不新增 `TestType` 枚举值
- 不修改 `analyze_coverage()` 逻辑
