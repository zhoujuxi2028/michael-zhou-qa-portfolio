# IVI Software Integration & Continuous Validation Lab

车载信息娱乐系统软件集成与持续验证实验室。项目以公开、可复现的 simulation/lab 场景展示软件包集成、虚拟目标部署、自动回归和质量门禁；不代表真实车厂、实车或量产 ECU 经验。

> **状态：需求与设计阶段，尚未实现。** 目标来源：[Issue #837](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/837)。

## 目标链路

```text
模拟 合成 IVI/Cluster 包构建 → 校验与部署 → 虚拟设备/台架模拟目标
        → smoke / integration / regression → 日志与报告 → 质量门禁
```

部署失败时，实验室应记录故障证据并模拟回滚；缺陷修复后将场景转成回归用例。

## 测试分层与指标

- **Smoke：** 验证目标基本可用和关键健康检查。
- **Integration：** 验证包构建、部署、目标执行及证据链路。
- **Regression：** 执行缺陷修复后登记的回归用例。
- **指标：** 串行/并行回归耗时、重复运行的 flaky rate、报告生成成功率、故障构建识别率；结果需带样本数和运行配置。

## 设计交付物

- [编号需求](docs/REQUIREMENTS.md)
- [可行性评估](docs/FEASIBILITY.md)
- [架构设计](docs/ARCHITECTURE.md)
- [测试策略](docs/qa/test-plan.md)
- [风险清单](docs/project-management/risks.md)
- [分阶段实施计划](docs/project-management/implementation-plan.md)

## 预期使用方式

实现阶段目标为本地 `make ci` 一键验证，Docker 提供一致的可选运行环境。具体命令、依赖版本和 CI 工作流将在设计评审通过后随实现确定；当前版本不提供可运行实现。

## 范围边界

- 所有包、设备、刷写和台架均为模拟对象，不连接真实 ECU、车辆或厂商系统。
- 重点是集成验证和可追溯证据，不实现真实固件制作、硬件刷写或安全认证。
