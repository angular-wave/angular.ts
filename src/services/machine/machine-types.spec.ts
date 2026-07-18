/// <reference types="jasmine" />
import type {
  Machine,
  MachineConfig,
  MachineContract,
  MachineDataOf,
  MachineEventNamesOf,
  MachineEventsOf,
  MachineStatesOf,
  MachineSendResult,
  MachineSendStatus,
  MachineService,
  MachineSnapshot,
  MachineStateDefinition,
  MachineStateMap,
} from "./machine.ts";

interface SessionData {
  roomId: string;
  error: string;
}

interface SessionEvents {
  join: { roomId: string };
  reset: undefined;
}

interface SessionMachine extends MachineContract {
  data: SessionData;
  events: SessionEvents;
  state: "setup" | "waiting" | "playing";
}

describe("$machine contract types", () => {
  it("carries data, event, and state types through one labeled contract", () => {
    const config: MachineConfig<SessionMachine> = {
      initial: "setup",
      data: { roomId: "", error: "" },
      states: {
        setup: {
          on: {
            join: {
              to({ payload, from, data }) {
                payload.roomId.toUpperCase();
                const source: SessionMachine["state"] = from;
                // @ts-expect-error target resolvers receive readonly data.
                data.roomId = payload.roomId;

                return source === "setup" ? "waiting" : source;
              },
              update({ data, payload, machine }) {
                data.roomId = payload.roomId;
                machine.data.error = "";
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
              },
            },
          },
        },
        playing: {},
      },
      hooks: {
        enter: {
          waiting({ data, type }) {
            data.error = type;
          },
        },
      },
      policy(context) {
        context.payload;
        // @ts-expect-error policy data is readonly.
        context.data.error = "denied";

        return context.to === "playing" ? "deny" : "allow";
      },
    };
    const service = null as unknown as MachineService;
    const machine = service(config);

    machine.send("join", { roomId: "abc" });
    machine.send("reset");
    machine.can("join", { roomId: "abc" });
    machine.matches("playing");
    // @ts-expect-error unknown events are rejected.
    machine.send("unknown");
    // @ts-expect-error join requires its payload.
    machine.send("join");
    // @ts-expect-error mode names are closed by the contract.
    machine.matches("finished");

    expect(machine.state).toBe("setup");
  });

  it("types snapshots, results, and extraction helpers from the contract", () => {
    const machine = null as unknown as Machine<SessionMachine>;
    const snapshot: MachineSnapshot<SessionMachine> = machine.snapshot();
    const result: MachineSendResult<SessionMachine["state"]> = machine.send(
      "join",
      { roomId: "abc" },
    );
    const status: MachineSendStatus = result.status;
    const data: MachineDataOf<typeof machine> = snapshot.data;
    const events = null as unknown as MachineEventsOf<typeof machine>;
    const eventName: MachineEventNamesOf<typeof machine> = "join";
    const mode: MachineStatesOf<typeof machine> = snapshot.state;

    events.join.roomId.toUpperCase();
    data.roomId.toUpperCase();
    // @ts-expect-error extracted event names remain closed.
    const invalidEvent: MachineEventNamesOf<typeof machine> = "missing";
    // @ts-expect-error snapshot states remain closed.
    const invalidMode: MachineStatesOf<typeof machine> = "finished";

    void status;
    void eventName;
    void mode;
    void invalidEvent;
    void invalidMode;
  });

  it("supports stateless contracts without data ceremony", () => {
    interface ToggleMachine extends MachineContract {
      data: Record<never, never>;
      events: { toggle: undefined };
      state: "off" | "on";
    }

    const config: MachineConfig<ToggleMachine> = {
      initial: "off",
      states: {
        off: { on: { toggle: { to: "on" } } },
        on: { on: { toggle: { to: "off" } } },
      },
    };
    const service = null as unknown as MachineService;
    const machine = service(config);

    machine.send("toggle");
    expect(machine.state).toBe("off");
  });

  it("keeps state definition and map contracts available for reusable state trees", () => {
    const setup: MachineStateDefinition<SessionMachine, "setup"> = {
      on: {
        join: { to: "waiting" },
      },
    };
    const states: MachineStateMap<SessionMachine> = {
      setup,
      waiting: {},
      playing: {},
    };

    // @ts-expect-error setup transitions cannot use an unknown target.
    setup.on!.join!.to = "finished";
    expect(states.setup).toBe(setup);
  });

  it("infers ordinary inline machine state and event names", () => {
    const service = null as unknown as MachineService;
    const machine = service({
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

    machine.data.count.toFixed();
    machine.send("start");
    machine.matches("running");
    // @ts-expect-error inferred event names reject unknown events.
    machine.send("stop");
    // @ts-expect-error inferred states reject unknown states.
    machine.matches("stopped");

    expect(machine.state).toBe("idle");
  });
});
