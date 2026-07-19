import test from "node:test";
import assert from "node:assert/strict";
import { builtInDirectives, getBuiltInDirectiveByName } from "../catalog/directives";
import type { AngularTsCatalogEntry } from "../catalog/types";
import {
  attributeNameAt,
  getAttributeCompletionContext,
  isSupportedTemplateDocument,
} from "../templates/context";

test("HTML attribute completion resolves built-in directive docs", () => {
  const completions = directiveCompletionsForLine("html", "<button ng-");
  const ngClick = completions.find((entry) => entry.htmlName === "ng-click");

  assert.equal(ngClick?.expressionKind, "statement");
  assert.match(ngClick?.description ?? "", /ngAriaDirectives|ngEventDirectives/);
  assert.match(ngClick?.example ?? "", /ng-click/);
});

test("HTML hover resolves standard directive documentation metadata", () => {
  const text = '<input ng-model="user.name">';
  const hover = directiveHoverForText("html", text, text.indexOf("model"));

  assert.equal(hover?.htmlName, "ng-model");
  assert.equal(hover?.expressionKind, "model");
  assert.deepEqual(hover?.aliases, ["ng-model", "data-ng-model"]);
  assert.match(hover?.example ?? "", /ng-model/);
});

test("inline template completion receives the same standard directive docs", () => {
  const source = 'const template = `<button ng-`;';
  const line = source.slice(0, source.indexOf("`;"));
  const completions = directiveCompletionsForLine("typescript", line);
  const ngClick = completions.find((entry) => entry.htmlName === "ng-click");

  assert.equal(ngClick?.expressionKind, "statement");
  assert.deepEqual(ngClick?.aliases, ["ng-click", "data-ng-click"]);
  assert.match(ngClick?.example ?? "", /ng-click/);
});

test("inline template hover resolves the same standard directive docs", () => {
  const source = 'const template = `<section ng-if="ready"></section>`;';
  const hover = directiveHoverForText(
    "typescript",
    source,
    source.indexOf("ng-if") + 3,
  );

  assert.equal(hover?.htmlName, "ng-if");
  assert.equal(hover?.expressionKind, "expression");
  assert.match(hover?.example ?? "", /ng-if/);
});

function directiveCompletionsForLine(
  languageId: string,
  textBeforeCursor: string,
): AngularTsCatalogEntry[] {
  if (!isSupportedTemplateDocument(languageId)) return [];

  const context = getAttributeCompletionContext(textBeforeCursor);
  if (!context) return [];

  return builtInDirectives.filter(
    (entry) => entry.allowedLocations?.includes("attribute"),
  );
}

function directiveHoverForText(
  languageId: string,
  text: string,
  offset: number,
): AngularTsCatalogEntry | undefined {
  if (!isSupportedTemplateDocument(languageId)) return undefined;

  const attribute = attributeNameAt(text, offset);
  if (!attribute) return undefined;

  return getBuiltInDirectiveByName(attribute.name);
}
