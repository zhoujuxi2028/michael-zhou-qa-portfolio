# Pattern Downgrade - Quick Start Guide

快速开始使用 IWSVA Pattern 降级功能。

## 快速使用

### 1. 安装依赖（已完成）

```bash
cd cypress-tests
npm install ssh2 ini
```

### 2. 配置 SSH 连接

编辑 `cypress.env.json`，添加 SSH 配置：

```json
{
  "baseUrl": "https://10.206.201.9:8443",
  "username": "admin",
  "password": "111111",
  "ssh": {
    "host": "10.206.201.9",
    "port": 22,
    "username": "root",
    "password": "your-root-password"
  }
}
```

### 3. 运行示例测试

```bash
npx cypress run --spec "cypress/e2e/examples/downgrade-ptn-example.cy.js"
```

## 在测试中使用

### 简单方式（推荐）

```javascript
describe('Your Test', () => {
  before('Downgrade PTN', () => {
    cy.task('downgradePattern', {
      componentId: 'PTN',
      targetVersion: '6.593.00',
      updateServerUrl: 'http://10.204.151.56/au/IWSVA5.0/old/',
      options: { restoreINI: true }
    })
  })

  it('should update from old version', () => {
    // Your test here
  })
})
```

## 3 步降级流程

### 实际执行的操作

**Step 1: 修改配置**
```bash
# 修改 /etc/iscan/intscan.ini
[registration]
/use_ssl = no
```

**Step 2: 执行降级**
```bash
su iscan -c "/usr/iwss/bin/getupdate fPTN http://10.204.151.56/au/IWSVA5.0/old/"
# 输出: Virus Pattern forced update Successful (version 6.593.00)
```

**Step 3: 验证版本**
```bash
/usr/iwss/bin/getupdate INFO
# 输出: Virus Pattern   v6.593.00
```

## 支持的组件

| 组件 ID | 组件名称 | 命令参数 |
|---------|----------|----------|
| PTN | Virus Pattern | fPTN |
| SPYWARE | Spyware Pattern | fSPYWARE |
| BOT | Bot Pattern | fBOT |
| ITP | IntelliTrap Pattern | fITP |
| ITE | IntelliTrap Exception | fITE |
| ICRCAGENT | Smart Scan Agent | fICRCAGENT |
| ENG | Virus Scan Engine | fENG |
| ATSEENG | ATSE Scan Engine | fATSEENG |
| TMUFEENG | URL Filtering Engine | fTMUFEENG |

## 新增文件

1. `cypress/tasks/sshClient.js` - SSH 工具
2. `cypress/tasks/patternDowngrade.js` - 降级实现
3. `cypress/tasks/index.js` - Task 注册
4. `cypress/e2e/examples/downgrade-ptn-example.cy.js` - 示例测试
5. `docs/DOWNGRADE_GUIDE.md` - 完整文档

## 修改文件

1. `cypress.config.js` - 注册新的 tasks
2. `cypress.env.json.example` - 添加 SSH 配置示例

## 详细文档

查看完整文档：`docs/DOWNGRADE_GUIDE.md`

## 注意事项

⚠️ **重要**:
1. 需要 SSH 访问 IWSVA 服务器的 root 权限
2. 需要旧版本更新服务器 (http://10.204.151.56/au/IWSVA5.0/old/)
3. 降级后会自动恢复 INI 配置（`restoreINI: true`）
4. 不要并行执行多个降级操作

✅ **安全**:
- INI 文件会自动备份
- 失败时自动回滚配置
- 所有 SSH 命令都有日志记录
