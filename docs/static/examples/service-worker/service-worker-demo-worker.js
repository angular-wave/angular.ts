const version = new URL(self.location.href).searchParams.get('version') ?? '1';

self.addEventListener('message', (event) => {
  if (event.data?.type === 'service-worker-demo:ping') {
    const response = {
      type: 'service-worker-demo:pong',
      version,
    };

    if (event.ports[0]) {
      event.ports[0].postMessage(response);
    } else {
      event.source?.postMessage(response);
    }
  }

  if (event.data?.type === 'service-worker-demo:skip-waiting') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
