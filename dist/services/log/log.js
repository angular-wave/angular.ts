import { isError } from '../../shared/utils.js';

/** @internal */
function createLogRuntimeConfiguration() {
    return { debug: false };
}
/** @internal */
function applyLogConfiguration(configuration, config) {
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
function formatError(arg) {
    if (isError(arg) && arg.stack) {
        return arg.message && !arg.stack.includes(arg.message)
            ? `Error: ${arg.message}\n${arg.stack}`
            : arg.stack;
    }
    return arg;
}
/** @internal */
function createConsoleLog(consoleRef, type) {
    const candidate = consoleRef[type];
    const selected = typeof candidate === "function" ? candidate : consoleRef.log;
    const log = selected.bind(consoleRef);
    return (...args) => {
        log(...args.map(formatError));
    };
}
/** @internal */
function defaultBeaconSerializer(entry) {
    const seen = new WeakSet();
    const json = JSON.stringify(entry, (_key, value) => {
        if (isError(value)) {
            return formatError(value);
        }
        if (typeof value === "bigint") {
            return value.toString();
        }
        if (typeof value === "object" && value !== null) {
            if (seen.has(value))
                return "[Circular]";
            seen.add(value);
        }
        return value;
    });
    return new Blob([json], { type: "application/json" });
}
/** @internal */
function createBeaconLog(config, consoleRef, dependencies) {
    const levels = new Set(config.levels ?? ["error"]);
    const warn = createConsoleLog(consoleRef, "warn");
    let serializer = defaultBeaconSerializer;
    let serializerResolutionError;
    let reportedUnavailable = false;
    let reportedSecurityFailure = false;
    let reportedSerializerFailure = false;
    if (config.serializer) {
        try {
            serializer = dependencies.resolveSerializer?.(config.serializer);
        }
        catch (error) {
            serializer = undefined;
            serializerResolutionError = error;
        }
    }
    const reportFailure = (message, error) => {
        if ((config.failure ?? "warn") === "ignore")
            return;
        if (error === undefined) {
            warn(`$log Beacon delivery failed: ${message}`);
        }
        else {
            warn(`$log Beacon delivery failed: ${message}`, error);
        }
    };
    return (level, args) => {
        if (!levels.has(level))
            return;
        if (!dependencies.sendBeacon) {
            if (!reportedUnavailable) {
                reportedUnavailable = true;
                reportFailure("navigator.sendBeacon() is unavailable");
            }
            return;
        }
        if (dependencies.authorizeBeacon) {
            try {
                const decision = dependencies.authorizeBeacon({
                    operation: "request",
                    transport: "beacon",
                    method: "POST",
                    url: config.url,
                    credentials: "include",
                    hasBody: true,
                });
                if (decision.type !== "allow") {
                    if (!reportedSecurityFailure) {
                        reportedSecurityFailure = true;
                        reportFailure(`security policy denied delivery${decision.reason ? `: ${decision.reason}` : ""}`);
                    }
                    return;
                }
                if (Object.keys(decision.credentials?.headers ?? {}).length > 0 ||
                    decision.credentials?.withCredentials === false) {
                    if (!reportedSecurityFailure) {
                        reportedSecurityFailure = true;
                        reportFailure("security policy returned credentials that Beacon cannot apply");
                    }
                    return;
                }
            }
            catch (error) {
                if (!reportedSecurityFailure) {
                    reportedSecurityFailure = true;
                    reportFailure("security policy evaluation threw", error);
                }
                return;
            }
        }
        if (!serializer) {
            if (!reportedSerializerFailure) {
                reportedSerializerFailure = true;
                reportFailure(`serializer "${String(config.serializer)}" could not be resolved`, serializerResolutionError);
            }
            return;
        }
        const entry = {
            args,
            level,
            timestamp: new Date(dependencies.now?.() ?? Date.now()).toISOString(),
        };
        try {
            const queued = dependencies.sendBeacon(config.url, serializer(entry));
            if (!queued)
                reportFailure("the browser rejected the payload");
        }
        catch (error) {
            reportFailure("serialization or queueing threw", error);
        }
    };
}
/** @internal */
function createLogService(configuration, consoleRef, dependencies = {}) {
    const debug = createConsoleLog(consoleRef, "debug");
    const logger = configuration.logger?.() ?? {
        log: createConsoleLog(consoleRef, "log"),
        info: createConsoleLog(consoleRef, "info"),
        warn: createConsoleLog(consoleRef, "warn"),
        error: createConsoleLog(consoleRef, "error"),
        debug: (...args) => {
            if (configuration.debug)
                debug(...args);
        },
    };
    const beacon = configuration.beacon
        ? createBeaconLog(configuration.beacon, consoleRef, dependencies)
        : undefined;
    if (!beacon)
        return logger;
    const wrap = (level) => {
        return (...args) => {
            try {
                logger[level](...args);
            }
            finally {
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

export { applyLogConfiguration, createLogRuntimeConfiguration, createLogService };
