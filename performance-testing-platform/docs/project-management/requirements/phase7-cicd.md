# Phase 7 — CI/CD + 可观测性 📋 Planned ([#88](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/88))

> 依赖 Phase 6 的测试产出，构建 CI 门禁、可视化和自动调度

## 7.1 目标

将测试结果接入 CI/CD 流水线和可观测性平台，实现性能基线回归检测、覆盖率门禁、Grafana 增强面板和定时调度。

| 维度                | 当前状态                  | 目标状态                                          |
| ------------------- | ------------------------- | ------------------------------------------------- |
| 基线回归 + 历史趋势 | CI 仅 pass/fail，单次对比 | 基线回归检测 + 多次运行趋势可视化 + 渐进退化预警  |
| CI 覆盖率           | 覆盖率仅本地查看          | CI 强制门禁 + artifact 归档                       |
| Grafana 面板 + 告警 | 基础面板，无通知渠道      | 错误分布 + 延迟热力图 + 自定义指标 + webhook 告警 |
| 定时调度            | 仅手动触发测试            | CI cron nightly soak + weekly capacity，自动归档  |

## 需求编号规范

```
PERF-[子系统]-FR-[序号]

子系统：
  BL    = Baseline      基线回归 + 趋势
  COV   = Coverage      覆盖率门禁
  OBS   = Observability Grafana 面板 + 告警
  SCHED = Schedule      定时调度
  K6    = k6 Scripts    k6 脚本能力
```

## 7.2 用户故事

| ID    | 用户故事                                                                                                 | 关联需求         |
| ----- | -------------------------------------------------------------------------------------------------------- | ---------------- |
| US-26 | 作为性能工程师，我想在 CI 中自动对比当前 p95 与历史基线并查看最近 N 次运行趋势，以便在性能退化时阻断合并 | PERF-BL-FR       |
| US-31 | 作为性能工程师，我想在 CI 中强制覆盖率门禁，以便防止测试覆盖率退化                                       | PERF-COV-FR      |
| US-32 | 作为性能工程师，我想在 Grafana 中查看错误分布、延迟热力图，并在告警触发时收到 webhook 通知               | PERF-OBS-FR      |
| US-33 | 作为性能工程师，我想设置定时调度自动运行 nightly soak 和 weekly capacity test，以便持续监控系统稳定性    | PERF-SCHED-FR    |
| US-34 | 作为性能工程师，我想确保所有 k6 脚本统一使用 funnel helper，以便维护一致的流量漏斗模型且无重复内联逻辑   | PERF-K6-FR       |
| US-35 | 作为性能工程师，我想在 breakpoint 报告中看到 graceful/catastrophic 崩溃分类，以便区分系统降级方式         | PERF-K6-FR       |
| US-36 | 作为性能工程师，我想验证系统在持续超载后的熔断恢复行为，以便评估弹性工程能力                             | PERF-K6-FR       |

## 7.3 需求列表

### 7.3.1 性能基线回归 + 历史趋势（PERF-BL-FR）

| ID               | 需求                                                                                                  | 优先级 | 工作量 |
| ---------------- | ----------------------------------------------------------------------------------------------------- | ------ | ------ |
| PERF-BL-FR-001   | CI 性能基线存储: smoke gate 运行后将 p95 / error rate / throughput 存为 JSON artifact                 | P1     | 中     |
| PERF-BL-FR-002   | 基线回归检测: CI 下载上次 baseline artifact，对比当前 p95，退化 >20% 则 warning，>50% 则 fail         | P1     | 中     |
| PERF-BL-FR-003   | 趋势数据收集: 每次 CI 运行提取 p95/throughput/error rate 追加到 `reports/trend.json`                  | P2     | 中     |
| PERF-BL-FR-004   | 趋势可视化: `scripts/generate-trend.sh` 从 trend.json 生成 Markdown 趋势表（最近 N 次运行的指标对比） | P2     | 中     |
| PERF-BL-FR-005   | Grafana 趋势面板: 历史 p95 / throughput 折线图（从 InfluxDB 聚合）                                    | P3     | 小     |
| PERF-BL-FR-006   | 基线对比单元测试: 回归检测阈值判定、首次运行无 baseline 兜底                                          | P1     | 小     |

### 7.3.2 CI 覆盖率门禁（PERF-COV-FR）

