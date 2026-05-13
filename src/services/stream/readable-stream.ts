import { fromJson, isDefined } from "../../shared/utils.ts";

export interface StreamReadOptions {
  /** TextDecoder encoding. Defaults to utf-8. */
  encoding?: string;
  /** Optional cancellation signal. */
  signal?: AbortSignal;
}

export interface TextStreamReadOptions extends StreamReadOptions {
  /** Called for every decoded text chunk. */
  onChunk?: (chunk: string) => void;
}

export interface LineStreamReadOptions extends StreamReadOptions {
  /** Line separator. Defaults to newline variants. */
  separator?: RegExp | string;
  /** Called for every complete decoded line. */
  onLine?: (line: string) => void;
}

export interface JsonLineStreamReadOptions<
  T = unknown,
> extends LineStreamReadOptions {
  /** Called for every parsed JSON line. */
  onValue?: (value: T, line: string) => void;
  /** Whether empty lines should be skipped. Defaults to true. */
  ignoreEmpty?: boolean;
}

export interface StreamService {
  /** Returns true when a value is a native readable byte stream. */
  isReadableStream(value: unknown): value is ReadableStream<Uint8Array>;

  /** Decodes a byte stream and calls `onChunk` without retaining decoded text. */
  consumeText(
    stream: ReadableStream<Uint8Array>,
    options?: TextStreamReadOptions,
  ): Promise<void>;

  /** Decodes a byte stream into text chunks. */
  readText(
    stream: ReadableStream<Uint8Array>,
    options?: TextStreamReadOptions,
  ): Promise<string>;

  /** Decodes a byte stream and emits complete lines. */
  readLines(
    stream: ReadableStream<Uint8Array>,
    options?: LineStreamReadOptions,
  ): Promise<string[]>;

  /** Decodes newline-delimited JSON without retaining parsed values. */
  consumeJsonLines<T = unknown>(
    stream: ReadableStream<Uint8Array>,
    options?: JsonLineStreamReadOptions<T>,
  ): Promise<void>;

  /** Decodes newline-delimited JSON and returns all parsed values. */
  readJsonLines<T = unknown>(
    stream: ReadableStream<Uint8Array>,
    options?: JsonLineStreamReadOptions<T>,
  ): Promise<T[]>;
}

export class StreamProvider {
  $get = (): StreamService => ({
    isReadableStream,
    consumeText,
    readText,
    readLines,
    consumeJsonLines,
    readJsonLines,
  });
}

function isReadableStream(value: unknown): value is ReadableStream<Uint8Array> {
  return (
    typeof ReadableStream !== "undefined" && value instanceof ReadableStream
  );
}

async function consumeText(
  stream: ReadableStream<Uint8Array>,
  options: TextStreamReadOptions = {},
): Promise<void> {
  const reader = stream.getReader();

  const decoder = new TextDecoder(options.encoding);

  const cancelReader = () => {
    void reader.cancel(options.signal?.reason);
  };

  try {
    if (options.signal?.aborted) {
      await reader.cancel(options.signal.reason);

      return;
    }

    options.signal?.addEventListener("abort", cancelReader, { once: true });

    for (;;) {
      if (options.signal?.aborted) {
        await reader.cancel(options.signal.reason);

        break;
      }

      const result = await reader.read();

      if (result.done) break;

      const chunk = decoder.decode(result.value, { stream: true });

      if (chunk) options.onChunk?.(chunk);
    }

    if (options.signal?.aborted) return;

    const tail = decoder.decode();

    if (tail) options.onChunk?.(tail);
  } finally {
    options.signal?.removeEventListener("abort", cancelReader);
    reader.releaseLock();
  }
}

async function readText(
  stream: ReadableStream<Uint8Array>,
  options: TextStreamReadOptions = {},
): Promise<string> {
  let text = "";

  await consumeText(stream, {
    ...options,
    onChunk(chunk) {
      text += chunk;
      options.onChunk?.(chunk);
    },
  });

  return text;
}

async function readLines(
  stream: ReadableStream<Uint8Array>,
  options: LineStreamReadOptions = {},
): Promise<string[]> {
  const lines: string[] = [];

  await consumeLines(stream, {
    ...options,
    onLine(line) {
      lines.push(line);
      options.onLine?.(line);
    },
  });

  return lines;
}

async function consumeJsonLines<T = unknown>(
  stream: ReadableStream<Uint8Array>,
  options: JsonLineStreamReadOptions<T> = {},
): Promise<void> {
  const ignoreEmpty = options.ignoreEmpty !== false;

  await consumeLines(stream, {
    ...options,
    onLine(line) {
      if (ignoreEmpty && !line.trim()) return;

      const value = fromJson(line) as T;

      options.onLine?.(line);
      options.onValue?.(value, line);
    },
  });
}

async function readJsonLines<T = unknown>(
  stream: ReadableStream<Uint8Array>,
  options: JsonLineStreamReadOptions<T> = {},
): Promise<T[]> {
  const values: T[] = [];

  await consumeJsonLines<T>(stream, {
    ...options,
    onValue(value, line) {
      values.push(value);
      options.onValue?.(value, line);
    },
  });

  return values;
}

async function consumeLines(
  stream: ReadableStream<Uint8Array>,
  options: LineStreamReadOptions = {},
): Promise<void> {
  const separator = options.separator ?? /\r?\n/;

  let pending = "";

  await consumeText(stream, {
    ...options,
    onChunk(chunk) {
      pending += chunk;

      const parts = pending.split(separator);

      pending = parts.pop() ?? "";

      parts.forEach((line) => options.onLine?.(line));
    },
  });

  if (isDefined(pending) && pending !== "") {
    options.onLine?.(pending);
  }
}
