# diagnostics-log-triage-lab 架构文档

**Issue**: #838 · **PREQ**: PREQ-021 · **阶段**: Stage 2 — Design（2026-11-18，已按 Plan Review F01–F26 修订）

---

## 1. 数据流

```
 scenarios/*.json (手写场景, 含 expected_priority) ──┐
                                            seed ──► generator ──► trace.log (candump) + labels.json
                                                                       │
                ┌──────────────────────────────────────────────────────┴───────────────┐
                ▼                                                                      ▼
          can_parser  (DLT-02)                                              isotp + uds (DLT-04)
       CanFrame[] + ParseStats                                     UdsExchange[]（仅 0x7E0/0x7E8）
                │                                                                      │
                ▼                                                                      ▼
          can_rules (DLT-03)                                                 uds_rules (DLT-05)
                └──────────────────────────► Anomaly[] ◄───────────────────────────────┘
                                                │
                                   normalize → Event[] (DLT-06)
                                                │
                                templates (Drain, DLT-07) → template_id
                                                │
                                clustering (TF-IDF, DLT-08) → Cluster[]
                                                │
                     triage (DLT-09, triage_rules.json) → Incident[]
                        │                       │                         │
                        ▼                       ▼                         ▼
             llm (DLT-10, 可选)        regression (DLT-11)         metrics + report (DLT-12)
             摘要 / 根因假设           out/regression/*.py         report.md / report.json
```

- CLI（`src/cli.py`）与 API（`src/api.py`）都只调用 `pipeline.run()`，不各自实现逻辑
- **独立性**：`generator` 只读 `scenarios/`，`triage` 只读 `triage_rules.json`，两者互不 import（TC-GEN-06 静态检查）

---

## 2. 模块职责

| 模块 | 需求 | 职责 | 主要接口 |
|------|------|------|---------|
| `src/models.py` | — | 共享 dataclass（§3） | — |
| `src/generator.py` | DLT-01 | 按 DBC 周期生成帧 + UDS 会话（含 tester FC）；按场景注入故障与噪声；写 labels | `generate(seed, scenario, profile="dev") -> Dataset` |
| `src/can_parser.py` | DLT-02 | 逐行解析 candump；长度与 ID 校验；非法行计数不中断；DBC 解码 | `parse_candump(lines) -> ParseResult` |
| `src/can_rules.py` | DLT-03 | 5 条 CAN 规则，带优先顺序（§4.2）；DBC 外 ID 忽略 | `detect(frames, db) -> list[Anomaly]` |
| `src/isotp.py` | DLT-04 | SF / FF / CF 分段重组；FC 跳过；SN 0xF→0x0 回绕；序号错误检测；仅经典 CAN | `segment(payload)`、`reassemble(frames)` |
| `src/uds.py` | DLT-04 | `SimulatedEcu`（会话 / 安全状态机，§4.4）；trace 中请求 / 响应配对（排除 FC） | `SimulatedEcu.handle(req)`、`pair_exchanges(frames, trace_end)` |
| `src/uds_rules.py` | DLT-05 | 5 条 UDS 规则，最具体规则优先（§4.3） | `detect(exchanges, trace_end, cfg) -> list[Anomaly]` |
| `src/events.py` | DLT-06 | `Event` schema + 校验 | `Event`、`validate(dict)` |
| `src/normalize.py` | DLT-06 | `Anomaly` → `Event`，CAN / UDS 按 ts 合并 | `to_events(anomalies) -> list[Event]` |
| `src/templates.py` | DLT-07 | 简化 Drain（§3.2） | `TemplateMiner.add(msg) -> int` |
| `src/clustering.py` | DLT-08 | 对模板做 TF-IDF + 层次聚类（§3.3） | `cluster(events) -> list[Cluster]` |
| `src/triage.py` | DLT-09 | 规则表定 P1/P2（含升级条件）；回归候选 | `triage(clusters, rules) -> list[Incident]` |
| `src/llm.py` | DLT-10 | `SummaryBackend` 协议；`NullBackend` / `ClaudeBackend`（§5） | `get_backend() -> SummaryBackend` |
| `src/regression.py` | DLT-11 | Incident → 复现片段（§6.3）+ pytest 文件 + `conftest.py` | `write_tests(result, frames, out_dir) -> list[Path]` |
| `src/metrics.py` | DLT-12 | 按 §7 匹配并计算指标 | `evaluate(result, labels) -> Metrics` |
| `src/report.py` | DLT-12 | Markdown + JSON 报告 | `render(result, metrics, out_dir)` |
| `src/pipeline.py` | — | 编排解析 → 规则 → 标准化 → 模板 → 聚类 → 分流 → 摘要 | `run(trace_text, *, backend=None) -> TriageResult` |
| `src/api.py` | DLT-13 | `create_app()` 工厂；无磁盘副作用 | `POST /triage`、`GET /clusters`、`GET /health` |
| `src/cli.py` | DLT-14 | `generate` / `triage` / `demo` | `python -m src.cli demo` |
| `src/data/lab.dbc` | DLT-02 | 自制 DBC（3 条周期报文） | — |
| `src/data/triage_rules.json` | DLT-09 | 基础优先级、安全 ID、升级条件 | — |
| `src/data/uds_timing.json` | DLT-05 | P2 = 50 ms、P2* = 5000 ms、pending 上限 | — |
| `src/data/scenarios/*.json` | DLT-01 | 手写故障场景（`dev.json`、`eval.json`） | — |

