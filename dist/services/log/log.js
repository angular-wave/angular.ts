import { isError } from '../../shared/utils.js';

/**
 * Configuration provider for `$log` service
 */
class LogProvider {
    /** @private */
    constructor() {
        this.debug = false;
        this._override = null;
    }
    /**
     * Override the default {@link LogService} implemenation
     */
    setLogger(fn) {
        this._override = fn;
    }
    /**
     * @private
     * Normalizes `Error` objects into readable log output.
     */
    /** @internal */
    _formatError(arg) {
        if (isError(arg)) {
            if (arg.stack) {
                arg =
                    arg.message && !arg.stack.includes(arg.message)
                        ? `Error: ${arg.message}\n${arg.stack}`
                        : arg.stack;
            }
        }
        return arg;
    }
    /**
     * @private
     * Builds a console-backed logger for the requested method name.
     */
    /** @internal */
    _consoleLog(type) {
        const consoleRef = window.console;
        const logFn = consoleRef[type]?.bind(consoleRef) ?? consoleRef.log.bind(consoleRef);
        return (...args) => {
            const formattedArgs = args.map((arg) => this._formatError(arg));
            logFn(...formattedArgs);
        };
    }
    /** Creates the runtime `$log` service. */
    $get() {
        if (this._override) {
            return this._override();
        }
        return {
            log: this._consoleLog("log"),
            info: this._consoleLog("info"),
            warn: this._consoleLog("warn"),
            error: this._consoleLog("error"),
            debug: (() => {
                const fn = this._consoleLog("debug");
                return (...args) => {
                    if (this.debug) {
                        fn(...args);
                    }
                };
            })(),
        };
    }
}

export { LogProvider };
