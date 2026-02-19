"""
Helper Modules Package

Contains utility modules for test automation:
- SSH Helper: Backend system access
- Video Recorder: Test execution recording (future)

Note: Logger and DebugHelper are in core.logging and core.debugging respectively.

Author: QA Automation Team
Version: 1.0.0
"""

from .ssh_helper import SSHHelper, create_ssh_helper

__all__ = [
    'SSHHelper',
    'create_ssh_helper',
]
