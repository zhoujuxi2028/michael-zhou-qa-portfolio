# 测试用例文档导航

## 📚 文档索引

### 主要文档

- **[SYSTEM_UPDATE_TEST_CASES.md](./SYSTEM_UPDATE_TEST_CASES.md)** - **测试用例详细文档**（2个已实现）
  - TC-VERIFY-001: Multi-Level Kernel Version Verification ✅
  - TC-VERIFY-002: System Information Backend Verification ✅
  - 完整的测试步骤、验证点、执行历史

- **[test-case-metadata.json](./test-case-metadata.json)** - **测试用例结构化元数据** (待创建)
  - 机器可读的测试用例元数据
  - 自动化状态、标签、关联需求
  - 用于测试报告生成和追溯

### 支持文档

- **[traceability-matrix.md](./traceability-matrix.md)** - **需求追溯矩阵** (待创建)
  - 需求到测试用例的映射
  - 覆盖率统计
  - 风险分析

- **[test-data-dictionary.md](./test-data-dictionary.md)** - **测试数据字典** (待创建)
  - 数据字段定义
  - 数据类型和约束
  - 示例值和数据来源

- **[verification-checklist.md](./verification-checklist.md)** - **多层级验证清单** (待创建)
  - UI/Backend/Log/Business 验证点
  - 不同测试类型的验证要求
  - 验证矩阵

### 测试计划

- **[Selenium-Test-Plan.md](../test-plans/Selenium-Test-Plan.md)** - **正式测试计划** (待创建)
  - 测试概述、范围、策略
  - 测试环境和资源
  - 时间表和交付物
  - 入口和出口标准

- **[Test-Strategy.md](../test-plans/Test-Strategy.md)** - **测试策略** (待创建)
  - 测试金字塔
  - 多层级验证策略
  - 自动化策略
  - 持续集成策略

---

## 📊 测试用例统计

| 指标 | 数值 |
|------|------|
| **总测试用例数** | 2 |
| **已实现** | 2 (100%) |
| **计划中** | 75+ (参考 Cypress) |
| **自动化覆盖率** | 100% |
| **通过率** | 100% (最近执行) |
| **P0 测试** | 1 |
| **Normal 测试** | 1 |

---

## 🗂️ 测试用例分类

### 已实现（2个）

#### 多层级验证 (Multi-Level Verification) - 1个
- **TC-VERIFY-001**: Multi-Level Kernel Version Verification ✅
  - **优先级**: P0 (Critical)
  - **类型**: Functional Test
  - **验证层级**: UI + Backend + Cross-Level + Expected
  - **执行时间**: ~14s
  - **文件**: `src/tests/ui_tests/test_multi_level_verification_demo.py`

#### 后端验证 (Backend Verification) - 1个
- **TC-VERIFY-002**: System Information Backend Verification ✅
  - **优先级**: Normal
  - **类型**: Integration Test
  - **验证层级**: Backend
  - **执行时间**: ~6s
  - **文件**: `src/tests/ui_tests/test_multi_level_verification_demo.py`

### 计划中（参考 Cypress 77个）

#### Normal Update Tests (9个)
每个组件一个正常更新测试：
- PTN, SPYWARE, BOT, ITP, ITE, ICRCAGENT (6个模式)
- ENG, ATSEENG, TMUFEENG (3个引擎)

#### Forced Update Tests (9个)
强制更新测试（降级）

#### Rollback Tests (8个)
回滚测试（TMUFEENG 除外）

#### Update All Tests (5个)
批量更新测试

#### Error Handling Tests (13个)
异常处理测试

#### UI Interaction Tests (15个)
UI 交互测试

#### 其他测试 (18个)
Schedule, Proxy, Performance, Security, Compatibility 等

**参考**: Cypress 项目测试用例文档 `../../cypress-tests/docs/test-cases/UPDATE_TEST_CASES.md`

---

## 🔍 快速查找

### 按优先级查找

