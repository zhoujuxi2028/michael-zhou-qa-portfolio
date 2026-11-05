# ivi-integration-lab 风险清单

**更新于**: Stage 1 — Requirements  
**Issue**: #837

---

## 活跃风险

| ID | 风险描述 | 类型 | 概率 | 影响 | 缓解措施 | 状态 |
|----|---------|------|------|------|---------|------|
| RISK-01 | python-can Virtual Bus 无法模拟总线仲裁和物理层时序，与真实 CAN 存在差距 | 技术 | 低 | 低 | README 和 Scope 文档中明确说明 simulation 边界，portfolio 定位是工程方法展示 | Open |
| RISK-02 | pytest-xdist 并行测试存在资源竞争，导致 flaky | 技术 | 中 | 中 | 每个测试用独立 fixture scope，避免共享可变状态 | Open |
| RISK-03 | Allure 本地安装依赖 Java，CI 中安装耗时增加 | 环境 | 低 | 低 | Allure 设为可选，CI 主路径用 pytest-html；本地按需安装 | Open |
| RISK-04 | 需求范围蔓延（IVI-10 / IVI-11 为 P3/P2，可能拖长开发周期） | 范围 | 中 | 中 | P1 需求先完成 Stage 3-4，P2/P3 可在后续 Issue 迭代 | Open |
| RISK-05 | Python 3.14 与某些依赖不兼容（pytest-html、python-can 等） | 依赖 | 低 | 高 | CI matrix 增加 Python 3.11/3.12，本地以 3.11 为主运行 | Open |
| RISK-06 | cantools DBC 解析依赖开源 DBC 文件质量，信号定义错误会导致测试误判 | 依赖 | 低 | 中 | 使用自定义最小 DBC（仅定义项目所需信号），纳入版本管理 | Open |

---

## 已解决风险

_（Stage 1 暂无）_

---

## 历史风险

_（Stage 1 暂无）_
