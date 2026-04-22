# CLAUDE.md - selenium-demo

## 项目定位
- Selenium + Pytest UI 自动化示例
- 面向 IWSVA 场景，包含页面校验、日志与失败产物采集

## 常用命令
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pytest tests/ -v
```

## 提交前检查
```bash
black --check src tests
flake8 src tests --max-line-length=120
pytest tests/ -v
```

## 注意事项
- 需要本地浏览器与对应驱动环境
- 如依赖真实 IWSVA 环境或 SSH，请先确认凭据和网络可用
