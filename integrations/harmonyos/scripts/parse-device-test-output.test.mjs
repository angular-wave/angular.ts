import assert from "node:assert/strict";
import test from "node:test";
import { parseDeviceTestOutput } from "./parse-device-test-output.mjs";

const passing = `
OHOS_REPORT_STATUS_CODE: 1
OHOS_REPORT_STATUS_CODE: 0
OHOS_REPORT_RESULT: stream=Tests run: 1, Failure: 0, Error: 0, Pass: 1, Ignore: 0
OHOS_REPORT_CODE: 0
`;

test("accepts one complete Hypium device run", () => {
  assert.deepEqual(parseDeviceTestOutput(passing), {
    schemaVersion: 1,
    framework: "hypium",
    total: 1,
    passed: 1,
    failed: 0,
    errors: 0,
    ignored: 0,
  });
});

test("rejects missing, duplicate, inconsistent, failed, and ignored runs", () => {
  assert.throws(() => parseDeviceTestOutput(""), /exactly one/u);
  assert.throws(() => parseDeviceTestOutput(`${passing}${passing}`), /exactly one/u);
  assert.throws(
    () => parseDeviceTestOutput(passing.replace("Tests run: 1", "Tests run: 2")),
    /inconsistent/u,
  );
  assert.throws(
    () => parseDeviceTestOutput(passing.replace("Failure: 0", "Failure: 1")),
    /inconsistent/u,
  );
  assert.throws(
    () => parseDeviceTestOutput(
      passing.replace("Pass: 1, Ignore: 0", "Pass: 0, Ignore: 1"),
    ),
    /failed/u,
  );
  assert.throws(
    () => parseDeviceTestOutput(passing.replace("OHOS_REPORT_CODE: 0", "OHOS_REPORT_CODE: 2")),
    /failed/u,
  );
  assert.throws(
    () => parseDeviceTestOutput(passing.replace("STATUS_CODE: 0", "STATUS_CODE: -2")),
    /failed test status/u,
  );
});
