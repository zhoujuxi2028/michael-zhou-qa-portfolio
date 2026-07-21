# DBCS Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `TestCaseGenerator` to generate DBCS boundary test cases when DBCS-related keywords appear in requirement text, covering DBCS-01 through DBCS-04.

**Architecture:** Add `DBCS_KEYWORDS` module-level dict (mirrors `SECURITY_KEYWORDS`), extend `_extract_features()` to detect DBCS keywords, add a DBCS generation loop in `generate_from_requirement()`, and extend `_extract_boundaries()` with a byte-vs-char regex for DBCS-02.

**Tech Stack:** Python 3.x, `re` (stdlib), pytest, ruff (formatter)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/case_generator/generator.py` | Modify | Add DBCS_KEYWORDS, extend _extract_features(), generation loop, _extract_boundaries() |
| `tests/test_case_generator/test_case_generator.py` | Modify | Add TestDBCSKeywordGeneration and TestDBCSBoundaryExtraction classes |

Run all tests from the `ai-testing-platform/` directory with venv activated:
```bash
source venv/bin/activate
pytest tests/test_case_generator/test_case_generator.py -v
```

---

## Task 1: DBCS Keyword Detection and Test Case Generation (DBCS-01/03/04)

**Files:**
- Modify: `src/case_generator/generator.py` (after line 98, lines 347–359, lines 202–220)
- Modify: `tests/test_case_generator/test_case_generator.py` (append new class)

### Step 1.1 — Write the first failing test

Append this class to `tests/test_case_generator/test_case_generator.py` (after `TestBoundaryFromMarkdownTable`):

```python
@pytest.mark.generation
class TestDBCSKeywordGeneration:
    @pytest.mark.P1
    def test_unicode_keyword_generates_unicode_tagged_case(self, generator):
        """TC-DBCS-001: 含 'unicode' 关键词时生成 tags 含 'unicode' 的用例"""
        req = "The login form must support unicode character input for international users."
        test_cases = generator.generate_from_requirement(req, module="login")
        dbcs_cases = [tc for tc in test_cases if "unicode" in tc.tags]
        assert len(dbcs_cases) >= 1, f"Expected ≥1 unicode-tagged case, got {len(dbcs_cases)}"
```

- [ ] Add only the class definition and `test_unicode_keyword_generates_unicode_tagged_case` method above.

### Step 1.2 — Run to confirm it fails

```bash
cd ai-testing-platform && source venv/bin/activate
pytest tests/test_case_generator/test_case_generator.py::TestDBCSKeywordGeneration::test_unicode_keyword_generates_unicode_tagged_case -v
```

Expected: `FAILED` — assertion error, 0 unicode-tagged cases.

- [ ] Confirm output shows FAILED before proceeding.

### Step 1.3 — Add `DBCS_KEYWORDS` constant

In `src/case_generator/generator.py`, after the `SECURITY_KEYWORDS` block (after line 98, before `# 优先级规则`), insert:

```python
# DBCS 字符集测试关键词映射
DBCS_KEYWORDS = {
    "unicode": [
        "unicode character input",
        "zero-width character input",
        "surrogate pair character input",
    ],
    "dbcs": [
        "double-byte character input",
        "DBCS boundary: byte vs char length",
    ],
    "多语言": [
        "multilingual CJK character input",
        "mixed ASCII+DBCS input",
    ],
    "中文": [
        "Chinese character input",
        "Chinese+ASCII mixed input",
    ],
    "emoji": [
        "emoji character input",
        "emoji in boundary value",
    ],
    "全角": [
        "fullwidth character input",
        "fullwidth+halfwidth mixed input",
    ],
}
```

- [ ] Insert the block above.

### Step 1.4 — Extend `_extract_features()`

In `_extract_features()` (around line 347), after `found_security = ...`, add:

```python
found_dbcs = {kw: scenarios for kw, scenarios in DBCS_KEYWORDS.items() if kw in text_lower}
```

