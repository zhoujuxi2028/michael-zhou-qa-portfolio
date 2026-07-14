"""
TC-SCR-*: ScriptGenerator 单元测试
验证基于测试规范自动生成 Pytest 脚本的功能
"""

import logging

import pytest

from src.script_generator.generator import ScriptGeneratorError, TestSpec

logger = logging.getLogger(__name__)


@pytest.mark.script_gen
class TestScriptGeneration:
    @pytest.mark.P0
    def test_generate_positive_test_script(self, script_gen, positive_spec):
        """TC-SCR-001: 正向测试规范应生成包含断言的 Pytest 脚本"""
        logger.info("TC-SCR-001: Testing positive test script generation")
        script = script_gen.generate_script(positive_spec)

        assert "import pytest" in script
        assert "def test_" in script
        assert "# Arrange" in script
        assert "# Act" in script
        assert "# Assert" in script
        assert "assert" in script

    @pytest.mark.P0
    def test_generate_negative_test_script(self, script_gen, negative_spec):
        """TC-SCR-002: 负向测试规范应生成包含 pytest.raises 的脚本"""
        logger.info("TC-SCR-002: Testing negative test script generation")
        script = script_gen.generate_script(negative_spec)

        assert "pytest.raises" in script

    @pytest.mark.P0
    def test_generated_script_has_aaa_pattern(self, script_gen, positive_spec):
        """TC-SCR-003: 生成脚本必须遵循 AAA 模式"""
        logger.info("TC-SCR-003: Verifying AAA pattern in generated script")
        script = script_gen.generate_script(positive_spec)

        # AAA 顺序校验：Arrange 在 Act 之前，Act 在 Assert 之前
        arrange_pos = script.index("# Arrange")
        act_pos = script.index("# Act")
        assert_pos = script.index("# Assert")
        assert arrange_pos < act_pos < assert_pos

    @pytest.mark.P0
    def test_class_name_is_pascal_case(self, script_gen, positive_spec):
        """TC-SCR-004: 生成类名应为 PascalCase"""
        logger.info("TC-SCR-004: Testing class name formatting")
        script = script_gen.generate_script(positive_spec)

        # order_service → OrderService
        assert "class TestOrderService" in script

    @pytest.mark.P1
    def test_generated_script_has_pytest_marker(self, script_gen, positive_spec):
        """TC-SCR-005: 生成脚本应包含 pytest 标记"""
        logger.info("TC-SCR-005: Testing pytest marker generation")
        script = script_gen.generate_script(positive_spec)

        assert "@pytest.mark." in script

    @pytest.mark.P1
    def test_generated_script_has_docstring(self, script_gen, positive_spec):
        """TC-SCR-006: 生成脚本应包含文档字符串"""
        logger.info("TC-SCR-006: Testing docstring generation")
        script = script_gen.generate_script(positive_spec)

        assert positive_spec.tc_id in script
        assert positive_spec.title in script

    @pytest.mark.P1
    def test_generate_test_suite_from_multiple_specs(
        self, script_gen, positive_spec, negative_spec
    ):
        """TC-SCR-007: 多个规范应合并生成一个测试套件文件"""
        logger.info("TC-SCR-007: Testing test suite generation")
        suite = script_gen.generate_test_suite([positive_spec, negative_spec])

        assert "import pytest" in suite
        assert "class TestOrderService" in suite
        assert suite.count("def test_") == 2

    @pytest.mark.P0
    def test_empty_specs_raises_error(self, script_gen):
        """TC-SCR-008: 空规范列表应抛出 ScriptGeneratorError"""
        logger.info("TC-SCR-008: Testing error on empty specs")
        with pytest.raises(ScriptGeneratorError, match="empty"):
            script_gen.generate_test_suite([])

    @pytest.mark.P0
    def test_invalid_test_type_raises_error(self, script_gen):
        """TC-SCR-009: 非法 test_type 应抛出 ScriptGeneratorError"""
        logger.info("TC-SCR-009: Testing validation of test_type")
        bad_spec = TestSpec(
            tc_id="TC-001",
            title="Test",
            module="my_module",
            test_type="invalid_type",
            inputs={},
            expected_output={},
        )
        with pytest.raises(ScriptGeneratorError, match="Invalid test_type"):
            script_gen.generate_script(bad_spec)

    @pytest.mark.P0
    def test_invalid_priority_raises_error(self, script_gen):
        """TC-SCR-010: 非法 priority 应抛出 ScriptGeneratorError"""
        bad_spec = TestSpec(
            tc_id="TC-001",
            title="Test",
            module="my_module",
            test_type="positive",
            inputs={},
            expected_output={},
            priority="P9",  # 非法
        )
        with pytest.raises(ScriptGeneratorError, match="Invalid priority"):
            script_gen.generate_script(bad_spec)


