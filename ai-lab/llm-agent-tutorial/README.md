# LLM Agent Tutorial | 最小 LLM Agent 工程教程

A single-file, zero-dependency Python tutorial that demonstrates the core
engineering methodology for building LLM agents — **Prompt / Context / Harness / Loop**
(四件套) — plus multi-tool dispatch, self-reflection, and native function-calling.

单文件、零依赖的 Python 教程，展示 LLM agent 工程的核心方法论 **Prompt / Context / Harness / Loop**，
以及多工具分发、自我反思和原生 function-calling。

> **Tech Stack:** Python 3.10+, 标准库 only | **Dependencies:** 无第三方依赖

---

## The Four Pillars | 四件套

| Pillar | 概念 | 代码位置 |
|--------|------|----------|
| **Prompt** | 角色 + 规则（工具说明走 API 的 `tools` 参数） | `SYSTEM_PROMPT` |
| **Context** | 消息列表 + 上下文窗口管理（超限裁剪） | `class Context` |
| **Harness** | 工具注册/执行 + 模型调用（Mock / 真实 API） | `TOOLS` + `execute_tool()` + `call_llm()` |
| **Loop** | 观察 → 思考 → 行动 → 反馈，直到完成 | `class Agent.chat()` |

## Features | 特性

- **多工具分发**：`calculator`（ast 白名单安全计算）、`read_file`、`list_files`
- **原生 function-calling**：通过 `tools` + `tool_calls` 协议，模型自己按 schema 选工具
- **反思 (Reflexion)**：工具报错不终止，模型分析原因、换参数重试（带重试预算防死循环）
- **安全计算**：`ast` 白名单只放行四则运算节点，默认拒绝一切未知（杜绝注入）
- **上下文窗口管理**：token 估算 + 超限裁剪，自动清理孤儿 `tool` 消息
- **流式输出**：SSE 逐行解析，边生成边打印
- **重试退避**：429/5xx/网络错误自动重试 + 指数退避
- **多轮交互**：`Agent` 类记住上下文，`reset()` 清空记忆
- **配置外部化**：命令行参数 > 环境变量 > 默认值

## Quick Start | 快速开始

```bash
# 交互模式（无 API key 时自动用 Mock，无需联网）
python3 mini_agent.py

# 内置示例
python3 mini_agent.py --demo

# 单次提问
python3 mini_agent.py -q "帮我算一下 2*3"

# 接真实 LLM（任意 OpenAI 兼容接口，如 DeepSeek）
python3 mini_agent.py --api-key sk-xxx --base-url https://api.deepseek.com/v1 --model deepseek-chat
```

环境变量亦可：`OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL`。

## File Structure | 文件结构

```
llm-agent-tutorial/
├── mini_agent.py   # 教程主体（四件套 + 多工具 + 反思 + function-calling）
├── data.txt        # read_file 工具的示例数据
└── README.md
```

## How It Works | 运行原理

```
用户问题
   │
   ▼
Context（记忆/窗口管理）
   │
   ▼
Harness.call_llm ──► 模型返回 tool_calls 或最终答案
   │                        │
   │                tool_calls?
   │                  │ 是
   │                  ▼
   │        execute_tool ──► 结果回填 role=tool 消息
   │                  │
   │        （结果以"错误"开头 → 反思重试）
   │                  │
   └──────────◄───────┘（回到 Loop 下一轮）
```

## Key Lessons | 关键知识点

1. **system 与 user 必须分角色**：混放会让模型把指令示例当用户输入。
2. **schema 是唯一事实来源**：工具说明由注册表生成，prompt 不重复维护。
3. **错误是反馈信号，不是终点**：反思能成功的前提是 agent 拥有足够多的工具来纠错。
4. **流式下参数分片到达**：`tool_calls` 必须按 `index` 累积拼接。
5. **窗口裁剪要处理孤儿消息**：`tool` 消息引用 `tool_call_id`，删父消息需顺带清理。
