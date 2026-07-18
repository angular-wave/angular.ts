/// <reference types="jasmine" />
import type { Model } from "../../core/app-context/app-context.ts";
import type {
  WasmBinding,
  WasmCompileOptions,
  WasmLoadOptions,
  WasmResource,
  WasmScope,
  WasmScopeTransaction,
  WasmSource,
  WasmTarget,
} from "./wasm.ts";

describe("$wasm types", () => {
  it("uses one reactive-target contract for scopes and app models", () => {
    const scope = null as unknown as ng.Scope;
    const model = null as unknown as Model<{ count: number }>;
    const scopeTarget: WasmTarget = scope;
    const modelTarget: WasmTarget = model;

    // @ts-expect-error plain records are not AngularTS reactive targets.
    const invalidTarget: WasmTarget = { count: 0 };

    expect([scopeTarget, modelTarget, invalidTarget].length).toBe(3);
  });

  it("preserves the concrete target type through resource bindings", () => {
    const model = null as unknown as Model<{ count: number }>;
    const bindModel = (
      resource: WasmResource,
    ): Promise<WasmBinding<typeof model>> => resource.bind(model);
    const readCount = (binding: WasmBinding<typeof model>): number =>
      binding.target.count;

    expect(bindModel).toBeDefined();
    expect(readCount).toBeDefined();
  });

  it("accepts native WebAssembly loading inputs", () => {
    const bytes = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]);
    const sources: WasmSource[] = [
      "module.wasm",
      new URL("https://example.test/module.wasm"),
      new Request("https://example.test/module.wasm"),
      new Response(bytes),
      bytes,
      bytes.buffer,
      new WebAssembly.Module(bytes),
    ];

    expect(sources.length).toBe(7);
  });

  it("uses standard-shaped WebAssembly compile options", () => {
    const compile: WasmCompileOptions = {
      builtins: ["js-string"],
      importedStringConstants: "string_constants",
    };
    const load: WasmLoadOptions = {
      source: "module.wasm",
      compile,
      diagnostics: true,
    };

    expect(load.compile).toBe(compile);
  });

  it("types transactional and binary scope operations", () => {
    const transaction: WasmScopeTransaction = {
      set: { "position.x": 4 },
      delete: ["stale"],
    };
    const useScope = (scope: WasmScope): void => {
      scope.apply(transaction, { origin: "guest:test", echo: false });
      scope.setBinary("frame", new Uint8Array([1, 2, 3]));
      const bytes: Uint8Array | undefined = scope.getBinary("frame");

      expect(bytes).toBeDefined();
    };

    expect(useScope).toBeDefined();
  });
});