`pipeline.run` 的 `backend=None` 时取 `get_backend()`。

---

## 3. 数据结构

### 3.1 dataclass（`src/models.py`）

```python
BusId = str                        # 统一为 "0x100" / "0x7E0" 格式（CAN ID 或 UDS 请求 ID）

@dataclass(frozen=True)
class CanFrame:
    line_no: int; ts: float; channel: str; can_id: int; data: bytes
    is_fd: bool = False; flags: int = 0; is_remote: bool = False
    is_error: bool = False; is_extended: bool = False

@dataclass(frozen=True)
class Anomaly:
    ts: float; source: Literal["CAN", "UDS"]; kind: str
    bus_id: BusId; signature: str       # 分类字段串，例 "sid=0x22 nrc=0x31"
    params: dict[str, str]              # 变量字段
    line_span: tuple[int, int]          # 证据帧首末行号

@dataclass(frozen=True)
class Event:                            # DLT-06 统一 schema
    event_id: str; ts: float; source: str; kind: str; bus_id: BusId
    signature: str; message: str        # "<KIND> id=<bus_id> <signature> <params>"
    params: dict[str, str]; line_span: tuple[int, int]
    template_id: int | None = None; cluster_id: int | None = None

@dataclass(frozen=True)
class Cluster:
    cluster_id: int; template_ids: list[int]; event_ids: list[str]

@dataclass(frozen=True)
class Hypothesis:
    text: str; evidence_event_ids: list[str]

@dataclass
class Incident:
    incident_id: str; cluster_id: int; kind: str; bus_id: BusId; signature: str
    priority: Literal["P1", "P2"]; count: int; first_ts: float; last_ts: float
    regression_candidate: bool; evidence: list[str]            # event_id
    summary: str | None = None; hypotheses: list[Hypothesis] = field(default_factory=list)
    summary_note: str | None = None                            # 例 "fallback: refusal"

@dataclass
class TriageResult:
    parse_stats: ParseStats; events: list[Event]; clusters: list[Cluster]
    incidents: list[Incident]; elapsed_s: float
```

一个 Cluster 内若含多个 `(kind, bus_id, signature)`，按组拆成多个 Incident（同簇 ID），保证每个 Incident 的故障身份唯一。

### 3.2 `Event.message` 与 Drain

格式：`<KIND> id=<bus_id> <分类字段...> <变量字段...>`，例如
`UDS_NRC id=0x7E0 sid=0x22 nrc=0x31 name=requestOutOfRange did=0xF190`。

| 字段类别 | 键 | Drain 处理 |
|---------|----|-----------|
| 分类（故障身份） | `id`、`sid`、`nrc`、`name`、`signal`、`sub` | 不通配 |
| 变量（参数） | `did`、`expected`、`actual`、`level`、`value`、`gap_ms`、`count`、`dur_ms` | 掩码为 `<*>` |

Drain：按 `(token 数, 首 token)` 分桶，桶内相似度 ≥ 0.6 合并；分类字段不同时相似度直接记 0。

### 3.3 TF-IDF 层的作用

同一故障可能产出 token 数不同的消息，例如：

- `CAN_COUNTER_JUMP id=0x101 expected=4 actual=6`
- 在回绕附近多带一个 `gap_ms=` 字段

这两种消息落进 Drain 的不同桶，成为两个模板。TF-IDF（token 含 `key=value` 分类字段）+ 层次聚类（cosine，average，阈值 0.3）把它们合并为一簇；分类字段不同的模板余弦距离大，不会被合并。TC-CL-03 用固定样本验证这一合并。

### 3.4 `labels.json`

