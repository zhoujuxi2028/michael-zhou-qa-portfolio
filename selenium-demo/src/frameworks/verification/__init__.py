"""
Verification Modules Package

Contains multi-level verification modules for test automation:
- Backend Verification: SSH-based backend verification
- UI Verification: Selenium UI-level verification
- Log Verification: Log file parsing and verification

Author: QA Automation Team
Version: 1.0.0
"""

from .backend_verification import BackendVerification
from .ui_verification import UIVerification
from .log_verification import LogVerification

__all__ = [
    'BackendVerification',
    'UIVerification',
    'LogVerification',
]
