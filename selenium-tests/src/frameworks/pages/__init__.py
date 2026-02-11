"""
Page Object Models Package

Contains all page object classes following the Page Object Model (POM) pattern.
Each page class represents a specific page or component in the application.

Author: QA Automation Team
Version: 1.0.0
"""

from .base_page import BasePage
from .login_page import LoginPage
from .system_update_page import SystemUpdatePage

__all__ = [
    'BasePage',
    'LoginPage',
    'SystemUpdatePage',
]