| ID               | 需求                                                                                                           | 优先级 | 工作量 |
| ---------------- | -------------------------------------------------------------------------------------------------------------- | ------ | ------ |
| PERF-COV-FR-001  | `performance-ci.yml` unit-test job 添加 `--coverage` 参数，生成覆盖率报告                                      | P1     | 小     |
| PERF-COV-FR-002  | 上传 coverage 报告为 CI artifact (`actions/upload-artifact`)                                                   | P1     | 小     |
| PERF-COV-FR-003  | Jest 覆盖率阈值 (statements ≥80%, branches ≥70%, functions ≥80%, lines ≥80%) 在 CI 中强制执行，低于阈值则 fail | P1     | 小     |

### 7.3.3 Grafana 面板 + 告警（PERF-OBS-FR）

| ID               | 需求                                                                                              | 优先级 | 工作量 |
| ---------------- | ------------------------------------------------------------------------------------------------- | ------ | ------ |
| PERF-OBS-FR-001  | 新增「错误分布」面板：按 endpoint 分组的 error rate 时序图                                        | P2     | 小     |
| PERF-OBS-FR-002  | 新增「延迟热力图」面板：请求延迟分布的 heatmap 可视化                                             | P2     | 小     |
| PERF-OBS-FR-003  | 新增「自定义指标聚合」面板：soak_heap_used_mb、soak_event_loop_lag、soak_order_success 趋势       | P2     | 小     |
| PERF-OBS-FR-004  | Grafana webhook 告警: `docker-compose.yml` 增加 webhook notifier 配置，告警触发时 POST 到指定 URL | P2     | 小     |

### 7.3.4 定时调度测试（PERF-SCHED-FR）

> ⚠️ **可行性风险**: CI cron 需要目标服务器持续运行，Portfolio 项目无持久基础设施。降级为 P3，作为示范性 workflow 文件，不保证实际调度效果。

| ID                | 需求                                                                                        | 优先级 | 工作量 |
| ----------------- | ------------------------------------------------------------------------------------------- | ------ | ------ |
| PERF-SCHED-FR-001 | GitHub Actions cron workflow: nightly soak-short (10m) + weekly capacity test，自动归档结果 | P3     | 中     |
| PERF-SCHED-FR-002 | 测试结果自动归档: 每次调度运行的 k6 JSON output 存为 CI artifact，保留 30 天                | P3     | 小     |

## 7.4 问题与回答

### 7.4.1 需求详细化问题与回答

#### 问题1：PERF-BL-FR-001 需求不够详细

**问题描述**：
baseline.json的数据结构、artifact命名规范、metrics提取方法未明确定义。

**回答与补充**：
```yaml
补充内容:
  baseline_data_structure:
    定义完整JSON schema:
      file: "baseline-{YYYYMMDD-HHMMSS}.json"
      fields:
        - timestamp: "string (ISO 8601)"
        - test_type: "string (smoke/load/stress/soak/capacity)"
        - metrics:
            p95:
              value: "number (milliseconds)"
              description: "第95百分位延迟"
            p99:
              value: "number (milliseconds)"
              description: "第99百分位延迟"
            error_rate:
              value: "number (percentage 0-100)"
              description: "错误率"
            throughput:
              value: "number (requests per second)"
              description: "吞吐量"

  artifact_naming:
    定义命名规范:
      pattern: "baseline-{timestamp}.json"
      examples:
        - "baseline-20260418-143000.json"
        - "baseline-20260418-150030.json"

  metrics_extraction:
    定义提取方法:
      k6_json:
        - 提取字段: "data.metrics.http_req_duration.p(95)"
        - 提取字段: "data.metrics.http_reqs"
      jmeter_jtl:
        - 解析JTL文件获取错误率
        - 使用正则匹配响应码

技术原因: 需要明确数据结构和提取方法才能避免实施时的不一致。
```

#### 问题2：PERF-BL-FR-002 需求过于模糊

**问题描述**：
"退化 >20% 则 warning，>50% 则 fail"的定义不够清晰。

**回答与补充**：
```yaml
补充内容:
  regression_calculation:
    定义精确计算公式:
      percentage_degradation: "(current_p95 - baseline_p95) / baseline_p95 * 100"
      negative_value: "性能提升（负数表示改善）"
      small_degradation: "0-20%（小幅下降）"
      medium_degradation: "20-50%（明显下降）"
      large_degradation: ">50%（严重下降）"

    absolute_tolerance:
      定义绝对值容差:
      latency_tolerance: "±50ms内不算退化"
      rate_tolerance: "±0.1%绝对值偏差"

  fail_action:
    明确fail后的动作:
      - "CI job失败，阻止后续执行"
      - "设置GitHub check为failure"
      - "生成详细的fail原因报告"

    warning_action:
    明确warning后的动作:
      - "CI job成功，但生成warning"
      - "不阻止后续执行"
      - "在log中突出显示warning信息"

技术原因: 模糊的描述会导致开发和验收困难。
```

