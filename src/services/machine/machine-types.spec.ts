/// <reference types="jasmine" />
import { defineMachine } from "./machine.ts";
import type {
  Machine,
  MachineConfig,
  MachineDataOf,
  MachineEventTransitionConfig,
  MachineEventTransitionContext,
  MachineEventNamesOf,
  MachineEventMap,
  MachineHooks,
  MachineSendResult,
  MachineSendStatus,
  MachineService,
  MachineModesOf,
  MachineSnapshot,
  MachineTransitionPolicy,
} from "./machine.ts";

interface SessionData {
  roomId: string;
  error: string;
}

interface JoinPayload {
  roomId: string;
}

interface SessionEvents {
  join: JoinPayload;
  fail: string;
  reset: undefined;
}

type SessionModes = "setup" | "waiting" | "playing";

describe("$machine types", () => {
  it("typechecks strict machine definitions by default", () => {
    const machineService = null as unknown as MachineService;
    const strictConfig = defineMachine<
      SessionData,
      SessionEvents,
      SessionModes
    >({
      initial: "setup",
      data: {
        roomId: "",
        error: "",
      } satisfies SessionData,
      states: {
        setup: {
          on: {
            join: {
              to: "waiting",
              update({ data, payload }) {
                data.roomId = payload.roomId;
              },
            },
          },
        },
        waiting: {
          on: {
            reset: {
              to: "setup",
              update({ data }) {
                data.roomId = "";
                data.error = "";
              },
            },
          },
        },
        playing: {},
      },
      hooks: {
        transition(context) {
          if (context.type === "join") {
            const roomId: string = context.payload.roomId;

            void roomId;
          }
        },
      },
    });
    const configWithUnknownTransition: MachineConfig<
      SessionData,
      SessionEvents,
      SessionModes
    > = {
      initial: "setup",
      data: {
        roomId: "",
        error: "",
      },
      states: {
        setup: {
          on: {
            // @ts-expect-error strict machine definitions reject unknown event keys.
            missing: {
              to: "setup",
            },
          },
        },
        waiting: {},
        playing: {},
      },
    };
    const configWithWrongPayload: MachineConfig<
      SessionData,
      SessionEvents,
      SessionModes
    > = {
      initial: "setup",
      data: {
        roomId: "",
        error: "",
      },
      states: {
        setup: {
          on: {
            join: {
              to: "waiting",
              // @ts-expect-error join receives JoinPayload, not a string.
              update(
                _context: MachineEventTransitionContext<
                  SessionData,
                  SessionEvents,
                  string,
                  SessionModes
                >,
              ) {},
            },
          },
        },
        waiting: {},
        playing: {},
      },
    };
    const strictMachine = machineService(strictConfig);
    const dynamicMachine = machineService(
      defineMachine<Record<string, never>, MachineEventMap, "idle">({
        initial: "idle",
        data: {},
        states: {
          idle: {},
        },
      }),
    );

    strictMachine.send("join", { roomId: "abc" });
    strictMachine.send("reset");
    dynamicMachine.send("start", { anything: true });
    dynamicMachine.send("anything");
    // @ts-expect-error join requires a roomId payload.
    strictMachine.send("join", { id: "abc" });
    // @ts-expect-error strict machines reject unknown event names.
    strictMachine.send("missing");

    expect(strictConfig.initial).toBe("setup");
    expect(configWithUnknownTransition.initial).toBe("setup");
    expect(configWithWrongPayload.initial).toBe("setup");
  });

  it("infers machine state and event names without generics", () => {
    const machineService = null as unknown as MachineService;
    const config = defineMachine({
      initial: "setup",
      data: {
        roomId: "",
        error: "",
      },
      states: {
        setup: {
          on: {
            join: {
              to: "waiting",
              update({ data }) {
                data.roomId = "abc";
              },
            },
          },
        },
        waiting: {},
      },
    });
    const machine = machineService(config);
    type ConfigData = MachineDataOf<typeof config>;
    type ConfigEventName = MachineEventNamesOf<typeof config>;

    const data: ConfigData = {
      roomId: "abc",
      error: "",
    };
    const eventName: ConfigEventName = "join";
    machine.send("join", { roomId: "abc" });
    // @ts-expect-error inferred machines reject undeclared event names.
    machine.send("missing", 1);

    expect(data.roomId).toBe("abc");
    expect(eventName).toBe("join");
  });

  it("typechecks dynamic machine event maps with unknown payloads", () => {
    const machineService = null as unknown as MachineService;
    const config = defineMachine<SessionData, MachineEventMap, SessionModes>({
      initial: "setup",
      data: {
        roomId: "",
        error: "",
      },
      states: {
        setup: {
          on: {
            join: {
              to: "waiting",
              update({ data, payload }) {
                // @ts-expect-error dynamic event payload is unknown until narrowed.
                data.roomId = payload.roomId;

                if (
                  typeof payload === "object" &&
                  payload !== null &&
                  "roomId" in payload &&
                  typeof payload.roomId === "string"
                ) {
                  data.roomId = payload.roomId;
                }
              },
            },
          },
        },
        waiting: {},
        playing: {},
      },
      hooks: {
        transition(context) {
          // @ts-expect-error dynamic hook payload is unknown until narrowed.
          context.payload.roomId;
        },
      },
    });
    const machine = machineService(config);

    machine.send("anything", { roomId: "abc" });
    machine.can("anything");

    expect(config.initial).toBe("setup");
  });

  it("typechecks the public TypeScript machine contract", () => {
    const hooks: MachineHooks<SessionData, SessionEvents, SessionModes> = {
      enter: {
        waiting(context) {
          context.data.error = "";
          context.machine.matches(context.to ?? context.from);
        },
      },
      transition(context) {
        const snapshot: MachineSnapshot<SessionData> =
          context.machine.snapshot();

        context.machine.restore(snapshot);
      },
    };
    const config: MachineConfig<SessionData, SessionEvents, SessionModes> = {
      initial: "setup",
      data: {
        roomId: "",
        error: "",
      },
      states: {
        setup: {
          on: {
            join: {
              to: "waiting",
              update({ data, payload }) {
                data.roomId = payload.roomId;
              },
            },
          },
        },
        waiting: {
          on: {
            fail: {
              update({ data, payload }) {
                data.error = payload;
              },
            },
            reset: {
              to: "setup",
              update({ data }) {
                data.roomId = "";
                data.error = "";
              },
            },
          },
        },
        playing: {},
      },
      hooks,
    };
    const machineService = null as unknown as MachineService;
    const machine: Machine<SessionData, SessionEvents> = machineService(config);
    const namespaceConfig: ng.MachineConfig<
      SessionData,
      SessionEvents,
      SessionModes
    > = config;
    const namespaceMachine: ng.Machine<SessionData, SessionEvents> = machine;
    const namespaceSnapshot: ng.MachineSnapshot<SessionData> =
      namespaceMachine.snapshot();

    expect(config.initial).toBe("setup");
    expect(namespaceConfig.initial).toBe("setup");
    namespaceMachine.restore(namespaceSnapshot);
    const sendResult: MachineSendResult<SessionData, SessionEvents> =
      machine.send("join", { roomId: "abc" });
    const sendStatus: MachineSendStatus = sendResult.status;

    if (sendResult.ok) {
      const successfulStatus: "transitioned" | "updated" = sendResult.status;

      void successfulStatus;
    } else {
      const failedStatus: Exclude<
        MachineSendStatus,
        "transitioned" | "updated"
      > = sendResult.status;

      void failedStatus;
    }

    void sendResult;
    void sendStatus;
    // @ts-expect-error machine current mode is readonly.
    machine.current = "setup";
    machine.send("reset");
    machine.send("fail", "room_unavailable");
    // @ts-expect-error join requires a roomId payload.
    machine.send("join", { id: "abc" });
    // @ts-expect-error typed machines reject unknown event names.
    machine.send("missing");
    // @ts-expect-error explicit scope binding is not public API.
    machineService(null as unknown as ng.Scope, config);
    expect(config.initial).toBe("setup");
    expect(sendStatus).toBeDefined();
  });

  it("typechecks guarded state transitions", () => {
    const config: MachineConfig<SessionData, SessionEvents, SessionModes> = {
      initial: "setup",
      data: {
        roomId: "",
        error: "",
      },
      states: {
        setup: {
          on: {
            join: {
              to: "waiting",
              guard({ data, payload, machine }) {
                const roomId: string = payload.roomId;

                return (
                  data.error === "" && machine.matches("setup") && !!roomId
                );
              },
              update({ data, payload }) {
                data.roomId = payload.roomId;
              },
            },
            fail: {
              // @ts-expect-error fail receives a string payload, not JoinPayload.
              guard(
                _context: MachineEventTransitionContext<
                  SessionData,
                  SessionEvents,
                  JoinPayload,
                  SessionModes
                >,
              ) {
                return true;
              },
              update({ data, payload }) {
                data.error = payload;
              },
            },
          },
        },
        waiting: {},
        playing: {},
      },
    };
    const machineService = null as unknown as MachineService;
    const machine = machineService(config);

    // @ts-expect-error join requires its payload for payload-aware guards.
    machine.can("join");
    machine.can("join", { roomId: "abc" });
    // @ts-expect-error provided join payloads must include a roomId.
    machine.can("join", { id: "abc" });

    expect(config.initial).toBe("setup");
  });

  it("typechecks declarative state tree machine definitions", () => {
    const machineService = null as unknown as MachineService;
    const inferredConfig = defineMachine({
      initial: "idle",
      data: {
        count: 0,
      },
      states: {
        idle: {
          on: {
            start: {
              to: "running",
            },
          },
        },
        running: {
          on: {
            tick: {
              update({ data }) {
                data.count += 1;
              },
            },
            stop: {
              to: "idle",
            },
          },
        },
      },
    });
    const config = defineMachine<SessionData, SessionEvents, SessionModes>({
      id: "session",
      initial: "setup",
      data: {
        roomId: "",
        error: "",
      },
      states: {
        setup: {
          on: {
            join: {
              to: "waiting",
              guard({ data, payload, machine }) {
                const roomId: string = payload.roomId;

                // @ts-expect-error guard data is readonly.
                data.roomId = payload.roomId;
                // @ts-expect-error machine data is readonly inside guards.
                machine.data.error = "";

                return (
                  data.error === "" && machine.matches("setup") && !!roomId
                );
              },
              update({ data, payload }) {
                data.roomId = payload.roomId;
                data.error = "";
              },
              before(context) {
                const from: SessionModes = context.from;

                void from;
              },
              after(context) {
                const to: SessionModes | undefined = context.to;

                void to;
              },
              denied(context) {
                const machine: Machine<SessionData, SessionEvents> =
                  context.machine;

                context.data.error = "denied";
                machine.matches(context.from);
              },
            },
            fail: {
              update({ data, payload }) {
                data.error = payload;
              },
            },
          },
        },
        waiting: {
          on: {
            reset: {
              to: "setup",
              update({ data }) {
                data.roomId = "";
                data.error = "";
              },
            },
          },
        },
        playing: {},
      },
    });
    const sameModeUpdate: MachineEventTransitionConfig<
      SessionData,
      string,
      SessionEvents,
      SessionModes,
      "setup"
    > = {
      update({ data, payload }) {
        data.error = payload;
      },
    };
    const context: MachineEventTransitionContext<
      SessionData,
      SessionEvents,
      JoinPayload,
      SessionModes
    > = {
      type: "join",
      from: "setup",
      to: "waiting",
      payload: { roomId: "abc" },
      data: {
        roomId: "",
        error: "",
      },
      machine: null as unknown as Machine<
        SessionData,
        SessionEvents,
        SessionModes
      >,
    };
    const inferredRunning: "idle" | "running" =
      inferredConfig.states.idle.on?.start?.to ?? "running";
    const inferredMode: MachineModesOf<typeof inferredConfig> = "idle";
    const inferredMachine = machineService(inferredConfig);
    const inferredCurrent: "idle" | "running" = inferredMachine.current;
    const inferredSnapshotCurrent: "idle" | "running" =
      inferredMachine.snapshot().current;

    inferredMachine.matches("idle");
    // @ts-expect-error inferred machines reject unknown state names.
    inferredMachine.matches("missing");

    expect(inferredRunning).toBe("running");
    expect(inferredMode).toBe("idle");
    expect(inferredCurrent).toBe("idle");
    expect(inferredSnapshotCurrent).toBe("idle");
    expect(config.initial).toBe("setup");
    expect(sameModeUpdate.to).toBeUndefined();
    expect(context.payload.roomId).toBe("abc");
  });

  it("rejects invalid declarative state tree definitions", () => {
    const invalidEventConfig: MachineConfig<
      SessionData,
      SessionEvents,
      SessionModes
    > = {
      initial: "setup",
      data: {
        roomId: "",
        error: "",
      },
      states: {
        setup: {
          on: {
            // @ts-expect-error state tree definitions reject unknown event names.
            missing: {
              to: "waiting",
            },
          },
        },
        waiting: {},
        playing: {},
      },
    };
    const invalidModeConfig: MachineConfig<
      SessionData,
      SessionEvents,
      SessionModes
    > = {
      initial: "setup",
      data: {
        roomId: "",
        error: "",
      },
      states: {
        setup: {
          on: {
            join: {
              // @ts-expect-error transition targets must be known modes.
              to: "missing",
            },
          },
        },
        waiting: {},
        playing: {},
      },
    };
    const invalidPayloadConfig: MachineConfig<
      SessionData,
      SessionEvents,
      SessionModes
    > = {
      initial: "setup",
      data: {
        roomId: "",
        error: "",
      },
      states: {
        setup: {
          on: {
            join: {
              to: "waiting",
              // @ts-expect-error join receives JoinPayload, not a string.
              update(
                _context: MachineEventTransitionContext<
                  SessionData,
                  SessionEvents,
                  string,
                  SessionModes
                >,
              ) {},
            },
          },
        },
        waiting: {},
        playing: {},
      },
    };
    const missingTargetAndUpdate: MachineConfig<
      SessionData,
      SessionEvents,
      SessionModes
    > = {
      initial: "setup",
      data: {
        roomId: "",
        error: "",
      },
      states: {
        setup: {
          on: {
            // @ts-expect-error transitions without to must define update.
            reset: {},
          },
        },
        waiting: {},
        playing: {},
      },
    };
    const asyncGuardConfig: MachineConfig<
      SessionData,
      SessionEvents,
      SessionModes
    > = {
      initial: "setup",
      data: {
        roomId: "",
        error: "",
      },
      states: {
        setup: {
          on: {
            join: {
              to: "waiting",
              // @ts-expect-error guards must remain synchronous.
              async guard() {
                return true;
              },
            },
          },
        },
        waiting: {},
        playing: {},
      },
    };
    const invalidInferredModeConfig = defineMachine({
      initial: "playing",
      data: {
        turn: "x" as "x" | "o",
      },
      states: {
        playing: {
          on: {
            move: {
              // @ts-expect-error inferred transition targets must be state keys.
              to: "finished",
            },
          },
        },
        complete: {},
      },
    });

    expect(invalidEventConfig.initial).toBe("setup");
    expect(invalidModeConfig.initial).toBe("setup");
    expect(invalidPayloadConfig.initial).toBe("setup");
    expect(missingTargetAndUpdate.initial).toBe("setup");
    expect(asyncGuardConfig.initial).toBe("setup");
    expect(invalidInferredModeConfig.initial).toBe("playing");
  });

  it("typechecks machine transition policies", () => {
    const policy: MachineTransitionPolicy<
      SessionData,
      SessionEvents,
      SessionModes
    > = (context) => {
      const data: Readonly<SessionData> = context.data;
      const machineData: Readonly<SessionData> = context.machine.data;
      const type: string = context.type;
      const operation: "machine.transition" = context.operation;

      // @ts-expect-error policy data is readonly.
      context.data.roomId = "mutated";
      // @ts-expect-error policy machine data is readonly.
      context.machine.data.error = "mutated";

      expect(data.roomId).toBe("");
      expect(machineData.error).toBe("");
      expect(type).toBe("join");
      expect(operation).toBe("machine.transition");

      return "allow";
    };
    const config: MachineConfig<SessionData, SessionEvents, SessionModes> = {
      initial: "setup",
      data: {
        roomId: "",
        error: "",
      },
      states: {
        setup: {
          on: {
            join: {
              to: "waiting",
            },
          },
        },
        waiting: {},
        playing: {},
      },
      policy,
      metadata: {
        feature: "session",
      },
    };
    const asyncPolicyConfig: MachineConfig<
      SessionData,
      SessionEvents,
      SessionModes
    > = {
      initial: "setup",
      data: {
        roomId: "",
        error: "",
      },
      states: {
        setup: {
          on: {
            join: {
              to: "waiting",
            },
          },
        },
        waiting: {},
        playing: {},
      },
      // @ts-expect-error policies must remain synchronous.
      policy: async () => "allow" as const,
    };

    expect(config.policy).toBe(policy);
    expect(asyncPolicyConfig.initial).toBe("setup");
  });

  it("typechecks module.machine registration", () => {
    const module = null as unknown as ng.NgModule;
    const config: MachineConfig<SessionData, SessionEvents, SessionModes> = {
      initial: "setup",
      data: {
        roomId: "",
        error: "",
      },
      states: {
        setup: {
          on: {
            join: {
              to: "waiting",
              update({ data, payload }) {
                data.roomId = payload.roomId;
              },
            },
          },
        },
        waiting: {},
        playing: {},
      },
    };

    const returnedModule = module.machine("sessionMachine", config);

    expect(returnedModule).toBe(module);
  });

  it("preserves inferred definitions through module.machine registration", () => {
    const module = null as unknown as ng.NgModule;
    const config = defineMachine({
      initial: "idle",
      data: {
        count: 0,
      },
      states: {
        idle: {
          on: {
            start: {
              to: "running",
              update({ data }) {
                data.count += 1;
              },
            },
          },
        },
        running: {
          on: {
            tick: {
              update({ data }) {
                data.count += 1;
              },
            },
          },
        },
      },
      policy: (context) => {
        const from: "idle" | "running" = context.from;

        void from;

        return "allow";
      },
      hooks: {
        enter: {
          running({ data }) {
            data.count += 1;
          },
        },
        transition(context) {
          const type: "start" | "tick" = context.type;

          void type;
        },
      },
    });
    const machine = (null as unknown as MachineService)(config);
    const returnedModule = module.machine("counterMachine", config);
    const inlineModule = module.machine("inlineCounterMachine", {
      initial: "idle",
      data: { count: 0 },
      states: {
        idle: {
          on: {
            start: {
              to: "running",
              update({ data }) {
                data.count += 1;
              },
            },
          },
        },
        running: {},
      },
    });
    const factoryModule = module.machine("factoryCounterMachine", () => ({
      initial: "idle",
      data: { count: 0 },
      states: {
        idle: {
          on: {
            start: {
              to: "running",
              update({ data }) {
                data.count += 1;
              },
            },
          },
        },
        running: {},
      },
    }));

    machine.send("start");
    machine.send("tick");
    // @ts-expect-error named definitions retain inferred event names.
    machine.send("stop");
    // @ts-expect-error named definitions retain inferred state names.
    machine.matches("stopped");

    expect(returnedModule).toBe(module);
    expect(inlineModule).toBe(module);
    expect(factoryModule).toBe(module);
  });

  it("typechecks a small turn-based game without explicit generics", () => {
    const gameConfig = defineMachine({
      initial: "crossTurn",
      data: {
        moves: 0,
        winner: "" as "" | "cross" | "circle",
      },
      states: {
        crossTurn: {
          on: {
            move: {
              to: "circleTurn",
              update({ data }) {
                data.moves += 1;
              },
            },
          },
        },
        circleTurn: {
          on: {
            move: {
              to: "crossTurn",
              update({ data }) {
                data.moves += 1;
              },
            },
            win: {
              to: "complete",
              update({ data }) {
                data.winner = "circle";
              },
            },
          },
        },
        complete: {},
      },
    });
    const game = (null as unknown as MachineService)(gameConfig);

    game.send("move");
    game.send("win");
    game.matches("complete");
    // @ts-expect-error game events are inferred from the state tree.
    game.send("reset");
    // @ts-expect-error game states are inferred from the state tree.
    game.matches("abandoned");

    expect(gameConfig.initial).toBe("crossTurn");
  });

  it("typechecks module.machine registration from resolvable config", () => {
    const module = null as unknown as ng.NgModule;

    const buildMachineConfig = (): MachineConfig<
      SessionData,
      SessionEvents,
      SessionModes
    > => ({
      initial: "setup",
      data: {
        roomId: "",
        error: "",
      },
      states: {
        setup: {
          on: {
            join: {
              to: "waiting",
              update({ data, payload }) {
                data.roomId = payload.roomId;
              },
            },
          },
        },
        waiting: {},
        playing: {},
      },
    });

    const returnedModule = module.machine("sessionMachine", buildMachineConfig);

    expect(returnedModule).toBe(module);
  });
});
