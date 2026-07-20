import { replaceCompiledFragmentNodes, disposeCompiledFragmentRecord, getCompiledFragmentRecord } from '../../core/compile/incremental-fragment.js';

/**
 * Internal workflow UI bridge for progress, recovery, and diagnostics surfaces.
 */
function createWorkflowUiFragmentHost(options) {
    let current = null;
    let disposed = false;
    const host = {
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
function normalizeLinkedNodes(linked) {
    return Array.isArray(linked) ? linked : [linked];
}
function findCompiledFragmentRecord(nodes) {
    for (const node of nodes) {
        const fragment = getCompiledFragmentRecord(node);
        if (fragment) {
            return fragment;
        }
    }
    throw new Error("Workflow UI fragment host requires a compiled fragment.");
}

export { createWorkflowUiFragmentHost };
