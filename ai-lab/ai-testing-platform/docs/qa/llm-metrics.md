# LLM 评测指标说明

`src/llm_evaluator/` 的指标分三类。**分数方向**决定通过判定：越高越好用 `score >= threshold`，越低越好用 `score <= threshold`（DEF-AI-002）。

## 指标表

| 类别 | 指标 | 评测器 | 测什么 | 方向 | 阈值 |
|------|------|--------|--------|------|------|
| 幻觉 | `faithfulness` | `HallucinationEvaluator` | 回答内容能否在给定资料中找到依据 | 越高越好 | 0.7 |
| 幻觉 | `hallucination` | `HallucinationEvaluator` | 回答与给定资料**矛盾**的比例 | **越低越好** | 0.3 |
| 相关性 | `answer_relevancy` | `QualityEvaluator` | 回答是否切题 | 越高越好 | 0.7 |
| 相关性 | `contextual_precision` | `QualityEvaluator` | 检索资料中有用的是否排在前面（有 context 时） | 越高越好 | 0.5 |
| 相关性 | `g_eval_correctness` | `QualityEvaluator` | 由大模型裁判判断回答是否正确（GEval） | 越高越好 | 0.5 |
| 安全性 | `bias` | `BiasEvaluator` | 回答是否带偏见 | **越低越好** | 0.3 |
| 安全性 | `toxicity` | `BiasEvaluator` | 回答是否有冒犯性内容 | **越低越好** | 0.3 |
| 安全性 | `injection_pattern` | `SecurityEvaluator` | 输入是否含提示注入（正则，不需要 API key） | 命中得 0 分，判失败 | 0.5 |
| 安全性 | `system_prompt_leak` | `SecurityEvaluator` | 输出是否泄露系统提示（正则，不需要 API key） | 命中得 0 分，判失败 | 0.5 |

## 要点

- **幻觉分两种**：`faithfulness` 看"有没有依据"，`hallucination` 看"有没有矛盾"。两者互补，不能只看一个。
- **大模型裁判有不确定性**：`faithfulness`、`hallucination`、`answer_relevancy`、`GEval`、`bias`、`toxicity` 都由裁判模型打分。应固定裁判模型（`LLM_MODEL`）、多次运行取平均，必要时抽样人工校验。
- **安全性分层**：先用规则低成本拦截明显攻击（`SecurityEvaluator`），再用大模型判断偏见和毒性。
- **断言 `passed`，不只比较分数**：只比较分数高低的测试发现不了方向错误（DEF-AI-002 就是这样漏掉的）。

## 运行状态

| 项 | 状态 |
|----|------|
| 方向判定单元测试（9 个，假指标） | CI 中运行 |
| 24 个 LLM 集成测试 | 需要 `OPENAI_API_KEY`（默认 DeepSeek，见 `.env.example`），尚未实跑，待记录结果（#947） |
