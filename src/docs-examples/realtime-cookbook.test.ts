import { expect, test, type APIRequestContext } from "@playwright/test";

const COOKBOOK = "/docs/content/docs/cookbook/";
const RUNNER = "/docs/static/examples/cookbook/runner.html";

interface IntervalHandle {
  callback: () => void;
}

interface StreamRequest {
  url: string;
  on(event: "close", callback: () => void): void;
}

interface StreamResponse {
  writeHead(status: number, headers?: Record<string, string>): StreamResponse;
  end(): void;
  flushHeaders(): void;
  write(value: string): void;
}

async function snippets(
  name: string,
  request: APIRequestContext,
): Promise<Map<string, string[]>> {
  const response = await request.get(`${COOKBOOK}${name}`);
  expect(response.ok()).toBe(true);
  const markdown = await response.text();
  const result = new Map<string, string[]>();

  for (const match of markdown.matchAll(/```(\w+)\n([\s\S]*?)```/gu)) {
    const [, language, source] = match;
    result.set(language, [...(result.get(language) ?? []), source]);
  }

  return result;
}

test("SSE JavaScript backend writes and cleans up an event stream", async ({
  request,
}) => {
  const source = (await snippets("advanced-sse.md", request)).get("js")?.[0];
  if (!source) throw new Error("Missing SSE backend snippet");

  const callbacks: {
    request?: (request: StreamRequest, response: StreamResponse) => void;
    close?: () => void;
  } = {};
  const intervals: IntervalHandle[] = [];
  const cleared: IntervalHandle[] = [];
  const writes: string[] = [];
  const observed: {
    status?: number;
    headers?: Record<string, string>;
    flushed: boolean;
  } = { flushed: false };
  const createServer = (next: NonNullable<typeof callbacks.request>) => {
    callbacks.request = next;
    return { listen: () => undefined };
  };
  const setInterval = (callback: () => void) => {
    const handle = { callback };
    intervals.push(handle);
    return handle;
  };
  const clearInterval = (handle: IntervalHandle) => cleared.push(handle);

  Function(
    "createServer",
    "setInterval",
    "clearInterval",
    source.replace("import { createServer } from 'node:http';", ""),
  )(createServer, setInterval, clearInterval);

  if (!callbacks.request)
    throw new Error("SSE server did not register a handler");
  callbacks.request(
    {
      url: "/api/events/orders",
      on: (_name, callback) => {
        callbacks.close = callback;
      },
    },
    {
      writeHead(nextStatus, nextHeaders) {
        observed.status = nextStatus;
        observed.headers = nextHeaders;
        return this;
      },
      end() {},
      flushHeaders: () => {
        observed.flushed = true;
      },
      write: (value) => {
        writes.push(value);
      },
    },
  );

  expect(observed.status).toBe(200);
  expect(observed.headers?.["Content-Type"]).toBe("text/event-stream");
  expect(observed.flushed).toBe(true);
  expect(writes[0]).toContain('"id":"A-1042"');
  expect(writes[0].endsWith("\n\n")).toBe(true);
  intervals[1].callback();
  expect(writes).toContain(": keep-alive\n\n");
  if (!callbacks.close) throw new Error("SSE server did not register cleanup");
  callbacks.close();
  expect(cleared).toEqual(intervals);
});

test("WebSocket recipe sends, receives, and closes with its scope", async ({
  page,
  request,
}) => {
  const example = await snippets("advanced-websocket.md", request);
  const source = example.get("js")?.[0];
  const html = example.get("html")?.[0];
  if (!source || !html) throw new Error("Missing WebSocket recipe snippets");

  await page.goto(RUNNER);
  await page.waitForFunction(() => "angular" in globalThis);
  const fixture = await page.evaluateHandle(
    ({ source, html }) => {
      const sockets: MockWebSocket[] = [];
      class MockWebSocket {
        static OPEN = 1;
        readyState = MockWebSocket.OPEN;
        sent: string[] = [];
        closeCalls = 0;
        onopen: ((event: Event) => void) | null = null;
        onclose: ((event: CloseEvent) => void) | null = null;
        onmessage: ((event: MessageEvent<string>) => void) | null = null;

        constructor(
          readonly url: string,
          readonly protocols?: string | string[],
        ) {
          sockets.push(this);
          queueMicrotask(() => this.onopen?.(new Event("open")));
        }

        send(value: string) {
          this.sent.push(value);
        }

        close() {
          this.closeCalls++;
          this.onclose?.(new CloseEvent("close", { code: 1000 }));
        }
      }

      Object.defineProperty(globalThis, "WebSocket", {
        configurable: true,
        value: MockWebSocket,
      });
      (0, eval)(source);

      const host = document.createElement("main");
      host.id = "chat-example";
      host.innerHTML = html;
      document.body.append(host);
      window.angular.bootstrap(host, ["chat"]);
      return { host, sockets };
    },
    { source, html },
  );

  await expect(page.getByText("Connection: connected")).toBeVisible();
  await page.getByLabel("Message").fill("Hello");
  await page.getByRole("button", { name: "Send" }).click();
  const sent: unknown = await fixture.evaluate(({ sockets }) =>
    JSON.parse(sockets[0].sent[0]),
  );
  expect(sent).toMatchObject({
    type: "chat.message",
    text: "Hello",
    id: expect.stringMatching(/\S/),
  });

  await fixture.evaluate(({ sockets }) => {
    const socket = sockets[0];
    if (!socket.onmessage)
      throw new Error("WebSocket message handler was not attached");
    socket.onmessage(
      new MessageEvent("message", {
        data: JSON.stringify({ type: "chat.message", text: "Welcome" }),
      }),
    );
  });
  await expect(page.getByText("Welcome")).toBeVisible();

  const closeCalls = await fixture.evaluate(({ host, sockets }) => {
    window.angular.getScope(host).destroy();
    return sockets[0].closeCalls;
  });
  await fixture.dispose();
  expect(closeCalls).toBe(1);
});
