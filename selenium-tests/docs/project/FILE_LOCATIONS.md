# 📁 面试演示文件位置清单

**当前目录:** `/home/michael/repos/michael-zhou-qa-portfolio/selenium-tests`

---

## 🎯 面试必备文件（TOP 5）

### 1️⃣ **INTERVIEW_DEMO.md** ⭐ 最重要！
- **路径:** `./INTERVIEW_DEMO.md`
- **大小:** 9.9K
- **内容:** 完整的面试演示指南
  - 5分钟演示脚本
  - 常见问题标准答案
  - 技术亮点说明
  - 开场白和结束语

### 2️⃣ **demo_test.py** ⭐ 可执行演示
- **路径:** `./demo_test.py`
- **大小:** 9.8K
- **功能:** 100%可运行的演示测试
- **运行:** `HEADLESS=true pytest demo_test.py -v -s`
- **结果:** 4/4 tests PASSED (34秒)

### 3️⃣ **interview_demo_report.html** ⭐ 测试报告
- **路径:** `./reports/interview_demo_report.html`
- **大小:** 138K
- **打开:** `firefox reports/interview_demo_report.html`
- **内容:** 完整的HTML测试报告（带截图）

### 4️⃣ **DESIGN_SPECIFICATION.md** ⭐ 设计文档
- **路径:** `./DESIGN_SPECIFICATION.md`
- **大小:** 45.6K (1,200+行)
- **内容:** 完整的架构设计文档
  - 系统架构图
  - 设计模式说明
  - 数据流图
  - 技术栈详解

### 5️⃣ **demo_screenshot.png** ⭐ 截图示例
- **路径:** `./screenshots/demo_screenshot.png`
- **大小:** 49K
- **打开:** `eog screenshots/demo_screenshot.png`
- **说明:** 自动生成的测试截图示例

---

## 📚 其他重要文档

### RUN_DEMO.md
- **路径:** `./RUN_DEMO.md`
- **内容:** 快速运行指南、演示话术、检查清单

### DEMO_SUMMARY.txt
- **路径:** `./DEMO_SUMMARY.txt`
- **内容:** 快速参考卡（打印版）

### README.md
- **路径:** `./README.md`
- **内容:** 项目完整README（15.8K）

### IMPLEMENTATION_SUMMARY.md
- **路径:** `./IMPLEMENTATION_SUMMARY.md`
- **内容:** Phase 1实现总结

### PROJECT_STATS.md
- **路径:** `./PROJECT_STATS.md`
- **内容:** 项目统计数据

---

## 💻 核心代码文件

### Page Objects (页面对象)
```
./pages/
├── base_page.py           (500行) - BasePage基类
├── login_page.py          (330行) - LoginPage
└── system_update_page.py  (424行) - SystemUpdatePage
```

### Tests (测试文件)
```
./tests/
├── conftest.py                        (500行) - Pytest fixtures
└── test_system_updates_enterprise.py  - 生产测试用例（3个）
```

### Helpers (辅助工具)
```
./helpers/
├── logger.py        - 日志系统
└── debug_helper.py  - Debug工具（自动截图）
```

### Config (配置)
```
./config/
└── test_config.py   - 配置管理
```

---

## 📊 测试报告 & 产物

### HTML报告（3个）
```
./reports/
├── interview_demo_report.html  (138K) ⭐ 最新！
├── demo_report.html            (53K)
└── report.html                 (62K)
```

### 截图（7个）
```
./screenshots/
├── demo_screenshot.png  (49K) ⭐ 最新！
└── test_validate_*.png  (27K x 6)
```

### 日志文件
```
./logs/
├── test_20260211.log    (22K) - 最新测试日志
└── pytest.log           (1.5K)
```

---

## 🚀 快速访问命令

### 查看文档
```bash
# 面试指南（必读！）
cat INTERVIEW_DEMO.md | less

# 运行指南
cat RUN_DEMO.md | less

# 快速参考
cat DEMO_SUMMARY.txt

# 设计文档
cat DESIGN_SPECIFICATION.md | less
```

### 运行测试
```bash
# 运行演示测试（最简单）
HEADLESS=true pytest demo_test.py -v -s

# 生成HTML报告
HEADLESS=true pytest demo_test.py -v --html=reports/demo.html
```

### 打开报告/截图
```bash
# 打开HTML报告
firefox reports/interview_demo_report.html &

# 查看截图
eog screenshots/demo_screenshot.png &
```

### 查看代码
```bash
# 查看核心代码
cat pages/base_page.py | less
cat tests/conftest.py | less
cat demo_test.py | less
```

---

## 🎤 面试展示顺序

### 方案A：代码优先（如果时间充足）
1. 打开 `INTERVIEW_DEMO.md` 作为参考
2. 展示 `DESIGN_SPECIFICATION.md` (架构能力)
3. 展示 `pages/base_page.py` (代码质量)
4. 运行 `demo_test.py` (证明可执行)
5. 打开 `interview_demo_report.html` (测试报告)

### 方案B：演示优先（如果时间紧张）
1. 直接运行 `demo_test.py` (30秒)
2. 边运行边讲解框架特点
3. 打开 `interview_demo_report.html`
4. 如有兴趣，展示 `DESIGN_SPECIFICATION.md`
5. 回答问题时参考 `INTERVIEW_DEMO.md`

---

## 📍 完整路径

**项目根目录:**
```
/home/michael/repos/michael-zhou-qa-portfolio/selenium-tests
```

**GitHub仓库:**
```
https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/tree/refactor/standardized-structure/selenium-tests
```

**绝对路径示例:**
```bash
# 演示测试
/home/michael/repos/michael-zhou-qa-portfolio/selenium-tests/demo_test.py

# 面试指南
/home/michael/repos/michael-zhou-qa-portfolio/selenium-tests/INTERVIEW_DEMO.md

# HTML报告
/home/michael/repos/michael-zhou-qa-portfolio/selenium-tests/reports/interview_demo_report.html
```

---

## ✅ 面试前检查

- [ ] 进入目录: `cd /home/michael/repos/michael-zhou-qa-portfolio/selenium-tests`
- [ ] 读一遍: `cat INTERVIEW_DEMO.md | less`
- [ ] 运行一次: `HEADLESS=true pytest demo_test.py -v`
- [ ] 打开报告: `firefox reports/interview_demo_report.html &`
- [ ] 准备好终端（当前目录）
- [ ] 准备好编辑器（打开关键文件）

---

**🎯 你现在知道所有文件的位置了！Good luck! 🚀**
