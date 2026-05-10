import {
  _compile,
  _exceptionHandler,
  _log,
  _parse,
  _webTransport,
} from "../../injection-tokens.ts";
import {
  isDefined,
  isFunction,
  isObject,
  isString,
  isUndefined,
  uppercase,
} from "../../shared/utils.ts";
import {
  SwapMode,
  getRealtimeProtocolContent,
  isRealtimeProtocolMessage,
  type RealtimeProtocolMessage,
  type SwapModeType,
} from "../realtime/protocol.ts";

type WebTransportDirectiveMode = "datagram" | "stream" | "unidirectional";

type WebTransportDirectiveTransform = "bytes" | "text" | "json";

type MessageLocals = {
  $connection: ng.WebTransportConnection;
  $data: Uint8Array;
  $event: Event | null;
  $message: unknown;
  $text?: string;
};

ngWebTransportDirective.$inject = [
  _webTransport,
  _parse,
  _compile,
  _log,
  _exceptionHandler,
];

/**
 * Connects an element to a WebTransport endpoint and evaluates template
 * expressions for incoming datagrams or unidirectional streams.
 */
export function ngWebTransportDirective(
  $webTransport: ng.WebTransportService,
  $parse: ng.ParseService,
  $compile: ng.CompileService,
  $log: ng.LogService,
  $exceptionHandler: ng.ExceptionHandlerService,
): ng.Directive {
  const decoder = new TextDecoder();

  return {
    restrict: "A",
    link(scope: ng.Scope, element: HTMLElement, attrs: ng.Attributes) {
      const eventName = attrs.trigger || "load";

      const mode = parseMode(attrs.mode);

      const transform = parseTransform(attrs.transform);

      let connection: ng.WebTransportConnection | undefined;

      let streamReader: ReadableStreamDefaultReader<
        ReadableStream<Uint8Array>
      > | null = null;

      function attr(name: string): string | undefined {
        return (
          attrs[name] || attrs[`data${uppercase(name[0])}${name.slice(1)}`]
        );
      }

      function evaluate(expression: string | undefined, locals: object): void {
        if (!expression) return;

        try {
          $parse(expression)(scope, locals);

          if (isFunction(scope.$flushQueue)) {
            scope.$flushQueue();
          }
        } catch (error) {
          $exceptionHandler(error);
        }
      }

      function dispatch(name: string, detail: object): boolean {
        return element.dispatchEvent(
          new CustomEvent(`ng:webtransport:${name}`, {
            bubbles: true,
            cancelable: true,
            detail,
          }),
        );
      }

      function resolveUrl(): string | undefined {
        const value = attrs.ngWebTransport;

        if (!value) return undefined;

        if (/^https:\/\//i.test(value)) return value;

        try {
          const evaluated = $parse(value)(scope);

          return isString(evaluated) ? evaluated : value;
        } catch {
          return value;
        }
      }

      function resolveConfig(): ng.WebTransportConfig {
        const expression = attr("config");

        if (!expression) return {};

        const value = $parse(expression)(scope);

        return isObject(value) ? { ...(value as ng.WebTransportConfig) } : {};
      }

      function assignConnection(nextConnection: ng.WebTransportConnection) {
        const expression = attr("as");

        if (!expression) return;

        const parsed = $parse(expression);

        if (isFunction(parsed._assign)) {
          parsed._assign(scope, nextConnection);

          if (isFunction(scope.$flushQueue)) {
            scope.$flushQueue();
          }
        } else {
          $log.warn(`ngWebTransport: "${expression}" is not assignable`);
        }
      }

      function reconnectEnabled(): boolean {
        const value = attrs.reconnect || attrs.dataReconnect;

        return value === "" || value === true || value === "true";
      }

      function retryDelay(): number {
        return parseInt(attr("retryDelay") || "", 10) || 1000;
      }

      function maxRetries(): number {
        const value = parseInt(attr("maxRetries") || "", 10);

        return Number.isFinite(value) ? value : Infinity;
      }

      function closeConnection(reason?: string): void {
        const current = connection;

        if (!current) return;

        current.closed.catch(() => {
          // Directive-owned sessions may be torn down before the browser finishes connecting.
        });

        try {
          current.close(reason ? { reason } : undefined);
        } catch {
          current.ready
            .then(() => current.close(reason ? { reason } : undefined))
            .catch(() => {
              // The browser may reject a connection that is destroyed while opening.
            });
        }
      }

      function handleError(
        error: unknown,
        locals: Record<string, unknown> = {},
      ): void {
        if (connection) {
          dispatch("error", { error, connection, ...locals });
        }

        evaluate(attr("onError"), {
          $connection: connection,
          $error: error,
          ...locals,
        });
      }

      function transformMessage(
        data: Uint8Array,
      ): Omit<MessageLocals, "$connection" | "$data" | "$event"> {
        if (transform === "bytes") {
          return { $message: data };
        }

        const text = decoder.decode(data);

        if (transform === "text") {
          return { $message: text, $text: text };
        }

        return { $message: JSON.parse(text), $text: text };
      }

      function parseSwapMode(
        value: string | undefined,
      ): SwapModeType | undefined {
        if (isString(value) && value in SwapMode) {
          return value as SwapModeType;
        }

        return undefined;
      }

      function compileContent(content: unknown): ChildNode[] {
        const compiled = $compile(String(content))(scope) as
          | ChildNode
          | DocumentFragment;

        return compiled instanceof DocumentFragment
          ? Array.from(compiled.childNodes)
          : [compiled];
      }

      function handleProtocolMessage(
        message: RealtimeProtocolMessage,
        event: Event | null,
      ): boolean {
        const swap = message.swap || parseSwapMode(attr("swap")) || "innerHTML";

        const content = getRealtimeProtocolContent(message);

        if (!isDefined(content) && swap !== "delete" && swap !== "none") {
          return false;
        }

        const target = message.target
          ? document.querySelector(message.target)
          : element;

        if (!target) {
          $log.warn(`ngWebTransport: target "${message.target}" not found`);

          return false;
        }

        switch (swap) {
          case "textContent":
            target.textContent = String(content);
            break;

          case "delete":
            target.remove();
            break;

          case "none":
            break;

          case "outerHTML": {
            const parent = target.parentNode;

            if (!parent) return false;

            const fragment = document.createDocumentFragment();

            compileContent(content).forEach((node) =>
              fragment.appendChild(node),
            );
            parent.replaceChild(fragment, target);
            break;
          }

          case "beforebegin": {
            const parent = target.parentNode;

            if (!parent) return false;

            compileContent(content).forEach((node) =>
              parent.insertBefore(node, target),
            );
            break;
          }

          case "afterbegin": {
            const { firstChild } = target;

            compileContent(content).forEach((node) =>
              target.insertBefore(node, firstChild),
            );
            break;
          }

          case "beforeend":
            compileContent(content).forEach((node) => target.appendChild(node));
            break;

          case "afterend": {
            const parent = target.parentNode;

            if (!parent) return false;

            const { nextSibling } = target;

            compileContent(content).forEach((node) =>
              parent.insertBefore(node, nextSibling),
            );
            break;
          }

          case "innerHTML":
          default:
            target.replaceChildren(...compileContent(content));
            break;
        }

        if (isFunction(scope.$flushQueue)) {
          scope.$flushQueue();
        }

        dispatch("swapped", {
          connection,
          data: message,
          event,
        });

        return true;
      }

      function handleMessage(data: Uint8Array, event: Event | null = null) {
        if (!connection) return;

        let transformed: Omit<
          MessageLocals,
          "$connection" | "$data" | "$event"
        >;

        try {
          transformed = transformMessage(data);
        } catch (error) {
          handleError(error, { $data: data, $text: decoder.decode(data) });

          return;
        }

        const locals: MessageLocals = {
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

        if (isRealtimeProtocolMessage(locals.$message)) {
          handleProtocolMessage(locals.$message, event);

          return;
        }

        if (isUndefined(attr("onMessage"))) {
          element.textContent = isString(locals.$message)
            ? locals.$message
            : JSON.stringify(locals.$message);
        }
      }

      async function readIncomingStreams(
        nextConnection: ng.WebTransportConnection,
      ): Promise<void> {
        const streams = nextConnection.transport.incomingUnidirectionalStreams;

        if (!streams) {
          throw new Error(
            "WebTransport incoming unidirectional streams are not available",
          );
        }

        streamReader = streams.getReader();

        try {
          for (;;) {
            const result = await streamReader.read();

            if (result.done) return;

            handleMessage(await readBytes(result.value));
          }
        } finally {
          streamReader.releaseLock();
          streamReader = null;
        }
      }

      async function connect(): Promise<void> {
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

        const config: ng.WebTransportConfig = {
          ...userConfig,
          reconnect: reconnectEnabled() || userConfig.reconnect,
          retryDelay: attr("retryDelay") ? retryDelay() : userConfig.retryDelay,
          maxRetries: attr("maxRetries") ? maxRetries() : userConfig.maxRetries,
          onOpen: () => {
            userOnOpen?.();

            if (!connection) return;

            dispatch("open", { connection, url });
            evaluate(attr("onOpen"), { $connection: connection, $url: url });

            if (mode !== "datagram") {
              readIncomingStreams(connection).catch((error) => {
                if (!scope._destroyed) handleError(error);
              });
            }
          },
          onClose: () => {
            userOnClose?.();

            if (!connection) return;

            dispatch("close", { connection });
            evaluate(attr("onClose"), { $connection: connection });
          },
          onError: (error: unknown) => {
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

function parseMode(value?: string): WebTransportDirectiveMode {
  if (value === "stream" || value === "unidirectional") return value;

  return "datagram";
}

function parseTransform(value?: string): WebTransportDirectiveTransform {
  if (value === "text" || value === "json") return value;

  return "bytes";
}

async function readBytes(
  stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
  const reader = stream.getReader();

  const chunks: Uint8Array[] = [];

  try {
    for (;;) {
      const result = await reader.read();

      if (result.done) break;

      chunks.push(result.value);
    }
  } finally {
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
