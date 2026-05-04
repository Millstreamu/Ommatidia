import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function createRepo(branch = 'main') {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'run-review-test-'));
  await execFileAsync('git', ['init', '-b', branch], { cwd: root });
  await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: root });
  await execFileAsync('git', ['config', 'user.name', 'Test User'], { cwd: root });
  await fs.mkdir(path.join(root, 'ops'), { recursive: true });
  await fs.writeFile(path.join(root, 'ops', 'latest-session-review.md'), 'first\n');
  await fs.writeFile(path.join(root, 'ops', 'latest-session-raw.txt'), 'first\n');
  await execFileAsync('git', ['add', '.'], { cwd: root });
  await execFileAsync('git', ['commit', '-m', 'init'], { cwd: root });

  await execFileAsync('git', ['init', '--bare', path.join(root, 'remote.git')]);
  await execFileAsync('git', ['remote', 'add', 'origin', path.join(root, 'remote.git')], { cwd: root });
  await execFileAsync('git', ['push', '-u', 'origin', branch], { cwd: root });

  await fs.copyFile(path.resolve('../../ops/run-review'), path.join(root, 'ops', 'run-review'));
  await fs.copyFile(path.resolve('../../ops/review-current-session.sh'), path.join(root, 'ops', 'review-current-session.sh'));
  await fs.chmod(path.join(root, 'ops', 'run-review'), 0o755);
  await fs.chmod(path.join(root, 'ops', 'review-current-session.sh'), 0o755);
  return root;
}

test('run-review stays on current branch and commits only artifact files when changed', async () => {
  const repo = await createRepo('main');
  await fs.writeFile(path.join(repo, 'ops', 'latest-session-review.md'), 'updated\n');
  const { stdout } = await execFileAsync(path.join(repo, 'ops', 'run-review'), [], { cwd: repo });
  assert.match(stdout, /Current branch: main/);
  assert.match(stdout, /Commit created: yes/);
  assert.match(stdout, /Next push command: git push origin main/);

  const { stdout: branch } = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repo });
  assert.equal(branch.trim(), 'main');

  const { stdout: files } = await execFileAsync('git', ['show', '--name-only', '--pretty=format:', 'HEAD'], { cwd: repo });
  assert.equal(files.trim(), 'ops/latest-session-review.md');
});

test('run-review reports no commit when artifacts unchanged', async () => {
  const repo = await createRepo('main');
  const { stdout } = await execFileAsync(path.join(repo, 'ops', 'run-review'), [], { cwd: repo });
  assert.match(stdout, /Commit created: no/);
});

test('run-review warns on non-main branch', async () => {
  const repo = await createRepo('feature/test');
  await fs.writeFile(path.join(repo, 'ops', 'latest-session-raw.txt'), 'updated\n');
  const { stdout } = await execFileAsync(path.join(repo, 'ops', 'run-review'), [], { cwd: repo });
  assert.match(stdout, /WARNING: Artifacts are being committed to the current branch, not automatically to main\./);
  assert.match(stdout, /Next push command: git push origin feature\/test/);
});
