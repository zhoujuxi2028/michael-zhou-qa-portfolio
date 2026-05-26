# M4: 测试代码生成最佳实践

## 概览

在软件开发中，编写测试代码往往耗时且容易遗漏边界情况。Copilot CLI 可以根据**函数签名、文档字符串、用户需求**快速生成符合标准的测试用例，显著提升测试覆盖率。本模块教你如何高效地使用 Copilot CLI 生成和改进测试代码，覆盖单元测试、集成测试和 E2E 测试。

---

## 核心概念 (理论 ~ 30-40%)

### 概念 1: 三种测试生成模式

**模式 A：从代码生成测试**
- 输入：函数/类的源代码
- Copilot 分析：参数类型、返回值、可能的边界情况
- 输出：单元测试用例（Pytest/Jest）
- 适用场景：现有代码缺少测试覆盖

```bash
# 示例
gh copilot suggest "在 utils.py 中为 calculate_discount() 函数生成 Pytest 单元测试，覆盖正常情况、边界值和异常"
```

**模式 B：从文档生成测试**
- 输入：Docstring、注释、User Story
- Copilot 分析：预期行为、输入输出规范
- 输出：行为驱动的测试（BDD 风格）
- 适用场景：需求已明确但测试未写

**模式 C：从失败日志生成测试**
- 输入：测试失败的堆栈跟踪或错误日志
- Copilot 分析：失败原因、缺失的用例
- 输出：回归测试用例
- 适用场景：修复 Bug 时确保不重复

| 模式 | 输入源 | 优势 | 风险 |
|------|--------|------|------|
| 从代码生成 | 源代码 + 签名 | 快速、覆盖完整 | 可能遗漏业务逻辑 |
| 从文档生成 | Docstring / 需求 | 符合需求意图 | 需要高质量文档 |
| 从错误生成 | 错误日志 / PR 反馈 | 针对性强 | 仅覆盖已知缺陷 |

### 概念 2: 框架特性与代码风格

不同的测试框架（Pytest、Jest、Cypress）有不同的惯例。Copilot CLI 需要你明确指定框架以生成符合规范的代码。

**Pytest（Python）**
```python
# 标准结构
def test_function_name():
    # Arrange
    input_data = ...
    # Act
    result = function(input_data)
    # Assert
    assert result == expected
```

**Jest（JavaScript）**
```javascript
describe('FunctionName', () => {
  test('should return X when given Y', () => {
    expect(function(input)).toBe(expected);
  });
});
```

**Cypress（E2E）**
```javascript
describe('User Login Flow', () => {
  it('should log in successfully with valid credentials', () => {
    cy.visit('/login');
    cy.get('[data-testid="username"]').type('user@example.com');
    cy.get('[data-testid="password"]').type('password123');
    cy.get('[data-testid="submit"]').click();
    cy.url().should('include', '/dashboard');
  });
});
```

**最佳实践**：在 prompt 中明确指定框架和风格，例如 "使用 Pytest 和 AAA 模式（Arrange-Act-Assert）生成测试"。

### 概念 3: 测试覆盖率的质量维度

生成测试代码时需要关注四个维度：

| 维度 | 定义 | 衡量方法 |
|------|------|---------|
| **语句覆盖率** | 代码每一行是否被执行 | 通常目标 70-80% |
| **分支覆盖率** | if/else、switch 的所有分支是否被测试 | 通常目标 60-80% |
| **边界值覆盖** | 输入的最小值、最大值、边界值 | 关键逻辑必须 100% |
| **异常覆盖** | 所有可能的异常路径 | 负面测试必须覆盖 |

Copilot CLI 默认生成基于代码结构的测试（语句/分支覆盖），但需要你补充边界值和异常测试。

### 概念 4: 测试生成的常见陷阱

