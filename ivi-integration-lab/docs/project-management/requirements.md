# ivi-integration-lab 需求文档

**Portfolio 需求 ID**: PREQ-020  
**GitHub Issue**: [#837](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/837)  
**状态**: Stage 1 — Requirements  
**场景**: AutoSoft IVI（车载信息娱乐系统软件集成验证平台）

---

## 业务背景

AutoSoft 是一家 Tier-1 供应商，负责车载 IVI（In-Vehicle Infotainment）和 Cluster（仪表盘）软件包的集成验证。本项目模拟 IVI 软件包从构建产物入库、虚拟设备部署、分层测试执行，到日志分析、质量门禁和 CI 自动化的完整闭环，演示汽车软件测试工程能力。

---

## 用户故事 / Use Cases

| 角色 | 故事 | 验收标准 |
|------|------|---------|
| 集成工程师 | 我需要对每个 IVI 软件包版本自动执行 smoke / regression 测试 | `make ci` 一键运行，报告包含版本信息 |
| QA 负责人 | 我需要查看测试层级覆盖率和失败分类 | HTML/pytest 报告含 smoke / integration / regression 分层结果 |
| CI 系统 | 软件包构建失败或测试失败需阻断 pipeline | GitHub Actions 在失败时返回非 0 退出码 |
| 开发工程师 | 需要在 ECU flashing 失败时自动回滚并记录日志 | flashing 失败时触发回滚逻辑，日志含失败原因 |

---

## 需求清单（IVI-01 ~ IVI-12）

| ID | 需求描述 | 类型 | 优先级 | 验收标准 | 状态 |
|----|---------|------|--------|---------|------|
| IVI-01 | 软件包（ECU image）管理模块：模拟 IVI/Cluster image 版本、元数据（版本号、目标 ECU、checksum） | FR | P1 | `PackageRegistry` 可注册/查询/删除 image，单元测试覆盖 CRUD | Proposed |
| IVI-02 | 虚拟设备管理：模拟 ECU target（IVI / Cluster / ADAS），支持 start / stop / status 状态机 | FR | P1 | `VirtualDevice` 状态转换有测试，非法转换抛异常 | Proposed |
| IVI-03 | ECU flashing 流程模拟：upload → verify checksum → flash → confirm，含失败处理与回滚 | FR | P1 | 正常路径和失败路径（checksum 不匹配、flash timeout）各有集成测试 | Proposed |
| IVI-04 | Smoke 测试套件：设备上电自检（power-on self-test）、基础功能响应（屏幕、音频）、CAN 总线连通性验证（python-can Virtual Bus 收发帧） | FR | P1 | ≥5 条 smoke 用例，执行 < 30s，含 CAN 帧收发断言，CI 必选 | Proposed |
| IVI-05 | Integration 测试套件：IVI ↔ Cluster 数据同步（python-can + cantools DBC 信号编解码）、媒体状态信号、导航指令、OTA 触发；验证信号值和 arbitration ID 正确 | FR | P1 | ≥8 条集成用例，使用 DBC 文件定义信号，断言解码后字段值与发送值一致 | Proposed |
| IVI-06 | Regression 测试套件：基于历史已知缺陷的回归用例，含 flaky test 检测标记 | FR | P2 | ≥6 条回归用例，含 `@pytest.mark.regression` 标记，可独立运行 | Proposed |
| IVI-07 | 日志收集与分析：测试执行日志、设备日志分级（ERROR/WARN/INFO），失败时自动提取 ERROR 行 | FR | P2 | 失败测试自动输出 ERROR 摘要，日志保存到 `logs/` | Proposed |
| IVI-08 | 测试报告生成：pytest-html 报告 + Allure（可选），包含测试层级、版本信息、执行时间 | FR | P2 | `make report` 生成 HTML 报告到 `reports/` | Proposed |
| IVI-09 | 质量门禁：smoke 100% pass 才继续；regression flaky rate ≤ 10%；覆盖率 ≥ 80% | NFR | P1 | CI 门禁检查，不达标时 fail fast | Proposed |
| IVI-10 | Defect-to-regression 闭环：新增缺陷自动生成对应回归用例骨架（工具脚本） | FR | P3 | `scripts/create_regression.py <defect-id>` 生成 test skeleton | Proposed |
| IVI-11 | 并行执行与耗时基线：pytest-xdist 并行跑 regression，对比 baseline 耗时，超时阈值告警 | NFR | P2 | 并行执行报告含 baseline 对比，超阈值打印 WARNING | Proposed |
| IVI-12 | CI workflow（GitHub Actions）：matrix 测试 Python 3.11/3.12，smoke → integration → regression 分层，Artifacts 上传报告 | NFR | P1 | GitHub Actions 绿灯，三层测试分步执行，报告 Artifacts 上传 | Proposed |

---

## Scope 边界

**In scope（本项目涵盖）：**
- 软件包/ECU image 管理（模拟，非真实硬件）
- 虚拟设备状态机模拟
- 分层测试（smoke / integration / regression）
- CI 自动化和质量门禁
- 日志收集和 HTML 测试报告

**Out of scope（不涵盖）：**
- 真实 ECU 硬件刷写
- 真实 CAN bus 物理层（总线仲裁、位时序、CRC 错误检测）
- SOME-IP 协议栈
- OTA 服务端（仅模拟触发信号）
- Allure 服务器部署（本地生成报告即可）

---

## 可行性评估

| 维度 | 评估 | 结论 |
|------|------|------|
| Python 版本 | Python 3.14.3 ✅ | 满足 |
| pytest | pytest 9.0.3 ✅ | 满足 |
| Docker | Docker 29.9.2 ✅（OrbStack）| 满足（可选用于隔离） |
| 汽车协议栈 | 纯 Python 模拟，无需真实 CAN | 可行 |
| 本地复现 | 无硬件依赖，venv + pytest 即可 | 满足 |
| CI | GitHub Actions Python matrix | 满足 |

**结论：可行。全部依赖均可在本机和 CI 中满足，无硬件阻塞项。**

---

## 依赖清单

| 依赖 | 用途 | 安装方式 |
|------|------|---------|
| pytest | 测试框架 | pip |
| pytest-html | HTML 报告 | pip |
| pytest-xdist | 并行执行 | pip |
| pytest-cov | 覆盖率 | pip |
| python-can | CAN 总线模拟（Virtual Bus，跨平台） | pip |
| cantools | DBC 文件解析，CAN 信号编解码 | pip |
| black | 代码格式化 | pip |
| flake8 | Lint | pip |
| isort | import 排序 | pip |
