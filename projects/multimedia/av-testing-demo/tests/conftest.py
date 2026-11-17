"""Shared fixtures: synthesize deterministic AV clips once per session."""

import shutil

import pytest

from src import media


@pytest.fixture(scope="session")
def workdir(tmp_path_factory):
    return tmp_path_factory.mktemp("av-artifacts")


@pytest.fixture(scope="session")
def original(workdir):
    """A deterministic 2s 320x240@30fps clip with 440Hz mono audio."""
    return media.synthesize(
        workdir / "original.mp4", width=320, height=240, fps=30, duration=2
    )


@pytest.fixture(scope="session")
def identical(workdir, original):
    """Byte-for-byte copy — used as the 'no regression' baseline."""
    dst = workdir / "identical.mp4"
    shutil.copy(original, dst)
    return dst


@pytest.fixture(scope="session")
def lowbitrate(workdir, original):
    """Re-encoded at 30k video bitrate — should show measurable quality loss."""
    return media.reencode(original, workdir / "lowbitrate.mp4", video_bitrate="30k")


@pytest.fixture(scope="session")
def degraded_audio(workdir, original):
    """Audio re-encoded to 8 kHz / 16k — should show clear distortion (low SDR)."""
    return media.reencode_audio(
        original, workdir / "audio_low.m4a", bitrate="16k", sample_rate=8000
    )
