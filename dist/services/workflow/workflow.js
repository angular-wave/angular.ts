import { SCOPE_PROXY_BIND } from '../../core/scope/scope.js';
import { isObject, isString, isArray, isFunction, isNumber, hasOwn, isBoolean, isInstanceOf } from '../../shared/utils.js';

const WORKFLOW_COMMAND_CANCELLATION = Symbol("workflow.command.cancellation");
class WorkflowCommandRejectionError extends Error {
    constructor(diagnostic) {
        super(diagnostic.message);
        this.diagnostic = diagnostic;
        this.name = "WorkflowCommandRejectionError";
    }
}
/** @internal */
function createWorkflowService() {
    return createWorkflowFactory();
}
function defineWorkflow(config) {
    return config.data === undefined ? { ...config, data: {} } : config;
}
function createWorkflowSupervisor($workflow, config) {
    const workflows = createWorkflowSupervisorRegistry($workflow, config);
    const persistence = resolveWorkflowSupervisorPersistence(config.persistence);
    const exposedWorkflows = new Map();
    const diagnostics = [];
    let status = "idle";
    function snapshot() {
        const workflowSnapshots = {};
        for (const [name, workflow] of workflows) {
            workflowSnapshots[name] = workflow.snapshot();
        }
        return {
            version: 1,
            id: config.id,
            status,
            workflows: workflowSnapshots,
            diagnostics: normalizeWorkflowSupervisorDiagnostics(diagnostics),
            updatedAt: Date.now(),
        };
    }
    function appendSupervisorDiagnostic(diagnostic) {
        diagnostics.push(diagnostic);
        return diagnostic;
    }
    function createMissingWorkflowDiagnostic(workflowName, command) {
        const formattedWorkflow = isString(workflowName) ? workflowName : "";
        const workflow = isString(workflowName) && workflowName ? workflowName : undefined;
        return {
            code: "workflowSupervisor.missingWorkflow",
            message: formattedWorkflow
                ? `Workflow supervisor '${config.id}' does not have workflow '${formattedWorkflow}'.`
                : `Workflow supervisor '${config.id}' requires a workflow name.`,
            recoverable: true,
            workflow,
            command,
            detail: normalizeDiagnosticDetail({
                supervisor: config.id,
                workflow: workflowName,
            }),
        };
    }
    function createUnknownSnapshotWorkflowDiagnostic(workflowName) {
        return {
            code: "workflowSupervisor.unknownSnapshotWorkflow",
            message: `Workflow supervisor '${config.id}' snapshot includes unknown workflow '${workflowName}'.`,
            recoverable: true,
            workflow: workflowName,
            detail: normalizeDiagnosticDetail({
                supervisor: config.id,
                workflow: workflowName,
            }),
        };
    }
    function createPersistenceDiagnostic(code, action, error) {
        return {
            code,
            message: `Workflow supervisor '${config.id}' failed to ${action} persisted snapshot: ${formatUnknownMessage(error)}`,
            recoverable: true,
            detail: normalizeDiagnosticDetail({
                supervisor: config.id,
                action,
                error: formatUnknownMessage(error),
            }),
        };
    }
    function createRecoveryDiagnostic(workflowName, command, result) {
        return {
            code: "workflowSupervisor.recoveryCommandFailed",
            message: `Workflow supervisor '${config.id}' recovery retry failed for workflow '${workflowName}' command '${command}'.`,
            recoverable: result.diagnostics.some((diagnostic) => diagnostic.recoverable === true),
            workflow: workflowName,
            command,
            detail: normalizeDiagnosticDetail({
                supervisor: config.id,
                workflow: workflowName,
                command,
                diagnostics: result.diagnostics,
            }),
        };
    }
    function findRecoverableFailedCommand(workflow) {
        for (let index = workflow.history.length - 1; index >= 0; index -= 1) {
            const entry = workflow.history[index];
            if (entry.type !== "command.failed") {
                continue;
            }
            if (!entry.diagnostics?.some((diagnostic) => diagnostic.recoverable === true)) {
                continue;
            }
            return entry;
        }
        return undefined;
    }
    function recoverWorkflowCommand(workflow, entry) {
        return runWorkflowCommand(workflow, entry.command, entry.input);
    }
    function restore(snapshotInput) {
        const restoredSnapshot = normalizeWorkflowSupervisorSnapshot(snapshotInput);
        if (restoredSnapshot.id !== config.id) {
            throw new Error("$workflowSupervisor restore snapshot id must match supervisor id.");
        }
        const supervisorDiagnostics = [...restoredSnapshot.diagnostics];
        for (const [name, workflowSnapshot] of Object.entries(restoredSnapshot.workflows)) {
            const workflow = workflows.get(name);
            if (!workflow) {
                supervisorDiagnostics.push(createUnknownSnapshotWorkflowDiagnostic(name));
                continue;
            }
            workflow.restore(workflowSnapshot);
        }
        status = restoredSnapshot.status;
        replaceArray(diagnostics, supervisorDiagnostics);
    }
    async function persist() {
        const supervisorSnapshot = snapshot();
        if (!persistence) {
            return supervisorSnapshot;
        }
        status = "persisting";
        try {
            await persistence.save(config.id, supervisorSnapshot);
            status = "idle";
            return supervisorSnapshot;
        }
        catch (error) {
            status = "failed";
            appendSupervisorDiagnostic(createPersistenceDiagnostic("workflowSupervisor.persistenceSaveFailed", "save", error));
            throw error;
        }
    }
    async function restorePersisted() {
        if (!persistence) {
            return undefined;
        }
        status = "recovering";
        try {
            const persistedSnapshot = await persistence.load(config.id);
            if (!persistedSnapshot) {
                status = "idle";
                return undefined;
            }
            restore(persistedSnapshot);
            status = "idle";
            return snapshot();
        }
        catch (error) {
            status = "failed";
            appendSupervisorDiagnostic(createPersistenceDiagnostic("workflowSupervisor.persistenceLoadFailed", "load", error));
            throw error;
        }
    }
    async function persistAfterCommand(result) {
        try {
            await persist();
        }
        catch {
            return result;
        }
        return result;
    }
    function getWorkflowOrThrow(name) {
        const workflow = getWorkflowOrRecordDiagnostic(name);
        if (!workflow) {
            throw new Error(`$workflowSupervisor workflow '${name}' is not registered.`);
        }
        if (config.autoPersist !== true) {
            return workflow;
        }
        let exposedWorkflow = exposedWorkflows.get(name);
        if (!exposedWorkflow) {
            exposedWorkflow = new Proxy(workflow, {
                get(target, property, receiver) {
                    if (property === "run") {
                        return (command, input) => runWorkflowCommand(target, command, input).then(persistAfterCommand);
                    }
                    return Reflect.get(target, property, receiver);
                },
            });
            exposedWorkflows.set(name, exposedWorkflow);
        }
        return exposedWorkflow;
    }
    function getWorkflowOrRecordDiagnostic(workflowName, command) {
        if (!isString(workflowName) || !workflowName) {
            appendSupervisorDiagnostic(createMissingWorkflowDiagnostic(workflowName, command));
            return undefined;
        }
        const workflow = workflows.get(workflowName);
        if (!workflow) {
            appendSupervisorDiagnostic(createMissingWorkflowDiagnostic(workflowName, command));
            return undefined;
        }
        return workflow;
    }
    async function recover() {
        status = "recovering";
        const restored = await restorePersisted();
        let recovered = false;
        let failed = false;
        for (const [workflowName, workflow] of workflows) {
            const entry = findRecoverableFailedCommand(workflow);
            if (!entry)
                continue;
            recovered = true;
            const result = await recoverWorkflowCommand(workflow, entry);
            if (!result.ok) {
                failed = true;
                appendSupervisorDiagnostic(createRecoveryDiagnostic(workflowName, entry.command, result));
            }
        }
        status = failed ? "failed" : "idle";
        return restored || recovered ? snapshot() : undefined;
    }
    const supervisor = {
        id: config.id,
        get status() {
            return status;
        },
        diagnostics,
        ready: config.autoRecover === true
            ? recover().catch(() => undefined)
            : Promise.resolve(undefined),
        workflow(name) {
            return getWorkflowOrThrow(name);
        },
        cancelAll() {
            let cancelled = 0;
            for (const workflow of workflows.values()) {
                cancelled += workflow.cancel();
            }
            return cancelled;
        },
        snapshot,
        restore,
        persist,
        recover,
    };
    return supervisor;
}
function createWorkflowSupervisorRegistry($workflow, config) {
    assertWorkflowSupervisorConfig(config);
    const registry = new Map();
    const workflowEntries = normalizeWorkflowSupervisorEntries(config.workflows);
    if (!workflowEntries.length) {
        throw new Error("$workflowSupervisor requires at least one workflow.");
    }
    for (const [name, definition] of workflowEntries) {
        if (!isString(name) || !name) {
            throw new Error("$workflowSupervisor workflow names must be non-empty strings.");
        }
        if (registry.has(name)) {
            throw new Error(`$workflowSupervisor duplicate workflow name '${name}'.`);
        }
        registry.set(name, createWorkflowSupervisorWorkflow($workflow, definition));
    }
    return registry;
}
function assertWorkflowSupervisorConfig(config) {
    if (!isObject(config)) {
        throw new Error("$workflowSupervisor requires a config object.");
    }
    const id = config.id;
    if (!isString(id) || !id) {
        throw new Error("$workflowSupervisor requires a non-empty id.");
    }
    for (const option of ["autoPersist", "autoRecover"]) {
        const value = config[option];
        if (value !== undefined && !isBoolean(value)) {
            throw new Error(`$workflowSupervisor ${option} must be a boolean.`);
        }
    }
    const typedConfig = config;
    if ((typedConfig.autoPersist === true || typedConfig.autoRecover === true) &&
        typedConfig.persistence === undefined) {
        throw new Error("$workflowSupervisor autoPersist and autoRecover require persistence.");
    }
}
function normalizeWorkflowSupervisorEntries(workflows) {
    if (isArray(workflows)) {
        return workflows.map(normalizeWorkflowSupervisorEntry);
    }
    if (!isObject(workflows)) {
        throw new Error("$workflowSupervisor requires workflows.");
    }
    return Object.entries(workflows);
}
function normalizeWorkflowSupervisorEntry(entry) {
    if (isArray(entry)) {
        return [entry[0], entry[1]];
    }
    if (isObject(entry)) {
        const record = entry;
        if (hasOwn(record, "workflow")) {
            return [record.name, record.workflow];
        }
        if (hasOwn(record, "config")) {
            return [record.name, record.config];
        }
    }
    throw new Error("$workflowSupervisor workflow entries must be tuples or objects.");
}
function createWorkflowSupervisorWorkflow($workflow, definition) {
    if (isWorkflowInstance(definition)) {
        return definition;
    }
    if (!isObject(definition)) {
        throw new Error("$workflowSupervisor workflow must be a workflow instance or config object.");
    }
    return $workflow(definition);
}
function isWorkflowInstance(value) {
    const workflow = value;
    return (isObject(workflow) &&
        isString(workflow.id) &&
        isString(workflow.state) &&
        isObject(workflow.data) &&
        isArray(workflow.diagnostics) &&
        isArray(workflow.history) &&
        isFunction(workflow.can) &&
        isFunction(workflow.run) &&
        isFunction(workflow.cancel) &&
        isFunction(workflow.snapshot) &&
        isFunction(workflow.restore));
}
function normalizeWorkflowSupervisorSnapshot(snapshot) {
    assertWorkflowSupervisorSnapshot(snapshot);
    const diagnostics = normalizeWorkflowSupervisorDiagnostics(snapshot.diagnostics);
    return {
        version: 1,
        id: snapshot.id,
        status: normalizeRestoredSupervisorStatus(snapshot.status, diagnostics),
        workflows: snapshot.workflows,
        diagnostics,
        updatedAt: snapshot.updatedAt,
    };
}
function normalizeRestoredSupervisorStatus(status, diagnostics) {
    if (status === "failed") {
        return "failed";
    }
    if (status === "persisting" || status === "recovering") {
        return diagnostics.some((diagnostic) => diagnostic.recoverable === false)
            ? "failed"
            : "idle";
    }
    return status;
}
function assertWorkflowSupervisorSnapshot(snapshot) {
    if (!isObject(snapshot)) {
        throw new Error("$workflowSupervisor restore requires a snapshot object.");
    }
    const candidate = snapshot;
    if (candidate.version !== 1) {
        throw new Error("$workflowSupervisor restore requires a version 1 snapshot.");
    }
    if (!isString(candidate.id) || !candidate.id) {
        throw new Error("$workflowSupervisor restore requires a non-empty id.");
    }
    if (!isWorkflowSupervisorStatus(candidate.status)) {
        throw new Error("$workflowSupervisor restore requires a valid status.");
    }
    if (!isObject(candidate.workflows) || isArray(candidate.workflows)) {
        throw new Error("$workflowSupervisor restore requires workflows.");
    }
    if (!isArray(candidate.diagnostics)) {
        throw new Error("$workflowSupervisor restore requires diagnostics.");
    }
    if (!isNumber(candidate.updatedAt) || !Number.isFinite(candidate.updatedAt)) {
        throw new Error("$workflowSupervisor restore requires updatedAt.");
    }
}
function isWorkflowSupervisorStatus(value) {
    return (value === "idle" ||
        value === "persisting" ||
        value === "recovering" ||
        value === "failed");
}
function normalizeWorkflowSupervisorDiagnostics(supervisorDiagnostics) {
    /* istanbul ignore next: restore validation enforces diagnostics arrays before normalization. */
    if (!isArray(supervisorDiagnostics)) {
        return [];
    }
    return supervisorDiagnostics.map((diagnostic) => {
        if (!isObject(diagnostic)) {
            return {
                code: "workflowSupervisor.diagnostic",
                message: formatUnknownMessage(diagnostic),
                recoverable: true,
            };
        }
        const candidate = diagnostic;
        return {
            code: isString(candidate.code)
                ? candidate.code
                : "workflowSupervisor.diagnostic",
            message: isString(candidate.message)
                ? candidate.message
                : "Workflow supervisor diagnostic.",
            recoverable: isBoolean(candidate.recoverable)
                ? candidate.recoverable
                : undefined,
            workflow: isString(candidate.workflow) ? candidate.workflow : undefined,
            command: isString(candidate.command) ? candidate.command : undefined,
            detail: normalizeDiagnosticDetail(candidate.detail),
        };
    });
}
function createIndexedDbWorkflowSupervisorPersistence(config) {
    const database = normalizeWorkflowSupervisorIndexedDbName(config.database, "database", "angular-ts-workflows");
    const store = normalizeWorkflowSupervisorIndexedDbName(config.store, "store", "supervisorSnapshots");
    const version = normalizeWorkflowSupervisorIndexedDbVersion(config.version);
    const indexedDBFactory = config.indexedDB ?? globalThis.indexedDB;
    return {
        async load(id) {
            const databaseHandle = await openWorkflowSupervisorIndexedDb(indexedDBFactory, database, store, version);
            try {
                const transaction = databaseHandle.transaction(store, "readonly");
                const objectStore = transaction.objectStore(store);
                const value = await workflowSupervisorIdbRequest(objectStore.get(id));
                await workflowSupervisorIdbTransaction(transaction);
                return value;
            }
            finally {
                databaseHandle.close();
            }
        },
        async save(id, snapshot) {
            const databaseHandle = await openWorkflowSupervisorIndexedDb(indexedDBFactory, database, store, version);
            try {
                const transaction = databaseHandle.transaction(store, "readwrite");
                const objectStore = transaction.objectStore(store);
                await workflowSupervisorIdbRequest(objectStore.put(snapshot, id));
                await workflowSupervisorIdbTransaction(transaction);
            }
            finally {
                databaseHandle.close();
            }
        },
    };
}
function resolveWorkflowSupervisorPersistence(persistence) {
    if (persistence === undefined)
        return undefined;
    if (persistence === "indexeddb") {
        return createIndexedDbWorkflowSupervisorPersistence({});
    }
    if (isWorkflowSupervisorPersistenceConfig(persistence)) {
        return createIndexedDbWorkflowSupervisorPersistence(persistence);
    }
    if (isWorkflowSupervisorPersistence(persistence)) {
        return persistence;
    }
    throw new Error("$workflowSupervisor persistence must be 'indexeddb', an IndexedDB config, or a persistence adapter.");
}
function isWorkflowSupervisorPersistenceConfig(value) {
    return isObject(value) && value.type === "indexeddb";
}
function isWorkflowSupervisorPersistence(value) {
    if (!isObject(value))
        return false;
    const candidate = value;
    return isFunction(candidate.load) && isFunction(candidate.save);
}
function normalizeWorkflowSupervisorIndexedDbName(value, field, fallback) {
    if (value === undefined) {
        return fallback;
    }
    if (!isString(value) || !value) {
        throw new Error(`$workflowSupervisor IndexedDB ${field} must be non-empty.`);
    }
    return value;
}
function normalizeWorkflowSupervisorIndexedDbVersion(value) {
    if (value === undefined) {
        return 1;
    }
    if (!isNumber(value) || !Number.isInteger(value) || value < 1) {
        throw new Error("$workflowSupervisor IndexedDB version must be a positive integer.");
    }
    return value;
}
function openWorkflowSupervisorIndexedDb(indexedDBFactory, database, store, version) {
    if (!indexedDBFactory) {
        return Promise.reject(new Error("$workflowSupervisor IndexedDB persistence requires indexedDB."));
    }
    return new Promise((resolve, reject) => {
        const request = indexedDBFactory.open(database, version);
        request.onupgradeneeded = () => {
            const databaseHandle = request.result;
            if (!databaseHandle.objectStoreNames.contains(store)) {
                databaseHandle.createObjectStore(store);
            }
        };
        request.onsuccess = () => {
            resolve(request.result);
        };
        request.onerror = () => {
            reject(request.error ?? new Error("IndexedDB open failed."));
        };
        request.onblocked = () => {
            reject(new Error("IndexedDB open was blocked."));
        };
    });
}
function workflowSupervisorIdbRequest(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            resolve(request.result);
        };
        request.onerror = () => {
            reject(request.error ?? new Error("IndexedDB request failed."));
        };
    });
}
function workflowSupervisorIdbTransaction(transaction) {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
            resolve();
        };
        transaction.onerror = () => {
            reject(transaction.error ?? new Error("IndexedDB transaction failed."));
        };
        transaction.onabort = () => {
            reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
        };
    });
}
function createWorkflowFactory() {
    return function createWorkflow(config) {
        if (!isObject(config)) {
            throw new Error("$workflow requires a config object.");
        }
        const data = defaultWorkflowData(config.data);
        config = {
            ...config,
            data,
        };
        assertWorkflowConfig(config);
        const diagnostics = [];
        const history = [];
        const diagnosticLimit = normalizeEntryLimit(config.diagnosticLimit, "$workflow diagnosticLimit", 1000);
        const historyLimit = normalizeHistoryLimit(config.historyLimit);
        const runningCommands = new Set();
        const commandQueues = new Map();
        const bindings = new Map();
        let state = config.initial;
        let nextHistoryId = 1;
        let queueGeneration = 0;
        const workflowTarget = {
            id: config.id,
            get state() {
                return state;
            },
            get data() {
                return data;
            },
            diagnostics,
            history,
            can(command) {
                const definition = getCommand(config, command);
                if (!definition || !isCommandAllowedFrom(definition, state)) {
                    return false;
                }
                return !((definition.concurrency ?? "reject") === "reject" &&
                    isCommandRunning(command));
            },
            async run(command, input) {
                if (!isString(command) || !command) {
                    return failCommand(command, input, [
                        createDiagnostic("workflow.invalidCommand", "Workflow command name must be a non-empty string.", command, true),
                    ]);
                }
                const definition = getCommand(config, command);
                if (!definition) {
                    return failCommand(command, input, [
                        createDiagnostic("workflow.missingCommand", `Workflow command '${command}' is not configured.`, command, true),
                    ]);
                }
                const mode = definition.concurrency ?? "reject";
                if (mode === "reject" && isCommandRunning(command)) {
                    return failCommand(command, input, [
                        createDiagnostic("workflow.commandRunning", `Workflow command '${command}' is already running.`, command, true),
                    ]);
                }
                if (mode === "queue") {
                    const generation = queueGeneration;
                    const previous = commandQueues.get(command) ?? Promise.resolve();
                    const queued = previous.then(() => {
                        if (generation !== queueGeneration) {
                            return {
                                ok: false,
                                status: "cancelled",
                                diagnostics: [
                                    createDiagnostic("workflow.commandCancelled", `Workflow command '${command}' was cancelled.`, command, true),
                                ],
                            };
                        }
                        return executeCommand(command, input, definition);
                    });
                    const tail = queued.finally(() => {
                        if (commandQueues.get(command) === tail) {
                            commandQueues.delete(command);
                        }
                    });
                    commandQueues.set(command, tail);
                    return queued;
                }
                return executeCommand(command, input, definition);
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
                    if (cancelRun(state, createDiagnostic("workflow.commandCancelled", `Workflow command '${state._command}' was cancelled.`, state._command, true))) {
                        cancelled += 1;
                    }
                }
                return cancelled;
            },
            snapshot() {
                return {
                    version: 1,
                    id: config.id,
                    state,
                    data: structuredClone(data),
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
                cancelRunningCommands();
                state = restoredSnapshot.state;
                replaceWorkflowData(data, restoredSnapshot.data);
                replaceArray(diagnostics, normalizeDiagnostics(restoredSnapshot.diagnostics));
                trimDiagnostics();
                replaceArray(history, normalizeHistory(restoredSnapshot.history));
                trimHistory();
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
            },
        });
        return workflowTarget;
        async function executeCommand(command, input, definition) {
            if (!isCommandAllowedFrom(definition, state)) {
                return failCommand(command, input, [
                    createDiagnostic("workflow.commandNotAllowed", `Workflow command '${command}' cannot run from state '${state}'.`, command, true, { command, state }),
                ]);
            }
            appendHistory({
                type: "command.started",
                command,
                input,
            });
            const runState = createRunState(command, definition.commandTimeout);
            try {
                applyLifecycleTarget(definition.pending, {
                    command,
                    input,
                    data,
                });
                const cancelDiagnostic = runState._cancelDiagnostic;
                if (cancelDiagnostic) {
                    applyFailureLifecycle(definition, command, input, [cancelDiagnostic]);
                    return failCommand(command, input, [cancelDiagnostic]);
                }
                const retries = normalizeRetryCount(definition.retry);
                let attempt = 0;
                let commandValue;
                while (attempt <= retries) {
                    try {
                        commandValue = await executeCommandAttempt(command, input, definition, runState);
                        break;
                    }
                    catch (error) {
                        if (runState._cancelDiagnostic ||
                            error instanceof WorkflowCommandRejectionError ||
                            attempt >= retries) {
                            throw error;
                        }
                        attempt += 1;
                    }
                }
                applyLifecycleTarget(definition.success, {
                    command,
                    input,
                    data,
                    output: commandValue,
                });
                const result = {
                    ok: true,
                    status: "completed",
                    output: commandValue,
                    diagnostics: undefined,
                };
                appendHistory({
                    type: "command.completed",
                    command,
                    input,
                    output: result.output,
                    diagnostics: result.diagnostics,
                });
                return result;
            }
            catch (error) {
                if (runState._cancelDiagnostic) {
                    if (runState._discardResult) {
                        return {
                            ok: false,
                            status: commandStatusFromDiagnostics([
                                runState._cancelDiagnostic,
                            ]),
                            diagnostics: [runState._cancelDiagnostic],
                        };
                    }
                    applyFailureLifecycle(definition, command, input, [
                        runState._cancelDiagnostic,
                    ]);
                    return failCommand(command, input, [
                        runState._cancelDiagnostic,
                    ]);
                }
                if (error instanceof WorkflowCommandRejectionError) {
                    const diagnostic = error.diagnostic;
                    applyFailureLifecycle(definition, command, input, [diagnostic]);
                    return failCommand(command, input, [diagnostic], "rejected");
                }
                const commandDiagnostics = [diagnosticFromError(error, command)];
                applyFailureLifecycle(definition, command, input, commandDiagnostics);
                return failCommand(command, input, commandDiagnostics);
            }
            finally {
                finishRunState(runState);
            }
        }
        async function executeCommandAttempt(command, input, definition, runState) {
            const commandPromise = Promise.resolve(definition.execute
                ? invokeWorkflowCommand(definition.execute, {
                    cleanup(callback) {
                        if (isFunction(callback)) {
                            runState._cleanups.push(callback);
                        }
                    },
                    reject(diagnostic) {
                        throw new WorkflowCommandRejectionError(normalizeDiagnostic(diagnostic));
                    },
                    data: createReadonlyWorkflowData(data),
                    input,
                    command,
                    signal: runState._controller.signal,
                })
                : undefined);
            const commandValue = (await Promise.race([
                commandPromise,
                runState._cancelPromise.then((diagnostic) => ({
                    [WORKFLOW_COMMAND_CANCELLATION]: diagnostic,
                })),
            ]));
            commandPromise.catch(() => undefined);
            if (isObject(commandValue) &&
                WORKFLOW_COMMAND_CANCELLATION in commandValue) {
                throw new WorkflowCommandRejectionError(commandValue[WORKFLOW_COMMAND_CANCELLATION]);
            }
            return commandValue;
        }
        function applyLifecycleTarget(target, context) {
            if (isString(target)) {
                state = target;
            }
            else {
                state = target.to;
                target.update?.(context);
            }
            scheduleWorkflowBindings();
        }
        function applyFailureLifecycle(definition, command, input, commandDiagnostics) {
            const status = commandStatusFromDiagnostics(commandDiagnostics);
            const target = status === "timeout"
                ? (definition.timeout ?? definition.failure)
                : status === "cancelled"
                    ? (definition.cancelled ?? definition.failure)
                    : definition.failure;
            try {
                applyLifecycleTarget(target, {
                    command,
                    input,
                    data,
                    diagnostic: commandDiagnostics[0],
                    diagnostics: commandDiagnostics,
                });
            }
            catch (error) {
                commandDiagnostics.push(diagnosticFromError(error, command, "workflow.lifecycleUpdateFailed"));
            }
        }
        function scheduleWorkflowBindings() {
            for (const [scopeId, binding] of bindings) {
                if (binding._handler._destroyed) {
                    bindings.delete(scopeId);
                    continue;
                }
                binding._handler._scheduleWatchKeys([
                    "state",
                    "data",
                    "diagnostics",
                    "history",
                ]);
                binding._handler._checkListenersForAllKeys(workflowTarget);
                binding._handler._checkListenersForAllKeys(data);
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
                input: normalizeHistoryValue(entry.input),
                ...(hasOwn(entry, "output")
                    ? { output: normalizeHistoryValue(entry.output) }
                    : {}),
                ...(entry.diagnostics
                    ? { diagnostics: normalizeDiagnostics(entry.diagnostics) }
                    : {}),
            };
            history.push(historyEntry);
            trimHistory();
            scheduleWorkflowBindings();
            return historyEntry;
        }
        function trimHistory() {
            trimArray(history, historyLimit);
        }
        function isCommandRunning(command) {
            for (const state of runningCommands) {
                if (state._command === command) {
                    return true;
                }
            }
            return false;
        }
        function createRunState(command, commandTimeout) {
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
            const timeout = normalizeTimeout(commandTimeout);
            let timeoutId;
            if (timeout !== undefined) {
                timeoutId = globalThis.setTimeout(() => {
                    cancelRun(state, createDiagnostic("workflow.commandTimeout", `Workflow command '${command}' timed out after ${String(timeout)}ms.`, command, true, {
                        timeout,
                    }));
                }, timeout);
            }
            if (timeoutId !== undefined) {
                state._cleanups.push(() => {
                    globalThis.clearTimeout(timeoutId);
                });
            }
            runningCommands.add(state);
            return state;
        }
        function cancelRun(state, diagnostic, discardResult = false) {
            if (state._done || state._cancelDiagnostic) {
                return false;
            }
            state._discardResult = discardResult;
            state._cancelDiagnostic = diagnostic;
            state._cancel(diagnostic);
            if (!state._controller.signal.aborted) {
                state._controller.abort(diagnostic);
            }
            return true;
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
        function cancelRunningCommands(recordResult) {
            for (const state of runningCommands) {
                cancelRun(state, createDiagnostic("workflow.commandCancelled", `Workflow command '${state._command}' was cancelled.`, state._command, true), true);
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
            throw new Error("$workflow restore requires a version 1 snapshot.");
        }
        function failCommand(command, input, commandDiagnostics, status) {
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
                status: status ?? commandStatusFromDiagnostics(commandDiagnostics),
                diagnostics: commandDiagnostics,
            };
        }
    };
}
function runWorkflowCommand(workflow, command, input) {
    const runner = workflow;
    return runner.run(command, input);
}
function invokeWorkflowCommand(handler, context) {
    return handler(context);
}
function createReadonlyWorkflowData(data) {
    const proxies = new WeakMap();
    const targets = new WeakMap();
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
                    return getReadonlyWorkflowMapProperty(target, property, proxify, unproxify);
                }
                if (isInstanceOf(target, Set)) {
                    return getReadonlyWorkflowSetProperty(target, property, proxify, unproxify);
                }
                return proxify(Reflect.get(target, property, receiver));
            },
            set() {
                throwReadonlyWorkflowDataError();
            },
            deleteProperty() {
                throwReadonlyWorkflowDataError();
            },
            defineProperty() {
                throwReadonlyWorkflowDataError();
            },
            setPrototypeOf() {
                throwReadonlyWorkflowDataError();
            },
        });
        proxies.set(value, proxy);
        targets.set(proxy, value);
        return proxy;
    }
    function unproxify(value) {
        return isObject(value) ? (targets.get(value) ?? value) : value;
    }
}
function getReadonlyWorkflowMapProperty(target, property, proxify, unproxify) {
    if (property === "size") {
        return target.size;
    }
    if (property === "get") {
        return (key) => proxify(target.get(unproxify(key)));
    }
    if (property === "has") {
        return (key) => target.has(unproxify(key));
    }
    if (property === "keys") {
        return () => mapReadonlyIterator(target.keys(), proxify);
    }
    if (property === "values") {
        return () => mapReadonlyIterator(target.values(), proxify);
    }
    if (property === "entries" || property === Symbol.iterator) {
        return () => mapReadonlyEntries(target.entries(), proxify);
    }
    if (property === "forEach") {
        return (callback) => {
            target.forEach((value, key) => {
                callback(proxify(value), proxify(key));
            });
        };
    }
    if (property === "set" || property === "delete" || property === "clear") {
        return throwReadonlyWorkflowDataError;
    }
    if (property === "constructor") {
        return target.constructor;
    }
    const value = Reflect.get(target, property, target);
    return isFunction(value) ? value.bind(target) : value;
}
function getReadonlyWorkflowSetProperty(target, property, proxify, unproxify) {
    if (property === "size") {
        return target.size;
    }
    if (property === "add" || property === "delete" || property === "clear") {
        return throwReadonlyWorkflowDataError;
    }
    if (property === "has") {
        return (value) => target.has(unproxify(value));
    }
    if (property === "keys" ||
        property === "values" ||
        property === Symbol.iterator) {
        return () => mapReadonlyIterator(target.values(), proxify);
    }
    if (property === "entries") {
        return () => mapReadonlyEntries(target.entries(), proxify);
    }
    if (property === "forEach") {
        return (callback) => {
            target.forEach((value) => {
                const readonlyValue = proxify(value);
                callback(readonlyValue, readonlyValue);
            });
        };
    }
    if (property === "constructor") {
        return target.constructor;
    }
    const value = Reflect.get(target, property, target);
    return isFunction(value) ? value.bind(target) : value;
}
function* mapReadonlyIterator(iterator, proxify) {
    for (const value of iterator) {
        yield proxify(value);
    }
}
function* mapReadonlyEntries(iterator, proxify) {
    for (const [key, value] of iterator) {
        yield [proxify(key), proxify(value)];
    }
}
function throwReadonlyWorkflowDataError() {
    throw new TypeError("Workflow command data is readonly; mutate data in a lifecycle update.");
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
    if (!hasOwn(config.commands, command)) {
        return undefined;
    }
    const definition = config.commands[command];
    return definition;
}
function isCommandAllowedFrom(definition, state) {
    return isArray(definition.from)
        ? definition.from.includes(state)
        : definition.from === state;
}
function commandStatusFromDiagnostics(diagnostics) {
    for (const diagnostic of diagnostics) {
        if (diagnostic.code === "workflow.commandTimeout") {
            return "timeout";
        }
    }
    for (const diagnostic of diagnostics) {
        if (diagnostic.code === "workflow.commandCancelled") {
            return "cancelled";
        }
    }
    for (const diagnostic of diagnostics) {
        if (diagnostic.code === "workflow.invalidCommand" ||
            diagnostic.code === "workflow.missingCommand" ||
            diagnostic.code === "workflow.commandNotAllowed" ||
            diagnostic.code === "workflow.commandRunning") {
            return "rejected";
        }
    }
    return "failed";
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
function normalizeDiagnostic(diagnostic) {
    return normalizeDiagnostics([diagnostic])[0];
}
function normalizeHistoryValue(value) {
    return normalizeDiagnosticDetail(value);
}
function normalizeHistory(historyEntries) {
    let nextFallbackId = 1;
    const usedIds = new Set();
    return historyEntries.map((entry) => {
        const candidate = isObject(entry)
            ? entry
            : {};
        const id = allocateHistoryId(candidate.id);
        return {
            id,
            type: normalizeHistoryType(candidate.type),
            command: isString(candidate.command) && candidate.command
                ? candidate.command
                : "unknown",
            ...(hasOwn(candidate, "input")
                ? { input: normalizeHistoryValue(candidate.input) }
                : {}),
            ...(hasOwn(candidate, "output")
                ? { output: normalizeHistoryValue(candidate.output) }
                : {}),
            ...(hasOwn(candidate, "diagnostics")
                ? { diagnostics: normalizeDiagnostics(candidate.diagnostics) }
                : {}),
        };
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
    const deleteCount = target.length - limit;
    if (deleteCount <= 0) {
        return [];
    }
    return target.splice(0, deleteCount);
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
function normalizeRetryCount(value) {
    return normalizeEntryLimit(value, "$workflow command retry", 0);
}
function createDiagnostic(code, message, command, recoverable, detail) {
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
    const normalized = {};
    for (const key of Object.keys(value)) {
        normalized[key] = normalizeDiagnosticDetail(value[key], seen);
    }
    seen.delete(objectValue);
    return normalized;
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
function replaceWorkflowData(target, source) {
    const restored = structuredClone(source);
    if (isArray(target) && isArray(restored)) {
        target.splice(0, target.length, ...restored);
        return;
    }
    if (isInstanceOf(target, Map) && isInstanceOf(restored, Map)) {
        target.clear();
        for (const [key, value] of restored) {
            target.set(key, value);
        }
        return;
    }
    if (isInstanceOf(target, Set) && isInstanceOf(restored, Set)) {
        target.clear();
        for (const value of restored) {
            target.add(value);
        }
        return;
    }
    for (const key of Reflect.ownKeys(target)) {
        Reflect.deleteProperty(target, key);
    }
    Object.assign(target, restored);
}
function defaultWorkflowData(data) {
    if (data === undefined) {
        return {};
    }
    return data;
}
function assertWorkflowConfig(config) {
    if (!isString(config.id) || !config.id) {
        throw new Error("$workflow requires a non-empty id.");
    }
    if (!isString(config.initial) || !config.initial) {
        throw new Error("$workflow requires a non-empty initial state.");
    }
    if (!isObject(config.data)) {
        throw new Error("$workflow requires a data object.");
    }
    if (!isObject(config.commands) || isArray(config.commands)) {
        throw new Error("$workflow commands must be an object.");
    }
    for (const [command, value] of Object.entries(config.commands)) {
        if (!command) {
            throw new Error("$workflow command names must be non-empty strings.");
        }
        assertWorkflowCommandDefinition(command, value);
    }
    normalizeHistoryLimit(config.historyLimit);
    normalizeEntryLimit(config.diagnosticLimit, "$workflow diagnosticLimit", 1000);
    if (config.migrateSnapshot !== undefined &&
        !isFunction(config.migrateSnapshot)) {
        throw new Error("$workflow migrateSnapshot must be a function.");
    }
}
function assertWorkflowCommandDefinition(command, value) {
    if (!isObject(value) || isArray(value)) {
        throw new Error(`$workflow command '${command}' must be a lifecycle definition.`);
    }
    const definition = value;
    if (!(isString(definition.from) && definition.from.length > 0) &&
        !(isArray(definition.from) &&
            definition.from.length > 0 &&
            definition.from.every((state) => isString(state) && state.length > 0))) {
        throw new Error(`$workflow command '${command}' requires a non-empty from state.`);
    }
    assertWorkflowLifecycleTarget(command, "pending", definition.pending);
    assertWorkflowLifecycleTarget(command, "success", definition.success);
    assertWorkflowLifecycleTarget(command, "failure", definition.failure);
    if (definition.cancelled !== undefined) {
        assertWorkflowLifecycleTarget(command, "cancelled", definition.cancelled);
    }
    if (definition.timeout !== undefined) {
        assertWorkflowLifecycleTarget(command, "timeout", definition.timeout);
    }
    if (definition.execute !== undefined && !isFunction(definition.execute)) {
        throw new Error(`$workflow command '${command}' execute must be a function.`);
    }
    const concurrency = value.concurrency;
    if (concurrency !== undefined &&
        concurrency !== "parallel" &&
        concurrency !== "reject" &&
        concurrency !== "queue") {
        throw new Error(`$workflow command '${command}' concurrency must be 'parallel', 'reject', or 'queue'.`);
    }
    normalizeTimeout(definition.commandTimeout);
    normalizeRetryCount(definition.retry);
}
function assertWorkflowLifecycleTarget(command, lifecycle, value) {
    if (isString(value) && value) {
        return;
    }
    const target = value;
    if (isObject(value) &&
        isString(target.to) &&
        target.to.length > 0 &&
        (target.update === undefined || isFunction(target.update))) {
        return;
    }
    throw new Error(`$workflow command '${command}' ${lifecycle} must target a non-empty state.`);
}
function assertWorkflowSnapshot(snapshot) {
    const candidate = snapshot;
    if (!isString(candidate.id) || !candidate.id) {
        throw new Error("$workflow restore requires a non-empty id.");
    }
    if (!isString(candidate.state) || !candidate.state) {
        throw new Error("$workflow restore requires a non-empty state.");
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

export { createWorkflowService, createWorkflowSupervisor, defineWorkflow };
