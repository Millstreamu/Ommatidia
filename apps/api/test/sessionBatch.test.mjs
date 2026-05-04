import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function setupHarness(statuses) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'batch-test-'));
  const opsDir = path.join(root, 'ops');
  await fs.mkdir(opsDir, { recursive: true });
  const latestReview = path.join(opsDir, 'latest-session-review.md');
  const latestRaw = path.join(opsDir, 'latest-session-raw.txt');
  const stateFile = path.join(root, 'state.txt');

  const reviewScript = `#!/usr/bin/env bash
set -euo pipefail
STATE_FILE="${stateFile}"
LATEST_REVIEW="${latestReview}"
LATEST_RAW="${latestRaw}"
index=0
if [[ -f "$STATE_FILE" ]]; then index=$(cat "$STATE_FILE"); fi
status_list=( ${statuses.join(' ')} )
status="${statuses[0]}"
if [[ "$index" -lt "${statuses.length}" ]]; then status="${statuses.join(' ')}"; status=$(echo "$status" | cut -d ' ' -f $((index + 1))); fi
printf "%s" $((index + 1)) > "$STATE_FILE"
printf "# review\nstatus: %s\n\n## Top next step\nKeep current risk guardrails.\n" "$status" > "$LATEST_REVIEW"
printf "raw %s\n" "$status" > "$LATEST_RAW"
`;
  const reviewCmd = path.join(root, 'mock-run-review.sh');
  await fs.writeFile(reviewCmd, reviewScript, { mode: 0o755 });
  return { root, opsDir, reviewCmd };
}

async function runBatch(harness, count) {
  const script = path.resolve('../../ops/run-session-batch.sh');
  await execFileAsync(script, [String(count), '0'], {
    env: {
      ...process.env,
      BEEBOT_REVIEW_CMD: harness.reviewCmd,
      BEEBOT_BATCH_ROOT: path.join(harness.opsDir, 'batch-runs'),
      BEEBOT_SESSION_START_CMD: 'true',
      BEEBOT_SESSION_STOP_CMD: 'true',
      BEEBOT_REVIEW_MD_PATH: path.join(harness.opsDir, 'latest-session-review.md'),
      BEEBOT_REVIEW_RAW_PATH: path.join(harness.opsDir, 'latest-session-raw.txt')
    }
  });
  const runs = await fs.readdir(path.join(harness.opsDir, 'batch-runs'));
  return path.join(harness.opsDir, 'batch-runs', runs[0]);
}

test('batch artifact generation creates per-session review/raw and summary', async () => {
  const harness = await setupHarness(['stood_aside', 'blocked']);
  const runDir = await runBatch(harness, 2);
  assert.ok(existsSync(path.join(runDir, 'session-1-review.md')));
  assert.ok(existsSync(path.join(runDir, 'session-2-review.md')));
  assert.ok(existsSync(path.join(runDir, 'session-1-raw.txt')));
  assert.ok(existsSync(path.join(runDir, 'session-2-raw.txt')));
  assert.ok(existsSync(path.join(runDir, 'batch-summary.md')));
});

test('session review artifact includes parseable metadata and verdict block', async () => {
  const harness = await setupHarness(['acted_no_fill']);
  const runDir = await runBatch(harness, 1);
  const review = await fs.readFile(path.join(runDir, 'session-1-review.md'), 'utf8');
  assert.match(review, /artifact_type: single_session_review/);
  assert.match(review, /reviewed_session_id: 1/);
  assert.match(review, /session_start_utc: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/);
  assert.match(review, /session_stop_utc: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/);
  assert.match(review, /git_branch: /);
  assert.match(review, /git_commit: [a-f0-9]{40}|unknown/);
  assert.match(review, /artifact_generated_utc: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/);
  assert.match(review, /entry_executed: yes/);
  assert.match(review, /exit_executed: yes/);
  assert.match(review, /ended_flat: yes/);
  assert.match(review, /behavior_classification: acted_no_fill/);
  assert.match(review, /top_next_step: Keep current risk guardrails\./);
});

test('summary rollups include counts, latest markers, and metadata block', async () => {
  const harness = await setupHarness(['stood_aside', 'acted_no_fill', 'acted_round_trip', 'refused']);
  const runDir = await runBatch(harness, 4);
  const summary = await fs.readFile(path.join(runDir, 'batch-summary.md'), 'utf8');
  assert.match(summary, /artifact_type: batch_summary/);
  assert.match(summary, /reviewed_session_id: batch_/);
  assert.match(summary, /git_branch: /);
  assert.match(summary, /git_commit: [a-f0-9]{40}|unknown/);
  assert.match(summary, /total_sessions_run: 4/);
  assert.match(summary, /stood_aside: 1/);
  assert.match(summary, /acted_no_fill: 1/);
  assert.match(summary, /acted_round_trip: 1/);
  assert.match(summary, /refused: 1/);
  assert.match(summary, /latest_acted_session: 3/);
  assert.match(summary, /latest_round_trip_session: 3/);
});

test('empty no-acted batch summary keeps latest_acted_session as none', async () => {
  const harness = await setupHarness(['stood_aside', 'blocked']);
  const runDir = await runBatch(harness, 2);
  const summary = await fs.readFile(path.join(runDir, 'batch-summary.md'), 'utf8');
  assert.match(summary, /latest_acted_session: none/);
  assert.match(summary, /latest_round_trip_session: none/);
});

test('batch supports acted_no_fill and acted_opened counts', async () => {
  const harness = await setupHarness(['acted_no_fill', 'acted_opened']);
  const runDir = await runBatch(harness, 2);
  const summary = await fs.readFile(path.join(runDir, 'batch-summary.md'), 'utf8');
  assert.match(summary, /acted_no_fill: 1/);
  assert.match(summary, /acted_opened: 1/);
  assert.match(summary, /latest_acted_session: 2/);
});
