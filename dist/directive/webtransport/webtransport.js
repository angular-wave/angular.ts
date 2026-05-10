import { _webTransport, _parse, _log, _exceptionHandler } from '../../injection-tokens.js';
import { isString, isObject, uppercase, isFunction, isUndefined } from '../../shared/utils.js';

ngWebTransportDirective.$inject = [
    _webTransport,
    _parse,
    _log,
    _exceptionHandler,
];
/**
 * Connects an element to a WebTransport endpoint and evaluates template
 * expressions for incoming datagrams or unidirectional streams.
 */
function ngWebTransportDirective($webTransport, $parse, $log, $exceptionHandler) {
    const decoder = new TextDecoder();
    return {
        restrict: "A",
        link(scope, element, attrs) {
            const eventName = attrs.trigger || "load";
            const mode = parseMode(attrs.mode);
            const transform = parseTransform(attrs.transform);
            let connection;
            let streamReader = null;
            function attr(name) {
                return (attrs[name] || attrs[`data${uppercase(name[0])}${name.slice(1)}`]);
            }
            function evaluate(expression, locals) {
                if (!expression)
                    return;
                try {
                    $parse(expression)(scope, locals);
                    if (isFunction(scope.$flushQueue)) {
                        scope.$flushQueue();
                    }
                }
                catch (error) {
                    $exceptionHandler(error);
                }
            }
            function dispatch(name, detail) {
                return element.dispatchEvent(new CustomEvent(`ng:webtransport:${name}`, {
                    bubbles: true,
                    cancelable: true,
                    detail,
                }));
            }
            function resolveUrl() {
                const value = attrs.ngWebTransport;
                if (!value)
                    return undefined;
                if (/^https:\/\//i.test(value))
                    return value;
                try {
                    const evaluated = $parse(value)(scope);
                    return isString(evaluated) ? evaluated : value;
                }
                catch {
                    return value;
                }
            }
            function resolveConfig() {
                const expression = attr("config");
                if (!expression)
                    return {};
                const value = $parse(expression)(scope);
                return isObject(value) ? { ...value } : {};
            }
            function assignConnection(nextConnection) {
                const expression = attr("as");
                if (!expression)
                    return;
                const parsed = $parse(expression);
                if (isFunction(parsed._assign)) {
                    parsed._assign(scope, nextConnection);
                    if (isFunction(scope.$flushQueue)) {
                        scope.$flushQueue();
                    }
                }
                else {
                    $log.warn(`ngWebTransport: "${expression}" is not assignable`);
                }
            }
            function reconnectEnabled() {
                const value = attrs.reconnect || attrs.dataReconnect;
                return value === "" || value === true || value === "true";
            }
            function retryDelay() {
                return parseInt(attr("retryDelay") || "", 10) || 1000;
            }
            function maxRetries() {
                const value = parseInt(attr("maxRetries") || "", 10);
                return Number.isFinite(value) ? value : Infinity;
            }
            function closeConnection(reason) {
                const current = connection;
                if (!current)
                    return;
                current.closed.catch(() => {
                    // Directive-owned sessions may be torn down before the browser finishes connecting.
                });
                try {
                    current.close(reason ? { reason } : undefined);
                }
                catch {
                    current.ready
                        .then(() => current.close(reason ? { reason } : undefined))
                        .catch(() => {
                        // The browser may reject a connection that is destroyed while opening.
                    });
                }
            }
            function handleError(error, locals = {}) {
                if (connection) {
                    dispatch("error", { error, connection, ...locals });
                }
                evaluate(attr("onError"), {
                    $connection: connection,
                    $error: error,
                    ...locals,
                });
            }
            function transformMessage(data) {
                if (transform === "bytes") {
                    return { $message: data };
                }
                const text = decoder.decode(data);
                if (transform === "text") {
                    return { $message: text, $text: text };
                }
                return { $message: JSON.parse(text), $text: text };
            }
            function handleMessage(data, event = null) {
                if (!connection)
                    return;
                let transformed;
                try {
                    transformed = transformMessage(data);
                }
                catch (error) {
                    handleError(error, { $data: data, $text: decoder.decode(data) });
                    return;
                }
                const locals = {
                    $connection: connection,
                    $data: data,
                    $event: event,
                    ...transformed,
                };
                if (!dispatch("message", locals)) {
                    closeConnection("message canceled");
                    return;
                }
                evaluate(attr("onMessage"), locals);
                if (isUndefined(attr("onMessage"))) {
                    element.textContent = isString(locals.$message)
                        ? locals.$message
                        : JSON.stringify(locals.$message);
                }
            }
            async function readIncomingStreams(nextConnection) {
                const streams = nextConnection.transport.incomingUnidirectionalStreams;
                if (!streams) {
                    throw new Error("WebTransport incoming unidirectional streams are not available");
                }
                streamReader = streams.getReader();
                try {
                    for (;;) {
                        const result = await streamReader.read();
                        if (result.done)
                            return;
                        handleMessage(await readBytes(result.value));
                    }
                }
                finally {
                    streamReader.releaseLock();
                    streamReader = null;
                }
            }
            async function connect() {
                const url = resolveUrl();
                if (!url) {
                    $log.warn("ngWebTransport: missing URL");
                    return;
                }
                closeConnection("reconnect");
                streamReader?.cancel("reconnect");
                const userConfig = resolveConfig();
                const userOnOpen = userConfig.onOpen;
                const userOnClose = userConfig.onClose;
                const userOnError = userConfig.onError;
                const userOnDatagram = userConfig.onDatagram;
                const userOnReconnect = userConfig.onReconnect;
                const config = {
                    ...userConfig,
                    reconnect: reconnectEnabled() || userConfig.reconnect,
                    retryDelay: attr("retryDelay") ? retryDelay() : userConfig.retryDelay,
                    maxRetries: attr("maxRetries") ? maxRetries() : userConfig.maxRetries,
                    onOpen: () => {
                        userOnOpen?.();
                        if (!connection)
                            return;
                        dispatch("open", { connection, url });
                        evaluate(attr("onOpen"), { $connection: connection, $url: url });
                        if (mode !== "datagram") {
                            readIncomingStreams(connection).catch((error) => {
                                if (!scope._destroyed)
                                    handleError(error);
                            });
                        }
                    },
                    onClose: () => {
                        userOnClose?.();
                        if (!connection)
                            return;
                        dispatch("close", { connection });
                        evaluate(attr("onClose"), { $connection: connection });
                    },
                    onError: (error) => {
                        userOnError?.(error);
                        handleError(error);
                    },
                    onDatagram: (event) => {
                        userOnDatagram?.(event);
                        if (mode === "datagram") {
                            handleMessage(event.data);
                        }
                    },
                    onReconnect: async (event) => {
                        dispatch("reconnect", event);
                        evaluate(attr("onReconnect"), {
                            $attempt: event.attempt,
                            $connection: event.connection,
                            $count: event.attempt,
                            $error: event.error,
                            $url: event.url,
                        });
                        await userOnReconnect?.(event);
                    },
                };
                connection = $webTransport(url, config);
                connection.closed.catch(() => {
                    // Reconnect/error hooks own directive connection failures.
                });
                assignConnection(connection);
                await connection.ready;
            }
            element.addEventListener(eventName, () => {
                connect().catch((error) => handleError(error));
            });
            scope.$on("$destroy", () => {
                streamReader?.cancel("scope destroyed");
                closeConnection("scope destroyed");
            });
            if (eventName === "load") {
                element.dispatchEvent(new Event("load"));
            }
        },
    };
}
function parseMode(value) {
    if (value === "stream" || value === "unidirectional")
        return value;
    return "datagram";
}
function parseTransform(value) {
    if (value === "text" || value === "json")
        return value;
    return "bytes";
}
async function readBytes(stream) {
    const reader = stream.getReader();
    const chunks = [];
    try {
        for (;;) {
            const result = await reader.read();
            if (result.done)
                break;
            chunks.push(result.value);
        }
    }
    finally {
        reader.releaseLock();
    }
    const length = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
    const bytes = new Uint8Array(length);
    let offset = 0;
    chunks.forEach((chunk) => {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    });
    return bytes;
}

export { ngWebTransportDirective };
