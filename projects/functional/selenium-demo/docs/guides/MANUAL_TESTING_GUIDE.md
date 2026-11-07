# 📖 IWSVA System Updates - 手工测试指南

**项目**: IWSVA Selenium Test Automation Framework
**版本**: 1.0.0
**日期**: 2026-02-21
**作者**: QA Team

---

## 📋 目录

- [测试环境准备](#测试环境准备)
- [基础功能测试](#基础功能测试)
- [组件更新测试](#组件更新测试)
- [回滚测试](#回滚测试)
- [错误处理测试](#错误处理测试)
- [验证检查点](#验证检查点)
- [常见问题](#常见问题)

---

## 🔧 测试环境准备

### 1. 访问 IWSVA 服务器

**测试环境信息**:
- **URL**: https://10.206.201.9:8443
- **用户名**: admin
- **密码**: (在 .env 文件中配置)

**浏览器要求**:
- Chrome (推荐)
- Firefox
- 需要接受自签名证书

### 2. 登录步骤

1. 打开浏览器，访问: `https://10.206.201.9:8443`
2. 如果提示证书警告，点击"高级" → "继续访问"
3. 在登录页面输入:
   - 用户名: `admin`
   - 密码: `111111` (或您的密码)
4. 点击"登录"按钮

**预期结果**: ✅ 登录成功，进入 IWSVA 主页面，看到 3 个框架（tophead, left, right）

---

## 🧪 基础功能测试

### 测试用例 1: 验证 3-Frame 架构

**目的**: 确认 IWSVA 页面结构正确

**测试步骤**:
1. 登录后观察页面布局
2. 确认页面分为 3 个部分:
   - **Top**: 顶部导航栏（tophead frame）
   - **Left**: 左侧菜单栏（left frame）
   - **Right**: 右侧内容区域（right frame）

**验证点**:
- ✅ 顶部导航栏显示产品 logo 和用户信息
- ✅ 左侧菜单栏显示"Administration"等菜单项
- ✅ 右侧内容区域显示欢迎信息或默认页面

---

### 测试用例 2: 导航到 System Updates 页面

**目的**: 验证通过菜单导航到 System Updates 页面

**测试步骤**:
1. 在**左侧菜单**找到"**Administration**"菜单项
2. 点击"**Administration**"
3. 等待子菜单展开（1-2秒）
4. 在子菜单中找到"**System Updates**"
5. 点击"**System Updates**"
6. 等待右侧内容区域加载（2-3秒）

**验证点**:
- ✅ 子菜单成功展开，显示"System Updates"选项
- ✅ 点击后，右侧内容区域显示"System Update"标题
- ✅ 页面显示 kernel version 信息
- ✅ URL 不变（仍然是主页 URL，因为使用 frameset）

**重要提示**:
- ⚠️ **不要**直接访问 `/jsp/system_update.jsp`（会返回 404）
- ✅ **必须**通过菜单导航访问

---

### 测试用例 3: 验证 Kernel Version 显示

**目的**: 确认页面正确显示 kernel 版本

**测试步骤**:
1. 按照测试用例 2 导航到 System Updates 页面
2. 在右侧内容区域查找 kernel 信息
3. 记录显示的 kernel version

**验证点**:
- ✅ Kernel version 格式正确: `X.X.X-XXX.XX.X.elX_X.x86_64`
- ✅ 示例: `5.14.0-427.24.1.el9_4.x86_64`
- ✅ 版本号与系统实际 kernel 版本一致

**如何验证 kernel 版本正确性**:
```bash
# SSH 登录到 IWSVA 服务器
ssh root@10.206.201.9

# 检查实际 kernel 版本
uname -r

# 输出应该与页面显示一致
# 例如: 5.14.0-427.24.1.el9_4.x86_64
```

---

## 🔄 组件更新测试

### 测试用例 4: 查看组件列表

**目的**: 了解可更新的组件

**IWSVA 可更新组件（共 9 个）**:

| 组件 ID | 组件名称 | 类型 | 描述 |
|---------|----------|------|------|
| PTN | Virus Pattern | Pattern | 病毒特征库 (P0) |
| SPYWARE | Spyware Pattern | Pattern | 间谍软件特征库 |
| BOT | Bot Pattern | Pattern | 僵尸网络特征库 |
| ITP | IntelliTrap Pattern | Pattern | IntelliTrap 特征库 |
| ITE | IntelliTrap Exception | Pattern | IntelliTrap 例外规则 |
| ICRCAGENT | ICRC Agent | Pattern | ICRC 代理 |
| ENG | Virus Scan Engine | Engine | 病毒扫描引擎 (P0) |
| ATSEENG | Behavior Monitoring Engine | Engine | 行为监控引擎 |
| TMUFEENG | URL Filtering Engine | Engine | URL 过滤引擎 |

**测试步骤**:
1. 导航到 System Updates 页面
2. 查看组件列表
3. 记录每个组件的当前版本

**验证点**:
- ✅ 所有 9 个组件都显示在列表中
- ✅ 每个组件显示当前版本号
- ✅ 每个组件显示最新可用版本（如果有更新）
- ✅ 显示"Update"、"Force Update"、"Rollback"等操作按钮

---

### 测试用例 5: Normal Update（正常更新）

**目的**: 执行组件正常更新

**前置条件**:
- 组件有新版本可用（Current Version < Latest Version）
- 网络连接正常，可以访问更新服务器

**测试步骤（以 PTN 为例）**:

#### **第 1 步: 准备更新**
1. 导航到 System Updates 页面
2. 找到"**PTN (Virus Pattern)**"组件
3. 记录**当前版本**（例如: `15.123.00`）
4. 确认**最新版本**（例如: `15.124.00`）

#### **第 2 步: 触发更新**
1. 选择"**PTN**"组件的单选按钮
2. 点击"**Update**"按钮
3. 如果弹出确认对话框，点击"**确认**"

#### **第 3 步: 监控更新进度**
1. 观察更新状态变化:
   - `Downloading...` (下载中)
   - `Installing...` (安装中)
   - `Completed` (完成)

2. 更新时长参考:
   - **Patterns** (PTN, SPYWARE, BOT, etc.): 2-5 分钟
   - **Engines** (ENG, ATSEENG, TMUFEENG): 8-12 分钟

#### **第 4 步: 验证更新结果**

**UI 层验证**:
- ✅ 更新状态显示"**Completed**"或"**Success**"
- ✅ 当前版本更新为新版本（`15.124.00`）
- ✅ 没有错误提示信息

**后端验证** (SSH):
```bash
# SSH 登录到 IWSVA 服务器
ssh root@10.206.201.9

# 检查 PTN 版本（从 INI 文件）
grep "^PTN=" /etc/iscan/pattern/version.ini

# 预期输出: PTN=15.124.00 (新版本)

# 检查更新日志
tail -f /var/log/iscan/update.log

# 查找 PTN 更新成功的日志
grep "PTN.*success" /var/log/iscan/update.log

# 确认没有锁文件残留
ls -la /var/lock/iscan/ptn.lock
# 预期: 文件不存在（更新完成后自动删除）
```

**业务功能验证**:
- ✅ 病毒扫描功能正常
- ✅ 可以检测到新病毒特征
- ✅ 系统服务运行正常

---

### 测试用例 6: Forced Update（强制更新）

**目的**: 测试强制更新功能（即使已是最新版本）

**使用场景**:
- 组件已是最新版本，但需要重新安装
- 组件文件损坏，需要重新下载

**测试步骤**:

#### **第 1 步: 准备**
1. 确认组件已是最新版本（Current Version = Latest Version）
2. 选择组件（例如 PTN）

#### **第 2 步: 执行强制更新**
1. 选择"**PTN**"单选按钮
2. 点击"**Force Update**"按钮（不是 Update）
3. 在确认对话框中，阅读警告信息
4. 点击"**确认**"强制更新

#### **第 3 步: 监控进度**
- 观察更新进度（同正常更新）
- 注意：强制更新会重新下载和安装，即使版本相同

#### **第 4 步: 验证**
- ✅ 更新成功完成
- ✅ 版本号保持不变（因为强制重装相同版本）
- ✅ 组件文件被重新下载和安装
- ✅ 功能正常

---

### 测试用例 7: Rollback（回滚）

**目的**: 将组件回滚到之前的版本

**前置条件**:
- 组件支持回滚（TMUFEENG **不支持**回滚！）
- 存在备份版本

**测试步骤**:

#### **第 1 步: 检查回滚支持**
```bash
# 检查备份版本是否存在
ssh root@10.206.201.9
ls -la /opt/TrendMicro/IWSS/Pattern/backup/

# 预期: 看到备份的 pattern 文件
```

#### **第 2 步: 执行回滚**
1. 导航到 System Updates 页面
2. 选择组件（例如 PTN）
3. 点击"**Rollback**"按钮
4. 在确认对话框中，确认回滚操作
5. 点击"**确认**"

#### **第 3 步: 监控回滚进度**
- 观察状态: `Rolling back...` → `Completed`
- 回滚时长通常较快（1-3 分钟）

#### **第 4 步: 验证回滚**
```bash
# 检查版本已回滚
grep "^PTN=" /etc/iscan/pattern/version.ini

# 预期: 显示旧版本号（例如 15.123.00）

# 检查回滚日志
grep "rollback.*success" /var/log/iscan/update.log
```

**验证点**:
- ✅ 版本号回滚到之前的版本
- ✅ 功能正常工作
- ✅ 没有错误日志

**重要提示**:
- ⚠️ **TMUFEENG (URL Filtering Engine) 不支持回滚！**
- ⚠️ 如果尝试回滚 TMUFEENG，会看到错误提示

---

### 测试用例 8: Update All（批量更新）

**目的**: 一次性更新所有组件

**测试步骤**:

#### **第 1 步: 准备**
1. 导航到 System Updates 页面
2. 检查哪些组件有更新
3. 记录所有组件的当前版本

#### **第 2 步: 执行批量更新**
1. 不要选择任何单个组件（或选择"All"选项）
2. 点击"**Update All**"按钮
3. 在确认对话框中，查看更新清单
4. 点击"**确认**"

#### **第 3 步: 监控批量更新**
- 观察所有组件依次更新
- 更新顺序通常是：Patterns → Engines
- 总时长: 15-30 分钟（取决于组件数量）

#### **第 4 步: 验证**
- ✅ 所有组件都成功更新
- ✅ 所有版本号都更新为最新
- ✅ 没有组件更新失败

---

## ❌ 错误处理测试

### 测试用例 9: 网络错误

**目的**: 测试网络中断时的错误处理

**测试步骤**:
1. 触发组件更新
2. 在更新过程中，断开服务器网络连接（或模拟网络故障）
3. 观察错误处理

**预期结果**:
- ⚠️ 显示网络错误提示
- ⚠️ 更新状态显示"Failed"或"Error"
- ✅ 组件版本保持不变（不会损坏）
- ✅ 可以重新尝试更新

---

### 测试用例 10: 并发更新冲突

**目的**: 测试同时更新多个组件的冲突处理

**测试步骤**:
1. 打开两个浏览器窗口，登录相同账号
2. 在第一个窗口，触发 PTN 更新
3. 在第二个窗口，立即尝试触发 SPYWARE 更新

**预期结果**:
- ⚠️ 第二个更新被阻止，显示"更新正在进行"错误
- ✅ 不会同时运行两个更新
- ✅ 锁机制正常工作

**后端验证**:
```bash
# 检查锁文件
ssh root@10.206.201.9
ls -la /var/lock/iscan/

# 更新时应该看到 .lock 文件
# 更新完成后，.lock 文件自动删除
```

---

### 测试用例 11: 磁盘空间不足

**目的**: 测试磁盘空间不足时的错误处理

**测试步骤**:
1. 检查磁盘空间:
```bash
ssh root@10.206.201.9
df -h /opt/TrendMicro/
```

2. 如果空间充足，模拟空间不足（可选）
3. 触发更新

**预期结果**:
- ⚠️ 显示"磁盘空间不足"错误
- ✅ 更新失败，不会损坏系统
- ✅ 错误日志记录详细信息

---

## ✅ 验证检查点

### 多层级验证清单

每次更新后，应该执行以下验证：

#### **1. UI 层验证** (在浏览器中)
- [ ] 更新状态显示"Success"或"Completed"
- [ ] 版本号正确更新
- [ ] 没有错误提示信息
- [ ] 页面显示正常，没有崩溃

#### **2. Backend 层验证** (SSH 后端)
```bash
# 连接到服务器
ssh root@10.206.201.9

# 检查组件版本（从 INI 文件）
cat /etc/iscan/pattern/version.ini

# 检查 Pattern 文件
ls -lh /opt/TrendMicro/IWSS/Pattern/

# 检查锁文件（应该不存在）
ls -la /var/lock/iscan/*.lock

# 检查服务状态
systemctl status iscan
```

#### **3. Log 层验证** (日志文件)
```bash
# 检查更新日志
tail -n 100 /var/log/iscan/update.log

# 查找成功日志
grep "success" /var/log/iscan/update.log | tail -5

# 查找错误日志
grep -i "error\|fail" /var/log/iscan/update.log | tail -10

# 检查审计日志
tail -n 50 /var/log/iscan/audit.log
```

#### **4. Business 层验证** (功能测试)
- [ ] 扫描功能正常
- [ ] 可以检测病毒/恶意软件
- [ ] 更新后的特征库生效
- [ ] 系统性能正常

---

## 🔍 常见问题

### Q1: 如何知道哪些组件需要更新？
**A**: 在 System Updates 页面，如果"Latest Version"大于"Current Version"，则该组件有更新可用。

---

### Q2: 更新失败后应该怎么办？
**A**:
1. 检查错误日志: `tail -f /var/log/iscan/update.log`
2. 检查网络连接
3. 检查磁盘空间: `df -h`
4. 删除残留的锁文件: `rm -f /var/lock/iscan/*.lock`
5. 重新尝试更新

---

### Q3: 为什么不能直接访问 /jsp/system_update.jsp？
**A**: IWSVA 使用基于 session 的访问控制，直接访问 JSP 页面会返回 404。必须通过菜单导航访问以建立正确的 session 状态。

---

### Q4: 哪些组件不能回滚？
**A**: **TMUFEENG (URL Filtering Engine)** 不支持回滚操作。如果尝试回滚，会显示错误提示。

---

### Q5: 更新时长一般是多少？
**A**:
- **Patterns** (PTN, SPYWARE, BOT, etc.): 2-5 分钟
- **Scan Engine** (ENG): 10-12 分钟
- **Other Engines** (ATSEENG, TMUFEENG): 8-10 分钟
- **Update All**: 15-30 分钟

---

### Q6: 如何手动清理残留的锁文件？
**A**:
```bash
ssh root@10.206.201.9

# 检查锁文件
ls -la /var/lock/iscan/

# 删除所有锁文件（确保没有更新正在运行！）
rm -f /var/lock/iscan/*.lock

# 验证删除成功
ls -la /var/lock/iscan/
```

---

## 📊 测试用例总结

| 测试用例 | 类型 | 优先级 | 预计时间 |
|---------|------|--------|---------|
| TC-1: 验证 3-Frame 架构 | UI | P0 | 1 分钟 |
| TC-2: 导航到 System Updates | UI | P0 | 2 分钟 |
| TC-3: 验证 Kernel Version | UI | P0 | 2 分钟 |
| TC-4: 查看组件列表 | UI | P1 | 3 分钟 |
| TC-5: Normal Update | Functional | P0 | 5 分钟 |
| TC-6: Forced Update | Functional | P1 | 5 分钟 |
| TC-7: Rollback | Functional | P1 | 5 分钟 |
| TC-8: Update All | Functional | P1 | 30 分钟 |
| TC-9: 网络错误 | Error | P2 | 5 分钟 |
| TC-10: 并发更新冲突 | Error | P2 | 5 分钟 |
| TC-11: 磁盘空间不足 | Error | P2 | 5 分钟 |

**总测试时间**: 约 60-90 分钟（完整回归测试）

---

## 📝 测试报告模板

### 手工测试执行报告

**测试日期**: YYYY-MM-DD
**测试人员**: [Your Name]
**测试环境**: IWSVA 10.206.201.9:8443
**浏览器**: Chrome/Firefox [Version]

| 测试用例 | 执行结果 | 备注 |
|---------|---------|------|
| TC-1: 3-Frame 架构 | ✅ Pass / ❌ Fail | |
| TC-2: 导航 | ✅ Pass / ❌ Fail | |
| TC-3: Kernel Version | ✅ Pass / ❌ Fail | |
| TC-4: 组件列表 | ✅ Pass / ❌ Fail | |
| TC-5: Normal Update | ✅ Pass / ❌ Fail | 组件: PTN |
| TC-6: Forced Update | ✅ Pass / ❌ Fail | 组件: PTN |
| TC-7: Rollback | ✅ Pass / ❌ Fail | 组件: PTN |
| TC-8: Update All | ✅ Pass / ❌ Fail | |
| TC-9: 网络错误 | ✅ Pass / ❌ Fail | |
| TC-10: 并发冲突 | ✅ Pass / ❌ Fail | |
| TC-11: 磁盘空间 | ✅ Pass / ❌ Fail | |

**总体结果**: _____ Pass / _____ Fail
**通过率**: _____%

**问题记录**:
1. [描述发现的问题]
2. [描述发现的问题]

**建议**:
- [测试建议或改进建议]

---

## 🎓 自动化 vs 手工测试

| 方面 | 手工测试 | 自动化测试 (Selenium) |
|------|---------|----------------------|
| **速度** | 慢（60-90 分钟） | 快（25 秒） |
| **准确性** | 人为错误可能 | 高精度 |
| **重复性** | 每次手动执行 | 自动重复 |
| **成本** | 人力成本高 | 一次投资，长期受益 |
| **适用场景** | 探索性测试、UI体验 | 回归测试、持续集成 |
| **Backend 验证** | 需要手动 SSH | 自动 SSH 验证 |
| **日志验证** | 手动查看 | 自动解析和验证 |

**建议**:
- ✅ **手工测试**: 用于探索性测试、新功能验证、UI/UX 评估
- ✅ **自动化测试**: 用于回归测试、CI/CD 集成、频繁验证

---

## 📚 相关文档

- **自动化测试代码**: `tests/ui/test_system_updates_verification.py`
- **Page Object Model**: `src/frameworks/pages/system_update_page.py`
- **测试用例文档**: `docs/test-documentation/SYSTEM_UPDATE_TEST_CASES.md`
- **问题跟踪**: `docs/project-management/ISSUES.md`

---

**更新日期**: 2026-02-21
**文档版本**: 1.0.0
**维护者**: QA Automation Team

---

**Happy Testing! 🧪✨**
