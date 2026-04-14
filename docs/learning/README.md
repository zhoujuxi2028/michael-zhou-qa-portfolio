# GitHub Copilot CLI 深度学习路径

🚀 **一套系统化的 Copilot CLI 学习知识库**，专为 QA 工程师和开发者设计。

## 📖 学习计划概览

| 方面 | 说明 |
|------|------|
| **目标** | 掌握 Copilot CLI 的进阶使用技能，将其集成到日常 QA 工作流 |
| **周期** | 6 个月 (Week 1 - Week 12+) |
| **模块数** | 15 个核心学习模块 |
| **方向** | 30% 理论 + 70% 实战 |
| **范围** | 聚焦 Copilot CLI 特有特性（不含 IDE 插件） |

---

## 📚 学习路线图

### Phase 1: 核心基础 (Week 1-2)
建立 Copilot CLI 的基础认知和操作能力。

- **M1**: [Copilot CLI 基础](./modules/phase1/M1-copilot-cli-basics.md)
  - 安装、认证、基础命令速查
  - CLI vs IDE 插件的核心差异
  
- **M2**: [提示工程基础](./modules/phase1/M2-prompting-fundamentals.md)
  - 指令格式、上下文提供方式
  - 常见反模式 vs 最佳实践
  
- **M3**: [Copilot CLI 生态初探](./modules/phase1/M3-cli-ecosystem.md)
  - Git 集成特性
  - Shell 命令和文件操作

### Phase 2: QA 工作流优化 (Week 3-4)
将 Copilot 应用到测试、文档、审查工作中。

- **M4**: [测试代码生成最佳实践](./modules/phase2/M4-test-generation.md)
  - Pytest / Jest / Cypress 测试快速生成
  - 测试覆盖率提升
  
- **M5**: [文档和注释生成工作流](./modules/phase2/M5-doc-generation.md)
  - Docstring 和 API 文档自动化
  - 测试用例文档补全
  
- **M6**: [代码审查加速](./modules/phase2/M6-code-review-workflow.md)
  - 审查建议自动生成
  - Git Workflow 集成

### Phase 3: 高阶提示工程 (Week 5-6)
掌握高级技巧，提升建议质量。

- **M7**: [上下文管理与多文件交互](./modules/phase3/M7-context-management.md)
  - 文件引用机制深度理解
  - 跨文件推理优化
  
- **M8**: [自定义工作流与脚本集成](./modules/phase3/M8-workflow-integration.md)
  - 编写辅助脚本
  - CI/CD 系统集成
  
- **M9**: [调试与故障排查](./modules/phase3/M9-debugging.md)
  - 识别和改进低质建议
  - 提示优化的迭代方法

### Phase 4: 项目集成案例 (Week 7-8)
在真实项目中应用所学技能。

- **M10**: [API 测试项目集成](./modules/phase4/M10-api-testing-integration.md)
  - Newman / Postman 脚本自动化
  - 案例：`api-testing-demo` 项目优化
  
- **M11**: [E2E 测试项目集成](./modules/phase4/M11-e2e-testing-integration.md)
  - Cypress / Playwright 测试快速补全
  - 案例：`playwright-demo` 或 `iwsva-cypress-e2e` 优化
  
- **M12**: [性能/稳定性测试集成](./modules/phase4/M12-perf-testing-integration.md)
  - k6 / JMeter 脚本生成
  - 案例：`performance-testing-platform` 优化

### Phase 5: 进阶与扩展 (Week 9-12)
探索前沿特性并总结最佳实践。

- **M13**: [Copilot Workspace 探索](./modules/phase5/M13-copilot-workspace.md)
  - Workspace 协作特性
  - Git 深度集成
  
- **M14**: [团队工作流标准化](./modules/phase5/M14-team-standards.md)
  - 内部最佳实践汇总
  - 快速参考指南编写
  
- **M15**: [个人知识库总结与迭代](./modules/phase5/M15-knowledge-summary.md)
  - CLI vs IDE 对比总结
  - 长期使用反馈和改进方向

---

## 🎯 每个模块的结构

每个学习模块遵循统一格式，确保可操作性和一致性：

