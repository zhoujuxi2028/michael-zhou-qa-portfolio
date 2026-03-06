# K8S Auto Testing Platform - 面试叙述 (STAR 格式)

**项目名称**: Kubernetes 自动化测试平台
**角色**: 独立开发者 / QA 工程师
**时间**: 2026 年 3 月 (2-3 天 MVP)

---

## STAR 故事

### Situation (情境)

在准备云平台/DevOps 相关职位面试时，我意识到需要一个能够展示以下技能的实战项目:

- Kubernetes 深度理解 (不仅是使用，还要测试)
- 自动化测试框架设计能力
- 混沌工程实践经验
- CI/CD 流程实现
- 监控和可观测性

市面上的 K8S 测试工具要么过于复杂 (需要大型集群)，要么过于简单 (只有 smoke test)。我需要一个能在本地 Docker Desktop 运行，但又能展示完整测试能力的项目。

---

### Task (任务)

构建一个完整的 Kubernetes 自动化测试平台，具备以下能力:

1. **HPA 测试**: 验证自动扩缩容功能
2. **混沌工程**: 测试系统在故障下的恢复能力
3. **完整报告**: 生成专业的测试报告
4. **CI/CD 集成**: GitHub Actions 自动化流程
5. **高代码质量**: 通过静态分析工具验证

**约束条件**:
- 时间: 2-3 天完成 MVP
- 环境: 本地 Docker Desktop K8S
- 语言: Python (pytest 框架)

---

### Action (行动)

#### 第一阶段: 环境与基础设施 (Day 1)

1. **设计测试应用**
   - 开发 FastAPI 应用，11 个端点
   - 支持 CPU/内存负载生成
   - 集成 Prometheus 指标

2. **编写 K8S 清单**
   - Deployment (2-10 replicas)
   - Service (ClusterIP + NodePort)
   - HPA (CPU 50%, Memory 70%)
   - ConfigMap 配置管理

3. **搭建测试框架**
   - pytest 作为测试框架
   - 使用 markers 分类测试
   - 设计 fixtures 共享资源

#### 第二阶段: 核心测试 (Day 1-2)

4. **Deployment 测试** (8 个用例)
   - 验证部署存在性
   - 检查副本数
   - 验证标签和资源配置
   - Pod 健康检查

5. **HPA 测试** (8 个用例)
   - HPA 存在性验证
   - 指标配置检查
   - 扩容触发测试
   - 缩容验证

6. **Service 测试** (8 个用例)
   - Service 类型验证
   - 端口配置检查
   - Endpoint 可达性
   - DNS 解析验证

#### 第三阶段: 混沌工程 (Day 2)

7. **Pod 混沌测试** (9 个用例)
   - Pod 删除恢复测试
   - 负载下随机 Kill
   - CPU/内存耗尽场景
   - 容器重启恢复
   - 多 Pod 故障
   - 滚动混沌测试

8. **网络混沌测试** (4 个用例)
   - 网络延迟测量
   - 网络韧性测试
   - Pod 周转下的延迟
   - NetworkPolicy 验证

9. **Chaos Mesh 集成**
   - 编写 8 个 CRD 配置文件
   - 支持 Pod Chaos、Network Chaos、Stress Chaos
   - 编排 HPA 混沌工作流

#### 第四阶段: 完善与文档 (Day 3)

10. **报告与监控**
    - pytest-html 报告
    - JSON/JUnit XML 格式
    - Prometheus 指标收集器
    - Grafana 仪表板配置

11. **CI/CD 配置**
    - GitHub Actions 工作流
    - PR 检查自动化
    - 代码质量门禁 (flake8, pylint)

12. **文档编写**
    - WBS 项目分解
    - 架构设计文档
    - 测试用例目录
    - 故障排查记录

---

### Result (结果)

#### 量化成果

