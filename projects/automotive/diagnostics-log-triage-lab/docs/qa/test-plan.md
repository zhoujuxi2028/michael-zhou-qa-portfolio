# diagnostics-log-triage-lab 测试计划

**项目**: diagnostics-log-triage-lab (PREQ-021, #838)
**最近更新**: 2026-11-18（Stage 2，已按 Plan Review 修订）
**口径**: 匹配规则与指标定义见 [architecture.md §7](../architecture/architecture.md#7-匹配与指标口径metricspy)

---

## 测试策略

| 层级 | 位置 | 范围 | CI job（Python） |
|------|------|------|-----------------|
| 单元 | `tests/unit/` | 每个 `src/` 模块；规则正 / 负例；API（TestClient）；CLI（小数据、tmp 目录） | `unit-tests`（3.11 / 3.12） |
| 集成 | `tests/integration/`（`pytestmark = pytest.mark.integration`） | eval profile 指标阈值、对抗样本、耗时、demo 端到端 | `integration`（3.11 / 3.12） |
| 生成回归 | `out/regression/` | demo 生成的模板以子进程运行，全部通过 | `integration` |
| 代码质量 | — | black、isort、flake8 | `code-quality`（3.12，与 Python 版本无关） |

| 目标 | 阈值 |
|------|------|
| `src/` 覆盖率 | ≥ 85%，**只按 `tests/unit/` 计算**（API / CLI 测试放在单元层，所以单元层能覆盖全部模块） |
| 同 seed 可复现 | 同一环境内两次生成字节一致；跨 numpy 版本只比较指标（RISK-10） |
| Claude 后端 | 所有测试不发网络请求（`DLT_LLM=off` + 假 client） |

---

## 指标阈值（TC-INT-01 断言，eval profile seed 1001–1005，取最小值）

| 指标 | 阈值 | 需求 |
|------|------|------|
| 解析成功率 | ≥ 99.5% | DLT-02 |
| 非法行计数 | 与 `invalid_line_nos` 完全一致 | DLT-02 |
| 故障召回率 | ≥ 95% | DLT-03/05 |
| 误报率 | ≤ 0.10 | DLT-09 |
| 分流准确率 | ≥ 0.90 | DLT-09 |
| Cluster homogeneity | ≥ 0.90 | DLT-08 |
| Cluster completeness | ≥ 0.80 | DLT-08 |
| 回归覆盖率 | = 100% | DLT-11 |
| 自动处理耗时 | 60 s trace 端到端 ≤ 10 s（不含首次导入） | DLT-12 |

对抗样本（TC-INT-04）阈值相同，但只断言召回率、误报率、分流准确率。人工耗时为**估算**：每条 Incident 人工定位 5 分钟（假设写入报告），不做断言。

---

## 测试用例表

### 生成器（DLT-01）

| TC ID | 测试函数 | 验收标准 |
|-------|---------|---------|
| TC-GEN-01 | test_same_seed_byte_identical | 同 seed、同 profile 两次输出字节一致 |
| TC-GEN-02 | test_different_seed_differs | 不同 seed 输出不同 |
| TC-GEN-03 | test_every_fault_has_label | 每个注入故障在 `labels.faults` 有一条记录 |
| TC-GEN-04 | test_noise_not_labeled | 容差内抖动、单次 0x78、`3E 80` 无响应不产生标签 |
| TC-GEN-05 | test_all_kinds_covered | dev 与 eval profile 均覆盖全部 10 种 kind |
| TC-GEN-06 | test_generator_independent_of_triage_rules | `generator.py` 不 import `triage` / 不读 `triage_rules.json`（AST 检查） |
| TC-GEN-07 | test_labels_meta | `meta.total_lines`、`invalid_line_nos` 与输出一致 |
| TC-GEN-08 | test_flow_control_emitted | 多帧响应的 FF 之后有 tester FC（`30 xx xx`） |

### CAN 解析（DLT-02）

| TC ID | 测试函数 | 验收标准 |
|-------|---------|---------|
| TC-CP-01 | test_parse_classic_frame | `100#0102...` → id、data 正确 |
| TC-CP-02 | test_parse_fd_frame | `200##1...` → `is_fd=True`、`flags=1`、64 字节 |
| TC-CP-03 | test_parse_rtr_frame | `101#R` → `is_remote=True` |
| TC-CP-04 | test_parse_error_frame | `CAN_ERR_FLAG` → `is_error=True` |
| TC-CP-05 | test_invalid_lines_counted | 非法行计入 `stats.invalid`（含行号），不抛异常 |
| TC-CP-06 | test_dbc_decode_signal | DBC 解码值与编码值一致 |
| TC-CP-07 | test_invalid_length_rejected | 经典帧 9 字节、FD 帧 10 字节、奇数 hex → 非法 |
| TC-CP-08 | test_extended_id_parsed | 8 位 hex 无 ERR 标志 → `is_extended=True` |
| TC-CP-09 | test_std_id_over_7ff_rejected | `800#00` → 非法 |

### CAN 规则（DLT-03）

| TC ID | 测试函数 | 验收标准 |
|-------|---------|---------|
| TC-CR-01 / 02 | test_cycle_loss_{detected,within_tolerance} | 间隔 3× 周期 → 告警；1.5× → 不告警 |
| TC-CR-03 / 04 | test_dlc_mismatch_{detected,ok} | 6 字节 vs DBC 8 → 告警；FD 64 字节 = DBC → 不告警 |
| TC-CR-05 / 06 | test_signal_out_of_range_{detected,boundary_ok} | 超 max → 告警；= max → 不告警 |
| TC-CR-07 / 10 | test_error_frame_{detected,extended_id_ok} | ERR 标志 → 告警；普通扩展帧 → 不告警 |
| TC-CR-08 / 09 | test_counter_{jump_detected,wraparound_ok} | 3→5 告警；15→0 不告警 |
| TC-CR-11 | test_cycle_loss_suppresses_counter_jump | 丢 3 帧 → 只有 `CAN_CYCLE_LOSS` |
| TC-CR-12 | test_dlc_mismatch_suppresses_signal_checks | DLC 不符帧 → 只有 `CAN_DLC_MISMATCH` |
| TC-CR-13 | test_unknown_id_ignored | DBC 外 ID、0x7E0 / 0x7E8 → 无 CAN 告警 |

### ISO-TP / UDS（DLT-04）

| TC ID | 测试函数 | 验收标准 |
|-------|---------|---------|
| TC-TP-01 | test_single_frame_roundtrip | ≤ 7 字节 segment → reassemble 一致 |
| TC-TP-02 | test_multi_frame_roundtrip | 20 字节 → FF + 2 CF，重组一致 |
| TC-TP-03 | test_sequence_error_detected | 缺 CF → 序号错误 |
| TC-TP-04 | test_flow_control_skipped | 混入 FC 帧不影响重组 |
| TC-TP-05 | test_sequence_number_wraparound | 120 字节（CF SN 0xF→0x0）重组一致 |
| TC-UDS-01~06 | test_service_{10,22,27,2e,19,3e}_positive | 正响应 SID = 请求 SID + 0x40 |
| TC-UDS-07~12 | test_service_{10,22,27,2e,19,3e}_nrc | 按 architecture §4.4 表：10→0x12、22→0x31、27→0x35、2E→0x33、19→0x12、3E→0x13 |
| TC-UDS-13 | test_pair_exchanges | 请求 / 响应按 ID 与时间配对；FC 不被当作请求 |
| TC-UDS-14 | test_security_lockout_after_3_attempts | 第 3 次错误 key → 0x36 |
| TC-UDS-15 | test_write_requires_unlock | 未解锁 2E → 0x33；默认会话 2E → 0x22 |
| TC-UDS-16 | test_3e_suppress_no_response | `3E 80` → 无响应 |

### UDS 规则（DLT-05）

| TC ID | 测试函数 | 验收标准 |
|-------|---------|---------|
| TC-UR-01 / 02 | test_nrc_{classified,positive_ignored} | NRC 0x31 → `UDS_NRC`；正响应不告警 |
| TC-UR-03 / 04 | test_p2_timeout_{detected,in_time_ok} | 60 ms 无响应 → 告警；40 ms 响应 → 不告警 |
| TC-UR-05 / 06 | test_pending_{loop_detected,single_ok} | 0x78 × 7 → 告警；0x78 × 1 后正响应 → 不告警 |
| TC-UR-07 / 08 | test_security_{fail_detected,success_ok} | NRC 0x35 → 告警；正确 key → 不告警 |
| TC-UR-09 | test_suppress_bit_no_timeout | `3E 80` 无响应 → 不告警 |
| TC-UR-10 / 11 | test_p2star_timeout_{detected,in_time_ok} | 0x78 后 5.5 s 无最终响应 → 告警；4 s 内响应 → 不告警 |
| TC-UR-12 | test_trace_end_no_false_timeout | 最后一个请求距 trace 末尾 < P2 → 不告警 |
| TC-UR-13 | test_security_fail_not_double_counted | NRC 0x35 只产出 `UDS_SECURITY_FAIL`，不产出 `UDS_NRC` |
| TC-UR-14 | test_security_lockout_0x36 | NRC 0x36 → `UDS_SECURITY_FAIL`，signature 含 `nrc=0x36` |

### 标准化 / 模板 / 聚类 / 分流（DLT-06~09）

| TC ID | 测试函数 | 验收标准 |
|-------|---------|---------|
| TC-EV-01 | test_event_schema_valid | 两种来源的 Event 均通过 `validate` |
| TC-EV-02 | test_event_schema_rejects_missing | 缺字段 → 校验失败 |
| TC-EV-03 | test_mixed_sources_sorted | CAN + UDS 事件按 ts 合并排序 |
| TC-TM-01 | test_same_template_diff_params | 只有变量字段不同 → 同一 template_id |
| TC-TM-02 | test_categorical_fields_split | `nrc=0x31` vs `nrc=0x35` → 不同 template_id |
| TC-CL-01 | test_cluster_deterministic | 同输入两次标签一致 |
| TC-CL-02 | test_cluster_homogeneity_fixture | 固定样本 homogeneity = 1.0 |
| TC-CL-03 | test_tfidf_merges_optional_field_variants | 有无 `gap_ms=` 的两个模板 → 同一簇 |
| TC-TR-01 | test_priority_base_rules | 各 kind 基础优先级符合规则表 |
| TC-TR-02 | test_priority_escalation | 安全 ID 周期丢失、error frame burst、NRC 0x36 → P1；非安全 ID、单次 error frame → P2 |
| TC-TR-03 | test_regression_candidate | P1 或 count ≥ 2 → 候选；单次 P2 → 非候选 |
| TC-TR-04 | test_pipeline_smoke_seed42 | dev profile 跑 `pipeline.run` 无异常，每种 kind 至少 1 个 Incident |

### LLM / 回归 / 报告 / 指标（DLT-10~12）

| TC ID | 测试函数 | 验收标准 |
|-------|---------|---------|
| TC-LLM-01 | test_null_backend_without_key | 无 key → `NullBackend` |
| TC-LLM-02 | test_claude_backend_with_fake_client | 假 client 返回结构化结果 → 写入 summary / hypotheses |
| TC-LLM-03 | test_fallback_on_api_error | 假 client 抛 `APIConnectionError` → 回退，`summary_note` 已标注 |
| TC-LLM-04 | test_llm_does_not_change_results | 有无 LLM 时 priority、cluster、`Metrics` 完全一致 |
| TC-LLM-05 | test_fallback_on_refusal | `stop_reason="refusal"` 或 `parsed_output=None` → 回退 |
| TC-LLM-06 | test_off_switch_with_key | 有 key 且 `DLT_LLM=off` → `NullBackend` |
| TC-LLM-07 | test_summarize_capped_at_10 | 15 个 Incident 只调用 10 次 |
| TC-RG-01 | test_regression_file_collectable | 生成文件以子进程 `--collect-only` 成功 |
| TC-RG-02 | test_regression_file_passes | 生成文件以子进程运行通过 |
| TC-RG-03 | test_snippet_window | CAN 片段含前后 3 个周期；UDS 片段含 FC 与 P2 / P2* 尾部 |
| TC-RG-04 | test_regression_detects_removed_rule | 关掉对应规则后，生成的测试失败（证明有效） |
| TC-RP-01 | test_report_json_fields | JSON 含标签、聚类、分流、指标 |
| TC-RP-02 | test_report_markdown_sections | Markdown 含各章节与「合成数据」声明 |
| TC-MT-01 | test_metrics_known_fixture | 手工构造输入 → 指标与手算一致 |
| TC-MT-02 | test_match_tolerance | 容差边界内匹配、边界外不匹配 |
| TC-MT-03 | test_unmatched_incident_is_false_positive | 无匹配 Incident 计入误报 |
| TC-MT-04 | test_one_fault_many_incidents | 1 个故障被 2 个 Incident 命中 → 都计入准确率，completeness < 1 |
| TC-MT-05 | test_one_incident_many_faults | 多数投票；平票取 P1 |

### API / CLI（DLT-13/14，单元层）

| TC ID | 测试函数 | 验收标准 |
|-------|---------|---------|
| TC-API-01 | test_health | 200 + `{"status":"ok"}` |
| TC-API-02 | test_triage_ok | 合法 trace → 200 + `incidents[]` / `clusters[]` / `parse_stats` |
| TC-API-03 | test_triage_empty_422 | 空 trace → 422 |
| TC-API-04 | test_triage_too_large_413 | > 5 MB → 413 |
| TC-API-05 | test_clusters_before_triage_404 | 新 app 实例 → 404 |
| TC-API-06 | test_clusters_after_triage | 同实例 triage 后 → 200 |
| TC-API-07 | test_triage_no_disk_writes | 调用前后 tmp 工作目录无新文件 |
| TC-CLI-01 | test_cli_generate_and_triage | `generate` + `triage` 在 tmp 目录产出全部文件 |

### 集成（`-m integration`）

| TC ID | 测试函数 | 验收标准 |
|-------|---------|---------|
| TC-INT-01 | test_eval_seeds_meet_thresholds | seed 1001–1005 全部满足阈值表 |
| TC-INT-02 | test_pipeline_runtime | 60 s trace ≤ 10 s |
| TC-INT-03 | test_demo_end_to_end | `cli demo` 退出码 0，产出全部文件，回归模板全部通过 |
| TC-INT-04 | test_adversarial_fixture | 手写对抗样本满足召回率 / 误报率 / 准确率阈值 |

---

## 需求追溯

| 需求 | 用例 |
|------|------|
| DLT-01 | TC-GEN-* |
| DLT-02 | TC-CP-*、TC-INT-01 |
| DLT-03 | TC-CR-* |
| DLT-04 | TC-TP-*、TC-UDS-* |
| DLT-05 | TC-UR-* |
| DLT-06 | TC-EV-* |
| DLT-07 | TC-TM-* |
| DLT-08 | TC-CL-*、TC-INT-01 |
| DLT-09 | TC-TR-*、TC-INT-01、TC-INT-04 |
| DLT-10 | TC-LLM-* |
| DLT-11 | TC-RG-*、TC-INT-03 |
| DLT-12 | TC-RP-*、TC-MT-*、TC-INT-02 |
| DLT-13 | TC-API-* |
| DLT-14 | TC-CLI-01、TC-INT-03 |
| DLT-15 | CI workflow 绿灯 |
