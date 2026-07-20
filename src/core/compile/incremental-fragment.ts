import type { AppRootRecord } from "../app-context/app-context.ts";
import { dealoc, removeElementData } from "../../shared/dom.ts";
import {
  assertDefined,
  shouldHandleViewRetentionPause,
} from "../../shared/utils.ts";

export type CompiledFragmentDisposer = () => void;

export interface CompiledFragmentAsyncWork {
  readonly id: string;
  readonly source: string;
  cancel(): void;
}

export interface CompiledFragmentDiagnostics {
  label?: string;
  source?: string;
  createdAtGeneration: number;
  linkedAtGeneration?: number;
  disposedAtGeneration?: number;
  duplicateLinkAttempts: number;
  lateCallbacks: number;
}

export interface CompiledFragmentRecord {
  readonly id: string;
  readonly rootId: string;
  root: AppRootRecord | null;
  parentScope: ng.Scope | null;
  readonly nodes: Node[];
  readonly childScopes: ng.Scope[];
  readonly childFragments: CompiledFragmentRecord[];
  /** @internal */
  readonly ownsNodes: boolean;
  readonly disposers: CompiledFragmentDisposer[];
  readonly asyncWork: CompiledFragmentAsyncWork[];
  readonly diagnostics: CompiledFragmentDiagnostics;
  linked: boolean;
  disposed: boolean;
  dispose(): void;
}

export interface CompiledFragmentRecordOptions {
  id?: string;
  root: AppRootRecord;
  parentScope: ng.Scope;
  linked?: boolean;
  ownsNodes?: boolean;
  node?: Node;
  nodes?: Iterable<Node>;
  childScopes?: Iterable<ng.Scope>;
  childFragments?: Iterable<CompiledFragmentRecord>;
  disposers?: Iterable<CompiledFragmentDisposer>;
  asyncWork?: Iterable<CompiledFragmentAsyncWork>;
  diagnostics?: Partial<Pick<CompiledFragmentDiagnostics, "label" | "source">>;
}

type FragmentArrayKey =
  | "childScopes"
  | "childFragments"
  | "disposers"
  | "asyncWork";

type MutableCompiledFragmentRecord = {
  -readonly [Key in keyof CompiledFragmentRecord]: CompiledFragmentRecord[Key];
};

type CompactPublicLinkCompiledFragmentRecord = Omit<
  CompiledFragmentRecord,
  FragmentArrayKey
> &
  Partial<Pick<CompiledFragmentRecord, FragmentArrayKey>>;

interface FragmentRetentionDomState {
  paused: boolean;
  pending: Array<() => void>;
  deferredPrefixCount: number;
  deregisterPause: () => void;
  deregisterResume: () => void;
}

interface RootCompiledFragmentState {
  records: Set<CompiledFragmentRecord>;
  destroying: boolean;
  deregisterDestroy: () => void;
}

let nextFragmentId = 1;

const compiledFragmentsByNode = new WeakMap<Node, CompiledFragmentRecord>();

const compiledFragmentParents = new WeakMap<
  CompiledFragmentRecord,
  CompiledFragmentRecord
>();

const fragmentRetentionDomStates = new WeakMap<
  CompiledFragmentRecord,
  FragmentRetentionDomState
>();

const compiledFragmentStatesByRoot = new WeakMap<
  AppRootRecord,
  RootCompiledFragmentState
>();

const compiledFragmentScopeDestroyDeregisters = new WeakMap<
  CompiledFragmentRecord,
  () => void
>();

