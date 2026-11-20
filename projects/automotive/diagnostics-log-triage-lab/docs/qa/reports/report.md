# Diagnostics Log Triage Report

> 本报告基于**合成数据**（simulation lab），不代表实车、台架或量产 ECU 结果。

## 解析统计

| 项 | 值 |
|----|----|
| 总行数 | 4952 |
| 成功解析 | 4950 |
| 非法行 | 2 |

## Incident 分流

| ID | 优先级 | kind | bus | signature | 次数 | 回归候选 | 摘要 |
|----|--------|------|-----|-----------|------|----------|------|
| C003-0 | P1 | `UDS_PENDING_LOOP` | 0x7E0 | sid=0x19 | 1 | ✅ | UDS_PENDING_LOOP @ 0x7E0 sid=0x19：1 次，1700000011.600–1700000011.600，P1 |
| C007-0 | P1 | `UDS_P2_TIMEOUT` | 0x7E0 | sid=0x22 timer=P2 | 2 | ✅ | UDS_P2_TIMEOUT @ 0x7E0 sid=0x22 timer=P2：2 次，1700000017.600–1700000020.600，P1 |
| C008-0 | P1 | `CAN_CYCLE_LOSS` | 0x100 | — | 3 | ✅ | CAN_CYCLE_LOSS @ 0x100：3 次，1700000024.085–1700000053.083，P1 |
| C009-0 | P1 | `UDS_P2_TIMEOUT` | 0x7E0 | sid=0x19 timer=P2* | 1 | ✅ | UDS_P2_TIMEOUT @ 0x7E0 sid=0x19 timer=P2*：1 次，1700000025.600–1700000025.600，P1 |
| C013-0 | P1 | `CAN_ERROR_FRAME` | ERR | class=0x040 | 8 | ✅ | CAN_ERROR_FRAME @ ERR class=0x040：8 次，1700000041.000–1700000049.300，P1 |
| C014-0 | P1 | `CAN_SIGNAL_OUT_OF_RANGE` | 0x200 | signal=ObjDistance | 4 | ✅ | CAN_SIGNAL_OUT_OF_RANGE @ 0x200 signal=ObjDistance：4 次，1700000042.006–1700000042.300，P1 |
| C015-0 | P1 | `UDS_SECURITY_FAIL` | 0x7E0 | sid=0x27 nrc=0x36 | 1 | ✅ | UDS_SECURITY_FAIL @ 0x7E0 sid=0x27 nrc=0x36：1 次，1700000051.200–1700000051.200，P1 |
| C000-0 | P2 | `CAN_DLC_MISMATCH` | 0x101 | — | 3 | ✅ | CAN_DLC_MISMATCH @ 0x101：3 次，1700000001.006–1700000057.108，P2 |
| C001-0 | P2 | `CAN_ERROR_FRAME` | ERR | class=0x004 | 3 | ✅ | CAN_ERROR_FRAME @ ERR class=0x004：3 次，1700000010.000–1700000046.000，P2 |
| C002-0 | P2 | `UDS_SECURITY_FAIL` | 0x7E0 | sid=0x27 nrc=0x35 | 5 | ✅ | UDS_SECURITY_FAIL @ 0x7E0 sid=0x27 nrc=0x35：5 次，1700000010.800–1700000051.000，P2 |
| C004-0 | P2 | `CAN_SIGNAL_OUT_OF_RANGE` | 0x100 | signal=VehicleSpeed | 2 | ✅ | — |
| C005-0 | P2 | `UDS_NRC` | 0x7E0 | sid=0x22 nrc=0x31 | 2 | ✅ | — |
| C006-0 | P2 | `CAN_COUNTER_JUMP` | 0x101 | — | 4 | ✅ | — |
| C010-0 | P2 | `CAN_CYCLE_LOSS` | 0x101 | — | 2 | ✅ | — |
| C011-0 | P2 | `ISOTP_SEQUENCE_ERROR` | 0x7E0 | sid=0x22 | 1 | — | — |
| C012-0 | P2 | `UDS_NRC` | 0x7E0 | sid=0x2E nrc=0x22 | 1 | — | — |

## 聚类

- 事件 43 条 → 簇 16 个
- 多模板簇（TF-IDF 合并的可选字段变体）：0 个

## 指标

| 指标 | 值 |
|------|----|
| 故障召回率 | 100.0% |
| 误报率 | 0.0% |
| 分流准确率（合成场景上的分流一致性） | 100.0% |
| Cluster homogeneity / completeness | 1.000 / 1.000 |
| 解析成功率 | 100.0% |
| 非法行计数一致 | ✅ |
| 回归覆盖率 | 100.0% |

## 耗时对比

| 方式 | 耗时 |
|------|------|
| 自动（实测） | 0.12 s |
| 人工（估算：每条 Incident 5 分钟） | 80 min |

## 回归模板

- `test_reg_c003_0_uds_pending_loop.py`
- `test_reg_c007_0_uds_p2_timeout.py`
- `test_reg_c008_0_can_cycle_loss.py`
- `test_reg_c009_0_uds_p2_timeout.py`
- `test_reg_c013_0_can_error_frame.py`
- `test_reg_c014_0_can_signal_out_of_range.py`
- `test_reg_c015_0_uds_security_fail.py`
- `test_reg_c000_0_can_dlc_mismatch.py`
- `test_reg_c001_0_can_error_frame.py`
- `test_reg_c002_0_uds_security_fail.py`
- `test_reg_c004_0_can_signal_out_of_range.py`
- `test_reg_c005_0_uds_nrc.py`
- `test_reg_c006_0_can_counter_jump.py`
- `test_reg_c010_0_can_cycle_loss.py`
