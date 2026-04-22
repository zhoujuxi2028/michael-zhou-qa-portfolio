# CLAUDE.md - sid-iam-testing-platform

## 项目定位
- SID IAM / Data / AI Agent 测试平台
- 约 138 个测试，覆盖 auth / data / ai 三个域
- 所有测试基于 mock services，无需真实 SID 环境

## 常用命令
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pytest tests/ -v
pytest tests/test_auth -v
pytest tests/test_data -v
pytest tests/test_ai -v
```

## 提交前检查
```bash
pytest tests/ -v
```

## 注意事项
- 新增 marker 时同步更新 `pytest.ini`
- 新增依赖时同步更新 `requirements.txt`
