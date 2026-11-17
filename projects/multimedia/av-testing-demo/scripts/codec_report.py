#!/usr/bin/env python3
"""Multi-codec comparison report for the AV testing demo.

Encodes one synthesized source clip with h264 / hevc / vp9 / mpeg4 at the same
target bitrate, then reports size, bitrate, PSNR/SSIM, and a frame-15 diff mean
(a proxy for visible degradation). Writes ``artifacts/codec-comparison.md``.

Usage:
    python scripts/codec_report.py
"""

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src import media

CODECS = ["h264", "hevc", "vp9", "mpeg4"]
TARGET_BITRATE = "200k"


def main() -> None:
    artifacts = Path(__file__).resolve().parent.parent / "artifacts"
    artifacts.mkdir(parents=True, exist_ok=True)

    source = media.synthesize(
        artifacts / "source.mp4", width=320, height=240, fps=30, duration=2
    )
    source_frame = media.extract_frame(source, 15, artifacts / "source_f15.png")

    rows = []
    for codec in CODECS:
        start = time.perf_counter()
        out = media.encode_video(
            source, artifacts / f"enc_{codec}.mp4", codec, bitrate=TARGET_BITRATE
        )
        encode_s = time.perf_counter() - start

        info = media.probe(out)
        frame = media.extract_frame(out, 15, artifacts / f"{codec}_f15.png")
        diff = media.difference_image(
            source_frame, frame, artifacts / f"diff_{codec}.png"
        )

        rows.append(
            {
                "codec": codec,
                "tag": info.video.codec,
                "kbps": info.video.bitrate_kbps or 0,
                "size_kb": media.file_size(out) / 1024,
                "psnr": media.psnr(source, out),
                "ssim": media.ssim(source, out),
                "ydiff": media.mean_gray(diff),
                "encode_s": encode_s,
            }
        )

    lines = [
        "# Multi-codec comparison",
        "",
        f"Source: 320x240 @30fps, 2s. Target video bitrate: {TARGET_BITRATE}.",
        "",
        "| codec | tag | size (KB) | v-bitrate (kbps) | PSNR (dB) | SSIM | frame-diff mean | encode (s) |",
        "|-------|-----|-----------|------------------|-----------|------|-----------------|------------|",
    ]
    for r in rows:
        psnr = "inf" if r["psnr"] == float("inf") else f"{r['psnr']:.2f}"
        lines.append(
            f"| {r['codec']} | {r['tag']} | {r['size_kb']:.1f} | {r['kbps']} | {psnr} | "
            f"{r['ssim']:.3f} | {r['ydiff']:.2f} | {r['encode_s']:.2f} |"
        )

    report = artifacts / "codec-comparison.md"
    report.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))
    print(f"\nwritten: {report}")


if __name__ == "__main__":
    main()
