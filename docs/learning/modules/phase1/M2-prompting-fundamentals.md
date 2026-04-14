# M2: 提示工程基础

## 概览

提示工程是使用 Copilot CLI 的核心技能。同样的需求，不同的提示方式会产生截然不同的结果。本模块教你如何编写高效的提示，让 Copilot 生成更准确、更有用的代码建议。你将学到提示的结构、常见反模式、以及在 QA 工作中的实战应用。

---

## 核心概念 (理论 ~ 30-40%)

### 概念 1: 提示的三要素 (Context + Task + Constraint)

好的提示应该包含三个关键部分：

| 要素                  | 说明              | 示例                                     |
| ------------------- | --------------- | -------------------------------------- |
| **Context** (上下文)   | 告诉 Copilot 背景信息 | "我正在编写一个 Pytest 测试套件，用于测试 REST API..." |
| **Task** (任务)       | 清晰说明你要做什么       | "请生成一个 GET 请求的测试用例..."                 |
| **Constraint** (约束) | 指定限制条件          | "包括成功和失败场景，用 fixture 进行设置..."          |

**好的提示公式**：
```
Context + Task + Constraint = 优质建议
```

#### 示例对比

❌ **差的提示**（太笼统）：
```
写一个测试
```

✅ **好的提示**（包含三要素）：
```
我正在使用 Pytest 编写一个 API 测试套件。
请为一个 GET /api/users/{id} 端点生成一个测试用例。
测试应该验证：
1. 成功响应（200 状态码）
2. 返回的用户数据结构
3. 失败场景（404 当用户不存在时）
使用 pytest 的 fixture 进行 API 客户端设置。
```

### 概念 2: 提示的反模式 (要避免的做法)

| 反模式 | 问题 | 改正 |
|--------|------|------|
| **过于简洁** | Copilot 无法理解真实意图 | 添加背景和具体要求 |
| **过于冗长** | Copilot 可能遗漏重点 | 使用结构化格式，标注关键点 |
| **模糊的需求** | 生成的代码可能偏离目标 | 用例子或具体的输入/输出 |
| **混合多个任务** | Copilot 不知道优先级 | 一个提示解决一个问题 |
| **包含错误的示例** | Copilot 会学习错误的模式 | 确保示例代码是正确的 |
| **没有格式要求** | 生成的代码风格混乱 | 指定编程语言、框架、风格 |

### 概念 3: Copilot CLI 特有的提示技巧

#### 技巧 1: 使用文件作为上下文
```bash
# ❌ 不好：手动复制粘贴
cat << 'EOF' | gh copilot suggest
我有一个这样的代码...
EOF

# ✅ 好：直接用文件
gh copilot suggest < existing_test.py
# Copilot 会直接读取文件的完整内容和格式
```

#### 技巧 2: 明确指定编程语言和框架
```bash
# ❌ 容易产生混淆
gh copilot suggest "generate a test"

# ✅ 清晰明确
cat << 'EOF' | gh copilot suggest
Language: Python
Framework: Pytest
Write a test case for...
EOF
```

#### 技巧 3: 提示中包含已知的代码风格
```bash
# 给 Copilot 一个"样本"，让它学习你的代码风格
cat << 'EOF' | gh copilot suggest
Here's my existing test style:

class TestUserAPI:
    def test_get_user_success(self):
        # 1. Setup
        user_id = 123
        # 2. Execute
        response = requests.get(f"/api/users/{user_id}")
        # 3. Assert
        assert response.status_code == 200
        assert response.json()["id"] == user_id

Now generate similar tests for POST /api/users endpoint
EOF
```

---

## 实战应用 (70% 以上)

### 场景 1: 优化代码审查提示

**问题描述**

你想用 Copilot 生成代码审查建议，但得到的建议太泛泛或不相关。如何让 Copilot 生成有针对性的审查意见？

**Copilot CLI 解决方案**

```bash
# Step 1: 创建一个包含上下文的提示文件
cat > review_prompt.txt << 'EOF'
Context:
- Project: QA test automation suite
- Language: Python
- Framework: Pytest
- Code quality focus: readability, maintainability, test coverage

Task:
Review the following test code for issues:
1. Readability (variable names, code clarity)
2. Best practices (fixture usage, assertions, error handling)
3. Maintainability (DRY principle, reusability)
4. Missing test coverage

Code to review:
```python
def test_api():
    import requests
    r = requests.get("https://api.example.com/users/1")
    if r.status_code == 200:
        print("OK")
        d = r.json()
        assert d["id"] == 1
        assert d["name"] != ""
    else:
        print("ERROR")
        assert False
```

Provide specific suggestions with code examples.
EOF

# Step 2: 提交给 Copilot
cat review_prompt.txt | gh copilot suggest
```