1. **假设合法性**：生成的测试可能假设输入总是合法的，缺少验证测试
2. **缺少依赖隔离**：单元测试未使用 Mock/Stub，变成了集成测试
3. **时间相关的不稳定性**：日期/时间函数的测试容易不稳定
4. **重复的样板代码**：多个测试共享 setup，需要统一成 fixture

---

## 实战应用 (70% 以上)

### 场景 1: 为现有函数快速生成 Pytest 单元测试

**问题描述**

你有一个 Python 文件 `utils.py`，其中包含一个 `calculate_discount()` 函数，但缺少测试覆盖。需要快速生成涵盖正常情况、边界值、异常的测试。

```python
# utils.py
def calculate_discount(price: float, discount_percent: int) -> float:
    """
    根据价格和折扣百分比计算最终价格。
    
    Args:
        price: 原始价格（浮点数，单位：元）
        discount_percent: 折扣百分比（0-100）
    
    Returns:
        最终价格（四舍五入到 2 位小数）
    
    Raises:
        ValueError: 如果 price < 0 或 discount_percent 不在 0-100 范围内
    """
    if price < 0:
        raise ValueError("Price cannot be negative")
    if not (0 <= discount_percent <= 100):
        raise ValueError("Discount percent must be between 0 and 100")
    
    discount_amount = price * (discount_percent / 100)
    final_price = price - discount_amount
    return round(final_price, 2)
```

**Copilot CLI 解决方案**

```bash
# 步骤 1: 分析函数并生成测试建议
gh copilot suggest "为 utils.py 中的 calculate_discount() 函数生成 Pytest 单元测试。\
需要覆盖：\
1. 正常情况（20% 折扣）\
2. 无折扣（0%）\
3. 全额折扣（100%）\
4. 浮点数计算精度\
5. 负价格异常\
6. 无效折扣百分比异常\
使用 AAA 模式（Arrange-Act-Assert）"
```

**预期生成的测试**

```python
# tests/test_utils.py
import pytest
from utils import calculate_discount

class TestCalculateDiscount:
    """calculate_discount 函数的单元测试"""
    
    # 正常情况
    def test_normal_discount_20_percent(self):
        """应该正确计算 20% 折扣"""
        # Arrange
        price = 100.0
        discount_percent = 20
        expected = 80.0
        
        # Act
        result = calculate_discount(price, discount_percent)
        
        # Assert
        assert result == expected
    
    # 边界值
    def test_zero_discount(self):
        """应该处理 0% 折扣（无折扣）"""
        assert calculate_discount(100.0, 0) == 100.0
    
    def test_full_discount(self):
        """应该处理 100% 折扣（全额折扣）"""
        assert calculate_discount(100.0, 100) == 0.0
    
    # 浮点精度
    def test_floating_point_precision(self):
        """应该正确处理浮点数计算并四舍五入到 2 位小数"""
        result = calculate_discount(99.99, 33)
        assert result == 66.99  # 99.99 * (1 - 0.33) = 66.9933 -> 66.99
    
    # 异常情况
    def test_negative_price_raises_error(self):
        """负价格应抛出 ValueError"""
        with pytest.raises(ValueError, match="Price cannot be negative"):
            calculate_discount(-10.0, 20)
    
    def test_invalid_discount_below_0_raises_error(self):
        """折扣 < 0% 应抛出 ValueError"""
        with pytest.raises(ValueError, match="Discount percent must be between"):
            calculate_discount(100.0, -1)
    
    def test_invalid_discount_above_100_raises_error(self):
        """折扣 > 100% 应抛出 ValueError"""
        with pytest.raises(ValueError, match="Discount percent must be between"):
            calculate_discount(100.0, 101)
    
    # 极端情况
    def test_zero_price(self):
        """价格为 0 时应返回 0"""
        assert calculate_discount(0.0, 50) == 0.0
    
    def test_very_small_price(self):
        """超小价格应正确计算"""
        result = calculate_discount(0.01, 50)
        assert result == 0.01  # 0.01 * 0.5 = 0.005 -> 0.01
```

