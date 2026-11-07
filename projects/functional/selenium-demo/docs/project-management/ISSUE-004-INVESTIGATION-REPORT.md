# ISSUE-004 深度调查报告

**问题**: System Update Page Navigation Error (404)
**日期**: 2026-02-15
**调查人员**: Michael Zhou
**状态**: ✅ 根本原因已确认，修复方案已验证

---

## 📊 执行总结

### 问题描述
Selenium 测试 `test_kernel_version_multi_level` 失败，尝试访问 System Updates 页面时返回 HTTP 404 错误。

### 根本原因
1. ❌ **错误的 URL**: 当前使用 `/jsp/system_update.jsp`，该 URL 在 IWSVA 系统中**不存在**
2. ❌ **直接访问破坏框架结构**: 即使使用正确的 URL `/admin_patch_mgmt.jsp`，直接 `driver.get()` 访问会导致页面在独立模式加载（无 frameset），破坏了 `SystemUpdatePage` 期望的 3-frame 架构
3. ❌ **代码依赖 frame 访问**: `SystemUpdatePage.get_frame_content(RIGHT_FRAME)` 期望从 right frame 提取内容，直接访问时无 frame 可用

---

## 🔍 详细调查过程

### 阶段 1: 问题重现 ✅

**测试**: `test_kernel_version_multi_level`

```
✅ 登录成功
✅ SSH 连接建立
✅ 导航到 https://10.206.201.9:8443/jsp/system_update.jsp
❌ 页面标题: "HTTP Status 404 – Not Found"
```

**结论**: 问题可重现，确认为 404 错误。

---

### 阶段 2: CSRF Token 调查 ✅

**假设**: 是否因为缺少 CSRF Token 导致访问失败？

**测试结果**:
```
✅ 登录后 CSRF Token 存在: 8VV0IZWHL7QKZDOG6UTSTVWLP9TK9C3T
❌ 无 Token 直接访问: 404
❌ 有 Token 直接访问: 404
✅ 菜单导航（自动携带 Token）: 成功
```

**结论**: CSRF Token 存在，但不是唯一因素。IWSVA 要求**菜单导航路径**进行访问控制。

---

### 阶段 3: 菜单结构分析 ✅

**发现**: 在 left frame 菜单中找到 89 个链接。

**关键发现**:
```
[59] Administration
    href: javascript:void(0)
    onclick: TrendMenu.showHide(...)

展开后:
[85] System Updates
    href: https://10.206.201.9:8443/admin_patch_mgmt.jsp  ← 正确的 URL!
    onclick: TrendMenu.menuClick(this)
```

**文件证据**:
- `left_frame_menu.html` - 初始菜单结构
- `left_frame_menu_expanded.html` - Administration 展开后的菜单
- `menu_links.json` - 所有 89 个链接的详细信息

**结论**:
- ❌ 旧 URL: `/jsp/system_update.jsp` **在菜单中不存在**
- ✅ 正确 URL: `/admin_patch_mgmt.jsp`

---

### 阶段 4: URL 直接访问测试 ✅

测试矩阵:

| 测试 | URL | CSRF Token | 结果 | Kernel 版本 |
|------|-----|-----------|------|------------|
| 1 | `/jsp/system_update.jsp` | ❌ | **404** | ❌ |
| 2 | `/jsp/system_update.jsp` | ✅ | **404** | ❌ |
| 3 | `/admin_patch_mgmt.jsp` | ❌ | ✅ **200 OK** | ✅ `5.14.0-427.24.1.el9_4.x86_64` |
| 4 | `/admin_patch_mgmt.jsp` | ✅ | ✅ **200 OK** | ✅ `5.14.0-427.24.1.el9_4.x86_64` |
| 5 | 菜单导航 | (自动) | ✅ **200 OK** | ✅ `5.14.0-427.24.1.el9_4.x86_64` |

**结论**:
- `/admin_patch_mgmt.jsp` 可以直接访问
- 无需 CSRF Token（直接访问时）
- 菜单导航也可以工作

---

### 阶段 5: Frame 结构分析 ⚠️ **关键发现**

**测试**: 比较直接访问 vs 菜单导航的 frame 结构

#### 直接访问 `admin_patch_mgmt.jsp`:
```
Frames: 0 (无 frameset)
内容位置: 主页面
页面标题: "HTTP Configuration"
Kernel 位置: driver.page_source (主页面)
```

**问题**:
- `SystemUpdatePage.get_frame_content(RIGHT_FRAME)` 会**失败**
- 因为页面没有 frame 结构！

#### 菜单导航:
```
Frames: 3 (tophead, left, right)
内容位置: right frame
Right Frame URL: https://10.206.201.9:8443/
Kernel 位置: right frame 的 page_source
```

**优势**:
- ✅ 保持 3-frame 结构
- ✅ `SystemUpdatePage.get_frame_content(RIGHT_FRAME)` 正常工作
- ✅ 与 Cypress 实现一致

---

## 🎯 最终验证

### 模拟完整测试流程（使用菜单导航）

```python
# 1. Login
driver.get('https://10.206.201.9:8443/login.jsp')
# ... 执行登录

# 2. 切换到 left frame
driver.switch_to.frame('left')

# 3. 点击 Administration
administration_link.click()

# 4. 点击 System Updates
system_updates_link.click()

# 5. 切换到 right frame
driver.switch_to.frame('right')

# 6. 提取内容
frame_content = driver.page_source
kernel_version = extract_kernel(frame_content)  # 成功！
```

