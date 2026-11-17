# AV Testing Demo — 多媒体（音频/视频）自动化测试

用 **ffmpeg + pytest** 演示多媒体领域的自动化测试思路：**媒体规格断言**（分辨率/时长/fps/编码/码率/音频布局）+ **画质回归检测**（PSNR / SSIM）。

> 对应需求 [#887](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/887)。面向 GPU/音频/视频/显示 自动化测试岗位的能力展示。

## 它演示了什么

| 能力 | 实现 | 对应真实场景 |
|------|------|-------------|
| 媒体规格断言 | 解析 `ffmpeg -i` 输出 → 分辨率/时长/fps/编码/码率/采样率/声道 | 验证播放/编解码输出是否符合规格 |
| 画质回归检测 | ffmpeg `psnr` / `ssim` 滤镜 | 重编码/转码后画面是否劣化 |
| 确定性测试素材 | ffmpeg `testsrc` + `sine` 合成 | 无需外部素材，CI 可复现 |
| 失败诊断 | 断言失败时输出 ffmpeg stderr | 快速定界「规格不符 vs 编码失败」 |

## 快速开始

```bash
cd projects/multimedia/av-testing-demo
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pytest -v
```

预期：`10 passed`（约 2 秒）。

## 结构

```
av-testing-demo/
├── src/media.py          # ffmpeg 封装：synthesize / reencode / probe / psnr / ssim
├── tests/
│   ├── conftest.py       # 会话级 fixture：合成原片 / 相同副本 / 低码率重编码
│   └── test_media.py     # 规格断言 + PSNR/SSIM 回归
├── conftest.py           # 让 pytest 能 import src
└── requirements.txt
```

## 关键设计取舍

- **零系统依赖**：用 `imageio-ffmpeg`（pip 自带静态 ffmpeg 二进制），无需 `brew install ffmpeg`，跨平台、CI 友好。
- **不依赖 ffprobe**：`imageio-ffmpeg` 只带 ffmpeg，因此 `probe()` 解析 `ffmpeg -i` 的 stderr（ffmpeg 会把 Duration/Stream 信息打印到 stderr），无需额外二进制。
- **确定性素材**：用 ffmpeg 内置 `testsrc`（视频）+ `sine`（音频）合成，测试不依赖外部样例文件，可复现。
- **画质用客观指标**：PSNR/SSIM 是业界通用画质指标；相同片 PSNR=∞、SSIM=1.0；低码率重编码客观劣化，阈值可断言。

## 局限（如实说明）

- 不涉及 **GPU 硬件 / 功耗(power)** 测量——需专用设备与工具，非本 demo 范围。
- 音频目前验证**布局（采样率/声道/编码）**，未做音频质量（如频响/失真）自动比对。
- 未做真实**编解码性能基准**（帧率/延迟/资源占用），仅做功能与画质回归。
- `ffmpeg -i` stderr 解析是出于「只用 ffmpeg 二进制」的取舍；若环境有 ffprobe，可换成 `ffprobe -print_format json` 更稳健。
