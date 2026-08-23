// @ts-nocheck
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const COOKBOOK = new URL("../../docs/content/docs/cookbook/", import.meta.url);
const RUNNER = "/docs/static/examples/cookbook/runner.html";

async function snippets(name: string): Promise<Map<string, string[]>> {
  const markdown = await readFile(new URL(name, COOKBOOK), "utf8");
  const result = new Map<string, string[]>();

  for (const match of markdown.matchAll(/```(\w+)\n([\s\S]*?)```/gu)) {
    const [, language, source] = match;
    result.set(language, [...(result.get(language) ?? []), source]);
  }

  return result;
}

test("SSE JavaScript backend writes and cleans up an event stream", async () => {
  const source = (await snippets("advanced-sse.md")).get("js")?.[0];
  expect(source).toBeDefined();

  let handler;
  let closeHandler;
  const intervals = [];
  const cleared = [];
  const writes = [];
  let status;
  let headers;
  let flushed = false;
  const createServer = (next) => {
    handler = next;
    return { listen: () => undefined };
  };
  const setInterval = (callback) => {
    const handle = { callback };
    intervals.push(handle);
    return handle;
  };
  const clearInterval = (handle) => cleared.push(handle);

  Function(
    "createServer",
    "setInterval",
    "clearInterval",
    source.replace("import { createServer } from 'node:http';", ""),
  )(createServer, setInterval, clearInterval);

  handler(
    {
      url: "/api/events/orders",
      on: (_name, callback) => (closeHandler = callback),
    },
    {
      writeHead: (nextStatus, nextHeaders) => {
        status = nextStatus;
        headers = nextHeaders;
        return undefined;
      },
      flushHeaders: () => (flushed = true),
      write: (value) => writes.push(value),
    },
  );

  expect(status).toBe(200);
  expect(headers["Content-Type"]).toBe("text/event-stream");
  expect(flushed).toBe(true);
  expect(writes[0]).toContain('"id":"A-1042"');
  expect(writes[0].endsWith("\n\n")).toBe(true);
  intervals[1].callback();
  expect(writes).toContain(": keep-alive\n\n");
  closeHandler();
  expect(cleared).toEqual(intervals);
});

test("WebSocket recipe sends, receives, and closes with its scope", async ({
  page,
}) => {
  const example = await snippets("advanced-websocket.md");
  const source = example.get("js")?.[0];
  const html = example.get("html")?.[0];
  expect(source).toBeDefined();
  expect(html).toBeDefined();

  await page.goto(RUNNER);
  await page.waitForFunction(() => "angular" in globalThis);
  await page.evaluate(
    ({ source, html }) => {
      const sockets = [];
      class MockWebSocket {
        static OPEN = 1;
        readyState = MockWebSocket.OPEN;
        sent = [];
        closeCalls = 0;

        constructor(url, protocols) {
          this.url = url;
          this.protocols = protocols;
          sockets.push(this);
          queueMicrotask(() => this.onopen?.(new Event("open")));
        }

        send(value) {
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
      globalThis.angular.bootstrap(host, ["chat"]);
      globalThis.realtimeCookbook = { host, sockets };
    },
    { source, html },
  );

  await expect(page.getByText("Connection: connected")).toBeVisible();
  await page.getByLabel("Message").fill("Hello");
  await page.getByRole("button", { name: "Send" }).click();
  const sent = await page.evaluate(() =>
    JSON.parse(globalThis.realtimeCookbook.sockets[0].sent[0]),
  );
  expect(sent).toMatchObject({ type: "chat.message", text: "Hello" });
  expect(sent.id).toBeTruthy();

  await page.evaluate(() => {
    globalThis.realtimeCookbook.sockets[0].onmessage({
      data: JSON.stringify({ type: "chat.message", text: "Welcome" }),
    });
  });
  await expect(page.getByText("Welcome")).toBeVisible();

  const closeCalls = await page.evaluate(() => {
    const { host, sockets } = globalThis.realtimeCookbook;
    globalThis.angular.getScope(host).destroy();
    return sockets[0].closeCalls;
  });
  expect(closeCalls).toBe(1);
});
