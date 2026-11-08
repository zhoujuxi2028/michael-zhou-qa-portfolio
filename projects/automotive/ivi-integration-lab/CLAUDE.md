# ivi-integration-lab — CLAUDE.md

## 项目概述

AutoSoft IVI 集成验证实验室。模拟车载 IVI/Cluster 软件包集成测试流程，Python + pytest 分层测试（smoke / integration / regression）+ GitHub Actions CI。

## 快速启动

```bash
source venv/bin/activate
cd ivi-integration-lab
pip install -r requirements.txt

make ci                            # 一键运行全套
pytest tests/ -v -m smoke         # 仅 smoke
pytest tests/ -v -m integration   # 仅集成
pytest tests/ -v -m regression    # 仅回归
pytest tests/ -v --cov=src --cov-report=term-missing  # 覆盖率
make report                        # 生成 HTML 报告
```

## 需求 ID

- Portfolio: PREQ-020 / Issue #837
- 项目: IVI-01 ~ IVI-12（见 `docs/project-management/requirements.md`）

## 关键模块（Stage 2 设计后补充）

| 模块 | 说明 |
|------|------|
| `src/package_registry.py` | ECU image 注册与管理 |
| `src/virtual_device.py` | 虚拟 ECU 设备状态机 |
| `src/flasher.py` | ECU flashing 流程模拟 |
| `src/logger.py` | 日志收集与分析 |
| `tests/conftest.py` | pytest fixtures |

## Lint / 格式化

```bash
black --check src/ tests/
isort --check-only src/ tests/
flake8 src/ tests/ --max-line-length=120 --extend-ignore=E203
```
