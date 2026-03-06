"""
SSH Helper Module

Enterprise-grade SSH operations for backend verification and remote command execution.
Provides connection management, command execution, file operations, and error handling.

Author: QA Automation Team
Version: 1.0.0
"""

import paramiko
import time
from typing import Optional, Tuple, List, Dict, Any
from pathlib import Path
from core.logging.test_logger import get_logger

logger = get_logger(__name__)


class SSHHelper:
    """
    SSH Helper for remote server operations.

    Manages SSH connections to IWSVA server for backend verification including:
    - Remote command execution
    - File reading and writing
    - Service status checking
    - Log file retrieval

    Attributes:
        host (str): SSH server hostname or IP
        port (int): SSH server port
        username (str): SSH username
        password (str): SSH password
        client (paramiko.SSHClient): SSH client instance
        connected (bool): Connection status

    Example:
        >>> ssh = SSHHelper(host='10.206.201.9', username='root', password='pass')
        >>> ssh.connect()
        >>> output = ssh.execute_command('uname -r')
        >>> ssh.disconnect()
    """

    def __init__(
        self,
        host: str,
        username: str,
        password: str,
        port: int = 22,
        timeout: int = 30
    ):
        """
        Initialize SSH Helper.

        Args:
            host: SSH server hostname or IP address
            username: SSH username
            password: SSH password
            port: SSH port (default: 22)
            timeout: Connection timeout in seconds (default: 30)
        """
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.timeout = timeout
        self.client: Optional[paramiko.SSHClient] = None
        self.connected = False

        logger.debug(f"SSHHelper initialized for {username}@{host}:{port}")

    def connect(self) -> bool:
        """
        Establish SSH connection to the server.

        Returns:
            bool: True if connection successful, False otherwise

        Raises:
            paramiko.SSHException: If SSH connection fails
            paramiko.AuthenticationException: If authentication fails
        """
        try:
            logger.info(f"Connecting to SSH server {self.username}@{self.host}:{self.port}")

            self.client = paramiko.SSHClient()
            self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

            self.client.connect(
                hostname=self.host,
                port=self.port,
                username=self.username,
                password=self.password,
                timeout=self.timeout,
                look_for_keys=False,
                allow_agent=False
            )

            self.connected = True
            logger.info(f"✓ SSH connection established to {self.host}")
            return True

        except paramiko.AuthenticationException as e:
            logger.error(f"✗ SSH authentication failed: {e}")
            self.connected = False
            raise

        except paramiko.SSHException as e:
            logger.error(f"✗ SSH connection failed: {e}")
            self.connected = False
            raise

        except Exception as e:
            logger.error(f"✗ Unexpected error during SSH connection: {e}")
            self.connected = False
            raise

    def disconnect(self) -> None:
        """
        Close SSH connection.
        """
        if self.client:
            self.client.close()
            self.connected = False
            logger.info(f"✓ SSH connection closed to {self.host}")

    def execute_command(
        self,
        command: str,
        timeout: int = 30,
        sudo: bool = False
    ) -> Tuple[str, str, int]:
        """
        Execute a command on the remote server.

        Args:
            command: Command to execute
            timeout: Command execution timeout in seconds (default: 30)
            sudo: Execute command with sudo (default: False)

        Returns:
            tuple: (stdout, stderr, exit_code)

        Raises:
            RuntimeError: If not connected to SSH server

        Example:
            >>> stdout, stderr, code = ssh.execute_command('uname -r')
            >>> print(f"Kernel: {stdout.strip()}")
        """
        if not self.connected or not self.client:
            raise RuntimeError("Not connected to SSH server. Call connect() first.")

        try:
            # Add sudo prefix if requested
            if sudo and not command.startswith('sudo'):
                command = f"sudo {command}"

            logger.debug(f"Executing SSH command: {command}")

            # Execute command
            stdin, stdout, stderr = self.client.exec_command(
                command,
                timeout=timeout
            )

            # Read output
            stdout_text = stdout.read().decode('utf-8')
            stderr_text = stderr.read().decode('utf-8')
            exit_code = stdout.channel.recv_exit_status()

            if exit_code == 0:
                logger.debug(f"✓ Command executed successfully (exit code: {exit_code})")
            else:
                logger.warning(f"✗ Command failed with exit code {exit_code}")
                if stderr_text:
                    logger.warning(f"stderr: {stderr_text[:200]}")

            return stdout_text, stderr_text, exit_code

        except Exception as e:
            logger.error(f"✗ Error executing command '{command}': {e}")
            raise

    def read_file(self, remote_path: str, encoding: str = 'utf-8') -> str:
        """
        Read content of a remote file.

        Args:
            remote_path: Path to the remote file
            encoding: File encoding (default: 'utf-8')

        Returns:
            str: File content

        Raises:
            RuntimeError: If not connected to SSH server
            FileNotFoundError: If remote file does not exist

        Example:
            >>> content = ssh.read_file('/etc/iscan/intscan.ini')
        """
        if not self.connected or not self.client:
            raise RuntimeError("Not connected to SSH server. Call connect() first.")

        try:
            logger.debug(f"Reading remote file: {remote_path}")

            sftp = self.client.open_sftp()

            try:
                with sftp.file(remote_path, 'r') as remote_file:
                    content = remote_file.read().decode(encoding)

                logger.debug(f"✓ File read successfully ({len(content)} bytes)")
                return content

            finally:
                sftp.close()

        except FileNotFoundError:
            logger.error(f"✗ Remote file not found: {remote_path}")
            raise

        except Exception as e:
            logger.error(f"✗ Error reading remote file '{remote_path}': {e}")
            raise

    def write_file(
        self,
        remote_path: str,
        content: str,
        encoding: str = 'utf-8',
        mode: str = 'w'
    ) -> bool:
        """
        Write content to a remote file.

        Args:
            remote_path: Path to the remote file
            content: Content to write
            encoding: File encoding (default: 'utf-8')
            mode: Write mode - 'w' (write) or 'a' (append)

        Returns:
            bool: True if successful

        Raises:
            RuntimeError: If not connected to SSH server
        """
        if not self.connected or not self.client:
            raise RuntimeError("Not connected to SSH server. Call connect() first.")

        try:
            logger.debug(f"Writing to remote file: {remote_path}")

            sftp = self.client.open_sftp()

            try:
                with sftp.file(remote_path, mode) as remote_file:
                    remote_file.write(content.encode(encoding))

                logger.debug(f"✓ File written successfully ({len(content)} bytes)")
                return True

            finally:
                sftp.close()

        except Exception as e:
            logger.error(f"✗ Error writing to remote file '{remote_path}': {e}")
            raise

    def file_exists(self, remote_path: str) -> bool:
        """
        Check if a remote file exists.

        Args:
            remote_path: Path to the remote file

        Returns:
            bool: True if file exists, False otherwise
        """
        if not self.connected or not self.client:
            raise RuntimeError("Not connected to SSH server. Call connect() first.")

        try:
            sftp = self.client.open_sftp()

            try:
                sftp.stat(remote_path)
                logger.debug(f"✓ File exists: {remote_path}")
                return True

            except FileNotFoundError:
                logger.debug(f"✗ File does not exist: {remote_path}")
                return False

            finally:
                sftp.close()

        except Exception as e:
            logger.error(f"✗ Error checking file existence '{remote_path}': {e}")
            return False

    def get_file_info(self, remote_path: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a remote file.

        Args:
            remote_path: Path to the remote file

        Returns:
            dict: File information (size, mtime, permissions) or None if not found

        Example:
            >>> info = ssh.get_file_info('/etc/iscan/intscan.ini')
            >>> print(f"Size: {info['size']} bytes")
        """
        if not self.connected or not self.client:
            raise RuntimeError("Not connected to SSH server. Call connect() first.")

        try:
            sftp = self.client.open_sftp()

            try:
                stat = sftp.stat(remote_path)

                info = {
                    'size': stat.st_size,
                    'mtime': stat.st_mtime,
                    'permissions': oct(stat.st_mode)[-3:],
                    'uid': stat.st_uid,
                    'gid': stat.st_gid,
                }

                logger.debug(f"✓ File info retrieved: {remote_path} ({info['size']} bytes)")
                return info

            finally:
                sftp.close()

        except FileNotFoundError:
            logger.debug(f"✗ File not found: {remote_path}")
            return None

        except Exception as e:
            logger.error(f"✗ Error getting file info '{remote_path}': {e}")
            return None

    def execute_command_with_output(
        self,
        command: str,
        expected_exit_code: int = 0
    ) -> str:
        """
        Execute command and return stdout, asserting exit code.

        Args:
            command: Command to execute
            expected_exit_code: Expected exit code (default: 0)

        Returns:
            str: Command stdout

        Raises:
            RuntimeError: If exit code doesn't match expected
        """
        stdout, stderr, exit_code = self.execute_command(command)

        if exit_code != expected_exit_code:
            raise RuntimeError(
                f"Command failed with exit code {exit_code} "
                f"(expected {expected_exit_code})\n"
                f"Command: {command}\n"
                f"stderr: {stderr}"
            )

        return stdout.strip()

    def is_service_running(self, service_name: str) -> bool:
        """
        Check if a systemd service is running.

        Args:
            service_name: Name of the service (e.g., 'httpd', 'iwss')

        Returns:
            bool: True if service is running, False otherwise

        Example:
            >>> if ssh.is_service_running('iwss'):
            ...     print("IWSS service is running")
        """
        try:
            command = f"systemctl is-active {service_name}"
            stdout, stderr, exit_code = self.execute_command(command)

            is_running = stdout.strip() == 'active'

            if is_running:
                logger.debug(f"✓ Service '{service_name}' is running")
            else:
                logger.debug(f"✗ Service '{service_name}' is not running (state: {stdout.strip()})")

            return is_running

        except Exception as e:
            logger.error(f"✗ Error checking service status '{service_name}': {e}")
            return False

    def get_service_status(self, service_name: str) -> Dict[str, Any]:
        """
        Get detailed status of a systemd service.

        Args:
            service_name: Name of the service

        Returns:
            dict: Service status information
        """
        try:
            command = f"systemctl status {service_name}"
            stdout, stderr, exit_code = self.execute_command(command)

            return {
                'service': service_name,
                'is_running': self.is_service_running(service_name),
                'status_output': stdout,
                'exit_code': exit_code
            }

        except Exception as e:
            logger.error(f"✗ Error getting service status '{service_name}': {e}")
            return {
                'service': service_name,
                'is_running': False,
                'error': str(e)
            }

    def __enter__(self):
        """Context manager entry - auto connect."""
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - auto disconnect."""
        self.disconnect()

    def __repr__(self) -> str:
        """String representation."""
        status = "connected" if self.connected else "disconnected"
        return f"SSHHelper({self.username}@{self.host}:{self.port}, {status})"


# ==================== Factory Function ====================

def create_ssh_helper(ssh_config: Dict[str, Any]) -> SSHHelper:
    """
    Factory function to create SSHHelper from config dictionary.

    Args:
        ssh_config: SSH configuration dictionary with keys:
            - host: SSH server hostname/IP
            - port: SSH port (default: 22)
            - username: SSH username
            - password: SSH password

    Returns:
        SSHHelper: Configured SSHHelper instance

    Example:
        >>> from core.config.test_config import TestConfig
        >>> ssh = create_ssh_helper(TestConfig.SSH_CONFIG)
        >>> ssh.connect()
    """
    return SSHHelper(
        host=ssh_config['host'],
        port=ssh_config.get('port', 22),
        username=ssh_config['username'],
        password=ssh_config['password']
    )
