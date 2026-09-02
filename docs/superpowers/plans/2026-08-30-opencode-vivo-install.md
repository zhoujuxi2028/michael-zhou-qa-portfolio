# OpenCode on Vivo (Termux) Installation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Vivo 手机（OriginOS / Android）上通过 Termux + proot-distro 安装并运行 OpenCode TUI。

**Architecture:** Termux 提供 Android 上的 Linux 环境；proot-distro 安装 Ubuntu 22.04（arm64）；在 Ubuntu 内使用官方安装脚本安装 OpenCode。

**Tech Stack:** Termux (F-Droid)、proot-distro、Ubuntu 22.04 arm64、OpenCode 官方安装脚本

---

## 前置条件检查

- [x] Vivo 手机已开启「允许安装未知来源应用」
- [x] 手机存储空间 ≥ 4 GB 可用
- [x] 已连接 WiFi（安装过程需下载约 500 MB）
- [ ] 已准备好 Anthropic API Key

---

## Task 1：安装 Termux

**目标：** 获取最新版 Termux（避免 Google Play 版本过旧）

**Files:**
- 无代码文件，操作在手机端执行

- [x] **Step 1: 下载 Termux APK**

  浏览器访问：`https://github.com/termux/termux-app/releases/latest`

  下载文件：`termux-app_v0.118.x+github-debug_arm64-v8a.apk`（选 arm64-v8a）

- [x] **Step 2: 安装 APK**

  文件管理器找到下载的 APK → 点击安装 → 允许安装

- [x] **Step 3: 验证 Termux 可启动**

  打开 Termux → 看到 `$` 提示符即成功

  预期输出：
  ```
  Welcome to Termux!
  $
  ```

---

## Task 2：配置 Termux 基础环境

**目标：** 换源、更新包、授权存储

- [x] **Step 1: 换清华镜像源（加速国内下载）**

  ```bash
  termux-change-repo
  ```

  选择：`Mirror group` → `Mirrors in China` → `TUNA (清华大学)`

- [x] **Step 2: 更新所有包**

  ```bash
  pkg update && pkg upgrade -y
  ```

  预期：更新完成，无报错

- [x] **Step 3: 安装必要工具**

  ```bash
  pkg install proot-distro wget curl -y
  ```

- [x] **Step 4: 处理 Vivo OriginOS 后台限制**

  手机系统设置 → 应用管理 → Termux：
  - 电池优化 → 不限制
  - 后台运行 → 允许
  - 自启动 → 开启

- [ ] **Step 5: 禁用 Android 12+ Phantom Process Killer**

  **方案 A（需连接电脑）：**
  ```bash
  adb shell settings put global settings_enable_monitor_phantom_procs false
  ```

  **方案 B（纯手机端，通过 Shizuku）：**
  1. F-Droid 安装 Shizuku → 开启无线调试模式（系统设置 → 开发者选项 → 无线调试）
  2. Shizuku 配对后，安装 `aShell`（F-Droid）
  3. 在 aShell 内执行上述 adb 命令

  > 若暂时不执行，出现 OpenCode 启动后秒退时再回来处理。

---

## Task 3：安装 proot-distro Ubuntu

**目标：** 在 Termux 内创建 Ubuntu 22.04 arm64 容器

- [ ] **Step 1: 确认 ubuntu 别名对应版本**

  ```bash
  proot-distro list
  ```

  找到 `ubuntu` 行，确认版本为 `22.04`。若显示 `24.04`，改用 `ubuntu-22.04` 别名。

- [ ] **Step 2: 安装 Ubuntu 发行版**

  ```bash
  proot-distro install ubuntu   # 若 Step 1 确认为 24.04，改用 ubuntu-22.04
  ```

  预期：下载并解压约 80 MB，耗时 2-5 分钟

- [ ] **Step 3: 进入 Ubuntu 环境**

  ```bash
  proot-distro login ubuntu
  ```

  预期：提示符变为 `root@localhost:~#`

- [ ] **Step 4: 验证系统信息**

  ```bash
  uname -m && cat /etc/os-release | grep VERSION
  ```

  预期输出：
  ```
  aarch64
  VERSION="22.04.x LTS (Jammy Jellyfish)"
  ```

---

## Task 4：在 Ubuntu 内安装 OpenCode

