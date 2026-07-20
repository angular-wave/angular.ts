package angular.ts

import org.scalajs.dom
import scala.scalajs.js

type Angular = js.Object
type Expression = String
type ClassMap = js.Dictionary[Boolean | Null]
type ClassValue = String | ClassMap | js.Array[String | ClassMap | Null] | Null
type AnnotatedFactory[A] = js.Array[String | js.Function]
type Injectable[A] = InjectableFactory[A]
type Controller = js.Object
type ControllerConstructor = js.Function
type MachineState = String
type MachineEventMap = js.Dictionary[js.Any]
type MachineNoEvents = js.Object
type MachineEventTransitionGuard[
    TData <: js.Object,
    TEvents <: js.Object,
] = js.Function1[MachineEventTransitionContext[TData, TEvents, js.Any], Boolean]
type MachineEventTransitionUpdate[
    TData <: js.Object,
    TEvents <: js.Object,
] = js.Function1[MachineEventTransitionContext[TData, TEvents, js.Any], Unit]
type MachineEventTransitionHook[
    TData <: js.Object,
    TEvents <: js.Object,
] = js.Function1[MachineEventTransitionContext[TData, TEvents, js.Any], Unit]
type MachineStateTransitionMap[
    TData <: js.Object,
    TEvents <: js.Object,
] = js.Dictionary[MachineEventTransitionConfig[TData, js.Any, TEvents]]
type MachineStateMap[
    TData <: js.Object,
    TEvents <: js.Object,
] = js.Dictionary[MachineStateDefinition[TData, TEvents]]
type MachineStateHooks[
    TData <: js.Object,
    TEvents <: js.Object,
] = js.Dictionary[MachineEventTransitionHook[TData, TEvents]]
type WorkflowState = MachineState
type WorkflowNoCommands = js.Object
type WorkflowCommandReturn[TOutput] = TOutput | js.Promise[TOutput]
type WorkflowCommand[TInput, TOutput, TData <: js.Object] = js.Function1[
  WorkflowCommandContext[TInput, TData],
  WorkflowCommandReturn[TOutput],
]
type WorkflowCommandMap = js.Dictionary[js.Object]
type WorkflowSnapshotMigration[TData <: js.Object] =
  js.Function1[js.Any, WorkflowSnapshot[TData]]
type WorkflowSupervisorWorkflowMap = js.Dictionary[js.Any]
type WorkflowWorkerMessage =
  WorkflowWorkerRequest | WorkflowWorkerResponse[js.Any] | WorkflowWorkerSnapshotMessage
type Validator = js.Function1[js.Any, Boolean]
type ModelValidator = js.Function2[js.Any, js.Any, js.Any]
type AsyncModelValidator = js.Function2[js.Any, js.Any, js.Promise[js.Any]]
type ModelParser = js.Function1[js.Any, js.Any]
type ModelFormatter = js.Function1[js.Any, js.Any]
type ModelViewChangeListener = js.Function0[Unit]
type PublicValidationState = Boolean | Null

@js.native
trait MachineEventTransitionContext[
    TData <: js.Object,
    TEvents <: js.Object,
    TPayload,
] extends js.Object:
  val `type`: String = js.native
  val from: MachineState = js.native
  var to: js.UndefOr[MachineState] = js.native
  val payload: TPayload = js.native
  val data: TData = js.native
  val machine: Machine[TData, TEvents] = js.native

final case class MachineEventTransitionConfig[
    TData <: js.Object,
    TPayload,
    TEvents <: js.Object,
](
    to: js.UndefOr[MachineState] = js.undefined,
    guard: js.UndefOr[MachineEventTransitionGuard[TData, TEvents]] = js.undefined,
    before: js.UndefOr[MachineEventTransitionHook[TData, TEvents]] = js.undefined,
    update: js.UndefOr[MachineEventTransitionUpdate[TData, TEvents]] = js.undefined,
    after: js.UndefOr[MachineEventTransitionHook[TData, TEvents]] = js.undefined,
    denied: js.UndefOr[MachineEventTransitionHook[TData, TEvents]] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "to" -> to,
      "guard" -> guard.asInstanceOf[js.UndefOr[js.Any]],
      "before" -> before.asInstanceOf[js.UndefOr[js.Any]],
      "update" -> update.asInstanceOf[js.UndefOr[js.Any]],
      "after" -> after.asInstanceOf[js.UndefOr[js.Any]],
      "denied" -> denied.asInstanceOf[js.UndefOr[js.Any]],
    )

final case class MachineStateDefinition[
    TData <: js.Object,
    TEvents <: js.Object,
](
    on: js.UndefOr[MachineStateTransitionMap[TData, TEvents]] = js.undefined,
):
  private[ts] def toJS: js.Object =
    val mappedOn = on.map(_.map { case (name, transition) => name -> transition.toJS })

    JsObjectBuilder("on" -> mappedOn.map(entries => js.Dictionary(entries.toSeq*)))

final case class MachineHooks[
    TData <: js.Object,
    TEvents <: js.Object,
](
    enter: js.UndefOr[MachineStateHooks[TData, TEvents]] = js.undefined,
    exit: js.UndefOr[MachineStateHooks[TData, TEvents]] = js.undefined,
    transition: js.UndefOr[MachineEventTransitionHook[TData, TEvents]] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "enter" -> enter,
      "exit" -> exit,
      "transition" -> transition,
    )

final case class MachineStateConfig[
    TData <: js.Object,
    TEvents <: js.Object,
](
    initial: MachineState,
    data: TData,
    states: MachineStateMap[TData, TEvents],
    hooks: js.UndefOr[MachineHooks[TData, TEvents]] = js.undefined,
):
  private[ts] def toJS: js.Object =
    val mappedStates = states.map { case (name, state) => name -> state.toJS }

    JsObjectBuilder(
      "initial" -> initial,
      "data" -> data,
      "states" -> js.Dictionary(mappedStates.toSeq*),
      "hooks" -> hooks.map(_.toJS),
    )

@js.native
trait MachineSnapshot[TData <: js.Object] extends js.Object:
  val state: MachineState = js.native
  val data: TData = js.native

object MachineSnapshot:
  def apply[TData <: js.Object](
      state: MachineState,
      data: TData,
  ): MachineSnapshot[TData] =
    JsObjectBuilder(
      "state" -> state,
      "data" -> data,
    ).asInstanceOf[MachineSnapshot[TData]]

@js.native
trait Machine[
    TData <: js.Object,
    TEvents <: js.Object,
] extends js.Object:
  val state: MachineState = js.native
  val data: TData = js.native
  def send(`type`: String, payload: js.UndefOr[js.Any] = js.undefined): Boolean =
    js.native
  def can(`type`: String, payload: js.UndefOr[js.Any] = js.undefined): Boolean =
    js.native
  def matches(state: MachineState): Boolean = js.native
  def snapshot(): MachineSnapshot[TData] = js.native
  def restore(snapshot: MachineSnapshot[TData]): Unit = js.native

@js.native
trait MachineService extends js.Object:
  def apply[
      TData <: js.Object,
      TEvents <: js.Object,
  ](config: js.Object): Machine[TData, TEvents] = js.native
  def apply[
      TData <: js.Object,
      TEvents <: js.Object,
  ](scope: Scope, config: js.Object): Machine[TData, TEvents] = js.native

extension [TData <: js.Object, TEvents <: js.Object] (service: MachineService)
  def create(config: MachineStateConfig[TData, TEvents]): Machine[TData, TEvents] =
    service.apply[TData, TEvents](config.toJS)

  def create(
      scope: Scope,
      config: MachineStateConfig[TData, TEvents],
  ): Machine[TData, TEvents] =
    service.apply[TData, TEvents](scope, config.toJS)

enum WorkflowConcurrencyPolicy(val value: String):
  case Parallel extends WorkflowConcurrencyPolicy("parallel")
  case Reject extends WorkflowConcurrencyPolicy("reject")
  case Queue extends WorkflowConcurrencyPolicy("queue")

@js.native
trait WorkflowDiagnostic extends js.Object:
  val code: String = js.native
  val message: String = js.native
  val recoverable: js.UndefOr[Boolean] = js.native
  val path: js.UndefOr[String] = js.native
  val command: js.UndefOr[String] = js.native
  val detail: js.UndefOr[js.Any] = js.native

object WorkflowDiagnostic:
  def apply(
      code: String,
      message: String,
      recoverable: js.UndefOr[Boolean] = js.undefined,
      path: js.UndefOr[String] = js.undefined,
      command: js.UndefOr[String] = js.undefined,
      detail: js.UndefOr[js.Any] = js.undefined,
  ): WorkflowDiagnostic =
    JsObjectBuilder(
      "code" -> code,
      "message" -> message,
      "recoverable" -> recoverable,
      "path" -> path,
      "command" -> command,
      "detail" -> detail,
    ).asInstanceOf[WorkflowDiagnostic]

@js.native
trait WorkflowResult[TOutput] extends js.Object:
  val ok: Boolean = js.native
  val status: String = js.native
  val output: js.UndefOr[TOutput] = js.native
  val diagnostics: js.UndefOr[js.Array[WorkflowDiagnostic]] = js.native

@js.native
trait WorkflowCommandContext[
    TInput,
    TData <: js.Object,
] extends js.Object:
  val data: TData = js.native
  val input: TInput = js.native
  val command: String = js.native
  val signal: dom.AbortSignal = js.native
  def cleanup(callback: js.Function0[Unit]): Unit = js.native
  def reject(diagnostic: WorkflowDiagnostic): Nothing = js.native

@js.native
trait WorkflowLifecycleContext[TInput, TData <: js.Object] extends js.Object:
  val command: String = js.native
  val input: TInput = js.native
  val data: TData = js.native

@js.native
trait WorkflowSuccessContext[TInput, TOutput, TData <: js.Object]
    extends WorkflowLifecycleContext[TInput, TData]:
  val output: TOutput = js.native

@js.native
trait WorkflowFailureContext[TInput, TData <: js.Object]
    extends WorkflowLifecycleContext[TInput, TData]:
  val diagnostic: WorkflowDiagnostic = js.native
  val diagnostics: js.Array[WorkflowDiagnostic] = js.native

final case class WorkflowLifecycleTarget[TContext](
    to: WorkflowState,
    update: js.UndefOr[js.Function1[TContext, Unit]] = js.undefined,
):
  private[ts] def toJS: js.Object = JsObjectBuilder("to" -> to, "update" -> update)

final case class WorkflowCommandDefinition[TInput, TOutput, TData <: js.Object](
    from: WorkflowState | js.Array[WorkflowState],
    pending: WorkflowState | WorkflowLifecycleTarget[WorkflowLifecycleContext[TInput, TData]],
    success: WorkflowState | WorkflowLifecycleTarget[
      WorkflowSuccessContext[TInput, TOutput, TData]
    ],
    failure: WorkflowState | WorkflowLifecycleTarget[WorkflowFailureContext[TInput, TData]],
    execute: js.UndefOr[WorkflowCommand[TInput, TOutput, TData]] = js.undefined,
    cancelled: js.UndefOr[
      WorkflowState | WorkflowLifecycleTarget[WorkflowFailureContext[TInput, TData]]
    ] = js.undefined,
    timeout: js.UndefOr[
      WorkflowState | WorkflowLifecycleTarget[WorkflowFailureContext[TInput, TData]]
    ] = js.undefined,
    concurrency: js.UndefOr[WorkflowConcurrencyPolicy] = js.undefined,
    commandTimeout: js.UndefOr[Double] = js.undefined,
    retry: js.UndefOr[Int] = js.undefined,
):
  private def target(value: Any): js.Any =
    value match
      case target: WorkflowLifecycleTarget[?] => target.toJS
      case state => state.asInstanceOf[js.Any]

  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "from" -> from.asInstanceOf[js.Any],
      "pending" -> target(pending),
      "execute" -> execute,
      "success" -> target(success),
      "failure" -> target(failure),
      "cancelled" -> cancelled.map(value => target(value)),
      "timeout" -> timeout.map(value => target(value)),
      "concurrency" -> concurrency.map(_.value),
      "commandTimeout" -> commandTimeout,
      "retry" -> retry,
    )

object WorkflowCommandMap:
  def apply(
      entries: (String, WorkflowCommandDefinition[?, ?, ? <: js.Object])*,
  ): WorkflowCommandMap =
    js.Dictionary(entries.map { case (name, definition) => name -> definition.toJS }*)

@js.native
trait WorkflowHistoryEntry extends js.Object:
  val id: Double = js.native
  val `type`: String = js.native
  val command: String = js.native
  val input: js.UndefOr[js.Any] = js.native
  val output: js.UndefOr[js.Any] = js.native
  val diagnostics: js.UndefOr[js.Array[WorkflowDiagnostic]] = js.native

object WorkflowHistoryEntry:
  def apply(
      id: Double,
      `type`: String,
      command: String,
      input: js.UndefOr[js.Any] = js.undefined,
      output: js.UndefOr[js.Any] = js.undefined,
      diagnostics: js.UndefOr[js.Array[WorkflowDiagnostic]] = js.undefined,
  ): WorkflowHistoryEntry =
    JsObjectBuilder(
      "id" -> id,
      "type" -> `type`,
      "command" -> command,
      "input" -> input,
      "output" -> output,
      "diagnostics" -> diagnostics,
    ).asInstanceOf[WorkflowHistoryEntry]

final case class WorkflowConfig[
    TData <: js.Object,
    TCommands <: js.Object,
](
    id: String,
    initial: WorkflowState,
    data: TData,
    commands: WorkflowCommandMap,
    diagnosticLimit: js.UndefOr[Int] = js.undefined,
    historyLimit: js.UndefOr[Int] = js.undefined,
    migrateSnapshot: js.UndefOr[WorkflowSnapshotMigration[TData]] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "diagnosticLimit" -> diagnosticLimit,
      "id" -> id,
      "initial" -> initial,
      "data" -> data,
      "historyLimit" -> historyLimit,
      "migrateSnapshot" -> migrateSnapshot,
      "commands" -> commands,
    )

@js.native
trait WorkflowSnapshot[TData <: js.Object] extends js.Object:
  val version: Int = js.native
  val id: String = js.native
  val state: WorkflowState = js.native
  val data: TData = js.native
  val diagnostics: js.Array[WorkflowDiagnostic] = js.native
  val history: js.Array[WorkflowHistoryEntry] = js.native

object WorkflowSnapshot:
  def apply[TData <: js.Object](
      id: String,
      state: WorkflowState,
      data: TData,
      diagnostics: js.Array[WorkflowDiagnostic] = js.Array(),
      history: js.Array[WorkflowHistoryEntry] = js.Array(),
  ): WorkflowSnapshot[TData] =
    JsObjectBuilder(
      "version" -> 1,
      "id" -> id,
      "state" -> state,
      "data" -> data,
      "diagnostics" -> diagnostics,
      "history" -> history,
    ).asInstanceOf[WorkflowSnapshot[TData]]

@js.native
trait Workflow[
    TData <: js.Object,
    TCommands <: js.Object,
] extends js.Object:
  val id: String = js.native
  val state: WorkflowState = js.native
  val data: TData = js.native
  val diagnostics: js.Array[WorkflowDiagnostic] = js.native
  val history: js.Array[WorkflowHistoryEntry] = js.native
  def can(command: String): Boolean = js.native
  def run[TOutput](
      command: String,
      input: js.UndefOr[js.Any] = js.undefined,
  ): js.Promise[WorkflowResult[TOutput]] = js.native
  def cancel(command: js.UndefOr[String] = js.undefined): Int = js.native
  def snapshot(): WorkflowSnapshot[TData] = js.native
  def restore(snapshot: js.Any): Unit = js.native

