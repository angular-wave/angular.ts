import { expect, type Page } from "@playwright/test";
import abiFuzzCorpus from "./abi-fuzz-corpus.json" with { type: "json" };

/** Runs the shared ABI contract against the real guest loaded by a demo page. */
export async function expectWasmAbiConformance(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      (
        globalThis as typeof globalThis & {
          __angularTsWasmConformance?: unknown;
        }
      ).__angularTsWasmConformance !== undefined,
  );

  const result = await page.evaluate(async (fuzzCorpus) => {
    const probe = (
      globalThis as typeof globalThis & {
        __angularTsWasmConformance?: {
          abi?: {
            _buffers?: Map<number, unknown>;
            _scopes?: Map<number, unknown>;
            _watches?: Map<number, unknown>;
            imports?: {
              angular_ts?: Record<string, (...args: number[]) => number>;
            };
          };
          capabilities?: {
            guestAllocation?: boolean;
          };
          exports: {
            memory: { buffer: ArrayBufferLike };
            ng_abi_alloc?(size: number): number;
            ng_abi_free?(ptr: number, size: number): void;
            ng_abi_version(): number;
          };
          ready?: Promise<unknown>;
        };
      }
    ).__angularTsWasmConformance;

    if (!probe) throw new Error("WASM conformance probe is unavailable");

    await probe.ready;

    const exports = probe.exports;
    const allocations: Array<{ ptr: number; size: number }> = [];
    const guestAllocation = probe.capabilities?.guestAllocation !== false;

    if (guestAllocation && (!exports.ng_abi_alloc || !exports.ng_abi_free)) {
      throw new Error("Guest allocation exports are unavailable");
    }

    for (let size = 1; guestAllocation && size <= 64; size *= 2) {
      const ptr = exports.ng_abi_alloc!(size);

      if (!Number.isInteger(ptr) || ptr <= 0) {
        throw new Error(`Invalid guest allocation for ${String(size)} bytes`);
      }

      if (ptr + size > exports.memory.buffer.byteLength) {
        throw new Error(
          `Guest allocation exceeds memory for ${String(size)} bytes`,
        );
      }

      const bytes = new Uint8Array(exports.memory.buffer, ptr, size);

      bytes.fill(size);
      if (bytes[0] !== size) throw new Error("Guest memory is not writable");
      allocations.push({ ptr, size });
    }

    for (const allocation of allocations.reverse()) {
      exports.ng_abi_free!(allocation.ptr, allocation.size);
    }

    const imports = probe.abi?.imports?.angular_ts;
    const before = {
      buffers: probe.abi?._buffers?.size ?? 0,
      scopes: probe.abi?._scopes?.size ?? 0,
      watches: probe.abi?._watches?.size ?? 0,
    };
    const outsideMemory = exports.memory.buffer.byteLength + 1;
    const malformed = imports
      ? {
          resolve: imports.scope_resolve(outsideMemory, 1),
          get: imports.scope_get(404, outsideMemory, 1),
          set: imports.scope_set(404, outsideMemory, 1, outsideMemory, 1),
          remove: imports.scope_delete(404, outsideMemory, 1),
          sync: imports.scope_sync(404),
          watch: imports.scope_watch(404, outsideMemory, 1),
          unwatch: imports.scope_unwatch(404),
          unbind: imports.scope_unbind(404),
        }
      : undefined;
    const malformedRanges = imports
      ? [
          [-1, 1],
          [0, 1],
          [outsideMemory - 1, 2],
          [1, -1],
          [1, 16 * 1024 + 1],
          [Number.NaN, 1],
          [1, Number.POSITIVE_INFINITY],
        ].map(([ptr, len]) => imports.scope_resolve(ptr, len))
      : undefined;
    let malformedUtf8: number | undefined;
    let fuzzResults:
      | Array<{ name: string; result: number; error: number }>
      | undefined;

    if (imports && guestAllocation) {
      const ptr = exports.ng_abi_alloc!(3);

      new Uint8Array(exports.memory.buffer, ptr, 3).set([0xff, 0xfe, 0xfd]);
      malformedUtf8 = imports.scope_resolve(ptr, 3);
      exports.ng_abi_free!(ptr, 3);

      const encoder = new TextEncoder();

      const scopeHandle = probe.abi?._scopes?.keys().next().value;

      fuzzResults =
        typeof scopeHandle === "number"
          ? fuzzCorpus.map((fixture) => {
              const bytes = encoder.encode(fixture.payload);
              const payloadPtr = exports.ng_abi_alloc!(bytes.byteLength);

              new Uint8Array(
                exports.memory.buffer,
                payloadPtr,
                bytes.byteLength,
              ).set(bytes);

              const result = imports.scope_apply(
                scopeHandle,
                payloadPtr,
                bytes.byteLength,
              );
              const error = imports.error_code();

              exports.ng_abi_free!(payloadPtr, bytes.byteLength);

              return { name: fixture.name, result, error };
            })
          : undefined;
    }

    return {
      version: exports.ng_abi_version(),
      guestAllocation,
      malformed,
      malformedRanges,
      malformedUtf8,
      fuzzResults,
      before,
      after: {
        buffers: probe.abi?._buffers?.size ?? 0,
        scopes: probe.abi?._scopes?.size ?? 0,
        watches: probe.abi?._watches?.size ?? 0,
      },
    };
  }, abiFuzzCorpus);

  expect(result.version).toBe(3);
  expect(typeof result.guestAllocation).toBe("boolean");
  expect(result.malformed).toEqual(
    result.malformed
      ? {
          resolve: 0,
          get: 0,
          set: 0,
          remove: 0,
          sync: 0,
          watch: 0,
          unwatch: 0,
          unbind: 0,
        }
      : undefined,
  );
  expect(result.malformedRanges?.every((value) => value === 0) ?? true).toBe(
    true,
  );
  expect(result.malformedUtf8 ?? 0).toBe(0);
  expect(result.fuzzResults).toEqual(
    result.fuzzResults
      ? abiFuzzCorpus.map((fixture) => ({
          name: fixture.name,
          result: 0,
          error: fixture.error,
        }))
      : undefined,
  );
  expect(result.after).toEqual(result.before);
}
