import { strict as assert } from "node:assert";
import test from "node:test";
import { collectEscapes, compareEscapes } from "./check-test-typing.mjs";

const scan = (text) => collectEscapes("fixture.spec.ts", text);

test("counts file-wide directives, ignored errors and explicit any types", () => {
  assert.deepEqual(
    scan("// @ts-nocheck\nlet a: any;\n// @ts-ignore bad\na.missing();"),
    {
      "@ts-nocheck": 1,
      explicitAny: 1,
      "@ts-ignore": 1,
    },
  );
});

test("ignores strings, template text, prose and documented negative test cases", () => {
  assert.deepEqual(
    scan(
      'const a = "// @ts-nocheck"; const b = `// @ts-ignore ${1}`;\n// Avoid @ts-ignore.\n// @ts-expect-error Deliberately invalid input.\naccept(null);',
    ),
    {},
  );
});

test("counts assertions independently of parentheses and preserves const assertions", () => {
  assert.deepEqual(
    scan(
      "const a = (value as unknown) as Scope; const b = value!; const c = 0 as never; const d = [1] as const;",
    ),
    {
      doubleAssertion: 1,
      nonNullAssertion: 1,
      neverAssertion: 1,
    },
  );
});

test("detects global DOM augmentations without rejecting local fixture interfaces", () => {
  assert.deepEqual(
    scan(
      "interface Element {fixture: string} declare global { interface ChildNode {style: CSSStyleDeclaration} }",
    ),
    { domAugmentation: 1 },
  );
});

test("rejects new bypasses in new and already migrated suites", () => {
  assert.deepEqual(
    compareEscapes({ "new.spec.ts": { "@ts-nocheck": 1 } }, {}),
    ["new.spec.ts: @ts-nocheck increased from 0 to 1"],
  );
  assert.equal(
    compareEscapes(
      { "old.spec.ts": { explicitAny: 3 } },
      { "old.spec.ts": { explicitAny: 2 } },
    ).length,
    1,
  );
});

test("allows the baseline to shrink without transferring its allowance between files or kinds", () => {
  const baseline = { "old.spec.ts": { explicitAny: 2 } };
  assert.deepEqual(
    compareEscapes({ "old.spec.ts": { explicitAny: 1 } }, baseline),
    [],
  );
  assert.deepEqual(compareEscapes({}, baseline), []);
  assert.equal(
    compareEscapes({ "old.spec.ts": { nonNullAssertion: 1 } }, baseline).length,
    1,
  );
  assert.equal(
    compareEscapes({ "other.spec.ts": { explicitAny: 1 } }, baseline).length,
    1,
  );
});
