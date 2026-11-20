"""简化 Drain 模板挖掘（DLT-07，architecture §3.2 / AD-02）。"""

from __future__ import annotations

WILDCARD = "<*>"
CATEGORICAL_KEYS = frozenset({"id", "sid", "nrc", "name", "signal", "sub", "class", "timer"})


def mask(token: str) -> str:
    if "=" not in token:
        return token
    key, _ = token.split("=", 1)
    return token if key in CATEGORICAL_KEYS else f"{key}={WILDCARD}"


def is_identity(token: str) -> bool:
    """故障身份 token：KIND 与分类字段。"""
    return WILDCARD not in token and ("=" not in token or token.split("=", 1)[0] in CATEGORICAL_KEYS)


def identity(template: str) -> tuple[str, ...]:
    tokens = template.split()
    if not tokens:
        return ()
    return (tokens[0], *(t for t in tokens[1:] if is_identity(t)))


class TemplateMiner:
    """按 (token 数, 首 token) 分桶；分类字段不同 → 相似度 0；否则相同 token 占比 ≥ 阈值则合并。"""

    def __init__(self, sim_threshold: float = 0.6) -> None:
        self.sim_threshold = sim_threshold
        self._tokens: list[list[str]] = []
        self._buckets: dict[tuple[int, str], list[int]] = {}

    @property
    def templates(self) -> list[str]:
        return [" ".join(t) for t in self._tokens]

    @staticmethod
    def _similarity(tpl: list[str], tokens: list[str]) -> float:
        same = 0
        for a, b in zip(tpl, tokens, strict=True):
            if a == b:
                same += 1
            elif "=" in a and "=" in b and a.split("=", 1)[0] in CATEGORICAL_KEYS:
                return 0.0
        return same / len(tokens)

    def add(self, message: str) -> int:
        tokens = [mask(t) for t in message.split()]
        bucket = self._buckets.setdefault((len(tokens), tokens[0]), [])
        best, best_sim = None, -1.0
        for tid in bucket:
            s = self._similarity(self._tokens[tid], tokens)
            if s > best_sim:
                best, best_sim = tid, s
        if best is not None and best_sim >= self.sim_threshold:
            self._tokens[best] = [a if a == b else WILDCARD for a, b in zip(self._tokens[best], tokens, strict=True)]
            return best
        self._tokens.append(tokens)
        bucket.append(len(self._tokens) - 1)
        return len(self._tokens) - 1
