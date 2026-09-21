"""最小 Agent 教程 —— 完整版。

覆盖：Prompt / Context / Harness / Loop 四件套 + 多工具 + 反思 + 原生 function-calling
+ 安全计算(ast) + 上下文窗口管理 + 多轮交互 + 重试退避 + 流式输出 + 配置外部化。

只用 Python 标准库，零依赖。

运行方式：
    python3 mini_agent.py                          # 交互模式（无 key 时用 Mock）
    python3 mini_agent.py --demo                   # 跑内置示例
    python3 mini_agent.py -q "帮我算 1+2"           # 单次提问
    python3 mini_agent.py --api-key sk-xxx --base-url https://api.deepseek.com/v1
"""

import argparse
import ast
import json
import os
import re
import time
import urllib.error
import urllib.request
from dataclasses import dataclass

# ============================================================
# 五、CONFIG：配置集中管理（命令行参数 > 环境变量 > 默认值）
# ============================================================

@dataclass
class Config:
    base_url: str = "https://api.deepseek.com/v1"
    model: str = "deepseek-chat"
    api_key: str = ""
    timeout: int = 60
    http_retries: int = 3
    stream: bool = True

    @property
    def use_real_api(self) -> bool:
        return bool(self.api_key)


CONFIG = Config()


def load_config(args: argparse.Namespace):
    CONFIG.api_key = args.api_key or os.environ.get("OPENAI_API_KEY", "")
    CONFIG.base_url = args.base_url or os.environ.get("OPENAI_BASE_URL", CONFIG.base_url)
    CONFIG.model = args.model or os.environ.get("OPENAI_MODEL", CONFIG.model)
    CONFIG.stream = not args.no_stream


# ============================================================
# 一、PROMPT：角色 + 规则（工具说明走 API 的 tools 参数）
# ============================================================

SYSTEM_PROMPT = """你是一个会使用工具的智能助手。
根据用户问题选择合适的工具，或直接回答。
如果工具执行出错，请分析原因并尝试纠正（例如修正参数、改用其他工具）。"""


# ============================================================
# 二、CONTEXT：记忆 / 对话历史 + 窗口管理
# ============================================================

class Context:
    """消息列表 + 简单的上下文窗口管理。

    - 维护 system / user / assistant(tool_calls) / tool 四类消息
    - 估算 token（此处用字符长度做粗略代理），超限时从最旧的对话开始裁剪
    """

    def __init__(self, system_prompt: str, max_tokens: int = 4000):
        self.messages = [{"role": "system", "content": system_prompt}]
        self.max_tokens = max_tokens

    def append(self, msg: dict):
        self.messages.append(msg)
        self._trim()

    def to_api_format(self):
        return list(self.messages)

    def _estimate(self, msg: dict) -> int:
        # 粗略代理：中文约 1 字 1 token，英文约 4 字 1 token，这里统一按字符数估
        return len(json.dumps(msg, ensure_ascii=False))

    def total_tokens(self) -> int:
        return sum(self._estimate(m) for m in self.messages)

    def _trim(self):
        """超限时裁剪最旧的非 system 消息，并清理孤儿 tool 结果。"""
        while len(self.messages) > 1 and self.total_tokens() > self.max_tokens:
            self.messages.pop(1)  # 跳过 index 0 的 system
            # 若开头残留孤儿 tool 消息（其对应的 tool_calls 已被删），一并删掉
            while len(self.messages) > 1 and self.messages[1]["role"] == "tool":
                self.messages.pop(1)

    def __repr__(self):
        return json.dumps(self.messages, ensure_ascii=False, indent=2)


# ============================================================
# 三、HARNESS：模型调用 + 工具注册/执行
# ============================================================

# --- 3.1 工具 ---
# calculator 用 ast 白名单，只放行四则运算节点，杜绝注入。
_BIN_OPS = {
    ast.Add: lambda a, b: a + b,
    ast.Sub: lambda a, b: a - b,
    ast.Mult: lambda a, b: a * b,
    ast.Div: lambda a, b: a / b,
    ast.Mod: lambda a, b: a % b,
    ast.Pow: lambda a, b: a ** b,
}
_UNARY_OPS = {
    ast.UAdd: lambda a: +a,
    ast.USub: lambda a: -a,
}


def _eval_node(node):
    if isinstance(node, ast.Expression):
        return _eval_node(node.body)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in _BIN_OPS:
        return _BIN_OPS[type(node.op)](_eval_node(node.left), _eval_node(node.right))
    if isinstance(node, ast.UnaryOp) and type(node.op) in _UNARY_OPS:
        return _UNARY_OPS[type(node.op)](_eval_node(node.operand))
    raise ValueError("不支持的表达式")


def calculator(expression: str) -> str:
    try:
        tree = ast.parse(expression, mode="eval")
        result = _eval_node(tree)
    except Exception as e:
        return f"错误：{e}"
    return str(result)