```json
{
  "meta": {"seed": 1001, "profile": "eval", "duration_s": 60,
           "total_lines": 5321, "invalid_line_nos": [812, 2044]},
  "faults": [
    {"fault_id": "F007", "kind": "UDS_NRC", "bus_id": "0x7E0",
     "signature": "sid=0x22 nrc=0x31", "t_start": 12.34, "t_end": 12.36,
     "expected_priority": "P2"}
  ]
}
```

UDS 故障的 `bus_id` 一律用请求 ID（`0x7E0`）。

---

## 4. 规则

### 4.1 故障类型与默认分流（`triage_rules.json`）

| kind | 检测条件 | 基础优先级 | 升级为 P1 |
|------|---------|-----------|----------|
| `CAN_CYCLE_LOSS` | 间隔 > 周期 × 2.5 | P2 | `bus_id` ∈ 安全 ID（0x100、0x200） |
| `CAN_DLC_MISMATCH` | 数据字节数 ≠ DBC 长度 | P2 | — |
| `CAN_SIGNAL_OUT_OF_RANGE` | 解码值超出 DBC min/max | P2 | 安全 ID 且 1 s 内 ≥ 3 次 |
| `CAN_ERROR_FRAME` | `CAN_ERR_FLAG` 置位 | P2 | 1 s 内 ≥ 3 次（burst） |
| `CAN_COUNTER_JUMP` | alive counter ≠ 上一帧 + 1 (mod 16) | P2 | — |
| `UDS_NRC` | 负响应（0x78、0x35、0x36 除外） | P2 | — |
| `UDS_P2_TIMEOUT` | §4.3 | P1 | — |
| `UDS_PENDING_LOOP` | 0x78 连续 > 5 次 | P1 | — |
| `UDS_SECURITY_FAIL` | 0x27 收到 NRC 0x35 / 0x36 | P2 | NRC 0x36（exceededNumberOfAttempts） |
| `ISOTP_SEQUENCE_ERROR` | CF 序号不连续 | P2 | — |

**回归候选**：`priority == "P1"` 或 `count >= 2`。

### 4.2 CAN 规则顺序（避免一个故障产出多条告警）

| 顺序 | 条件 | 处理 |
|------|------|------|
| 1 | ID 不在 DBC 中 | 忽略（0x7E0 / 0x7E8 交给 isotp） |
| 2 | error frame | 产出 `CAN_ERROR_FRAME`，不进入后续检查 |
| 3 | DLC 不符 | 产出 `CAN_DLC_MISMATCH`，跳过该帧的信号与计数器检查 |
| 4 | 与上一帧间隔 > 周期 × 2.5 | 产出 `CAN_CYCLE_LOSS`；间隔 > 周期 × 1.5 时跳过该帧计数器检查 |
| 5 | 信号越界、计数器跳变 | 正常检查 |

### 4.3 UDS 规则（一个 exchange 至多一条 Anomaly，最具体者优先）

| 优先 | kind | 条件 |
|------|------|------|
| 1 | `ISOTP_SEQUENCE_ERROR` | 响应重组失败 |
| 2 | `UDS_SECURITY_FAIL` | SID 0x27 且 NRC ∈ {0x35, 0x36} |
| 3 | `UDS_PENDING_LOOP` | 0x78 连续 > 5 次（不论结局） |
| 4 | `UDS_P2_TIMEOUT` | 无 0x78 时 P2 内无响应；或最后一个 0x78 后 P2* 内无最终响应 |
| 5 | `UDS_NRC` | 其余负响应 |

- 子功能 bit 7（suppressPosRspMsgIndicationBit）置位的请求不检查超时
- 仅当 `trace_end − 截止时刻 > 0` 时才判超时（trace 末尾的请求不误报）
- P2 / P2* / pending 上限在 `uds_timing.json`

### 4.4 SimulatedEcu

| SID | 正响应 | NRC 路径（测试用） | 前置状态 |
|-----|--------|-------------------|---------|
| 0x10 | `50 xx` + P2 / P2* | 0x12 不支持的子功能 | — |
| 0x22 | `62 DID data` | 0x31 未知 DID | — |
| 0x27 | `67 01 seed` / `67 02` | 0x35 错误 key；3 次后 0x36；0x24 顺序错误 | 扩展会话 |
| 0x2E | `6E DID` | 0x33 未解锁；0x22 默认会话 | 扩展会话 + 已解锁 |
| 0x19 | `59 02 ...`（可多帧） | 0x12 不支持的子功能 | — |
| 0x3E | `7E 00`；`3E 80` 不响应 | 0x13 长度错误 | — |

状态机：`default → extended (10 03) → unlocked (27 01/02)`；S3 超时不模拟。UDS 只走经典 CAN（不使用 CAN FD SF 转义）。

### 4.5 candump 校验