@js.native
trait WorkflowService extends js.Object:
  def apply[
      TData <: js.Object,
      TCommands <: js.Object,
  ](config: js.Object): Workflow[TData, TCommands] = js.native
  def apply[
      TData <: js.Object,
      TCommands <: js.Object,
  ](scope: Scope, config: js.Object): Workflow[TData, TCommands] =
    js.native

extension [TData <: js.Object, TCommands <: js.Object] (
    service: WorkflowService
)
  def create(
      config: WorkflowConfig[TData, TCommands],
  ): Workflow[TData, TCommands] =
    service.apply[TData, TCommands](config.toJS)

  def create(
      scope: Scope,
      config: WorkflowConfig[TData, TCommands],
  ): Workflow[TData, TCommands] =
    service.apply[TData, TCommands](scope, config.toJS)

enum WorkflowSupervisorStatus(val value: String):
  case Idle extends WorkflowSupervisorStatus("idle")
  case Persisting extends WorkflowSupervisorStatus("persisting")
  case Recovering extends WorkflowSupervisorStatus("recovering")
  case Failed extends WorkflowSupervisorStatus("failed")

enum WorkflowWorkerRequestOperation(val value: String):
  case Run extends WorkflowWorkerRequestOperation("run")
  case Snapshot extends WorkflowWorkerRequestOperation("snapshot")
  case Restore extends WorkflowWorkerRequestOperation("restore")

@js.native
trait WorkflowSupervisorDiagnostic extends js.Object:
  val code: String = js.native
  val message: String = js.native
  val recoverable: js.UndefOr[Boolean] = js.native
  val workflow: js.UndefOr[String] = js.native
  val command: js.UndefOr[String] = js.native
  val detail: js.UndefOr[js.Any] = js.native

object WorkflowSupervisorDiagnostic:
  def apply(
      code: String,
      message: String,
      recoverable: js.UndefOr[Boolean] = js.undefined,
      workflow: js.UndefOr[String] = js.undefined,
      command: js.UndefOr[String] = js.undefined,
      detail: js.UndefOr[js.Any] = js.undefined,
  ): WorkflowSupervisorDiagnostic =
    JsObjectBuilder(
      "code" -> code,
      "message" -> message,
      "recoverable" -> recoverable,
      "workflow" -> workflow,
      "command" -> command,
      "detail" -> detail,
    ).asInstanceOf[WorkflowSupervisorDiagnostic]

@js.native
trait WorkflowSupervisorSnapshot[
    TWorkflowSnapshots <: js.Object,
] extends js.Object:
  val version: Int = js.native
  val id: String = js.native
  val status: String = js.native
  val workflows: TWorkflowSnapshots = js.native
  val diagnostics: js.Array[WorkflowSupervisorDiagnostic] = js.native
  val updatedAt: Double = js.native

object WorkflowSupervisorSnapshot:
  def apply[TWorkflowSnapshots <: js.Object](
      id: String,
      status: WorkflowSupervisorStatus,
      workflows: TWorkflowSnapshots,
      diagnostics: js.Array[WorkflowSupervisorDiagnostic] = js.Array(),
      updatedAt: Double,
  ): WorkflowSupervisorSnapshot[TWorkflowSnapshots] =
    JsObjectBuilder(
      "version" -> 1,
      "id" -> id,
      "status" -> status.value,
      "workflows" -> workflows,
      "diagnostics" -> diagnostics,
      "updatedAt" -> updatedAt,
    ).asInstanceOf[WorkflowSupervisorSnapshot[TWorkflowSnapshots]]

@js.native
trait WorkflowSupervisorPersistence[
    TSnapshot <: WorkflowSupervisorSnapshot[? <: js.Object],
] extends js.Object:
  def load(id: String): js.Promise[js.UndefOr[TSnapshot]] = js.native
  def save(id: String, snapshot: TSnapshot): js.Promise[Unit] = js.native

final case class WorkflowSupervisorPersistenceConfig(
    database: js.UndefOr[String] = js.undefined,
    store: js.UndefOr[String] = js.undefined,
    version: js.UndefOr[Int] = js.undefined,
    indexedDB: js.UndefOr[js.Object] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "type" -> "indexeddb",
      "database" -> database,
      "store" -> store,
      "version" -> version,
      "indexedDB" -> indexedDB,
    )

final case class WorkflowSupervisorConfig[
    TWorkflows <: js.Object,
](
    id: String,
    workflows: TWorkflows,
    persistence: js.UndefOr[
      String | WorkflowSupervisorPersistenceConfig | WorkflowSupervisorPersistence[? <: WorkflowSupervisorSnapshot[? <: js.Object]],
    ] =
      js.undefined,
    autoPersist: js.UndefOr[Boolean] = js.undefined,
    autoRecover: js.UndefOr[Boolean] = js.undefined,
):
  private[ts] def toJS: js.Object =
    val persistenceValue = persistence.map:
      case config: WorkflowSupervisorPersistenceConfig => config.toJS
      case value                                       => value.asInstanceOf[js.Any]

    JsObjectBuilder(
      "id" -> id,
      "workflows" -> workflows,
      "persistence" -> persistenceValue,
      "autoPersist" -> autoPersist,
      "autoRecover" -> autoRecover,
    )

@js.native
trait WorkflowSupervisor[
    TWorkflows <: js.Object,
] extends js.Object:
  val id: String = js.native
  val status: String = js.native
  val diagnostics: js.Array[WorkflowSupervisorDiagnostic] = js.native
  val ready: js.Promise[js.UndefOr[WorkflowSupervisorSnapshot[js.Object]]] = js.native
  def workflow(name: String): Workflow[? <: js.Object, ? <: js.Object] =
    js.native
  def cancelAll(): Int = js.native
  def snapshot(): WorkflowSupervisorSnapshot[js.Object] = js.native
  def restore(snapshot: js.Any): Unit = js.native
  def persist(): js.Promise[WorkflowSupervisorSnapshot[js.Object]] = js.native
  def recover(): js.Promise[js.UndefOr[WorkflowSupervisorSnapshot[js.Object]]] =
    js.native

@js.native
trait WorkflowWorkerRequest extends js.Object:
  val `type`: String = js.native
  val id: String = js.native
  val operation: String = js.native
  val workflow: js.UndefOr[String] = js.native
  val command: js.UndefOr[String] = js.native
  val input: js.UndefOr[js.Any] = js.native
  val snapshot: js.UndefOr[js.Any] = js.native

object WorkflowWorkerRequest:
  def apply(
      id: String,
      operation: WorkflowWorkerRequestOperation,
      workflow: js.UndefOr[String] = js.undefined,
      command: js.UndefOr[String] = js.undefined,
      input: js.UndefOr[js.Any] = js.undefined,
      snapshot: js.UndefOr[js.Any] = js.undefined,
  ): WorkflowWorkerRequest =
    JsObjectBuilder(
      "type" -> "angular-ts:workflow-worker:request",
      "id" -> id,
      "operation" -> operation.value,
      "workflow" -> workflow,
      "command" -> command,
      "input" -> input,
      "snapshot" -> snapshot,
    ).asInstanceOf[WorkflowWorkerRequest]

@js.native
trait WorkflowWorkerResponse[TResult] extends js.Object:
  val `type`: String = js.native
  val id: String = js.native
  val ok: Boolean = js.native
  val result: js.UndefOr[TResult] = js.native
  val error: js.UndefOr[WorkflowDiagnostic] = js.native

object WorkflowWorkerResponse:
  def apply[TResult](
      id: String,
      ok: Boolean,
      result: js.UndefOr[TResult] = js.undefined,
      error: js.UndefOr[WorkflowDiagnostic] = js.undefined,
  ): WorkflowWorkerResponse[TResult] =
    JsObjectBuilder(
      "type" -> "angular-ts:workflow-worker:response",
      "id" -> id,
      "ok" -> ok,
      "result" -> result.asInstanceOf[js.UndefOr[js.Any]],
      "error" -> error,
    ).asInstanceOf[WorkflowWorkerResponse[TResult]]

@js.native
trait WorkflowWorkerSnapshotMessage extends js.Object:
  val `type`: String = js.native
  val snapshot: js.Dictionary[WorkflowSnapshot[js.Object]] = js.native

object WorkflowWorkerSnapshotMessage:
  def apply(
      snapshot: js.Dictionary[WorkflowSnapshot[js.Object]],
  ): WorkflowWorkerSnapshotMessage =
    JsObjectBuilder(
      "type" -> "angular-ts:workflow-worker:snapshot",
      "snapshot" -> snapshot,
    ).asInstanceOf[WorkflowWorkerSnapshotMessage]

@js.native
trait WorkflowWorkerHost extends js.Object:
  def handle(
      message: js.Any,
      post: js.Function1[WorkflowWorkerMessage, Unit],
  ): js.Promise[Unit] = js.native
  def snapshot(): js.Dictionary[WorkflowSnapshot[js.Object]] = js.native

final case class WorkflowWorkerHostConfig[
    TWorkflows <: js.Object,
](
    workflows: TWorkflows,
    publishSnapshots: js.UndefOr[Boolean] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "workflows" -> workflows,
      "publishSnapshots" -> publishSnapshots,
    )

@js.native
trait WorkflowWorkerClient extends js.Object:
  val latestSnapshot: js.UndefOr[js.Dictionary[WorkflowSnapshot[js.Object]]] =
    js.native
  def run[TOutput](
      workflow: String,
      command: String,
      input: js.UndefOr[js.Any] = js.undefined,
  ): js.Promise[WorkflowResult[TOutput]] = js.native
  def snapshot(): js.Promise[js.Dictionary[WorkflowSnapshot[js.Object]]] =
    js.native
  def restore(
      snapshot: js.Any,
  ): js.Promise[js.Dictionary[WorkflowSnapshot[js.Object]]] = js.native
  def onSnapshot(
      callback: js.Function1[js.Dictionary[WorkflowSnapshot[js.Object]], Unit],
  ): js.Function0[Unit] = js.native
  def dispose(): Unit = js.native

enum AnimationPhase(val value: String):
  case Enter extends AnimationPhase("enter")
  case Leave extends AnimationPhase("leave")
  case Move extends AnimationPhase("move")
  case AddClass extends AnimationPhase("addClass")
  case RemoveClass extends AnimationPhase("removeClass")
  case SetClass extends AnimationPhase("setClass")
  case Animate extends AnimationPhase("animate")

type AnimationResult = js.Object | js.Promise[Unit] | Unit

@js.native
trait AnimationContext extends js.Object:
  val signal: dom.AbortSignal = js.native
  val phase: String = js.native
  val className: js.UndefOr[String] = js.native
  val addClass: js.UndefOr[String] = js.native
  val removeClass: js.UndefOr[String] = js.native
  val from: js.UndefOr[js.Dictionary[String | Double]] = js.native
  val to: js.UndefOr[js.Dictionary[String | Double]] = js.native

type AnimationLifecycleCallback = js.Function2[dom.Element, AnimationContext, Unit]

type AnimationKeyframes = js.Array[js.Object] | js.Dictionary[js.Any]

final case class AnimationOptions(
    animation: js.UndefOr[String] = js.undefined,
    keyframes: js.UndefOr[AnimationKeyframes] = js.undefined,
    enter: js.UndefOr[AnimationKeyframes] = js.undefined,
    leave: js.UndefOr[AnimationKeyframes] = js.undefined,
    move: js.UndefOr[AnimationKeyframes] = js.undefined,
    addClass: js.UndefOr[String] = js.undefined,
    removeClass: js.UndefOr[String] = js.undefined,
    from: js.UndefOr[js.Dictionary[String | Double]] = js.undefined,
    to: js.UndefOr[js.Dictionary[String | Double]] = js.undefined,
    tempClasses: js.UndefOr[String | js.Array[String]] = js.undefined,
    duration: js.UndefOr[Double] = js.undefined,
    delay: js.UndefOr[Double] = js.undefined,
    easing: js.UndefOr[String] = js.undefined,
    fill: js.UndefOr[String] = js.undefined,
    iterations: js.UndefOr[Double] = js.undefined,
    onStart: js.UndefOr[AnimationLifecycleCallback] = js.undefined,
    onDone: js.UndefOr[AnimationLifecycleCallback] = js.undefined,
    onCancel: js.UndefOr[AnimationLifecycleCallback] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "animation" -> animation,
      "keyframes" -> keyframes.asInstanceOf[js.UndefOr[js.Any]],
      "enter" -> enter.asInstanceOf[js.UndefOr[js.Any]],
      "leave" -> leave.asInstanceOf[js.UndefOr[js.Any]],
      "move" -> move.asInstanceOf[js.UndefOr[js.Any]],
      "addClass" -> addClass,
      "removeClass" -> removeClass,
      "from" -> from,
      "to" -> to,
      "tempClasses" -> tempClasses.asInstanceOf[js.UndefOr[js.Any]],
      "duration" -> duration,
      "delay" -> delay,
      "easing" -> easing,
      "fill" -> fill,
      "iterations" -> iterations,
      "onStart" -> onStart,
      "onDone" -> onDone,
      "onCancel" -> onCancel,
    )

type AnimationPresetHandler =
  js.Function3[dom.Element, AnimationContext, AnimationOptions, AnimationResult]

type AnimationPresetValue = AnimationPresetHandler | AnimationKeyframes

final case class AnimationPreset(
    enter: js.UndefOr[AnimationPresetValue] = js.undefined,
    leave: js.UndefOr[AnimationPresetValue] = js.undefined,
    move: js.UndefOr[AnimationPresetValue] = js.undefined,
    addClass: js.UndefOr[AnimationPresetValue] = js.undefined,
    removeClass: js.UndefOr[AnimationPresetValue] = js.undefined,
    setClass: js.UndefOr[AnimationPresetValue] = js.undefined,
    animate: js.UndefOr[AnimationPresetValue] = js.undefined,
    options: js.UndefOr[js.Object] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "enter" -> enter.asInstanceOf[js.UndefOr[js.Any]],
      "leave" -> leave.asInstanceOf[js.UndefOr[js.Any]],
      "move" -> move.asInstanceOf[js.UndefOr[js.Any]],
      "addClass" -> addClass.asInstanceOf[js.UndefOr[js.Any]],
      "removeClass" -> removeClass.asInstanceOf[js.UndefOr[js.Any]],
      "setClass" -> setClass.asInstanceOf[js.UndefOr[js.Any]],
      "animate" -> animate.asInstanceOf[js.UndefOr[js.Any]],
      "options" -> options,
    )

@js.native
trait AnimationHandle extends js.Object:
  val controller: dom.AbortController = js.native
  val finished: js.Promise[Unit] = js.native
  def done(callback: js.Function1[Boolean, Unit]): Unit = js.native
  def cancel(): Unit = js.native
  def finish(): Unit = js.native
  def pause(): Unit = js.native
  def play(): Unit = js.native
  def complete(status: js.UndefOr[Boolean] = js.undefined): Unit = js.native