**关键学习点**

1. **prompt 的结构化**：明确列出需要覆盖的场景（正常、边界、异常）
2. **AAA 模式**：让 Copilot 生成可读性高的测试
3. **命名规范**：test 前缀 + 简明描述（test_xxx_should_yyy_when_zzz）
4. **Fixture 复用**：如果有多个共享的 setup，可以用 @pytest.fixture 优化

### 场景 2: 从 User Story 生成 Jest E2E 测试

**问题描述**

你有一个 React 应用，用户故事如下：

> **Feature**: 购物车功能
> **Story**: 作为用户，我想能够将商品添加到购物车，并看到购物车总价实时更新，这样我就能轻松查看购物成本。
> **验收标准**：
> 1. 点击"加入购物车"后，商品出现在购物车列表中
> 2. 购物车总价自动更新
> 3. 可以修改商品数量并重新计算总价
> 4. 清空购物车后，列表为空，总价为 0

**Copilot CLI 解决方案**

```bash
gh copilot suggest "根据以下 User Story 为 React 购物车功能生成 Jest 测试（使用 React Testing Library）：\
User Story: '作为用户，我想能够将商品添加到购物车，并看到购物车总价实时更新'。\
验收标准：\
1. 点击'加入购物车'后，商品出现在列表中\
2. 购物车总价实时更新\
3. 可以修改数量并重新计算\
4. 清空购物车后为空\
使用 Arrange-Act-Assert 模式，涵盖正常流程和异常情况"
```

**预期生成的测试**

```javascript
// src/components/__tests__/ShoppingCart.test.js
import { render, screen, fireEvent } from '@testing-library/react';
import ShoppingCart from '../ShoppingCart';

describe('ShoppingCart Component', () => {
  describe('Add to Cart', () => {
    test('should add product to cart when "Add to Cart" button is clicked', () => {
      // Arrange
      render(<ShoppingCart />);
      const addButton = screen.getByRole('button', { name: /add to cart/i });
      
      // Act
      fireEvent.click(addButton);
      
      // Assert
      expect(screen.getByText(/product added/i)).toBeInTheDocument();
      expect(screen.getByRole('listitem')).toBeInTheDocument();
    });

    test('should update total price when product is added', () => {
      // Arrange
      render(<ShoppingCart initialPrice={0} />);
      const addButton = screen.getByRole('button', { name: /add to cart/i });
      
      // Act
      fireEvent.click(addButton); // Add product with price 29.99
      
      // Assert
      expect(screen.getByText(/total:\s*\$29\.99/i)).toBeInTheDocument();
    });
  });

  describe('Quantity Management', () => {
    test('should update total price when quantity is changed', () => {
      // Arrange
      render(<ShoppingCart />);
      fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));
      const quantityInput = screen.getByLabelText(/quantity/i);
      
      // Act
      fireEvent.change(quantityInput, { target: { value: '3' } });
      
      // Assert
      expect(screen.getByText(/total:\s*\$89\.97/i)).toBeInTheDocument(); // 29.99 * 3
    });
  });

  describe('Clear Cart', () => {
    test('should clear cart and reset total to 0 when clear button is clicked', () => {
      // Arrange
      render(<ShoppingCart />);
      fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));
      const clearButton = screen.getByRole('button', { name: /clear cart/i });
      
      // Act
      fireEvent.click(clearButton);
      
      // Assert
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
      expect(screen.getByText(/total:\s*\$0\.00/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('should handle adding same product multiple times', () => {
      // Arrange
      render(<ShoppingCart />);
      const addButton = screen.getByRole('button', { name: /add to cart/i });
      
      // Act
      fireEvent.click(addButton);
      fireEvent.click(addButton);
      
      // Assert
      expect(screen.getByText(/quantity:\s*2/i)).toBeInTheDocument();
    });

    test('should disable clear button when cart is empty', () => {
      // Arrange & Act
      render(<ShoppingCart />);
      const clearButton = screen.getByRole('button', { name: /clear cart/i });
      
      // Assert
      expect(clearButton).toBeDisabled();
    });
  });
});
```