#### 问题3：PERF-COV-FR-003 需求技术细节不足

**问题描述**：
没有说明如何从Jest输出中提取覆盖率数值。

**回答与补充**：
```yaml
补充内容:
  coverage_extraction:
    定义提取方法:
      jest_output: "使用内置coverage收集器"
      coverage_format: "支持 lcov、json、html"
      extraction_tool: "可以使用jest自带的解析器或第三方工具（如c8）"

  threshold_checking:
    定义检查方法:
      runtime_check: "使用Jest的coverageThresholds配置"
      post_check: "解析lcov.info或coverage-summary.json"
      fallback: "如果覆盖率文件生成失败，使用命令行输出"

技术原因: 需要明确提取和检查的技术路径。
```

#### 问题4：PERF-OBS-FR-004 需求webhook规范缺失

**问题描述**：
没有定义webhook的payload格式、认证机制、重试策略。

**回答与补充**：
```yaml
补充内容:
  webhook_payload:
    定义payload schema:
      alert_name: "string"
      state: "firing 或 resolved"
      condition: "告警触发条件描述"
      values:
        - 当前指标值
        - 阈值
        - 时间戳
      message: "告警描述"
      labels:
        alert_type: "threshold / anomaly"
        endpoint: "受影响的endpoint"
        severity: "warning / critical"
      ruleUrl: "Grafana告警规则链接"

  security_considerations:
    定义安全机制:
      webhook_validation: "验证URL合法性，避免SSRF"
      authentication: "使用API token或签名验证"
      rate_limiting: "实现请求队列和退避"
      encryption: "使用HTTPS传输"
      ip_whitelist: "限制webhook调用来源"

技术原因: webhook集成涉及安全风险，必须明确安全要求。
```

#### 问题5：PERF-SCHED-FR-001 需求实施细节不足

**问题描述**：
cron执行失败处理、结果归档格式、并发控制等实施细节缺失。

**回答与补充**：
```yaml
补充内容:
  failure_handling:
    定义失败处理策略:
      k6_execution_failure:
        - 脚本执行exit code非0
        - action: "记录详细日志，生成错误报告"
        - retry: "自动重试1次，使用退避策略"
        - escalation: "重试失败后发送告警"

      service_unavailable:
        - GitHub API不可达
        - action: "graceful degradation，继续其他job"
        - monitoring: "记录服务不可达时间"
        - alert: "发送服务down告警"

  result_archiving:
    定义归档格式:
      directory_structure:
        root: "reports/scheduled/{YYYY-MM-DD}/"
        contents:
          - k6_outputs: "所有k6脚本的JSON output"
          - summary: "test_summary.md"
          - logs: "execution.log"

      file_naming:
        - "k6-{test_type}-{timestamp}.json"
        - "summary-{timestamp}.md"
        - "execution-{timestamp}.log"

  concurrency_control:
    定义并发控制:
      lock_mechanism:
        file: "/tmp/scheduled-test.lock"
        implementation: "原子性目录创建"
        timeout: "30分钟"
        cleanup: "异常退出时自动清理"

      job_queue:
        implementation: "使用GitHub Actions的concurrency设置"
        max_concurrent_jobs: "限制同时运行的scheduled jobs数量为1"
        waiting_strategy: "新请求等待，不丢弃"

技术原因: 分布式系统的可靠性需要完善的失败处理和并发控制机制。
```

---

## 7.5 补充的验收标准

基于上述问题与回答，补充以下验收标准：

### 7.5.1 Baseline模块验收标准

| 需求ID | 原有验收 | 补充验收标准 |
|----------|----------|--------------|
| PERF-BL-FR-001 | baseline.json包含p95/error_rate/throughput | ✅ JSON schema完整定义，所有字段有类型说明 |
| PERF-BL-FR-002 | 对比结果输出pass/warning/fail | ✅ 百分比计算公式明确，绝对值容差定义 |
| PERF-BL-FR-003 | trend.json追加新记录 | ✅ 追加逻辑原子性，30天清理策略明确 |
| PERF-BL-FR-004 | Grafana趋势面板正确显示 | ✅ Flux查询优化，缓存策略，时间范围选择正确 |
| PERF-BL-FR-005 | Markdown趋势表格式正确 | ✅ 趋势指示符定义，表头包含所有必需列 |
| PERF-BL-FR-006 | 单元测试覆盖所有edge cases | ✅ 6个测试用例对应6个单元测试，edge cases验证通过 |