@js.native
trait AnimateService extends js.Object:
  def cancel(handle: js.UndefOr[AnimationHandle] = js.undefined): Unit = js.native
  def define(name: String, preset: js.Object): Unit = js.native
  def enter(
      element: dom.Element,
      parent: js.UndefOr[dom.Node | Null] = js.undefined,
      after: js.UndefOr[dom.Node | Null] = js.undefined,
      options: js.UndefOr[js.Object] = js.undefined,
  ): AnimationHandle = js.native
  def move(
      element: dom.Element,
      parent: dom.Node | Null,
      after: js.UndefOr[dom.Node | Null] = js.undefined,
      options: js.UndefOr[js.Object] = js.undefined,
  ): AnimationHandle = js.native
  def leave(
      element: dom.Element,
      options: js.UndefOr[js.Object] = js.undefined,
  ): AnimationHandle = js.native
  def addClass(
      element: dom.Element,
      className: String,
      options: js.UndefOr[js.Object] = js.undefined,
  ): AnimationHandle = js.native
  def removeClass(
      element: dom.Element,
      className: String,
      options: js.UndefOr[js.Object] = js.undefined,
  ): AnimationHandle = js.native
  def setClass(
      element: dom.Element,
      add: String,
      remove: String,
      options: js.UndefOr[js.Object] = js.undefined,
  ): AnimationHandle = js.native
  def animate(
      element: dom.Element,
      from: js.Dictionary[String | Double],
      to: js.UndefOr[js.Dictionary[String | Double]] = js.undefined,
      className: js.UndefOr[String] = js.undefined,
      options: js.UndefOr[js.Object] = js.undefined,
  ): AnimationHandle = js.native
  def transition(update: js.Function0[Unit | js.Promise[Unit]]): js.Promise[Unit] =
    js.native

object AnimateService:
  extension (service: AnimateService)
    def define(name: String, preset: AnimationPreset): Unit =
      service.define(name, preset.toJS)

    def enter(
        element: dom.Element,
        parent: js.UndefOr[dom.Node | Null],
        after: js.UndefOr[dom.Node | Null],
        options: AnimationOptions,
    ): AnimationHandle =
      service.enter(element, parent, after, options.toJS)

    def move(
        element: dom.Element,
        parent: dom.Node | Null,
        after: js.UndefOr[dom.Node | Null],
        options: AnimationOptions,
    ): AnimationHandle =
      service.move(element, parent, after, options.toJS)

    def leave(element: dom.Element, options: AnimationOptions): AnimationHandle =
      service.leave(element, options.toJS)

    def addClass(
        element: dom.Element,
        className: String,
        options: AnimationOptions,
    ): AnimationHandle =
      service.addClass(element, className, options.toJS)

    def removeClass(
        element: dom.Element,
        className: String,
        options: AnimationOptions,
    ): AnimationHandle =
      service.removeClass(element, className, options.toJS)

    def setClass(
        element: dom.Element,
        add: String,
        remove: String,
        options: AnimationOptions,
    ): AnimationHandle =
      service.setClass(element, add, remove, options.toJS)

    def animate(
        element: dom.Element,
        from: js.Dictionary[String | Double],
        to: js.UndefOr[js.Dictionary[String | Double]],
        className: js.UndefOr[String],
        options: AnimationOptions,
    ): AnimationHandle =
      service.animate(element, from, to, className, options.toJS)

type TranscludedNodes =
  dom.Node | js.Array[dom.Node] | dom.NodeList[dom.Node] | dom.DocumentFragment | Null
type CompileNode = String | dom.Element | dom.Node | dom.NodeList[dom.Node] | Null
type CloneAttachFn =
  js.Function2[js.UndefOr[TranscludedNodes], js.UndefOr[Scope | Null], js.Any]

@js.native
trait TranscludeFn
    extends js.Function4[
      js.UndefOr[Scope | CloneAttachFn | Null],
      js.UndefOr[CloneAttachFn | dom.Node | dom.Element | Null],
      js.UndefOr[dom.Node | dom.Element | js.Object | String | Double | Null],
      js.UndefOr[String | Double],
      js.UndefOr[TranscludedNodes],
    ]:
  val isSlotFilled: js.UndefOr[js.Function1[String | Double, Boolean]] =
    js.native

@js.native
trait LinkFn
    extends js.Function3[
      Scope,
      js.UndefOr[CloneAttachFn],
      js.UndefOr[js.Object],
      dom.Element | dom.Node | js.Array[dom.Node],
    ]:
  val pre: js.UndefOr[js.Any] = js.native
  val post: js.UndefOr[js.Any] = js.native

type ChildTranscludeOrLinkFn = TranscludeFn | LinkFn

@js.native
trait CompileService
    extends js.Function5[
      CompileNode,
      js.UndefOr[ChildTranscludeOrLinkFn | Null],
      js.UndefOr[Double],
      js.UndefOr[String],
      js.UndefOr[js.Object | Null],
      LinkFn,
    ]

@js.native
trait ControllerLocals extends js.Object:
  val $scope: Scope = js.native
  val $element: dom.Node = js.native

object ControllerLocals:
  def apply(
      scope: Scope,
      element: dom.Node,
  ): ControllerLocals =
    JsObjectBuilder(
      "$scope" -> scope,
      "$element" -> element,
    ).asInstanceOf[ControllerLocals]

type ControllerExpression = String | js.Function | js.Array[js.Any]

@js.native
trait ControllerService
    extends js.Function4[
      ControllerExpression,
      js.UndefOr[ControllerLocals],
      js.UndefOr[Boolean],
      js.UndefOr[String],
      js.Any,
    ]

@js.native
trait CompiledExpression
    extends js.Function3[
      js.UndefOr[js.Any],
      js.UndefOr[js.Object],
      js.UndefOr[js.Any],
      js.Any,
    ]

@js.native
trait ParseService
    extends js.Function2[
      String,
      js.UndefOr[js.Function1[js.Any, js.Any]],
      CompiledExpression,
    ]

type HttpParamSerializerService =
  js.Function1[js.UndefOr[js.Dictionary[js.Any]], String]

final case class ErrorHandlingConfig(
    objectMaxDepth: js.UndefOr[Double] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "objectMaxDepth" -> objectMaxDepth,
    )

@js.native
trait NgModelController extends js.Object:
  var $viewValue: js.Any = js.native
  var $modelValue: js.Any = js.native
  val $validators: js.Dictionary[ModelValidator] = js.native
  val $asyncValidators: js.Dictionary[AsyncModelValidator] = js.native
  val $parsers: js.Array[ModelParser] = js.native
  val $formatters: js.Array[ModelFormatter] = js.native
  val $viewChangeListeners: js.Array[ModelViewChangeListener] = js.native
  val $untouched: Boolean = js.native
  val $touched: Boolean = js.native
  val $pristine: Boolean = js.native
  val $dirty: Boolean = js.native
  val $valid: js.UndefOr[Boolean] = js.native
  val $invalid: js.UndefOr[Boolean] = js.native
  val $validity: dom.ValidityState | Null = js.native
  val $validationMessage: String = js.native
  val $error: js.Dictionary[Boolean] = js.native
  val $pending: js.UndefOr[js.Dictionary[Boolean]] = js.native
  val $name: String | Double = js.native
  val $target: js.Object = js.native
  val $options: js.Object = js.native
  def $setValidity(
      validationErrorKey: String,
      state: PublicValidationState,
  ): Unit = js.native
  def $setNativeValidity(state: Boolean | Null): Unit = js.native
  def $setCustomValidity(message: String): Unit = js.native
  def $render(): Unit = js.native
  def $isEmpty(value: js.Any): Boolean = js.native
  def $setPristine(): Unit = js.native
  def $setDirty(): Unit = js.native
  def $setUntouched(): Unit = js.native
  def $setTouched(): Unit = js.native
  def $rollbackViewValue(): Unit = js.native
  def $validate(): Unit = js.native
  def $commitViewValue(): Unit = js.native
  def $setViewValue(value: js.Any): Unit = js.native
  def $setViewValue(value: js.Any, trigger: String): Unit = js.native
  def $overrideModelOptions(options: js.Object): Unit = js.native
  def $processModelValue(): Unit = js.native

@js.native
trait PolicyContext extends js.Object:
  val operation: String = js.native
  val target: js.UndefOr[String] = js.native
  val user: js.UndefOr[js.Any] = js.native
  val meta: js.UndefOr[js.Dictionary[js.Any]] = js.native

@js.native
trait PolicyDecision extends js.Object:
  val `type`: String = js.native
  val reason: js.UndefOr[String] = js.native
  val status: js.UndefOr[Int] = js.native
  val target: js.UndefOr[String] = js.native
  val error: js.UndefOr[js.Any] = js.native
  val meta: js.UndefOr[js.Dictionary[js.Any]] = js.native

object PolicyDecision:
  def apply(
      decisionType: String,
      reason: js.UndefOr[String] = js.undefined,
      status: js.UndefOr[Int] = js.undefined,
      target: js.UndefOr[String] = js.undefined,
      error: js.UndefOr[js.Any] = js.undefined,
      meta: js.UndefOr[js.Dictionary[js.Any]] = js.undefined,
  ): PolicyDecision =
    JsObjectBuilder(
      "type" -> decisionType,
      "reason" -> reason,
      "status" -> status,
      "target" -> target,
      "error" -> error,
      "meta" -> meta,
    ).asInstanceOf[PolicyDecision]

type Policy[-C <: PolicyContext, +D <: PolicyDecision] =
  js.Function1[C, D | String | js.Promise[D | String]]

@js.native
trait AriaService extends js.Object:
  def config(key: String): js.UndefOr[Boolean] = js.native
  def config(key: Double): js.UndefOr[Boolean] = js.native

final case class AriaConfig(
    ariaHidden: js.UndefOr[Boolean] = js.undefined,
    ariaChecked: js.UndefOr[Boolean] = js.undefined,
    ariaReadonly: js.UndefOr[Boolean] = js.undefined,
    ariaDisabled: js.UndefOr[Boolean] = js.undefined,
    ariaRequired: js.UndefOr[Boolean] = js.undefined,
    ariaInvalid: js.UndefOr[Boolean] = js.undefined,
    ariaValue: js.UndefOr[Boolean] = js.undefined,
    tabindex: js.UndefOr[Boolean] = js.undefined,
    bindKeydown: js.UndefOr[Boolean] = js.undefined,
    bindRoleForClick: js.UndefOr[Boolean] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "ariaHidden" -> ariaHidden,
      "ariaChecked" -> ariaChecked,
      "ariaReadonly" -> ariaReadonly,
      "ariaDisabled" -> ariaDisabled,
      "ariaRequired" -> ariaRequired,
      "ariaInvalid" -> ariaInvalid,
      "ariaValue" -> ariaValue,
      "tabindex" -> tabindex,
      "bindKeydown" -> bindKeydown,
      "bindRoleForClick" -> bindRoleForClick,
    )

type Model[A <: js.Object] = A & Scope & ModelLifecycle[A]

enum ModelRestoreMode(val value: String):
  case Replace extends ModelRestoreMode("replace")
  case Merge extends ModelRestoreMode("merge")

enum ModelSyncFailurePolicy(val value: String):
  case Report extends ModelSyncFailurePolicy("report")
  case Throw extends ModelSyncFailurePolicy("throw")
  case Ignore extends ModelSyncFailurePolicy("ignore")

final case class ModelRestoreOptions(
    origin: js.UndefOr[String] = js.undefined,
    mode: js.UndefOr[ModelRestoreMode] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "origin" -> origin,
      "mode" -> mode.map(_.value),
    )

final case class ModelSyncOptions(
    failure: js.UndefOr[ModelSyncFailurePolicy] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "failure" -> failure.map(_.value),
    )

@js.native
trait ModelChange extends js.Object:
  val origin: js.UndefOr[String] = js.native
  val keys: js.Array[String] = js.native
  val snapshotVersion: Int = js.native

type ModelApply[A <: js.Object] = js.Function2[A, js.UndefOr[js.Object], Unit]

final case class ModelSyncTarget[A <: js.Object](
    restore: js.UndefOr[js.Function0[js.Any]] = js.undefined,
    write: js.UndefOr[js.Function2[A, ModelChange, js.Any]] = js.undefined,
    receive: js.UndefOr[js.Function1[ModelApply[A], js.UndefOr[js.Function0[Unit]]]] =
      js.undefined,
    dispose: js.UndefOr[js.Function0[Unit]] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "restore" -> restore,
      "write" -> write,
      "receive" -> receive,
      "dispose" -> dispose,
    )

@js.native
trait ModelLifecycle[A <: js.Object] extends js.Object:
  def $snapshot(): A = js.native
  def $restore(snapshot: A): Unit = js.native
  def $restore(snapshot: A, options: js.Object): Unit = js.native
  def $sync(target: js.Object): js.Function0[Unit] = js.native
  def $sync(target: js.Object, options: js.Object): js.Function0[Unit] =
    js.native
  def $sync(target: js.Function): js.Function0[Unit] = js.native
  def $sync(target: js.Function, options: js.Object): js.Function0[Unit] =
    js.native

object ModelLifecycle:
  extension [A <: js.Object](model: ModelLifecycle[A])
    def restore(snapshot: A, options: ModelRestoreOptions): Unit =
      model.$restore(snapshot, options.toJS)

    def sync(
        target: ModelSyncTarget[A],
        options: ModelSyncOptions = ModelSyncOptions(),
    ): js.Function0[Unit] =
      model.$sync(target.toJS, options.toJS)

    def sync(
        target: InjectableFactory[js.Object],
        options: ModelSyncOptions,
    ): js.Function0[Unit] =
      model.$sync(target.annotated, options.toJS)

@js.native
trait StorageLike extends js.Object:
  def getItem(key: String): String | Null = js.native
  def setItem(key: String, value: String): Unit = js.native
  def removeItem(key: String): Unit = js.native

@js.native
trait StorageBackend extends js.Object:
  def get(key: String): js.UndefOr[String] = js.native
  def set(key: String, value: String): Unit = js.native
  def remove(key: String): Unit = js.native

enum StorageType(val value: String):
  case Local extends StorageType("local")
  case Session extends StorageType("session")
  case Cookie extends StorageType("cookie")
  case Custom extends StorageType("custom")

final case class PersistentStoreConfig(
    backend: js.UndefOr[StorageLike] = js.undefined,
    serialize: js.UndefOr[js.Function1[js.Any, String]] = js.undefined,
    deserialize: js.UndefOr[js.Function1[String, js.Any]] = js.undefined,
    cookie: js.UndefOr[js.Object] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "backend" -> backend,
      "serialize" -> serialize,
      "deserialize" -> deserialize,
      "cookie" -> cookie,
    )

enum HtmlCanvasScheduler(val value: String):
  case Paint extends HtmlCanvasScheduler("paint")
  case Raf extends HtmlCanvasScheduler("raf")

enum HtmlCanvasMode(val value: String):
  case TwoD extends HtmlCanvasMode("2d")
  case WebGl extends HtmlCanvasMode("webgl")
  case WebGpu extends HtmlCanvasMode("webgpu")

final case class HtmlCanvasConfig(
    enabled: js.UndefOr[Boolean | String] = js.undefined,
    throwOnUnsupported: js.UndefOr[Boolean] = js.undefined,
    defaultScheduler: js.UndefOr[HtmlCanvasScheduler] = js.undefined,
    defaultMode: js.UndefOr[HtmlCanvasMode] = js.undefined,
    requireFlag: js.UndefOr[Boolean] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "enabled" -> enabled.asInstanceOf[js.UndefOr[js.Any]],
      "throwOnUnsupported" -> throwOnUnsupported,
      "defaultScheduler" -> defaultScheduler.map(_.value),
      "defaultMode" -> defaultMode.map(_.value),
      "requireFlag" -> requireFlag,
    )

enum ServiceWorkerWorkerType(val value: String):
  case Classic extends ServiceWorkerWorkerType("classic")
  case Module extends ServiceWorkerWorkerType("module")

enum ServiceWorkerUpdateViaCache(val value: String):
  case Imports extends ServiceWorkerUpdateViaCache("imports")
  case All extends ServiceWorkerUpdateViaCache("all")
  case None extends ServiceWorkerUpdateViaCache("none")

