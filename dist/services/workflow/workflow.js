import { createScope, SCOPE_PROXY_BIND } from '../../core/scope/scope.js';
import { _machine } from '../../injection-tokens.js';
import { isObject, isString, isFunction, isNumber, hasOwn, isArray, isInstanceOf, isBoolean } from '../../shared/utils.js';

class WorkflowProvider {
    constructor() {
        this.$get = [
            _machine,
            ($machine) => createWorkflowFactory($machine),
        ];
    }
}
function defineWorkflow(config) {
    return config;
}
function defineCommand(command) {
    return command;
}
function createWorkflowFactory($machine) {
    return function createWorkflow(scopeOrConfig, maybeConfig) {
        const { _scope: scope, _config: config } = normalizeWorkflowArgs(scopeOrConfig, maybeConfig);
        assertWorkflowConfig(config);
        const machine = $machine({
            initial: config.initial,
            data: config.data,
            transitions: config.transitions,
        });
        const diagnostics = [];
        const history = [];
        const diagnosticLimit = normalizeEntryLimit(config.diagnosticLimit, "$workflow diagnosticLimit", 1000);
        const historyLimit = normalizeHistoryLimit(config.historyLimit);
        const runningCommands = new Set();
        const commandQueues = new Map();
        const replayInputs = new Map();
        const bindings = new Map();
        let activeBinding;
        let nextHistoryId = 1;
        let queueGeneration = 0;
        const workflowTarget = {
            id: config.id,
            get current() {
                return machine.current;
            },
            get data() {
                return machine.data;
            },
            diagnostics,
            history,
            send(type, payload) {
                const handled = machine.send(type, payload);
                if (handled) {
                    scheduleWorkflowBindings();
                }
                else {
                    appendDiagnostics(createDiagnostic("workflow.invalidTransition", `Workflow mode '${machine.current}' cannot handle transition '${type}'.`, undefined, true, {
                        current: machine.current,
                        type,
                        payload,
                    }));
                    scheduleWorkflowBindings();
                }
                return handled;
            },
            can(type) {
                return machine.can(type);
            },
            matches(mode) {
                return machine.matches(mode);
            },
            async run(command, input, options) {
                if (!isString(command) || !command) {
                    return failCommand("workflow.invalidCommand", command, input, [
                        createDiagnostic("workflow.invalidCommand", "Workflow command name must be a non-empty string.", command, true),
                    ]);
                }
                const handler = getCommand(config, command);
                if (!handler) {
                    return failCommand("workflow.missingCommand", command, input, [
                        createDiagnostic("workflow.missingCommand", `Workflow command '${command}' is not configured.`, command, true),
                    ]);
                }
                const policy = options?.concurrency ?? config.concurrency ?? "allow";
                const optionDiagnostic = validateCommandOptions(command, options);
                if (optionDiagnostic) {
                    return failCommand("workflow.invalidCommandOptions", command, input, [optionDiagnostic]);
                }
                if (policy === "reject" && isCommandRunning(command)) {
                    return failCommand("workflow.commandRunning", command, input, [
                        createDiagnostic("workflow.commandRunning", `Workflow command '${command}' is already running.`, command, true),
                    ]);
                }
                if (policy === "queue") {
                    const generation = queueGeneration;
                    const previous = commandQueues.get(command) ?? Promise.resolve();
                    const queued = previous
                        .catch(() => undefined)
                        .then(() => {
                        if (generation !== queueGeneration) {
                            return {
                                ok: false,
                                diagnostics: [
                                    createDiagnostic("workflow.commandCancelled", `Workflow command '${command}' was cancelled.`, command, true),
                                ],
                            };
                        }
                        return executeCommand(command, input, handler, options);
                    });
                    const tail = queued.finally(() => {
                        if (commandQueues.get(command) === tail) {
                            commandQueues.delete(command);
                        }
                    });
                    commandQueues.set(command, tail);
                    return queued;
                }
                return executeCommand(command, input, handler, options);
            },
            retry(command, options) {
                const replay = normalizeReplayArgs(command, options);
                if (replay.invalidCommand) {
                    return Promise.resolve(failWithoutHistory([
                        createDiagnostic("workflow.invalidCommand", "Workflow command name must be a non-empty string.", undefined, true),
                    ]));
                }
                const retryEntry = findRetryEntry(replay.command);
                if (!retryEntry) {
                    return Promise.resolve(failWithoutHistory([
                        createDiagnostic("workflow.noFailedCommand", isString(replay.command) && replay.command
                            ? `Workflow command '${replay.command}' has no failed run to retry.`
                            : "Workflow has no failed command to retry.", isString(replay.command) && replay.command
                            ? replay.command
                            : undefined, true),
                    ]));
                }
                return runWorkflowCommand(workflowTarget, retryEntry.command, getReplayInput(retryEntry), replay.options);
            },
            repeat(command, options) {
                const replay = normalizeReplayArgs(command, options);
                if (replay.invalidCommand) {
                    return Promise.resolve(failWithoutHistory([
                        createDiagnostic("workflow.invalidCommand", "Workflow command name must be a non-empty string.", undefined, true),
                    ]));
                }
                const repeatEntry = findRepeatEntry(replay.command);
                if (!repeatEntry) {
                    return Promise.resolve(failWithoutHistory([
                        createDiagnostic("workflow.noCompletedCommand", isString(replay.command) && replay.command
                            ? `Workflow command '${replay.command}' has no completed run to repeat.`
                            : "Workflow has no completed command to repeat.", isString(replay.command) && replay.command
                            ? replay.command
                            : undefined, true),
                    ]));
                }
                return runWorkflowCommand(workflowTarget, repeatEntry.command, getReplayInput(repeatEntry), replay.options);
            },
            cancel(command) {
                if (command !== undefined && (!isString(command) || !command)) {
                    return 0;
                }
                let cancelled = 0;
                for (const state of runningCommands) {
                    if (command && state._command !== command) {
                        continue;
                    }
                    cancelRun(state, createDiagnostic("workflow.commandCancelled", `Workflow command '${state._command}' was cancelled.`, state._command, true));
                    cancelled += 1;
                }
                return cancelled;
            },
            snapshot() {
                return {
                    version: 1,
                    id: config.id,
                    current: machine.current,
                    data: structuredClone(machine.data),
                    diagnostics: structuredClone(diagnostics),
                    history: structuredClone(history),
                };
            },
            restore(snapshot) {
                const restoredSnapshot = normalizeWorkflowSnapshot(snapshot);
                if (restoredSnapshot.id !== config.id) {
                    throw new Error("$workflow restore snapshot id must match workflow id.");
                }
                queueGeneration += 1;
                commandQueues.clear();
                cancelRunningCommands(false);
                machine.restore({
                    current: restoredSnapshot.current,
                    data: restoredSnapshot.data,
                });
                replaceArray(diagnostics, normalizeDiagnostics(restoredSnapshot.diagnostics));
                trimDiagnostics();
                replaceArray(history, normalizeHistory(restoredSnapshot.history));
                trimHistory();
                resetReplayInputs();
                nextHistoryId =
                    history.reduce((max, entry) => Math.max(max, entry.id), 0) + 1;
                scheduleWorkflowBindings();
            },
        };
        Object.defineProperty(workflowTarget, SCOPE_PROXY_BIND, {
            value(handler, proxy) {
                let binding = bindings.get(handler.$id);
                if (!binding) {
                    binding = {
                        _handler: handler,
                        _proxy: proxy,
                    };
                    bindings.set(handler.$id, binding);
                }
                activeBinding = binding;
            },
        });
        if (scope?.$handler) {
            return createScope(workflowTarget, scope.$handler);
        }
        return workflowTarget;
        async function executeCommand(command, input, handler, options) {
            appendHistory({
                type: "command.started",
                command,
                input,
            });
            const state = createRunState(command, options);
            try {
                const cancelDiagnostic = state._cancelDiagnostic;
                if (cancelDiagnostic) {
                    return failCommand(cancelDiagnostic.code, command, input, [
                        cancelDiagnostic,
                    ]);
                }
                const commandPromise = Promise.resolve((() => {
                    const data = createWorkflowDataProxy(machine.data, state);
                    return handler({
                        workflow: createCommandWorkflow(getActiveWorkflow(), state, data),
                        cleanup(callback) {
                            if (!isFunction(callback)) {
                                return;
                            }
                            state._cleanups.push(callback);
                        },
                        data,
                        input,
                        command,
                        signal: state._controller.signal,
                    });
                })());
                const commandValue = (await Promise.race([
                    commandPromise,
                    state._cancelPromise.then((diagnostic) => ({
                        _workflowCancel: diagnostic,
                    })),
                ]));
                commandPromise.catch(() => undefined);
                if (isObject(commandValue) &&
                    commandValue
                        ._workflowCancel) {
                    const cancelled = commandValue;
                    if (state._discardResult) {
                        return {
                            ok: false,
                            diagnostics: [cancelled._workflowCancel],
                        };
                    }
                    return failCommand(cancelled._workflowCancel.code, command, input, [cancelled._workflowCancel]);
                }
                const result = normalizeCommandResult(commandValue);
                if (result.diagnostics?.length) {
                    appendDiagnostics(...result.diagnostics);
                }
                appendHistory(result.ok
                    ? {
                        type: "command.completed",
                        command,
                        input,
                        output: result.output,
                        diagnostics: result.diagnostics,
                    }
                    : {
                        type: "command.failed",
                        command,
                        input,
                        diagnostics: result.diagnostics,
                    });
                return result;
            }
            catch (error) {
                if (state._cancelDiagnostic) {
                    if (state._discardResult) {
                        return {
                            ok: false,
                            diagnostics: [state._cancelDiagnostic],
                        };
                    }
                    return failCommand(state._cancelDiagnostic.code, command, input, [state._cancelDiagnostic]);
                }
                return failCommand("workflow.commandFailed", command, input, [
                    diagnosticFromError(error, command),
                ]);
            }
            finally {
                finishRunState(state);
            }
        }
        function getActiveWorkflow() {
            return getActiveBinding()?._proxy ?? workflowTarget;
        }
        function getActiveBinding() {
            if (activeBinding && !activeBinding._handler._destroyed) {
                return activeBinding;
            }
            for (const [scopeId, binding] of bindings) {
                if (binding._handler._destroyed) {
                    bindings.delete(scopeId);
                    continue;
                }
                activeBinding = binding;
                return binding;
            }
            activeBinding = undefined;
            return undefined;
        }
        function scheduleWorkflowBindings() {
            for (const [scopeId, binding] of bindings) {
                if (binding._handler._destroyed) {
                    bindings.delete(scopeId);
                    continue;
                }
                binding._handler._scheduleWatchKeys([
                    "current",
                    "data",
                    "diagnostics",
                    "history",
                ]);
                binding._handler._checkListenersForAllKeys(machine.data);
                binding._handler._checkListenersForAllKeys(diagnostics);
                binding._handler._checkListenersForAllKeys(history);
            }
        }
        function appendDiagnostics(...entries) {
            diagnostics.push(...entries);
            trimDiagnostics();
        }
        function trimDiagnostics() {
            trimArray(diagnostics, diagnosticLimit);
        }
        function appendHistory(entry) {
            const historyEntry = {
                id: nextHistoryId++,
                type: entry.type,
                command: entry.command,
            };
            if (hasOwn(entry, "input")) {
                historyEntry.input = normalizeHistoryValue(entry.input);
                replayInputs.set(historyEntry.id, entry.input);
            }
            if (hasOwn(entry, "output")) {
                historyEntry.output = normalizeHistoryValue(entry.output);
            }
            if (entry.diagnostics) {
                historyEntry.diagnostics = normalizeDiagnostics(entry.diagnostics);
            }
            history.push(historyEntry);
            trimHistory();
            scheduleWorkflowBindings();
            return historyEntry;
        }
        function trimHistory() {
            const removed = trimArray(history, historyLimit);
            for (const entry of removed) {
                replayInputs.delete(entry.id);
            }
        }
        function isCommandRunning(command) {
            for (const state of runningCommands) {
                if (state._command === command) {
                    return true;
                }
            }
            return false;
        }
        function createRunState(command, options) {
            const controller = new AbortController();
            let cancel;
            const state = {
                _cancel(diagnostic) {
                    cancel(diagnostic);
                },
                _cancelPromise: new Promise((resolve) => {
                    cancel = resolve;
                }),
                _cleanups: [],
                _command: command,
                _controller: controller,
                _discardResult: false,
                _done: false,
            };
            const timeout = normalizeTimeout(options?.timeout ?? config.commandTimeout);
            let timeoutId;
            if (options?.signal) {
                if (options.signal.aborted) {
                    cancelRun(state, createDiagnostic("workflow.commandCancelled", `Workflow command '${command}' was cancelled.`, command, true));
                }
                else {
                    const abortHandler = () => {
                        cancelRun(state, createDiagnostic("workflow.commandCancelled", `Workflow command '${command}' was cancelled.`, command, true));
                    };
                    options.signal.addEventListener("abort", abortHandler, {
                        once: true,
                    });
                    state._cleanups.push(() => options.signal?.removeEventListener("abort", abortHandler));
                }
            }
            if (timeout !== undefined) {
                timeoutId = window.setTimeout(() => {
                    cancelRun(state, createDiagnostic("workflow.commandTimeout", `Workflow command '${command}' timed out after ${String(timeout)}ms.`, command, true, {
                        timeout,
                    }));
                }, timeout);
            }
            if (timeoutId !== undefined) {
                state._cleanups.push(() => {
                    window.clearTimeout(timeoutId);
                });
            }
            runningCommands.add(state);
            return state;
        }
        function cancelRun(state, diagnostic, discardResult = false) {
            if (state._done || state._cancelDiagnostic) {
                return;
            }
            state._discardResult = discardResult;
            state._cancelDiagnostic = diagnostic;
            state._cancel(diagnostic);
            if (!state._controller.signal.aborted) {
                state._controller.abort(diagnostic);
            }
        }
        function finishRunState(state) {
            state._done = true;
            runningCommands.delete(state);
            while (state._cleanups.length) {
                const cleanup = state._cleanups.pop();
                try {
                    cleanup?.();
                }
                catch (error) {
                    if (state._discardResult) {
                        continue;
                    }
                    appendDiagnostics(diagnosticFromError(error, state._command, "workflow.cleanupFailed"));
                }
            }
            scheduleWorkflowBindings();
        }
        function cancelRunningCommands(recordResult = true) {
            for (const state of runningCommands) {
                cancelRun(state, createDiagnostic("workflow.commandCancelled", `Workflow command '${state._command}' was cancelled.`, state._command, true), !recordResult);
            }
        }
        function findRetryEntry(command) {
            for (let index = history.length - 1; index >= 0; index -= 1) {
                const entry = history[index];
                if (entry.type !== "command.failed") {
                    continue;
                }
                if (isString(command) && command && entry.command !== command) {
                    continue;
                }
                return entry;
            }
            return undefined;
        }
        function findRepeatEntry(command) {
            for (let index = history.length - 1; index >= 0; index -= 1) {
                const entry = history[index];
                if (entry.type !== "command.completed") {
                    continue;
                }
                if (isString(command) && command && entry.command !== command) {
                    continue;
                }
                return entry;
            }
            return undefined;
        }
        function getReplayInput(entry) {
            return replayInputs.has(entry.id)
                ? replayInputs.get(entry.id)
                : entry.input;
        }
        function resetReplayInputs() {
            replayInputs.clear();
            for (const entry of history) {
                if (hasOwn(entry, "input")) {
                    replayInputs.set(entry.id, entry.input);
                }
            }
        }
        function normalizeWorkflowSnapshot(snapshot) {
            if (isObject(snapshot) &&
                snapshot.version === 1) {
                assertWorkflowSnapshot(snapshot);
                return snapshot;
            }
            if (config.migrateSnapshot) {
                const migrated = config.migrateSnapshot(snapshot);
                assertWorkflowSnapshot(migrated);
                return migrated;
            }
            assertWorkflowSnapshot(snapshot);
            return snapshot;
        }
        function failCommand(code, command, input, commandDiagnostics) {
            appendDiagnostics(...commandDiagnostics);
            if (isString(command) && command) {
                appendHistory({
                    type: "command.failed",
                    command,
                    input,
                    diagnostics: commandDiagnostics,
                });
            }
            else {
                scheduleWorkflowBindings();
            }
            return {
                ok: false,
                diagnostics: commandDiagnostics.length
                    ? commandDiagnostics
                    : [
                        createDiagnostic(code, "Workflow command failed.", isString(command) ? command : undefined, true),
                    ],
            };
        }
        function failWithoutHistory(commandDiagnostics) {
            appendDiagnostics(...commandDiagnostics);
            scheduleWorkflowBindings();
            return {
                ok: false,
                diagnostics: commandDiagnostics,
            };
        }
    };
}
function runWorkflowCommand(workflow, command, input, options) {
    const runner = workflow;
    return runner.run(command, input, options);
}
function createCommandWorkflow(workflow, state, data) {
    return new Proxy(workflow, {
        get(target, property, receiver) {
            if (property === "data") {
                return data;
            }
            if (property === "send") {
                return (...args) => state._done
                    ? false
                    : target.send(...args);
            }
            if (property === "run" || property === "retry" || property === "repeat") {
                return (...args) => state._done
                    ? Promise.resolve({
                        ok: false,
                        diagnostics: [
                            createDiagnostic("workflow.commandCancelled", `Workflow command '${state._command}' was cancelled.`, state._command, true),
                        ],
                    })
                    : target[property](...args);
            }
            return Reflect.get(target, property, receiver);
        },
    });
}
function createWorkflowDataProxy(data, state) {
    const proxies = new WeakMap();
    return proxify(data);
    function proxify(value) {
        if (!isWorkflowDataProxyable(value)) {
            return value;
        }
        const cached = proxies.get(value);
        if (cached) {
            return cached;
        }
        const proxy = new Proxy(value, {
            get(target, property, receiver) {
                if (isInstanceOf(target, Map)) {
                    return getWorkflowMapProperty(target, property, receiver, state, proxify);
                }
                if (isInstanceOf(target, Set)) {
                    return getWorkflowSetProperty(target, property, receiver, state);
                }
                return proxify(Reflect.get(target, property, receiver));
            },
            set(target, property, nextValue, receiver) {
                if (state._done) {
                    return true;
                }
                return Reflect.set(target, property, nextValue, receiver);
            },
            deleteProperty(target, property) {
                if (state._done) {
                    return true;
                }
                return Reflect.deleteProperty(target, property);
            },
            defineProperty(target, property, descriptor) {
                if (state._done) {
                    return true;
                }
                return Reflect.defineProperty(target, property, descriptor);
            },
            setPrototypeOf(target, prototype) {
                if (state._done) {
                    return true;
                }
                return Reflect.setPrototypeOf(target, prototype);
            },
        });
        proxies.set(value, proxy);
        return proxy;
    }
}
function getWorkflowMapProperty(target, property, receiver, state, proxify) {
    if (property === "size") {
        return target.size;
    }
    if (property === "get") {
        return (key) => proxify(target.get(key));
    }
    if (property === "set") {
        return (key, value) => {
            if (state._done) {
                return receiver;
            }
            target.set(key, value);
            return receiver;
        };
    }
    if (property === "delete") {
        return (key) => (state._done ? false : target.delete(key));
    }
    if (property === "clear") {
        return () => {
            if (!state._done) {
                target.clear();
            }
        };
    }
    const value = Reflect.get(target, property, target);
    return isFunction(value) ? value.bind(target) : value;
}
function getWorkflowSetProperty(target, property, receiver, state) {
    if (property === "size") {
        return target.size;
    }
    if (property === "add") {
        return (value) => {
            if (state._done) {
                return receiver;
            }
            target.add(value);
            return receiver;
        };
    }
    if (property === "delete") {
        return (value) => (state._done ? false : target.delete(value));
    }
    if (property === "clear") {
        return () => {
            if (!state._done) {
                target.clear();
            }
        };
    }
    if (property === "has") {
        return (value) => target.has(value);
    }
    const value = Reflect.get(target, property, target);
    return isFunction(value) ? value.bind(target) : value;
}
function isWorkflowDataProxyable(value) {
    if (!isObject(value)) {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return (isArray(value) ||
        isInstanceOf(value, Map) ||
        isInstanceOf(value, Set) ||
        prototype === Object.prototype ||
        prototype === null);
}
function getCommand(config, command) {
    if (!config.commands || !hasOwn(config.commands, command)) {
        return undefined;
    }
    const handler = config.commands[command];
    return isFunction(handler)
        ? handler
        : undefined;
}
function normalizeCommandResult(value) {
    if (isObject(value) && hasOwn(value, "ok")) {
        const result = value;
        const ok = result.ok;
        if (ok === true) {
            return {
                ok: true,
                output: result.output,
                diagnostics: normalizeOptionalDiagnostics(result.diagnostics),
            };
        }
        if (ok === false) {
            return {
                ok: false,
                diagnostics: normalizeOptionalDiagnostics(result.diagnostics) ?? [
                    createDiagnostic("workflow.commandFailed", "Workflow command failed.", undefined, true),
                ],
            };
        }
        return {
            ok: false,
            diagnostics: [
                createDiagnostic("workflow.invalidCommandResult", "Workflow command result must use ok: true or ok: false.", undefined, true, value),
            ],
        };
    }
    return {
        ok: true,
        output: value,
    };
}
function normalizeDiagnostics(diagnostics) {
    if (!isArray(diagnostics)) {
        return [];
    }
    return diagnostics.map((diagnostic) => isObject(diagnostic)
        ? {
            code: isString(diagnostic.code)
                ? diagnostic.code
                : "workflow.diagnostic",
            message: isString(diagnostic.message)
                ? diagnostic.message
                : "Workflow diagnostic.",
            recoverable: diagnostic.recoverable,
            path: isString(diagnostic.path) ? diagnostic.path : undefined,
            command: isString(diagnostic.command)
                ? diagnostic.command
                : undefined,
            detail: normalizeDiagnosticDetail(diagnostic.detail),
        }
        : createDiagnostic("workflow.diagnostic", formatUnknownMessage(diagnostic), undefined, true));
}
function normalizeOptionalDiagnostics(diagnostics) {
    if (!isArray(diagnostics)) {
        return undefined;
    }
    return normalizeDiagnostics(diagnostics);
}
function normalizeHistoryValue(value) {
    return normalizeDiagnosticDetail(value);
}
function normalizeHistory(historyEntries) {
    if (!isArray(historyEntries)) {
        return [];
    }
    let nextFallbackId = 1;
    const usedIds = new Set();
    return historyEntries.map((entry) => {
        const candidate = isObject(entry)
            ? entry
            : {};
        const id = allocateHistoryId(candidate.id);
        const historyEntry = {
            id,
            type: normalizeHistoryType(candidate.type),
            command: isString(candidate.command) && candidate.command
                ? candidate.command
                : "unknown",
        };
        if (hasOwn(candidate, "input")) {
            historyEntry.input = normalizeHistoryValue(candidate.input);
        }
        if (hasOwn(candidate, "output")) {
            historyEntry.output = normalizeHistoryValue(candidate.output);
        }
        if (hasOwn(candidate, "diagnostics")) {
            historyEntry.diagnostics = normalizeDiagnostics(candidate.diagnostics);
        }
        return historyEntry;
    });
    function allocateHistoryId(value) {
        if (isNumber(value) &&
            Number.isInteger(value) &&
            value > 0 &&
            !usedIds.has(value)) {
            usedIds.add(value);
            nextFallbackId = Math.max(nextFallbackId, value + 1);
            return value;
        }
        while (usedIds.has(nextFallbackId)) {
            nextFallbackId += 1;
        }
        const id = nextFallbackId;
        usedIds.add(id);
        nextFallbackId += 1;
        return id;
    }
}
function normalizeHistoryType(value) {
    if (value === "command.started" ||
        value === "command.completed" ||
        value === "command.failed") {
        return value;
    }
    return "command.failed";
}
function diagnosticFromError(error, command, code = "workflow.commandFailed") {
    if (isInstanceOf(error, Error)) {
        return createDiagnostic(code, error.message || "Workflow command failed.", command, true, {
            name: error.name,
        });
    }
    return createDiagnostic(code, formatUnknownMessage(error), command, true);
}
function normalizeHistoryLimit(value) {
    return normalizeEntryLimit(value, "$workflow historyLimit", 1000);
}
function normalizeEntryLimit(value, label, defaultValue) {
    if (value === undefined) {
        return defaultValue;
    }
    if (!isNumber(value) || !Number.isFinite(value)) {
        throw new Error(`${label} must be a finite number.`);
    }
    if (!Number.isInteger(value) || value < 0) {
        throw new Error(`${label} must be a non-negative integer.`);
    }
    return value;
}
function trimArray(target, limit) {
    if (!Number.isFinite(limit) || limit < 0) {
        return [];
    }
    const deleteCount = target.length - limit;
    if (deleteCount <= 0) {
        return [];
    }
    return target.splice(0, deleteCount);
}
function normalizeReplayArgs(command, options) {
    if (isString(command)) {
        if (!command) {
            return {
                invalidCommand: true,
                options,
            };
        }
        return {
            command,
            options,
        };
    }
    if (isObject(command)) {
        return {
            options: command,
        };
    }
    return {
        options,
    };
}
function validateCommandOptions(command, options) {
    if (options === undefined) {
        return undefined;
    }
    if (!isObject(options)) {
        return createDiagnostic("workflow.invalidCommandOptions", "Workflow command options must be an object.", command, true);
    }
    const concurrency = options.concurrency;
    if (concurrency !== undefined &&
        concurrency !== "allow" &&
        concurrency !== "reject" &&
        concurrency !== "queue") {
        return createDiagnostic("workflow.invalidCommandOptions", "Workflow command concurrency must be 'allow', 'reject', or 'queue'.", command, true, {
            concurrency,
        });
    }
    try {
        normalizeTimeout(options.timeout);
    }
    catch (error) {
        return diagnosticFromError(error, command, "workflow.invalidCommandOptions");
    }
    if (options.signal !== undefined && !isAbortSignalLike(options.signal)) {
        return createDiagnostic("workflow.invalidCommandOptions", "Workflow command signal must be an AbortSignal.", command, true);
    }
    return undefined;
}
function isAbortSignalLike(value) {
    const signal = value;
    return (isObject(value) &&
        isBoolean(signal.aborted) &&
        isFunction(signal.addEventListener) &&
        isFunction(signal.removeEventListener));
}
function normalizeTimeout(value) {
    if (value === undefined) {
        return undefined;
    }
    if (!isNumber(value) || !Number.isFinite(value)) {
        throw new Error("$workflow command timeout must be a finite number.");
    }
    if (!Number.isInteger(value) || value < 0) {
        throw new Error("$workflow command timeout must be a non-negative integer.");
    }
    return value;
}
function createDiagnostic(code, message, command, recoverable = true, detail) {
    return {
        code,
        message,
        recoverable,
        command,
        detail: normalizeDiagnosticDetail(detail),
    };
}
function normalizeDiagnosticDetail(value, seen = new WeakSet()) {
    if (value === undefined || value === null) {
        return value;
    }
    const valueType = typeof value;
    if (valueType === "string" ||
        valueType === "number" ||
        valueType === "boolean") {
        return value;
    }
    if (valueType === "bigint") {
        return value.toString();
    }
    if (valueType === "symbol") {
        return formatSymbol(value);
    }
    if (valueType === "function") {
        return "[Function]";
    }
    const objectValue = value;
    if (seen.has(objectValue)) {
        return "[Circular]";
    }
    seen.add(objectValue);
    if (isInstanceOf(value, Date)) {
        seen.delete(objectValue);
        return value.toISOString();
    }
    if (isArray(value)) {
        const normalized = value.map((item) => normalizeDiagnosticDetail(item, seen));
        seen.delete(objectValue);
        return normalized;
    }
    if (isInstanceOf(value, Map)) {
        const normalized = Array.from(value.entries()).map(([key, entryValue]) => [
            normalizeDiagnosticDetail(key, seen),
            normalizeDiagnosticDetail(entryValue, seen),
        ]);
        seen.delete(objectValue);
        return normalized;
    }
    if (isInstanceOf(value, Set)) {
        const normalized = Array.from(value.values()).map((item) => normalizeDiagnosticDetail(item, seen));
        seen.delete(objectValue);
        return normalized;
    }
    if (isObject(value)) {
        const normalized = {};
        for (const key of Object.keys(value)) {
            normalized[key] = normalizeDiagnosticDetail(value[key], seen);
        }
        seen.delete(objectValue);
        return normalized;
    }
    seen.delete(objectValue);
    return "[Unknown]";
}
function formatUnknownMessage(value) {
    if (isInstanceOf(value, Error)) {
        return value.message || value.name;
    }
    if (isString(value)) {
        return value;
    }
    const valueType = typeof value;
    if (valueType === "number" || valueType === "boolean") {
        return String(value);
    }
    if (valueType === "bigint") {
        return value.toString();
    }
    if (valueType === "symbol") {
        return formatSymbol(value);
    }
    if (valueType === "function") {
        return "[Function]";
    }
    return "Workflow diagnostic.";
}
function formatSymbol(value) {
    return value.description ? `Symbol(${value.description})` : "Symbol()";
}
function replaceArray(target, source) {
    target.splice(0, target.length, ...structuredClone(source));
}
function normalizeWorkflowArgs(scopeOrConfig, maybeConfig) {
    if (maybeConfig) {
        return {
            _scope: scopeOrConfig,
            _config: maybeConfig,
        };
    }
    return {
        _config: scopeOrConfig,
    };
}
function assertWorkflowConfig(config) {
    if (!isObject(config)) {
        throw new Error("$workflow requires a config object.");
    }
    if (!isString(config.id) || !config.id) {
        throw new Error("$workflow requires a non-empty id.");
    }
    if (!isString(config.initial) || !config.initial) {
        throw new Error("$workflow requires a non-empty initial mode.");
    }
    if (!isObject(config.data)) {
        throw new Error("$workflow requires a data object.");
    }
    if (!isObject(config.transitions)) {
        throw new Error("$workflow requires a transitions object.");
    }
    if (config.commands !== undefined && !isObject(config.commands)) {
        throw new Error("$workflow commands must be an object.");
    }
    const concurrency = config.concurrency;
    if (concurrency !== undefined &&
        concurrency !== "allow" &&
        concurrency !== "reject" &&
        concurrency !== "queue") {
        throw new Error("$workflow concurrency must be 'allow', 'reject', or 'queue'.");
    }
    normalizeHistoryLimit(config.historyLimit);
    normalizeEntryLimit(config.diagnosticLimit, "$workflow diagnosticLimit", 1000);
    normalizeTimeout(config.commandTimeout);
    if (config.migrateSnapshot !== undefined &&
        !isFunction(config.migrateSnapshot)) {
        throw new Error("$workflow migrateSnapshot must be a function.");
    }
}
function assertWorkflowSnapshot(snapshot) {
    if (!isObject(snapshot)) {
        throw new Error("$workflow restore requires a snapshot object.");
    }
    const candidate = snapshot;
    if (candidate.version !== 1) {
        throw new Error("$workflow restore requires a version 1 snapshot.");
    }
    if (!isString(candidate.id) || !candidate.id) {
        throw new Error("$workflow restore requires a non-empty id.");
    }
    if (!isString(candidate.current) || !candidate.current) {
        throw new Error("$workflow restore requires a non-empty current mode.");
    }
    if (!isObject(candidate.data)) {
        throw new Error("$workflow restore requires a data object.");
    }
    if (!isArray(candidate.diagnostics)) {
        throw new Error("$workflow restore requires diagnostics.");
    }
    if (!isArray(candidate.history)) {
        throw new Error("$workflow restore requires history.");
    }
}

export { WorkflowProvider, defineCommand, defineWorkflow };
