import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';

const directory = mkdtempSync(join(tmpdir(), 'angular-native-device-'));
const adb = join(directory, 'adb');
const check = fileURLToPath(
  new URL('./physical-device-check.sh', import.meta.url),
);

writeFileSync(
  adb,
  `#!/usr/bin/env bash
set -euo pipefail
if [[ "\${1:-}" == devices ]]; then
    printf 'List of devices attached\\n'
    printf '%b' "\${FAKE_DEVICES:-}"
    exit 0
fi
property="\${5:-}"
case "$property" in
    ro.kernel.qemu) printf '%s\\n' "\${FAKE_QEMU:-0}" ;;
    ro.hardware) printf '%s\\n' "\${FAKE_HARDWARE:-qcom}" ;;
    ro.build.version.sdk) printf '%s\\n' "\${FAKE_SDK:-37}" ;;
    ro.product.model) printf '%s\\n' "\${FAKE_MODEL:-Reference Phone}" ;;
    ro.build.fingerprint) printf '%s\\n' "\${FAKE_FINGERPRINT:-vendor/device/build}" ;;
    *) exit 2 ;;
esac
`,
);
chmodSync(adb, 0o755);
after(() => rmSync(directory, { force: true, recursive: true }));

function run(devices, environment = {}) {
  return spawnSync(check, {
    encoding: 'utf8',
    env: {
      ...process.env,
      ADB: adb,
      FAKE_DEVICES: devices,
      ...environment,
    },
  });
}

test('accepts exactly one physical Android device', () => {
  const result = run('ABC123\\tdevice\\n');

  assert.equal(result.status, 0);
  assert.match(result.stdout, /ABC123: Reference Phone, API 37/);
  assert.match(result.stdout, /vendor\/device\/build/);
});

test('rejects missing and multiple devices', () => {
  const missing = run('');
  const multiple = run('ABC123\\tdevice\\nDEF456\\tdevice\\n');

  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /found 0/);
  assert.equal(multiple.status, 1);
  assert.match(multiple.stderr, /found 2/);
});

test('rejects emulators', () => {
  const result = run('emulator-5554\\tdevice\\n', {
    FAKE_HARDWARE: 'ranchu',
    FAKE_QEMU: '1',
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /reject emulator emulator-5554/);
});

test('rejects an invalid API level', () => {
  const result = run('ABC123\\tdevice\\n', { FAKE_SDK: 'unknown' });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /invalid Android API level/);
});

test('enforces the expected physical-device API before running gates', () => {
  const mismatch = run('ABC123\tdevice\n', { EXPECTED_ANDROID_API: '36' });
  const malformed = run('ABC123\tdevice\n', {
    EXPECTED_ANDROID_API: 'latest',
  });

  assert.equal(mismatch.status, 1);
  assert.match(mismatch.stderr, /Expected Android API 36, device reports API 37/);
  assert.equal(malformed.status, 1);
  assert.match(malformed.stderr, /must be numeric/);
});
