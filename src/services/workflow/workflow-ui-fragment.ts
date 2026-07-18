import {
  disposeCompiledFragmentRecord,
  getCompiledFragmentRecord,
  replaceCompiledFragmentNodes,
  type CompiledFragmentRecord,
} from "../../core/compile/incremental-fragment.ts";

export interface WorkflowUiFragmentHostOptions {
  compile: ng.CompileService;
  scope: ng.Scope;
  target: Element;
}

export interface WorkflowUiFragmentHost {
  readonly current: CompiledFragmentRecord | null;
  dispose(): void;
  render(template: string | Node | NodeList): CompiledFragmentRecord;
}

/**
 * Internal workflow UI bridge for progress, recovery, and diagnostics surfaces.
 */
export function createWorkflowUiFragmentHost(
  options: WorkflowUiFragmentHostOptions,
): WorkflowUiFragmentHost {
  let current: CompiledFragmentRecord | null = null;
  let disposed = false;

  const host: WorkflowUiFragmentHost = {
    get current() {
      return current;
    },
    dispose() {
      if (disposed) {
        return;
      }

      disposed = true;
      removeDestroyListener();

      if (current && !current.disposed) {
        disposeCompiledFragmentRecord(current);
      }

      current = null;
    },
    render(template) {
      if (disposed) {
        throw new Error("Cannot render a disposed workflow UI fragment host.");
      }

      const linked = options.compile(template)(options.scope);
      const nodes = normalizeLinkedNodes(linked);
      const next = findCompiledFragmentRecord(nodes);

      replaceCompiledFragmentNodes(options.target, next);
      current = next;

      return next;
    },
  };

  const removeDestroyListener = options.scope.$on("$destroy", () => {
    host.dispose();
  });

  return host;
}

function normalizeLinkedNodes(
  linked: Element | Node | ChildNode | Node[],
): Node[] {
  return Array.isArray(linked) ? linked : [linked];
}

function findCompiledFragmentRecord(
  nodes: readonly Node[],
): CompiledFragmentRecord {
  for (const node of nodes) {
    const fragment = getCompiledFragmentRecord(node);

    if (fragment) {
      return fragment;
    }
  }

  throw new Error("Workflow UI fragment host requires a compiled fragment.");
}