enum ServiceWorkerMessageTarget(val value: String):
  case Controller extends ServiceWorkerMessageTarget("controller")
  case Active extends ServiceWorkerMessageTarget("active")
  case Waiting extends ServiceWorkerMessageTarget("waiting")
  case Installing extends ServiceWorkerMessageTarget("installing")

enum ServiceWorkerErrorCode(val value: String):
  case Unsupported extends ServiceWorkerErrorCode("unsupported")
  case NoController extends ServiceWorkerErrorCode("no-controller")
  case NoRegistration extends ServiceWorkerErrorCode("no-registration")
  case RegisterFailed extends ServiceWorkerErrorCode("register-failed")
  case ReadyFailed extends ServiceWorkerErrorCode("ready-failed")
  case UpdateFailed extends ServiceWorkerErrorCode("update-failed")
  case UnregisterFailed extends ServiceWorkerErrorCode("unregister-failed")
  case RequestFailed extends ServiceWorkerErrorCode("request-failed")
  case RequestTimeout extends ServiceWorkerErrorCode("request-timeout")

enum ServiceWorkerStatus(val value: String):
  case Unsupported extends ServiceWorkerStatus("unsupported")
  case Idle extends ServiceWorkerStatus("idle")
  case Registering extends ServiceWorkerStatus("registering")
  case Registered extends ServiceWorkerStatus("registered")
  case Ready extends ServiceWorkerStatus("ready")
  case Updating extends ServiceWorkerStatus("updating")
  case Unregistered extends ServiceWorkerStatus("unregistered")
  case Error extends ServiceWorkerStatus("error")

final case class ServiceWorkerConfig(
    scope: js.UndefOr[String] = js.undefined,
    `type`: js.UndefOr[ServiceWorkerWorkerType] = js.undefined,
    updateViaCache: js.UndefOr[ServiceWorkerUpdateViaCache] = js.undefined,
    autoRegister: js.UndefOr[Boolean] = js.undefined,
    checkForUpdatesOnRegister: js.UndefOr[Boolean] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "scope" -> scope,
      "type" -> `type`.map(_.value),
      "updateViaCache" -> updateViaCache.map(_.value),
      "autoRegister" -> autoRegister,
      "checkForUpdatesOnRegister" -> checkForUpdatesOnRegister,
    )

@js.native
trait ServiceWorkerError extends js.Error:
  val code: String = js.native
  val detail: js.UndefOr[js.Any] = js.native

@js.native
trait ServiceWorkerRegistrationState extends js.Object:
  val registered: Boolean = js.native
  val scope: js.UndefOr[String] = js.native
  val updateViaCache: js.UndefOr[String] = js.native
  val installing: js.UndefOr[String] = js.native
  val waiting: js.UndefOr[String] = js.native
  val active: js.UndefOr[String] = js.native

@js.native
trait ServiceWorkerUpdateState extends js.Object:
  val checking: Boolean = js.native
  val waiting: Boolean = js.native
  val controllerChanged: Boolean = js.native
  val lastCheckedAt: js.UndefOr[Double] = js.native
  val phase: js.UndefOr[String] = js.native
  val worker: js.UndefOr[dom.ServiceWorker] = js.native
  val registration: js.UndefOr[dom.ServiceWorkerRegistration] = js.native
  val errorCode: js.UndefOr[String] = js.native
  val error: js.UndefOr[js.Any] = js.native

@js.native
trait ServiceWorkerMessageEvent[+A] extends js.Object:
  val data: A = js.native
  val event: dom.MessageEvent = js.native
  val source: js.UndefOr[js.Any] = js.native

final case class ServiceWorkerRequestOptions(
    transfer: js.UndefOr[js.Array[js.Any]] = js.undefined,
    timeout: js.UndefOr[Double] = js.undefined,
    target: js.UndefOr[ServiceWorkerMessageTarget] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "transfer" -> transfer,
      "timeout" -> timeout,
      "target" -> target.map(_.value),
    )

enum SecurityFallbackDecision(val value: String):
  case Allow extends SecurityFallbackDecision("allow")
  case Deny extends SecurityFallbackDecision("deny")

type SecurityCredentialSource = String | js.Function0[String | Null]

final case class SecurityBasicCredentials(
    username: SecurityCredentialSource,
    password: SecurityCredentialSource,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "username" -> username.asInstanceOf[js.Any],
      "password" -> password.asInstanceOf[js.Any],
    )

@js.native
trait SecurityRequestCredentials extends js.Object:
  val headers: js.UndefOr[js.Dictionary[String]] = js.native
  val withCredentials: js.UndefOr[Boolean] = js.native

@js.native
trait SecurityPolicyDecision extends js.Object:
  val `type`: String = js.native
  val credentials: js.UndefOr[SecurityRequestCredentials] = js.native
  val reason: js.UndefOr[String] = js.native
  val status: js.UndefOr[Int] = js.native
  val target: js.UndefOr[String] = js.native
  val error: js.UndefOr[js.Any] = js.native
  val meta: js.UndefOr[js.Dictionary[js.Any]] = js.native

@js.native
trait NavigationPolicyContext extends js.Object:
  val operation: String = js.native
  val to: js.Object = js.native
  val from: js.UndefOr[js.Object] = js.native
  val transition: js.UndefOr[js.Object] = js.native
  val routePolicy: js.UndefOr[js.Object] = js.native
  val userAgent: js.UndefOr[String] = js.native

@js.native
trait RequestPolicyContext extends js.Object:
  val operation: String = js.native
  val transport: String = js.native
  val method: String = js.native
  val url: String = js.native
  val credentials: js.UndefOr[String] = js.native
  val headers: js.UndefOr[js.Dictionary[String]] = js.native
  val hasBody: js.UndefOr[Boolean] = js.native

final case class SecurityCredentialsConfig(
    bearer: js.UndefOr[SecurityCredentialSource] = js.undefined,
    basic: js.UndefOr[SecurityBasicCredentials] = js.undefined,
    cookie: js.UndefOr[Boolean] = js.undefined,
    order: js.UndefOr[js.Array[String]] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "bearer" -> bearer.asInstanceOf[js.UndefOr[js.Any]],
      "basic" -> basic.map(_.toJS),
      "cookie" -> cookie,
      "order" -> order,
    )

type SecurityPermissions = js.Array[String] | js.Function2[
  String,
  NavigationPolicyContext,
  Boolean | js.Promise[Boolean],
]

type SecurityAuthentication = Boolean | js.Function1[
  NavigationPolicyContext,
  Boolean | js.Promise[Boolean],
]

final case class SecurityConfig(
    fallback: js.UndefOr[SecurityFallbackDecision] = js.undefined,
    allowInsecureOrigins: js.UndefOr[js.Array[String]] = js.undefined,
    credentials: js.UndefOr[SecurityCredentialsConfig] = js.undefined,
    isAuthenticated: js.UndefOr[SecurityAuthentication] = js.undefined,
    permissions: js.UndefOr[SecurityPermissions] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "fallback" -> fallback.map(_.value),
      "allowInsecureOrigins" -> allowInsecureOrigins,
      "credentials" -> credentials.map(_.toJS),
      "isAuthenticated" -> isAuthenticated.asInstanceOf[js.UndefOr[js.Any]],
      "permissions" -> permissions.asInstanceOf[js.UndefOr[js.Any]],
    )

final case class AngularConfig(
    aria: js.UndefOr[AriaConfig] = js.undefined,
    htmlCanvas: js.UndefOr[HtmlCanvasConfig] = js.undefined,
    interpolate: js.UndefOr[InterpolateConfig] = js.undefined,
    security: js.UndefOr[SecurityConfig] = js.undefined,
    router: js.UndefOr[RouterConfig] = js.undefined,
    sce: js.UndefOr[SceConfig] = js.undefined,
    sceDelegate: js.UndefOr[SceDelegateConfig] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "$aria" -> aria.map(_.toJS),
      "$htmlCanvas" -> htmlCanvas.map(_.toJS),
      "$interpolate" -> interpolate.map(_.toJS),
      "$security" -> security.map(_.toJS),
      "$router" -> router.map(_.toJS),
      "$sce" -> sce.map(_.toJS),
      "$sceDelegate" -> sceDelegate.map(_.toJS),
    )

@js.native
trait SecurityPolicyService extends js.Object:
  def check(context: NavigationPolicyContext | RequestPolicyContext): js.Promise[SecurityPolicyDecision] =
    js.native

@js.native
trait Transition extends js.Object:
  def params(): js.Dictionary[js.Any] = js.native
  def to(): js.Object = js.native
  def from(): js.Object = js.native

@js.native
trait TargetState extends js.Object:
  def name(): String = js.native
  def params(): js.Dictionary[js.Any] = js.native

enum RouterScrollMode(val value: String):
  case Top extends RouterScrollMode("top")
  case Hash extends RouterScrollMode("hash")
  case Preserve extends RouterScrollMode("preserve")

final case class RouterScrollOptions(
    behavior: js.UndefOr[String] = js.undefined,
    left: js.UndefOr[Double] = js.undefined,
    top: js.UndefOr[Double] = js.undefined,
    selector: js.UndefOr[String] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "behavior" -> behavior,
      "left" -> left,
      "top" -> top,
      "selector" -> selector,
    )

final case class RouterFocusOptions(
    selector: js.UndefOr[String] = js.undefined,
    preventScroll: js.UndefOr[Boolean] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "selector" -> selector,
      "preventScroll" -> preventScroll,
    )

type RouterScrollConfig = Boolean | RouterScrollMode | RouterScrollOptions
type RouterFocusConfig = Boolean | String | RouterFocusOptions
type RouteStringList = String | js.Array[String]
type RouterInjectable = js.Function | js.Array[js.Any] | InjectableFactory[js.Any]
type StateResolveObject = js.Dictionary[RouterInjectable]
type StateResolveArray = js.Array[js.Object]
type RouteMap = js.Dictionary[RouteContract]
type ActiveNgView = js.Object
type ViewConfig = js.Object
type RetainedViewEntry = js.Object
type LazyStateLoadResult = StateDeclaration | js.Array[StateDeclaration] | Unit
type LazyStateLoader =
  js.Function2[TargetState, js.UndefOr[InjectorService], LazyStateLoadResult | js.Promise[LazyStateLoadResult]]
type TransitionDeregister = js.Function0[Unit]
type TransitionHookResult = js.Any
type TransitionHookFn = js.Function1[Transition, TransitionHookResult]
type TransitionStateHookFn =
  js.Function2[Transition, js.Object, TransitionHookResult]
type StateMatchCriterion =
  js.Function2[js.UndefOr[js.Object], js.UndefOr[Transition], Boolean]
type HookMatchCriterion = String | Boolean | StateMatchCriterion

final case class RouterConfig(
    strict: js.UndefOr[Boolean] = js.undefined,
    caseInsensitive: js.UndefOr[Boolean] = js.undefined,
    defaultSquashPolicy: js.UndefOr[Boolean | String] = js.undefined,
    scroll: js.UndefOr[RouterScrollConfig] = js.undefined,
    focus: js.UndefOr[RouterFocusConfig] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "strict" -> strict,
      "caseInsensitive" -> caseInsensitive,
      "defaultSquashPolicy" ->
        defaultSquashPolicy.asInstanceOf[js.UndefOr[js.Any]],
      "scroll" -> scroll
        .map {
          case mode: RouterScrollMode => mode.value
          case options: RouterScrollOptions => options.toJS
          case enabled => enabled.asInstanceOf[js.Any]
        }
        .asInstanceOf[js.UndefOr[js.Any]],
      "focus" -> focus
        .map {
          case options: RouterFocusOptions => options.toJS
          case value => value.asInstanceOf[js.Any]
        }
        .asInstanceOf[js.UndefOr[js.Any]],
    )

final case class RouteContract(
    params: js.UndefOr[js.Dictionary[js.Any]] = js.undefined,
    resolves: js.UndefOr[js.Dictionary[js.Any]] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "params" -> params,
      "resolves" -> resolves,
    )

object StateResolveObject:
  def apply(entries: (String, RouterInjectable)*): StateResolveObject =
    val result = js.Dictionary.empty[RouterInjectable]
    entries.foreach { case (name, resolver) => result(name) = resolver }
    result

object StateResolveArray:
  def apply(entries: js.Object*): StateResolveArray =
    js.Array(entries*)

@js.native
trait ViewService extends js.Object:
  val _ngViews: js.Array[ActiveNgView] = js.native
  val _viewConfigs: js.Array[ViewConfig] = js.native
  def _rootViewContext(): js.UndefOr[js.Object | Null] = js.native
  def _rootViewContext(context: js.Object | Null): js.UndefOr[js.Object | Null] =
    js.native
  def _deactivateViewConfig(viewConfig: ViewConfig): Unit = js.native
  def _activateViewConfig(viewConfig: ViewConfig): Unit = js.native
  def _sync(): Unit = js.native
  def _registerNgView(ngView: ActiveNgView): js.Function0[Unit] = js.native
  def _restoreRetainedView(config: ViewConfig): js.UndefOr[RetainedViewEntry] =
    js.native
  def _destroyRetainedViews(): Unit = js.native

final case class HookMatchCriteria(
    to: js.UndefOr[HookMatchCriterion] = js.undefined,
    from: js.UndefOr[HookMatchCriterion] = js.undefined,
    exiting: js.UndefOr[HookMatchCriterion] = js.undefined,
    retained: js.UndefOr[HookMatchCriterion] = js.undefined,
    entering: js.UndefOr[HookMatchCriterion] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "to" -> to.asInstanceOf[js.UndefOr[js.Any]],
      "from" -> from.asInstanceOf[js.UndefOr[js.Any]],
      "exiting" -> exiting.asInstanceOf[js.UndefOr[js.Any]],
      "retained" -> retained.asInstanceOf[js.UndefOr[js.Any]],
      "entering" -> entering.asInstanceOf[js.UndefOr[js.Any]],
    )

final case class HookRegOptions(
    priority: js.UndefOr[Double] = js.undefined,
    bind: js.UndefOr[js.Any] = js.undefined,
    invokeLimit: js.UndefOr[Int] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "priority" -> priority,
      "bind" -> bind,
      "invokeLimit" -> invokeLimit,
    )

final case class StateNavigationPolicyDeclaration(
    authenticated: js.UndefOr[Boolean] = js.undefined,
    permissions: js.UndefOr[RouteStringList] = js.undefined,
    redirectTo: js.UndefOr[String] = js.undefined,
    publicRoute: js.UndefOr[Boolean] = js.undefined,
    reason: js.UndefOr[String] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "authenticated" -> authenticated,
      "permissions" -> permissions.asInstanceOf[js.UndefOr[js.Any]],
      "redirectTo" -> redirectTo,
      "public" -> publicRoute,
      "reason" -> reason,
    )

@js.native
trait StateTransitionPolicyContext extends js.Object:
  val operation: String = js.native
  val transition: Transition = js.native
  val from: js.Object = js.native
  val to: js.Object = js.native
  val state: js.Object = js.native

@js.native
trait StateTransitionErrorPolicyContext extends js.Object:
  val operation: String = js.native
  val transition: Transition = js.native
  val from: js.Object = js.native
  val to: js.Object = js.native
  val state: js.Object = js.native
  val error: js.Any = js.native

@js.native
trait StateTransitionLoadingPolicyContext extends js.Object:
  val operation: String = js.native
  val transition: Transition = js.native
  val from: js.Object = js.native
  val to: js.Object = js.native
  val state: js.Object = js.native