### 7.5.2 Coverage模块验收标准

| 需求ID | 原有验收 | 补充验收标准 |
|----------|----------|--------------|
| PERF-COV-FR-001 | coverage/目录生成 | ✅ 包含lcov.info和HTML报告，覆盖率百分比正确显示 |
| PERF-COV-FR-002 | artifact成功上传 | ✅ artifact在GitHub Actions页面可见，retention设置为90天 |
| PERF-COV-FR-003 | CI失败低于阈值 | ✅ statements<80%/branches<70%/functions<80%/lines<80%时CI fail，错误消息清晰指示未达标指标 |

### 7.5.3 Observability模块验收标准

| 需求ID | 原有验收 | 补充验收标准 |
|----------|----------|--------------|
| PERF-OBS-FR-001 | 错误分布面板显示 | ✅ 按endpoint分组，时间序列正确，阈值线（1%）显示 |
| PERF-OBS-FR-002 | 延迟热力图显示 | ✅ 颜色梯度正确（绿<100ms，黄<500ms，红≥500ms），异常值过滤（>5s） |
| PERF-OBS-FR-003 | 自定义指标面板显示 | ✅ 3个指标独立Y轴，数据点正确，阈值显示 |
| PERF-OBS-FR-004 | Webhook告警触发 | ✅ 告警时POST到指定URL，payload格式完整，包含所有必需字段 |

### 7.5.4 Schedule模块验收标准

| 需求ID | 原有验收 | 补充验收标准 |
|----------|----------|--------------|
| PERF-SCHED-FR-001 | Cron workflow执行 | ✅ nightly和weekly按预定时间触发，workflow run显示成功 |
| PERF-SCHED-FR-002 | 结果自动归档 | ✅ artifact命名包含timestamp，包含k6 JSON和summary，retention设置为30天 |
| 失败处理 | 执行失败优雅降级 | ✅ k6脚本失败时记录详细日志，重试机制工作，服务不可达时有告警 |
| 并发控制 | 避免冲突 | ✅ 锁机制正确实现，GitHub Actions concurrency设置生效 |

### 7.5.5 k6 Scripts模块验收标准

| 需求ID | 原有验收 | 补充验收标准 |
|----------|----------|--------------|
| PERF-K6-FR-004 | 崩溃分类 | ✅ graceful/catastrophic判断基于明确的百分比阈值，输出在summary中正确显示 |
| PERF-K6-FR-005 | 恢复验证 | ✅ 3个测试阶段（正常/超载/恢复）metrics被正确收集和记录 |
| PERF-K6-FR-006~007 | 集成验证 | ✅ InfluxDB查询正确，Grafana面板显示实时数据，webhook告警触发 |

---

**文档版本更新**: v1.1 - 添加问题与回答章节
**更新日期**: 2026-04-18
**更新内容**: 补充PERF-BL-FR、PERF-COV-FR、PERF-OBS-FR、PERF-SCHED-FR系列需求的技术细节和验收标准 |

### 7.3.5 k6 脚本能力（PERF-K6-FR）

