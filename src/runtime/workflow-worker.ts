/**
 * Optional worker transport adapter for orchestration workflows.
 *
 * Import this entry only when workflows run across a Web Worker boundary.
 */
export {
  createWorkflowWorkerClient,
  createWorkflowWorkerHost,
} from "../services/workflow/worker-adapter.ts";
export type {
  WorkflowWorkerClient,
  WorkflowWorkerHost,
  WorkflowWorkerHostConfig,
  WorkflowWorkerMessage,
  WorkflowWorkerRequest,
  WorkflowWorkerRequestOperation,
  WorkflowWorkerResponse,
  WorkflowWorkerSnapshotMessage,
} from "../services/workflow/worker-adapter.ts";