@pytest.mark.script_gen
class TestScriptValidation:
    @pytest.mark.P1
    def test_validate_good_script(self, script_gen, positive_spec):
        """TC-SCR-011: 符合规范的脚本应通过验证"""
        logger.info("TC-SCR-011: Testing script validation on good script")
        script = script_gen.generate_script(positive_spec)
        result = script_gen.validate_generated_script(script)

        assert result["valid"] is True
        assert len(result["issues"]) == 0
        assert result["test_count"] >= 1
        assert result["quality_score"] >= 80

    @pytest.mark.P1
    def test_validate_script_missing_aaa(self, script_gen):
        """TC-SCR-012: 缺少 AAA 注释的脚本应报告 issues"""
        logger.info("TC-SCR-012: Testing validation detects missing AAA pattern")
        bad_script = "import pytest\n\ndef test_something():\n    result = do_thing()\n    assert result\n"

        result = script_gen.validate_generated_script(bad_script)

        assert result["valid"] is False
        assert len(result["issues"]) > 0
        assert any("AAA" in issue for issue in result["issues"])

    @pytest.mark.P2
    def test_generation_count_increments(
        self, script_gen, positive_spec, negative_spec
    ):
        """TC-SCR-013: 每次生成应增加计数器"""
        logger.info("TC-SCR-013: Testing generation counter")
        initial = script_gen.generated_count
        script_gen.generate_script(positive_spec)
        script_gen.generate_script(negative_spec)

        assert script_gen.generated_count == initial + 2

    @pytest.mark.P2
    def test_generation_log_records_details(self, script_gen, positive_spec):
        """TC-SCR-014: 生成日志应记录 tc_id、module、test_type"""
        logger.info("TC-SCR-014: Testing generation log")
        script_gen.generate_script(positive_spec)
        log = script_gen.generation_log

        assert len(log) >= 1
        last = log[-1]
        assert last["tc_id"] == positive_spec.tc_id
        assert last["module"] == positive_spec.module
        assert last["test_type"] == positive_spec.test_type


@pytest.mark.script_gen
class TestFixtureSuggestions:
    @pytest.mark.P2
    def test_suggest_auth_fixture_for_token_input(self, script_gen):
        """TC-SCR-015: 包含 token 输入的规范应推荐 auth_token fixture"""
        logger.info("TC-SCR-015: Testing fixture suggestion for auth token")
        spec = TestSpec(
            tc_id="TC-AUTH-001",
            title="Validate JWT token",
            module="auth",
            test_type="positive",
            inputs={"token": "Bearer xyz"},
            expected_output={"valid": True},
        )

        fixtures = script_gen.suggest_fixtures(spec)

        assert any("auth_token" in f for f in fixtures)

    @pytest.mark.P2
    def test_suggest_injection_fixture_for_security_test(self, script_gen):
        """TC-SCR-016: 安全类型测试应推荐 injection_payloads fixture"""
        logger.info("TC-SCR-016: Testing fixture suggestion for security tests")
        spec = TestSpec(
            tc_id="TC-SEC-001",
            title="Prevent SQL injection",
            module="database",
            test_type="security",
            inputs={"query": "SELECT *"},
            expected_output={"blocked": True},
        )

        fixtures = script_gen.suggest_fixtures(spec)

        assert any("injection_payloads" in f for f in fixtures)
