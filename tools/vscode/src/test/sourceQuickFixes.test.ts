import test from "node:test";
import assert from "node:assert/strict";
import {
  suggestComponentBindingInsertion,
  suggestMissingDiTokensFromInlineArray,
} from "../templates/sourceQuickFixes";

test("suggests missing DI tokens from inline arrays", () => {
  const text = `["$scope", function($scope, userApi, logger)`;
  const suggestion = suggestMissingDiTokensFromInlineArray(text);

  assert.deepEqual(suggestion?.tokenNames, ["userApi", "logger"]);
  assert.equal(suggestion?.insertText, `"userApi", "logger", `);
  assert.equal(suggestion?.insertOffset, text.indexOf("function"));
});

test("preserves existing DI array quote style", () => {
  const suggestion = suggestMissingDiTokensFromInlineArray(
    `['$scope', function($scope, userApi)`,
  );

  assert.equal(suggestion?.insertText, `'userApi', `);
});

test("does not suggest DI token edits when the array has enough tokens", () => {
  assert.equal(
    suggestMissingDiTokensFromInlineArray(
      `["$scope", "userApi", function($scope, userApi)`,
    ),
    undefined,
  );
});

test("suggests inserting missing component binding into existing bindings", () => {
  const source = `angular.module("demo").component("userCard", { bindings: { user: "<" }, template: "" });`;
  const suggestion = suggestComponentBindingInsertion(
    source,
    source.indexOf(".component"),
    "selectedUser",
  );

  assert.equal(suggestion?.insertOffset, source.indexOf("}, template"));
  assert.equal(suggestion?.insertText, `, selectedUser: "<"`);
});

test("suggests adding bindings property when component has none", () => {
  const source = `angular.module("demo").component("userCard", { template: "" });`;
  const suggestion = suggestComponentBindingInsertion(
    source,
    source.indexOf(".component"),
    "selectedUser",
  );

  assert.equal(suggestion?.insertOffset, source.indexOf("{ template") + 1);
  assert.equal(suggestion?.insertText, ` bindings: { selectedUser: "<" },`);
});
