/**
 * Integration Test Lock Mechanism Tests
 *
 * Tests for scripts/lock.sh - ensures mutual exclusion of concurrent runs
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('Lock Mechanism (scripts/lock.sh)', () => {
  const LOCK_DIR = '/tmp/integration-test.lock.test';
  const LOCK_SCRIPT = path.join(__dirname, '../../..', 'scripts/lib/lock.sh');

  beforeEach(() => {
    // Clean up any leftover lock
    if (fs.existsSync(LOCK_DIR)) {
      fs.rmSync(LOCK_DIR, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up after each test
    if (fs.existsSync(LOCK_DIR)) {
      fs.rmSync(LOCK_DIR, { recursive: true, force: true });
    }
  });

  describe('acquire_lock', () => {
    it('should successfully acquire lock when none exists', () => {
      const cmd = `bash ${LOCK_SCRIPT} acquire ${LOCK_DIR}`;
      expect(() => execSync(cmd, { stdio: 'pipe' })).not.toThrow();
      expect(fs.existsSync(LOCK_DIR)).toBe(true);
    });

    it('should fail with exit code 1 when lock already exists', () => {
      // Create lock manually
      fs.mkdirSync(LOCK_DIR, { recursive: true });

      const cmd = `bash ${LOCK_SCRIPT} acquire ${LOCK_DIR}`;
      expect(() => execSync(cmd, { stdio: 'pipe' })).toThrow();
    });

    it('should output error message when lock exists', () => {
      // Create lock manually
      fs.mkdirSync(LOCK_DIR, { recursive: true });

      // Use || true to allow command to fail but still capture output
      const cmd = `bash ${LOCK_SCRIPT} acquire ${LOCK_DIR} 2>&1 || true`;
      const output = execSync(cmd, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).toString();
      expect(output).toContain('already running');
    });
  });

  describe('release_lock', () => {
    it('should remove lock directory', () => {
      // Create lock manually
      fs.mkdirSync(LOCK_DIR, { recursive: true });
      expect(fs.existsSync(LOCK_DIR)).toBe(true);

      const cmd = `bash ${LOCK_SCRIPT} release ${LOCK_DIR}`;
      execSync(cmd, { stdio: 'pipe' });
      expect(fs.existsSync(LOCK_DIR)).toBe(false);
    });

    it('should succeed even if lock does not exist', () => {
      const cmd = `bash ${LOCK_SCRIPT} release ${LOCK_DIR}`;
      expect(() => execSync(cmd, { stdio: 'pipe' })).not.toThrow();
    });
  });

  describe('lock guard (acquire + auto-release)', () => {
    it('should acquire lock, run command, then release', () => {
      const testCmd = 'echo "test" > /tmp/lock-test-output.txt';
      const cmd = `bash ${LOCK_SCRIPT} guard ${LOCK_DIR} "${testCmd}"`;
      execSync(cmd, { stdio: 'pipe' });

      expect(fs.existsSync(LOCK_DIR)).toBe(false);
      expect(fs.existsSync('/tmp/lock-test-output.txt')).toBe(true);

      fs.unlinkSync('/tmp/lock-test-output.txt');
    });

    it('should fail and release lock if command fails', () => {
      const testCmd = 'exit 1';
      const cmd = `bash ${LOCK_SCRIPT} guard ${LOCK_DIR} "${testCmd}" || true`;
      execSync(cmd, { stdio: 'pipe' });

      expect(fs.existsSync(LOCK_DIR)).toBe(false);
    });

    it('should fail if lock is held', () => {
      fs.mkdirSync(LOCK_DIR, { recursive: true });

      const testCmd = 'true';
      const cmd = `bash ${LOCK_SCRIPT} guard ${LOCK_DIR} "${testCmd}"`;
      expect(() => execSync(cmd, { stdio: 'pipe' })).toThrow();

      // Lock should still exist (not released on failure)
      expect(fs.existsSync(LOCK_DIR)).toBe(true);
    });
  });

  describe('lock state verification', () => {
    it('should maintain exclusive lock across operations', () => {
      // Acquire lock
      execSync(`bash ${LOCK_SCRIPT} acquire ${LOCK_DIR}`, { stdio: 'pipe' });
      expect(fs.existsSync(LOCK_DIR)).toBe(true);

      // Try to acquire again while held (should fail)
      try {
        execSync(`bash ${LOCK_SCRIPT} acquire ${LOCK_DIR}`, { stdio: 'pipe' });
        throw new Error('Should have failed');
      } catch (e) {
        if (e.message === 'Should have failed') throw e;
        // Expected to fail
      }

      // Release lock
      execSync(`bash ${LOCK_SCRIPT} release ${LOCK_DIR}`, { stdio: 'pipe' });
      expect(fs.existsSync(LOCK_DIR)).toBe(false);

      // Now should be able to acquire again
      execSync(`bash ${LOCK_SCRIPT} acquire ${LOCK_DIR}`, { stdio: 'pipe' });
      expect(fs.existsSync(LOCK_DIR)).toBe(true);

      // Clean up
      execSync(`bash ${LOCK_SCRIPT} release ${LOCK_DIR}`, { stdio: 'pipe' });
    });
  });
});
