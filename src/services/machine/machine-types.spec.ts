/// <reference types="jasmine" />
import { defineMachine } from "./machine.ts";
import type {
  Machine,
  MachineConfig,
  MachineEventMap,
  MachineHooks,
  MachineService,
  MachineSnapshot,
  MachineTransitionContext,
  MachineTransitionResult,
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

describe("$machine types", () => {
  it("typechecks strict machine definitions by default", () => {
    const machineService = null as unknown as MachineService;
    const strictConfig = defineMachine<SessionData, SessionEvents>({
      initial: "setup",
      data: {
        roomId: "",
        error: "",
      } satisfies SessionData,
      transitions: {
        setup: {
          join(data, payload) {
            data.roomId = payload.roomId;

            return "waiting";
          },
        },
        waiting: {
          reset(data) {
            data.roomId = "";
            data.error = "";

            return "setup";
          },
        },
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
    const configWithUnknownTransition = defineMachine<
      SessionData,
      SessionEvents
    >({
      initial: "setup",
      data: {
        roomId: "",
        error: "",
      },
      transitions: {
        setup: {
          // @ts-expect-error strict machine definitions reject unknown transition keys.
          missing() {
            return "setup";
          },
        },
      },
    });
    const configWithWrongPayload = defineMachine<SessionData, SessionEvents>({
      initial: "setup",
      data: {
        roomId: "",
        error: "",
      },
      transitions: {
        setup: {
          // @ts-expect-error join receives JoinPayload, not a string.
          join(_data, _payload: string) {
            return "waiting";
          },
        },
      },
    });
    const strictMachine = machineService(strictConfig);
    const noEventMachine = machineService(
      defineMachine({
        initial: "idle",
        data: {},
        transitions: {},
      }),
    );

    strictMachine.send("join", { roomId: "abc" });
    strictMachine.send("reset");
    // @ts-expect-error join requires a roomId payload.
    strictMachine.send("join", { id: "abc" });
    // @ts-expect-error strict machines reject unknown event names.
    strictMachine.send("missing");
    // @ts-expect-error machines without typed events expose no sends by default.
    noEventMachine.send("start");

    expect(strictConfig.initial).toBe("setup");
    expect(configWithUnknownTransition.initial).toBe("setup");
    expect(configWithWrongPayload.initial).toBe("setup");
  });

  it("typechecks dynamic machine event maps with unknown payloads", () => {
    const machineService = null as unknown as MachineService;
    const config = defineMachine<SessionData, MachineEventMap>({
      initial: "setup",
      data: {
        roomId: "",
        error: "",
      },
      transitions: {
        setup: {
          join(data, payload) {
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

            return "waiting";
          },
        },
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
    const hooks: MachineHooks<SessionData, SessionEvents> = {
      enter: {
        waiting(context: MachineTransitionContext<SessionData>) {
          context.data.error = "";
          context.machine.matches(context.to);
        },
      },
      transition(context) {
        const snapshot: MachineSnapshot<SessionData> =
          context.machine.snapshot();

        context.machine.restore(snapshot);
      },
    };
    const config: MachineConfig<SessionData, SessionEvents> = {
      initial: "setup",
      data: {
        roomId: "",
        error: "",
      },
      transitions: {
        setup: {
          join(data, payload: JoinPayload): MachineTransitionResult {
            data.roomId = payload.roomId;

            return "waiting";
          },
        },
        waiting: {
          fail(data, reason: string): MachineTransitionResult {
            data.error = reason;

            return false;
          },
          reset(data) {
            data.roomId = "";
            data.error = "";

            return "setup";
          },
        },
      },
      hooks,
    };
    const machineService = null as unknown as MachineService;
    const scope = null as unknown as ng.Scope;
    const machine: Machine<SessionData, SessionEvents> = machineService(config);
    const scopedMachine: Machine<SessionData, SessionEvents> = machineService(
      scope,
      config,
    );
    const namespaceMachine: ng.Machine<SessionData, SessionEvents> = machine;
    const namespaceConfig: ng.MachineConfig<SessionData, SessionEvents> =
      config;
    const namespaceSnapshot: ng.MachineSnapshot<SessionData> =
      namespaceMachine.snapshot();

    namespaceMachine.restore(namespaceSnapshot);
    scopedMachine.send("join", { roomId: "abc" });
    scopedMachine.send("reset");
    scopedMachine.send("fail", "room_unavailable");
    // @ts-expect-error join requires a roomId payload.
    scopedMachine.send("join", { id: "abc" });
    // @ts-expect-error typed machines reject unknown event names.
    scopedMachine.send("missing");
    expect(namespaceConfig.initial).toBe("setup");
  });

  it("typechecks typed transition maps", () => {
    const validConfig: MachineConfig<SessionData, SessionEvents> = {
      initial: "setup",
      data: {
        roomId: "",
        error: "",
      },
      transitions: {
        setup: {
          join(data, payload) {
            data.roomId = payload.roomId;

            return "waiting";
          },
        },
      },
    };
    const invalidConfig: MachineConfig<SessionData, SessionEvents> = {
      initial: "setup",
      data: {
        roomId: "",
        error: "",
      },
      transitions: {
        setup: {
          // @ts-expect-error typed transition maps reject unknown event names.
          missing() {
            return "setup";
          },
        },
      },
    };

    expect(validConfig.initial).toBe("setup");
    expect(invalidConfig.initial).toBe("setup");
  });

  it("typechecks module.machine registration", () => {
    const module = null as unknown as ng.NgModule;
    const config: ng.MachineConfig<SessionData, SessionEvents> = {
      initial: "setup",
      data: {
        roomId: "",
        error: "",
      },
      transitions: {
        setup: {
          join(data, payload: JoinPayload) {
            data.roomId = payload.roomId;

            return "waiting";
          },
        },
      },
    };

    const returnedModule = module.machine("sessionMachine", config);

    expect(returnedModule).toBe(module);
  });

  it("typechecks module.machine registration from resolvable config", () => {
    const module = null as unknown as ng.NgModule;

    const buildMachineConfig = (): ng.MachineConfig<
      SessionData,
      SessionEvents
    > => ({
      initial: "setup",
      data: {
        roomId: "",
        error: "",
      },
      transitions: {
        setup: {
          join(data, payload: JoinPayload) {
            data.roomId = payload.roomId;

            return "waiting";
          },
        },
      },
    });

    const returnedModule = module.machine("sessionMachine", buildMachineConfig);

    expect(returnedModule).toBe(module);
  });
});
