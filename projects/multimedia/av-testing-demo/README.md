# AV Testing Demo — 多媒体（音频/视频）自动化测试

用 **ffmpeg + pytest** 演示多媒体领域的自动化测试思路：媒体规格断言、**音频质量**、**画质回归（PSNR/SSIM）**、**多编码对比**、**帧抽取差异可视化**。

> 对应需求 [#887](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/887)、[#889](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/889)。面向 GPU/音频/视频/显示 自动化测试岗位的能力展示。

## 它演示了什么

| 能力 | 实现 | 对应真实场景 |
|------|------|-------------|
| 媒体规格断言 | 解析 `ffmpeg -i` → 分辨率/时长/fps/编码/码率/采样率/声道 | 验证播放/编解码输出是否符合规格 |
| 画质回归（视频） | ffmpeg `psnr` / `ssim` 滤镜 | 重编码/转码后画面是否劣化 |
| 音频质量 | ffmpeg `asdr`（音频信号失真比） | 音频转码/降采样后是否失真 |
| 多编码对比 | h264 / hevc / vp9 / mpeg4 同源同码率对比 PSNR/SSIM/体积 | 编码器选型、质量-体积权衡 |
| 帧抽取差异可视化 | 抽同一帧为 PNG → `blend=difference` 出差异图 | 直观定位画面差异区域 |
| 确定性测试素材 | ffmpeg `testsrc` + `sine` 合成 | 无需外部素材，CI 可复现 |
| 失败诊断 | 断言失败时输出 ffmpeg stderr | 快速定界「规格不符 vs 编码失败」 |

## 快速开始

```bash
cd projects/multimedia/av-testing-demo
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pytest -v                      # 19 tests
```

预期：`19 passed`（约 6–8 秒）。

## 多编码对比报告（可视化产出）

```bash
python scripts/codec_report.py
# 生成 artifacts/codec-comparison.md + 各编码差异图 diff_<codec>.png
```

示例输出（320x240@30fps 2s，目标码率 200k）：

| codec | tag | size (KB) | v-bitrate (kbps) | PSNR (dB) | SSIM | frame-diff mean |
|-------|-----|-----------|------------------|-----------|------|-----------------|
| h264 | h264 | 36.4 | 64 | 45.13 | 0.996 | 0.69 |
| hevc | hevc | 38.1 | 61 | 48.10 | 0.998 | 0.65 |
| vp9 | vp9 | 53.5 | 136 | 55.00 | 0.999 | 0.19 |
| mpeg4 | mpeg4 | 114.1 | 384 | 51.05 | 0.998 | 0.32 |

> 说明：`artifacts/` 为产物目录（已 gitignore），报告与差异图不入库。

## 结构

```
av-testing-demo/
├── src/media.py            # ffmpeg 封装：synthesize/reencode/probe/psnr/ssim/
│                           #   encode_video/audio_asdr/extract_frame/difference_image/mean_gray
├── scripts/codec_report.py # 多编码对比报告 → artifacts/codec-comparison.md
├── tests/
│   ├── conftest.py         # 会话级 fixture：原片/相同副本/低码率/降质音频
│   └── test_media.py       # 规格断言 + 音频质量 + 多编码 + 帧 diff（19 例）
├── conftest.py             # 让 pytest 能 import src
└── requirements.txt
```

## 关键设计取舍

- **零系统依赖**：`imageio-ffmpeg`（pip 自带静态 ffmpeg 二进制），无需 `brew install ffmpeg`，跨平台、CI 友好。
- **不依赖 ffprobe**：`imageio-ffmpeg` 只带 ffmpeg，`probe()` 解析 `ffmpeg -i` 的 stderr（Duration/Stream 信息），无需额外二进制。
- **帧 diff 对静态帧而非视频流**：`blend=difference` 直接作用于两条视频流会受帧对齐影响（连相同片都可能错位比较）；正确做法是**先各抽同一帧为 PNG，再对两张静态图做 difference**（相同帧 → 全黑 mean≈0）。
- **音频质量用 ASDR**：`apsnr` 对简单正弦信号区分度差（可高达 ~170dB），`asdr`（信号失真比）更敏感、更贴近实际失真度量。
- **画质用客观指标**：PSNR/SSIM 业界通用；相同片 PSNR=∞、SSIM=1.0；低码率客观劣化，阈值可断言。

## 局限（如实说明）

- 不涉及 **GPU 硬件 / 功耗(power)** 测量——需专用设备与工具，非本 demo 范围。
- 音频质量用 ASDR 度量整体失真；未做频响/THD 等精细化声学指标。
- 未做真实**编解码性能基准**（吞吐/延迟/资源占用）；`encode (s)` 仅为墙钟参考。
- 帧 diff 为逐帧像素差可视化，未做感知哈希/SSIM 热力图等高级手段。
- `ffmpeg -i` stderr 解析是「只用 ffmpeg 二进制」的取舍；若有 ffprobe，可换 `ffprobe -print_format json` 更稳健。
