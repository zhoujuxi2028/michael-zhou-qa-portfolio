# Implementation Plan — diagnostics-log-triage-lab Stage 2

**Issue**: [#838](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/838) · **PREQ**: PREQ-021
**Branch**: `feature/838-diag-log-triage` · **Date**: 2026-11-18
**设计依据**: [architecture.md](../architecture/architecture.md)、[test-plan.md](../qa/test-plan.md)、[risks.md](risks.md)

---

## Prerequisites

| 工具 | 版本 | 验证命令 |
|------|------|---------|
| Python（本地） | 3.13 | `python3.13 --version` |
| Python（CI） | 3.11 / 3.12 | workflow matrix |
| make | 任意 | `make --version` |
| `ANTHROPIC_API_KEY` | 不需要 | 仅手动体验 DLT-10 时设置 |

---

## 依赖（`requirements.txt`）

只精确锁定直接依赖；numpy / scipy 由 scikit-learn 约束解析（RISK-09，已 dry-run 验证 3.11 与 3.12，见 architecture §10 PoC-6）。

```text
cantools==45.2.0
scikit-learn==1.9.1
fastapi==0.163.2
uvicorn==0.54.0
httpx==0.28.1
pydantic==2.14.3
anthropic==2.10.0
pytest==9.2.0
pytest-cov==7.1.0
black==26.10.1
isort==9.0.2
flake8==7.5.0
```

---

## 目录结构

```
diagnostics-log-triage-lab/
├── src/
│   ├── __init__.py
│   ├── models.py  generator.py  can_parser.py  can_rules.py
│   ├── isotp.py  uds.py  uds_rules.py  events.py  normalize.py
│   ├── templates.py  clustering.py  triage.py  llm.py
│   ├── regression.py  metrics.py  report.py  pipeline.py  api.py  cli.py
│   └── data/
│       ├── lab.dbc  triage_rules.json  uds_timing.json
│       └── scenarios/  dev.json  eval.json
├── tests/
│   ├── __init__.py
│   ├── conftest.py            # DLT_LLM=off、tmp 输出目录
│   ├── fixtures/adversarial/  # 手写 trace.log + labels.json
│   ├── unit/                  # __init__.py + test_<module>.py（含 test_api.py、test_cli.py）
│   └── integration/           # __init__.py + test_pipeline.py、test_demo.py
├── out/                       # 运行产物（.gitignore）
├── requirements.txt  pytest.ini  Makefile  .gitignore  .python-version
```

`pytest.ini`：

```ini
[pytest]
testpaths = tests
pythonpath = .
norecursedirs = out venv .git
markers =
    integration: integration tests (eval thresholds, demo)
addopts = -v --tb=short
```

---

## 关键模块示例

### DBC（`src/data/lab.dbc`）

| Message | ID | 周期 | 长度 | 信号 | 安全相关 |
|---------|----|------|------|------|---------|
| VehicleDynamics | 0x100 | 20 ms | 8 | `VehicleSpeed` 0–300 km/h、`AliveCounter` 0–15 | ✅ |
| BodyStatus | 0x101 | 100 ms | 8 | `DoorState` 0–3、`AliveCounter` 0–15 | — |
| AdasObject（CAN FD） | 0x200 | 50 ms | 64 | `ObjDistance` 0–250 m | ✅ |

诊断：tester `0x7E0` → ECU `0x7E8`，经典 CAN。

### candump 解析

```python
LINE = re.compile(
    r"^\((?P<ts>\d+\.\d+)\)\s+(?P<ch>\S+)\s+(?P<id>[0-9A-Fa-f]{3}|[0-9A-Fa-f]{8})"
    r"#(?:#(?P<flags>[0-9A-Fa-f])(?P<fdata>[0-9A-Fa-f]*)|(?P<rtr>R\d?)|(?P<data>[0-9A-Fa-f]*))$"
)
CAN_ERR_FLAG = 0x20000000
FD_LENGTHS = frozenset([*range(9), 12, 16, 20, 24, 32, 48, 64])

def parse_candump(lines: Iterable[str]) -> ParseResult:
    frames, stats = [], ParseStats()
    for line_no, raw in enumerate(lines, start=1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        stats.total += 1
        frame = _parse_line(line_no, line)      # 正则 + architecture §4.5 校验，失败返回 None
        if frame is None:
            stats.invalid_line_nos.append(line_no)
            continue
        frames.append(frame)
    return ParseResult(frames, stats)
```

### Drain

```python
CATEGORICAL_KEYS = frozenset({"id", "sid", "nrc", "name", "signal", "sub"})

class TemplateMiner:
    def __init__(self, sim_threshold: float = 0.6): ...
    def add(self, message: str) -> int:
        tokens = [_mask(t) for t in message.split()]    # 非分类字段的值 → <*>
        bucket = self._tree.setdefault((len(tokens), tokens[0]), [])
        # 相似度：分类 token 有任何不同 → 0；否则为相同 token 占比
        # 最高相似度 >= 阈值则合并（不同位置置 <*>），否则新建模板
```

### 可选 Claude 后端

```python
class TriageSummary(BaseModel):
    summary: str
    hypotheses: list[HypothesisModel]     # text + evidence_event_ids

class SummaryBackend(Protocol):
    def summarize(self, incident: Incident, events: list[Event]) -> SummaryResult: ...

class ClaudeBackend:
    MODEL = "claude-opus-5-5"

    def __init__(self, client: anthropic.Anthropic | None = None):
        self._client = client or anthropic.Anthropic(timeout=30, max_retries=1)

    def summarize(self, incident, events):
        try:
            resp = self._client.beta.messages.parse(
                model=self.MODEL, max_tokens=2000,
                output_config={"effort": "low"},
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": _render(incident, events)}],
                output_format=TriageSummary,
            )
        except (anthropic.APIConnectionError, anthropic.APIStatusError) as e:
            return NullBackend().summarize(incident, events).with_note(f"fallback: {type(e).__name__}")
        if resp.stop_reason == "refusal" or resp.parsed_output is None:
            return NullBackend().summarize(incident, events).with_note("fallback: refusal/empty")
        return SummaryResult.from_parsed(resp.parsed_output)

def get_backend() -> SummaryBackend:
    if os.getenv("DLT_LLM", "").lower() == "off" or not os.getenv("ANTHROPIC_API_KEY"):
        return NullBackend()
    return ClaudeBackend()
```

- `pipeline.run` 只对按优先级排序的前 10 个 Incident 调用 `summarize`
- `max_tokens=2000`：摘要很短；截断时 `parsed_output` 为 None，走回退
- `RateLimitError` 是 `APIStatusError` 子类，不单独捕获

### 回归模板

见 [architecture §6.3](../architecture/architecture.md#63-回归模板与复现片段)：测试调用 `run(TRACE, backend=NullBackend())`，断言 `(kind, bus_id, signature)`；同目录写 `conftest.py` 插入项目根路径。

---

## 任务拆分（TDD 顺序）

每个 Task 先提交失败测试再提交实现（或在同一 commit 中保留 red → green 记录），subject 形如 `feat(diag-lab): add candump parser (#838)`，用 `bash scripts/check-commit-guard.sh` 预检。

| Task | 需求 | 内容 | 用例 | 预估 |
|------|------|------|------|------|
| T01 | — | `requirements.txt`、`pytest.ini`、`Makefile`、`.gitignore`、`.python-version`、`tests/` 骨架、`models.py`、JSON 配置文件 | — | 30 min |
| T02 | DLT-02 | `lab.dbc` + `can_parser.py` | TC-CP-* | 60 min |
| T03 | DLT-03 | `can_rules.py`（含规则顺序） | TC-CR-* | 75 min |
| T04 | DLT-04 | `isotp.py` | TC-TP-* | 30 min |
| T05 | DLT-04 | `uds.py`（SimulatedEcu 状态机 + 配对） | TC-UDS-* | 90 min |
| T06 | DLT-05 | `uds_rules.py` + `uds_timing.json` | TC-UR-* | 60 min |
| T07 | DLT-01 | `scenarios/*.json`（手写）+ `generator.py`（dev / eval profile） | TC-GEN-* | 90 min |
| T08 | DLT-06 | `events.py` + `normalize.py` | TC-EV-* | 30 min |
| T09 | DLT-07/08 | `templates.py` + `clustering.py` | TC-TM-*、TC-CL-* | 60 min |
| T10 | DLT-09 | `triage_rules.json` + `triage.py` + `pipeline.py`；**末尾跑 seed 42 smoke** | TC-TR-* | 60 min |
| T11 | DLT-10 | `llm.py` | TC-LLM-* | 45 min |
| T12a | DLT-11 | `regression.py`（复现片段 + 模板 + conftest） | TC-RG-* | 75 min |
| T12b | DLT-12 | `metrics.py`（§7 匹配）+ `report.py` | TC-MT-*、TC-RP-* | 75 min |
| T13 | DLT-13/14 | `api.py`、`cli.py`；根目录 CLAUDE.md 端口表加 3030 | TC-API-*、TC-CLI-01 | 60 min |
| T14 | DLT-01~12 | 对抗样本 fixtures + 集成测试 | TC-INT-* | 60 min |
| T15 | DLT-15 | CI workflow；根目录 **CLAUDE.md 与 README.md** 的 workflow 表各加一行 | CI 绿灯 | 45 min |

合计约 15.5 h。

---

## Makefile（Stage 3 按 tab 缩进写入）

| target | 命令 |
|--------|------|
| `install` | `pip install -r requirements.txt` |
| `lint` | `black --check src/ tests/`；`isort --check-only src/ tests/`；`flake8 src/ tests/ --max-line-length=120 --extend-ignore=E203` |
| `test` | `pytest tests/unit/ --cov=src --cov-report=term-missing --cov-fail-under=85` |
| `integration` | `pytest tests/integration/ -m integration` |
| `demo` | `DLT_LLM=off python -m src.cli demo --seed 42 --out out/` |
| `serve` | `uvicorn src.api:app --port 3030`（`app = create_app()`） |
| `ci` | `lint test integration demo` |

---

## CI Workflow 设计

`.github/workflows/diag-log-triage-ci.yml`，名称 `Diagnostics Log Triage CI`：

| Job id | 显示名 | Python | 内容 |
|--------|--------|--------|------|
| `code-quality` | `Diagnostics Log Triage / Code Quality` | 3.12 | black、isort、flake8（与 Python 版本无关，单版本即可） |
| `unit-tests` | `Diagnostics Log Triage / Unit Tests` | 3.11 / 3.12 | `make test`（覆盖率门禁 85%） |
| `integration` | `Diagnostics Log Triage / Integration` | 3.11 / 3.12 | `make integration` + `make demo`；`if: always()` 上传 `out/` artifact |

- Actions 版本与仓库现有 workflow 一致：`actions/checkout@v7`、`actions/setup-python@v7`（含 pip 缓存）、`actions/upload-artifact@v7`
- `paths` 过滤：本项目目录与该 workflow 文件
- `env: DLT_LLM: "off"`；不配置任何 secret

---

## 端口与文档同步

| 项 | 内容 | 时机 |
|----|------|------|
| 端口 3030 | 根目录 CLAUDE.md 端口表新增一行 | T13 |
| Workflow 表 | 根目录 CLAUDE.md **和** README.md 各加 `diag-log-triage-ci.yml`（`check-workflow-doc-sync.sh` 同时检查两者） | T15 |
| Projects 表 / 根 README 项目列表 | 注册项目 | Stage 5 |
| 示例报告 | seed 42 的 `report.md` / `report.json` 提交到 `docs/qa/reports/` | Stage 5 |

---

## PoC 结果

见 [architecture.md §10](../architecture/architecture.md#10-poc-记录2026-11-18python-313-临时-venv代码不入库)。PoC 1–6 已全部完成，无遗留未验证的高风险决策。

---

## Plan Review 记录（2026-11-18，code-reviewer 子 agent）

结论：Approve with fixes。共 26 条（Critical 4 / Important 11 / Minor 11），处理如下：

| ID | 级别 | 问题 | 处理 | 位置 |
|----|------|------|------|------|
| F01 | Critical | 回归模板调用 `run(TRACE)` 缺 backend；Incident 无 `signature` | `backend=None` 默认；Incident 增加 `bus_id`、`signature` | ARCH §2、§3.1、§6.3 |
| F02 | Critical | 生成的测试找不到 `src` | pytest.ini `pythonpath = .` / `norecursedirs`；demo 以子进程 + `cwd` + `PYTHONPATH` 运行；生成 conftest；`tests/__init__.py` | 本文、ARCH §6.1/§6.3 |
| F03 | Critical | 匹配规则未定义；`bus_id` 类型不一致 | 新增匹配与指标口径；`BusId = str`；UDS 用请求 ID | ARCH §3.1、§3.4、§7；TC-MT-02~05 |
| F04 | Critical | 分流准确率自证（expected_priority 来自同一规则表） | 场景手写 + 上下文相关升级规则 + 对抗样本 + eval profile 扰动；TC-GEN-06 检查独立性 | ARCH §4.1、§7、§8、AD-06；TC-INT-04 |
| F05 | Important | 一个故障触发多条 CAN 告警 | CAN 规则顺序与抑制 | ARCH §4.2；TC-CR-11/12 |
| F06 | Important | 0x35 / 0x36 同时触发 NRC 与 SECURITY | 每个 exchange 至多一条，最具体优先 | ARCH §4.3；TC-UR-13 |
| F07 | Important | `3E 80` 与 trace 末尾误报超时 | 抑制位不检查；末尾判定条件 | ARCH §4.3；TC-UR-09/12 |
| F08 | Important | PENDING_LOOP 总时长条件错误；P2* 无测试 | 只按次数判循环；P2* 超时归入 P2_TIMEOUT | ARCH §4.3；TC-UR-10/11 |
| F09 | Important | FC 处理与 SN 回绕 | 生成器发 FC；配对排除 FC；仅经典 CAN | ARCH §2、§4.4；TC-TP-04/05、TC-GEN-08 |
| F10 | Important | 帧长度 / ID 范围未校验；缺 `flags` 字段 | 校验表；`flags`、`is_extended` 字段 | ARCH §3.1、§4.5；TC-CP-07~09 |
| F11 | Important | labels 缺行级元数据 | `labels.meta` | ARCH §3.4；TC-GEN-05/07 |
| F12 | Important | purity 近乎必然为 1；TF-IDF 价值未体现 | 改用 homogeneity / completeness / V-measure；说明并测试 TF-IDF 合并场景 | ARCH §3.3、§7；TC-CL-03 |
| F13 | Important | 覆盖率门禁只算单元层但 API / CLI 只在集成层 | API / CLI 测试移到单元层 | test-plan 策略表 |
| F14 | Important | T15 未同步根 README → doc-sync 检查失败 | T15 同时改 CLAUDE.md 与 README.md（已核实脚本第 46、51 行） | 本文 T15 |
| F15 | Important | 复现片段未定义；T12 过大 | 定义时间窗；拆成 T12a / T12b | ARCH §6.3；本文 |
| F16 | Minor | 服务与 NRC 未对应；缺状态机、0x36 | §4.4 表 + 状态机 | ARCH §4.4；TC-UDS-14~16、TC-UR-14 |
| F17 | Minor | error frame 缺负例 | 增加 | TC-CR-10 |
| F18 | Minor | LLM 拒答 / 开关 / 指标不变未测 | 增加 | TC-LLM-04~07 |
| F19 | Minor | 类型不一致；无超时；可去掉服务端 fallback | 类型对齐；`timeout=30, max_retries=1`；限 10 个 Incident；**服务端 fallback 保留**（AD-07） | ARCH §5、AD-07 |
| F20 | Minor | 413 需显式检查；全局状态；副作用 | 显式长度检查；`create_app()`；不写磁盘 | ARCH §6.2；TC-API-07 |
| F21 | Minor | pydantic 未锁；需求依赖表不全 | 已加入依赖块；需求表指向本文 | 本文、requirements |
| F22 | Minor | CI matrix 不一致；artifact 条件；Actions 版本 | 显式 matrix；`if: always()`；与仓库一致用 @v7 | 本文 CI 节 |
| F23 | Minor | Makefile 写法会被误解析 | 改为表格，Stage 3 用 tab 写入 | 本文 |
| F24 | Minor | 生成数据到 T14 才接入 pipeline | T10 末尾 seed 42 smoke | TC-TR-04 |
| F25 | Minor | 仓库中看不到示例输出 | Stage 5 提交示例报告 | 本文文档同步表 |
| F26 | Minor | DBC 外 ID 行为未定义 | 忽略；0x7E0/0x7E8 交给 isotp | ARCH §4.2；TC-CR-13 |