And update the return dict to include `"dbcs_keywords": found_dbcs`:

```python
return {
    "crud_keywords": found_crud,
    "security_keywords": found_security,
    "boundary_conditions": boundaries,
    "dbcs_keywords": found_dbcs,
}
```

- [ ] Make both changes above.

### Step 1.5 — Add DBCS generation loop in `generate_from_requirement()`

After the boundary test case loop (after `test_cases.append(tc)` for boundary, before `self._history.append(...)`), insert:

```python
# 生成 DBCS 字符集测试用例
for keyword, scenarios in extracted["dbcs_keywords"].items():
    for scenario in scenarios:
        tag = "unicode" if keyword in ("unicode", "emoji", "全角") else "dbcs"
        tc_id = f"TC-{module_upper}-DBCS-{len(test_cases) + 1:03d}"
        tc = TestCase(
            tc_id=tc_id,
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

- [ ] Insert the block above.

### Step 1.6 — Run TC-DBCS-001 to confirm it passes

```bash
pytest tests/test_case_generator/test_case_generator.py::TestDBCSKeywordGeneration::test_unicode_keyword_generates_unicode_tagged_case -v
```

Expected: `PASSED`

- [ ] Confirm PASSED before continuing.

### Step 1.7 — Add remaining keyword generation tests

Add these 6 methods inside `TestDBCSKeywordGeneration`:

```python
    @pytest.mark.P1
    def test_chinese_keyword_generates_dbcs_tagged_case(self, generator):
        """TC-DBCS-002: 含 '中文' 关键词时生成 tags 含 'dbcs' 的用例"""
        req = "系统支持中文用户名输入，最大长度 50 字符。"
        test_cases = generator.generate_from_requirement(req, module="login")
        dbcs_cases = [tc for tc in test_cases if "dbcs" in tc.tags]
        assert len(dbcs_cases) >= 1, f"Expected ≥1 dbcs-tagged case, got {len(dbcs_cases)}"

    @pytest.mark.P1
    def test_emoji_keyword_generates_unicode_tagged_case(self, generator):
        """TC-DBCS-003: 含 'emoji' 关键词时生成 tags 含 'unicode' 的用例"""
        req = "Profile display name must support emoji characters."
        test_cases = generator.generate_from_requirement(req, module="profile")
        dbcs_cases = [tc for tc in test_cases if "unicode" in tc.tags]
        assert len(dbcs_cases) >= 1, f"Expected ≥1 unicode-tagged case, got {len(dbcs_cases)}"

    @pytest.mark.P1
    def test_no_dbcs_keyword_generates_no_dbcs_case(self, generator):
        """TC-DBCS-005: 无 DBCS 关键词时不生成 DBCS 用例"""
        req = "User can login with valid credentials. Max 50 characters."
        test_cases = generator.generate_from_requirement(req, module="login")
        dbcs_cases = [tc for tc in test_cases if "dbcs" in tc.tags or "unicode" in tc.tags]
        assert len(dbcs_cases) == 0, f"Expected 0 DBCS cases, got {len(dbcs_cases)}"

    @pytest.mark.P1
    def test_mixed_keywords_generate_both_tag_types(self, generator):
        """TC-DBCS-006: 混合关键词（'unicode' + '中文'）各自生成对应标签用例"""
        req = "Support unicode and 中文 input for the login form."
        test_cases = generator.generate_from_requirement(req, module="login")
        has_unicode = any("unicode" in tc.tags for tc in test_cases)
        has_dbcs = any("dbcs" in tc.tags for tc in test_cases)
        assert has_unicode, "Expected at least one unicode-tagged case"
        assert has_dbcs, "Expected at least one dbcs-tagged case"

    @pytest.mark.P1
    def test_fullwidth_keyword_generates_unicode_tagged_case(self, generator):
        """TC-DBCS-007: 含 '全角' 关键词时生成 tags 含 'unicode' 的用例"""
        req = "输入框支持全角字符输入，如全角数字和全角标点。"
        test_cases = generator.generate_from_requirement(req, module="input")
        dbcs_cases = [tc for tc in test_cases if "unicode" in tc.tags]
        assert len(dbcs_cases) >= 1, f"Expected ≥1 unicode-tagged case for 全角, got {len(dbcs_cases)}"
