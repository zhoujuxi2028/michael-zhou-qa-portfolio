"""
TC-GEN-*: TestCaseGenerator 单元测试
验证智能测试用例生成引擎的各项功能
"""

import logging

import pytest

from src.case_generator.generator import GeneratorError, Priority, TestType

logger = logging.getLogger(__name__)


@pytest.mark.generation
class TestCaseGeneratorFromRequirement:
    @pytest.mark.P0
    def test_generate_from_login_requirement(self, generator):
        """TC-GEN-001: 从登录需求文本生成测试用例"""
        logger.info("TC-GEN-001: Testing generation from login requirement")
        req = "User should be able to login with valid credentials. Invalid credentials must be rejected."

        test_cases = generator.generate_from_requirement(req, module="auth")

        assert len(test_cases) > 0
        tc_ids = [tc.tc_id for tc in test_cases]
        assert any("AUTH" in tc_id for tc_id in tc_ids)

    @pytest.mark.P0
    def test_generate_from_crud_requirement(self, generator):
        """TC-GEN-002: 从 CRUD 需求生成正向和负向测试用例"""
        logger.info("TC-GEN-002: Testing CRUD test case generation")
        req = "Admin can create, update, and delete user accounts. Duplicate accounts must be rejected."

        test_cases = generator.generate_from_requirement(req, module="user")

        types = {tc.test_type for tc in test_cases}
        assert TestType.POSITIVE in types, "Should have positive test cases"
        assert TestType.NEGATIVE in types, "Should have negative test cases"

    @pytest.mark.P0
    def test_generate_security_test_cases(self, generator):
        """TC-GEN-003: 当需求包含安全关键词时生成安全测试用例"""
        logger.info("TC-GEN-003: Testing security test case generation")
        req = "API endpoints must validate all input to prevent injection attacks. Authentication required."

        test_cases = generator.generate_from_requirement(req, module="api")

        security_cases = [tc for tc in test_cases if tc.test_type == TestType.SECURITY]
        assert len(security_cases) > 0, "Should generate security test cases"
        assert all(tc.priority == Priority.P0 for tc in security_cases), "Security tests must be P0"

    @pytest.mark.P1
    def test_generate_boundary_test_cases(self, generator):
        """TC-GEN-004: 当需求包含数值限制时生成边界测试用例"""
        logger.info("TC-GEN-004: Testing boundary test case generation")
        req = "Username must be between 3 and 50 characters. Maximum 100 items per page."

        test_cases = generator.generate_from_requirement(req, module="user")

        boundary_cases = [tc for tc in test_cases if tc.test_type == TestType.BOUNDARY]
        assert len(boundary_cases) > 0, "Should generate boundary test cases for numeric limits"

    @pytest.mark.P0
    def test_empty_requirement_raises_error(self, generator):
        """TC-GEN-005: 空需求文本应抛出 GeneratorError"""
        logger.info("TC-GEN-005: Testing error on empty requirement")
        with pytest.raises(GeneratorError, match="cannot be empty"):
            generator.generate_from_requirement("", module="user")

    @pytest.mark.P1
    def test_whitespace_only_raises_error(self, generator):
        """TC-GEN-006: 纯空白需求文本应抛出 GeneratorError"""
        with pytest.raises(GeneratorError):
            generator.generate_from_requirement("   \n\t  ", module="user")

    @pytest.mark.P1
    def test_test_case_has_required_fields(self, generator):
        """TC-GEN-007: 生成的测试用例应包含所有必要字段"""
        logger.info("TC-GEN-007: Verifying generated test case structure")
        req = "System should allow user to login and logout."

        test_cases = generator.generate_from_requirement(req, module="auth")

        assert len(test_cases) > 0
        tc = test_cases[0]
        assert tc.tc_id, "tc_id must not be empty"
        assert tc.title, "title must not be empty"
        assert tc.description, "description must not be empty"
        assert isinstance(tc.preconditions, list) and len(tc.preconditions) > 0
        assert isinstance(tc.steps, list) and len(tc.steps) > 0
        assert tc.expected_result, "expected_result must not be empty"
        assert tc.priority in Priority
        assert tc.test_type in TestType

    @pytest.mark.P1
    def test_priority_assignment_login_is_p0(self, generator):
        """TC-GEN-008: 登录相关需求应分配 P0 优先级"""
        logger.info("TC-GEN-008: Testing priority assignment rules")
        req = "Users must be able to login to access the application."

        test_cases = generator.generate_from_requirement(req, module="auth")

        login_cases = [tc for tc in test_cases if "login" in tc.tc_id.lower()]
        assert len(login_cases) > 0
        assert all(tc.priority == Priority.P0 for tc in login_cases)

    @pytest.mark.P1
    def test_generation_history_is_recorded(self, generator):
        """TC-GEN-009: 生成历史应被记录"""
        logger.info("TC-GEN-009: Testing generation history tracking")
        req = "System should allow users to search products."
        generator.generate_from_requirement(req, module="product")

        history = generator.get_generation_history()
        assert len(history) == 1
        assert history[0]["module"] == "product"
        assert history[0]["generated_count"] > 0


