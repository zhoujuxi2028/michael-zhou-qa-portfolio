# llm-agent-tutorial CLAUDE.md

Single-file, zero-dependency LLM agent tutorial demonstrating Prompt/Context/Harness/Loop.

## Quick Start

```bash
# Mock mode（无需 API key）
python3 mini_agent.py

# Real API
export ANTHROPIC_API_KEY=<your-key>
python3 mini_agent.py
```

## Files

| File | Purpose |
|------|---------|
| `mini_agent.py` | 全部四件套实现（Prompt / Context / Harness / Loop） |
| `data.txt` | read_file 工具示例数据 |
