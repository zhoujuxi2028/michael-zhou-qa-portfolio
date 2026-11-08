"""
智能测试用例生成引擎
AI-Powered Test Case Generator — 基于需求文本/代码变更自动生成测试用例规范
"""

import re
from dataclasses import dataclass, field
from enum import Enum


class GeneratorError(Exception):
    pass


class Priority(str, Enum):
    P0 = "P0"
    P1 = "P1"
    P2 = "P2"


class TestType(str, Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    BOUNDARY = "boundary"
    SECURITY = "security"
    PERFORMANCE = "performance"


@dataclass
class TestCase:
    """生成的测试用例规范"""

    tc_id: str
    title: str
    description: str
    preconditions: list
    steps: list
    expected_result: str
    priority: Priority
    test_type: TestType
    tags: list = field(default_factory=list)


# 关键词 → 测试场景映射
CRUD_KEYWORDS = {
    "create": [
        "successfully creates resource",
        "duplicate rejected with 409",
        "missing required fields returns 400",
    ],
    "read": [
        "returns correct data for valid id",
        "not found returns 404",
        "unauthorized access returns 401",
    ],
    "update": [
        "successfully updates existing resource",
        "partial update applies only changed fields",
        "invalid data rejected with 422",
    ],
    "delete": [
        "successfully deletes resource",
        "delete non-existent returns 404",
        "cascading delete handled correctly",
    ],
    "login": [
        "valid credentials return auth token",
        "invalid credentials rejected with 401",
        "account lockout after repeated failures",
    ],
    "search": [
        "finds matching results for valid query",
        "no results returns empty list",
        "pagination returns correct page",
    ],
    "upload": [
        "valid file accepted and stored",
        "oversized file rejected with 413",
        "invalid format rejected with 415",
    ],
    "validate": [
        "valid input passes validation",
        "invalid input rejected with descriptive error",
        "boundary values handled correctly",
    ],
}

# 安全测试关键词映射
SECURITY_KEYWORDS = {
    "authentication": "injection attack",
    "authorization": "privilege escalation",
    "password": "brute force attack",
    "token": "token expiry and replay",
    "input": "XSS injection",
    "query": "SQL injection",
    "file": "path traversal",
    "api": "rate limiting bypass",
}

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

# 优先级规则
PRIORITY_RULES = {
    "P0": [
        "login",
        "authentication",
        "payment",
        "security",
        "data loss",
        "crash",
        "critical",
    ],
    "P1": ["create", "update", "delete", "upload", "search"],
    "P2": ["display", "ui", "cosmetic", "sort", "filter"],
}


class TestCaseGenerator:
    """基于规则的智能测试用例生成引擎（展示 AI 驱动测试用例生成的核心思路）"""

    def __init__(self):
        self._history: list = []

    def generate_from_requirement(self, requirement_text: str, module: str = "module") -> list:
        """
        从需求文本生成测试用例列表

        Args:
            requirement_text: 需求描述文本
            module: 模块名称（用于生成 TC ID）

        Returns:
            list[TestCase]: 生成的测试用例列表

        Raises:
            GeneratorError: 当需求文本为空时
        """
        if not requirement_text or not requirement_text.strip():
            raise GeneratorError("Requirement text cannot be empty")

        test_cases: list = []
        extracted = self._extract_features(requirement_text)
        module_upper = module.upper()

        # 生成功能性测试用例（基于 CRUD 关键词）
        for keyword, scenarios in extracted["crud_keywords"].items():
            for i, scenario in enumerate(scenarios):
                tc_id = f"TC-{module_upper}-{keyword.upper()}-{i + 1:03d}"
                priority = self._determine_priority(requirement_text, keyword)
                is_negative = any(
                    w in scenario
                    for w in [
                        "rejected",
                        "invalid",
                        "error",
                        "fail",
                        "404",
                        "401",
                        "400",
                    ]
                )
                test_type = TestType.NEGATIVE if is_negative else TestType.POSITIVE

                tc = TestCase(
                    tc_id=tc_id,
                    title=f"{keyword.capitalize()}: {scenario}",
                    description=f"Verify that {module} {scenario} when user performs {keyword}",
                    preconditions=[
                        "System is operational",
                        f"User has {keyword} permissions",
                    ],
                    steps=[
                        f"Navigate to {module} {keyword} endpoint",
                        f"Submit {keyword} request with valid data",
                        "Verify response status and body",
                    ],
                    expected_result=scenario,
                    priority=priority,
                    test_type=test_type,
                    tags=[keyword, module],
                )
                test_cases.append(tc)

        # 生成安全测试用例
        for keyword, attack_type in extracted["security_keywords"].items():
            tc_id = f"TC-{module_upper}-SEC-{len(test_cases) + 1:03d}"
            tc = TestCase(
                tc_id=tc_id,
                title=f"Security: {attack_type} prevention",
                description=f"Verify {module} {keyword} is protected against {attack_type}",
                preconditions=["System is operational", "Attack payloads are prepared"],
                steps=[
                    f"Prepare {attack_type} payload",
                    f"Submit malicious payload to {keyword} endpoint",
                    "Verify attack is detected and blocked",
                ],
                expected_result=f"{attack_type} attempt is detected and blocked with appropriate error",
                priority=Priority.P0,
                test_type=TestType.SECURITY,
                tags=["security", keyword, attack_type],
            )
            test_cases.append(tc)

        # 生成边界测试用例
        for boundary in extracted["boundary_conditions"]:
            tc_id = f"TC-{module_upper}-BND-{len(test_cases) + 1:03d}"
            tc = TestCase(
                tc_id=tc_id,
                title=f"Boundary: {boundary['description']}",
                description=f"Test boundary condition: {boundary['description']}",
                preconditions=["System is operational"],
                steps=[
                    f"Prepare data at boundary: {boundary['description']}",
                    "Submit boundary value",
                    "Verify system behavior at boundary",
                ],
                expected_result=boundary["expected"],
                priority=Priority.P1,
                test_type=TestType.BOUNDARY,
                tags=["boundary", boundary["type"]],
            )
            test_cases.append(tc)

        # 生成 DBCS 字符集测试用例
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

        self._history.append(
            {
                "requirement": requirement_text[:100],
                "generated_count": len(test_cases),
                "module": module,
            }
        )

        return test_cases

    def generate_from_diff(self, diff_text: str, module: str = "module") -> list:
        """
        从代码变更（git diff）生成回归测试用例

        Args:
            diff_text: git diff 格式的代码变更文本
            module: 模块名称

        Returns:
            list[TestCase]: 生成的回归测试用例

        Raises:
            GeneratorError: 当 diff 文本为空时
        """
        if not diff_text:
            raise GeneratorError("Diff text cannot be empty")

        added_functions = re.findall(r"^\+\s*def\s+(\w+)", diff_text, re.MULTILINE)
        modified_lines = re.findall(r"^\+(?!\+\+)", diff_text, re.MULTILINE)
        test_cases: list = []
        module_upper = module.upper()

        for func_name in added_functions:
            # 正常路径测试
            tc_happy = TestCase(
                tc_id=f"TC-{module_upper}-REG-{len(test_cases) + 1:03d}",
                title=f"Regression: {func_name} happy path",
                description=f"Verify new/modified function {func_name} works correctly",
                preconditions=["System is operational", f"{func_name} is implemented"],
                steps=[
                    f"Call {func_name} with valid inputs",
                    "Capture return value",
                    "Assert expected result",
                ],
                expected_result=f"{func_name} returns expected value without errors",
                priority=Priority.P1,
                test_type=TestType.POSITIVE,
                tags=["regression", func_name, module],
            )
            test_cases.append(tc_happy)

            # 错误路径测试
            tc_error = TestCase(
                tc_id=f"TC-{module_upper}-REG-{len(test_cases) + 1:03d}",
                title=f"Regression: {func_name} error handling",
                description=f"Verify {func_name} handles invalid input gracefully",
                preconditions=["System is operational"],
                steps=[
                    f"Call {func_name} with invalid/edge inputs",
                    "Capture raised exception",
                    "Assert appropriate error type and message",
                ],
                expected_result=f"{func_name} raises appropriate exception for invalid inputs",
                priority=Priority.P1,
                test_type=TestType.NEGATIVE,
                tags=["regression", func_name, "error-handling"],
            )
            test_cases.append(tc_error)

        # 无函数变更时生成通用回归用例
        if not test_cases and modified_lines:
            tc = TestCase(
                tc_id=f"TC-{module_upper}-REG-001",
                title="Regression: modified code path verification",
                description="Verify modified code does not introduce regressions",
                preconditions=["System is operational", "Baseline test suite passes"],
                steps=[
                    "Execute existing test suite",
                    "Verify no regressions introduced",
                ],
                expected_result="All existing tests continue to pass after code change",
                priority=Priority.P0,
                test_type=TestType.POSITIVE,
                tags=["regression", module],
            )
            test_cases.append(tc)

        return test_cases

    def analyze_coverage(self, test_cases: list) -> dict:
        """
        分析测试用例集的覆盖率分布

        Args:
            test_cases: 测试用例列表

        Returns:
            dict: 覆盖率统计（按类型、优先级分布）
        """
        if not test_cases:
            return {"total": 0, "by_type": {}, "by_priority": {}, "coverage_score": 0.0}

        by_type: dict = {}
        by_priority: dict = {}

        for tc in test_cases:
            by_type[tc.test_type.value] = by_type.get(tc.test_type.value, 0) + 1
            by_priority[tc.priority.value] = by_priority.get(tc.priority.value, 0) + 1

        # 覆盖率评分：类型多样性 50% + P0 占比 50%
        type_score = len(by_type) / len(TestType) * 50
        p0_ratio = by_priority.get("P0", 0) / len(test_cases)
        priority_score = p0_ratio * 50

        return {
            "total": len(test_cases),
            "by_type": by_type,
            "by_priority": by_priority,
            "coverage_score": round(type_score + priority_score, 1),
        }

    def get_generation_history(self) -> list:
        """获取历史生成记录"""
        return self._history.copy()

    def _extract_features(self, text: str) -> dict:
        """从需求文本提取测试特征关键词"""
        text_lower = text.lower()

        found_crud = {kw: scenarios for kw, scenarios in CRUD_KEYWORDS.items() if kw in text_lower}
        found_security = {kw: attack for kw, attack in SECURITY_KEYWORDS.items() if kw in text_lower}
        found_dbcs = {kw: scenarios for kw, scenarios in DBCS_KEYWORDS.items() if kw in text_lower}
        boundaries = self._extract_boundaries(text)

        return {
            "crud_keywords": found_crud,
            "security_keywords": found_security,
            "boundary_conditions": boundaries,
            "dbcs_keywords": found_dbcs,
        }

    def _extract_boundaries(self, text: str) -> list:
        """提取边界条件（数值限制、最大/最小值）"""
        boundaries: list = []

        # 纯文本格式：256 characters
        numbers = re.findall(
            r"(\d+)\s*(characters?|items?|users?|requests?|seconds?|bytes?|MB|GB)",
            text,
            re.IGNORECASE,
        )
        for num, unit in numbers:
            boundaries.append(
                {
                    "type": "numeric",
                    "description": f"{num} {unit} limit",
                    "expected": f"System enforces {num} {unit} boundary correctly",
                }
            )

        # Markdown 表格格式：| 256 字符 | 或 | 256 characters |
        seen = {(num, unit) for num, unit in numbers}
        table_numbers = re.findall(
            r"\|\s*(\d+)\s*(字符|字节|个|秒|characters?|items?|bytes?|seconds?)\s*\|",
            text,
            re.IGNORECASE,
        )
        for num, unit in table_numbers:
            if (num, unit) not in seen:
                seen.add((num, unit))
                boundaries.append(
                    {
                        "type": "numeric",
                        "description": f"{num} {unit} limit",
                        "expected": f"System enforces {num} {unit} boundary correctly",
                    }
                )

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
                    "expected": (f"System distinguishes {b_num} {b_unit} limit from {c_num} {c_unit} limit"),
                }
            )

        if re.search(r"\b(max|maximum|minimum|min|limit)\b", text, re.IGNORECASE):
            boundaries.append(
                {
                    "type": "limit",
                    "description": "max/min limit boundary",
                    "expected": "System enforces configured limit correctly",
                }
            )

        return boundaries

    def _determine_priority(self, text: str, keyword: str) -> Priority:
        """根据需求上下文和关键词确定测试优先级"""
        text_lower = text.lower()
        if keyword in PRIORITY_RULES["P0"] or any(p in text_lower for p in PRIORITY_RULES["P0"]):
            return Priority.P0
        if keyword in PRIORITY_RULES["P1"] or any(p in text_lower for p in PRIORITY_RULES["P1"]):
            return Priority.P1
        return Priority.P2