def read_file(path: str) -> str:
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        return content[:500] + ("..." if len(content) > 500 else "")
    except Exception as e:
        return f"错误：{e}"


def list_files(path: str) -> str:
    try:
        entries = [e for e in sorted(os.listdir(path)) if not e.startswith("__")]
        return "\n".join(entries) if entries else "(空目录)"
    except Exception as e:
        return f"错误：{e}"


# 工具注册表：schema 是唯一事实来源（OpenAI function-calling 标准结构）。
TOOLS = {
    "calculator": {
        "function": calculator,
        "schema": {
            "type": "function",
            "function": {
                "name": "calculator",
                "description": "计算四则运算数学表达式",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "expression": {"type": "string", "description": "数学表达式"}
                    },
                    "required": ["expression"],
                },
            },
        },
    },
    "read_file": {
        "function": read_file,
        "schema": {
            "type": "function",
            "function": {
                "name": "read_file",
                "description": "读取指定路径的文件内容",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": {"type": "string", "description": "文件路径"}
                    },
                    "required": ["path"],
                },
            },
        },
    },
    "list_files": {
        "function": list_files,
        "schema": {
            "type": "function",
            "function": {
                "name": "list_files",
                "description": "列出目录下的文件名，用于查找文件时确认正确路径",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": {"type": "string", "description": "目录路径"}
                    },
                    "required": ["path"],
                },
            },
        },
    },
}


def tools_schema_list() -> list:
    return [t["schema"] for t in TOOLS.values()]


def execute_tool(name: str, arguments: dict) -> str:
    tool = TOOLS.get(name)
    if not tool:
        return f"错误：没有名为 {name} 的工具"
    return tool["function"](**arguments)


# --- 3.2 模型调用：统一返回 {"content", "tool_calls"} ---
def call_llm(messages: list, on_stream=None) -> dict:
    if CONFIG.use_real_api:
        return _call_openai(messages, on_stream)
    return _call_mock(messages)


def _call_openai(messages: list, on_stream=None) -> dict:
    """原生 function-calling + 流式 + 重试退避。"""
    base = CONFIG.base_url.rstrip("/")
    payload = json.dumps({
        "model": CONFIG.model,
        "messages": messages,
        "temperature": 0,
        "tools": tools_schema_list(),
        "stream": CONFIG.stream,
    }).encode()

    def request():
        req = urllib.request.Request(
            base + "/chat/completions",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": "Bearer " + CONFIG.api_key,
            },
        )
        return urllib.request.urlopen(req, timeout=CONFIG.timeout)

    # 重试 + 指数退避
    for attempt in range(CONFIG.http_retries):
        try:
            resp = request()
            break
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and attempt < CONFIG.http_retries - 1:
                time.sleep(2 ** attempt)
                continue
            raise RuntimeError(f"HTTP {e.code}: {e.read().decode()[:200]}")
        except urllib.error.URLError as e:
            if attempt < CONFIG.http_retries - 1:
                time.sleep(2 ** attempt)
                continue
            raise RuntimeError(f"网络错误: {e.reason}")

    if not CONFIG.stream:
        data = json.loads(resp.read())
        if "error" in data:
            raise RuntimeError(data["error"])
        msg = data["choices"][0]["message"]
        return {"content": msg.get("content"), "tool_calls": msg.get("tool_calls")}

    # 流式：逐行解析 SSE，累积 content 与 tool_calls 片段
    content_parts = []
    tool_calls = {}
    for raw in resp:
        line = raw.decode("utf-8").strip()
        if not line.startswith("data:"):
            continue
        data = line[5:].strip()
        if data == "[DONE]":
            break
        chunk = json.loads(data)
        delta = chunk["choices"][0].get("delta", {})
        if delta.get("content"):
            content_parts.append(delta["content"])
            if on_stream:
                on_stream(delta["content"])
        for tc in delta.get("tool_calls") or []:
            idx = tc["index"]
            entry = tool_calls.setdefault(
                idx, {"id": "", "type": "function",
                      "function": {"name": "", "arguments": ""}})
            if tc.get("id"):
                entry["id"] = tc["id"]
            fn = tc.get("function") or {}
            if fn.get("name"):
                entry["function"]["name"] += fn["name"]
            if fn.get("arguments"):
                entry["function"]["arguments"] += fn["arguments"]

    content = "".join(content_parts) or None
    tcs = [tool_calls[i] for i in sorted(tool_calls)] if tool_calls else None
    return {"content": content, "tool_calls": tcs, "streamed": bool(on_stream and content)}


def _mock_tool_call(call_id: str, name: str, arguments: dict) -> dict:
    return {
        "id": call_id,
        "type": "function",
        "function": {"name": name, "arguments": json.dumps(arguments, ensure_ascii=False)},
    }


