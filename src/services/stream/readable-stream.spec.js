import { createInjector } from "../../core/di/injector.ts";
import { Angular } from "../../angular.ts";

function byteStream(chunks) {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
}

describe("$stream", () => {
  let $stream;

  beforeEach(() => {
    window.angular = new Angular();
    $stream = createInjector(["ng"]).get("$stream");
  });

  it("should decode readable byte streams into text", async () => {
    const chunks = [];
    const text = await $stream.readText(byteStream(["Hel", "lo"]), {
      onChunk: (chunk) => chunks.push(chunk),
    });

    expect(text).toBe("Hello");
    expect(chunks).toEqual(["Hel", "lo"]);
  });

  it("should identify native readable streams", () => {
    expect($stream.isReadableStream(byteStream(["Hello"]))).toBe(true);
    expect($stream.isReadableStream("Hello")).toBe(false);
  });

  it("should consume readable byte streams without returning accumulated text", async () => {
    const chunks = [];
    const result = await $stream.consumeText(byteStream(["Hel", "lo"]), {
      onChunk: (chunk) => chunks.push(chunk),
    });

    expect(result).toBeUndefined();
    expect(chunks).toEqual(["Hel", "lo"]);
  });

  it("should decode readable byte streams into lines", async () => {
    const received = [];
    const lines = await $stream.readLines(byteStream(["a\nb", "\nc"]), {
      onLine: (line) => received.push(line),
    });

    expect(lines).toEqual(["a", "b", "c"]);
    expect(received).toEqual(lines);
  });

  it("should support custom line separators", async () => {
    const lines = await $stream.readLines(byteStream(["a|b", "|c"]), {
      separator: "|",
    });

    expect(lines).toEqual(["a", "b", "c"]);
  });

  it("should decode newline-delimited json into values", async () => {
    const received = [];
    const values = await $stream.readJsonLines(
      byteStream(['{"id":1}\n', "\n", '{"id":2}']),
      {
        onValue: (value) => received.push(value),
      },
    );

    expect(values).toEqual([{ id: 1 }, { id: 2 }]);
    expect(received).toEqual(values);
  });

  it("should consume newline-delimited json without returning accumulated values", async () => {
    const received = [];
    const result = await $stream.consumeJsonLines(
      byteStream(['{"id":1}\n{"id":2}']),
      {
        onValue: (value) => received.push(value),
      },
    );

    expect(result).toBeUndefined();
    expect(received).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("should support custom json line separators", async () => {
    const values = await $stream.readJsonLines(
      byteStream(['{"a":1}|{"a":2}']),
      {
        separator: "|",
      },
    );

    expect(values).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it("should stop reading when the signal is already aborted", async () => {
    const controller = new AbortController();

    controller.abort("stop");

    const text = await $stream.readText(byteStream(["ignored"]), {
      signal: controller.signal,
    });

    expect(text).toBe("");
  });

  it("should stop consuming when the signal is already aborted", async () => {
    const controller = new AbortController();
    const chunks = [];

    controller.abort("stop");

    await $stream.consumeText(byteStream(["ignored"]), {
      signal: controller.signal,
      onChunk: (chunk) => chunks.push(chunk),
    });

    expect(chunks).toEqual([]);
  });

  it("should cancel pending stream reads when the signal aborts", async () => {
    const controller = new AbortController();
    const cancelSpy = jasmine.createSpy("cancel");
    const stream = new ReadableStream({
      cancel: cancelSpy,
    });

    const promise = $stream.consumeText(stream, {
      signal: controller.signal,
    });

    controller.abort("stop");

    await promise;

    expect(cancelSpy.calls.mostRecent().args[0]).toBe("stop");
  });
});
