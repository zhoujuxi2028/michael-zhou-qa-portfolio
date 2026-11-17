"""AV spec conformance + visual-regression (PSNR/SSIM) tests.

These mirror what a multimedia test suite does on real devices:
  1) assert a stream matches its spec (resolution / fps / codec / audio layout)
  2) detect quality regression after re-encode via objective metrics
"""

import pytest

from src import media

EXPECTED = {"width": 320, "height": 240, "fps": 30, "duration": 2.0}


# ── Spec conformance ─────────────────────────────────────────────────────────
def test_probe_duration(original):
    assert media.probe(original).duration_s == pytest.approx(
        EXPECTED["duration"], abs=0.15
    )


def test_probe_video_resolution(original):
    v = media.probe(original).video
    assert (v.width, v.height) == (EXPECTED["width"], EXPECTED["height"])


def test_probe_video_codec_and_fps(original):
    v = media.probe(original).video
    assert v.codec == "h264"
    assert v.fps == pytest.approx(EXPECTED["fps"], abs=1)


def test_probe_audio_layout(original):
    a = media.probe(original).audio
    assert a is not None, "expected an audio stream"
    assert a.codec == "aac"
    assert a.sample_rate == 44100
    assert a.channels == "mono"


@pytest.mark.parametrize("width,height", [(320, 240), (640, 360)])
def test_spec_conformance_catches_resolution(tmp_path, width, height):
    """A spec check must reflect the actual encoded resolution."""
    clip = media.synthesize(
        tmp_path / "clip.mp4", width=width, height=height, duration=1
    )
    v = media.probe(clip).video
    assert (v.width, v.height) == (width, height)


# ── Visual regression: PSNR / SSIM ───────────────────────────────────────────
def test_psnr_identical_is_infinite(original, identical):
    assert media.psnr(original, identical) == float("inf")


def test_ssim_identical_is_one(original, identical):
    assert media.ssim(original, identical) >= 0.99


def test_lowbitrate_degrades_psnr(original, lowbitrate):
    score = media.psnr(original, lowbitrate)
    assert score < 40, f"expected measurable loss, got PSNR={score} dB"


def test_lowbitrate_degrades_ssim(original, lowbitrate):
    score = media.ssim(original, lowbitrate)
    assert score < 0.99, f"expected structural loss, got SSIM={score}"