**关键学习点**

1. **User Story 映射**：每个验收标准对应一个 test suite（describe 块）
2. **Role 查询优于 ID**：用 `getByRole('button', { name })` 代替 `getByTestId`，更贴近用户交互
3. **assert 多样性**：toBeInTheDocument、toBeDisabled、queryByRole（检查不存在）等

### 场景 3: 补充现有测试的边界值和异常覆盖

**问题描述**

你的团队已有基础单元测试，但覆盖率不足（缺少边界值和异常路径）。需要分析现有测试并生成补充用例。

```bash
# 步骤 1: 让 Copilot 分析现有测试文件
gh copilot explain "分析 tests/test_payment.py，识别缺失的测试场景：\
- 边界值（最大、最小、零值）\
- 异常路径（超时、网络错误、API 失败）\
- 并发场景\
生成一份覆盖这些场景的补充测试列表（不需要完整代码，只需列表和简要说明）"

# 步骤 2: 根据建议生成补充测试
gh copilot suggest "为 tests/test_payment.py 补充以下测试场景的 Pytest 代码：\
1. 支付金额为 0\
2. 支付超时（模拟 socket.timeout）\
3. 并发支付请求\
4. API 返回非 200 状态码\
使用 Mock 库隔离外部依赖"
```

**检查测试覆盖率的工具**

```bash
# 使用 coverage.py 检查覆盖率
pip install coverage
coverage run -m pytest tests/
coverage report
coverage html  # 生成 HTML 报告

# 识别未覆盖的行
coverage report --skip-empty
```

---

## 最佳实践速查表

| 场景 | 推荐 Prompt 框架 | 预期产出 |
|------|-----------------|--------|
| 为函数生成测试 | "为 [函数] 生成 [框架] 测试，覆盖 [场景列表]，使用 AAA 模式" | 单元测试 |
| 从需求生成测试 | "根据 User Story 生成 [框架] 测试，验收标准为 [列表]" | 行为驱动测试 |
| 补充缺失覆盖 | "分析现有测试，识别缺失的 [边界值/异常/并发] 场景，生成补充测试" | 覆盖率补充 |
| 修复失败测试 | "这个测试失败了：[错误日志]，生成修复和回归测试" | 修复 + 防护测试 |

---

## 常见错误与调试

| 错误 | 症状 | 原因 | 解决方案 |
|------|------|------|---------|
| **Mock 未生效** | 测试实际调用外部 API | 未正确导入或 patch | 确保 `@patch('module.function')` 的路径正确 |
| **异步测试超时** | test 卡住或超时 | 忘记 await 或用了同步方法 | 在异步函数前加 `async def`，使用 `await` |
| **Fixture 污染** | 测试间相互影响 | fixture 的作用域不对 | 设置 `@pytest.fixture(scope='function')` 默认值 |
| **浮点精度失败** | assert 100.1 == 100.1 失败 | 浮点数精度问题 | 用 `pytest.approx(expected, abs=0.01)` |
| **时间相关不稳定** | 定时测试间歇性失败 | 依赖系统时间 | Mock `time.time()` 或 `datetime.now()` |
| **导入路径错误** | ModuleNotFoundError | 测试文件路径不对 | 检查 `__init__.py` 和 PYTHONPATH |

---

## 与其他模块的关系

- **← M3 前置**：CLI 命令行如何使用（cli explain、suggest）
- **→ M5 后续**：如何为测试生成文档字符串和注释
- **→ M6 后续**：如何在 Code Review 中验证测试覆盖率

---

**下一步**：[M5: 文档和注释生成工作流](./M5-doc-generation.md)

*最后更新：2026-04-14 | 状态：完整* | 预计学习时间：90 分钟 | 代码示例：可复制