@js.native
trait StateTransitionRetryPolicyContext extends js.Object:
  val operation: String = js.native
  val transition: js.UndefOr[Transition] = js.native
  val from: js.Object = js.native
  val to: js.Object = js.native
  val state: js.Object = js.native
  val attempt: Int = js.native
  val error: js.UndefOr[js.Any] = js.native

type StateCanExitPolicy = js.Function1[StateTransitionPolicyContext, js.Any]
type StateDirtyPolicy = js.Function1[StateTransitionPolicyContext, Boolean]
type StateRetryPolicy = js.Function1[StateTransitionRetryPolicyContext, Boolean | Double]
type StateErrorBoundaryPolicy = js.Function1[StateTransitionErrorPolicyContext, js.Any]
type StateTransitionLoadingPolicy =
  js.Function1[StateTransitionLoadingPolicyContext, js.Any]
type StateTransitionLoadingConfig = Boolean | String | StateTransitionLoadingPolicy
type StateTransitionFallbackPolicy = String | js.Object
type StateTransitionErrorBoundaryConfig = String | js.Object | StateErrorBoundaryPolicy

final case class StateDirtyPolicyDeclaration(
    when: StateDirtyPolicy,
    prompt: js.UndefOr[String] = js.undefined,
    redirectTo: js.UndefOr[String] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "when" -> when,
      "prompt" -> prompt,
      "redirectTo" -> redirectTo,
    )

final case class StateTransitionPolicyDeclaration(
    canExit: js.UndefOr[StateCanExitPolicy] = js.undefined,
    dirty: js.UndefOr[StateDirtyPolicyDeclaration] = js.undefined,
    retry: js.UndefOr[Boolean | Double | StateRetryPolicy] = js.undefined,
    fallbackTo: js.UndefOr[StateTransitionFallbackPolicy] = js.undefined,
    loading: js.UndefOr[StateTransitionLoadingConfig] = js.undefined,
    errorBoundary: js.UndefOr[StateTransitionErrorBoundaryConfig] = js.undefined,
    error: js.UndefOr[StateTransitionErrorBoundaryConfig] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "canExit" -> canExit,
      "dirty" -> dirty.map(_.toJS),
      "retry" -> retry.asInstanceOf[js.UndefOr[js.Any]],
      "fallbackTo" -> fallbackTo.asInstanceOf[js.UndefOr[js.Any]],
      "loading" -> loading.asInstanceOf[js.UndefOr[js.Any]],
      "errorBoundary" -> errorBoundary.asInstanceOf[js.UndefOr[js.Any]],
      "error" -> error.asInstanceOf[js.UndefOr[js.Any]],
    )

enum StateRetentionMode(val value: String):
  case Destroy extends StateRetentionMode("destroy")
  case KeepAlive extends StateRetentionMode("keep-alive")

enum StateRetentionPauseMode(val value: String):
  case None extends StateRetentionPauseMode("none")
  case Background extends StateRetentionPauseMode("background")
  case Schedulers extends StateRetentionPauseMode("schedulers")

enum StateRetentionEvictionMode(val value: String):
  case Lru extends StateRetentionEvictionMode("lru")
  case Oldest extends StateRetentionEvictionMode("oldest")

@js.native
trait StateRetentionPolicyContext extends js.Object:
  val transition: Transition = js.native
  val state: js.Object = js.native
  val params: js.Dictionary[js.Any] = js.native

@js.native
trait StateRetentionEvictionContext extends js.Object:
  val state: js.Object = js.native
  val key: String = js.native
  val size: Int = js.native
  val max: Int = js.native

type StateRetentionKeyPolicy = js.Function1[StateRetentionPolicyContext, String]
type StateRetentionKeyConfig = String | StateRetentionKeyPolicy
type StateRetentionEvictionPolicy =
  js.Function1[StateRetentionEvictionContext, js.UndefOr[String]]
type StateRetentionEvictionConfig =
  StateRetentionEvictionMode | StateRetentionEvictionPolicy

final case class StateRetentionPolicyDeclaration(
    mode: js.UndefOr[StateRetentionMode] = js.undefined,
    key: js.UndefOr[StateRetentionKeyConfig] = js.undefined,
    max: js.UndefOr[Int] = js.undefined,
    pause: js.UndefOr[StateRetentionPauseMode] = js.undefined,
    evict: js.UndefOr[StateRetentionEvictionConfig] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "mode" -> mode.map(_.value),
      "key" -> key.asInstanceOf[js.UndefOr[js.Any]],
      "max" -> max,
      "pause" -> pause.map(_.value),
      "evict" -> evict
        .map {
          case mode: StateRetentionEvictionMode => mode.value
          case policy => policy.asInstanceOf[js.Any]
        }
        .asInstanceOf[js.UndefOr[js.Any]],
    )

final case class StatePolicyDeclaration(
    navigation: js.UndefOr[StateNavigationPolicyDeclaration] = js.undefined,
    transition: js.UndefOr[StateTransitionPolicyDeclaration] = js.undefined,
    retention: js.UndefOr[StateRetentionPolicyDeclaration] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "navigation" -> navigation.map(_.toJS),
      "transition" -> transition.map(_.toJS),
      "retention" -> retention.map(_.toJS),
    )

final case class StateDeclaration(
    name: String,
    abstractState: js.UndefOr[Boolean] = js.undefined,
    parent: js.UndefOr[String] = js.undefined,
    url: js.UndefOr[String] = js.undefined,
    template: js.UndefOr[String] = js.undefined,
    templateUrl: js.UndefOr[String] = js.undefined,
    component: js.UndefOr[String] = js.undefined,
    redirectTo: js.UndefOr[String] = js.undefined,
    data: js.UndefOr[js.Object] = js.undefined,
    params: js.UndefOr[js.Dictionary[js.Any]] = js.undefined,
    resolve: js.UndefOr[js.Dictionary[js.Function]] = js.undefined,
    policy: js.UndefOr[StatePolicyDeclaration] = js.undefined,
    onEnter: js.UndefOr[js.Function] = js.undefined,
    onRetain: js.UndefOr[js.Function] = js.undefined,
    onExit: js.UndefOr[js.Function] = js.undefined,
    dynamic: js.UndefOr[Boolean] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "name" -> name,
      "abstract" -> abstractState,
      "parent" -> parent,
      "url" -> url,
      "template" -> template,
      "templateUrl" -> templateUrl,
      "component" -> component,
      "redirectTo" -> redirectTo,
      "data" -> data,
      "params" -> params,
      "resolve" -> resolve,
      "policy" -> policy.map(_.toJS),
      "onEnter" -> onEnter,
      "onRetain" -> onRetain,
      "onExit" -> onExit,
      "dynamic" -> dynamic,
    )

final case class RouterModuleDeclaration(
    name: String,
    abstractState: js.UndefOr[Boolean] = js.undefined,
    parent: js.UndefOr[String] = js.undefined,
    url: js.UndefOr[String] = js.undefined,
    template: js.UndefOr[String] = js.undefined,
    templateUrl: js.UndefOr[String] = js.undefined,
    component: js.UndefOr[String] = js.undefined,
    redirectTo: js.UndefOr[String] = js.undefined,
    data: js.UndefOr[js.Object] = js.undefined,
    params: js.UndefOr[js.Dictionary[js.Any]] = js.undefined,
    resolve: js.UndefOr[js.Dictionary[js.Function]] = js.undefined,
    policy: js.UndefOr[StatePolicyDeclaration] = js.undefined,
    onEnter: js.UndefOr[js.Function] = js.undefined,
    onRetain: js.UndefOr[js.Function] = js.undefined,
    onExit: js.UndefOr[js.Function] = js.undefined,
    dynamic: js.UndefOr[Boolean] = js.undefined,
    children: js.UndefOr[js.Array[RouterModuleDeclaration]] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "name" -> name,
      "abstract" -> abstractState,
      "parent" -> parent,
      "url" -> url,
      "template" -> template,
      "templateUrl" -> templateUrl,
      "component" -> component,
      "redirectTo" -> redirectTo,
      "data" -> data,
      "params" -> params,
      "resolve" -> resolve,
      "policy" -> policy.map(_.toJS),
      "onEnter" -> onEnter,
      "onRetain" -> onRetain,
      "onExit" -> onExit,
      "dynamic" -> dynamic,
      "children" -> children.map(_.map(_.toJS)),
    )

final case class TransitionOptions(
    location: js.UndefOr[Boolean | String] = js.undefined,
    inherit: js.UndefOr[Boolean] = js.undefined,
    notifyTransition: js.UndefOr[Boolean] = js.undefined,
    reload: js.UndefOr[Boolean | String] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "location" -> location.asInstanceOf[js.UndefOr[js.Any]],
      "inherit" -> inherit,
      "notify" -> notifyTransition,
      "reload" -> reload.asInstanceOf[js.UndefOr[js.Any]],
    )

@js.native
trait TransitionPromise extends js.Promise[js.Any]:
  val transition: js.Any = js.native

@js.native
trait StateService extends js.Object:
  val params: js.Dictionary[js.Any] = js.native
  val current: js.UndefOr[js.Object] = js.native
  def go(to: String): TransitionPromise = js.native
  def go(to: String, params: js.Dictionary[js.Any]): TransitionPromise = js.native
  def go(
      to: String,
      params: js.Dictionary[js.Any],
      options: js.Object,
  ): TransitionPromise = js.native
  def matches(stateOrName: String): Boolean = js.native
  def matches(stateOrName: String, params: js.Dictionary[js.Any]): Boolean =
    js.native
  def matches(
      stateOrName: String,
      params: js.Dictionary[js.Any],
      options: js.Object,
  ): Boolean = js.native
  def href(stateOrName: String): String | Null = js.native
  def href(stateOrName: String, params: js.Dictionary[js.Any]): String | Null =
    js.native

object StateService:
  extension (service: StateService)
    def go(
        to: String,
        params: js.Dictionary[js.Any],
        options: TransitionOptions,
    ): TransitionPromise =
      service.go(to, params, options.toJS)

@js.native
trait StateRegistryService extends js.Object:
  def root(): js.Object = js.native
  def register(state: js.Object): js.Object = js.native
  def deregister(stateOrName: String): js.Array[js.Object] = js.native
  def getAll(): js.Array[js.Object] = js.native
  def get(): js.Array[js.Object] = js.native
  def get(stateOrName: String): js.Object | Null = js.native

object StateRegistryService:
  extension (service: StateRegistryService)
    def register(state: StateDeclaration): js.Object =
      service.register(state.toJS)

@js.native
trait TransitionsService extends js.Object:
  def onBefore(
      matchCriteria: js.Object,
      callback: TransitionHookFn,
  ): TransitionDeregister = js.native
  def onBefore(
      matchCriteria: js.Object,
      callback: TransitionHookFn,
      options: js.Object,
  ): TransitionDeregister = js.native
  def onStart(
      matchCriteria: js.Object,
      callback: TransitionHookFn,
  ): TransitionDeregister = js.native
  def onStart(
      matchCriteria: js.Object,
      callback: TransitionHookFn,
      options: js.Object,
  ): TransitionDeregister = js.native
  def onEnter(
      matchCriteria: js.Object,
      callback: TransitionStateHookFn,
  ): TransitionDeregister = js.native
  def onEnter(
      matchCriteria: js.Object,
      callback: TransitionStateHookFn,
      options: js.Object,
  ): TransitionDeregister = js.native
  def onRetain(
      matchCriteria: js.Object,
      callback: TransitionStateHookFn,
  ): TransitionDeregister = js.native
  def onRetain(
      matchCriteria: js.Object,
      callback: TransitionStateHookFn,
      options: js.Object,
  ): TransitionDeregister = js.native
  def onExit(
      matchCriteria: js.Object,
      callback: TransitionStateHookFn,
  ): TransitionDeregister = js.native
  def onExit(
      matchCriteria: js.Object,
      callback: TransitionStateHookFn,
      options: js.Object,
  ): TransitionDeregister = js.native
  def onFinish(
      matchCriteria: js.Object,
      callback: TransitionHookFn,
  ): TransitionDeregister = js.native
  def onFinish(
      matchCriteria: js.Object,
      callback: TransitionHookFn,
      options: js.Object,
  ): TransitionDeregister = js.native
  def onSuccess(
      matchCriteria: js.Object,
      callback: TransitionHookFn,
  ): TransitionDeregister = js.native
  def onSuccess(
      matchCriteria: js.Object,
      callback: TransitionHookFn,
      options: js.Object,
  ): TransitionDeregister = js.native
  def onError(
      matchCriteria: js.Object,
      callback: TransitionHookFn,
  ): TransitionDeregister = js.native
  def onError(
      matchCriteria: js.Object,
      callback: TransitionHookFn,
      options: js.Object,
  ): TransitionDeregister = js.native

object TransitionsService:
  extension (service: TransitionsService)
    def before(
        matchCriteria: HookMatchCriteria,
        callback: TransitionHookFn,
        options: HookRegOptions = HookRegOptions(),
    ): TransitionDeregister =
      service.onBefore(matchCriteria.toJS, callback, options.toJS)

    def start(
        matchCriteria: HookMatchCriteria,
        callback: TransitionHookFn,
        options: HookRegOptions = HookRegOptions(),
    ): TransitionDeregister =
      service.onStart(matchCriteria.toJS, callback, options.toJS)

    def enter(
        matchCriteria: HookMatchCriteria,
        callback: TransitionStateHookFn,
        options: HookRegOptions = HookRegOptions(),
    ): TransitionDeregister =
      service.onEnter(matchCriteria.toJS, callback, options.toJS)

    def retain(
        matchCriteria: HookMatchCriteria,
        callback: TransitionStateHookFn,
        options: HookRegOptions = HookRegOptions(),
    ): TransitionDeregister =
      service.onRetain(matchCriteria.toJS, callback, options.toJS)

    def exit(
        matchCriteria: HookMatchCriteria,
        callback: TransitionStateHookFn,
        options: HookRegOptions = HookRegOptions(),
    ): TransitionDeregister =
      service.onExit(matchCriteria.toJS, callback, options.toJS)

    def finish(
        matchCriteria: HookMatchCriteria,
        callback: TransitionHookFn,
        options: HookRegOptions = HookRegOptions(),
    ): TransitionDeregister =
      service.onFinish(matchCriteria.toJS, callback, options.toJS)

    def success(
        matchCriteria: HookMatchCriteria,
        callback: TransitionHookFn,
        options: HookRegOptions = HookRegOptions(),
    ): TransitionDeregister =
      service.onSuccess(matchCriteria.toJS, callback, options.toJS)

    def error(
        matchCriteria: HookMatchCriteria,
        callback: TransitionHookFn,
        options: HookRegOptions = HookRegOptions(),
    ): TransitionDeregister =
      service.onError(matchCriteria.toJS, callback, options.toJS)

