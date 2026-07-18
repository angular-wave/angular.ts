const scriptUrl = new URL(self.location.href);
const testId = scriptUrl.searchParams.get("test") ?? "";
const version = scriptUrl.searchParams.get("version") ?? "";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();

      const clients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: "window",
      });

      for (const client of clients) {
        client.postMessage({
          kind: "activated",
          testId,
          version,
        });
      }
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.kind !== "ping") {
    return;
  }

  event.source?.postMessage({
    kind: "pong",
    testId,
    version,
    payload: event.data.payload,
  });
});
