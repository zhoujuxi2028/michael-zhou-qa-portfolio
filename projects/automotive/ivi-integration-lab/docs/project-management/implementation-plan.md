# Implementation Plan — ivi-integration-lab Stage 2

**Issue**: [#837](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/837)  
**Branch**: `feature/ivi-stage2-design-837`  
**Date**: 2026-11-05  
**PREQ**: PREQ-020

---

## Prerequisites

| 工具 | 版本要求 | 验证命令 |
|------|---------|---------|
| Python | ≥ 3.11 | `python3 --version` |
| pip | 任意 | `pip --version` |
| pytest | ≥ 7.0 | `pytest --version` |
| python-can | ≥ 4.0 | `pip show python-can` |
| cantools | ≥ 39.0 | `pip show cantools` |

---

## 目录结构

```
ivi-integration-lab/
├── src/
│   ├── __init__.py
│   ├── package_registry.py     # IVI-01：ECU image 注册管理
│   ├── virtual_device.py       # IVI-02：虚拟 ECU 状态机
│   ├── flasher.py              # IVI-03：ECU flashing 流程
│   ├── can_bus.py              # IVI-04/05：CAN 总线模拟
│   ├── logger.py               # IVI-07：日志收集与分析
│   ├── quality_gate.py         # IVI-09：质量门禁检查
│   └── data/
│       └── ivi_cluster.dbc     # CAN 信号定义文件
├── tests/
│   ├── __init__.py
│   ├── conftest.py             # 共享 fixtures
│   ├── unit/
│   │   ├── __init__.py
│   │   ├── test_package_registry.py   # IVI-01
│   │   ├── test_virtual_device.py     # IVI-02
│   │   ├── test_flasher.py            # IVI-03
│   │   └── test_quality_gate.py       # IVI-09
│   └── integration/
│       ├── __init__.py
│       ├── test_smoke.py              # IVI-04
│       ├── test_integration.py        # IVI-05（CAN 信号）
│       └── test_regression.py         # IVI-06
├── scripts/
│   └── create_regression.py    # IVI-10（P3，后续迭代）
├── logs/                       # 运行时产出（.gitignore）
├── reports/                    # HTML 报告（.gitignore）
├── requirements.txt
├── pytest.ini
├── Makefile
├── .gitignore
└── .python-version             # 锁定 Python 3.11
```

---

## 模块设计

### 1. PackageRegistry (`src/package_registry.py`)

```python
@dataclass
class ECUImage:
    image_id: str
    version: str
    target_ecu: str   # "IVI" | "Cluster" | "ADAS"
    checksum: str
    size_mb: float

class PackageRegistry:
    def register(self, image: ECUImage) -> None: ...
    def get(self, image_id: str) -> ECUImage: ...
    def list_by_ecu(self, target_ecu: str) -> list[ECUImage]: ...
    def delete(self, image_id: str) -> None: ...
    def verify_checksum(self, image_id: str, checksum: str) -> bool: ...
```

### 2. VirtualDevice (`src/virtual_device.py`)

```
状态机：IDLE → FLASHING → READY → RUNNING → ERROR
                ↑___________________________|（ERROR 可重置回 IDLE）
```

```python
class DeviceState(Enum):
    IDLE = "idle"
    FLASHING = "flashing"
    READY = "ready"
    RUNNING = "running"
    ERROR = "error"

class VirtualDevice:
    def __init__(self, device_id: str, ecu_type: str): ...
    def start_flash(self) -> None: ...       # IDLE → FLASHING
    def complete_flash(self) -> None: ...    # FLASHING → READY
    def start(self) -> None: ...             # READY → RUNNING
    def fail(self, reason: str) -> None: ... # any → ERROR
    def reset(self) -> None: ...             # ERROR → IDLE
```

### 3. Flasher (`src/flasher.py`)

```python
class FlashResult(Enum):
    SUCCESS = "success"
    CHECKSUM_MISMATCH = "checksum_mismatch"
    TIMEOUT = "timeout"
    DEVICE_ERROR = "device_error"

class Flasher:
    def flash(self, device: VirtualDevice, image: ECUImage,
              provided_checksum: str) -> FlashResult: ...
    # 流程：upload → verify_checksum → flash → confirm
    # 失败路径：checksum 不匹配 → rollback → device.fail()
    #           flash timeout → rollback → device.fail()
```

### 4. CANBusSimulator (`src/can_bus.py`)

```python
class CANBusSimulator:
    """python-can Virtual Bus + cantools DBC 信号编解码"""
    def __init__(self, dbc_path: str, channel: str = "test"): ...
    def send_signal(self, msg_name: str, signals: dict) -> None: ...
    def receive_signal(self, msg_name: str, timeout: float = 1.0) -> dict: ...
    def flush(self) -> None: ...
    def close(self) -> None: ...
```

**DBC 信号定义** (`src/data/ivi_cluster.dbc`)：

| Message | ID | 信号 | 范围 | 说明 |
|---------|-----|------|------|------|
| IVI_Status | 0x100 | MediaState (0-3), Volume (0-100) | IVI→Cluster | 媒体状态/音量 |
| IVI_Navigation | 0x101 | NavCommand (0-255) | IVI→Cluster | 导航指令 |
| IVI_OTA | 0x102 | OTATrigger (0-1) | IVI→Cluster | OTA 触发信号 |
| IVI_ContentSync | 0x103 | ContentId (0-65535), SyncEnable (0-1) | IVI→CoDriver | 副驾内容同步 |
| Cluster_Status | 0x200 | VehicleSpeed (0.0-300.0 km/h), GearPosition (0-8) | Cluster→IVI | 车速/挡位 |
| CoDriver_Playback | 0x300 | PlaybackState (0-2), CoVolume (0-100) | CoDriver→IVI | 副驾独立播放状态 |

### 5. Logger (`src/logger.py`)

```python
class TestLogger:
    def log(self, level: str, msg: str) -> None: ...
    def get_errors(self) -> list[str]: ...    # 提取 ERROR 行
    def save_to_file(self, path: str) -> None: ...
    def clear(self) -> None: ...
```

### 6. QualityGate (`src/quality_gate.py`)

```python
@dataclass
class GateResult:
    passed: bool
    reason: str

class QualityGate:
    def check_smoke_pass_rate(self, results: dict) -> GateResult: ...
    # smoke 100% pass 才继续
    def check_flaky_rate(self, results: dict) -> GateResult: ...
    # flaky rate ≤ 10%
    def check_coverage(self, coverage_pct: float) -> GateResult: ...
    # coverage ≥ 80%
```

---

## 任务拆分（TDD 顺序）

| Task | 需求 | 内容 | 预估 |
|------|------|------|------|
| T01 | 基础设施 | requirements.txt, pytest.ini, Makefile, .gitignore, .python-version | 30min |
| T02 | IVI-01 | PackageRegistry 单元测试 + 实现 (TDD) | 45min |
| T03 | IVI-02 | VirtualDevice 状态机测试 + 实现 (TDD) | 45min |
| T04 | IVI-03 | Flasher 流程测试 + 实现（含失败路径）(TDD) | 60min |
| T05 | IVI-04/05 | CANBusSimulator + DBC 文件测试 + 实现 (TDD) | 60min |
| T06 | IVI-04 | Smoke 测试套件（≥5 条，含 CAN 连通性） | 30min |
| T07 | IVI-05 | Integration 测试套件（≥8 条，CAN 信号编解码） | 45min |
| T08 | IVI-06 | Regression 测试套件（≥6 条，@regression 标记） | 30min |
| T09 | IVI-07 | TestLogger 测试 + 实现 (TDD) | 30min |
| T10 | IVI-09 | QualityGate 测试 + 实现 (TDD) | 30min |
| T11 | IVI-08 | pytest-html 报告 + Makefile targets | 20min |
| T12 | IVI-12 | GitHub Actions CI workflow | 30min |

> IVI-10（P3）、IVI-11（P2）延后到后续迭代，不阻塞本期 Stage 3-4。

---

## CI Workflow 设计

```yaml
# .github/workflows/ivi-integration-ci.yml
jobs:
  test:
    strategy:
      matrix:
        python-version: ["3.11", "3.12"]
    steps:
      - lint (black --check, isort --check, flake8)
      - unit-tests (pytest tests/unit/ -v --cov=src)
      - smoke (pytest tests/integration/ -m smoke -v)
      - integration (pytest tests/integration/ -m integration -v)
      - regression (pytest tests/integration/ -m regression -v)
      - upload-reports (HTML report artifact)
```

---

## PoC 验证计划

RISK-02（pytest-xdist 并行资源竞争）把握度约 60%，需 PoC：

```bash
# PoC：验证 Virtual Bus 在并行 worker 间是否有状态泄漏
pytest tests/unit/test_virtual_device.py -n 4 -v
# 预期：每个 test 独立 fixture，无竞争
```

PoC 在 T03 完成后（VirtualDevice 实现后）执行，结果记录到 risks.md。