| 检查 | 非法条件 |
|------|---------|
| ID | 3 位 hex > 0x7FF；8 位 hex 视为扩展帧（`CAN_ERR_FLAG` 置位则为 error frame） |
| 经典帧长度 | > 8 字节或 hex 位数为奇数 |
| FD 帧长度 | 不在 {0–8, 12, 16, 20, 24, 32, 48, 64} |
| 其他 | 不匹配正则 |

---

## 5. 可选 LLM 后端（DLT-10）

| 项 | 设计 |
|----|------|
| 启用条件 | 设置 `ANTHROPIC_API_KEY` 且 `DLT_LLM` ≠ `off`；否则 `NullBackend` |
| 接口 | `summarize(incident, events) -> SummaryResult(summary, hypotheses, note)`；两种后端签名一致 |
| 模型 | `claude-opus-5-5`，`output_config.effort="low"` |
| 调用 | `client.beta.messages.parse(..., output_format=TriageSummary, betas=["server-side-fallback-2026-07-01"], fallbacks="default")` |
| 客户端 | `anthropic.Anthropic(timeout=30, max_retries=1)` |
| 范围 | 只对按优先级排序的前 10 个 Incident 调用 |
| 降级 | `APIConnectionError` / `APIStatusError` / `stop_reason == "refusal"` / `parsed_output is None` → `NullBackend` 结果 + `summary_note` |
| 测试 | 构造函数注入假 client；CI 设置 `DLT_LLM=off` |
| 指标 | 只写 `summary` / `hypotheses` / `summary_note`，不影响 priority、cluster、Metrics |

---

## 6. 接口

### 6.1 CLI

| 命令 | 作用 |
|------|------|
| `python -m src.cli generate --seed 42 --profile dev --out out/` | 生成 `trace.log` + `labels.json` |
| `python -m src.cli triage out/trace.log --labels out/labels.json --out out/` | 分流、报告、回归模板 |
| `python -m src.cli demo` | 上面两步 + 以子进程运行生成的回归模板 |

`demo` 运行回归模板：`[sys.executable, "-m", "pytest", out/regression, "-p", "no:cacheprovider", "-q"]`，`cwd=PROJECT_ROOT`，环境变量 `PYTHONPATH=PROJECT_ROOT`、`DLT_LLM=off`。

### 6.2 API（端口 3030）

| 方法 | 路径 | 请求 | 响应 |
|------|------|------|------|
| GET | `/health` | — | `{"status": "ok"}` |
| POST | `/triage` | `{"trace": "<candump 文本>"}` | `TriageResult` JSON（`incidents[]`、`clusters[]`、`parse_stats`）；空 → 422；`Content-Length` 或 `len(trace)` > 5 MB → 413 |
| GET | `/clusters` | — | 当前 app 实例最近一次结果的 `clusters[]`；无 → 404 |

`create_app()` 每次返回新实例和独立状态；`/triage` 不写磁盘。

### 6.3 回归模板与复现片段

| kind | 复现片段 |
|------|---------|
| CAN 类 | 同 `bus_id` 的帧，时间窗 `[first_ts − 3×周期, last_ts + 3×周期]` |
| UDS 类 | 完整 exchange（含 FC、全部 0x78）+ 尾部 P2 / P2* + 10 ms 的空白（用一帧无关 DBC 帧标记 `trace_end`） |

生成文件：

```python
# out/regression/test_reg_c003_uds_nrc.py — 自动生成，勿手改
"""Regression: incident C003-0 / UDS_NRC id=0x7E0 sid=0x22 nrc=0x31 (P2, 4 occurrences)."""
from src.pipeline import run
from src.llm import NullBackend

TRACE = """..."""

def test_reg_c003_0_detected():
    got = {(i.kind, i.bus_id, i.signature) for i in run(TRACE, backend=NullBackend()).incidents}
    assert ("UDS_NRC", "0x7E0", "sid=0x22 nrc=0x31") in got
```

同目录写 `conftest.py`，把项目根加入 `sys.path`（直接运行 `pytest out/regression` 也能找到 `src`）。

---

## 7. 匹配与指标口径（`metrics.py`）

