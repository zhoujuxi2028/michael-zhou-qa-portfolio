"""
自动化测试脚本生成引擎
AI-Powered Script Generator — 基于测试用例规范自动生成 Pytest 测试脚本
"""
import re
from dataclasses import dataclass, field


class ScriptGeneratorError(Exception):
    pass


@dataclass
class TestSpec:
    """测试用例规范（脚本生成的输入）"""

    tc_id: str
    title: str
    module: str
    test_type: str  # positive / negative / boundary / security / performance
    inputs: dict
    expected_output: dict
    setup: list = field(default_factory=list)
    teardown: list = field(default_factory=list)
    priority: str = "P1"
    parametrize: bool = False
    parametrize_values: list = field(default_factory=list)


_TEST_FUNCTION_TEMPLATE = """\
    @pytest.mark.{priority}
    @pytest.mark.{test_type}
{parametrize_decorator}    def test_{func_name}(self{fixture_args}):
        \"\"\"{tc_id}: {title}\"\"\"
        # Arrange
{arrange_block}

        # Act
{act_block}

        # Assert
{assert_block}
"""

_SUITE_HEADER = "import pytest\n\n\n"


class ScriptGenerator:
    """将测试用例规范转化为 Pytest 测试脚本的生成引擎（展示 AI 驱动脚本生成的核心思路）"""

    def __init__(self):
        self._generated_count = 0
        self._generation_log: list = []

    @property
    def generated_count(self) -> int:
        return self._generated_count

    @property
    def generation_log(self) -> list:
        return self._generation_log.copy()

    def generate_script(self, spec: TestSpec) -> str:
        """
        从单个测试规范生成 Pytest 脚本字符串

        Args:
            spec: 测试用例规范

        Returns:
            str: 可运行的 Pytest 脚本文本

        Raises:
            ScriptGeneratorError: 当规范数据非法时
        """
        self._validate_spec(spec)

        class_name = self._to_class_name(spec.module)
        func_name = self._to_func_name(spec.tc_id, spec.title)

        arrange_block = self._generate_arrange(spec)
        act_block = self._generate_act(spec)
        assert_block = self._generate_assert(spec)
        fixture_args = self._generate_fixture_args(spec)
        setup_fixture = self._generate_setup_fixture(spec)
        parametrize_decorator = self._generate_parametrize(spec)

        test_func = _TEST_FUNCTION_TEMPLATE.format(
            priority=spec.priority.lower(),
            test_type=spec.test_type,
            parametrize_decorator=parametrize_decorator,
            func_name=func_name,
            fixture_args=fixture_args,
            tc_id=spec.tc_id,
            title=spec.title,
            arrange_block=arrange_block,
            act_block=act_block,
            assert_block=assert_block,
        )

        class_header = f"class Test{class_name}:\n"
        class_header += f'    """{spec.tc_id} - {spec.title}"""\n\n'
        if setup_fixture:
            class_header += setup_fixture + "\n\n"

        script = _SUITE_HEADER + class_header + test_func

        self._generated_count += 1
        self._generation_log.append(
            {
                "tc_id": spec.tc_id,
                "module": spec.module,
                "test_type": spec.test_type,
            }
        )

        return script

    def generate_test_suite(self, specs: list) -> str:
        """
        从多个测试规范生成完整测试套件文件

        Args:
            specs: 测试规范列表（可跨模块）

        Returns:
            str: 合并后的 Pytest 测试文件文本
        """
        if not specs:
            raise ScriptGeneratorError("Cannot generate suite from empty specs list")

        classes: dict = {}

        for spec in specs:
            self._validate_spec(spec)
            class_name = self._to_class_name(spec.module)
            func_name = self._to_func_name(spec.tc_id, spec.title)

            arrange_block = self._generate_arrange(spec)
            act_block = self._generate_act(spec)
            assert_block = self._generate_assert(spec)
            fixture_args = self._generate_fixture_args(spec)
            parametrize_decorator = self._generate_parametrize(spec)

            test_func = _TEST_FUNCTION_TEMPLATE.format(
                priority=spec.priority.lower(),
                test_type=spec.test_type,
                parametrize_decorator=parametrize_decorator,
                func_name=func_name,
                fixture_args=fixture_args,
                tc_id=spec.tc_id,
                title=spec.title,
                arrange_block=arrange_block,
                act_block=act_block,
                assert_block=assert_block,
            )

            if class_name not in classes:
                classes[class_name] = []
            classes[class_name].append(test_func)

        output = _SUITE_HEADER
        for class_name, functions in classes.items():
            output += f"class Test{class_name}:\n"
            output += f'    """Generated test suite for {class_name}"""\n\n'
            for func in functions:
                output += func + "\n"
            output += "\n"

        return output

    def validate_generated_script(self, script: str) -> dict:
        """
        验证生成脚本的质量（AAA 模式、断言、标记等）

        Returns:
            dict: 验证结果（valid, issues, suggestions, quality_score）
        """
        issues = []
        suggestions = []

        if "# Arrange" not in script:
            issues.append("Missing AAA pattern: # Arrange comment")
        if "# Act" not in script:
            issues.append("Missing AAA pattern: # Act comment")
        if "# Assert" not in script:
            issues.append("Missing AAA pattern: # Assert comment")

        if not re.search(r"\bassert\b", script):
            issues.append("No assert statements found — test may not validate anything")

        if "@pytest.mark." not in script:
            suggestions.append("Consider adding pytest markers for test categorization")

        if '"""' not in script and "'''" not in script:
            suggestions.append("Add docstrings to document test purpose")

        test_count = len(re.findall(r"def test_\w+", script))

        quality_score = max(0, 100 - len(issues) * 20 - len(suggestions) * 5)

        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "suggestions": suggestions,
            "test_count": test_count,
            "quality_score": quality_score,
        }

    def suggest_fixtures(self, spec: TestSpec) -> list:
        """
        为测试规范推荐合适的 Pytest fixtures

        Returns:
            list[str]: fixture 推荐列表（含说明）
        """
        fixtures = []

        if any(k in spec.inputs for k in ("user_id", "user", "account")):
            fixtures.append("user_fixture: Creates and yields a test user, cleanup after test")

        if any(k in spec.inputs for k in ("db", "database", "records")):
            fixtures.append("db_session: Provides an isolated in-memory database session")

        if any(k in spec.inputs for k in ("token", "auth", "session")):
            fixtures.append("auth_token: Generates a valid JWT token for the test user")

        if any(k in spec.inputs for k in ("client", "api", "endpoint")):
            fixtures.append("api_client: Configured HTTP client with base URL and headers")

        if spec.test_type == "security":
            fixtures.append("injection_payloads: Standard list of OWASP injection test strings")

        if spec.test_type == "performance":
            fixtures.append("perf_timer: Context manager for measuring operation duration")

        return fixtures

    # ── Private helpers ────────────────────────────────────────────────────────

    def _validate_spec(self, spec: TestSpec):
        if not spec.tc_id:
            raise ScriptGeneratorError("tc_id cannot be empty")
        if not spec.title:
            raise ScriptGeneratorError("title cannot be empty")
        if not spec.module:
            raise ScriptGeneratorError("module cannot be empty")
        valid_types = {"positive", "negative", "boundary", "security", "performance"}
        if spec.test_type not in valid_types:
            raise ScriptGeneratorError(f"Invalid test_type '{spec.test_type}'. Must be one of {valid_types}")
        if spec.priority not in ("P0", "P1", "P2"):
            raise ScriptGeneratorError(f"Invalid priority '{spec.priority}'. Must be P0, P1, or P2")

    def _to_class_name(self, module: str) -> str:
        """将模块名转为 PascalCase 类名"""
        return "".join(word.capitalize() for word in re.split(r"[_\-\s]+", module))

    def _to_func_name(self, tc_id: str, title: str) -> str:
        """生成 snake_case 测试函数名"""
        clean = re.sub(r"[^a-zA-Z0-9\s]", "", title.lower())
        words = clean.split()[:6]
        func_part = "_".join(words)
        return func_part if func_part else tc_id.lower().replace("-", "_")

    def _generate_arrange(self, spec: TestSpec) -> str:
        """生成 Arrange 代码块"""
        lines = []
        for key, value in spec.inputs.items():
            if isinstance(value, str):
                lines.append(f'        {key} = "{value}"')
            else:
                lines.append(f"        {key} = {repr(value)}")
        if not lines:
            lines.append("        # No explicit inputs required")
        return "\n".join(lines)

    def _generate_act(self, spec: TestSpec) -> str:
        """生成 Act 代码块"""
        func_name = re.sub(r"[^a-zA-Z0-9_]", "_", spec.module.lower())
        param_str = ", ".join(spec.inputs.keys())
        if spec.test_type == "negative":
            return f"        with pytest.raises(Exception):\n            result = {func_name}.execute({param_str})"
        return f"        result = {func_name}.execute({param_str})"

    def _generate_assert(self, spec: TestSpec) -> str:
        """生成 Assert 代码块"""
        lines = []
        for key, expected in spec.expected_output.items():
            if isinstance(expected, bool):
                lines.append(f"        assert result['{key}'] is {expected}")
            elif isinstance(expected, str):
                lines.append(f'        assert result["{key}"] == "{expected}"')
            elif expected is None:
                lines.append(f"        assert result['{key}'] is None")
            else:
                lines.append(f"        assert result['{key}'] == {repr(expected)}")
        if not lines:
            lines.append("        assert result is not None")
        return "\n".join(lines)

    def _generate_fixture_args(self, spec: TestSpec) -> str:
        """生成方法签名中的 fixture 参数"""
        fixtures = []
        if any(k in spec.inputs for k in ("token", "auth")):
            fixtures.append("auth_token")
        if any(k in spec.inputs for k in ("db", "database")):
            fixtures.append("db_session")
        if spec.parametrize and spec.inputs:
            fixtures.append(list(spec.inputs.keys())[0])
        return (", " + ", ".join(fixtures)) if fixtures else ""

    def _generate_setup_fixture(self, spec: TestSpec) -> str:
        """生成 autouse setup/teardown fixture 方法"""
        if not spec.setup and not spec.teardown:
            return ""
        lines = ["    @pytest.fixture(autouse=True)", "    def setup(self):"]
        for step in spec.setup:
            lines.append(f"        # {step}")
        lines.append("        yield")
        for step in spec.teardown:
            lines.append(f"        # {step}")
        return "\n".join(lines)

    def _generate_parametrize(self, spec: TestSpec) -> str:
        """生成 @pytest.mark.parametrize 装饰器"""
        if not spec.parametrize or not spec.parametrize_values:
            return ""
        param_name = list(spec.inputs.keys())[0] if spec.inputs else "param"
        return f'    @pytest.mark.parametrize("{param_name}", {repr(spec.parametrize_values)})\n'