| 指标 | 数值 |
|------|------|
| 测试用例数 | 37 |
| 通过率 | 100% (27 passing, 10 skipped, 0 failed) |
| 代码质量 (pylint) | 9.68/10 |
| Flake8 错误 | 0 |
| 混沌场景 | 12 种 |
| Chaos Mesh CRD | 8 个 |
| 文档页数 | 10+ |
| 完成度 | 95% |

#### 技术成果

1. **测试框架**
   - 完整的 pytest 测试套件
   - 自定义 fixtures 和 helpers
   - 支持 markers 分类运行

2. **工具开发**
   - `ChaosTester`: 852 行，15+ 方法
   - `MetricsCollector`: Prometheus 集成
   - `ReportGenerator`: 多格式报告

3. **问题解决**
   - 解决 6 个关键问题
   - 记录排查过程和解决方案
   - 编写 FAQ 文档

#### 学习收获

1. **深入理解 HPA**
   - 扩缩容触发机制
   - Metrics Server 工作原理
   - 稳定窗口和冷却期

2. **混沌工程实践**
   - Chaos Mesh 使用
   - 故障注入策略
   - 恢复验证方法

3. **测试设计**
   - 异步等待策略
   - 测试隔离和幂等性
   - 报告生成最佳实践

---

## 面试常见问题

### Q1: 为什么选择 pytest 而不是其他框架？

**答**: pytest 是 Python 生态中最灵活的测试框架:
- Fixtures 机制简化资源管理
- Markers 支持测试分类
- 丰富的插件生态 (pytest-html, pytest-cov)
- 支持参数化测试
- 与 CI/CD 无缝集成

### Q2: HPA 测试中遇到的最大挑战是什么？

**答**: 时序问题。HPA 不是实时响应的:
- 指标收集有延迟 (15-30 秒)
- 扩容决策有稳定窗口 (默认 3 分钟)
- 测试需要动态等待而非固定 sleep

**解决方案**: 实现 `wait_helper` 函数，轮询检查条件，带超时机制。

### Q3: 混沌工程如何保证不影响生产？

**答**: 多层保护:
1. **命名空间隔离**: 测试在独立 namespace
2. **资源标签**: 只影响特定标签的资源
3. **持续时间限制**: 混沌实验有时间限制
4. **自动恢复验证**: 确认系统恢复到正常状态

### Q4: 如何处理测试的不确定性？

**答**: 几个策略:
1. **幂等性**: 每个测试独立，可重复运行
2. **重试机制**: pytest-rerunfailures 支持失败重试
3. **跳过策略**: 环境不满足时跳过 (而非失败)
4. **详细日志**: 记录中间状态便于排查

### Q5: 项目中你最自豪的部分是什么？

**答**: `ChaosTester` 工具类。它:
- 封装了 15+ 种混沌操作
- 支持 K8S API 和 Chaos Mesh 两种模式
- 包含完整的恢复验证
- 可独立使用或集成到 pytest

### Q6: 如果有更多时间，你会添加什么？

**答**:
1. **Locust 性能测试**: 添加负载测试基准
2. **多集群支持**: 测试跨集群场景
3. **更多监控**: Grafana 告警规则
4. **Web UI**: 测试执行和报告查看界面

---

## 项目亮点提炼

### 一句话总结

> 在 2-3 天内独立构建了包含 37 个测试用例、12 种混沌场景的 Kubernetes 自动化测试平台，代码质量达到 pylint 9.68/10。

### 三个关键词

1. **Kubernetes 测试**: HPA、Deployment、Service 全覆盖
2. **混沌工程**: Chaos Mesh 集成，Pod/Network 故障注入
3. **工程质量**: 完整 CI/CD、文档、代码规范

### 适用职位

- QA Engineer (Cloud/Platform)
- DevOps Engineer
- Site Reliability Engineer (SRE)
- Platform Engineer
- Test Automation Engineer

---

## 相关链接

- [GitHub 仓库](https://github.com/michael-zhou-qa-portfolio/k8s-auto-testing-platform)
- [Demo 指南](../scripts/DEMO-GUIDE.md)
- [技术 Q&A](TECHNICAL-QA.md)
- [架构文档](ARCHITECTURE.md)
