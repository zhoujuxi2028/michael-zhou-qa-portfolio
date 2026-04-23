# 集成测试 SOP

**项目:** Performance Testing Platform  
**用途:** 运行 `scripts/integration-test.sh` 的标准操作说明  
**日期:** 2026-04-21

---

## 1. 快速开始

```bash
bash scripts/integration-test.sh
```

只跑某个阶段：

```bash
bash scripts/integration-test.sh --phase PHASE7
```

开启详细日志：

```bash
bash scripts/integration-test.sh --verbose
```

---

## 2. 执行流程

| 阶段 | 内容 | 主要文件 |
|------|------|----------|
| Setup | 锁、预检、容器启动 | `scripts/lib/setup.sh` |
| Execute | 按 phase 执行测试 | `scripts/lib/execute.sh` |
| Report | Markdown / JSON 汇总 | `scripts/lib/report.sh` |

---

## 3. 输出位置

| 类型 | 路径 |
|------|------|
| 日志 | `tests/integration/logs/integration-test-<run_id>.log` |
| 报告 | `tests/integration/logs/integration-test-<run_id>.md` |
| JSON | `tests/integration/logs/integration-test-<run_id>.json` |
| Grafana 截图 | `tests/integration/logs/snapshots/<run_id>/` |

---

## 4. 常见问题

| 问题 | 处理 |
|------|------|
| Docker 未启动 | 先执行 `bash scripts/preflight-check.sh --stage4` |
| 锁被占用 | 删除 `/tmp/integration-test.lock` 后重试 |
| 结果为空 | 检查对应 phase 文件是否被 `registry.sh` 注册 |
| 报告没有生成 | 查看 `tests/integration/logs/` 下的日志和错误信息 |

---

## 5. 维护规则

1. 新增 shell 集成测试时，先加到 `tests/integration/phases/*.sh`。
2. 再在 `tests/integration/registry.sh` 里注册。
3. 不要把 phase 逻辑继续写回 `scripts/integration-test.sh`。
4. 任何新重试或等待逻辑优先复用 `scripts/lib/common.sh`。
