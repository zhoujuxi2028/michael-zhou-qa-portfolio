# ivi-integration-lab 架构文档

**项目**: ivi-integration-lab (PREQ-020)  
**场景**: AutoSoft IVI 软件集成与持续验证实验室  
**最近更新**: 2026-11-05（Stage 2 设计阶段）

---

## 1. 系统概览

```
┌──────────────────────────────────────────────────────────┐
│                    pytest test suites                     │
│                                                           │
│  tests/unit/                  tests/integration/         │
│  ├─ test_package_registry.py  ├─ test_smoke.py           │
│  ├─ test_virtual_device.py    ├─ test_integration.py     │
│  ├─ test_flasher.py           └─ test_regression.py      │
│  └─ test_quality_gate.py                                 │
└──────────────────────┬───────────────────────────────────┘
                       │ imports
                       ▼
┌──────────────────────────────────────────────────────────┐
│                    src/ 核心模块                          │
│                                                           │
│  PackageRegistry   VirtualDevice   Flasher               │
│  (IVI-01)          (IVI-02)        (IVI-03)               │
│       │                 │               │                 │
│       └────────────┬────┘               │                 │
│                    │                    │                 │
│              CANBusSimulator ◄──────────┘                │
│              (IVI-04/05)                                  │
│                    │                                      │
│              python-can Virtual Bus                       │
│              cantools DBC (ivi_cluster.dbc)               │
│                                                           │
│  TestLogger        QualityGate                           │
│  (IVI-07)          (IVI-09)                              │
└──────────────────────────────────────────────────────────┘
```

---

## 2. 模块职责

| 模块 | 文件 | 职责 |
|------|------|------|
| PackageRegistry | `src/package_registry.py` | ECU image 版本管理（注册/查询/删除/checksum 验证） |
| VirtualDevice | `src/virtual_device.py` | 虚拟 ECU 设备状态机（IDLE→FLASHING→READY→RUNNING→ERROR） |
| Flasher | `src/flasher.py` | ECU flashing 流程（upload→verify→flash→confirm），含失败回滚 |
| CANBusSimulator | `src/can_bus.py` | python-can Virtual Bus 封装，cantools DBC 信号编解码 |
| TestLogger | `src/logger.py` | 测试日志收集，ERROR 行提取，日志持久化 |
| QualityGate | `src/quality_gate.py` | 质量门禁（smoke 100%、flaky ≤ 10%、coverage ≥ 80%） |
| DBC 文件 | `src/data/ivi_cluster.dbc` | CAN 信号定义（IVI_Status / IVI_Navigation / IVI_OTA / IVI_ContentSync / Cluster_Status / CoDriver_Playback） |

---

## 3. CAN 总线模拟架构

```
              Virtual Bus（python-can interface='virtual'）
              channel 隔离：每个 test session 独立 channel
                           │
         ┌─────────────────┼──────────────────┐
         │                 │                  │
    IVI 节点          Cluster 节点       CoDriver 节点
  (Head unit)      (Instrument cluster) (副驾娱乐屏)
         │                 │                  │
         │─ IVI_Status ───▶│                  │  MediaState, Volume → Cluster
         │─ IVI_Navigation▶│                  │  NavCommand → Cluster
         │─ IVI_OTA ──────▶│                  │  OTATrigger → Cluster
         │─ IVI_ContentSync────────────────── ▶│  ContentId → CoDriver 内容同步
         │                 │                  │
         │◀─ Cluster_Status┘                  │  VehicleSpeed, GearPosition → IVI
         │◀─ CoDriver_Playback────────────────┘  PlaybackState, CoVolume → IVI（只读）
```

**信号流（IVI-05 集成测试）**：

```
# IVI → Cluster
test → CANBusSimulator.send_signal("IVI_Status", {"MediaState": 1, "Volume": 25})
     → cantools.encode_message() → Virtual Bus.send()
     → Virtual Bus.recv() → cantools.decode_message()
     → assert decoded["MediaState"] == 1

# IVI → CoDriver 内容同步
test → CANBusSimulator.send_signal("IVI_ContentSync", {"ContentId": 42, "SyncEnable": 1})
     → Virtual Bus ... → assert codriver_decoded["ContentId"] == 42

# CoDriver 独立播放（不干扰 IVI）
test → CoDriver bus.send_signal("CoDriver_Playback", {"PlaybackState": 1, "CoVolume": 80})
     → assert ivi_bus.receive_signal("IVI_Status")["Volume"] unchanged
```

---

## 4. ECU Flashing 流程

```
Flasher.flash(device, image, provided_checksum)
    │
    ├─ 1. upload         → device.start_flash()       (IDLE → FLASHING)
    │
    ├─ 2. verify_checksum
    │       ├─ PASS ─→ 继续
    │       └─ FAIL ─→ rollback → device.fail()  → return CHECKSUM_MISMATCH
    │
    ├─ 3. flash          （模拟耗时，可注入 timeout）
    │       └─ TIMEOUT ─→ rollback → device.fail() → return TIMEOUT
    │
    └─ 4. confirm        → device.complete_flash()    (FLASHING → READY)
                         → return SUCCESS
```

---

## 5. 测试分层策略

| 层级 | 标记 | 范围 | 执行时机 |
|------|------|------|---------|
| 单元 | （默认） | PackageRegistry / VirtualDevice / Flasher / QualityGate | 每次 commit |
| Smoke | `@pytest.mark.smoke` | CAN 连通性、设备上电、image 注册、基础信号 | CI 必选，每次 push |
| Integration | `@pytest.mark.integration` | IVI↔Cluster 信号、IVI→CoDriver 内容同步、CoDriver 独立播放隔离 | 每次 push |
| Regression | `@pytest.mark.regression` | 历史缺陷回归，含 flaky 标记 | 每次 push |

---

## 6. CI 架构

```
GitHub Actions: ivi-integration-ci.yml
    │
    ├── matrix: Python 3.11 / 3.12
    │
    ├── job: test
    │   ├─ step: lint (black + isort + flake8)
    │   ├─ step: unit-tests (pytest tests/unit/ --cov=src)
    │   ├─ step: smoke (pytest -m smoke)         ← 质量门禁：100% pass
    │   ├─ step: integration (pytest -m integration)
    │   ├─ step: regression (pytest -m regression)
    │   └─ step: upload-artifact (HTML report)
    │
    └── 质量门禁：smoke 失败则 integration/regression 跳过
```

---

## 7. 与现有项目的一致性

| 惯例 | 本项目做法 |
|------|----------|
| Python venv | `python3 -m venv venv && source venv/bin/activate` |
| Lint 工具 | black + isort + flake8（max-line-length=120） |
| 测试框架 | pytest + pytest-cov + pytest-html |
| 目录结构 | `src/` + `tests/unit/` + `tests/integration/` |
| CI | `.github/workflows/ivi-integration-ci.yml` |
| .python-version | `3.11`（与其他 Python 项目一致） |