@js.native
trait ServiceWorkerService extends js.Object:
  val supported: Boolean = js.native
  val status: String = js.native
  val controller: dom.ServiceWorker | Null = js.native
  val registration: dom.ServiceWorkerRegistration | Null = js.native
  val registrationState: ServiceWorkerRegistrationState = js.native
  val updateState: ServiceWorkerUpdateState = js.native
  def register(scriptUrl: String): js.Promise[dom.ServiceWorkerRegistration] =
    js.native
  def register(
      scriptUrl: String,
      options: js.Object,
  ): js.Promise[dom.ServiceWorkerRegistration] = js.native
  def register(scriptUrl: dom.URL): js.Promise[dom.ServiceWorkerRegistration] =
    js.native
  def register(
      scriptUrl: dom.URL,
      options: js.Object,
  ): js.Promise[dom.ServiceWorkerRegistration] = js.native
  def ready(): js.Promise[dom.ServiceWorkerRegistration] = js.native
  def update(): js.Promise[dom.ServiceWorkerRegistration] = js.native
  def unregister(): js.Promise[Boolean] = js.native
  def post(message: js.Any): js.Promise[Unit] = js.native
  def post(
      message: js.Any,
      transfer: js.Array[js.Any],
      target: String,
  ): js.Promise[Unit] = js.native
  def request[A](message: js.Any): js.Promise[A] = js.native
  def request[A](message: js.Any, options: js.Object): js.Promise[A] = js.native
  def onMessage[A](
      callback: js.Function1[ServiceWorkerMessageEvent[A], Unit],
  ): js.Function0[Unit] = js.native
  def onControllerChange(
      callback: js.Function1[dom.ServiceWorker | Null, Unit],
  ): js.Function0[Unit] = js.native
  def onUpdate(
      callback: js.Function1[ServiceWorkerUpdateState, Unit],
  ): js.Function0[Unit] = js.native

object ServiceWorkerService:
  extension (service: ServiceWorkerService)
    def register(
        scriptUrl: String,
        config: ServiceWorkerConfig,
    ): js.Promise[dom.ServiceWorkerRegistration] =
      service.register(scriptUrl, config.toJS)

    def register(
        scriptUrl: dom.URL,
        config: ServiceWorkerConfig,
    ): js.Promise[dom.ServiceWorkerRegistration] =
      service.register(scriptUrl, config.toJS)

    def post(
        message: js.Any,
        transfer: js.Array[js.Any],
        target: ServiceWorkerMessageTarget,
    ): js.Promise[Unit] =
      service.post(message, transfer, target.value)

    def requestWithOptions[A](
        message: js.Any,
        options: ServiceWorkerRequestOptions,
    ): js.Promise[A] =
      service.request[A](message, options.toJS)

type EntityClass[A] = js.Function

@js.native
trait RestRequest extends js.Object:
  val method: String = js.native
  val url: String = js.native
  val collectionUrl: js.UndefOr[String] = js.native
  val id: js.UndefOr[js.Any] = js.native
  val data: js.UndefOr[js.Any] = js.native
  val params: js.UndefOr[js.Dictionary[js.Any]] = js.native
  val options: js.UndefOr[js.Dictionary[js.Any]] = js.native

@js.native
trait RestResponse[+A] extends js.Object:
  val data: A = js.native
  val status: js.UndefOr[Int] = js.native
  val statusText: js.UndefOr[String] = js.native
  val headers: js.UndefOr[js.Any] = js.native
  val config: js.UndefOr[js.Any] = js.native
  val source: js.UndefOr[String] = js.native
  val stale: js.UndefOr[Boolean] = js.native

@js.native
trait RestBackend extends js.Object:
  def request[A](request: RestRequest): js.Promise[RestResponse[A]] = js.native

enum RestCacheStrategy(val value: String):
  case CacheFirst extends RestCacheStrategy("cache-first")
  case NetworkFirst extends RestCacheStrategy("network-first")
  case StaleWhileRevalidate extends RestCacheStrategy("stale-while-revalidate")

@js.native
trait RestCachePolicyContext extends PolicyContext:
  val method: String = js.native
  val url: String = js.native
  val collectionUrl: js.UndefOr[String] = js.native
  val id: js.UndefOr[js.Any] = js.native
  val params: js.UndefOr[js.Dictionary[js.Any]] = js.native
  val options: js.UndefOr[js.Dictionary[js.Any]] = js.native
  val cacheKey: String = js.native

type RestCachePolicy = Policy[RestCachePolicyContext, PolicyDecision]

@js.native
trait RestCacheStore extends js.Object:
  def get[A](key: String): js.Promise[RestResponse[A] | Unit] = js.native
  def set[A](key: String, response: RestResponse[A]): js.Promise[Unit] = js.native
  def delete(key: String): js.Promise[Unit] = js.native
  def deletePrefix(prefix: String): js.Promise[Unit] = js.native

@js.native
trait RestRevalidateEvent[+A] extends js.Object:
  val key: String = js.native
  val request: RestRequest = js.native
  val response: RestResponse[A] = js.native

final case class CachedRestBackendOptions(
    network: RestBackend,
    cache: RestCacheStore,
    strategy: js.UndefOr[RestCacheStrategy] = js.undefined,
    policy: js.UndefOr[RestCachePolicy] = js.undefined,
    onRevalidate: js.UndefOr[js.Function1[RestRevalidateEvent[js.Any], Unit]] =
      js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "network" -> network,
      "cache" -> cache,
      "strategy" -> strategy.map(_.value),
      "policy" -> policy,
      "onRevalidate" -> onRevalidate,
    )

final case class RestOptions(
    backend: js.UndefOr[RestBackend] = js.undefined,
    extra: js.Dictionary[js.Any] = js.Dictionary.empty,
):
  private[ts] def toJS: js.Object =
    val result = js.Dynamic.literal()

    extra.foreach { case (name, value) =>
      result.updateDynamic(name)(value)
    }
    if !js.isUndefined(backend) then result.updateDynamic("backend")(backend)

    result.asInstanceOf[js.Object]

final case class RestConfig(
    defaults: js.UndefOr[RestOptions] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "defaults" -> defaults.map(_.toJS),
    )

@js.native
trait RestService[A, ID] extends js.Object:
  def list(): js.Promise[js.Array[A]] = js.native
  def list(params: js.Dictionary[js.Any]): js.Promise[js.Array[A]] = js.native
  def get(id: ID): js.Promise[A | Null] = js.native
  def get(id: ID, params: js.Dictionary[js.Any]): js.Promise[A | Null] =
    js.native
  def create(item: A): js.Promise[A | Null] = js.native
  def update(id: ID, item: js.Any): js.Promise[A | Null] = js.native
  def delete(id: ID): js.Promise[Unit] = js.native

@js.native
trait RestFactory extends js.Object:
  def apply[A, ID](baseUrl: String): RestService[A, ID] = js.native
  def apply[A, ID](
      baseUrl: String,
      entityClass: EntityClass[A],
  ): RestService[A, ID] = js.native
  def apply[A, ID](
      baseUrl: String,
      entityClass: EntityClass[A],
      options: js.Object,
  ): RestService[A, ID] = js.native

object RestFactory:
  extension (factory: RestFactory)
    def resource[A, ID](
        baseUrl: String,
        entityClass: js.UndefOr[EntityClass[A]] = js.undefined,
        options: RestOptions = RestOptions(),
    ): RestService[A, ID] =
      if js.isUndefined(entityClass) then factory.apply[A, ID](baseUrl)
      else factory.apply[A, ID](baseUrl, entityClass.get, options.toJS)

@js.native
trait LogService extends js.Object:
  def debug(args: js.Any*): Unit = js.native
  def error(args: js.Any*): Unit = js.native
  def info(args: js.Any*): Unit = js.native
  def log(args: js.Any*): Unit = js.native
  def warn(args: js.Any*): Unit = js.native

type SceContext = String

object SceContexts:
  val Html: SceContext = "html"
  val MediaUrl: SceContext = "mediaUrl"
  val Url: SceContext = "url"
  val ResourceUrl: SceContext = "resourceUrl"

@js.native
trait SceService extends js.Object:
  def getTrusted(context: SceContext, mayBeTrusted: js.Any): js.Any = js.native
  def getTrustedHtml(value: js.Any): js.Any = js.native
  def getTrustedResourceUrl(value: js.Any): js.Any = js.native
  def getTrustedUrl(value: js.Any): js.Any = js.native
  def getTrustedMediaUrl(value: js.Any): js.Any = js.native
  def parse(context: SceContext, expression: String): js.Function = js.native
  def parseAsHtml(expression: String): js.Function = js.native
  def parseAsResourceUrl(expression: String): js.Function = js.native
  def parseAsUrl(expression: String): js.Function = js.native
  def parseAsMediaUrl(expression: String): js.Function = js.native
  def trustAs(context: SceContext, value: js.Any): js.Any = js.native
  def trustAsHtml(value: js.Any): js.Any = js.native
  def trustAsResourceUrl(value: js.Any): js.Any = js.native
  def trustAsUrl(value: js.Any): js.Any = js.native
  def trustAsMediaUrl(value: js.Any): js.Any = js.native
  def isEnabled(): Boolean = js.native
  def valueOf(value: js.UndefOr[js.Any] = js.undefined): js.Any = js.native

@js.native
trait SceDelegateService extends js.Object:
  def getTrusted(context: SceContext, mayBeTrusted: js.Any): js.Any = js.native
  def trustAs(context: SceContext, value: js.Any): js.Any = js.native
  def valueOf(value: js.UndefOr[js.Any] = js.undefined): js.Any = js.native

final case class SceConfig(
    enabled: js.UndefOr[Boolean] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "enabled" -> enabled,
    )

type SceResourceUrlMatcher = String | js.RegExp

final case class SceDelegateConfig(
    trustedResourceUrlList:
        js.UndefOr[js.Array[SceResourceUrlMatcher] | Null] = js.undefined,
    bannedResourceUrlList:
        js.UndefOr[js.Array[SceResourceUrlMatcher] | Null] = js.undefined,
    aHrefSanitizationTrustedUrlList: js.UndefOr[js.RegExp] = js.undefined,
    imgSrcSanitizationTrustedUrlList: js.UndefOr[js.RegExp] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "trustedResourceUrlList" -> trustedResourceUrlList
        .asInstanceOf[js.UndefOr[js.Any]],
      "bannedResourceUrlList" -> bannedResourceUrlList
        .asInstanceOf[js.UndefOr[js.Any]],
      "aHrefSanitizationTrustedUrlList" -> aHrefSanitizationTrustedUrlList,
      "imgSrcSanitizationTrustedUrlList" -> imgSrcSanitizationTrustedUrlList,
    )

enum EventDeliveryDecisionType(val value: String):
  case Deliver extends EventDeliveryDecisionType("deliver")
  case Drop extends EventDeliveryDecisionType("drop")

@js.native
trait EventDeliveryPolicyContext extends PolicyContext:
  override val operation: String = js.native
  val topic: String = js.native
  val args: js.Array[js.Any] = js.native
  val listenerIndex: Int = js.native
  val scopeOwned: Boolean = js.native
  val targetAlive: Boolean = js.native

type EventDeliveryPolicy = Policy[EventDeliveryPolicyContext, PolicyDecision]

final case class EventBusConfig(
    deliveryPolicy: js.UndefOr[EventDeliveryPolicy] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "deliveryPolicy" -> deliveryPolicy,
    )

type EventBusListener = js.Function

@js.native
trait EventBusService extends js.Object:
  def reset(): Unit = js.native
  def setDeliveryPolicy(): Unit = js.native
  def setDeliveryPolicy(policy: EventDeliveryPolicy): Unit = js.native
  def isDisposed(): Boolean = js.native
  def dispose(): Unit = js.native
  def subscribe(topic: String, fn: EventBusListener): js.Function0[Boolean] =
    js.native
  def subscribe(
      topic: String,
      fn: EventBusListener,
      context: js.Any,
  ): js.Function0[Boolean] = js.native
  def subscribeOnce(topic: String, fn: EventBusListener): js.Function0[Boolean] =
    js.native
  def subscribeOnce(
      topic: String,
      fn: EventBusListener,
      context: js.Any,
  ): js.Function0[Boolean] = js.native
  def unsubscribe(topic: String, fn: EventBusListener): Boolean = js.native
  def unsubscribe(
      topic: String,
      fn: EventBusListener,
      context: js.Any,
  ): Boolean = js.native
  def getCount(topic: String): Int = js.native
  def publish(topic: String, args: js.Any*): Boolean = js.native

@js.native
trait ConnectionEvent[+A] extends js.Object:
  val `type`: String = js.native
  val data: A = js.native
  val rawData: js.Any = js.native
  val event: dom.Event | dom.MessageEvent = js.native

final case class ConnectionConfig(
    onOpen: js.UndefOr[js.Function1[dom.Event, Unit]] = js.undefined,
    onMessage: js.UndefOr[js.Function2[js.Any, dom.Event | dom.MessageEvent, Unit]] =
      js.undefined,
    onEvent: js.UndefOr[js.Function1[ConnectionEvent[js.Any], Unit]] =
      js.undefined,
    onError: js.UndefOr[js.Function1[dom.Event, Unit]] = js.undefined,
    onClose: js.UndefOr[js.Function1[dom.CloseEvent, Unit]] = js.undefined,
    onReconnect: js.UndefOr[js.Function1[Int, Unit]] = js.undefined,
    retryDelay: js.UndefOr[Double] = js.undefined,
    maxRetries: js.UndefOr[Double] = js.undefined,
    heartbeatTimeout: js.UndefOr[Double] = js.undefined,
    transformMessage: js.UndefOr[js.Function1[String, js.Any]] = js.undefined,
    eventTypes: js.UndefOr[js.Array[String]] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "onOpen" -> onOpen,
      "onMessage" -> onMessage,
      "onEvent" -> onEvent,
      "onError" -> onError,
      "onClose" -> onClose,
      "onReconnect" -> onReconnect,
      "retryDelay" -> retryDelay.asInstanceOf[js.UndefOr[js.Any]],
      "maxRetries" -> maxRetries,
      "heartbeatTimeout" -> heartbeatTimeout,
      "transformMessage" -> transformMessage,
      "eventTypes" -> eventTypes,
    )

final case class SseConfig(
    withCredentials: js.UndefOr[Boolean] = js.undefined,
    params: js.UndefOr[js.Dictionary[js.Any]] = js.undefined,
    connection: ConnectionConfig = ConnectionConfig(),
):
  private[ts] def toJS: js.Object =
    val base = connection.toJS.asInstanceOf[js.Dynamic]

    if !js.isUndefined(withCredentials) then
      base.updateDynamic("withCredentials")(withCredentials)
    if !js.isUndefined(params) then base.updateDynamic("params")(params)
    base.asInstanceOf[js.Object]

@js.native
trait SseConnection extends js.Object:
  def close(): Unit = js.native
  def reconnect(): Unit = js.native

@js.native
trait SseService extends js.Object:
  def apply(url: String): SseConnection = js.native
  def apply(url: String, config: js.Object): SseConnection = js.native

object SseService:
  extension (service: SseService)
    def connect(url: String, config: SseConfig): SseConnection =
      service.apply(url, config.toJS)

@js.native
trait RealtimeProtocolMessage extends js.Object:
  val data: js.UndefOr[js.Any] = js.native
  val html: js.UndefOr[js.Any] = js.native
  val target: js.UndefOr[String] = js.native
  val swap: js.UndefOr[String] = js.native

enum SwapMode(val value: String):
  case InnerHTML extends SwapMode("innerHTML")
  case OuterHTML extends SwapMode("outerHTML")
  case TextContent extends SwapMode("textContent")
  case BeforeBegin extends SwapMode("beforebegin")
  case AfterBegin extends SwapMode("afterbegin")
  case BeforeEnd extends SwapMode("beforeend")
  case AfterEnd extends SwapMode("afterend")
  case Delete extends SwapMode("delete")
  case None extends SwapMode("none")

object RealtimeProtocolMessage:
  def apply(
      data: js.UndefOr[js.Any] = js.undefined,
      html: js.UndefOr[js.Any] = js.undefined,
      target: js.UndefOr[String] = js.undefined,
      swap: js.UndefOr[SwapMode] = js.undefined,
  ): RealtimeProtocolMessage =
    JsObjectBuilder(
      "data" -> data,
      "html" -> html,
      "target" -> target,
      "swap" -> swap.map(_.value),
    ).asInstanceOf[RealtimeProtocolMessage]