> 来源：Phase 6 需求评审中确定但推迟交付的能力。
> 详见 [Phase 6 需求说明 §6.3 + §6.7-6.8](./phase6-testing.md#63-需求列表) 完整定义和推迟原因。

下表显示 Phase 7 补完的需求与 Phase 6 来源的对应关系：

| Phase 7 需求 ID | Phase 6 来源 | 补完类型 | 详细需求摘要 | Issue |
|---|---|---|---|---|
| **PERF-K6-FR-001～003** | ENT-CONSISTENCY-01～05 | helpers 迁移 | `stress.k6.js` / `capacity.k6.js` / `soak.k6.js` 中替换内联漏斗逻辑为 `executeFunnel()` helper | [#116](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/116) |
| **PERF-K6-FR-004** | ENT-BREAKPOINT-02 | 输出分类 | breakpoint.k6.js 的 handleSummary 增强：输出 graceful/catastrophic 崩溃类型分类 | [#114](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/114) |
| **PERF-K6-FR-005** | ENT-RESILIENCE-03 | 测试脚本 | k6 脚本验证系统在持续超载后的恢复时间（graceful degradation vs cascading failure） | [#116](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/116) |
| **PERF-K6-FR-006～007** | Phase 6 SOAK-TC-04/05 | 集成验证 | InfluxDB + Grafana 集成验证，确认实时展示和告警规则 | [#108](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/108) |

**关联用户故事**：US-34/35/36（继承自 Phase 6，由 Phase 7 补完实现）

**详细需求对应**：详见 [Phase 6 §6.3.1～6.3.3](./phase6-testing.md#631-k6-脚本一致性重构entconsistency) 原始需求定义

## 7.4 Scope 确认

| 模块                                      | In Scope                                                                                  | Out of Scope                              |
| ----------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------- |
| **PERF-BL-FR 基线回归 + 历史趋势**        | CI artifact 存储 + JSON 对比 + 阈值判定 + trend.json + Markdown 趋势表 + Grafana 趋势面板 | 数据库存储、Web UI 仪表板                 |
| **PERF-COV-FR CI 覆盖率**                 | coverage gate + artifact upload                                                           | Codecov/Coveralls 集成                    |
| **PERF-OBS-FR Grafana 面板 + 告警**       | 错误分布 + 延迟热力图 + 自定义指标聚合 + webhook 告警                                     | 自定义 Grafana 插件、Slack/PagerDuty 集成 |
| **PERF-SCHED-FR 定时调度** ⚠️             | CI cron nightly soak + weekly capacity + artifact 归档（示范性，P3）                      | 外部调度平台 (Jenkins/Airflow)            |
| **PERF-K6-FR k6 脚本能力**               | funnel 迁移(stress/capacity/soak) + breakpoint graceful/catastrophic + 熔断恢复测试 + SOAK-TC-04/05 集成验证 | 重构原有 Phase 6 测试逻辑    |

## 7.5 可行性评估

| 维度                      | 评估                                                             | 结论                  |
| ------------------------- | ---------------------------------------------------------------- | --------------------- |
| CI baseline 对比 + 趋势   | GitHub Actions artifact 可跨 run 下载；trend.json 追加式收集     | ✅ 可行               |
| CI coverage gate          | Jest --coverage 内置阈值检查，CI 中直接 fail on threshold breach | ✅ 可行               |
| Grafana webhook + heatmap | alerting 原生支持 webhook；原生 heatmap panel，无需插件          | ✅ 可行               |
| CI cron 定时调度          | GitHub Actions schedule 支持 cron，但 Portfolio 无持久目标服务   | ⚠️ 有限可行（示范性） |

## 7.6 依赖识别

| 依赖                      | 说明                                              | 关联需求         | 状态                  |
| ------------------------- | ------------------------------------------------- | ---------------- | --------------------- |
| Phase 6 测试产出          | k6 JSON output、摘要报告                          | PERF-BL-FR       | Phase 6 交付          |
| actions/download-artifact | CI baseline 对比 + 趋势数据需跨 run 下载 artifact | PERF-BL-FR       | ✅ 已有 @v7           |
| Grafana webhook           | Docker Compose 中配置 contact point               | PERF-OBS-FR      | ✅ 已有 Grafana       |
| jq                        | CI 中解析 JSON baseline + trend                   | PERF-BL-FR       | ✅ GitHub runner 预装 |
| GitHub Actions schedule   | cron trigger，无需额外工具                        | PERF-SCHED-FR    | ✅ 已有               |

## 7.7 需求 Checklist

| #   | 检查项         | 状态                                                                                                                              |
| --- | -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 目标明确       | ✅ CI/CD + 可观测性，4 个维度                                                                                                     |
| 2   | 完整用户故事   | ✅ US-26/31/32/33/34/35/36                                                                                                        |
| 3   | Scope 已确认   | ✅ 5 个模块，明确 In/Out                                                                                                          |
| 4   | 可行性评估     | ✅ 4 项评估，1 项有限可行（PERF-SCHED-FR）                                                                                        |
| 5   | 依赖已识别     | ✅ 5 项依赖（含 Phase 6 前置）                                                                                                    |
| 6   | 需求已编号     | ✅ 5 组 22 条: PERF-BL-FR(6) + PERF-COV-FR(3) + PERF-OBS-FR(4) + PERF-SCHED-FR(2) + PERF-K6-FR(7)                              |
| 7   | 需求描述已写入 | ✅ 本文档 §7.1~7.6                                                                                                                |
