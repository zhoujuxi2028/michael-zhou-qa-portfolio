# CLAUDE.md - security-testing-demo

## 项目定位
- 安全测试演示项目
- 使用 Pytest、OWASP ZAP、Docker 覆盖 DVWA / Juice Shop 等场景

## 常用命令
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
docker compose -f docker/docker-compose.yml up -d
pytest tests/ -v
```

## 提交前检查
```bash
pytest tests/ -v
```

## 注意事项
- ZAP / DVWA / Juice Shop 依赖容器环境，先确认 Docker 正常
- 扫描报告与运行日志属于产物，避免把临时结果提交到仓库