@js.native
trait RealtimeProtocolEventDetail[+A, +Source] extends js.Object:
  val data: js.UndefOr[A] = js.native
  val event: js.UndefOr[dom.Event | dom.MessageEvent | Null] = js.native
  val source: js.UndefOr[Source] = js.native
  val url: js.UndefOr[String] = js.native
  val error: js.UndefOr[js.Any] = js.native

object RealtimeProtocolEventDetail:
  def apply[A, Source](
      data: js.UndefOr[A] = js.undefined,
      event: js.UndefOr[dom.Event | dom.MessageEvent | Null] = js.undefined,
      source: js.UndefOr[Source] = js.undefined,
      url: js.UndefOr[String] = js.undefined,
      error: js.UndefOr[js.Any] = js.undefined,
  ): RealtimeProtocolEventDetail[A, Source] =
    JsObjectBuilder(
      "data" -> data.asInstanceOf[js.UndefOr[js.Any]],
      "event" -> event.asInstanceOf[js.UndefOr[js.Any]],
      "source" -> source.asInstanceOf[js.UndefOr[js.Any]],
      "url" -> url,
      "error" -> error,
    ).asInstanceOf[RealtimeProtocolEventDetail[A, Source]]

final case class WebSocketConfig(
    protocols: js.UndefOr[js.Array[String]] = js.undefined,
    onProtocolMessage: js.UndefOr[
      js.Function2[RealtimeProtocolMessage, dom.Event | dom.MessageEvent, Unit]
    ] = js.undefined,
    connection: ConnectionConfig = ConnectionConfig(),
):
  private[ts] def toJS: js.Object =
    val base = connection.toJS.asInstanceOf[js.Dynamic]

    if !js.isUndefined(protocols) then base.updateDynamic("protocols")(protocols)
    if !js.isUndefined(onProtocolMessage) then
      base.updateDynamic("onProtocolMessage")(onProtocolMessage)

    base.asInstanceOf[js.Object]

@js.native
trait WebSocketConnection extends js.Object:
  def reconnect(): Unit = js.native
  def send(data: js.Any): Unit = js.native
  def close(): Unit = js.native

@js.native
trait WebSocketService extends js.Object:
  def apply(url: String): WebSocketConnection = js.native
  def apply(url: String, config: js.Object): WebSocketConnection = js.native

object WebSocketService:
  extension (service: WebSocketService)
    def connect(url: String, config: WebSocketConfig): WebSocketConnection =
      service.apply(url, config.toJS)

type WebTransportBufferInput =
  String | js.typedarray.ArrayBuffer | js.typedarray.Uint8Array

enum WebTransportCongestionControl(val value: String):
  case Default extends WebTransportCongestionControl("default")
  case Throughput extends WebTransportCongestionControl("throughput")
  case LowLatency extends WebTransportCongestionControl("low-latency")

final case class WebTransportCertificateHash(
    algorithm: String = "sha-256",
    value: js.Any,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "algorithm" -> algorithm,
      "value" -> value,
    )

final case class WebTransportOptions(
    allowPooling: js.UndefOr[Boolean] = js.undefined,
    congestionControl: js.UndefOr[WebTransportCongestionControl] = js.undefined,
    requireUnreliable: js.UndefOr[Boolean] = js.undefined,
    serverCertificateHashes: js.UndefOr[js.Array[WebTransportCertificateHash]] =
      js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "allowPooling" -> allowPooling,
      "congestionControl" -> congestionControl.map(_.value),
      "requireUnreliable" -> requireUnreliable,
      "serverCertificateHashes" ->
        serverCertificateHashes.map(_.map(_.toJS)),
    )

final case class WebTransportCloseInfo(
    closeCode: js.UndefOr[Int] = js.undefined,
    reason: js.UndefOr[String] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "closeCode" -> closeCode,
      "reason" -> reason,
    )

@js.native
trait NativeWebTransport extends js.Object:
  val ready: js.Promise[Unit] = js.native
  val closed: js.Promise[js.Any] = js.native
  val datagrams: js.Object = js.native
  val incomingUnidirectionalStreams: js.UndefOr[js.Any] = js.native
  def close(): Unit = js.native
  def close(closeInfo: js.Object): Unit = js.native
  def createBidirectionalStream(): js.Promise[js.Any] = js.native
  def createUnidirectionalStream(): js.Promise[js.Any] = js.native

@js.native
trait WebTransportDatagramEvent[+A] extends js.Object:
  val data: js.typedarray.Uint8Array = js.native
  val message: A = js.native

@js.native
trait WebTransportReconnectEvent extends js.Object:
  val connection: WebTransportConnection = js.native
  val attempt: Int = js.native
  val error: js.UndefOr[js.Any] = js.native
  val url: String = js.native

type WebTransportRetryDelay = Double | js.Function2[Int, js.UndefOr[js.Any], Double]

final case class WebTransportConfig(
    allowPooling: js.UndefOr[Boolean] = js.undefined,
    congestionControl: js.UndefOr[WebTransportCongestionControl] = js.undefined,
    requireUnreliable: js.UndefOr[Boolean] = js.undefined,
    serverCertificateHashes: js.UndefOr[js.Array[WebTransportCertificateHash]] =
      js.undefined,
    onOpen: js.UndefOr[js.Function0[Unit]] = js.undefined,
    onClose: js.UndefOr[js.Function0[Unit]] = js.undefined,
    onError: js.UndefOr[js.Function1[js.Any, Unit]] = js.undefined,
    onDatagram: js.UndefOr[js.Function1[WebTransportDatagramEvent[js.Any], Unit]] =
      js.undefined,
    onProtocolMessage: js.UndefOr[
      js.Function2[
        RealtimeProtocolMessage,
        WebTransportDatagramEvent[RealtimeProtocolMessage],
        Unit,
      ]
    ] = js.undefined,
    transformDatagram: js.UndefOr[js.Function1[js.typedarray.Uint8Array, js.Any]] =
      js.undefined,
    reconnect: js.UndefOr[Boolean] = js.undefined,
    retryDelay: js.UndefOr[WebTransportRetryDelay] = js.undefined,
    maxRetries: js.UndefOr[Double] = js.undefined,
    onReconnect: js.UndefOr[js.Function1[WebTransportReconnectEvent, Unit]] =
      js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "allowPooling" -> allowPooling,
      "congestionControl" -> congestionControl.map(_.value),
      "requireUnreliable" -> requireUnreliable,
      "serverCertificateHashes" ->
        serverCertificateHashes.map(_.map(_.toJS)),
      "onOpen" -> onOpen,
      "onClose" -> onClose,
      "onError" -> onError,
      "onDatagram" -> onDatagram,
      "onProtocolMessage" -> onProtocolMessage,
      "transformDatagram" -> transformDatagram,
      "reconnect" -> reconnect,
      "retryDelay" -> retryDelay.asInstanceOf[js.UndefOr[js.Any]],
      "maxRetries" -> maxRetries,
      "onReconnect" -> onReconnect,
    )

@js.native
trait WebTransportConnection extends js.Object:
  val ready: js.Promise[WebTransportConnection] = js.native
  val closed: js.Promise[Unit] = js.native
  val transport: NativeWebTransport = js.native
  def sendDatagram(data: WebTransportBufferInput): js.Promise[Unit] = js.native
  def sendText(data: String): js.Promise[Unit] = js.native
  def sendStream(data: WebTransportBufferInput): js.Promise[Unit] = js.native
  def createBidirectionalStream(): js.Promise[js.Any] = js.native
  def close(): Unit = js.native
  def close(closeInfo: js.Object): Unit = js.native

object WebTransportConnection:
  extension (connection: WebTransportConnection)
    def close(closeInfo: WebTransportCloseInfo): Unit =
      connection.close(closeInfo.toJS)

@js.native
trait WebTransportService extends js.Object:
  def apply(url: String): WebTransportConnection = js.native
  def apply(url: String, config: js.Object): WebTransportConnection = js.native

object WebTransportService:
  extension (service: WebTransportService)
    def connect(url: String, config: WebTransportConfig): WebTransportConnection =
      service.apply(url, config.toJS)

final case class WasmLoadOptions(
    source: String,
    imports: js.UndefOr[js.Object] = js.undefined,
    compile: js.UndefOr[WasmCompileOptions] = js.undefined,
    diagnostics: js.UndefOr[Boolean] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "source" -> source,
      "imports" -> imports,
      "compile" -> compile.map(_.toJS),
      "diagnostics" -> diagnostics,
    )

final case class WasmCompileOptions(
    builtins: js.UndefOr[js.Array[String]] = js.undefined,
    importedStringConstants: js.UndefOr[String] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "builtins" -> builtins,
      "importedStringConstants" -> importedStringConstants,
    )

final case class WasmBindingOptions(
    name: js.UndefOr[String] = js.undefined,
    watch: js.UndefOr[js.Array[String]] = js.undefined,
    initial: js.UndefOr[Boolean] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "name" -> name,
      "watch" -> watch,
      "initial" -> initial,
    )

@js.native
trait WasmMemory extends js.Object:
  val buffer: js.typedarray.ArrayBuffer = js.native

@js.native
trait WasmAbiExports extends js.Object:
  val memory: WasmMemory = js.native
  def ng_abi_alloc(size: Int): Int = js.native
  def ng_abi_free(ptr: Int, size: Int): Unit = js.native
  val ng_scope_on_bind: js.UndefOr[js.Function3[Int, Int, Int, Unit]] =
    js.native
  val ng_scope_on_unbind: js.UndefOr[js.Function1[Int, Unit]] = js.native
  val ng_scope_on_update
      : js.UndefOr[js.Function5[Int, Int, Int, Int, Int, Unit]] = js.native

final case class WasmScopeOptions(
    name: js.UndefOr[String] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "name" -> name,
    )

type WasmScopeReference = Int | String

@js.native
trait WasmScopeUpdate extends js.Object:
  val scopeHandle: Int = js.native
  val scopeName: String = js.native
  val path: String = js.native
  val value: js.Any = js.native

object WasmScopeUpdate:
  def apply(
      scopeHandle: Int,
      scopeName: String,
      path: String,
      value: js.Any,
  ): WasmScopeUpdate =
    JsObjectBuilder(
      "scopeHandle" -> scopeHandle,
      "scopeName" -> scopeName,
      "path" -> path,
      "value" -> value,
    ).asInstanceOf[WasmScopeUpdate]

final case class WasmScopeBindingOptions(
    watch: js.UndefOr[js.Array[String]] = js.undefined,
    initial: js.UndefOr[Boolean] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "watch" -> watch,
      "initial" -> initial,
    )

final case class WasmScopeWatchOptions(
    initial: js.UndefOr[Boolean] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "initial" -> initial,
    )

@js.native
trait WasmScopeAbiImports extends js.Object:
  def scope_resolve(namePtr: Int, nameLen: Int): Int = js.native
  def scope_get(scopeHandle: Int, pathPtr: Int, pathLen: Int): Int = js.native
  def scope_set(
      scopeHandle: Int,
      pathPtr: Int,
      pathLen: Int,
      valuePtr: Int,
      valueLen: Int,
  ): Int = js.native
  def scope_delete(scopeHandle: Int, pathPtr: Int, pathLen: Int): Int =
    js.native
  def scope_sync(scopeHandle: Int): Int = js.native
  def scope_watch(scopeHandle: Int, pathPtr: Int, pathLen: Int): Int =
    js.native
  def scope_unwatch(watchHandle: Int): Int = js.native
  def scope_unbind(scopeHandle: Int): Int = js.native
  def buffer_ptr(bufferHandle: Int): Int = js.native
  def buffer_len(bufferHandle: Int): Int = js.native
  def buffer_free(bufferHandle: Int): Unit = js.native

@js.native
trait WasmScopeAbiImportObject extends js.Object:
  val angular_ts: WasmScopeAbiImports = js.native

@js.native
trait WasmScope extends js.Object:
  val handle: Int = js.native
  val name: String = js.native
  val disposed: Boolean = js.native
  def get(path: String): js.Any = js.native
  def set(path: String, value: js.Any): Boolean = js.native
  def delete(path: String): Boolean = js.native
  def sync(): Unit = js.native
  def onSync(callback: js.Function0[Unit]): js.Function0[Unit] = js.native
  def watch(
      path: String,
      callback: js.Function1[WasmScopeUpdate, Unit],
  ): js.Function0[Unit] = js.native
  def watch(
      path: String,
      callback: js.Function1[WasmScopeUpdate, Unit],
      options: js.Object,
  ): js.Function0[Unit] = js.native
  def bind(): js.Function0[Unit] = js.native
  def bind(options: js.Object): js.Function0[Unit] = js.native
  def dispose(): Unit = js.native

object WasmScope:
  extension (scope: WasmScope)
    def watch(
        path: String,
        callback: js.Function1[WasmScopeUpdate, Unit],
        options: WasmScopeWatchOptions,
    ): js.Function0[Unit] =
      scope.watch(path, callback, options.toJS)

    def bind(
        options: WasmScopeBindingOptions,
    ): js.Function0[Unit] =
      scope.bind(options.toJS)

@js.native
trait WasmScopeAbi extends js.Object:
  val imports: WasmScopeAbiImportObject = js.native
  val disposed: Boolean = js.native
  def attach(exports: js.Object): Unit = js.native
  def createScope(scope: Scope): WasmScope = js.native
  def createScope(scope: Scope, options: js.Object): WasmScope = js.native
  def getScope(reference: WasmScopeReference): js.UndefOr[WasmScope] = js.native
  def dispose(): Unit = js.native

object WasmScopeAbi:
  extension (abi: WasmScopeAbi)
    def createScope(scope: Scope, options: WasmScopeOptions): WasmScope =
      abi.createScope(scope, options.toJS)

@js.native
trait WasmError extends js.Error:
  val code: String = js.native
  val source: js.UndefOr[String | dom.URL] = js.native

@js.native
trait WasmBinding extends js.Object:
  val name: String = js.native
  val target: Scope = js.native
  val disposed: Boolean = js.native
  def dispose(): Unit = js.native

@js.native
trait WasmResource extends js.Object:
  val source: String | dom.URL = js.native
  val status: String = js.native
  val ready: js.Promise[WasmResource] = js.native
  val error: js.UndefOr[WasmError] = js.native
  val instance: js.Object = js.native
  val module: js.Object = js.native
  val exports: js.Dynamic = js.native
  val disposed: Boolean = js.native
  def bind(target: Scope): js.Promise[WasmBinding] = js.native
  def bind(target: Scope, options: js.Object): js.Promise[WasmBinding] = js.native
  def dispose(): Unit = js.native

object WasmResource:
  extension (resource: WasmResource)
    def bind(
        target: Scope,
        options: WasmBindingOptions,
    ): js.Promise[WasmBinding] =
      resource.bind(target, options.toJS)

@js.native
trait WasmService extends js.Object:
  def load(options: js.Object): WasmResource = js.native

object WasmService:
  extension (service: WasmService)
    def load(options: WasmLoadOptions): WasmResource =
      service.load(options.toJS)

type ReadableByteStream = js.Object

final case class StreamReadOptions(
    encoding: js.UndefOr[String] = js.undefined,
    signal: js.UndefOr[dom.AbortSignal] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "encoding" -> encoding,
      "signal" -> signal,
    )

final case class TextStreamReadOptions(
    encoding: js.UndefOr[String] = js.undefined,
    signal: js.UndefOr[dom.AbortSignal] = js.undefined,
    onChunk: js.UndefOr[js.Function1[String, Unit]] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "encoding" -> encoding,
      "signal" -> signal,
      "onChunk" -> onChunk,
    )