```

- [ ] Add all 6 methods above to `TestDBCSKeywordGeneration`.

### Step 1.8 — Run full keyword generation test class

```bash
pytest tests/test_case_generator/test_case_generator.py::TestDBCSKeywordGeneration -v
```

Expected: all 7 tests PASSED.

- [ ] Confirm all 7 PASSED.

### Step 1.9 — Run ruff format

```bash
ruff format tests/test_case_generator/test_case_generator.py src/case_generator/generator.py
ruff check tests/test_case_generator/test_case_generator.py src/case_generator/generator.py
```

Expected: no errors.

- [ ] Confirm clean.

### Step 1.10 — Commit Task 1

```bash
git add src/case_generator/generator.py tests/test_case_generator/test_case_generator.py
git commit -m "feat(ai-testing): add DBCS keyword detection and case generation (#509)"
```

Subject length: 61 chars ✓

- [ ] Commit created.

---

## Task 2: Byte-vs-Char Boundary Extraction (DBCS-02)

**Files:**
- Modify: `src/case_generator/generator.py` (`_extract_boundaries()`, after line 396)
- Modify: `tests/test_case_generator/test_case_generator.py` (append new class)

### Step 2.1 — Write the failing test

Append this class after `TestDBCSKeywordGeneration`:

```python
@pytest.mark.generation
class TestDBCSBoundaryExtraction:
    @pytest.mark.P1
    def test_byte_vs_char_boundary_generates_dbcs_boundary_case(self, generator):
        """TC-DBCS-004: 含字节/字符对比描述时生成 dbcs-byte-char 边界用例"""
        req = "Password field enforces 256字节/128字符 limit for DBCS input."
        test_cases = generator.generate_from_requirement(req, module="login")
        # 现有 boundary 循环设置 tags=["boundary", boundary["type"]]
        # 所以通过 tags 检查 type，而非 description
        dbcs_boundary = [
            tc for tc in test_cases
            if tc.test_type == TestType.BOUNDARY and "dbcs-byte-char" in tc.tags
        ]
        assert len(dbcs_boundary) >= 1, (
            f"Expected ≥1 dbcs-byte-char boundary case, got {len(dbcs_boundary)}"
        )
```

- [ ] Add the class above.

### Step 2.2 — Run to confirm it fails

```bash
pytest tests/test_case_generator/test_case_generator.py::TestDBCSBoundaryExtraction::test_byte_vs_char_boundary_generates_dbcs_boundary_case -v
```

Expected: `FAILED` — 0 dbcs-byte-char boundary cases.

- [ ] Confirm FAILED.

### Step 2.3 — Extend `_extract_boundaries()` with byte-vs-char regex

In `src/case_generator/generator.py`, inside `_extract_boundaries()`, after the `seen` / table_numbers block and before the `max/min/limit` check (around line 396), insert:

```python
        # DBCS-02：字节 vs 字符长度差异，如 "256字节/128字符" 或 "256 bytes vs 128 characters"
        byte_char = re.findall(
            r"(\d+)\s*(字节|bytes?)\s*(?:/|，|,|\s+vs\s+)\s*(\d+)\s*(字符|characters?)",
            text,
            re.IGNORECASE,
        )
        for b_num, b_unit, c_num, c_unit in byte_char:
            boundaries.append(
                {
                    "type": "dbcs-byte-char",
                    "description": f"{b_num} {b_unit} vs {c_num} {c_unit} boundary",
                    "expected": (
                        f"System distinguishes {b_num} {b_unit} limit "
                        f"from {c_num} {c_unit} limit"
                    ),
                }
            )