@pytest.mark.generation
class TestCaseGeneratorFromDiff:
    @pytest.mark.P0
    def test_generate_from_diff_with_new_function(self, generator):
        """TC-GEN-010: 从包含新函数的 diff 生成回归测试用例"""
        logger.info("TC-GEN-010: Testing generation from code diff")
        diff = """\
--- a/src/user.py
+++ b/src/user.py
@@ -10,0 +11 @@
+    def validate_email(self, email):
+        return '@' in email
"""
        test_cases = generator.generate_from_diff(diff, module="user")

        assert len(test_cases) == 2, "Should generate happy path + error path"
        types = {tc.test_type for tc in test_cases}
        assert TestType.POSITIVE in types
        assert TestType.NEGATIVE in types

    @pytest.mark.P1
    def test_generate_from_diff_no_functions_creates_regression(self, generator):
        """TC-GEN-011: 无新增函数的 diff 应生成通用回归用例"""
        logger.info("TC-GEN-011: Testing fallback regression case for diff without functions")
        diff = "--- a/config.py\n+++ b/config.py\n-TIMEOUT = 30\n+TIMEOUT = 60"

        test_cases = generator.generate_from_diff(diff, module="config")

        assert len(test_cases) == 1
        assert test_cases[0].priority == Priority.P0
        assert "regression" in test_cases[0].tags

    @pytest.mark.P0
    def test_empty_diff_raises_error(self, generator):
        """TC-GEN-012: 空 diff 文本应抛出 GeneratorError"""
        with pytest.raises(GeneratorError, match="cannot be empty"):
            generator.generate_from_diff("", module="user")


@pytest.mark.generation
class TestBoundaryFromMarkdownTable:
    @pytest.mark.P1
    def test_extract_boundary_from_markdown_table(self, generator):
        """TC-GEN-015 (DEF-AI-001): Markdown 表格格式的边界条件应被正确提取"""
        req = "| 用户名最大长度 | 256 字符 |\n| 密码最大长度 | 128 字符 |\n| 密码最小长度 | 8 字符 |\n"

        test_cases = generator.generate_from_requirement(req, module="login")

        boundary_cases = [tc for tc in test_cases if tc.test_type == TestType.BOUNDARY]
        assert len(boundary_cases) >= 3, f"应从 Markdown 表格提取至少 3 个边界用例，实际得到 {len(boundary_cases)}"

    @pytest.mark.P1
    def test_boundary_from_mixed_format(self, generator):
        """TC-GEN-016 (DEF-AI-001): 混合格式（纯文本+表格）均能提取边界条件"""
        req = "Username max length is 50 characters.\n| 密码最大长度 | 128 字符 |\n"

        test_cases = generator.generate_from_requirement(req, module="login")

        boundary_cases = [tc for tc in test_cases if tc.test_type == TestType.BOUNDARY]
        assert len(boundary_cases) >= 2, f"纯文本 + 表格格式应各产生 1 个边界用例，实际得到 {len(boundary_cases)}"


@pytest.mark.generation
class TestDBCSKeywordGeneration:
    @pytest.mark.P1
    def test_unicode_keyword_generates_unicode_tagged_case(self, generator):
        """TC-DBCS-001: 含 'unicode' 关键词时生成 tags 含 'unicode' 的用例"""
        req = "The login form must support unicode character input for international users."
        test_cases = generator.generate_from_requirement(req, module="login")
        dbcs_cases = [tc for tc in test_cases if "unicode" in tc.tags]
        assert len(dbcs_cases) >= 1, f"Expected ≥1 unicode-tagged case, got {len(dbcs_cases)}"

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


@pytest.mark.generation
class TestDBCSBoundaryExtraction:
    @pytest.mark.P1
    def test_byte_vs_char_boundary_generates_dbcs_boundary_case(self, generator):
        """TC-DBCS-004: 含字节/字符对比描述时生成 dbcs-byte-char 边界用例"""
        req = "Password field enforces 256字节/128字符 limit for DBCS input."
        test_cases = generator.generate_from_requirement(req, module="login")
        dbcs_boundary = [tc for tc in test_cases if tc.test_type == TestType.BOUNDARY and "dbcs-byte-char" in tc.tags]
        assert len(dbcs_boundary) >= 1, f"Expected ≥1 dbcs-byte-char boundary case, got {len(dbcs_boundary)}"


@pytest.mark.generation
class TestCoverageAnalysis:
    @pytest.mark.P1
    def test_analyze_coverage_returns_stats(self, generator):
        """TC-GEN-013: 覆盖率分析应返回类型和优先级统计"""
        logger.info("TC-GEN-013: Testing coverage analysis")
        req = "Users can login, create, and delete accounts. API input validation required."
        test_cases = generator.generate_from_requirement(req, module="system")

        coverage = generator.analyze_coverage(test_cases)

        assert coverage["total"] == len(test_cases)
        assert "by_type" in coverage
        assert "by_priority" in coverage
        assert 0 <= coverage["coverage_score"] <= 100

    @pytest.mark.P2
    def test_analyze_empty_coverage(self, generator):
        """TC-GEN-014: 空测试用例集的覆盖率分析"""
        coverage = generator.analyze_coverage([])

        assert coverage["total"] == 0
        assert coverage["coverage_score"] == 0.0