export function createPublicLinkCompiledFragmentRecord(
  root: AppRootRecord,
  parentScope: ng.Scope,
  nodes: Iterable<Node>,
  ownsNodes = true,
): CompiledFragmentRecord {
  const id = getInitialFragmentId({});

  assertLinkedFragmentCanBeCreated(id, root, true);

  const record: CompactPublicLinkCompiledFragmentRecord = {
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

  return registerCompiledFragmentRecord(
    record as CompiledFragmentRecord,
    false,
  );
}

export function createPublicLinkSingleNodeCompiledFragmentRecord(
  root: AppRootRecord,
  parentScope: ng.Scope,
  node: Node,
  ownsNodes = true,
): CompiledFragmentRecord {
  const id = getInitialFragmentId({});

  assertLinkedFragmentCanBeCreated(id, root, true);

  const record: CompactPublicLinkCompiledFragmentRecord = {
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

  return registerCompiledFragmentRecord(
    record as CompiledFragmentRecord,
    false,
  );
}

export function createCompiledFragmentRecord(
  options: CompiledFragmentRecordOptions,
): CompiledFragmentRecord {
  const id = getInitialFragmentId(options);
  const linked = options.linked === true;

  assertLinkedFragmentCanBeCreated(id, options.root, linked);

  const record: CompiledFragmentRecord = {
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

export function createSingleNodeCompiledFragmentRecord(
  options: Omit<CompiledFragmentRecordOptions, "node" | "nodes"> & {
    node: Node;
  },
): CompiledFragmentRecord {
  const id = getInitialFragmentId(options);
  const linked = options.linked === true;

  assertLinkedFragmentCanBeCreated(id, options.root, linked);

  const record: CompiledFragmentRecord = {
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

export function registerCompiledFragmentNode(
  record: CompiledFragmentRecord,
  node: Node,
): void {
  compiledFragmentsByNode.set(node, record);
}

export function registerCompiledFragmentNodes(
  record: CompiledFragmentRecord,
  nodes: Iterable<Node>,
): void {
  for (const node of nodes) {
    registerCompiledFragmentNode(record, node);
  }
}

export function getCompiledFragmentRecord(
  node: Node,
): CompiledFragmentRecord | undefined {
  return compiledFragmentsByNode.get(node);
}

export function getCompiledFragmentRecordFromNodes(
  nodes: Node | ArrayLike<Node> | null | undefined,
): CompiledFragmentRecord | undefined {
  return getCompiledFragmentRecordsFromNodes(nodes)[0];
}

export function getCompiledFragmentRecordsFromNodes(
  nodes: Node | ArrayLike<Node> | null | undefined,
): CompiledFragmentRecord[] {
  const records: CompiledFragmentRecord[] = [];
  const seen = new Set<CompiledFragmentRecord>();

  for (const node of snapshotCompiledFragmentNodes(nodes)) {
    const record = getCompiledFragmentRecord(node);

    if (record && !seen.has(record)) {
      seen.add(record);
      records.push(record);
    }
  }

  return records;
}

export function snapshotCompiledFragmentNodes(
  nodes: Node | ArrayLike<Node> | null | undefined,
): Node[] {
  if (!nodes) return [];

  if (nodes instanceof Node) {
    if (nodes.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      return Array.from(nodes.childNodes);
    }

    return [nodes];
  }

  const snapshot = new Array<Node>(nodes.length);

  for (let index = 0; index < nodes.length; index++) {
    snapshot[index] = nodes[index];
  }

  return snapshot;
}

export function findCompiledFragmentRecord(
  node: Node | null | undefined,
): CompiledFragmentRecord | undefined {
  let current = node;

  while (current) {
    const record = getCompiledFragmentRecord(current);

    if (record) return record;

    current = current.parentNode;
  }

  return undefined;
}

export function addCompiledFragmentChild(
  parent: CompiledFragmentRecord,
  child: CompiledFragmentRecord,
): void {
  if (parent === child) return;

  if (parent.disposed) {
    throw new Error(
      `Cannot register a child on disposed compiled fragment '${parent.id}'.`,
    );
  }

  if (child.disposed) {
    throw new Error(
      `Cannot register disposed compiled fragment '${child.id}' as a child.`,
    );
  }

  if (parent.rootId !== child.rootId) {
    throw new Error(
      "Compiled fragment parents and children must share a root.",
    );
  }

  const currentParent = compiledFragmentParents.get(child);

  if (currentParent === parent) return;

  if (currentParent) {
    throw new Error(
      `Compiled fragment '${child.id}' already belongs to '${currentParent.id}'.`,
    );
  }

  ensureFragmentArray(parent, "childFragments").push(child);
  compiledFragmentParents.set(child, parent);
  disposeCompiledFragmentScopeLifecycle(child);
}

export function addCompiledFragmentDisposer(
  record: CompiledFragmentRecord,
  disposer: CompiledFragmentDisposer,
): void {
  if (record.disposed) {
    throw new Error(
      `Cannot register disposal work on disposed compiled fragment '${record.id}'.`,
    );
  }

  ensureFragmentArray(record, "disposers").push(disposer);
}

export function addCompiledFragmentAsyncWork(
  record: CompiledFragmentRecord,
  work: CompiledFragmentAsyncWork,
): void {
  if (record.disposed) {
    throw new Error(
      `Cannot register async work on disposed compiled fragment '${record.id}'.`,
    );
  }

  ensureFragmentArray(record, "asyncWork").push(work);
}

export function removeCompiledFragmentAsyncWork(
  record: CompiledFragmentRecord,
  work: CompiledFragmentAsyncWork,
): void {
  if (record.disposed) {
    return;
  }

  const asyncWork = getFragmentArray(record, "asyncWork");
  const index = asyncWork?.indexOf(work) ?? -1;

  if (index >= 0) {
    asyncWork?.splice(index, 1);
  }
}

export function scheduleCompiledFragmentDomWork(
  record: CompiledFragmentRecord,
  operation: () => void,
): boolean {
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
      currentRetentionState.pending.splice(
        currentRetentionState.deferredPrefixCount++,
        0,
        operation,
      );

      return;
    }

    if (shouldRunCompiledFragmentCallback(record)) {
      operation();
    }
  });

  return true;
}

export function replaceCompiledFragmentNodes(
  target: Element,
  nextFragment: CompiledFragmentRecord,
): void {
  if (nextFragment.disposed) {
    throw new Error(
      `Cannot replace DOM with disposed compiled fragment '${nextFragment.id}'.`,
    );
  }

  const oldFragments = collectOwnedChildFragments(target, nextFragment);

  target.replaceChildren(...nextFragment.nodes);
  ensureCompiledFragmentReplacementNodesRegistered(nextFragment);

  for (const fragment of oldFragments) {
    fragment.dispose();
  }
}

export function markCompiledFragmentLinked(
  record: CompiledFragmentRecord,
): void {
  const root = record.root;

  if (record.disposed) {
    throw new Error(`Cannot link disposed compiled fragment '${record.id}'.`);
  }

  if (!root || root.destroyed) {
    throw new Error(
      `Cannot link compiled fragment '${record.id}' after its root is destroyed.`,
    );
  }

  if (record.linked) {
    record.diagnostics.duplicateLinkAttempts++;

    throw new Error(
      `Cannot link compiled fragment '${record.id}' more than once.`,
    );
  }

  record.linked = true;
  record.diagnostics.linkedAtGeneration = root.generation;
}

export function shouldRunCompiledFragmentCallback(
  record: CompiledFragmentRecord,
): boolean {
  const root = record.root;

  if (record.disposed || !root || root.destroyed) {
    record.diagnostics.lateCallbacks++;

    return false;
  }

  return true;
}

export function disposeCompiledFragmentRecord(
  record: CompiledFragmentRecord,
  releaseOwnedNodes = true,
): void {
  if (record.disposed) {
    return;
  }

  const root = record.root;
  const errors: unknown[] = [];

  record.disposed = true;
  record.diagnostics.disposedAtGeneration = root?.generation;
  detachCompiledFragmentParent(record);
  unregisterRootCompiledFragment(record, root);
  disposeCompiledFragmentScopeLifecycle(record);
  disposeCompiledFragmentRetentionDomAdapter(record);

  disposeCompiledFragmentChildren(record, errors, releaseOwnedNodes);
  disposeReverse(
    getFragmentArray(record, "asyncWork"),
    (work) => {
      work.cancel();
    },
    errors,
  );
  disposeReverse(
    getFragmentArray(record, "disposers"),
    (disposer) => {
      disposer();
    },
    errors,
  );
  disposeReverse(
    getFragmentArray(record, "childScopes"),
    (scope) => {
      scope.$destroy();
    },
    errors,
  );

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
    throw new AggregateError(
      errors,
      `Compiled fragment '${record.id}' disposal failed.`,
    );
  }
}

function detachCompiledFragmentParent(record: CompiledFragmentRecord): void {
  const parent = compiledFragmentParents.get(record);

  if (!parent) return;

  compiledFragmentParents.delete(record);

  if (parent.disposed) return;

  const children = getFragmentArray(parent, "childFragments");
  const index = children?.indexOf(record) ?? -1;

  if (index >= 0) {
    children?.splice(index, 1);
  }
}

function disposeCompiledFragmentChildren(
  record: CompiledFragmentRecord,
  errors: unknown[],
  releaseOwnedNodes: boolean,
): void {
  const children = getFragmentArray(record, "childFragments");

  if (!children) return;

  disposeReverse(
    children,
    (fragment) => {
      compiledFragmentParents.delete(fragment);
      disposeCompiledFragmentRecord(fragment, releaseOwnedNodes);
    },
    errors,
  );
}

function releaseCompiledFragmentNode(node: Node): void {
  if (node instanceof Element) {
    dealoc(node);
  } else {
    removeElementData(node);
  }

  node.parentNode?.removeChild(node);
}

function disposeReverse<T>(
  values: readonly T[] | undefined,
  dispose: (value: T) => void,
  errors: unknown[],
): void {
  if (!values) {
    return;
  }

  for (let i = values.length - 1; i >= 0; i--) {
    try {
      dispose(values[i]);
    } catch (error) {
      errors.push(error);
    }
  }
}

function collectOwnedChildFragments(
  target: Element,
  nextFragment: CompiledFragmentRecord,
): CompiledFragmentRecord[] {
  const fragments: CompiledFragmentRecord[] = [];
  const seen = new Set<CompiledFragmentRecord>();
  const children = Array.from(target.childNodes);

  for (const child of children) {
    const fragment = getCompiledFragmentRecord(child);

    if (
      fragment &&
      fragment !== nextFragment &&
      !fragment.disposed &&
      !seen.has(fragment)
    ) {
      seen.add(fragment);
      fragments.push(fragment);
    }
  }

  return fragments;
}

function ensureCompiledFragmentReplacementNodesRegistered(
  nextFragment: CompiledFragmentRecord,
): void {
  for (const node of nextFragment.nodes) {
    if (compiledFragmentsByNode.get(node) !== nextFragment) {
      registerCompiledFragmentNode(nextFragment, node);
    }
  }
}

function getInitialNodes(options: CompiledFragmentRecordOptions): Node[] {
  if (options.node) {
    return [options.node];
  }

  return copyInitialValues(options.nodes);
}

function copyInitialValues<T>(values: Iterable<T> | undefined): T[] {
  return values ? Array.from(values) : [];
}

function getFragmentArray<Key extends FragmentArrayKey>(
  record: CompiledFragmentRecord,
  key: Key,
): CompiledFragmentRecord[Key] | undefined {
  return (record as Partial<CompiledFragmentRecord>)[key] as
    | CompiledFragmentRecord[Key]
    | undefined;
}

function ensureFragmentArray<Key extends FragmentArrayKey>(
  record: CompiledFragmentRecord,
  key: Key,
): CompiledFragmentRecord[Key] {
  let values = getFragmentArray(record, key);

  if (!values) {
    values = [] as unknown as CompiledFragmentRecord[Key];
    (record as MutableCompiledFragmentRecord)[key] = values;
  }

  return values;
}

function clearFragmentArray(
  record: CompiledFragmentRecord,
  key: FragmentArrayKey,
): void {
  getFragmentArray(record, key)?.splice(0);
}

function getInitialFragmentId(
  options: Pick<CompiledFragmentRecordOptions, "id">,
): string {
  return options.id ?? `fragment:${String(nextFragmentId++)}`;
}

function assertLinkedFragmentCanBeCreated(
  id: string,
  root: AppRootRecord,
  linked: boolean,
): void {
  if (!root.destroyed) return;

  if (linked) {
    throw new Error(
      `Cannot link compiled fragment '${id}' after its root is destroyed.`,
    );
  }

  throw new Error(
    `Cannot create compiled fragment '${id}' after its root is destroyed.`,
  );
}

function createPublicLinkDiagnostics(
  root: AppRootRecord,
): CompiledFragmentDiagnostics {
  return {
    label: "$compile",
    source: "publicLinkFn",
    createdAtGeneration: root.generation,
    linkedAtGeneration: root.generation,
    duplicateLinkAttempts: 0,
    lateCallbacks: 0,
  };
}

function registerCompiledFragmentRecord(
  record: CompiledFragmentRecord,
  retentionAware = true,
): CompiledFragmentRecord {
  const root = assertDefined(record.root);

  if (record.parentScope === root.rootScope) {
    registerRootCompiledFragment(record);
  } else {
    registerCompiledFragmentScopeLifecycle(record);
  }

  return retentionAware
    ? registerCompiledFragmentRetentionDomAdapter(record)
    : record;
}

function registerCompiledFragmentScopeLifecycle(
  record: CompiledFragmentRecord,
): void {
  const parentScope = record.parentScope;
  const root = record.root;

  if (!parentScope || !root || parentScope === root.rootScope) return;

  const deregister = parentScope.$on("$destroy", () => {
    compiledFragmentScopeDestroyDeregisters.delete(record);
    disposeCompiledFragmentRecord(record, false);
  });

  compiledFragmentScopeDestroyDeregisters.set(record, deregister);
}

function disposeCompiledFragmentScopeLifecycle(
  record: CompiledFragmentRecord,
): void {
  const deregister = compiledFragmentScopeDestroyDeregisters.get(record);

  if (!deregister) return;

  compiledFragmentScopeDestroyDeregisters.delete(record);
  deregister();
}

function registerRootCompiledFragment(record: CompiledFragmentRecord): void {
  const root = assertDefined(record.root);

  let state = compiledFragmentStatesByRoot.get(root);

  if (!state) {
    const nextState: RootCompiledFragmentState = {
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

function unregisterRootCompiledFragment(
  record: CompiledFragmentRecord,
  root: AppRootRecord | null,
): void {
  if (!root) return;

  const state = compiledFragmentStatesByRoot.get(root);

  if (!state) return;

  state.records.delete(record);

  if (!state.destroying && state.records.size === 0) {
    state.deregisterDestroy();
    compiledFragmentStatesByRoot.delete(root);
  }
}

function disposeRootCompiledFragments(
  root: AppRootRecord,
  state: RootCompiledFragmentState,
): void {
  state.destroying = true;
  const errors: unknown[] = [];

  disposeReverse(
    Array.from(state.records),
    (record) => {
      disposeCompiledFragmentRecord(record, false);
    },
    errors,
  );

  state.records.clear();
  state.deregisterDestroy();
  compiledFragmentStatesByRoot.delete(root);

  if (errors.length === 1) {
    throw errors[0];
  }

  if (errors.length > 1) {
    throw new AggregateError(
      errors,
      `Compiled fragment cleanup failed while destroying root '${root.id}'.`,
    );
  }
}

function registerCompiledFragmentRetentionDomAdapter(
  record: CompiledFragmentRecord,
): CompiledFragmentRecord {
  const parentScope = record.parentScope;

  if (!parentScope) {
    return record;
  }

  const state: FragmentRetentionDomState = {
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

      if (!state.paused) return;

      state.paused = false;
      state.deferredPrefixCount = 0;
      flushPausedCompiledFragmentDomWork(record, state);
    }),
  };

  fragmentRetentionDomStates.set(record, state);

  return record;
}

function disposeCompiledFragmentRetentionDomAdapter(
  record: CompiledFragmentRecord,
): void {
  const state = fragmentRetentionDomStates.get(record);

  if (!state) return;

  record.diagnostics.lateCallbacks += state.pending.length;
  state.pending.length = 0;
  state.deferredPrefixCount = 0;
  state.deregisterPause();
  state.deregisterResume();
  fragmentRetentionDomStates.delete(record);
}

function flushPausedCompiledFragmentDomWork(
  record: CompiledFragmentRecord,
  state: FragmentRetentionDomState,
): void {
  const root = record.root;
  const pending = state.pending.splice(0);

  if (!pending.length) return;

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

function disposeCompiledFragmentRecordSelf(this: CompiledFragmentRecord): void {
  disposeCompiledFragmentRecord(this);
}
