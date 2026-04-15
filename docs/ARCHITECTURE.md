# 项目架构与职责分工

> **本文是文档系统的架构规范**。创建新文档或修改现有文档前，必须检查本表以确认职责分工，避免重复和冗余。

## 职责分工矩阵

| 目录 | 职责 | 权威来源 | 说明 |
|------|------|--------|------|
| `docs/` | 项目级规范、架构、流程 | `ARCHITECTURE.md` (本文) | 规范不变 |
| `docs/dev-process-checklist.md` | 5 阶段开发流程检查清单 | 官方 | 阶段规则、交付物 |
| `docs/superpowers/` | 实施计划、技术方案 | 计划文件 | 按时间戳组织 |
| `docs/guides/` | 操作指南、最佳实践 | 各文件 | 学习资源、故障排查 |
| `docs/reports/` | 项目总结、事后分析 | 各文件 | 学习记录、改进建议 |
| 各项目 `CLAUDE.md` | 项目级配置、快速命令 | 各项目维护 | 项目独立 |
| 各项目 `README.md` | 项目级文档入口 | 各项目维护 | 优先于其他 |
| `docs/copilot-cli-journey/` | GitHub Copilot 学习中心 | 中心权威 | 集中记录学习进度 |
| `docs/copilot-cli-journey/PHASE*-COMPLETION-REPORT.md` | 学习阶段完成报告 | 官方记录 | 唯一的学习进度来源 |
| `docs/copilot-cli-journey/LEARNING-BRANCH-GUIDE.md` | 分支使用指南 | 官方 | 指导实验工作流 |
| `feature/copilot-learning` 分支 | 代码实验示例 | 链接指向主分支报告 | **仅链接，不复制** |
| `feature/copilot-learning/experiments/README.md` | 实验指南 | 链接到 copilot-cli-journey | 指向权威来源 |

## 禁止的模式

### ❌ 不允许

1. **同一信息在两处维护**
   - ✗ 在 `docs/A.md` 和 `docs/B.md` 中重复记录相同内容
   - ✓ 选择一个权威来源，其他地方链接

2. **分支中创建独立文档**
   - ✗ `feature/X/docs/progress.md` 独立维护进度
   - ✓ 在 `docs/` 中维护，分支中链接

3. **多个目录为同一类型的文档**
   - ✗ 学习报告同时在 `docs/` 和 `docs/reports/` 中
   - ✓ 确定唯一职责后，在对应目录中维护

4. **隐含的职责重叠**
   - ✗ `docs/guides/X.md` 和 `docs/how-to/X.md` 记录相同内容
   - ✓ 统一为一个位置，建立清晰的链接

### ✅ 正确的做法

1. **信息来源唯一化**
   ```
   权威来源（维护）
       ↓
       ├─ 链接源 1（参考）
       └─ 链接源 2（参考）
   ```

2. **分支规范**
   ```
   feature/X
   ├─ src/
   │  └─ 新代码
   └─ 链接到 docs/
      └─ 相关文档在主分支，不在此分支
   ```

3. **文档链接模板**
   ```markdown
   详见 [中心权威来源](../../docs/center-file.md)
   不在此处重复信息。
   ```

## 创建新文档的检查清单

创建任何新文档前，必须完成以下检查：

- [ ] **Q1: 现有系统中是否已有类似文件？**
  - 搜索: `grep -r "keyword" docs/`
  - 搜索: GitHub 搜索功能
  - 如果找到，转到 Q3

- [ ] **Q2: 新文档的唯一职责是什么？**
  - 能否用一句话说明职责？
  - 与其他文档有没有职责重叠？
  - 对标上表，确认职责分工是否清晰

- [ ] **Q3: 我是复制还是链接？**
  - 如果信息已在其他地方维护 → **链接**
  - 如果是新信息 → **创建新文件**
  - 如果两者都不是 → **先与 reviewer 讨论职责**

- [ ] **Q4: 有没有更新导航？**
  - 新文档是否添加到相关目录的 `README.md`？
  - 相关的权威来源是否需要链接更新？

- [ ] **Q5: 文件名是否符合约定？**
  - 按时间戳命名计划: `YYYY-MM-DD-<name>.md`
  - 按功能命名指南: `<topic>.md`
  - 按阶段命名报告: `PHASE<N>-<description>.md`

## 文件命名约定

```
计划文件:           YYYY-MM-DD-<feature-name>.md
完成报告:           PHASE<N>-COMPLETION-REPORT.md
学习记录:           <TOPIC>-LEARNING.md
指南文档:           <topic>-guide.md
检查清单:           <task>-checklist.md
故障排查:           troubleshooting-<issue>.md
事后分析:           postmortem-<YYYY-QN>.md
```

## 审查流程 (在 PR 中)

PR reviewer 必须检查：

- [ ] 是否添加了新的 `.md` 文档？
- [ ] 是否检查了职责分工（对标 `ARCHITECTURE.md`）？
- [ ] 是否避免了重复维护？
- [ ] 是否更新了相关导航？
- [ ] 是否按照命名约定命名？

如果发现职责冲突，在 merge 前必须解决。

## 更新本文的触发条件

以下情况下必须更新 `ARCHITECTURE.md`：

1. 新增项目或主要模块
2. 修改目录结构或职责分工
3. 添加新的命名约定
4. 发现新的模式需要禁止

更新后，通知团队并在下一个 PR 中验证。

---

**最后更新**: 2026-04-15
**维护人**: Copilot + Team
**权威性**: ✅ 架构规范，所有文档工作必须遵循
