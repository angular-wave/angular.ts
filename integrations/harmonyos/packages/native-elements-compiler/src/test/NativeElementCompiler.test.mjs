import assert from "node:assert/strict";
import test from "node:test";
import { compileNativeElement } from "../main/ets/NativeElementCompiler.ts";

test("compiles deterministic explicit custom-element registration", () => {
  const first = compileNativeElement({
    name: "task-card",
    primitive: "TaskCard",
    properties: { title: "STRING", selected: "BOOLEAN" },
    events: ["select"],
    methods: ["focus"],
  });
  const second = compileNativeElement({
    name: "task-card",
    primitive: "TaskCard",
    properties: { selected: "BOOLEAN", title: "STRING" },
    events: ["select"],
    methods: ["focus"],
  });
  assert.equal(first.source, second.source);
  assert.deepEqual(first.registration.properties, ["selected", "title"]);
});

test("rejects ambiguous names and duplicate members", () => {
  assert.throws(() => compileNativeElement({ name: "card", primitive: "Card" }), /hyphen/u);
  assert.throws(() => compileNativeElement({ name: "task-card", primitive: "TaskCard", events: ["open", "open"] }), /Duplicate/u);
});
