import { isDefined, fromJson } from '../../shared/utils.js';

class StreamProvider {
    constructor() {
        this.$get = () => ({
            isReadableStream,
            consumeText,
            readText,
            readLines,
            consumeJsonLines,
            readJsonLines,
        });
    }
}
function isReadableStream(value) {
    return (typeof ReadableStream !== "undefined" && value instanceof ReadableStream);
}
async function consumeText(stream, options = {}) {
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
            if (result.done)
                break;
            const chunk = decoder.decode(result.value, { stream: true });
            if (chunk)
                options.onChunk?.(chunk);
        }
        if (options.signal?.aborted)
            return;
        const tail = decoder.decode();
        if (tail)
            options.onChunk?.(tail);
    }
    finally {
        options.signal?.removeEventListener("abort", cancelReader);
        reader.releaseLock();
    }
}
async function readText(stream, options = {}) {
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
async function readLines(stream, options = {}) {
    const lines = [];
    await consumeLines(stream, {
        ...options,
        onLine(line) {
            lines.push(line);
            options.onLine?.(line);
        },
    });
    return lines;
}
async function consumeJsonLines(stream, options = {}) {
    const ignoreEmpty = options.ignoreEmpty !== false;
    await consumeLines(stream, {
        ...options,
        onLine(line) {
            if (ignoreEmpty && !line.trim())
                return;
            const value = fromJson(line);
            options.onLine?.(line);
            options.onValue?.(value, line);
        },
    });
}
async function readJsonLines(stream, options = {}) {
    const values = [];
    await consumeJsonLines(stream, {
        ...options,
        onValue(value, line) {
            values.push(value);
            options.onValue?.(value, line);
        },
    });
    return values;
}
async function consumeLines(stream, options = {}) {
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

export { StreamProvider };
