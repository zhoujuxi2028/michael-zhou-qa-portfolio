# IVI Software Integration & Continuous Validation Lab

**车载信息娱乐系统软件集成与持续验证实验室**

> 说明：这是公开的 simulation/lab project，用于展示学习能力和验证工程方法，不代表真实车厂、实车或量产 ECU 经验。

---

## 项目概述

模拟 Tier-1 供应商的 IVI/Cluster 软件包集成验证流程：从软件包入库、虚拟设备部署、ECU flashing，到分层测试执行、日志收集和 CI 质量门禁。

**技术栈**: Python · pytest · pytest-html · pytest-xdist · GitHub Actions

---

## 测试分层

| 层级 | 用例数 | 说明 |
|------|-------|------|
| Smoke | ≥5 | 设备上电自检、基础功能响应，< 30s |
| Integration | ≥8 | IVI ↔ Cluster 数据同步、跨 ECU 消息 |
| Regression | ≥6 | 历史缺陷回归，支持 flaky 检测 |

---

## 快速启动

```bash
# （开发完成后补充）
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
make ci
```

---

## 目录结构

```
ivi-integration-lab/
├── src/                    # 核心模块（PackageRegistry, VirtualDevice, Flasher）
├── tests/
│   ├── unit/               # 单元测试
│   └── integration/        # 集成测试
├── scripts/                # 辅助脚本（create_regression.py 等）
├── logs/                   # 测试执行日志（.gitignore）
├── reports/                # HTML 测试报告（.gitignore）
└── docs/
    ├── architecture/       # 架构设计
    ├── project-management/ # 需求、风险、WBS
    └── qa/                 # 测试计划、用例
```

---

## 相关链接

- [需求文档](docs/project-management/requirements.md)（PREQ-020 / Issue #837）
- [架构设计](docs/architecture/architecture.md)（Stage 2 产出）
- [测试计划](docs/qa/test-plan.md)（Stage 2 产出）