**目标：** 使用官方脚本安装 OpenCode

- [ ] **Step 1: 更新 Ubuntu 包列表**

  ```bash
  apt update && apt upgrade -y
  ```

- [ ] **Step 2: 安装 Node.js 18（通过 NodeSource，避免 apt 默认 v12）**

  ```bash
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
  apt install -y nodejs
  node --version   # 预期 v18.x
  npm --version    # 预期 v9.x+
  ```

- [ ] **Step 3: 运行 OpenCode 官方安装脚本**

  ```bash
  curl -fsSL https://opencode.ai/install.sh | bash
  ```

  预期：安装完成，提示 `opencode installed successfully`

  > 若安装脚本不支持 arm64，执行备选方案（Step 3b）。

- [ ] **Step 3b（备选）：通过 npm 安装**

  先查证包名：
  ```bash
  npm search opencode | head -5
  ```

  根据搜索结果选择正确包名安装，例如：
  ```bash
  npm install -g opencode-ai   # 或 @opencode/cli，以实际 npm 包名为准
  ```

- [ ] **Step 4: 验证安装**

  ```bash
  opencode --version
  ```

  预期：输出版本号，如 `1.18.x`

---

## Task 5：配置并启动 OpenCode

**目标：** 配置 API Key，验证 TUI 可正常启动

- [ ] **Step 1: 设置 Anthropic API Key**

  ```bash
  export ANTHROPIC_API_KEY="your-api-key-here"
  ```

  永久生效（写入 profile）：
  ```bash
  echo 'export ANTHROPIC_API_KEY="your-api-key-here"' >> ~/.bashrc  # 替换为真实 Key
  source ~/.bashrc
  ```

  > ⚠️ 安全提示：proot 内 `~/.bashrc` 存储在 Termux 的 Android 存储空间，文件管理器可访问。请勿将此文件分享或备份到云端。

- [ ] **Step 2: 启动 OpenCode TUI**

  ```bash
  opencode
  ```

  预期：TUI 界面启动，可输入 prompt

- [ ] **Step 2b: 记录下次启动的完整路径**

  下次打开手机后，完整步骤为：
  ```
  打开 Termux → proot-distro login ubuntu → opencode
  ```
  可创建快捷脚本：
  ```bash
  # 在 Termux（非 proot 内）执行：
  echo 'proot-distro login ubuntu -- bash -c "source ~/.bashrc && opencode"' > ~/start-opencode.sh
  chmod +x ~/start-opencode.sh
  ```
  之后只需在 Termux 运行 `./start-opencode.sh`。

- [ ] **Step 3（备选）：若 TUI 不可用，改用 serve 模式**

  ```bash
  opencode serve --port 3000
  ```

  手机浏览器访问：`http://localhost:3000`

---

## Task 6：记录 Workaround 并关闭 Issue

**目标：** 按项目规范登记 workaround，归档实施路径

- [ ] **Step 1: 按 `docs/guides/workaround-tracking.md` 格式登记所有绕过措施**

  至少记录：
  - Termux 版本来源（F-Droid 而非 Google Play）
  - OriginOS 后台限制处理方式
  - Phantom Process Killer 禁用步骤（如执行）
  - 安装脚本是否需要备选方案

- [ ] **Step 2: 更新 Issue #514 验收标准**

  在 Issue 评论记录：选定方案、完整安装步骤、遇到的问题及解决方式

- [ ] **Step 3: 关闭 Issue #514**

  ```bash
  gh issue close 514 --repo zhoujuxi2028/michael-zhou-qa-portfolio \
    --comment "已完成真机验证，安装路径：Termux + proot-distro Ubuntu + 官方脚本。详见 workaround 记录。"
  ```

---

## 风险预案

| 风险 | 现象 | 处理 |
|------|------|------|
| 官方脚本不支持 arm64 | 安装报错 `unsupported architecture` | 改用 npm 安装（Task 4 Step 3b） |
| Phantom Process Killer 杀死子进程 | OpenCode 启动后秒退 | 执行 Task 2 Step 5（ADB 禁用） |
| TUI 终端渲染异常 | 乱码或界面错位 | 改用 `opencode serve` + 浏览器访问 |
| proot 网络访问失败 | curl/wget 超时 | Termux 内设置代理或换手机热点 |
