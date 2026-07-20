import { dealoc, removeElementData } from '../../shared/dom.js';
import { assertDefined, shouldHandleViewRetentionPause } from '../../shared/utils.js';

let nextFragmentId = 1;
const compiledFragmentsByNode = new WeakMap();
const compiledFragmentParents = new WeakMap();
const fragmentRetentionDomStates = new WeakMap();
const compiledFragmentStatesByRoot = new WeakMap();
const compiledFragmentScopeDestroyDeregisters = new WeakMap();
function createPublicLinkCompiledFragmentRecord(root, parentScope, nodes, ownsNodes = true) {
    const id = getInitialFragmentId({});
    assertLinkedFragmentCanBeCreated(id, root, true);
    const record = {
        id,
        rootId: root.id,
        root,
        parentScope,
        nodes: copyInitialValues(nodes),
        ownsNodes,
        diagnostics: createPublicLinkDiagnostics(root),
        linked: true,
        disposed: false,
        dispose: disposeCompiledFragmentRecordSelf,
    };
    return registerCompiledFragmentRecord(record, false);
}
function createPublicLinkSingleNodeCompiledFragmentRecord(root, parentScope, node, ownsNodes = true) {
    const id = getInitialFragmentId({});
    assertLinkedFragmentCanBeCreated(id, root, true);
    const record = {
        id,
        rootId: root.id,
        root,
        parentScope,
        nodes: [node],
        ownsNodes,
        diagnostics: createPublicLinkDiagnostics(root),
        linked: true,
        disposed: false,
        dispose: disposeCompiledFragmentRecordSelf,
    };
    return registerCompiledFragmentRecord(record, false);
}
function createCompiledFragmentRecord(options) {
    const id = getInitialFragmentId(options);
    const linked = options.linked === true;
    assertLinkedFragmentCanBeCreated(id, options.root, linked);
    const record = {
        id,
        rootId: options.root.id,
        root: options.root,
        parentScope: options.parentScope,
        nodes: getInitialNodes(options),
        childScopes: copyInitialValues(options.childScopes),
        childFragments: copyInitialValues(options.childFragments),
        ownsNodes: options.ownsNodes !== false,
        disposers: copyInitialValues(options.disposers),
        asyncWork: copyInitialValues(options.asyncWork),
        diagnostics: {
            label: options.diagnostics?.label,
            source: options.diagnostics?.source,
            createdAtGeneration: options.root.generation,
            ...(linked ? { linkedAtGeneration: options.root.generation } : {}),
            duplicateLinkAttempts: 0,
            lateCallbacks: 0,
        },
        linked,
        disposed: false,
        dispose: disposeCompiledFragmentRecordSelf,
    };
    return registerCompiledFragmentRecord(record);
}
function createSingleNodeCompiledFragmentRecord(options) {
    const id = getInitialFragmentId(options);
    const linked = options.linked === true;
    assertLinkedFragmentCanBeCreated(id, options.root, linked);
    const record = {
        id,
        rootId: options.root.id,
        root: options.root,
        parentScope: options.parentScope,
        nodes: [options.node],
        childScopes: copyInitialValues(options.childScopes),
        childFragments: copyInitialValues(options.childFragments),
        ownsNodes: options.ownsNodes !== false,
        disposers: copyInitialValues(options.disposers),
        asyncWork: copyInitialValues(options.asyncWork),
        diagnostics: {
            label: options.diagnostics?.label,
            source: options.diagnostics?.source,
            createdAtGeneration: options.root.generation,
            ...(linked ? { linkedAtGeneration: options.root.generation } : {}),
            duplicateLinkAttempts: 0,
            lateCallbacks: 0,
        },
        linked,
        disposed: false,
        dispose: disposeCompiledFragmentRecordSelf,
    };
    return registerCompiledFragmentRecord(record);
}
function registerCompiledFragmentNode(record, node) {
    compiledFragmentsByNode.set(node, record);
}
function registerCompiledFragmentNodes(record, nodes) {
    for (const node of nodes) {
        registerCompiledFragmentNode(record, node);
    }
}
function getCompiledFragmentRecord(node) {
    return compiledFragmentsByNode.get(node);
}
function getCompiledFragmentRecordFromNodes(nodes) {
    return getCompiledFragmentRecordsFromNodes(nodes)[0];
}
function getCompiledFragmentRecordsFromNodes(nodes) {
    const records = [];
    const seen = new Set();
    for (const node of snapshotCompiledFragmentNodes(nodes)) {
        const record = getCompiledFragmentRecord(node);
        if (record && !seen.has(record)) {
            seen.add(record);
            records.push(record);
        }
    }
    return records;
}
function snapshotCompiledFragmentNodes(nodes) {
    if (!nodes)
        return [];
    if (nodes instanceof Node) {
        if (nodes.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            return Array.from(nodes.childNodes);
        }
        return [nodes];
    }
    const snapshot = new Array(nodes.length);
    for (let index = 0; index < nodes.length; index++) {
        snapshot[index] = nodes[index];
    }
    return snapshot;
}
function findCompiledFragmentRecord(node) {
    let current = node;
    while (current) {
        const record = getCompiledFragmentRecord(current);
        if (record)
            return record;
        current = current.parentNode;
    }
    return undefined;
}
function addCompiledFragmentChild(parent, child) {
    if (parent === child)
        return;
    if (parent.disposed) {
        throw new Error(`Cannot register a child on disposed compiled fragment '${parent.id}'.`);
    }
    if (child.disposed) {
        throw new Error(`Cannot register disposed compiled fragment '${child.id}' as a child.`);
    }
    if (parent.rootId !== child.rootId) {
        throw new Error("Compiled fragment parents and children must share a root.");
    }
    const currentParent = compiledFragmentParents.get(child);
    if (currentParent === parent)
        return;
    if (currentParent) {
        throw new Error(`Compiled fragment '${child.id}' already belongs to '${currentParent.id}'.`);
    }
    ensureFragmentArray(parent, "childFragments").push(child);
    compiledFragmentParents.set(child, parent);
    disposeCompiledFragmentScopeLifecycle(child);
}
function addCompiledFragmentDisposer(record, disposer) {
    if (record.disposed) {
        throw new Error(`Cannot register disposal work on disposed compiled fragment '${record.id}'.`);
    }
    ensureFragmentArray(record, "disposers").push(disposer);
}
function addCompiledFragmentAsyncWork(record, work) {
    if (record.disposed) {
        throw new Error(`Cannot register async work on disposed compiled fragment '${record.id}'.`);
    }
    ensureFragmentArray(record, "asyncWork").push(work);
}
function removeCompiledFragmentAsyncWork(record, work) {
    if (record.disposed) {
        return;
    }
    const asyncWork = getFragmentArray(record, "asyncWork");
    const index = asyncWork?.indexOf(work) ?? -1;
    if (index >= 0) {
        asyncWork?.splice(index, 1);
    }
}
function scheduleCompiledFragmentDomWork(record, operation) {
    const root = record.root;
    if (record.disposed || !root || root.destroyed) {
        record.diagnostics.lateCallbacks++;
        return false;
    }
    const retentionState = fragmentRetentionDomStates.get(record);
    if (retentionState?.paused) {
        retentionState.pending.push(operation);
        return true;
    }
    root.scheduler.schedule(() => {
        const currentRetentionState = fragmentRetentionDomStates.get(record);
        if (currentRetentionState?.paused) {
            currentRetentionState.pending.splice(currentRetentionState.deferredPrefixCount++, 0, operation);
            return;
        }
        if (shouldRunCompiledFragmentCallback(record)) {
            operation();
        }
    });
    return true;
}
function replaceCompiledFragmentNodes(target, nextFragment) {
    if (nextFragment.disposed) {
        throw new Error(`Cannot replace DOM with disposed compiled fragment '${nextFragment.id}'.`);
    }
    const oldFragments = collectOwnedChildFragments(target, nextFragment);
    target.replaceChildren(...nextFragment.nodes);
    ensureCompiledFragmentReplacementNodesRegistered(nextFragment);
    for (const fragment of oldFragments) {
        fragment.dispose();
    }
}
function markCompiledFragmentLinked(record) {
    const root = record.root;
    if (record.disposed) {
        throw new Error(`Cannot link disposed compiled fragment '${record.id}'.`);
    }
    if (!root || root.destroyed) {
        throw new Error(`Cannot link compiled fragment '${record.id}' after its root is destroyed.`);
    }
    if (record.linked) {
        record.diagnostics.duplicateLinkAttempts++;
        throw new Error(`Cannot link compiled fragment '${record.id}' more than once.`);
    }
    record.linked = true;
    record.diagnostics.linkedAtGeneration = root.generation;
}
function shouldRunCompiledFragmentCallback(record) {
    const root = record.root;
    if (record.disposed || !root || root.destroyed) {
        record.diagnostics.lateCallbacks++;
        return false;
    }
    return true;
}
function disposeCompiledFragmentRecord(record, releaseOwnedNodes = true) {
    if (record.disposed) {
        return;
    }
    const root = record.root;
    const errors = [];
    record.disposed = true;
    record.diagnostics.disposedAtGeneration = root?.generation;
    detachCompiledFragmentParent(record);
    unregisterRootCompiledFragment(record, root);
    disposeCompiledFragmentScopeLifecycle(record);
    disposeCompiledFragmentRetentionDomAdapter(record);
    disposeCompiledFragmentChildren(record, errors, releaseOwnedNodes);
    disposeReverse(getFragmentArray(record, "asyncWork"), (work) => {
        work.cancel();
    }, errors);
    disposeReverse(getFragmentArray(record, "disposers"), (disposer) => {
        disposer();
    }, errors);
    disposeReverse(getFragmentArray(record, "childScopes"), (scope) => {
        scope.$destroy();
    }, errors);
    for (const node of record.nodes) {
        if (compiledFragmentsByNode.get(node) === record) {
            compiledFragmentsByNode.delete(node);
        }
        if (record.ownsNodes && releaseOwnedNodes) {
            releaseCompiledFragmentNode(node);
        }
    }
    record.nodes.length = 0;
    clearFragmentArray(record, "childScopes");
    clearFragmentArray(record, "childFragments");
    clearFragmentArray(record, "disposers");
    clearFragmentArray(record, "asyncWork");
    record.parentScope = null;
    record.root = null;
    if (errors.length === 1) {
        throw errors[0];
    }
    if (errors.length > 1) {
        throw new AggregateError(errors, `Compiled fragment '${record.id}' disposal failed.`);
    }
}
function detachCompiledFragmentParent(record) {
    const parent = compiledFragmentParents.get(record);
    if (!parent)
        return;
    compiledFragmentParents.delete(record);
    if (parent.disposed)
        return;
    const children = getFragmentArray(parent, "childFragments");
    const index = children?.indexOf(record) ?? -1;
    if (index >= 0) {
        children?.splice(index, 1);
    }
}
function disposeCompiledFragmentChildren(record, errors, releaseOwnedNodes) {
    const children = getFragmentArray(record, "childFragments");
    if (!children)
        return;
    disposeReverse(children, (fragment) => {
        compiledFragmentParents.delete(fragment);
        disposeCompiledFragmentRecord(fragment, releaseOwnedNodes);
    }, errors);
}
function releaseCompiledFragmentNode(node) {
    if (node instanceof Element) {
        dealoc(node);
    }
    else {
        removeElementData(node);
    }
    node.parentNode?.removeChild(node);
}
function disposeReverse(values, dispose, errors) {
    if (!values) {
        return;
    }
    for (let i = values.length - 1; i >= 0; i--) {
        try {
            dispose(values[i]);
        }
        catch (error) {
            errors.push(error);
        }
    }
}
function collectOwnedChildFragments(target, nextFragment) {
    const fragments = [];
    const seen = new Set();
    const children = Array.from(target.childNodes);
    for (const child of children) {
        const fragment = getCompiledFragmentRecord(child);
        if (fragment &&
            fragment !== nextFragment &&
            !fragment.disposed &&
            !seen.has(fragment)) {
            seen.add(fragment);
            fragments.push(fragment);
        }
    }
    return fragments;
}
function ensureCompiledFragmentReplacementNodesRegistered(nextFragment) {
    for (const node of nextFragment.nodes) {
        if (compiledFragmentsByNode.get(node) !== nextFragment) {
            registerCompiledFragmentNode(nextFragment, node);
        }
    }
}
function getInitialNodes(options) {
    if (options.node) {
        return [options.node];
    }
    return copyInitialValues(options.nodes);
}
function copyInitialValues(values) {
    return values ? Array.from(values) : [];
}
function getFragmentArray(record, key) {
    return record[key];
}
function ensureFragmentArray(record, key) {
    let values = getFragmentArray(record, key);
    if (!values) {
        values = [];
        record[key] = values;
    }
    return values;
}
function clearFragmentArray(record, key) {
    getFragmentArray(record, key)?.splice(0);
}
function getInitialFragmentId(options) {
    return options.id ?? `fragment:${String(nextFragmentId++)}`;
}
function assertLinkedFragmentCanBeCreated(id, root, linked) {
    if (!root.destroyed)
        return;
    if (linked) {
        throw new Error(`Cannot link compiled fragment '${id}' after its root is destroyed.`);
    }
    throw new Error(`Cannot create compiled fragment '${id}' after its root is destroyed.`);
}
function createPublicLinkDiagnostics(root) {
    return {
        label: "$compile",
        source: "publicLinkFn",
        createdAtGeneration: root.generation,
        linkedAtGeneration: root.generation,
        duplicateLinkAttempts: 0,
        lateCallbacks: 0,
    };
}
function registerCompiledFragmentRecord(record, retentionAware = true) {
    const root = assertDefined(record.root);
    if (record.parentScope === root.rootScope) {
        registerRootCompiledFragment(record);
    }
    else {
        registerCompiledFragmentScopeLifecycle(record);
    }
    return retentionAware
        ? registerCompiledFragmentRetentionDomAdapter(record)
        : record;
}
function registerCompiledFragmentScopeLifecycle(record) {
    const parentScope = record.parentScope;
    const root = record.root;
    if (!parentScope || !root || parentScope === root.rootScope)
        return;
    const deregister = parentScope.$on("$destroy", () => {
        compiledFragmentScopeDestroyDeregisters.delete(record);
        disposeCompiledFragmentRecord(record, false);
    });
    compiledFragmentScopeDestroyDeregisters.set(record, deregister);
}
function disposeCompiledFragmentScopeLifecycle(record) {
    const deregister = compiledFragmentScopeDestroyDeregisters.get(record);
    if (!deregister)
        return;
    compiledFragmentScopeDestroyDeregisters.delete(record);
    deregister();
}
function registerRootCompiledFragment(record) {
    const root = assertDefined(record.root);
    let state = compiledFragmentStatesByRoot.get(root);
    if (!state) {
        const nextState = {
            records: new Set(),
            destroying: false,
            deregisterDestroy: root.rootScope.$on("$destroy", () => {
                disposeRootCompiledFragments(root, nextState);
            }),
        };
        compiledFragmentStatesByRoot.set(root, nextState);
        state = nextState;
    }
    state.records.add(record);
}
function unregisterRootCompiledFragment(record, root) {
    if (!root)
        return;
    const state = compiledFragmentStatesByRoot.get(root);
    if (!state)
        return;
    state.records.delete(record);
    if (!state.destroying && state.records.size === 0) {
        state.deregisterDestroy();
        compiledFragmentStatesByRoot.delete(root);
    }
}
function disposeRootCompiledFragments(root, state) {
    state.destroying = true;
    const errors = [];
    disposeReverse(Array.from(state.records), (record) => {
        disposeCompiledFragmentRecord(record, false);
    }, errors);
    state.records.clear();
    state.deregisterDestroy();
    compiledFragmentStatesByRoot.delete(root);
    if (errors.length === 1) {
        throw errors[0];
    }
    if (errors.length > 1) {
        throw new AggregateError(errors, `Compiled fragment cleanup failed while destroying root '${root.id}'.`);
    }
}
function registerCompiledFragmentRetentionDomAdapter(record) {
    const parentScope = record.parentScope;
    if (!parentScope) {
        return record;
    }
    const state = {
        paused: false,
        pending: [],
        deferredPrefixCount: 0,
        deregisterPause: parentScope.$on("$viewRetentionPause", (...args) => {
            if (!shouldHandleViewRetentionPause(args, "schedulers")) {
                return;
            }
            state.paused = true;
            state.deferredPrefixCount = 0;
        }),
        deregisterResume: parentScope.$on("$viewRetentionResume", (...args) => {
            if (!shouldHandleViewRetentionPause(args, "schedulers")) {
                return;
            }
            if (!state.paused)
                return;
            state.paused = false;
            state.deferredPrefixCount = 0;
            flushPausedCompiledFragmentDomWork(record, state);
        }),
    };
    fragmentRetentionDomStates.set(record, state);
    return record;
}
function disposeCompiledFragmentRetentionDomAdapter(record) {
    const state = fragmentRetentionDomStates.get(record);
    if (!state)
        return;
    record.diagnostics.lateCallbacks += state.pending.length;
    state.pending.length = 0;
    state.deferredPrefixCount = 0;
    state.deregisterPause();
    state.deregisterResume();
    fragmentRetentionDomStates.delete(record);
}
function flushPausedCompiledFragmentDomWork(record, state) {
    const root = record.root;
    const pending = state.pending.splice(0);
    if (!pending.length)
        return;
    if (record.disposed || !root || root.destroyed) {
        record.diagnostics.lateCallbacks += pending.length;
        return;
    }
    root.scheduler.schedule(() => {
        if (state.paused) {
            state.pending.splice(state.deferredPrefixCount, 0, ...pending);
            state.deferredPrefixCount += pending.length;
            return;
        }
        for (let i = 0, l = pending.length; i < l; i++) {
            if (shouldRunCompiledFragmentCallback(record)) {
                pending[i]();
            }
        }
    });
}
function disposeCompiledFragmentRecordSelf() {
    disposeCompiledFragmentRecord(this);
}

export { addCompiledFragmentAsyncWork, addCompiledFragmentChild, addCompiledFragmentDisposer, createCompiledFragmentRecord, createPublicLinkCompiledFragmentRecord, createPublicLinkSingleNodeCompiledFragmentRecord, createSingleNodeCompiledFragmentRecord, disposeCompiledFragmentRecord, findCompiledFragmentRecord, getCompiledFragmentRecord, getCompiledFragmentRecordFromNodes, getCompiledFragmentRecordsFromNodes, markCompiledFragmentLinked, registerCompiledFragmentNode, registerCompiledFragmentNodes, removeCompiledFragmentAsyncWork, replaceCompiledFragmentNodes, scheduleCompiledFragmentDomWork, shouldRunCompiledFragmentCallback, snapshotCompiledFragmentNodes };