**结果与验证**

Copilot 会返回类似的建议：

```
Suggestions:
1. Use descriptive variable names (r → response, d → data)
2. Refactor into separate test cases (happy path vs error path)
3. Use pytest fixtures for API setup
4. Proper assertion messages for debugging
5. Add parametrized tests for multiple user IDs

Example refactored code:
[Copilot 会给出改进的代码示例]
```

**常见陷阱与对策**

- ❌ 陷阱 1：提示中混合了代码审查 + 代码生成，Copilot 不知道聚焦哪个
  - ✅ 对策：分开两个提示，先做审查，再生成改进版本

- ❌ 陷阱 2：没有给出"审查的标准"（可读性、性能、安全等）
  - ✅ 对策：在 Context 部分明确列出审查维度

- ❌ 陷阱 3：代码示例格式混乱（缩进、语法错误）
  - ✅ 对策：确保提示中的代码示例正确无误，用 markdown 代码块标注

---

### 场景 2: 生成针对性的测试用例

**问题描述**

你需要为一个复杂的 API 端点生成多个测试用例（成功、失败、边界情况等），但不想逐个手写。

**Copilot CLI 解决方案**

```bash
# 创建一个结构化的提示
cat > test_prompt.txt << 'EOF'
# Context
Framework: Pytest
Testing: REST API (FastAPI)
Tool: requests library
Target: POST /api/users endpoint

# API Specification
POST /api/users
Request body:
{
  "name": string (required, 2-50 chars),
  "email": string (required, valid email format),
  "age": integer (optional, 18-120)
}

Response (201):
{
  "id": integer,
  "name": string,
  "email": string,
  "age": integer (or null),
  "created_at": ISO 8601 timestamp
}

# Test Cases Needed
1. Happy path: Valid user creation
2. Validation error: Missing required field (name)
3. Validation error: Invalid email format
4. Validation error: Age out of range
5. Edge case: Minimum name length (2 chars)
6. Edge case: Maximum name length (50 chars)
7. Duplicate: Email already exists

# Code Style
- Use pytest fixtures (api_client, sample_user_data)
- Include descriptive test names
- Each test should have clear: setup → execute → assert
- Use parametrized tests where appropriate
- Include error message assertions

# Output Format
Please generate a complete pytest test file with all test cases above.
EOF

# 提交给 Copilot
cat test_prompt.txt | gh copilot suggest
```

**结果与验证**

Copilot 会生成一个完整的测试文件，包含所有场景。例如：

```python
@pytest.fixture
def api_client():
    return requests.Session()
    
@pytest.fixture
def api_url():
    return "http://localhost:8000/api/users"

def test_create_user_success(api_client, api_url):
    payload = {...}
    response = api_client.post(api_url, json=payload)
    assert response.status_code == 201
    ...

@pytest.mark.parametrize("name,should_pass", [
    ("ab", True),   # Minimum
    ("a" * 50, True),  # Maximum
    ("a", False),   # Too short
])
def test_name_length_validation(api_client, api_url, name, should_pass):
    ...
```

**常见陷阱与对策**

- ❌ 陷阱 1：一次要求太多测试用例，Copilot 可能生成不完整
  - ✅ 对策：如果超过 10 个用例，分两个提示生成，或让 Copilot 生成框架，手工补充

- ❌ 陷阱 2：没有提供 API 规范，Copilot 会自己假设
  - ✅ 对策：详细描述 API 的请求/响应格式、状态码、错误情况

- ❌ 陷阱 3：没有指定测试风格（parametrized? fixtures?）
  - ✅ 对策：在提示中明确说明你的 Pytest 偏好

---

### 场景 3: 改进低质建议 (迭代优化)

**问题描述**

Copilot 的第一次建议不太满意——可能太简单、不符合你的风格或缺少某些部分。如何迭代优化？

**Copilot CLI 解决方案**

```bash
# 第 1 次：得到初步建议
cat << 'EOF' | gh copilot suggest > first_attempt.py
Generate a pytest test for a login endpoint
EOF

# 第 2 次：基于第 1 次的结果进行改进
cat > refinement_prompt.txt << 'EOF'
Here's what I got from a first attempt:

[粘贴 first_attempt.py 的内容]

This is good, but I need the following improvements:
1. Add proper error handling for network timeouts
2. Use @pytest.mark.asyncio for async operations
3. Add more detailed assertion error messages
4. Include setup and teardown logic
5. Mock the authentication service

Here's an example of my preferred test style:

[给出你的代码风格示例]

Please regenerate the test with these improvements.
EOF

cat refinement_prompt.txt | gh copilot suggest
```

**结果与验证**

