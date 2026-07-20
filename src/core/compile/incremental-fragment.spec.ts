/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import type { AppRootRecord } from "../app-context/app-context.ts";
import { createInjector } from "../di/injector.ts";
import { AppContext } from "../app-context/app-context.ts";
import { createScope } from "../scope/scope.ts";
import type { CloneAttachFn, CompileFn } from "./compile.ts";
import {
  addCompiledFragmentChild,
  addCompiledFragmentAsyncWork,
  addCompiledFragmentDisposer,
  createCompiledFragmentRecord,
  createPublicLinkCompiledFragmentRecord,
  createPublicLinkSingleNodeCompiledFragmentRecord,
  createSingleNodeCompiledFragmentRecord,
  disposeCompiledFragmentRecord,
  findCompiledFragmentRecord,
  getCompiledFragmentRecord,
  getCompiledFragmentRecordFromNodes,
  getCompiledFragmentRecordsFromNodes,
  markCompiledFragmentLinked,
  registerCompiledFragmentNode,
  registerCompiledFragmentNodes,
  removeCompiledFragmentAsyncWork,
  replaceCompiledFragmentNodes,
  scheduleCompiledFragmentDomWork,
  shouldRunCompiledFragmentCallback,
  snapshotCompiledFragmentNodes,
  type CompiledFragmentAsyncWork,
} from "./incremental-fragment.ts";

function createRoot() {
  const context = new AppContext();
  const rootScope = createScope() as ng.Scope;
  const root = context.createRoot({ rootScope });

  return { context, root, rootScope };
}