final case class LineStreamReadOptions(
    encoding: js.UndefOr[String] = js.undefined,
    signal: js.UndefOr[dom.AbortSignal] = js.undefined,
    separator: js.UndefOr[String | js.RegExp] = js.undefined,
    onLine: js.UndefOr[js.Function1[String, Unit]] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "encoding" -> encoding,
      "signal" -> signal,
      "separator" -> separator.asInstanceOf[js.UndefOr[js.Any]],
      "onLine" -> onLine,
    )

final case class JsonLineStreamReadOptions[A](
    encoding: js.UndefOr[String] = js.undefined,
    signal: js.UndefOr[dom.AbortSignal] = js.undefined,
    separator: js.UndefOr[String | js.RegExp] = js.undefined,
    onLine: js.UndefOr[js.Function1[String, Unit]] = js.undefined,
    onValue: js.UndefOr[js.Function2[A, String, Unit]] = js.undefined,
    ignoreEmpty: js.UndefOr[Boolean] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "encoding" -> encoding,
      "signal" -> signal,
      "separator" -> separator.asInstanceOf[js.UndefOr[js.Any]],
      "onLine" -> onLine,
      "onValue" -> onValue,
      "ignoreEmpty" -> ignoreEmpty,
    )

@js.native
trait StreamService extends js.Object:
  def isReadableStream(value: js.Any): Boolean = js.native
  def consumeText(
      stream: ReadableByteStream,
      options: js.UndefOr[js.Object] = js.undefined,
  ): js.Promise[Unit] = js.native
  def readText(
      stream: ReadableByteStream,
      options: js.UndefOr[js.Object] = js.undefined,
  ): js.Promise[String] = js.native
  def readLines(
      stream: ReadableByteStream,
      options: js.UndefOr[js.Object] = js.undefined,
  ): js.Promise[js.Array[String]] = js.native
  def consumeJsonLines[A](
      stream: ReadableByteStream,
      options: js.UndefOr[js.Object] = js.undefined,
  ): js.Promise[Unit] = js.native
  def readJsonLines[A](
      stream: ReadableByteStream,
      options: js.UndefOr[js.Object] = js.undefined,
  ): js.Promise[js.Array[A]] = js.native

object StreamService:
  extension (service: StreamService)
    def consumeTextWithOptions(
        stream: ReadableByteStream,
        options: TextStreamReadOptions,
    ): js.Promise[Unit] =
      service.consumeText(stream, options.toJS)

    def readTextWithOptions(
        stream: ReadableByteStream,
        options: TextStreamReadOptions,
    ): js.Promise[String] =
      service.readText(stream, options.toJS)

    def readLinesWithOptions(
        stream: ReadableByteStream,
        options: LineStreamReadOptions,
    ): js.Promise[js.Array[String]] =
      service.readLines(stream, options.toJS)

    def consumeJsonLinesWithOptions[A](
        stream: ReadableByteStream,
        options: JsonLineStreamReadOptions[A],
    ): js.Promise[Unit] =
      service.consumeJsonLines[A](stream, options.toJS)

    def readJsonLinesWithOptions[A](
        stream: ReadableByteStream,
        options: JsonLineStreamReadOptions[A],
    ): js.Promise[js.Array[A]] =
      service.readJsonLines[A](stream, options.toJS)

enum WorkerStatus(val value: String):
  case Running extends WorkerStatus("running")
  case Restarting extends WorkerStatus("restarting")
  case Error extends WorkerStatus("error")
  case Terminated extends WorkerStatus("terminated")

final case class WorkerConfig(
    `type`: js.UndefOr[String] = js.undefined,
    name: js.UndefOr[String] = js.undefined,
    credentials: js.UndefOr[String] = js.undefined,
    restart: js.UndefOr[Boolean] = js.undefined,
    restartDelay: js.UndefOr[Double] = js.undefined,
    maxRestarts: js.UndefOr[Int] = js.undefined,
    decode: js.UndefOr[js.Function1[js.Any, js.Any]] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "type" -> `type`,
      "name" -> name,
      "credentials" -> credentials,
      "restart" -> restart,
      "restartDelay" -> restartDelay,
      "maxRestarts" -> maxRestarts,
      "decode" -> decode,
    )

@js.native
trait WorkerError extends js.Error:
  val code: String = js.native
  val event: js.UndefOr[dom.Event] = js.native

@js.native
trait WorkerHandle extends js.Object:
  val status: String = js.native
  val error: js.UndefOr[WorkerError] = js.native
  val restartCount: Int = js.native
  def post(data: js.Any): Unit = js.native
  def post(data: js.Any, transfer: js.Array[js.Any]): Unit = js.native
  def request(data: js.Any): js.Promise[js.Any] = js.native
  def request(data: js.Any, options: js.Object): js.Promise[js.Any] = js.native
  def model(): js.Object = js.native
  def model(channel: String): js.Object = js.native
  def onMessage(
      listener: js.Function2[js.Any, dom.MessageEvent, Unit],
  ): js.Function0[Unit] = js.native
  def onError(
      listener: js.Function1[WorkerError, Unit],
  ): js.Function0[Unit] = js.native
  def terminate(): Unit = js.native
  def restart(): Unit = js.native

@js.native
trait WorkerService extends js.Object:
  def apply(scriptPath: String): WorkerHandle = js.native
  def apply(scriptPath: String, config: js.Object): WorkerHandle = js.native
  def apply(scriptPath: dom.URL): WorkerHandle = js.native
  def apply(scriptPath: dom.URL, config: js.Object): WorkerHandle = js.native

object WorkerService:
  extension (service: WorkerService)
    def start(scriptPath: String, config: WorkerConfig): WorkerHandle =
      service.apply(scriptPath, config.toJS)

    def start(scriptPath: dom.URL, config: WorkerConfig): WorkerHandle =
      service.apply(scriptPath, config.toJS)

@js.native
trait LocationService extends js.Object:
  def absUrl: String = js.native
  def url(): String = js.native
  def url(value: String): LocationService = js.native
  def path(): String = js.native
  def path(value: String): LocationService = js.native
  def search(): js.Dictionary[js.Any] = js.native
  def search(value: String): LocationService = js.native
  def search(value: js.Dictionary[js.Any]): LocationService = js.native
  def hash(): String = js.native
  def hash(value: String): LocationService = js.native
  def replace(): LocationService = js.native
  def state(): js.Any = js.native
  def state(value: js.Any): LocationService = js.native

final case class CookieOptions(
    path: js.UndefOr[String] = js.undefined,
    domain: js.UndefOr[String] = js.undefined,
    expires: js.UndefOr[js.Any] = js.undefined,
    secure: js.UndefOr[Boolean] = js.undefined,
    sameSite: js.UndefOr[String] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "path" -> path,
      "domain" -> domain,
      "expires" -> expires,
      "secure" -> secure,
      "samesite" -> sameSite,
    )

final case class CookieStoreOptions(
    serialize: js.UndefOr[js.Function1[js.Any, String]] = js.undefined,
    deserialize: js.UndefOr[js.Function1[String, js.Any]] = js.undefined,
    cookie: js.UndefOr[CookieOptions] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "serialize" -> serialize,
      "deserialize" -> deserialize,
      "cookie" -> cookie.map(_.toJS),
    )

@js.native
trait CookieService extends js.Object:
  def get(key: String): String | Null = js.native
  def getObject(key: String): js.Any = js.native
  def getAll(): js.Dictionary[String] = js.native
  def put(key: String, value: String): Unit = js.native
  def put(key: String, value: String, options: js.Object): Unit = js.native
  def putObject(key: String, value: js.Any): Unit = js.native
  def putObject(key: String, value: js.Any, options: js.Object): Unit = js.native
  def remove(key: String): Unit = js.native
  def remove(key: String, options: js.Object): Unit = js.native

object CookieService:
  extension (service: CookieService)
    def put(key: String, value: String, options: CookieOptions): Unit =
      service.put(key, value, options.toJS)

    def putObject(key: String, value: js.Any, options: CookieOptions): Unit =
      service.putObject(key, value, options.toJS)

    def remove(key: String, options: CookieOptions): Unit =
      service.remove(key, options.toJS)

type ExceptionHandlerService = js.Function1[js.Any, Nothing]

@js.native
trait InterpolationFunction
    extends js.Function2[
      js.Any,
      js.UndefOr[js.Function1[js.Any, Unit]],
      js.Any,
    ]:
  val expressions: js.Array[String] = js.native
  val exp: String = js.native

@js.native
trait InterpolateService extends js.Object:
  def apply(text: String): js.UndefOr[InterpolationFunction] = js.native
  def apply(
      text: String,
      mustHaveExpression: Boolean,
  ): js.UndefOr[InterpolationFunction] = js.native
  def apply(
      text: String,
      mustHaveExpression: Boolean,
      trustedContext: String,
      allOrNothing: Boolean,
  ): js.UndefOr[InterpolationFunction] = js.native
  def startSymbol(): String = js.native
  def endSymbol(): String = js.native

final case class InterpolateConfig(
    startSymbol: js.UndefOr[String] = js.undefined,
    endSymbol: js.UndefOr[String] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "startSymbol" -> startSymbol,
      "endSymbol" -> endSymbol,
    )

type FilterFn = js.Function
type FilterFactory = js.Function
type CurrencyFilterOptions = js.Object

@js.native
trait EntryFilterItem extends js.Object:
  val key: js.Any = js.native
  val value: js.Any = js.native

object EntryFilterItem:
  def apply(key: js.Any, value: js.Any): EntryFilterItem =
    JsObjectBuilder(
      "key" -> key,
      "value" -> value,
    ).asInstanceOf[EntryFilterItem]

@js.native
trait FilterService extends js.Object:
  def apply(name: String): FilterFn = js.native

@js.native
trait AnchorScrollService extends js.Object:
  var yOffset: js.UndefOr[Double | js.Function0[Double] | dom.Element] =
    js.native
  def apply(): Unit = js.native
  def apply(hashOrElement: String | Double | dom.HTMLElement): Unit = js.native

type TemplateCacheService = js.Map[String, String]
type TemplateRequestService = js.Function1[String, js.Promise[String]]

enum HttpMethod(val value: String):
  case Get extends HttpMethod("GET")
  case Post extends HttpMethod("POST")
  case Put extends HttpMethod("PUT")
  case Delete extends HttpMethod("DELETE")
  case Patch extends HttpMethod("PATCH")
  case Head extends HttpMethod("HEAD")
  case Options extends HttpMethod("OPTIONS")

enum HttpResponseStatus(val value: String):
  case Complete extends HttpResponseStatus("complete")
  case Error extends HttpResponseStatus("error")
  case Timeout extends HttpResponseStatus("timeout")
  case Abort extends HttpResponseStatus("abort")

final case class HttpRequestOptions(
    params: js.UndefOr[js.Dictionary[js.Any]] = js.undefined,
    data: js.UndefOr[js.Any] = js.undefined,
    timeout: js.UndefOr[Double | js.Promise[js.Any]] = js.undefined,
    responseType: js.UndefOr[String] = js.undefined,
    withCredentials: js.UndefOr[Boolean] = js.undefined,
    headers: js.UndefOr[js.Dictionary[js.Any]] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "params" -> params,
      "data" -> data,
      "timeout" -> timeout.asInstanceOf[js.UndefOr[js.Any]],
      "responseType" -> responseType,
      "withCredentials" -> withCredentials,
      "headers" -> headers,
    )

final case class HttpRequestConfig(
    method: HttpMethod,
    url: String,
    params: js.UndefOr[js.Dictionary[js.Any]] = js.undefined,
    data: js.UndefOr[js.Any] = js.undefined,
    timeout: js.UndefOr[Double | js.Promise[js.Any]] = js.undefined,
    responseType: js.UndefOr[String] = js.undefined,
    withCredentials: js.UndefOr[Boolean] = js.undefined,
    headers: js.UndefOr[js.Dictionary[js.Any]] = js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "method" -> method.value,
      "url" -> url,
      "params" -> params,
      "data" -> data,
      "timeout" -> timeout.asInstanceOf[js.UndefOr[js.Any]],
      "responseType" -> responseType,
      "withCredentials" -> withCredentials,
      "headers" -> headers,
    )

@js.native
trait HttpHeadersGetter extends js.Object:
  def apply(): js.Dictionary[String] = js.native
  def apply(headerName: String): String = js.native

@js.native
trait HttpResponse[+A] extends js.Object:
  val data: A = js.native
  val status: Int = js.native
  val headers: HttpHeadersGetter = js.native
  val config: js.Object = js.native
  val statusText: String = js.native
  val xhrStatus: String = js.native

@js.native
trait HttpDefaults extends js.Object:
  var cache: js.UndefOr[Boolean | js.Object] = js.native
  var headers: js.UndefOr[js.Dictionary[js.Any]] = js.native
  var xsrfHeaderName: js.UndefOr[String] = js.native
  var xsrfCookieName: js.UndefOr[String] = js.native
  var withCredentials: js.UndefOr[Boolean] = js.native
  var paramSerializer: js.UndefOr[String | js.Function1[js.Dictionary[js.Any], String]] =
    js.native

@js.native
trait HttpService extends js.Object:
  val defaults: HttpDefaults = js.native
  val pendingRequests: js.Array[js.Object] = js.native
  def apply[A](config: js.Object): js.Promise[HttpResponse[A]] = js.native
  def get[A](url: String): js.Promise[HttpResponse[A]] = js.native
  def get[A](url: String, config: js.Object): js.Promise[HttpResponse[A]] = js.native
  def delete[A](url: String): js.Promise[HttpResponse[A]] = js.native
  def delete[A](url: String, config: js.Object): js.Promise[HttpResponse[A]] = js.native
  def head[A](url: String): js.Promise[HttpResponse[A]] = js.native
  def head[A](url: String, config: js.Object): js.Promise[HttpResponse[A]] = js.native
  def post[A](url: String, data: js.Any): js.Promise[HttpResponse[A]] = js.native
  def post[A](url: String, data: js.Any, config: js.Object): js.Promise[HttpResponse[A]] =
    js.native
  def put[A](url: String, data: js.Any): js.Promise[HttpResponse[A]] = js.native
  def put[A](url: String, data: js.Any, config: js.Object): js.Promise[HttpResponse[A]] =
    js.native
  def patch[A](url: String, data: js.Any): js.Promise[HttpResponse[A]] = js.native
  def patch[A](url: String, data: js.Any, config: js.Object): js.Promise[HttpResponse[A]] =
    js.native

object HttpService:
  extension (service: HttpService)
    def apply[A](config: HttpRequestConfig): js.Promise[HttpResponse[A]] =
      service.apply[A](config.toJS)

    def get[A](url: String, config: HttpRequestOptions): js.Promise[HttpResponse[A]] =
      service.get[A](url, config.toJS)

    def delete[A](url: String, config: HttpRequestOptions): js.Promise[HttpResponse[A]] =
      service.delete[A](url, config.toJS)

    def head[A](url: String, config: HttpRequestOptions): js.Promise[HttpResponse[A]] =
      service.head[A](url, config.toJS)

    def post[A](
        url: String,
        data: js.Any,
        config: HttpRequestOptions,
    ): js.Promise[HttpResponse[A]] =
      service.post[A](url, data, config.toJS)

    def put[A](
        url: String,
        data: js.Any,
        config: HttpRequestOptions,
    ): js.Promise[HttpResponse[A]] =
      service.put[A](url, data, config.toJS)

    def patch[A](
        url: String,
        data: js.Any,
        config: HttpRequestOptions,
    ): js.Promise[HttpResponse[A]] =
      service.patch[A](url, data, config.toJS)
