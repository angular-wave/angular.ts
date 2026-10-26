import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { selectBindingSignature } from "./typescript-signatures.mjs";

function signatures(members) {
  const filename = "/binding-signatures-fixture.ts";
  const source = ts.createSourceFile(
    filename,
    `interface Callable { ${members} }`,
    ts.ScriptTarget.Latest,
    true,
  );
  const host = ts.createCompilerHost({});
  host.getSourceFile = (name) => (name === filename ? source : undefined);
  const program = ts.createProgram([filename], { noLib: true }, host);
  return program
    .getTypeChecker()
    .getTypeAtLocation(source.statements[0])
    .getCallSignatures();
}

test("returns no signature for non-callable types", () => {
  assert.equal(selectBindingSignature([]), undefined);
});

test("retains a single callable signature", () => {
  const candidates = signatures("(value: string): unknown;");
  assert.equal(selectBindingSignature(candidates), candidates[0]);
});

test("preserves the overload with the most exposed parameters", () => {
  const candidates = signatures(
    "(): unknown; (value: string, optional?: number): unknown;",
  );
  assert.equal(
    selectBindingSignature(candidates, { preferMostParameters: true }),
    candidates[1],
  );
});

test("keeps optional controller flags when a literal overload comes first", () => {
  const candidates = signatures(`
    (expression: string, locals: object | undefined, later: true, ident?: string): () => object;
    (expression: string, locals?: object, later?: boolean, ident?: string): unknown;
  `);
  assert.equal(selectBindingSignature(candidates), candidates[1]);
});

test("keeps the general controller overload when declaration order is reversed", () => {
  const candidates = signatures(`
    (expression: string, locals?: object, later?: boolean, ident?: string): unknown;
    (expression: string, locals: object | undefined, later: true, ident?: string): () => object;
  `);
  assert.equal(selectBindingSignature(candidates), candidates[0]);
});

test("does not count a rest parameter as a required argument", () => {
  const candidates = signatures(
    "(value: string, options: number): unknown; (value: string, ...options: number[]): unknown;",
  );
  assert.equal(selectBindingSignature(candidates), candidates[1]);
});

test("preserves declaration order when signatures have equal arity and optionality", () => {
  const candidates = signatures(
    "(value: string): string; (value: number): number;",
  );
  assert.equal(selectBindingSignature(candidates), candidates[0]);
});

test("preserves a zero-argument contract when a generator uses the first arity", () => {
  const candidates = signatures("(): void; (skipBroadcast: boolean): void;");
  assert.equal(selectBindingSignature(candidates), candidates[0]);
});

test("does not merge distinct same-arity calling conventions", () => {
  const candidates = signatures(
    "(clone: () => void, target: object, slot: string): void; (scope?: object, clone?: () => void, options?: object): void;",
  );
  assert.equal(selectBindingSignature(candidates), candidates[0]);
});
