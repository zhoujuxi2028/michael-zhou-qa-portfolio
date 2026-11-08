#!/usr/bin/env python3
"""从需求文档生成测试用例并输出到 JSON 和控制台"""

import json
import sys
from pathlib import Path

# 确保 src 可导入
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.case_generator.generator import TestCaseGenerator


def load_requirements(md_path: Path) -> str:
    return md_path.read_text(encoding="utf-8")


def main():
    req_file = Path(__file__).parent.parent / "docs/requirements/LOGIN-REQUIREMENTS.md"
    module = "login"

    print(f"需求文件: {req_file.name}")
    print(f"模块: {module}")
    print("=" * 60)

    req_text = load_requirements(req_file)
    gen = TestCaseGenerator()
    test_cases = gen.generate_from_requirement(req_text, module=module)
    coverage = gen.analyze_coverage(test_cases)

    # 控制台输出
    for tc in test_cases:
        print(f"\n[{tc.tc_id}] {tc.title}")
        print(f"  类型: {tc.test_type.value:<12} 优先级: {tc.priority.value}")
        print(f"  期望结果: {tc.expected_result}")

    print("\n" + "=" * 60)
    print(f"共生成: {coverage['total']} 个测试用例")
    print(f"类型分布: {coverage['by_type']}")
    print(f"优先级分布: {coverage['by_priority']}")
    print(f"覆盖率评分: {coverage['coverage_score']}")

    # 输出 JSON
    output_dir = Path(__file__).parent.parent / "docs/qa"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / "generated-login-test-cases.json"

    data = [
        {
            "tc_id": tc.tc_id,
            "title": tc.title,
            "description": tc.description,
            "preconditions": tc.preconditions,
            "steps": tc.steps,
            "expected_result": tc.expected_result,
            "priority": tc.priority.value,
            "test_type": tc.test_type.value,
            "tags": tc.tags,
        }
        for tc in test_cases
    ]

    output_file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n已输出 JSON: {output_file.relative_to(Path(__file__).parent.parent)}")


if __name__ == "__main__":
    main()
