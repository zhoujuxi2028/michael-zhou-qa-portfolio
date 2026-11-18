"""测试辅助函数。"""


def line(ts: float, can_id: str, data: str, ch: str = "can0") -> str:
    """构造一行 candump。data 为 hex；FD 帧以 '#' 开头传入（如 '#1AABB'）。"""
    return f"({ts:.6f}) {ch} {can_id}#{data}"
