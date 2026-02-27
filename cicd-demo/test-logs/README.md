# 测试日志目录

此目录用于存储回归测试的详细日志。

## 日志文件

运行 `./scripts/run-regression-test-with-logs.sh` 会生成以下文件：

- `regression-test-YYYYMMDD_HHMMSS.log` - 完整测试日志
- `test-summary-YYYYMMDD_HHMMSS.txt` - 测试总结报告
- `newman-YYYYMMDD_HHMMSS.log` - Newman容器日志
- `cypress-YYYYMMDD_HHMMSS.log` - Cypress容器日志

## 查看日志

```bash
# 查看最新的测试总结
cat test-logs/test-summary-*.txt | tail -50

# 查看所有日志文件
ls -lh test-logs/

# 查看特定日志
cat test-logs/regression-test-20260221_110000.log
```

## 清理日志

```bash
# 删除所有日志（保留目录）
rm -f test-logs/*

# 删除7天前的日志
find test-logs -name '*.log' -mtime +7 -delete
find test-logs -name '*.txt' -mtime +7 -delete
```

