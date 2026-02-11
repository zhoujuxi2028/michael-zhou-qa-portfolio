"""Setup configuration for IWSVA Selenium Test Automation Framework"""
from setuptools import setup, find_packages
from pathlib import Path

# Read requirements
requirements_path = Path(__file__).parent / "requirements.txt"
with open(requirements_path) as f:
    requirements = [line.strip() for line in f if line.strip() and not line.startswith('#')]

setup(
    name="iwsva-selenium-tests",
    version="1.0.0",
    description="Enterprise Selenium test automation framework for IWSVA",
    author="QA Automation Team",
    python_requires=">=3.9",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    install_requires=requirements,
    extras_require={
        "dev": ["pytest-cov>=4.1.0", "pylint>=3.0.3", "black>=23.12.1"]
    },
)
