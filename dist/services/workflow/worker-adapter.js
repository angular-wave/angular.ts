import { isObject, isFunction, isArray, isString, isBoolean, hasOwn } from '../../shared/utils.js';

function createWorkflowWorkerHost(config) {
    if (!isObject(config)) {
        throw new Error("Workflow worker host requires a config object.");
    }
    if (!isObject(config.workflows) || isArray(config.workflows)) {
        throw new Error("Workflow worker host requires workflows.");
    }
    const workflows = new Map();
    const publishSnapshots = config.publishSnapshots !== false;
    for (const [name, workflow] of Object.entries(config.workflows)) {
        if (!isString(name) || !name) {
            throw new Error("Workflow worker host workflow names must be non-empty.");
        }
        if (!isWorkflowInstance(workflow)) {
            throw new Error("Workflow worker host workflows must be workflow instances.");
        }
        workflows.set(name, workflow);
    }
    function snapshot() {
        const snapshots = {};
        for (const [name, workflow] of workflows) {
            snapshots[name] = workflow.snapshot();
        }
        return snapshots;
    }
    function publish(post) {
        if (!publishSnapshots) {
            return;
        }
        post({
            type: "angular-ts:workflow-worker:snapshot",
            snapshot: snapshot(),
        });
    }
    async function run(request) {
        const workflow = getWorkflowWorkerWorkflow(workflows, request.workflow);
        if (!workflow) {
            return createWorkflowWorkerCommandFailure("workflowWorker.missingWorkflow", isString(request.workflow) && request.workflow
                ? `Workflow worker host does not have workflow '${request.workflow}'.`
                : "Workflow worker host requires a workflow name.", request.command);
        }
        if (!isString(request.command) || !request.command) {
            return createWorkflowWorkerCommandFailure("workflowWorker.invalidCommand", "Workflow worker host requires a command name.", undefined);
        }
        return runWorkerWorkflowCommand(workflow, request.command, request.input);
    }
    function restore(request) {
        const snapshots = getWorkflowWorkerRestoreSnapshots(request.snapshot);
        for (const [name, workflowSnapshot] of Object.entries(snapshots)) {
            const workflow = workflows.get(name);
            if (!workflow) {
                continue;
            }
            workflow.restore(workflowSnapshot);
        }
        return snapshot();
    }
    async function handle(message, post) {
        if (!isWorkflowWorkerRequest(message)) {
            return;
        }
        try {
            let result;
            let shouldPublish = false;
            if (message.operation === "run") {
                result = await run(message);
                shouldPublish = true;
            }
            else if (message.operation === "snapshot") {
                result = snapshot();
            }
            else {
                result = restore(message);
                shouldPublish = true;
            }
            post({
                type: "angular-ts:workflow-worker:response",
                id: message.id,
                ok: true,
                result,
            });
            if (shouldPublish) {
                publish(post);
            }
        }
        catch (error) {
            post({
                type: "angular-ts:workflow-worker:response",
                id: message.id,
                ok: false,
                error: createDiagnostic("workflowWorker.requestFailed", formatUnknownMessage(error), undefined, true),
            });
        }
    }
    return {
        handle,
        snapshot,
    };
}
function createWorkflowWorkerClient(connection) {
    const postMethod = isObject(connection)
        ? connection.post
        : undefined;
    const onMessageMethod = isObject(connection)
        ? connection.onMessage
        : undefined;
    if (!isObject(connection) ||
        !isFunction(postMethod) ||
        !isFunction(onMessageMethod)) {
        throw new Error("Workflow worker client requires a WorkerHandle.");
    }
    const post = postMethod.bind(connection);
    let nextRequestId = 1;
    let disposed = false;
    let latestSnapshot;
    const pending = new Map();
    const snapshotListeners = new Set();
    const stopListening = onMessageMethod.call(connection, (data) => {
        if (isWorkflowWorkerResponse(data)) {
            const request = pending.get(data.id);
            if (!request) {
                return;
            }
            pending.delete(data.id);
            if (data.ok) {
                request.resolve(data.result);
            }
            else {
                request.reject(createWorkflowWorkerError(data.error ??
                    createDiagnostic("workflowWorker.requestFailed", "Workflow worker request failed.", undefined, true)));
            }
            return;
        }
        if (isWorkflowWorkerSnapshotMessage(data)) {
            latestSnapshot = data.snapshot;
            for (const listener of snapshotListeners) {
                listener(data.snapshot);
            }
            return;
        }
    });
    function request(operation, requestData = {}) {
        if (disposed) {
            return Promise.reject(createWorkflowWorkerError(createDiagnostic("workflowWorker.clientDisposed", "Workflow worker client is disposed.", undefined, true)));
        }
        const id = `workflow-worker-${String(nextRequestId++)}`;
        const message = {
            ...requestData,
            type: "angular-ts:workflow-worker:request",
            id,
            operation,
        };
        return new Promise((resolve, reject) => {
            pending.set(id, {
                resolve(value) {
                    resolve(value);
                },
                reject,
            });
            post(message);
        });
    }
    return {
        get latestSnapshot() {
            return latestSnapshot;
        },
        run(workflow, command, input) {
            return request("run", {
                workflow,
                command,
                input,
            });
        },
        async snapshot() {
            const workerSnapshot = await request("snapshot");
            latestSnapshot = workerSnapshot;
            return workerSnapshot;
        },
        async restore(snapshotInput) {
            const restoredSnapshot = await request("restore", {
                snapshot: snapshotInput,
            });
            latestSnapshot = restoredSnapshot;
            return restoredSnapshot;
        },
        onSnapshot(callback) {
            snapshotListeners.add(callback);
            return () => {
                snapshotListeners.delete(callback);
            };
        },
        dispose() {
            disposed = true;
            stopListening();
            for (const request of pending.values()) {
                request.reject(createWorkflowWorkerError(createDiagnostic("workflowWorker.clientDisposed", "Workflow worker client is disposed.", undefined, true)));
            }
            pending.clear();
            snapshotListeners.clear();
        },
    };
}
function createWorkflowWorkerError(diagnostic) {
    const error = new Error(diagnostic.message);
    error.diagnostic = diagnostic;
    return error;
}
function isWorkflowWorkerRequest(value) {
    if (!isObject(value)) {
        return false;
    }
    const candidate = value;
    return (candidate.type === "angular-ts:workflow-worker:request" &&
        isString(candidate.id) &&
        candidate.id.length > 0 &&
        (candidate.operation === "run" ||
            candidate.operation === "snapshot" ||
            candidate.operation === "restore"));
}
function isWorkflowWorkerResponse(value) {
    if (!isObject(value)) {
        return false;
    }
    const candidate = value;
    return (candidate.type === "angular-ts:workflow-worker:response" &&
        isString(candidate.id) &&
        candidate.id.length > 0 &&
        isBoolean(candidate.ok));
}
function isWorkflowWorkerSnapshotMessage(value) {
    if (!isObject(value)) {
        return false;
    }
    const candidate = value;
    return (candidate.type === "angular-ts:workflow-worker:snapshot" &&
        isObject(candidate.snapshot) &&
        !isArray(candidate.snapshot));
}
function getWorkflowWorkerWorkflow(workflows, name) {
    if (!isString(name) || !name) {
        return undefined;
    }
    return workflows.get(name);
}
function runWorkerWorkflowCommand(workflow, command, input) {
    return workflow.run(command, input);
}
function createWorkflowWorkerCommandFailure(code, message, command) {
    return {
        ok: false,
        status: "rejected",
        diagnostics: [createDiagnostic(code, message, command, true)],
    };
}
function getWorkflowWorkerRestoreSnapshots(snapshotInput) {
    if (!isObject(snapshotInput) || isArray(snapshotInput)) {
        throw new Error("Workflow worker restore requires a snapshot object.");
    }
    if (hasOwn(snapshotInput, "workflows") &&
        isObject(snapshotInput.workflows) &&
        !isArray(snapshotInput.workflows)) {
        return snapshotInput.workflows;
    }
    return snapshotInput;
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
function createDiagnostic(code, message, command, recoverable) {
    return { code, message, command, recoverable };
}
function formatUnknownMessage(value) {
    if (value instanceof Error)
        return value.message || value.name;
    if (typeof value === "string")
        return value;
    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    return "Workflow worker request failed.";
}

export { createWorkflowWorkerClient, createWorkflowWorkerHost };
