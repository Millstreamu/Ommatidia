import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function setupRepo() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-shortcuts-test-'));
  await execFileAsync('git', ['init', '-b', 'main'], { cwd: root });
  await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: root });
  await execFileAsync('git', ['config', 'user.name', 'Test User'], { cwd: root });
  await fs.mkdir(path.join(root, 'ops'), { recursive: true });
  const files = ['help', 'status-all', 'readiness-check', 'session-once', 'review-latest', 'session-batch', 'run-session-batch.sh', 'run-review', 'review-current-session.sh', 'COMMANDS.md'];
  for (const file of files) {
    await fs.copyFile(path.resolve('../../ops', file), path.join(root, 'ops', file));
  }
  for (const file of ['help', 'status-all', 'readiness-check', 'session-once', 'review-latest', 'session-batch', 'run-session-batch.sh', 'run-review', 'review-current-session.sh']) {
    await fs.chmod(path.join(root, 'ops', file), 0o755);
  }
  await fs.writeFile(path.join(root, 'ops', 'latest-session-review.md'), '# review\nstatus: stood_aside\n');
  await fs.writeFile(path.join(root, 'ops', 'latest-session-raw.txt'), 'raw\n');
  await execFileAsync('git', ['add', '.'], { cwd: root });
  await execFileAsync('git', ['commit', '-m', 'init'], { cwd: root });
  return root;
}

test('ops/help prints stable action names', async () => {
  const repo = await setupRepo();
  const { stdout } = await execFileAsync(path.join(repo, 'ops', 'help'), [], { cwd: repo });
  assert.match(stdout, /session_once/);
  assert.match(stdout, /readiness_check/);
  assert.match(stdout, /ops\/COMMANDS.md/);
});

test('ops/review-latest prints artifact preview', async () => {
  const repo = await setupRepo();
  const { stdout } = await execFileAsync(path.join(repo, 'ops', 'review-latest'), [], { cwd: repo });
  assert.match(stdout, /current-branch artifacts/);
  assert.match(stdout, /latest-session-review\.md/);
});

test('ops/session-batch forwards to underlying script', async () => {
  const repo = await setupRepo();
  const { stdout } = await execFileAsync(path.join(repo, 'ops', 'session-batch'), ['1', '0'], {
    cwd: repo,
    env: {
      ...process.env,
      BEEBOT_SESSION_START_CMD: 'true',
      BEEBOT_SESSION_STOP_CMD: 'true',
      BEEBOT_REVIEW_CMD: path.join(repo, 'ops', 'run-review')
    }
  });
  assert.match(stdout, /\[session_batch\] forwarding/);
  assert.match(stdout, /\[batch\] session 1\/1 start/);
});
