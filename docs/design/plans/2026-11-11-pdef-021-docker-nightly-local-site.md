# PDEF-021 修复计划：Docker Nightly 改用本地静态站点

> Defect: PDEF-021 · Issue: [#859](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/859) · 分支: `fix/pdef-021-nightly-local-site` · 方案: A

## 1. 目标

`02-ui-tests.cy.js` 不再依赖第三方 example.com，Docker Nightly 恢复绿灯。

## 2. 架构

```
docker compose (qa-demo-network)
├── test-site  nginx:1.27-alpine，托管 ./test-site（只读挂载，带 healthcheck）
├── cypress    depends_on test-site(healthy)；UI spec 访问 Cypress.env('siteUrl') = http://test-site
└── newman     不变
```

| 决策 | 理由 |
|------|------|
| nginx 容器，不用 `cy.intercept` 打桩 | 真实 HTTP 加载，性能和慢网络用例仍然有意义 |
| 不映射宿主机端口 | 避免与端口分配表冲突（8080 已被占用） |
| `siteUrl` 走 Cypress env | 与 `apiUrl` 写法一致；compose 用 `CYPRESS_siteUrl` 注入 |
| baseUrl 不变 | API spec 依赖 jsonplaceholder，不在本次范围 |

## 3. 任务拆分

| # | 任务 | 文件 |
|---|------|------|
| T1 | 静态页：`h1`、`p`、"Learn more"（iana.org）链接、UTF-8、title | `infra/cicd-demo/test-site/index.html` |
| T2 | 新增 `test-site` 服务 + healthcheck；cypress 加 `depends_on` 和 `CYPRESS_siteUrl` | `infra/cicd-demo/docker-compose.yml` |
| T3 | 加 `env.siteUrl` 默认值 | `infra/cicd-demo/cypress.config.js` |
| T4 | spec 改用 `siteUrl`；describe 改名；`it(` 数量保持 9 个 | `infra/cicd-demo/cypress/e2e/02-ui-tests.cy.js` |
| T5 | 文档同步：README / 登记表 / RCA | `infra/cicd-demo/README.md`、`defect-register.md` |

## 4. 验证

| 层级 | 命令 / 方式 | 通过标准 |
|------|-------------|----------|
| Lint | `npm run lint` | 0 error |
| 质量门禁 | `grep -rh "^\s*it(" cypress/e2e/ \| wc -l` | ≥ 15 |
| 本地 UI | `docker compose run --rm cypress ... --spec 02-ui-tests.cy.js` | 9/9 通过 |
| CI | 在 fix 分支上用 `workflow_dispatch` 触发 `docker-tests.yml` | 绿灯 |
| 文档 | `check-markdown-links.sh` | 通过 |

## 5. 不在本次范围（后续跟进）

- Nightly 失败无告警（PDEF-021 根因 3）：建议另开 Issue，在 schedule 失败时自动建 Issue 或评论
- `docker-compose.yml` 中已废弃的 `version` 字段 warning
