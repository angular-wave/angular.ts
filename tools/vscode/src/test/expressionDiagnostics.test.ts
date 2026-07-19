import test from "node:test";
import assert from "node:assert/strict";
import { findExpressionSyntaxIssue } from "../templates/expressionDiagnostics";

test("accepts balanced AngularTS expressions", () => {
  assert.equal(
    findExpressionSyntaxIssue(`save(user, { active: ready, label: "A)" })`),
    undefined,
  );
});

test("detects unbalanced brackets and strings", () => {
  assert.match(findExpressionSyntaxIssue(`save(user`)?.message ?? "", /Unclosed/);
  assert.match(findExpressionSyntaxIssue(`items]`)?.message ?? "", /Unexpected/);
  assert.match(findExpressionSyntaxIssue(`"name`)?.message ?? "", /Unclosed/);
});