describe("incremental compiled fragments", () => {
  it("creates root-owned fragment records without linking them", () => {
    const { root, rootScope } = createRoot();
    const node = document.createElement("section");
    const childScope = rootScope.$new();
    const record = createCompiledFragmentRecord({
      root,
      parentScope: rootScope,
      nodes: [node],
      childScopes: [childScope],
      diagnostics: { label: "route-view", source: "$compile" },
    });

    expect(record.id).toMatch(/^fragment:\d+$/);
    expect(record.rootId).toBe(root.id);
    expect(record.root).toBe(root);
    expect(record.parentScope).toBe(rootScope);
    expect(record.nodes).toEqual([node]);
    expect(record.childScopes).toEqual([childScope]);
    expect(record.linked).toBeFalse();
    expect(record.disposed).toBeFalse();
    expect(record.diagnostics).toEqual({
      label: "route-view",
      source: "$compile",
      createdAtGeneration: root.generation,
      duplicateLinkAttempts: 0,
      lateCallbacks: 0,
    });
  });

  it("creates single-node fragment records without iterable materialization", () => {
    const { root, rootScope } = createRoot();
    const node = document.createElement("main");
    const record = createSingleNodeCompiledFragmentRecord({
      root,
      parentScope: rootScope,
      node,
    });

    expect(record.nodes).toEqual([node]);
    expect(record.childScopes).toEqual([]);
    expect(record.childFragments).toEqual([]);
    expect(record.disposers).toEqual([]);
    expect(record.asyncWork).toEqual([]);
  });

  it("creates compact public-link records with explicit node ownership", () => {
    const { root, rootScope } = createRoot();
    const first = document.createElement("section");
    const second = document.createElement("article");
    const multiple = createPublicLinkCompiledFragmentRecord(
      root,
      rootScope,
      [first, second],
      false,
    );
    const single = createPublicLinkSingleNodeCompiledFragmentRecord(
      root,
      rootScope,
      document.createTextNode("single"),
      false,
    );
    const defaultSingle = createPublicLinkSingleNodeCompiledFragmentRecord(
      root,
      rootScope,
      document.createTextNode("default"),
    );

    expect(multiple.nodes).toEqual([first, second]);
    expect(multiple.ownsNodes).toBeFalse();
    expect(single.ownsNodes).toBeFalse();
    expect(defaultSingle.ownsNodes).toBeTrue();

    multiple.dispose();
    single.dispose();
    defaultSingle.dispose();
  });

  it("creates linked iterable records with a direct node option", () => {
    const { root, rootScope } = createRoot();
    const node = document.createElement("aside");
    const record = createCompiledFragmentRecord({
      root,
      parentScope: rootScope,
      node,
      linked: true,
    });

    expect(record.nodes).toEqual([node]);
    expect(record.diagnostics.linkedAtGeneration).toBe(root.generation);

    record.dispose();
  });

  it("can create already-linked records for public link hot paths", () => {
    const { root, rootScope } = createRoot();
    const node = document.createElement("article");
    const record = createSingleNodeCompiledFragmentRecord({
      id: "fragment:linked-on-create",
      root,
      parentScope: rootScope,
      linked: true,
      node,
    });

    expect(record.linked).toBeTrue();
    expect(record.diagnostics.linkedAtGeneration).toBe(root.generation);

    expect(() => {
      markCompiledFragmentLinked(record);
    }).toThrowError(
      "Cannot link compiled fragment 'fragment:linked-on-create' more than once.",
    );
    expect(record.diagnostics.duplicateLinkAttempts).toBe(1);
  });

  it("rejects already-linked records when the root is destroyed", () => {
    const { context, rootScope } = createRoot();
    const destroyedRoot = context.createRoot({
      rootScope: createScope() as ng.Scope,
    });

    context.destroyRoot(destroyedRoot);

    expect(() => {
      createCompiledFragmentRecord({
        id: "fragment:destroyed-linked-root",
        root: destroyedRoot,
        parentScope: rootScope,
        linked: true,
      });
    }).toThrowError(
      "Cannot link compiled fragment 'fragment:destroyed-linked-root' after its root is destroyed.",
    );
  });

  it("rejects unlinked records when the root is destroyed", () => {
    const { context, rootScope } = createRoot();
    const destroyedRoot = context.createRoot({
      rootScope: createScope() as ng.Scope,
    });

    context.destroyRoot(destroyedRoot);

    expect(() => {
      createCompiledFragmentRecord({
        id: "fragment:destroyed-root",
        root: destroyedRoot,
        parentScope: rootScope,
      });
    }).toThrowError(
      "Cannot create compiled fragment 'fragment:destroyed-root' after its root is destroyed.",
    );
  });

  it("marks a fragment as linked once", () => {
    const { root, rootScope } = createRoot();
    const record = createCompiledFragmentRecord({
      id: "fragment:test",
      root,
      parentScope: rootScope,
    });

    markCompiledFragmentLinked(record);

    expect(record.linked).toBeTrue();
    expect(record.diagnostics.linkedAtGeneration).toBe(root.generation);

    expect(() => {
      markCompiledFragmentLinked(record);
    }).toThrowError(
      "Cannot link compiled fragment 'fragment:test' more than once.",
    );
    expect(record.diagnostics.duplicateLinkAttempts).toBe(1);
  });

  it("rejects linking after disposal or root destruction", () => {
    const { context, root, rootScope } = createRoot();
    const disposed = createCompiledFragmentRecord({
      id: "fragment:disposed",
      root,
      parentScope: rootScope,
    });

    disposed.dispose();

    expect(() => {
      markCompiledFragmentLinked(disposed);
    }).toThrowError(
      "Cannot link disposed compiled fragment 'fragment:disposed'.",
    );

    const destroyedRoot = context.createRoot({
      rootScope: createScope() as ng.Scope,
    });
    const stale = createCompiledFragmentRecord({
      id: "fragment:stale-root",
      root: destroyedRoot,
      parentScope: destroyedRoot.rootScope,
    });

    context.destroyRoot(destroyedRoot);

    expect(() => {
      markCompiledFragmentLinked(stale);
    }).toThrowError(
      "Cannot link disposed compiled fragment 'fragment:stale-root'.",
    );
  });

  it("guards late callbacks after disposal or root destruction", () => {
    const { context, root, rootScope } = createRoot();
    const record = createCompiledFragmentRecord({
      root,
      parentScope: rootScope,
    });

    expect(shouldRunCompiledFragmentCallback(record)).toBeTrue();

    record.dispose();

    expect(shouldRunCompiledFragmentCallback(record)).toBeFalse();
    expect(record.diagnostics.lateCallbacks).toBe(1);

    const staleRoot = context.createRoot({
      rootScope: createScope() as ng.Scope,
    });
    const stale = createCompiledFragmentRecord({
      root: staleRoot,
      parentScope: staleRoot.rootScope,
    });

    context.destroyRoot(staleRoot);

    expect(shouldRunCompiledFragmentCallback(stale)).toBeFalse();
    expect(stale.diagnostics.lateCallbacks).toBe(1);
  });

  it("disposes child fragments, async work, disposers, and child scopes", () => {
    const { root, rootScope } = createRoot();
    const events: string[] = [];
    const childScope = rootScope.$new();
    const node = document.createElement("article");
    const childFragment = createCompiledFragmentRecord({
      id: "fragment:child",
      root,
      parentScope: rootScope,
      disposers: [
        () => {
          events.push("child-fragment");
        },
      ],
    });
    const asyncWork: CompiledFragmentAsyncWork = {
      id: "template",
      source: "templateUrl",
      cancel() {
        events.push("async");
      },
    };

    childScope.$on("$destroy", () => {
      events.push("scope");
    });

    const record = createCompiledFragmentRecord({
      id: "fragment:parent",
      root,
      parentScope: rootScope,
      nodes: [node],
      childScopes: [childScope],
      childFragments: [childFragment],
      asyncWork: [asyncWork],
      disposers: [
        () => {
          events.push("disposer");
        },
      ],
    });

    disposeCompiledFragmentRecord(record);

    expect(events).toEqual(["child-fragment", "async", "disposer", "scope"]);
    expect(record.disposed).toBeTrue();
    expect(record.root).toBeNull();
    expect(record.parentScope).toBeNull();
    expect(record.nodes).toEqual([]);
    expect(record.childScopes).toEqual([]);
    expect(record.childFragments).toEqual([]);
    expect(record.asyncWork).toEqual([]);
    expect(record.disposers).toEqual([]);
    expect(record.diagnostics.disposedAtGeneration).toBe(root.generation);
    expect(childFragment.disposed).toBeTrue();
  });

  it("owns nested fragments without retaining explicitly disposed children", () => {
    const { root, rootScope } = createRoot();
    const parent = createCompiledFragmentRecord({
      id: "fragment:nested-parent",
      root,
      parentScope: rootScope,
    });
    const firstChild = createCompiledFragmentRecord({
      id: "fragment:nested-first",
      root,
      parentScope: rootScope,
    });
    const secondChild = createCompiledFragmentRecord({
      id: "fragment:nested-second",
      root,
      parentScope: rootScope,
    });

    addCompiledFragmentChild(parent, firstChild);
    addCompiledFragmentChild(parent, secondChild);

    expect(parent.childFragments).toEqual([firstChild, secondChild]);

    firstChild.dispose();

    expect(parent.childFragments).toEqual([secondChild]);

    parent.dispose();

    expect(secondChild.disposed).toBeTrue();
    expect(parent.childFragments).toEqual([]);
  });

  it("validates nested fragment ownership", () => {
    const { context, root, rootScope } = createRoot();
    const otherRootScope = createScope() as ng.Scope;
    const otherRoot = context.createRoot({ rootScope: otherRootScope });
    const parent = createCompiledFragmentRecord({
      root,
      parentScope: rootScope,
    });
    const secondParent = createCompiledFragmentRecord({
      root,
      parentScope: rootScope,
    });
    const child = createCompiledFragmentRecord({
      root,
      parentScope: rootScope,
    });
    const crossRoot = createCompiledFragmentRecord({
      root: otherRoot,
      parentScope: otherRootScope,
    });

    addCompiledFragmentChild(parent, parent);
    addCompiledFragmentChild(parent, child);
    addCompiledFragmentChild(parent, child);

    expect(parent.childFragments).toEqual([child]);
    expect(() => addCompiledFragmentChild(secondParent, child)).toThrowError(
      `Compiled fragment '${child.id}' already belongs to '${parent.id}'.`,
    );
    expect(() => addCompiledFragmentChild(parent, crossRoot)).toThrowError(
      "Compiled fragment parents and children must share a root.",
    );

    const disposedChild = createCompiledFragmentRecord({
      root,
      parentScope: rootScope,
    });

    disposedChild.dispose();
    expect(() => addCompiledFragmentChild(parent, disposedChild)).toThrowError(
      `Cannot register disposed compiled fragment '${disposedChild.id}' as a child.`,
    );

    const disposedParent = createCompiledFragmentRecord({
      root,
      parentScope: rootScope,
    });

    disposedParent.dispose();
    expect(() => addCompiledFragmentChild(disposedParent, child)).toThrowError(
      `Cannot register a child on disposed compiled fragment '${disposedParent.id}'.`,
    );

    parent.dispose();
    secondParent.dispose();
    crossRoot.dispose();
  });

  it("handles detached parent bookkeeping", () => {
    const { root, rootScope } = createRoot();
    const parent = createCompiledFragmentRecord({
      root,
      parentScope: rootScope,
    });
    const child = createCompiledFragmentRecord({
      root,
      parentScope: rootScope,
    });

    addCompiledFragmentChild(parent, child);
    parent.disposed = true;
    child.dispose();
    parent.disposed = false;
    parent.dispose();

    const missingChildrenParent = createPublicLinkCompiledFragmentRecord(
      root,
      rootScope,
      [],
    );
    const detachedChild = createCompiledFragmentRecord({
      root,
      parentScope: rootScope,
    });

    addCompiledFragmentChild(missingChildrenParent, detachedChild);
    delete (missingChildrenParent as unknown as Record<string, unknown>)
      .childFragments;
    detachedChild.dispose();
    missingChildrenParent.dispose();

    expect(missingChildrenParent.disposed).toBeTrue();
  });

  it("finds fragment ownership through a linked node ancestor", () => {
    const { root, rootScope } = createRoot();
    const host = document.createElement("main");
    const child = document.createElement("span");
    const record = createCompiledFragmentRecord({
      root,
      parentScope: rootScope,
      nodes: [host],
    });

    host.appendChild(child);
    registerCompiledFragmentNode(record, host);

    expect(findCompiledFragmentRecord(child)).toBe(record);
  });

  it("finds fragment ownership inside transclusion node containers", () => {
    const { root, rootScope } = createRoot();
    const node = document.createElement("span");
    const fragment = document.createDocumentFragment();
    const record = createCompiledFragmentRecord({
      root,
      parentScope: rootScope,
      nodes: [node],
    });

    registerCompiledFragmentNode(record, node);
    fragment.appendChild(node);

    expect(getCompiledFragmentRecordFromNodes(fragment)).toBe(record);
    expect(getCompiledFragmentRecordFromNodes([node])).toBe(record);
  });

  it("snapshots nullable, direct, fragment, and array-like node inputs", () => {
    const { root, rootScope } = createRoot();
    const first = document.createElement("span");
    const second = document.createTextNode("second");
    const fragment = document.createDocumentFragment();
    const record = createCompiledFragmentRecord({
      root,
      parentScope: rootScope,
      nodes: [first, second],
    });

    fragment.append(first, second);
    registerCompiledFragmentNodes(record, [first, second]);

    expect(snapshotCompiledFragmentNodes(null)).toEqual([]);
    expect(snapshotCompiledFragmentNodes(first)).toEqual([first]);
    expect(snapshotCompiledFragmentNodes(fragment)).toEqual([first, second]);
    expect(getCompiledFragmentRecordsFromNodes(fragment)).toEqual([record]);

    record.dispose();
  });

  it("preserves borrowed nodes when their root is destroyed", () => {
    const { context, root, rootScope } = createRoot();
    const host = document.createElement("main");
    const record = createCompiledFragmentRecord({
      root,
      parentScope: rootScope,
      nodes: [host],
      ownsNodes: false,
    });

    registerCompiledFragmentNode(record, host);
    document.body.appendChild(host);

    context.destroyRoot(root);

    expect(record.disposed).toBeTrue();
    expect(host.parentNode).toBe(document.body);
    expect(getCompiledFragmentRecord(host)).toBeUndefined();

    host.remove();
  });

  it("disposes every live fragment without rewriting DOM on root destruction", () => {
    const { context, root, rootScope } = createRoot();
    const host = document.createElement("main");
    const firstNode = document.createElement("section");
    const secondNode = document.createElement("article");
    const events: string[] = [];
    const first = createCompiledFragmentRecord({
      root,
      parentScope: rootScope,
      nodes: [firstNode],
      asyncWork: [
        {
          id: "pending-template",
          source: "templateUrl",
          cancel() {
            events.push("cancel");
          },
        },
      ],
    });
    const second = createCompiledFragmentRecord({
      root,
      parentScope: rootScope,
      nodes: [secondNode],
      disposers: [
        () => {
          events.push("dispose");
        },
      ],
    });

    registerCompiledFragmentNode(first, firstNode);
    registerCompiledFragmentNode(second, secondNode);
    host.append(firstNode, secondNode);

    context.destroyRoot(root);

    expect(first.disposed).toBeTrue();
    expect(second.disposed).toBeTrue();
    expect(first.root).toBeNull();
    expect(second.root).toBeNull();
    expect(Array.from(host.childNodes)).toEqual([firstNode, secondNode]);
    expect(events).toEqual(["dispose", "cancel"]);
    expect(getCompiledFragmentRecord(firstNode)).toBeUndefined();
    expect(getCompiledFragmentRecord(secondNode)).toBeUndefined();
  });

  it("reports single and aggregate fragment failures during root cleanup", () => {
    const createFailingRoot = (messages: string[]) => {
      const { root, rootScope } = createRoot();
      const errors: unknown[] = [];

      rootScope.$handler._setRuntimeDependencies({
        exceptionHandler(exception) {
          errors.push(exception);

          return undefined as never;
        },
        parse: (() => undefined) as unknown as ng.ParseService,
      });

      for (const message of messages) {
        createCompiledFragmentRecord({
          root,
          parentScope: rootScope,
          disposers: [
            () => {
              throw new Error(message);
            },
          ],
        });
      }

      rootScope.$destroy();

      return errors;
    };

    const single = createFailingRoot(["single"]);
    const multiple = createFailingRoot(["first", "second"]);

    expect((single[0] as Error).message).toBe("single");
    expect(multiple[0]).toEqual(jasmine.any(AggregateError));
    expect((multiple[0] as AggregateError).errors.length).toBe(2);
  });

  it("removes owned nodes on explicit fragment disposal", () => {
    const { root, rootScope } = createRoot();
    const host = document.createElement("main");
    const node = document.createElement("section");
    const record = createCompiledFragmentRecord({
      root,
      parentScope: rootScope,
      nodes: [node],
    });

    registerCompiledFragmentNode(record, node);
    host.appendChild(node);

    record.dispose();

    expect(host.childNodes.length).toBe(0);
    expect(record.disposed).toBeTrue();
  });

  it("does not dispose an explicitly released fragment again at root teardown", () => {
    const { context, root, rootScope } = createRoot();
    let disposeCount = 0;
    const record = createCompiledFragmentRecord({
      root,
      parentScope: rootScope,
      disposers: [
        () => {
          disposeCount++;
        },
      ],
    });

    record.dispose();
    context.destroyRoot(root);

    expect(disposeCount).toBe(1);
  });

  it("runs remaining cleanup before surfacing disposal errors", () => {
    const { root, rootScope } = createRoot();
    const events: string[] = [];
    const childScope = rootScope.$new();

    childScope.$on("$destroy", () => {
      events.push("scope");
    });

    const record = createCompiledFragmentRecord({
      id: "fragment:cleanup-error",
      root,
      parentScope: rootScope,
      childScopes: [childScope],
      disposers: [
        () => {
          events.push("first");
        },
        () => {
          events.push("throwing");
          throw new Error("cleanup failed");
        },
      ],
    });

    expect(() => {
      record.dispose();
    }).toThrowError("cleanup failed");

    expect(events).toEqual(["throwing", "first", "scope"]);
    expect(record.disposed).toBeTrue();
    expect(record.root).toBeNull();
    expect(record.childScopes).toEqual([]);
    expect(() => {
      record.dispose();
    }).not.toThrow();
  });

  it("aggregates multiple explicit disposal errors", () => {
    const { root, rootScope } = createRoot();
    const record = createCompiledFragmentRecord({
      id: "fragment:aggregate-errors",
      root,
      parentScope: rootScope,
      disposers: [
        () => {
          throw new Error("first");
        },
        () => {
          throw new Error("second");
        },
      ],
    });

    expect(() => record.dispose()).toThrowError(
      AggregateError,
      "Compiled fragment 'fragment:aggregate-errors' disposal failed.",
    );
  });

  it("releases non-element fragment nodes", () => {
    const { root, rootScope } = createRoot();
    const host = document.createElement("div");
    const node = document.createTextNode("owned");
    const record = createCompiledFragmentRecord({
      root,
      parentScope: rootScope,
      nodes: [node],
    });

    host.append(node);
    record.dispose();

    expect(host.childNodes.length).toBe(0);
  });

  it("registers replacement nodes that were not previously linked", () => {
    const { root, rootScope } = createRoot();
    const target = document.createElement("main");
    const node = document.createElement("article");
    const record = createCompiledFragmentRecord({
      root,
      parentScope: rootScope,
      nodes: [node],
    });

    replaceCompiledFragmentNodes(target, record);

    expect(target.firstChild).toBe(node);
    expect(getCompiledFragmentRecord(node)).toBe(record);

    record.dispose();
  });

  it("removes fragment-owned DOM listeners and observer callbacks through disposers", () => {
    const { root, rootScope } = createRoot();
    const button = document.createElement("button");
    const callbacks: string[] = [];
    const listener = () => {
      callbacks.push("click");
    };
    const observers = new Set<() => void>();
    const observer = () => {
      callbacks.push("observer");
    };
    const record = createCompiledFragmentRecord({
      root,
      parentScope: rootScope,
      nodes: [button],
    });

    button.addEventListener("click", listener);
    observers.add(observer);

    addCompiledFragmentDisposer(record, () => {
      button.removeEventListener("click", listener);
    });
    addCompiledFragmentDisposer(record, () => {
      observers.delete(observer);
    });

    button.click();
    observers.forEach((callback) => {
      callback();
    });

    expect(callbacks).toEqual(["click", "observer"]);

    record.dispose();
    button.click();
    observers.forEach((callback) => {
      callback();
    });

    expect(callbacks).toEqual(["click", "observer"]);
    expect(observers.size).toBe(0);
  });

  it("releases directive controller and require maps through disposers", () => {
    const { root, rootScope } = createRoot();
    const controllers = new Map<string, object>();
    const requireMap = new Map<string, object>();
    const controller = {};
    const required = {};
    const record = createCompiledFragmentRecord({
      root,
      parentScope: rootScope,
    });

    controllers.set("$exampleController", controller);
    requireMap.set("example", required);

    addCompiledFragmentDisposer(record, () => {
      controllers.clear();
      requireMap.clear();
    });

    record.dispose();

    expect(controllers.size).toBe(0);
    expect(requireMap.size).toBe(0);
  });

  it("rejects disposer registration after disposal", () => {
    const { root, rootScope } = createRoot();
    const record = createCompiledFragmentRecord({
      id: "fragment:disposed-registration",
      root,
      parentScope: rootScope,
    });

    record.dispose();

    expect(() => {
      addCompiledFragmentDisposer(record, () => undefined);
    }).toThrowError(
      "Cannot register disposal work on disposed compiled fragment 'fragment:disposed-registration'.",
    );
  });

  it("adds and removes fragment async work", () => {
    const { root, rootScope } = createRoot();
    const record = createPublicLinkCompiledFragmentRecord(root, rootScope, []);
    const work: CompiledFragmentAsyncWork = {
      id: "async",
      source: "test",
      cancel: jasmine.createSpy("cancel"),
    };

    removeCompiledFragmentAsyncWork(record, work);
    addCompiledFragmentAsyncWork(record, work);
    removeCompiledFragmentAsyncWork(record, work);

    expect(record.asyncWork).toEqual([]);

    record.dispose();
    removeCompiledFragmentAsyncWork(record, work);
    expect(() => addCompiledFragmentAsyncWork(record, work)).toThrowError(
      `Cannot register async work on disposed compiled fragment '${record.id}'.`,
    );
  });

  it("ignores root scheduled DOM work after fragment disposal", () => {
    const { root, rootScope } = createRoot();
    const target = document.createElement("div");
    const record = createCompiledFragmentRecord({
      root,
      parentScope: rootScope,
      nodes: [target],
    });

    expect(
      scheduleCompiledFragmentDomWork(record, () => {
        target.textContent = "late";
      }),
    ).toBeTrue();

    record.dispose();
    root.scheduler.flush();

    expect(target.textContent).toBe("");
    expect(record.diagnostics.lateCallbacks).toBe(1);
  });

  it("defers retained inactive fragment DOM work without pausing active root work", () => {
    const { root, rootScope } = createRoot();
    const retainedScope = rootScope.$new();
    const activeScope = rootScope.$new();
    const retainedRecord = createCompiledFragmentRecord({
      root,
      parentScope: retainedScope,
    });
    const activeRecord = createCompiledFragmentRecord({
      root,
      parentScope: activeScope,
    });
    const calls: string[] = [];

    expect(
      scheduleCompiledFragmentDomWork(retainedRecord, () => {
        calls.push("retained-before-pause");
      }),
    ).toBeTrue();
    expect(
      scheduleCompiledFragmentDomWork(retainedRecord, () => {
        calls.push("retained-before-pause-2");
      }),
    ).toBeTrue();

    retainedScope.$broadcast("$viewRetentionPause");

    expect(
      scheduleCompiledFragmentDomWork(retainedRecord, () => {
        calls.push("retained-during-pause");
      }),
    ).toBeTrue();
    expect(
      scheduleCompiledFragmentDomWork(activeRecord, () => {
        calls.push("active");
      }),
    ).toBeTrue();

    root.scheduler.flush();

    expect(calls).toEqual(["active"]);

    retainedScope.$broadcast("$viewRetentionResume");
    root.scheduler.flush();

    expect(calls).toEqual([
      "active",
      "retained-before-pause",
      "retained-before-pause-2",
      "retained-during-pause",
    ]);
  });

  it("filters retention modes and ignores empty resume queues", () => {
    const { root, rootScope } = createRoot();
    const record = createCompiledFragmentRecord({
      root,
      parentScope: rootScope,
    });

    rootScope.$broadcast("$viewRetentionResume");
    rootScope.$broadcast("$viewRetentionPause", { _pause: "background" });
    rootScope.$broadcast("$viewRetentionResume", { _pause: "background" });
    rootScope.$broadcast("$viewRetentionPause");
    rootScope.$broadcast("$viewRetentionResume");

    expect(record.disposed).toBeFalse();
  });

  it("keeps resumed DOM work deferred when the fragment pauses again", () => {
    const { root, rootScope } = createRoot();
    const calls: string[] = [];
    const record = createCompiledFragmentRecord({
      root,
      parentScope: rootScope,
    });

    rootScope.$broadcast("$viewRetentionPause");
    scheduleCompiledFragmentDomWork(record, () => calls.push("deferred"));
    rootScope.$broadcast("$viewRetentionResume");
    rootScope.$broadcast("$viewRetentionPause");
    root.scheduler.flush();

    expect(calls).toEqual([]);

    rootScope.$broadcast("$viewRetentionResume");
    root.scheduler.flush();

    expect(calls).toEqual(["deferred"]);
  });

  it("drops paused work when its root becomes stale", () => {
    const { root, rootScope } = createRoot();
    const record = createCompiledFragmentRecord({
      root,
      parentScope: rootScope,
    });
    const operation = jasmine.createSpy("operation");

    rootScope.$broadcast("$viewRetentionPause");
    scheduleCompiledFragmentDomWork(record, operation);
    root.destroyed = true;
    rootScope.$broadcast("$viewRetentionResume");

    expect(operation).not.toHaveBeenCalled();
    expect(record.diagnostics.lateCallbacks).toBe(1);
  });

  it("supports records without a retention scope or live root", () => {
    const { root, rootScope } = createRoot();
    const noScope = createCompiledFragmentRecord({
      root,
      parentScope: null as never,
    });
    const noRoot = createCompiledFragmentRecord({
      root,
      parentScope: rootScope,
    });

    noScope.dispose();
    noRoot.root = null;

    expect(() => markCompiledFragmentLinked(noRoot)).toThrowError(
      `Cannot link compiled fragment '${noRoot.id}' after its root is destroyed.`,
    );

    noRoot.dispose();
  });

  it("does not schedule DOM work for disposed fragments", () => {
    const { root, rootScope } = createRoot();
    const record = createCompiledFragmentRecord({
      root,
      parentScope: rootScope,
    });

    record.dispose();

    expect(
      scheduleCompiledFragmentDomWork(record, () => {
        throw new Error("should not run");
      }),
    ).toBeFalse();
    expect(record.diagnostics.lateCallbacks).toBe(1);
  });
});

