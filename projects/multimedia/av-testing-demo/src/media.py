"""FFmpeg-based helpers for audio/video (AV) automated testing.

Design notes
------------
* No system dependency: the ``ffmpeg`` binary is bundled by ``imageio-ffmpeg``.
* No ``ffprobe`` either (imageio-ffmpeg ships ffmpeg only), so media probing
  parses the machine-readable info that ``ffmpeg -i <file>`` prints to stderr.
* Frame/quality diff uses the built-in ``psnr`` / ``ssim`` filters, which is
  how real multimedia test suites detect visual regressions after re-encode.

These primitives let a test suite assert AV specs (resolution / duration / fps /
codec / bitrate / audio channels) and catch quality degradation.
"""

from __future__ import annotations

import re
import subprocess
from dataclasses import dataclass
from pathlib import Path

import imageio_ffmpeg

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


class MediaError(RuntimeError):
    """Raised when ffmpeg fails or its output cannot be parsed."""


@dataclass
class VideoStream:
    codec: str
    width: int
    height: int
    fps: float | None = None
    bitrate_kbps: int | None = None


@dataclass
class AudioStream:
    codec: str
    sample_rate: int
    channels: str
    bitrate_kbps: int | None = None


@dataclass
class MediaInfo:
    duration_s: float | None = None
    bitrate_kbps: int | None = None
    video: VideoStream | None = None
    audio: AudioStream | None = None


def _run(args: list[str]) -> subprocess.CompletedProcess:
    cmd = [FFMPEG, "-hide_banner", "-nostdin", *args]
    return subprocess.run(cmd, check=False, capture_output=True, text=True)


def _tail(text: str, n: int = 600) -> str:
    text = (text or "").strip()
    return text[-n:] if len(text) > n else text


def synthesize(
    path: Path,
    *,
    width: int = 320,
    height: int = 240,
    fps: int = 30,
    duration: float = 2.0,
    audio_freq: int = 440,
) -> Path:
    """Render a deterministic test clip: ``testsrc`` video + ``sine`` audio.

    Removes the need to ship binary sample assets — the fixture is generated at
    test time from ffmpeg's built-in sources.
    """
    path = Path(path)
    args = [
        "-f",
        "lavfi",
        "-i",
        f"testsrc=size={width}x{height}:rate={fps}:duration={duration}",
        "-f",
        "lavfi",
        "-i",
        f"sine=frequency={audio_freq}:duration={duration}",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
        "-y",
        str(path),
    ]
    proc = _run(args)
    if proc.returncode != 0:
        raise MediaError(f"ffmpeg synthesize failed: {_tail(proc.stderr)}")
    return path


def reencode(src: Path, dst: Path, *, video_bitrate: str = "30k") -> Path:
    """Re-encode at a low video bitrate to induce measurable quality loss."""
    dst = Path(dst)
    args = [
        "-i",
        str(src),
        "-c:v",
        "libx264",
        "-b:v",
        video_bitrate,
        "-c:a",
        "aac",
        "-y",
        str(dst),
    ]
    proc = _run(args)
    if proc.returncode != 0:
        raise MediaError(f"ffmpeg reencode failed: {_tail(proc.stderr)}")
    return dst


def probe(path: Path) -> MediaInfo:
    """Parse ``ffmpeg -i`` stderr into structured :class:`MediaInfo`.

    ``ffmpeg -i`` exits non-zero ("At least one output file must be specified")
    but still prints full stream metadata to stderr, which we parse here.
    """
    path = Path(path)
    if not path.exists():
        raise MediaError(f"file not found: {path}")
    proc = _run(["-i", str(path)])
    text = proc.stderr
    info = MediaInfo()

    for line in text.splitlines():
        stripped = line.strip()

        if stripped.startswith("Duration:") and info.duration_s is None:
            m = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", stripped)
            if m:
                h, mm, ss = int(m.group(1)), int(m.group(2)), float(m.group(3))
                info.duration_s = h * 3600 + mm * 60 + ss
            mb = re.search(r"bitrate:\s*(\d+)\s*kb/s", stripped)
            if mb:
                info.bitrate_kbps = int(mb.group(1))

        elif "Video:" in stripped and info.video is None:
            codec = re.search(r"Video:\s*(\w+)", stripped)
            res = re.search(r"(\d{2,5})x(\d{2,5})", stripped)
            fps = re.search(r"(\d+(?:\.\d+)?)\s*fps", stripped)
            br = re.search(r"(\d+)\s*kb/s", stripped)
            if codec and res:
                info.video = VideoStream(
                    codec=codec.group(1),
                    width=int(res.group(1)),
                    height=int(res.group(2)),
                    fps=float(fps.group(1)) if fps else None,
                    bitrate_kbps=int(br.group(1)) if br else None,
                )

        elif "Audio:" in stripped and info.audio is None:
            codec = re.search(r"Audio:\s*(\w+)", stripped)
            sr = re.search(r"(\d+)\s*Hz", stripped)
            ch = re.search(r"Hz,\s*([a-z]+)", stripped)
            br = re.search(r"(\d+)\s*kb/s", stripped)
            if codec and sr and ch:
                info.audio = AudioStream(
                    codec=codec.group(1),
                    sample_rate=int(sr.group(1)),
                    channels=ch.group(1),
                    bitrate_kbps=int(br.group(1)) if br else None,
                )

    if info.video is None:
        raise MediaError(f"no video stream parsed from ffmpeg output: {_tail(text)}")
    return info


def _quality_metric(ref: Path, dist: Path, filt: str) -> str:
    args = [
        "-i",
        str(ref),
        "-i",
        str(dist),
        "-lavfi",
        f"[0:v][1:v]{filt}",
        "-f",
        "null",
        "-",
    ]
    proc = _run(args)
    if proc.returncode != 0:
        raise MediaError(f"ffmpeg {filt} failed: {_tail(proc.stderr)}")
    return proc.stderr


def psnr(ref: Path, dist: Path) -> float:
    """Peak signal-to-noise ratio (dB) between two videos; ``inf`` if identical."""
    text = _quality_metric(ref, dist, "psnr")
    m = re.search(r"PSNR\b.*?\baverage:(\S+)", text)
    if not m:
        raise MediaError(f"could not parse PSNR: {_tail(text)}")
    value = m.group(1)
    return float("inf") if value.lower() == "inf" else float(value)


def ssim(ref: Path, dist: Path) -> float:
    """Structural similarity in [0, 1] between two videos (1.0 = identical)."""
    text = _quality_metric(ref, dist, "ssim")
    m = re.search(r"SSIM\b.*?\bAll:([\d.]+)", text)
    if not m:
        raise MediaError(f"could not parse SSIM: {_tail(text)}")
    return float(m.group(1))
