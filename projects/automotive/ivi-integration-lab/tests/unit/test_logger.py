import os
import tempfile

import pytest

from src.logger import DeviceLogger


@pytest.fixture
def logger():
    return DeviceLogger()


def test_log_info_stored(logger):
    logger.log("INFO", "device started")
    assert len(logger.get_errors()) == 0


def test_log_error_captured(logger):
    logger.log("ERROR", "checksum mismatch")
    errors = logger.get_errors()
    assert len(errors) == 1
    assert "checksum mismatch" in errors[0]


def test_multiple_errors_all_captured(logger):
    logger.log("ERROR", "err1")
    logger.log("WARN", "warn1")
    logger.log("ERROR", "err2")
    assert len(logger.get_errors()) == 2


def test_clear_resets_log(logger):
    logger.log("ERROR", "err")
    logger.clear()
    assert logger.get_errors() == []


def test_save_to_file(logger):
    logger.log("INFO", "started")
    logger.log("ERROR", "failed")
    with tempfile.NamedTemporaryFile(mode="r", suffix=".log", delete=False) as f:
        path = f.name
    try:
        logger.save_to_file(path)
        content = open(path).read()
        assert "INFO" in content
        assert "ERROR" in content
        assert "failed" in content
    finally:
        os.unlink(path)
