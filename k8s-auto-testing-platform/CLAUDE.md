# CLAUDE.md - k8s-auto-testing-platform

## 项目定位
- Kubernetes 自动化测试平台
- 关注部署验证、HPA、Chaos Mesh、监控与性能压测

## 常用命令
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pytest tests/ -v -m "not integration"
pytest tests/ -v -m integration
```

## 提交前检查
```bash
black --check .
isort --check-only .
flake8 .
pytest tests/ -v -m "not integration"
```

## 注意事项
- 涉及集群测试时，先确认 `kubectl` 上下文正确
- `reports/` 为测试产物目录，新增产物不要随代码提交
