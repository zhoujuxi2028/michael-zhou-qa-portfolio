"""模板层 TF-IDF + 层次聚类（DLT-08，architecture §3.3 / AD-04 / AD-08）。

故障身份（KIND + 分类字段）不同的模板距离固定为 1.0，不允许合并；
TF-IDF 只决定同一身份下的可选字段变体是否合并为同一簇。
"""

from __future__ import annotations

from dataclasses import dataclass, replace

import numpy as np
from sklearn.cluster import AgglomerativeClustering
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_distances

from src.models import Cluster, Event
from src.templates import TemplateMiner, identity

DISTANCE_THRESHOLD = 0.3


@dataclass
class ClusterResult:
    events: list[Event]
    clusters: list[Cluster]
    templates: list[str]


def _template_labels(templates: list[str], threshold: float) -> list[int]:
    if len(templates) < 2:
        return [0] * len(templates)
    x = TfidfVectorizer(token_pattern=r"[^\s]+", lowercase=False).fit_transform(templates)
    dist = cosine_distances(x)
    ids = [identity(t) for t in templates]
    for i in range(len(templates)):
        for j in range(len(templates)):
            if ids[i] != ids[j]:
                dist[i, j] = 1.0
    np.fill_diagonal(dist, 0.0)
    model = AgglomerativeClustering(
        n_clusters=None, metric="precomputed", linkage="average", distance_threshold=threshold
    )
    return [int(x) for x in model.fit_predict(dist)]


def cluster(events: list[Event], threshold: float = DISTANCE_THRESHOLD) -> ClusterResult:
    miner = TemplateMiner()
    tids = [miner.add(e.message) for e in events]
    templates = miner.templates
    raw = _template_labels(templates, threshold)

    # 按首次出现顺序重新编号，保证输出稳定
    remap: dict[int, int] = {}
    for tid in tids:
        remap.setdefault(raw[tid], len(remap))
    out_events = [replace(e, template_id=t, cluster_id=remap[raw[t]]) for e, t in zip(events, tids, strict=True)]

    clusters = []
    for cid in range(len(remap)):
        members = [e for e in out_events if e.cluster_id == cid]
        clusters.append(Cluster(cid, sorted({e.template_id for e in members}), [e.event_id for e in members]))
    return ClusterResult(out_events, clusters, templates)
