window.angular
  .module("realtimeConfigDemo", [])
  .config({
    $sse: {
      defaults: {
        withCredentials: true,
        retryDelay: 3000,
        maxRetries: 10,
        heartbeatTimeout: 30000,
      },
    },
    $websocket: {
      defaults: {
        protocols: ["json"],
        retryDelay: 2000,
        maxRetries: 20,
        heartbeatTimeout: 30000,
      },
    },
    $webTransport: {
      defaults: {
        reconnect: true,
        retryDelay: 500,
        maxRetries: 5,
        congestionControl: "low-latency",
      },
    },
  })
  .constant("realtimePolicyDemo", {
    sseRetryDelay: 3000,
    websocketProtocols: "json",
    webTransportReconnect: true,
    cleanupOwner: "scope destroy",
    nativeEscapeHatch: "WebTransportConnection.transport",
  })
  .controller(
    "RealtimeConfigCtrl",
    class {
      static $inject = ["realtimePolicyDemo"];

      constructor(realtimePolicyDemo) {
        this.sseRetryDelay = realtimePolicyDemo.sseRetryDelay;
        this.websocketProtocols = realtimePolicyDemo.websocketProtocols;
        this.webTransportReconnect =
          realtimePolicyDemo.webTransportReconnect;
        this.cleanupOwner = realtimePolicyDemo.cleanupOwner;
        this.nativeEscapeHatch = realtimePolicyDemo.nativeEscapeHatch;
        this.cleanupExample =
          "$scope.$on('$destroy', () => connection.close())";
      }
    },
  );
