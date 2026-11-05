# ivi-integration-lab 测试计划

**项目**: ivi-integration-lab (PREQ-020)  
**场景**: AutoSoft IVI 集成验证实验室  
**最近更新**: 2026-11-05（Stage 2 设计阶段）

---

## 测试策略

| 层级 | 工具 | 范围 | 触发 |
|------|------|------|------|
| 单元 | pytest + pytest-cov | PackageRegistry / VirtualDevice / Flasher / QualityGate | 每次 commit |
| Smoke | pytest `-m smoke` | CAN 连通性、设备上电自检、基础信号收发 | 每次 push，CI 门禁 |
| Integration | pytest `-m integration` | IVI↔Cluster 信号、IVI→CoDriver 内容同步、CoDriver 独立播放隔离 | 每次 push |
| Regression | pytest `-m regression` | 历史缺陷回归用例 | 每次 push |
| CI | GitHub Actions matrix | 全套（Python 3.11/3.12） | Push / PR |

**覆盖率目标**: `src/` ≥ 80%  
**Smoke 通过率**: 100%（失败则阻断后续层级）  
**Regression flaky rate**: ≤ 10%

---

## 测试用例表

### Smoke 测试（IVI-04）

| TC ID | 需求 | 测试文件 | 测试函数 | 验收标准 |
|-------|------|---------|---------|---------|
| TC-S01 | IVI-04 | test_smoke.py | test_can_bus_send_receive | Virtual Bus 发帧后能收到相同 arbitration_id 的帧 |
| TC-S02 | IVI-04 | test_smoke.py | test_device_power_on_self_test | VirtualDevice 从 IDLE 转为 READY，状态断言正确 |
| TC-S03 | IVI-04 | test_smoke.py | test_package_registry_register | ECUImage 注册后 get() 返回同一对象 |
| TC-S04 | IVI-04 | test_smoke.py | test_media_state_signal_send | IVI_Status MediaState=1 发送后解码值 == 1 |
| TC-S05 | IVI-04 | test_smoke.py | test_audio_volume_signal | IVI_Status Volume=50 发送后解码值 == 50 |

### Integration 测试（IVI-05）

| TC ID | 需求 | 测试文件 | 测试函数 | 验收标准 |
|-------|------|---------|---------|---------|
| TC-I01 | IVI-05 | test_integration.py | test_ivi_cluster_media_sync | IVI 发 MediaState=2，Cluster 收到并解码 == 2 |
| TC-I02 | IVI-05 | test_integration.py | test_volume_change_propagation | Volume 从 20→80，Cluster 收到 == 80 |
| TC-I03 | IVI-05 | test_integration.py | test_nav_command_dispatch | NavCommand=0x0A 发送后 Cluster 收到 == 0x0A |
| TC-I04 | IVI-05 | test_integration.py | test_ota_trigger_signal | OTATrigger=1 发送后 Cluster 收到 == 1 |
| TC-I05 | IVI-05 | test_integration.py | test_cluster_speed_readback | Cluster 发 VehicleSpeed=60.0，IVI 收到 ≈ 60.0 |
| TC-I06 | IVI-05 | test_integration.py | test_cluster_gear_position | GearPosition=3 发送后 IVI 收到 == 3 |
| TC-I07 | IVI-05 | test_integration.py | test_full_ivi_cluster_roundtrip | IVI 发状态→Cluster 收→Cluster 发车速→IVI 收，全链路断言 |
| TC-I08 | IVI-05 | test_integration.py | test_signal_timeout_returns_none | recv() 超时 0.1s 返回 None，不抛异常 |
| TC-I09 | IVI-05 | test_integration.py | test_codriver_content_sync | IVI 发 IVI_ContentSync(ContentId=42)，CoDriver 解码后 == 42 |
| TC-I10 | IVI-05 | test_integration.py | test_codriver_independent_volume | CoDriver 发 CoDriver_Playback(CoVolume=80)，IVI 的 Volume 信号不变 |
| TC-I11 | IVI-05 | test_integration.py | test_codriver_playback_state_isolated | CoDriver PlaybackState=PLAYING 时，IVI MediaState 不受影响 |

### Regression 测试（IVI-06）

