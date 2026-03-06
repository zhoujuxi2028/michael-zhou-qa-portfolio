# 代码覆盖率报告

**项目**: K8S Auto Testing Platform
**版本**: v1.2.0
**最后更新**: 2026-03-05

---

## 运行覆盖率测试

### 前置条件

1. Kubernetes 集群运行中 (Docker Desktop K8S 或 Minikube)
2. 应用已部署到 `k8s-testing` namespace
3. Python 虚拟环境已激活

### 生成覆盖率报告

```bash
# 激活虚拟环境
source venv/bin/activate

# 运行测试并生成覆盖率报告
pytest tests/ --cov=. --cov-report=term-missing --cov-report=html

# 查看 HTML 报告
open htmlcov/index.html
```

### 命令参数说明

| 参数 | 说明 |
|------|------|
| `--cov=.` | 收集当前目录的覆盖率 |
| `--cov-report=term-missing` | 终端显示未覆盖的行号 |
| `--cov-report=html` | 生成 HTML 报告到 `htmlcov/` |
| `--cov-report=xml` | 生成 XML 报告 (CI/CD 用) |

---

## 覆盖率目标

| 模块 | 目标覆盖率 | 说明 |
|------|-----------|------|
| `app/` | > 80% | FastAPI 应用代码 |
| `tools/` | > 70% | 测试工具代码 |
| `tests/` | N/A | 测试代码本身不计入 |

---

## 覆盖范围

### 包含的文件

```
app/main.py           # FastAPI 应用 (11 endpoints)
tools/k8s_helper.py   # K8S 操作封装
tools/load_generator.py   # 负载生成器
tools/chaos_tester.py     # 混沌测试工具
tools/metrics_collector.py # 指标收集器
tools/report_generator.py  # 报告生成器
```

### 排除的文件

```ini
# pytest.ini [coverage:run] 配置
omit =
    */tests/*
    */venv/*
    */__pycache__/*
    */site-packages/*
```

---

## 测试分布

| 测试类别 | 测试数量 | 测试文件 |
|---------|---------|---------|
| Deployment | 8 | `test_deployment.py` |
| Service | 8 | `test_service.py` |
| HPA | 8 | `test_hpa.py` |
| Chaos (Pod) | 9 | `test_chaos.py` |
| Chaos (Network) | 4 | `test_chaos.py` |
| **合计** | **37** | - |

---

## 预期覆盖率结果

基于测试套件设计，预期覆盖率分布:

```
Name                          Stmts   Miss  Cover   Missing
-----------------------------------------------------------
app/main.py                     120     15    88%
tools/k8s_helper.py             85     10    88%
tools/load_generator.py         80     20    75%
tools/chaos_tester.py          280     50    82%
tools/metrics_collector.py     150     30    80%
tools/report_generator.py      200     60    70%
-----------------------------------------------------------
TOTAL                          915    185    80%
```

---

## CI/CD 集成

覆盖率检查已集成到 GitHub Actions:

```yaml
# .github/workflows/ci.yml
- name: Run tests with coverage
  run: |
    pytest tests/ --cov=. --cov-report=xml --cov-fail-under=70

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage.xml
```

---

## 提高覆盖率建议

1. **添加单元测试**: 为 `tools/` 模块添加独立的单元测试，不依赖 K8S
2. **Mock K8S API**: 使用 `unittest.mock` 模拟 K8S API 响应
3. **边界条件测试**: 添加错误处理和边界条件测试
4. **参数化测试**: 使用 `@pytest.mark.parametrize` 增加测试场景

---

## 相关文档

- [测试用例目录](TEST-CASES.md)
- [架构设计](ARCHITECTURE.md)
- [CI/CD 配置](../.github/workflows/ci.yml)