```
核心概念 (理论 ~ 30-40%)
├─ 2-3 个关键概念简明解释
├─ 信息图或对比表
└─ 原理剖析（如有必要）

实战应用 (70% 以上)
├─ 场景 1: 具体用例
│  ├─ 问题描述
│  ├─ Copilot CLI 解决方案（代码示例）
│  ├─ 结果与验证
│  └─ 常见陷阱与对策
├─ 场景 2: 另一个用例
└─ 场景 3: 可选

最佳实践速查表
├─ 常用命令总结
├─ 参数快速参考
└─ 性能优化建议

与其他模块的关系
├─ 前置模块
├─ 相关模块
└─ 后续模块
```

详见 [模板文件](./template.md)。

---

## 📋 使用指南

### 按顺序学习
从 **M1 开始**，按阶段顺序推进。每个模块建立在前置模块的基础上。

### 边学边练
每个实战场景都可以**立即执行**。使用你已有的 QA 项目或创建临时项目测试。

### 日常参考
完成学习后，**速查表** 部分是你日常工作的快速手册。

### 定期迭代
根据实际应用经验更新模块内容。记录你遇到的问题和解决方案。

---

## ✅ 质量标准

我们承诺每个模块符合以下标准：

- ✅ **准确性**：所有代码示例都经过 Copilot CLI 验证且可实际运行
- ✅ **可操作性**：每个实战案例包含完整的可复现步骤
- ✅ **一致性**：所有模块遵循统一的结构、术语和格式
- ✅ **实用性**：每个技巧都直接应用于 QA 工作场景

---

## 🗂️ 项目结构

```
docs/learning/
├── README.md                    ← 你在这里
├── INDEX.md                     ← 导航指南
├── template.md                  ← 每个模块的标准模板
│
├── 📁 modules/                  ← 学习模块（按阶段分类）
│  ├── phase1/
│  │  ├── M1-copilot-cli-basics.md
│  │  ├── M2-prompting-fundamentals.md
│  │  └── M3-cli-ecosystem.md
│  ├── phase2/
│  │  ├── M4-test-generation.md
│  │  ├── M5-doc-generation.md
│  │  └── M6-code-review-workflow.md
│  ├── phase3/
│  │  ├── M7-context-management.md
│  │  ├── M8-workflow-integration.md
│  │  └── M9-debugging.md
│  ├── phase4/
│  │  ├── M10-api-testing-integration.md
│  │  ├── M11-e2e-testing-integration.md
│  │  └── M12-perf-testing-integration.md
│  └── phase5/
│     ├── M13-copilot-workspace.md
│     ├── M14-team-standards.md
│     └── M15-knowledge-summary.md
│
├── 📁 docs/                     ← 支持文档（报告、清单等）
│  ├── phase1/
│  │  ├── PHASE1-COMPLETION-REPORT.md
│  │  ├── PHASE1-FINAL-SUMMARY.md
│  │  ├── PHASE1-REVIEW-REQUEST.md
│  │  ├── PHASE1-REVIEW-FEEDBACK-LOG.md
│  │  └── PRE-REVIEW-CHECKLIST.md
│  ├── phase2/ ... (待创建)
│  ├── phase3/ ... (待创建)
│  ├── phase4/ ... (待创建)
│  └── phase5/ ... (待创建)
│
└── 📁 examples/                 ← 可选：代码示例和脚本
   ├── phase1/
   ├── phase2/
   ├── phase3/
   ├── phase4/
   └── phase5/
```

---

## 🚀 快速开始

1. **选择学习模块**：从 [M1 基础](./M1-copilot-cli-basics.md) 开始
2. **阅读核心概念**：理解 ~30-40% 的理论背景
3. **动手实践**：选择一个实战场景，按步骤执行
4. **保存笔记**：在模块的"反思与迭代"部分记录你的学习心得
5. **进展到下一个**：完成后移进 Phase 2 的模块

---

## 💡 学习建议

- **持之以恒**：每周投入 2-3 小时，比一次性学习更有效
- **项目驱动**：优先选择能解决你当前 QA 工作问题的模块
- **社区反馈**：如果发现错误或有改进建议，欢迎提 Issue
- **知识共享**：学完后，考虑分享给团队成员或社区

---

## 📞 反馈与更新

- **内容有误？** 提出 Issue
- **想增加新模块？** 讨论和建议欢迎
- **长期使用反馈？** 帮助我们迭代和改进

---

## 📄 许可证

本学习路径为 Michael Zhou QA 作品集的一部分，遵循项目许可证。

---

**祝学习愉快！** 🎓

*最后更新：2026-04-10*