- **[P0 (Critical) 测试](./SYSTEM_UPDATE_TEST_CASES.md#tc-verify-001-multi-level-kernel-version-verification)**
  - TC-VERIFY-001: Multi-Level Kernel Version Verification

- **[Normal 测试](./SYSTEM_UPDATE_TEST_CASES.md#tc-verify-002-system-information-backend-verification)**
  - TC-VERIFY-002: System Information Backend Verification

### 按分类查找

- **[多层级验证测试](./SYSTEM_UPDATE_TEST_CASES.md#category-1-多层级验证测试-multi-level-verification)**
  - 展示多层级验证能力（UI + Backend + Cross-Level）

- **[后端验证测试](./SYSTEM_UPDATE_TEST_CASES.md#category-2-后端验证测试-backend-verification)**
  - 纯 SSH 后端验证，无 UI 交互

### 按状态查找

- **[已实现测试](./SYSTEM_UPDATE_TEST_CASES.md#已实现测试用例)**
  - 2 个测试用例，100% 通过率

- **[计划中测试](./SYSTEM_UPDATE_TEST_CASES.md#计划中的测试用例参考-cypress)**
  - 75+ 测试用例，参考 Cypress 项目扩展

### 按验证层级查找

- **UI 验证**: TC-VERIFY-001
- **Backend 验证**: TC-VERIFY-001, TC-VERIFY-002
- **Cross-Level 验证**: TC-VERIFY-001
- **Log 验证**: (计划中)
- **Business 验证**: (计划中)

---

## 📝 测试用例模板

创建新测试用例时，请参考 [SYSTEM_UPDATE_TEST_CASES.md 中的模板结构](./SYSTEM_UPDATE_TEST_CASES.md#测试用例模板)。

### 必须包含的内容

每个测试用例应包含：

1. **基本信息**
   - 测试用例 ID、标题、优先级
   - 分类、类型、自动化状态
   - 测试文件和方法

2. **描述和前置条件**
   - 2-3 句话描述测试目的
   - 前置条件列表

3. **测试数据**
   - JSON 格式的测试数据
   - 数据来源说明

4. **测试步骤**
   - 表格格式的测试步骤
   - 预期结果和执行时间

5. **验证点**
   - 按层级组织（UI/Backend/Log/Business）
   - Checkbox 格式

6. **执行历史**
   - 日期、结果、执行时长、备注

7. **相关信息**
   - 相关测试用例
   - 关联需求
   - 已知问题
   - 测试设计原理
   - 备注

---

## 🎯 测试用例设计原则

### 1. AAA 模式 (Arrange-Act-Assert)

```python
# Arrange: 准备测试环境
system_update_page.navigate()

# Act: 执行操作
ui_version = system_update_page.get_kernel_version()
backend_version = backend_verifier.get_kernel_version()

# Assert: 验证结果
assert ui_version == backend_version
```

### 2. 多层级验证

确保数据在多个层级的一致性：
- **UI Level**: 用户界面显示
- **Backend Level**: 后端系统状态
- **Log Level**: 日志记录
- **Business Level**: 功能验证

### 3. 单一职责

每个测试用例只验证一个功能点或场景。

### 4. 独立性

测试用例之间相互独立，可以任意顺序执行。

### 5. 可重复性

测试用例可以重复执行，结果稳定一致。

### 6. 自我验证

测试用例自动判断通过或失败，无需人工判断。

### 7. 及时性

测试用例应及时编写，与功能开发同步。

---

## 📈 质量指标

### 当前状态

| 指标 | 当前值 | 目标值 | 状态 |
|------|--------|--------|------|
| **自动化覆盖率** | 100% (2/2) | 100% | ✅ |
| **通过率** | 100% | 95%+ | ✅ |
| **平均执行时间** | 10s/test | <30s/test | ✅ |
| **Flaky Rate** | 0% | <5% | ✅ |
| **需求覆盖率** | 50% (2/4) | 90%+ | ⚠️ |
| **代码覆盖率** | N/A | 80%+ | ⏳ |

### 测试执行历史

| 日期 | 执行测试数 | 通过 | 失败 | 跳过 | 通过率 | 总时长 |
|------|-----------|------|------|------|--------|--------|
| 2026-02-17 | 2 | 2 | 0 | 0 | 100% | 20.07s |

---

## 🔄 更新记录

| 日期 | 版本 | 更新内容 | 作者 |
|------|------|---------|------|
| 2026-02-17 | 1.0.0 | 初始版本，创建文档导航和索引 | QA Team |
| 2026-02-17 | 1.0.0 | 文档化现有 2 个测试用例 | QA Team |

---

## 🚀 下一步计划

### 短期（1周内）

1. ✅ **Phase 1 完成**: 创建测试用例主文档
   - [x] 创建目录结构
   - [x] 文档化 TC-VERIFY-001
   - [x] 文档化 TC-VERIFY-002
   - [x] 创建导航 README

2. ⏳ **Phase 2**: 创建测试用例元数据（1-2 小时）
   - [ ] 创建 `test-case-metadata.json`
   - [ ] 结构化 2 个测试用例的元数据
   - [ ] 添加自动化状态、标签、关联需求

3. ⏳ **Phase 3**: 创建测试计划和策略（2-3 小时）
   - [ ] 创建 `Selenium-Test-Plan.md`
   - [ ] 创建 `Test-Strategy.md`

4. ⏳ **Phase 4**: 创建支持性文档（2-3 小时）
   - [ ] 创建 `traceability-matrix.md`
   - [ ] 创建 `test-data-dictionary.md`
   - [ ] 创建 `verification-checklist.md`

### 中期（2-4周内）

- 扩展测试用例：添加 Normal Update Tests (9个)
- 实现 Forced Update 和 Rollback Tests
- 完善测试数据管理

### 长期（1-3月内）

- 完成全部 77 个测试用例（对齐 Cypress 项目）
- 实现 CI/CD 集成
- 建立自动化报告系统

---

## 📚 相关文档

### Selenium 项目文档

**框架文档**:
- `docs/implementation/DESIGN_SPECIFICATION.md` - 设计规范
- `docs/implementation/PHASE_2_IMPLEMENTATION.md` - Phase 2 实现
- `docs/implementation/FRAMEWORK_CAPABILITIES.md` - 框架能力

**Issue 和修复**:
- `docs/issues/ISSUE-004.md` - System Update 页面导航错误
- `ISSUE-004-FIX-COMPLETED.md` - ISSUE-004 修复完成

**执行报告**:
- `SELF_TEST_EXECUTION_REPORT.md` - 自测执行报告
- `VERIFICATION_READY.md` - 验证就绪文档

**项目文档**:
- `docs/project/PROJECT_GOALS_AND_SCOPE.md` - 项目目标和范围
- `docs/project/MODULAR_REFACTORING_PLAN.md` - 模块化重构计划

### Cypress 项目参考

**测试用例文档** (参考模板):
- `../../cypress-tests/docs/test-cases/UPDATE_TEST_CASES.md` - 77 个测试用例
- `../../cypress-tests/docs/test-cases/test-case-mapping.json` - JSON 元数据
- `../../cypress-tests/docs/test-cases/traceability-matrix.md` - 追溯矩阵
- `../../cypress-tests/docs/test-cases/test-data-dictionary.md` - 数据字典
- `../../cypress-tests/docs/test-cases/verification-checklist.md` - 验证清单

**测试计划** (参考模板):
- `../../cypress-tests/docs/test-plans/IWSVA-Update-Test-Plan.md` - 测试计划
- `../../cypress-tests/docs/test-plans/Test-Strategy.md` - 测试策略

### 外部资源

- **Pytest 文档**: https://docs.pytest.org/
- **Allure 文档**: https://docs.qameta.io/allure/
- **Selenium 文档**: https://www.selenium.dev/documentation/

---

## 💡 使用技巧

### 查找测试用例

```bash
# 搜索特定测试用例 ID
grep -r "TC-VERIFY-001" docs/test-cases/

# 查看所有 P0 测试
grep -A 5 "优先级.*P0" docs/test-cases/SYSTEM_UPDATE_TEST_CASES.md

# 查看多层级验证测试
grep -A 10 "Multi-Level Verification" docs/test-cases/SYSTEM_UPDATE_TEST_CASES.md
```

### 运行测试

```bash
# 运行所有测试
pytest src/tests/ui_tests/test_multi_level_verification_demo.py -v

# 运行特定测试
pytest -k "test_kernel_version_multi_level" -v

# 运行 P0 测试
pytest -m P0 -v

# 生成 Allure 报告
pytest --alluredir=reports/allure-results
allure serve reports/allure-results
```

### 生成测试报告

```bash
# HTML 报告
pytest --html=outputs/reports/report.html

# JSON 报告
pytest --json-report --json-report-file=outputs/reports/report.json

# Allure 报告
pytest --alluredir=reports/allure-results
allure generate reports/allure-results -o reports/allure-report
```

---

## 📞 维护者

如有问题或建议，请联系 **QA Automation Team**。

**文档维护**:
- 每添加新测试用例，立即更新本文档和 SYSTEM_UPDATE_TEST_CASES.md
- 每次测试执行后，更新执行历史
- 定期审查文档准确性和完整性

---

**最后更新**: 2026-02-17
**文档版本**: 1.0.0