def _call_mock(messages: list) -> dict:
    """Mock LLM：模拟原生 function-calling 的返回，无需联网。"""
    last = messages[-1]

    if last["role"] == "tool":
        content = last["content"]
        if content.startswith("错误"):
            return {"content": "无法完成：" + content, "tool_calls": None}
        return {"content": "结果是：" + content, "tool_calls": None}

    question = ""
    for m in reversed(messages):
        if m["role"] == "user":
            question = m["content"]
            break

    if re.search(r"[0-9][0-9+\-*/().% ]*[+\-*/]", question):
        expr = re.search(r"[0-9+\-*/().% ]+", question).group(0).strip()
        return {"content": None,
                "tool_calls": [_mock_tool_call("mock_1", "calculator", {"expression": expr})]}

    if re.search(r"读|文件|read|file", question, re.IGNORECASE):
        path = question.split()[-1].strip("。！？. ")
        return {"content": None,
                "tool_calls": [_mock_tool_call("mock_1", "read_file", {"path": path})]}

    if re.search(r"列|目录|list|dir", question, re.IGNORECASE):
        return {"content": None,
                "tool_calls": [_mock_tool_call("mock_1", "list_files", {"path": "."})]}

    return {"content": f"你说的是：{question}", "tool_calls": None}


# ============================================================
# 四、LOOP + AGENT：观察 -> 思考 -> 行动 -> 反馈
# ============================================================

class Agent:
    def __init__(self, max_steps: int = 8, max_retries: int = 3, verbose: bool = True):
        self.ctx = Context(SYSTEM_PROMPT)
        self.max_steps = max_steps
        self.max_retries = max_retries
        self.verbose = verbose

    def reset(self):
        self.ctx = Context(SYSTEM_PROMPT)

    def chat(self, question: str) -> str:
        self.ctx.append({"role": "user", "content": question})
        retries = 0

        for step in range(1, self.max_steps + 1):
            if self.verbose:
                print(f"\n--- 第 {step} 步 ---")

            resp = call_llm(self.ctx.to_api_format(), on_stream=self._on_stream)
            content = resp.get("content")
            tool_calls = resp.get("tool_calls") or []

            self.ctx.append({"role": "assistant", "content": content,
                             "tool_calls": tool_calls or None})

            if content and not tool_calls:
                if resp.get("streamed"):
                    print()  # 流式已打印正文，这里补个换行
                elif self.verbose:
                    print(f"最终答案: {content}")
                return content

            for tc in tool_calls:
                name = tc["function"]["name"]
                raw_args = tc["function"].get("arguments", "{}")
                args = json.loads(raw_args) if isinstance(raw_args, str) else raw_args
                if self.verbose:
                    print(f"调用工具: {name} {args}")

                result = execute_tool(name, args)
                if self.verbose:
                    print(f"工具结果: {result}")

                self.ctx.append({"role": "tool", "tool_call_id": tc["id"], "content": result})

                if result.startswith("错误"):
                    retries += 1
                    if retries >= self.max_retries:
                        if self.verbose:
                            print("（连续失败多次，提示模型放弃）")
                        self.ctx.append({"role": "user",
                                         "content": "工具已连续失败多次，请直接向用户说明无法完成该任务。"})
                else:
                    retries = 0

        return "（达到最大步数，仍未完成）"

    def _on_stream(self, text: str):
        if self.verbose:
            print(text, end="", flush=True)


# ============================================================
# 入口：demo / 单次提问 / 交互
# ============================================================

DEMO_QUESTIONS = [
    "帮我算一下 (3 + 5) * 7 - 2",
    "读一下 data.txt",
    "读一下 data.txtt",   # 故意拼错文件名 -> 触发反思重试
]


def main():
    p = argparse.ArgumentParser(description="最小 Agent 教程")
    p.add_argument("--api-key", help="API key（也可用环境变量 OPENAI_API_KEY）")
    p.add_argument("--base-url", help="OpenAI 兼容接口地址")
    p.add_argument("--model", help="模型名")
    p.add_argument("--no-stream", action="store_true", help="关闭流式输出")
    p.add_argument("--demo", action="store_true", help="运行内置示例")
    p.add_argument("-q", "--question", help="单次提问")
    args = p.parse_args()
    load_config(args)

    agent = Agent()

    if args.demo:
        for q in DEMO_QUESTIONS:
            print("=" * 40)
            print("问题:", q)
            print("=" * 40)
            agent.chat(q)
            print()
        return

    if args.question:
        agent.chat(args.question)
        return

    mode = "真实 API" if CONFIG.use_real_api else "Mock"
    print(f"进入交互模式（{mode}）。输入 exit 退出，reset 清空记忆。")
    while True:
        try:
            q = input("\n你> ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        if q in ("exit", "quit", "退出"):
            break
        if q in ("reset", "clear", "重置"):
            agent.reset()
            print("已清空记忆。")
            continue
        if not q:
            continue
        agent.chat(q)


if __name__ == "__main__":
    main()