| 步骤 | 规则 |
|------|------|
| Event ↔ 故障 | `kind`、`bus_id`、`signature` 相等，且 `ts ∈ [t_start − tol, t_end + tol]`；多个候选时取 `t_start` 最近者；每个 Event 至多匹配 1 个故障 |
| 容差 `tol` | CAN：该 ID 周期 × 3；UDS_NRC / SECURITY / ISOTP：P2；P2_TIMEOUT / PENDING_LOOP：P2* |
| Incident ↔ 故障 | Incident 的故障集 = 其 evidence Event 所匹配故障的并集 |
| 召回率 | 至少被 1 个 Event 匹配的故障 / 全部故障 |
| 误报率 | 故障集为空的 Incident / 全部 Incident |
| 分流准确率 | 故障集非空的 Incident 中，`priority` = 故障集 `expected_priority` 多数值（平票取 P1）的比例 |
| 聚类 | 以故障的 `(kind, bus_id, signature)` 为真值标签，对已匹配 Event 计算 homogeneity / completeness / V-measure（`sklearn.metrics`）；purity 同时报告 |
| 一个故障被拆成多个 Incident | 每个 Incident 各自计入准确率；completeness 下降反映拆分 |
| 解析成功率 | 成功解析行 / (`total_lines` − `len(invalid_line_nos)`) |
| 非法行计数 | `stats.invalid == len(invalid_line_nos)` 且行号一致 |
| 回归覆盖率 | 生成且运行通过的模板 / 回归候选 Incident |

**独立性（RISK-01）**：`expected_priority` 由人手写在 `scenarios/*.json`，不来自 `triage_rules.json`。场景含上下文相关用例（非安全 ID 周期丢失、单次 vs burst error frame、0x35 vs 0x36）。另有手写对抗样本 `tests/fixtures/adversarial/`（trace + labels 均手写）。报告中该指标标注为「合成场景上的分流一致性」。

---

## 8. 生成 profile

| profile | seed | 抖动 | 故障密度 | 额外噪声 |
|---------|------|------|---------|---------|
| `dev` | 42 | ±10% 周期 | 每类 2–4 次 | 单次 0x78 后正响应 |
| `eval` | 1001–1005 | ±20% 周期 | 每类 1–6 次 | + DBC 外 ID 帧、截断行、重复行、`3E 80` 无响应 |

规则调参只看 `dev`；`eval` 只在集成测试中运行。

---

## 9. 设计决策

| # | 决策 | 理由 |
|---|------|------|
| AD-01 | candump 自写正则逐行解析，不依赖 `python-can` | PoC-3：`python-can` 读取器遇非法行抛 `ValueError` 中断，不满足 DLT-02 |
| AD-02 | Drain 自写，不用 `drain3` | PoC-1：两者在不区分字段时都会合并不同故障；`drain3` 依赖旧版 `jsonpickle` / `cachetools` 并要求配置文件 |
| AD-03 | ISO-TP 自写，不用 `can-isotp` | PoC-2：被动重组 + 序号检测约 30 行 |
| AD-04 | 模板层层次聚类（距离阈值），不逐事件聚类、不用 KMeans | PoC-4：逐事件 450 条 1.3 s，模板层约 70 ms；无需预设簇数，结果确定 |
| AD-05 | 分流规则、UDS 时序外置 JSON | 可评审、可单测 |
| AD-06 | 场景手写 + dev / eval profile 分离 + 对抗样本 | 缓解 RISK-01（Plan Review F04） |
| AD-07 | 保留服务端 `fallbacks` | Claude API 现行建议对 `claude-opus-5-5` 默认开启；已有本地回退兜底；评审 F19 建议去掉，未采纳 |

---

## 10. PoC 记录（2026-11-18，Python 3.13 临时 venv，代码不入库）

| PoC | 输入 | 结果 |
|-----|------|------|
| 1 Drain | 9 行 CAN / UDS 异常 | 自写版未区分字段时把 DLC 不符并入周期丢失；`drain3` 0.9.11 把 NRC 行的 `did` / `ecu` 混为 `<*>`。改为分类字段不通配后，5 类故障各成一个模板 |
| 2 ISO-TP | 0x22 F190 正响应 20 字节 | FF + 2 CF，重组一致；删掉第 1 个 CF 后报序号错误 |
| 3 candump | 5 行（经典 / FD / RTR / 非法 / 诊断） | `python-can` 4.6.1 读到第 4 行抛 `ValueError` 中断；自写正则 4 行成功、1 行非法计数 |
| 4 聚类 | TF-IDF + Agglomerative | 3 次运行标签一致；阈值 0.3 下 5 个模板分为 5 簇，0.5 时 DLC 不符与计数器跳变合并 |
| 5 SDK | `anthropic==2.10.0` 离线 | `beta.messages.parse` 接受 `output_format` / `output_config` / `betas` / `fallbacks`；异常类存在；无网络时抛 `APIConnectionError` |
| 6 依赖解析 | pip dry-run，Linux x86_64 | 3.11 → numpy 2.4.6 / scipy 1.17.1；3.12 → 2.5.5 / 1.18.1；直接依赖均可装 |
