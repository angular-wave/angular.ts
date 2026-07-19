import test from "node:test";
import assert from "node:assert/strict";
import { TypeScriptProjectService } from "../analyzer/typescriptProject";

const fileName = "/workspace/app.ts";

test("provides TypeScript quick info and definitions for project symbols", () => {
  const source = `
    export interface User { name: string }
    export function save(user: User): boolean {
      return Boolean(user.name);
    }

    const current: User = { name: "Ada" };
    save(current);
  `;
  const project = new TypeScriptProjectService([{ fileName, text: source }], {}, "/");
  const currentOffset = source.lastIndexOf("current");
  const saveOffset = source.lastIndexOf("save");

  const quickInfo = project.quickInfo(fileName, currentOffset);
  const definitions = project.definitions(fileName, saveOffset);

  assert.match(quickInfo?.display ?? "", /const current: User/);
  assert.equal(definitions.length, 1);
  assert.equal(
    source.slice(definitions[0].start, definitions[0].end),
    "save",
  );
});

test("provides TypeScript completions and signature help", () => {
  const source = `
    interface User { name: string }
    function save(user: User, force?: boolean): boolean {
      return Boolean(force || user.name);
    }

    const current: User = { name: "Ada" };
    sav
    save(current, )
  `;
  const project = new TypeScriptProjectService([{ fileName, text: source }], {}, "/");

  const completions = project.completions(fileName, source.lastIndexOf("sav") + 3);
  const signature = project.signatureHelp(fileName, source.indexOf("current, ") + 9);

  assert.ok(completions.includes("save"));
  assert.equal(signature?.signature, "save(user: User, force?: boolean): boolean");
  assert.equal(signature?.activeParameter, 1);
});

test("updates in-memory TypeScript files", () => {
  const project = new TypeScriptProjectService(
    [{ fileName, text: `const value = 1; value;` }],
    {},
    "/",
  );

  project.updateFile(fileName, `const value = "ready"; value;`);

  const quickInfo = project.quickInfo(fileName, `const value = "ready"; `.length);

  assert.match(quickInfo?.display ?? "", /const value: "ready"/);
});
