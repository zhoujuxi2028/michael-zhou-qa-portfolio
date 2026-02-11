"""
Helper Modules Package

Contains utility modules for test automation:
- Logger: Enterprise-grade logging system
- Debug Helper: Failure artifact capture
- SSH Helper: Backend system access (future)
- Video Recorder: Test execution recording (future)

Author: QA Automation Team
Version: 1.0.0
"""

from .logger import TestLogger, get_logger
from .debug_helper import DebugHelper, DebugContext

__all__ = [
    'TestLogger',
    'get_logger',
    'DebugHelper',
    'DebugContext',
]
