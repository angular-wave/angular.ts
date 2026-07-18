import { isError } from "../../shared/utils.ts";

/**
 * A function that logs messages. Accepts any number of arguments.
 */
export type LogCall = (...args: unknown[]) => void;

/** Logging severity attached to a structured remote log entry. */
export type LogLevel = "debug" | "error" | "info" | "log" | "warn";

/** Structured record passed to a configured Beacon serializer. */
export interface LogEntry {
  /** Arguments originally passed to the logging method. */
  readonly args: readonly unknown[];
  /** Logging method that produced this entry. */
  readonly level: LogLevel;
  /** ISO-8601 timestamp captured when the logging method was called. */
  readonly timestamp: string;
}

/** Converts a structured log entry into a Beacon-compatible request body. */
export type LogBeaconSerializer = (entry: LogEntry) => BodyInit;

/** Declarative remote logging configuration for `navigator.sendBeacon()`. */
export interface LogBeaconConfig {
  /** Action taken when serialization or Beacon queueing fails. */
  failure?: "ignore" | "warn";
  /** Levels delivered remotely. Defaults to `error` only. */
  levels?: readonly LogLevel[];
  /** Name of an injectable {@link LogBeaconSerializer}. */
  serializer?: string;
  /** Beacon endpoint URL. */
  url: string;
}

/**
 * Service for logging messages at various levels.
 */
export interface LogService {
  /**
   * Log a debug message.
   */
  debug: LogCall;

  /**
   * Log an error message.
   */
  error: LogCall;

  /**
   * Log an info message.
   */
  info: LogCall;

  /**
   * Log a general message.
   */
  log: LogCall;

  /**
   * Log a warning message.
   */
  warn: LogCall;
}

/**
 * A function that returns a LogService implementation.
 */
export type LogServiceFactory = (...args: never[]) => LogService;

/**
 * Declarative configuration accepted by `NgModule.config({ $log: ... })`.
 */
export interface LogConfig {
  /** Configure remote Beacon delivery, or disable an inherited configuration. */
  beacon?: LogBeaconConfig | false;
  /** Enable or disable debug logging. */
  debug?: boolean;
  /** Replace the default console-backed logger. */
  logger?: LogServiceFactory;
}

/** @internal */
export interface LogRuntimeConfiguration {
  beacon?: LogBeaconConfig;
  debug: boolean;
  logger?: LogServiceFactory;
}

/** @internal */
export interface LogRuntimeDependencies {
  now?: () => number;
  resolveSerializer?: (name: string) => LogBeaconSerializer;
  sendBeacon?: (url: string, data: BodyInit) => boolean;
}

/** @internal */
export function createLogRuntimeConfiguration(): LogRuntimeConfiguration {
  return { debug: false };
}

/** @internal */
export function applyLogConfiguration(
  configuration: LogRuntimeConfiguration,
  config: LogConfig,
): void {
  if (config.beacon !== undefined) {
    configuration.beacon =
      config.beacon === false
        ? undefined
        : {
            ...config.beacon,
            levels: config.beacon.levels
              ? [...config.beacon.levels]
              : undefined,
          };
  }

  if (config.debug !== undefined) {
    configuration.debug = config.debug;
  }

  if (config.logger !== undefined) {
    configuration.logger = config.logger;
  }
}

/** @internal */
function formatError(arg: unknown): unknown {
  if (isError(arg) && arg.stack) {
    return arg.message && !arg.stack.includes(arg.message)
      ? `Error: ${arg.message}\n${arg.stack}`
      : arg.stack;
  }

  return arg;
}

/** @internal */
function createConsoleLog(consoleRef: Console, type: keyof Console): LogCall {
  const candidate = consoleRef[type];
  const selected = typeof candidate === "function" ? candidate : consoleRef.log;
  const log = selected.bind(consoleRef) as LogCall;

  return (...args) => {
    log(...args.map(formatError));
  };
}

/** @internal */
function defaultBeaconSerializer(entry: LogEntry): BodyInit {
  const seen = new WeakSet<object>();
  const json = JSON.stringify(entry, (_key, value: unknown) => {
    if (isError(value)) {
      return formatError(value);
    }

    if (typeof value === "bigint") {
      return value.toString();
    }

    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) return "[Circular]";
      seen.add(value);
    }

    return value;
  });

  return new Blob([json], { type: "application/json" });
}

/** @internal */
function createBeaconLog(
  config: LogBeaconConfig,
  consoleRef: Console,
  dependencies: LogRuntimeDependencies,
): (level: LogLevel, args: readonly unknown[]) => void {
  const levels = new Set(config.levels ?? ["error"]);
  const warn = createConsoleLog(consoleRef, "warn");
  let serializer: LogBeaconSerializer | undefined = defaultBeaconSerializer;
  let serializerResolutionError: unknown;
  let reportedUnavailable = false;
  let reportedSerializerFailure = false;

  if (config.serializer) {
    try {
      serializer = dependencies.resolveSerializer?.(config.serializer);
    } catch (error) {
      serializer = undefined;
      serializerResolutionError = error;
    }
  }

  const reportFailure = (message: string, error?: unknown): void => {
    if ((config.failure ?? "warn") === "ignore") return;

    if (error === undefined) {
      warn(`$log Beacon delivery failed: ${message}`);
    } else {
      warn(`$log Beacon delivery failed: ${message}`, error);
    }
  };

  return (level, args) => {
    if (!levels.has(level)) return;

    if (!dependencies.sendBeacon) {
      if (!reportedUnavailable) {
        reportedUnavailable = true;
        reportFailure("navigator.sendBeacon() is unavailable");
      }

      return;
    }

    if (!serializer) {
      if (!reportedSerializerFailure) {
        reportedSerializerFailure = true;
        reportFailure(
          `serializer "${String(config.serializer)}" could not be resolved`,
          serializerResolutionError,
        );
      }

      return;
    }

    const entry: LogEntry = {
      args,
      level,
      timestamp: new Date(dependencies.now?.() ?? Date.now()).toISOString(),
    };

    try {
      const queued = dependencies.sendBeacon(config.url, serializer(entry));

      if (!queued) reportFailure("the browser rejected the payload");
    } catch (error) {
      reportFailure("serialization or queueing threw", error);
    }
  };
}

/** @internal */
export function createLogService(
  configuration: LogRuntimeConfiguration,
  consoleRef: Console,
  dependencies: LogRuntimeDependencies = {},
): LogService {
  const debug = createConsoleLog(consoleRef, "debug");
  const logger = configuration.logger?.() ?? {
    log: createConsoleLog(consoleRef, "log"),
    info: createConsoleLog(consoleRef, "info"),
    warn: createConsoleLog(consoleRef, "warn"),
    error: createConsoleLog(consoleRef, "error"),
    debug: (...args: unknown[]) => {
      if (configuration.debug) debug(...args);
    },
  };
  const beacon = configuration.beacon
    ? createBeaconLog(configuration.beacon, consoleRef, dependencies)
    : undefined;

  if (!beacon) return logger;

  const wrap = (level: LogLevel): LogCall => {
    return (...args) => {
      try {
        logger[level](...args);
      } finally {
        beacon(level, args);
      }
    };
  };

  return {
    debug: wrap("debug"),
    error: wrap("error"),
    info: wrap("info"),
    log: wrap("log"),
    warn: wrap("warn"),
  };
}