**结果**:
```
✅ Right frame content: 8233 characters
✅ Kernel version: 5.14.0-427.24.1.el9_4.x86_64
✅ "System Update" text: FOUND
✅ 与现有 SystemUpdatePage 代码完全兼容
```

---

## 📝 修复方案

### 方案对比

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **A. 更改 URL 为 `admin_patch_mgmt.jsp`** | 简单，只需修改 1 个配置 | 破坏 frame 结构，需重写 `get_frame_content()` 逻辑 | ❌ 不推荐 |
| **B. 实现菜单导航** | 保持 frame 结构，与 Cypress 一致，现有代码可用 | 需实现菜单导航逻辑（~50 行代码） | ✅ **强烈推荐** |

### ✅ 推荐方案: 实现菜单导航

#### 修改文件 1: `src/frameworks/pages/base_page.py`

添加菜单导航辅助方法:

```python
def wait_for_frame_content(self, frame_name: str, expected_text: str, timeout: int = 10) -> bool:
    """Wait for frame to contain expected text"""
    # 实现等待逻辑

def click_in_frame_by_text(self, frame_name: str, text_content: str) -> bool:
    """Click element in frame by text content"""
    # 实现点击逻辑

def click_link_in_frame(self, frame_name: str, search_text: str) -> bool:
    """Click link in frame by partial text match"""
    # 实现链接点击逻辑
```

#### 修改文件 2: `src/frameworks/pages/system_update_page.py`

修改 `navigate()` 方法 (第 73-83 行):

```python
def navigate(self):
    """Navigate to System Updates page via menu navigation"""
    TestLogger.log_step("Navigate to System Updates via menu")

    # 1. Switch to left frame
    self.switch_to_frame(self.LEFT_FRAME)

    # 2. Click Administration menu
    self.click_in_frame_by_text(self.LEFT_FRAME, 'Administration')
    time.sleep(1)

    # 3. Wait for submenu to expand
    self.wait_for_frame_content(self.LEFT_FRAME, 'System Update', timeout=5)

    # 4. Click System Updates link
    self.click_link_in_frame(self.LEFT_FRAME, 'system update')

    # 5. Wait for right frame to load content
    time.sleep(2)
    self.switch_to_default_content()

    self.logger.info("✓ Navigated to System Updates page via menu")
```

**无需修改**:
- ❌ `test_config.py` - URL 配置无需改变
- ❌ `get_frame_content()` - 现有逻辑继续工作
- ❌ `get_kernel_version()` - 提取逻辑无需改变

---

## 🎯 实施计划

### Phase 1: 实现 BasePage 菜单导航方法
- [ ] 添加 `wait_for_frame_content()`
- [ ] 添加 `click_in_frame_by_text()`
- [ ] 添加 `click_link_in_frame()`
- [ ] 单元测试验证

### Phase 2: 更新 SystemUpdatePage
- [ ] 修改 `navigate()` 方法
- [ ] 添加菜单导航逻辑
- [ ] 保留 frame 切换逻辑

### Phase 3: 验证修复
- [ ] 运行 `test_kernel_version_multi_level`
- [ ] 验证所有 6 个测试通过
- [ ] 确认 UI 验证成功

### Phase 4: 文档更新
- [ ] 更新 ISSUE-004 状态为 RESOLVED
- [ ] 添加实施记录
- [ ] 更新测试文档

---

## 📚 参考文档

### 调查生成的文件
```
outputs/debug/
├── main_page.html                      # 登录后主页
├── left_frame_menu.html                # 初始菜单结构
├── left_frame_menu_expanded.html       # Administration 展开后
├── menu_links.json                     # 所有 89 个链接详情
├── expanded_menu_links.json            # 展开后的链接
├── test1_old_url_no_token.html         # 404 错误页面
├── test2_old_url_with_token.html       # 404 错误页面
├── test3_new_url_no_token.html         # 正确页面（无 frame）
├── test4_new_url_with_token.html       # 正确页面（无 frame）
└── test5_menu_navigation.html          # 菜单导航（有 frame）
```

### Cypress 参考实现
- 文件: `cypress-tests/cypress/support/pages/SystemUpdatePage.js`
- 方法: `navigateToSystemUpdates()` (lines 116-135)
- 实现: 使用菜单导航，与推荐方案一致

---

## ✅ 结论

### 根本原因
1. 错误的 URL: `/jsp/system_update.jsp` 不存在
2. 直接访问破坏 frame 结构
3. 代码依赖 right frame 访问

### 修复方案
✅ **实现菜单导航**，保持 3-frame 结构，与 Cypress 一致

### 预期结果
- 所有 6 个测试用例通过 (当前: 3 pass, 3 fail → 目标: 6 pass)
- UI 验证成功提取 kernel 版本
- 与 Cypress 实现保持一致性

---

**报告生成时间**: 2026-02-15
**调查脚本**:
- `test_csrf_investigation.py`
- `test_menu_structure_analysis.py`
- `test_verification_complete.py`
- `test_fix_verification.py`

**下一步**: 开始实施 Phase 1 - 添加 BasePage 菜单导航方法