```

Note: boundary cases generated from `_extract_boundaries()` get `tags=["boundary", boundary["type"]]` via the existing generation loop in `generate_from_requirement()`. No change needed there.

- [ ] Insert the block above.

### Step 2.4 — Run TC-DBCS-004 to confirm it passes

```bash
pytest tests/test_case_generator/test_case_generator.py::TestDBCSBoundaryExtraction -v
```

Expected: `PASSED`

- [ ] Confirm PASSED.

### Step 2.5 — Run full test suite

```bash
pytest tests/ -v -m "not llm and not integration"
```

Expected: all tests PASS (was 65, now 65 + 8 new = 73).

- [ ] Confirm all PASSED with no regressions.

### Step 2.6 — Run ruff format

```bash
ruff format tests/test_case_generator/test_case_generator.py src/case_generator/generator.py
ruff check tests/test_case_generator/test_case_generator.py src/case_generator/generator.py
```

Expected: no errors.

- [ ] Confirm clean.

### Step 2.7 — Commit Task 2

```bash
git add src/case_generator/generator.py tests/test_case_generator/test_case_generator.py
git commit -m "feat(ai-testing): add DBCS byte-vs-char boundary extraction (#509)"
```

Subject length: 57 chars ✓

- [ ] Commit created.

---

## Task 3: Update TEST-CASES.md and Push

**Files:**
- Modify: `docs/TEST-CASES.md`

### Step 3.1 — Update TEST-CASES.md summary table

In `docs/TEST-CASES.md`, add a new row to the summary table for `TestDBCSKeywordGeneration` and `TestDBCSBoundaryExtraction`, and update the totals.

Add after the `TestBoundaryFromMarkdownTable` row:

```markdown
| TestCaseGenerator | TestDBCSKeywordGeneration | 7 | 0 | 7 | 0 |
| TestCaseGenerator | TestDBCSBoundaryExtraction | 1 | 0 | 1 | 0 |
```

Update totals row (was `~85 / ~27 / ~36 / ~22`, add 8 TC):

```markdown
| **合计** | | **~93** | **~27** | **~44** | **~22** |
```

Add TC detail section after `TestBoundaryFromMarkdownTable`:

```markdown
### TestDBCSKeywordGeneration

> 对应需求：REQ-AI-001 DBCS-01 / DBCS-03 / DBCS-04

| TC ID | 标题 | 优先级 | 类型 |
|-------|------|--------|------|
| TC-DBCS-001 | unicode 关键词生成 unicode 标签用例 | P1 | 边界 |
| TC-DBCS-002 | 中文关键词生成 dbcs 标签用例 | P1 | 边界 |
| TC-DBCS-003 | emoji 关键词生成 unicode 标签用例 | P1 | 边界 |
| TC-DBCS-005 | 无 DBCS 关键词时不生成 DBCS 用例 | P1 | 负向 |
| TC-DBCS-006 | 混合关键词各自生成对应标签 | P1 | 边界 |
| TC-DBCS-007 | 全角关键词生成 unicode 标签用例 | P1 | 边界 |

### TestDBCSBoundaryExtraction

> 对应需求：REQ-AI-001 DBCS-02

| TC ID | 标题 | 优先级 | 类型 |
|-------|------|--------|------|
| TC-DBCS-004 | 字节/字符对比描述生成 dbcs-byte-char 边界用例 | P1 | 边界 |
```

- [ ] Update `docs/TEST-CASES.md` as described above.

### Step 3.2 — Commit docs

```bash
git add ai-testing-platform/docs/TEST-CASES.md
git commit -m "docs(ai-testing): update TEST-CASES.md for REQ-AI-001 DBCS (#509)"
```

Subject length: 57 chars ✓

- [ ] Commit created.

### Step 3.3 — Push and verify CI

```bash
git push origin feature/ai-testing-dbcs-support
```

Then check:

```bash
gh pr checks 510 --repo zhoujuxi2028/michael-zhou-qa-portfolio
```

Expected: all checks green (code-quality, unit-tests, lint pass).

- [ ] All CI checks green.