| TC ID | 需求 | 测试文件 | 测试函数 | 验收标准 | 历史缺陷 |
|-------|------|---------|---------|---------|---------|
| TC-R01 | IVI-06 | test_regression.py | test_flash_rollback_on_checksum_mismatch | checksum 不匹配时设备状态 == ERROR，不残留 FLASHING | DEF-IVI-001 |
| TC-R02 | IVI-06 | test_regression.py | test_flash_rollback_on_timeout | flash timeout 时设备状态 == ERROR | DEF-IVI-002 |
| TC-R03 | IVI-06 | test_regression.py | test_device_reset_from_error | ERROR 状态调用 reset() 后 == IDLE | DEF-IVI-003 |
| TC-R04 | IVI-06 | test_regression.py | test_registry_delete_nonexistent_raises | 删除不存在的 image 抛 KeyError | DEF-IVI-004 |
| TC-R05 | IVI-06 | test_regression.py | test_volume_out_of_range_clamped | Volume > 100 时 DBC 编码不溢出 | DEF-IVI-005 |
| TC-R06 | IVI-06 | test_regression.py | test_quality_gate_fails_on_low_coverage | coverage < 80% 时 QualityGate 返回 passed=False | DEF-IVI-006 |

### 单元测试（IVI-01/02/03/09）

| TC ID | 需求 | 测试文件 | 测试函数 | 验收标准 |
|-------|------|---------|---------|---------|
| TC-U01 | IVI-01 | test_package_registry.py | test_register_new_image | get() 返回 checksum 一致 |
| TC-U02 | IVI-01 | test_package_registry.py | test_list_by_ecu_type | 只返回指定 ECU 类型的 image |
| TC-U03 | IVI-01 | test_package_registry.py | test_verify_checksum_match | 正确 checksum 返回 True |
| TC-U04 | IVI-01 | test_package_registry.py | test_verify_checksum_mismatch | 错误 checksum 返回 False |
| TC-U05 | IVI-01 | test_package_registry.py | test_delete_image | 删除后 get() 抛 KeyError |
| TC-U06 | IVI-02 | test_virtual_device.py | test_initial_state_is_idle | 新建设备状态 == IDLE |
| TC-U07 | IVI-02 | test_virtual_device.py | test_start_flash_transition | IDLE → FLASHING |
| TC-U08 | IVI-02 | test_virtual_device.py | test_complete_flash_transition | FLASHING → READY |
| TC-U09 | IVI-02 | test_virtual_device.py | test_start_running | READY → RUNNING |
| TC-U10 | IVI-02 | test_virtual_device.py | test_fail_from_any_state | 任意状态 → ERROR |
| TC-U11 | IVI-02 | test_virtual_device.py | test_reset_from_error | ERROR → IDLE |
| TC-U12 | IVI-02 | test_virtual_device.py | test_invalid_transition_raises | IDLE 直接 complete_flash() 抛 InvalidStateError |
| TC-U13 | IVI-03 | test_flasher.py | test_flash_success_path | 返回 FlashResult.SUCCESS，设备 == READY |
| TC-U14 | IVI-03 | test_flasher.py | test_flash_checksum_mismatch | 返回 CHECKSUM_MISMATCH，设备 == ERROR |
| TC-U15 | IVI-03 | test_flasher.py | test_flash_timeout | 注入 timeout，返回 TIMEOUT，设备 == ERROR |
| TC-U16 | IVI-09 | test_quality_gate.py | test_smoke_100_percent_pass | passed=True |
| TC-U17 | IVI-09 | test_quality_gate.py | test_smoke_partial_fail | passed=False |
| TC-U18 | IVI-09 | test_quality_gate.py | test_flaky_rate_within_threshold | ≤10% → passed=True |
| TC-U19 | IVI-09 | test_quality_gate.py | test_coverage_above_threshold | ≥80% → passed=True |
| TC-U20 | IVI-09 | test_quality_gate.py | test_coverage_below_threshold | <80% → passed=False |

---

## 质量门禁规则

| 门禁 | 条件 | 失败行为 |
|------|------|---------|
| Smoke 100% | smoke 层全部 PASS | CI 阻断，integration/regression 跳过 |
| Coverage ≥ 80% | pytest --cov 结果 | CI 报红 |
| Regression flaky ≤ 10% | 连续 3 次不稳定计为 flaky | 打印 WARNING，不阻断 |

---

## 覆盖率目标

| 模块 | 目标 |
|------|------|
| `src/package_registry.py` | ≥ 90% |
| `src/virtual_device.py` | ≥ 90% |
| `src/flasher.py` | ≥ 85% |
| `src/can_bus.py` | ≥ 80% |
| `src/quality_gate.py` | ≥ 85% |
| `src/logger.py` | ≥ 80% |
| **全体 src/** | **≥ 80%** |