describe("$compile incremental fragment ownership", () => {
  let $appRoot: AppRootRecord;
  let $compile: CompileFn;
  let $rootScope: ng.Scope;

  beforeEach(() => {
    const angular = new Angular();
    const injector = angular.injector(["ng"]);

    $compile = injector.get("$compile") as CompileFn;
    $rootScope = injector.get("$rootScope") as ng.Scope;
    $appRoot = angular._appContext.getRootByScope($rootScope)!;
  });

  it("attaches an internal fragment record to linked nodes", () => {
    const element = $compile("<div>{{name}}</div>")($rootScope) as Element;
    const record = getCompiledFragmentRecord(element);

    expect(record).toBeDefined();
    expect(record?.rootId).toBe($appRoot.id);
    expect(record?.root).toBe($appRoot);
    expect(record?.parentScope).toBe($rootScope);
    expect(record?.nodes).toEqual([element]);
    expect(record?.linked).toBeTrue();
    expect(record?.disposed).toBeFalse();
    expect(record?.diagnostics.label).toBe("$compile");
    expect(record?.diagnostics.source).toBe("publicLinkFn");
  });

  it("keeps public static fragment records compact until lifecycle work is registered", () => {
    const element = $compile("<section>Static</section>")(
      $rootScope,
    ) as Element;
    const record = getCompiledFragmentRecord(element);
    let disposed = false;

    expect(record).toBeDefined();
    expect(
      Object.prototype.hasOwnProperty.call(record, "childScopes"),
    ).toBeFalse();
    expect(
      Object.prototype.hasOwnProperty.call(record, "childFragments"),
    ).toBeFalse();
    expect(
      Object.prototype.hasOwnProperty.call(record, "disposers"),
    ).toBeFalse();
    expect(
      Object.prototype.hasOwnProperty.call(record, "asyncWork"),
    ).toBeFalse();

    addCompiledFragmentDisposer(record!, () => {
      disposed = true;
    });

    expect(record?.disposers.length).toBe(1);

    record?.dispose();

    expect(disposed).toBeTrue();
    expect(record?.disposed).toBeTrue();
  });

  it("keeps existing non-cloned public link multi-link protection", () => {
    const link = $compile("<span></span>");
    const element = link($rootScope) as Element;
    const record = getCompiledFragmentRecord(element);

    expect(() => {
      link($rootScope);
    }).toThrowError(/This element has already been linked/);

    expect(getCompiledFragmentRecord(element)).toBe(record);
    expect(record?.diagnostics.duplicateLinkAttempts).toBe(0);
  });

  it("creates separate fragment records for cloned public links", () => {
    const link = $compile("<span></span>");
    let firstClone: Element | undefined;
    let secondClone: Element | undefined;

    link($rootScope, (clone: Parameters<CloneAttachFn>[0]) => {
      firstClone = clone as Element;
    });
    link($rootScope, (clone: Parameters<CloneAttachFn>[0]) => {
      secondClone = clone as Element;
    });

    const firstRecord = getCompiledFragmentRecord(firstClone as Element);
    const secondRecord = getCompiledFragmentRecord(secondClone as Element);

    expect(firstClone).toBeDefined();
    expect(secondClone).toBeDefined();
    expect(firstClone).not.toBe(secondClone);
    expect(firstRecord).toBeDefined();
    expect(secondRecord).toBeDefined();
    expect(firstRecord).not.toBe(secondRecord);
    expect(firstRecord?.rootId).toBe($appRoot.id);
    expect(secondRecord?.rootId).toBe($appRoot.id);
    expect(firstRecord?.linked).toBeTrue();
    expect(secondRecord?.linked).toBeTrue();
  });

  it("disposes a cloned public fragment with its owning child scope", () => {
    const childScope = $rootScope.$new();
    const link = $compile("<span>{{name}}</span>");
    let clone: Element | undefined;

    link(childScope, (linked: Parameters<CloneAttachFn>[0]) => {
      clone = linked as Element;
    });

    const record = getCompiledFragmentRecord(clone as Element);
    const renderedContent = clone?.textContent;

    expect(record).toBeDefined();
    expect(record?.disposed).toBeFalse();

    childScope.$destroy();

    expect(record?.disposed).toBeTrue();
    expect(record?.parentScope).toBeNull();
    expect(getCompiledFragmentRecord(clone as Element)).toBeUndefined();
    expect(clone?.textContent).toBe(renderedContent);
  });

  it("leaves parent-owned fragments available for explicit DOM disposal", () => {
    const childScope = $rootScope.$new();
    const parent = createCompiledFragmentRecord({
      id: "parent-owned-public-fragment",
      root: $appRoot,
      parentScope: $rootScope,
      nodes: [document.createComment("parent")],
      linked: true,
    });
    const link = $compile("<span></span>");
    let clone: Element | undefined;

    link(childScope, (linked: Parameters<CloneAttachFn>[0]) => {
      clone = linked as Element;
    });

    const child = getCompiledFragmentRecord(clone as Element)!;

    addCompiledFragmentChild(parent, child);
    childScope.$destroy();

    expect(child.disposed).toBeFalse();

    child.dispose();

    expect(child.disposed).toBeTrue();
  });

  it("removes node ownership when a compile fragment record is disposed", () => {
    const element = $compile("<article></article>")($rootScope) as Element;
    const record = getCompiledFragmentRecord(element);

    expect(record).toBeDefined();

    record?.dispose();

    expect(record?.disposed).toBeTrue();
    expect(getCompiledFragmentRecord(element)).toBeUndefined();
  });

  it("replaces target DOM with a fragment and disposes old fragment ownership", () => {
    const target = document.createElement("main");
    const oldElement = $compile("<section>Old</section>")(
      $rootScope,
    ) as Element;
    const nextElement = $compile("<article>Next</article>")(
      $rootScope,
    ) as Element;
    const oldRecord = getCompiledFragmentRecord(oldElement);
    const nextRecord = getCompiledFragmentRecord(nextElement);

    target.appendChild(oldElement);

    expect(oldRecord).toBeDefined();
    expect(nextRecord).toBeDefined();

    replaceCompiledFragmentNodes(target, nextRecord!);

    expect(target.childNodes.length).toBe(1);
    expect(target.firstChild).toBe(nextElement);
    expect(oldRecord?.disposed).toBeTrue();
    expect(getCompiledFragmentRecord(oldElement)).toBeUndefined();
    expect(getCompiledFragmentRecord(nextElement)).toBe(nextRecord);
    expect(nextRecord?.parentScope).toBe($rootScope);
  });

  it("rejects replacement with a disposed fragment", () => {
    const target = document.createElement("main");
    const element = $compile("<article></article>")($rootScope) as Element;
    const record = getCompiledFragmentRecord(element);

    record?.dispose();

    expect(() => {
      replaceCompiledFragmentNodes(target, record!);
    }).toThrowError(
      `Cannot replace DOM with disposed compiled fragment '${record?.id}'.`,
    );
  });

  it("does not apply async templateUrl content after fragment disposal", async () => {
    const moduleName = "incrementalTemplateUrlApp";
    const app = window.angular.module(moduleName, []);
    let resolveTemplate: ((content: string) => void) | undefined;
    const templatePromise = new Promise<string>((resolve) => {
      resolveTemplate = resolve;
    });

    app.value("$templateRequest", (_templateUrl: string) => templatePromise);
    app.directive("delayedBox", () => ({
      templateUrl: "/delayed-fragment.html",
    }));

    const injector = createInjector(["ng", moduleName]);
    const compile = injector.get("$compile") as CompileFn;
    const rootScope = injector.get("$rootScope") as ng.Scope;
    const element = compile("<delayed-box></delayed-box>")(
      rootScope,
    ) as Element;
    const record = getCompiledFragmentRecord(element);

    expect(record).toBeDefined();
    expect(record?.asyncWork.length).toBe(1);

    record?.dispose();
    resolveTemplate?.('<span class="loaded">Loaded</span>');

    await Promise.resolve();
    await Promise.resolve();

    expect(record?.disposed).toBeTrue();
    expect(record?.asyncWork.length).toBe(0);
    expect(element.innerHTML).toBe("");
    expect(element.querySelector(".loaded")).toBeNull();
  });
});