Copilot 会根据你的反馈改进建议。每一次迭代都更接近你想要的效果。

**常见陷阱与对策**

- ❌ 陷阱 1：改进建议中包含太多要求，Copilot 无法全部满足
  - ✅ 对策：分个阶段改进，每次 2-3 个改进点

- ❌ 陷阱 2：没有给出"好"的例子对比
  - ✅ 对策：在提示中包含你满意的代码示例，让 Copilot 学习你的风格

- ❌ 陷阱 3：改进太多轮，容易偏离初心
  - ✅ 对策：一般 2-3 轮迭代就够了，超过 3 轮说明需求定义有问题

---

## 最佳实践速查表

### 提示构建检查清单

提交提示前，检查这些项：

| 检查项              | 问题            | 修复              |
| ---------------- | ------------- | --------------- |
| ✓ 包含 Context?    | Copilot 不知道背景 | 添加项目、框架、目标信息    |
| ✓ 明确 Task?       | 目标模糊，结果不符     | 用清晰的动词：生成、优化、解释 |
| ✓ 指定 Constraint? | 输出风格混乱        | 指定语言、框架、代码风格    |
| ✓ 使用示例代码?        | Copilot 不懂风格  | 包含一个"好"的例子      |
| ✓ 避免歧义?          | 多种理解方式        | 一个提示一个任务        |
| ✓ 格式清晰?          | Copilot 遗漏信息  | 用标题、列表、代码块分隔    |

### 快速模板

```bash
# 通用模板
cat << 'EOF' | gh copilot suggest
## Context
[背景信息：项目、框架、目标]

## Task
[具体要求：生成、优化、修复等]

## Constraints
[限制条件：代码风格、性能要求、特殊需求]

## Example (可选)
[参考示例或已有代码]

## Output Format
[期望的输出形式]
EOF
```

### 按场景的推荐提示长度

| 场景 | 建议长度 | 说明 |
|------|---------|------|
| 简单任务（生成代码） | 50-100 词 | 不需要太多上下文 |
| 中等任务（优化代码） | 100-300 词 | 需要代码例子和标准 |
| 复杂任务（完整套件） | 300+ 词 | 包括详细规范、多个例子 |

---

## 常见错误与调试

| 问题 | 症状 | 原因 | 解决方案 |
|------|------|------|---------|
| 结果太泛泛 | 建议不符合需求 | 提示缺乏具体约束 | 添加更多细节和示例 |
| 结果与风格不符 | 代码风格不一致 | 未指定代码风格 | 在提示中包含风格示例 |
| 只生成了一部分 | 输出被截断 | 要求太复杂 | 分成多个提示 |
| 结果包含错误 | 代码有 bug | 提示中的示例有误 | 检查提示中的代码示例 |
| Copilot 拒绝执行 | 无响应或超时 | 提示太长或网络问题 | 简化提示或检查网络 |

---

## 与其他模块的关系

- **前置模块**：M1（Copilot CLI 基础 — 学会基础命令）
- **相关模块**：
  - M4（测试代码生成 — 使用这些提示技巧生成测试）
  - M5（文档生成 — 同样的提示原理适用）
  - M6（代码审查 — 提示工程在审查中也很重要）
- **后续模块**：M7（上下文管理 — 高级的提示上下文技巧）

---

## 进阶延伸

完成本模块后，如果想深入研究：

- **Chain-of-Thought 提示**：让 Copilot 逐步推理（"让我想想... 首先... 然后..."）
- **Few-shot 提示**：提供多个示例让 Copilot 学习模式
- **System Prompt**：通过环境变量设置系统级的提示（高阶用法）
- **提示模板库**：为常见任务建立可复用的提示模板

---

## 参考资源

- [OpenAI 提示工程指南](https://platform.openai.com/docs/guides/prompt-engineering)
- [Copilot 最佳实践](https://docs.github.com/copilot/best-practices-for-using-github-copilot)
- [提示工程研究论文](https://arxiv.org/abs/2312.16171)

---

## 反思与迭代

完成本模块学习后，请记录：

- ✅ **学到的最有用的技巧**：
  - 什么时候应该包含示例代码？
  - 如何判断提示是否足够清晰？
  - 迭代优化的最佳次数是多少？

- 🤔 **遇到的主要困难**：
  - 哪些提示格式效果最好？
  - 什么样的代码示例最有帮助？

- 💡 **改进的空间**：
  - 是否能建立一个提示模板库？
  - 如何跟踪哪些提示模式最有效？

---

**下一步**：继续学习 **[M3: Copilot CLI 生态初探](./M3-cli-ecosystem.md)**，了解 Git 集成和高级功能。或者实践本模块的技巧，为实战项目生成一些测试用例。

*最后更新：2026-04-10*
