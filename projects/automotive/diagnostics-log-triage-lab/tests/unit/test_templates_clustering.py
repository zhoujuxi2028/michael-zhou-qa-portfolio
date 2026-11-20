"""TC-TM-* / TC-CL-*：Drain 模板与 TF-IDF 聚类（DLT-07/08）。"""

from src.clustering import cluster
from src.models import Event
from src.templates import TemplateMiner


def ev(i, message):
    kind, bus = message.split()[0], message.split()[1].split("=", 1)[1]
    return Event(f"E{i:05d}", float(i), "CAN", kind, bus, "", message, {}, (i, i))


def test_same_template_diff_params():  # TC-TM-01
    m = TemplateMiner()
    a = m.add("UDS_NRC id=0x7E0 sid=0x22 nrc=0x31 name=requestOutOfRange did=0xF190")
    b = m.add("UDS_NRC id=0x7E0 sid=0x22 nrc=0x31 name=requestOutOfRange did=0x1234")
    assert a == b
    assert m.templates[a] == "UDS_NRC id=0x7E0 sid=0x22 nrc=0x31 name=requestOutOfRange did=<*>"


def test_categorical_fields_split():  # TC-TM-02
    m = TemplateMiner()
    a = m.add("UDS_SECURITY_FAIL id=0x7E0 sid=0x27 nrc=0x35 name=invalidKey")
    b = m.add("UDS_SECURITY_FAIL id=0x7E0 sid=0x27 nrc=0x36 name=exceededNumberOfAttempts")
    c = m.add("UDS_P2_TIMEOUT id=0x7E0 sid=0x22 timer=P2 dur_ms=60")
    d = m.add("UDS_P2_TIMEOUT id=0x7E0 sid=0x22 timer=P2* dur_ms=5200")
    assert len({a, b, c, d}) == 4


def test_literal_tokens_merge_by_similarity():
    m = TemplateMiner(sim_threshold=0.6)
    assert m.add("CAN_X id=0x100 foo bar baz") == m.add("CAN_X id=0x100 foo qux baz")


MESSAGES = [
    "CAN_CYCLE_LOSS id=0x100 expected_ms=20 gap_ms=95",
    "CAN_CYCLE_LOSS id=0x100 expected_ms=20 gap_ms=110",
    "CAN_CYCLE_LOSS id=0x100 expected_ms=20 gap_ms=260 dropout=long",
    "CAN_CYCLE_LOSS id=0x101 expected_ms=100 gap_ms=410",
    "CAN_DLC_MISMATCH id=0x101 expected=8 actual=6",
    "CAN_COUNTER_JUMP id=0x101 expected=4 actual=5",
    "UDS_NRC id=0x7E0 sid=0x22 nrc=0x31 name=requestOutOfRange",
]


def test_cluster_deterministic():  # TC-CL-01
    events = [ev(i, m) for i, m in enumerate(MESSAGES)]
    a, b = cluster(events), cluster(events)
    assert [e.cluster_id for e in a.events] == [e.cluster_id for e in b.events]


def test_cluster_homogeneity_fixture():  # TC-CL-02
    res = cluster([ev(i, m) for i, m in enumerate(MESSAGES)])
    by_cluster = {}
    for e in res.events:
        by_cluster.setdefault(e.cluster_id, set()).add((e.kind, e.bus_id))
    assert all(len(v) == 1 for v in by_cluster.values())
    assert len(res.clusters) == 5


def test_tfidf_merges_optional_field_variants():  # TC-CL-03
    res = cluster([ev(i, m) for i, m in enumerate(MESSAGES)])
    ids = [e.cluster_id for e in res.events]
    assert len({e.template_id for e in res.events[:3]}) == 2  # dropout 变体是独立模板
    assert ids[0] == ids[1] == ids[2]  # TF-IDF 合并为同一簇
    assert ids[3] != ids[0]  # 不同 ID 不合并


def test_cluster_empty_and_single():
    assert cluster([]).clusters == []
    res = cluster([ev(0, MESSAGES[0])])
    assert [c.event_ids for c in res.clusters] == [["E00000"]]
