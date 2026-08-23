import type { RuntimeModule } from "../angular-runtime.ts";
import { _sse, _websocket, _webTransport } from "../injection-tokens.ts";
import {
  createLogRuntimeConfiguration,
  createLogService,
} from "../services/log/log.ts";
import {
  applySseConfiguration,
  createSseRuntimeConfiguration,
  createSseService,
  destroySseRuntimeConfiguration,
  type SseConfig,
} from "../services/sse/sse.ts";
import {
  applyWebSocketConfiguration,
  createWebSocketRuntimeConfiguration,
  createWebSocketService,
  destroyWebSocketRuntimeConfiguration,
  type WebSocketConfig,
} from "../services/websocket/websocket.ts";
import {
  applyWebTransportConfiguration,
  createWebTransportRuntimeConfiguration,
  createWebTransportService,
  destroyWebTransportRuntimeConfiguration,
  type WebTransportConfig,
} from "../services/webtransport/webtransport.ts";
import { getRuntimeComposition, memoizeRuntimeModule } from "./custom-ng.ts";

function createRuntimeLog(angular: Parameters<RuntimeModule>[0]) {
  const { platform } = getRuntimeComposition(angular);

  return createLogService(createLogRuntimeConfiguration(), platform.console);
}

/** Registers managed WebSocket connections in a custom runtime. */
export const websocketModule: RuntimeModule = memoizeRuntimeModule(
  (angular) => {
    const composition = getRuntimeComposition(angular);
    const { configRegistry, platform } = composition;
    const configuration = createWebSocketRuntimeConfiguration();
    const runtimeWindow = platform.window as Window & {
      WebSocket: typeof WebSocket;
    };

    configRegistry.register(_websocket, (value) => {
      applyWebSocketConfiguration(
        configuration,
        value as {
          defaults?: WebSocketConfig;
        },
      );
    });
    platform.addDisposer(() => {
      destroyWebSocketRuntimeConfiguration(configuration);
    });

    return angular
      .module("ng.websocket", [])
      .factory(_websocket, () =>
        createWebSocketService(
          createRuntimeLog(angular),
          configuration,
          runtimeWindow.WebSocket,
          composition.exceptionHandlerState.service,
        ),
      );
  },
);

/** Registers managed Server-Sent Events connections in a custom runtime. */
export const sseModule: RuntimeModule = memoizeRuntimeModule((angular) => {
  const composition = getRuntimeComposition(angular);
  const { configRegistry, platform } = composition;
  const configuration = createSseRuntimeConfiguration();
  const runtimeWindow = platform.window as Window & {
    EventSource: typeof EventSource;
  };

  configRegistry.register(_sse, (value) => {
    applySseConfiguration(configuration, value as { defaults?: SseConfig });
  });
  platform.addDisposer(() => {
    destroySseRuntimeConfiguration(configuration);
  });

  return angular
    .module("ng.sse", [])
    .factory(_sse, () =>
      createSseService(
        createRuntimeLog(angular),
        configuration,
        () => runtimeWindow.EventSource,
        composition.exceptionHandlerState.service,
      ),
    );
});

/** Registers managed WebTransport sessions in a custom runtime. */
export const webTransportModule: RuntimeModule = memoizeRuntimeModule(
  (angular) => {
    const composition = getRuntimeComposition(angular);
    const { configRegistry, platform } = composition;
    const configuration = createWebTransportRuntimeConfiguration();
    const runtimeWindow = platform.window as Window & {
      WebTransport?: new (
        url: string,
        options?: WebTransportOptions,
      ) => WebTransport;
    };

    configRegistry.register(_webTransport, (value) => {
      applyWebTransportConfiguration(
        configuration,
        value as {
          defaults?: WebTransportConfig;
        },
      );
    });
    platform.addDisposer(() => {
      destroyWebTransportRuntimeConfiguration(configuration);
    });

    return angular
      .module("ng.webTransport", [])
      .factory(_webTransport, () =>
        createWebTransportService(
          createRuntimeLog(angular),
          configuration,
          () => runtimeWindow.WebTransport,
          runtimeWindow.location.href,
          composition.exceptionHandlerState.service,
        ),
      );
  },
);

/**
 * Registers managed websocket, SSE, and WebTransport services in a custom
 * AngularTS runtime.
 */
export const realtimeModule: RuntimeModule = memoizeRuntimeModule((angular) =>
  angular.module("ng.realtime", [
    websocketModule(angular).name,
    sseModule(angular).name,
    webTransportModule(angular).name,
  ]),
);
