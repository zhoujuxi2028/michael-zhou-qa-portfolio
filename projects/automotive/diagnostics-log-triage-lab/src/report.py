"""Markdown + JSON triage 报告（DLT-12）。"""

from __future__ import annotations

import json
from collections.abc import Sequence
from dataclasses import asdict
from pathlib import Path

from src.metrics import MANUAL_MIN_PER_INCIDENT, Metrics
from src.models import TriageResult

DISCLAIMER = "> 本报告基于**合成数据**（simulation lab），不代表实车、台架或量产 ECU 结果。"


def result_to_dict(result: TriageResult) -> dict:
    s = result.parse_stats
    return {
        "parse_stats": {"total": s.total, "ok": s.ok, "invalid": s.invalid, "invalid_line_nos": s.invalid_line_nos},
        "events": [
            {
                "event_id": e.event_id,
                "ts": e.ts,
                "source": e.source,
                "kind": e.kind,
                "bus_id": e.bus_id,
                "signature": e.signature,
                "template_id": e.template_id,
                "cluster_id": e.cluster_id,
            }
            for e in result.events
        ],
        "clusters": [asdict(c) for c in result.clusters],
        "incidents": [asdict(i) for i in result.incidents],
        "elapsed_s": result.elapsed_s,
        "trace_end": result.trace_end,
    }


def _pct(x: float | None) -> str:
    return "—" if x is None else f"{x:.1%}"


def _markdown(result: TriageResult, m: Metrics | None, regression_files: Sequence[Path]) -> str:
    s = result.parse_stats
    out = ["# Diagnostics Log Triage Report", "", DISCLAIMER, ""]
    out += ["## 解析统计", "", "| 项 | 值 |", "|----|----|"]
    out += [f"| 总行数 | {s.total} |", f"| 成功解析 | {s.ok} |", f"| 非法行 | {s.invalid} |", ""]

    out += ["## Incident 分流", "", "| ID | 优先级 | kind | bus | signature | 次数 | 回归候选 | 摘要 |"]
    out += ["|----|--------|------|-----|-----------|------|----------|------|"]
    for i in result.incidents:
        summary = (i.summary or "").replace("|", "/")
        if i.summary_note:
            summary += f"（{i.summary_note}）"
        out.append(
            f"| {i.incident_id} | {i.priority} | `{i.kind}` | {i.bus_id} | {i.signature or '—'} | {i.count} | "
            f"{'✅' if i.regression_candidate else '—'} | {summary} |"
        )
    out.append("")

    multi = [c for c in result.clusters if len(c.template_ids) > 1]
    out += ["## 聚类", "", f"- 事件 {len(result.events)} 条 → 簇 {len(result.clusters)} 个"]
    out += [f"- 多模板簇（TF-IDF 合并的可选字段变体）：{len(multi)} 个", ""]

    out += ["## 指标", ""]
    if m is None:
        out += ["未提供 labels，跳过指标计算。", ""]
    else:
        out += ["| 指标 | 值 |", "|------|----|"]
        rows = [
            ("故障召回率", _pct(m.recall)),
            ("误报率", _pct(m.false_positive_rate)),
            ("分流准确率（合成场景上的分流一致性）", _pct(m.triage_accuracy)),
            ("Cluster homogeneity / completeness", f"{m.homogeneity:.3f} / {m.completeness:.3f}"),
            ("解析成功率", _pct(m.parse_success_rate)),
            ("非法行计数一致", "✅" if m.invalid_lines_exact else "❌"),
            ("回归覆盖率", _pct(m.regression_coverage)),
        ]
        out += [f"| {k} | {v} |" for k, v in rows] + [""]

    manual = len(result.incidents) * MANUAL_MIN_PER_INCIDENT
    out += ["## 耗时对比", "", "| 方式 | 耗时 |", "|------|------|"]
    out += [f"| 自动（实测） | {result.elapsed_s:.2f} s |"]
    out += [f"| 人工（估算：每条 Incident {MANUAL_MIN_PER_INCIDENT} 分钟） | {manual} min |", ""]

    if regression_files:
        out += ["## 回归模板", ""] + [f"- `{p.name}`" for p in regression_files] + [""]
    return "\n".join(out)


def render(
    result: TriageResult,
    metrics: Metrics | None,
    out_dir: str | Path,
    regression_files: Sequence[Path] = (),
) -> tuple[Path, Path]:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    data = result_to_dict(result) | {"metrics": None if metrics is None else metrics.to_dict()}
    js = out / "report.json"
    js.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    md = out / "report.md"
    md.write_text(_markdown(result, metrics, regression_files), encoding="utf-8")
    return md, js
