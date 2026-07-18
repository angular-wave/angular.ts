// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { createInjector } from "../../core/di/injector.ts";
import { wait } from "../../shared/test-utils.ts";
import type { MachineService } from "./machine.ts";

describe("$machine", () => {
  let $compile: ng.CompileService;
  let $machine: MachineService;
  let $rootScope: ng.Scope;

  beforeEach(() => {
    window.angular = new Angular();

    const injector = createInjector(["ng"]);

    $compile = injector.get("$compile") as ng.CompileService;
    $machine = injector.get("$machine") as MachineService;
    $rootScope = injector.get("$rootScope") as ng.Scope;
  });

  it("runs a tic tac toe state machine to a completed game", async () => {
    type Player = "X" | "O";
    type Cell = Player | "-";

    const winningLines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    const findWinner = (board: Cell[]): Player | "" => {
      for (let i = 0, l = winningLines.length; i < l; i++) {
        const [a, b, c] = winningLines[i];
        const mark = board[a];

        if (mark !== "-" && mark === board[b] && mark === board[c]) {
          return mark;
        }
      }

      return "";
    };
    const resolveMoveTarget = ({ data, payload, from }) => {
      const index = payload?.index;

      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= data.board.length ||
        data.board[index] !== "-"
      ) {
        return from;
      }

      const board = [...data.board];

      board[index] = data.nextPlayer;

      const winner = findWinner(board);

      if (winner) return winner === "X" ? "xWon" : "oWon";

      return data.moveCount + 1 === board.length ? "draw" : from;
    };
    const element = $compile(
      '<section><span class="mode">{{ game.state }}</span>' +
        '<span class="winner">{{ game.data.winner }}</span>' +
        '<span class="next">{{ game.data.nextPlayer }}</span>' +
        '<span class="board">{{ game.data.board.join("") }}</span></section>',
    )($rootScope);

    $rootScope.game = $machine({
      initial: "playing",
      data: {
        board: ["-", "-", "-", "-", "-", "-", "-", "-", "-"] as Cell[],
        nextPlayer: "X" as Player,
        winner: "" as Player | "",
        moveCount: 0,
        lastError: "",
      },
      states: {
        playing: {
          on: {
            move: {
              to: resolveMoveTarget,
              guard({
                data,
                payload,
              }: {
                data: { board: Cell[] };
                payload: { index: number };
              }) {
                const index = payload.index;

                return (
                  Number.isInteger(index) &&
                  index >= 0 &&
                  index < data.board.length &&
                  data.board[index] === "-"
                );
              },
              update(context) {
                const { data, payload } = context;
                const player = data.nextPlayer;

                data.board[payload.index] = player;
                data.moveCount += 1;
                data.lastError = "";

                const winner = findWinner(data.board);

                if (winner) {
                  data.winner = winner;
                  return;
                }

                if (data.moveCount === data.board.length) {
                  return;
                }

                data.nextPlayer = player === "X" ? "O" : "X";
              },
              denied({ data }) {
                data.lastError = "invalid_move";
              },
            },
          },
        },
        xWon: {},
        oWon: {},
        draw: {},
      },
    });

    await wait();

    expect(element.querySelector(".mode")?.textContent).toBe("playing");
    expect(element.querySelector(".board")?.textContent).toBe("---------");

    for (const index of [0, 3, 1, 4, 2]) {
      expect($rootScope.game.send("move", { index }).ok).toBe(true);
    }

    await wait();

    expect($rootScope.game.state).toBe("xWon");
    expect($rootScope.game.data.winner).toBe("X");
    expect($rootScope.game.data.nextPlayer).toBe("X");
    expect($rootScope.game.data.moveCount).toBe(5);
    expect($rootScope.game.data.board).toEqual([
      "X",
      "X",
      "X",
      "O",
      "O",
      "-",
      "-",
      "-",
      "-",
    ]);
    expect($rootScope.game.can("move")).toBe(false);
    expect($rootScope.game.send("move", { index: 5 }).ok).toBe(false);
    expect(element.querySelector(".mode")?.textContent).toBe("xWon");
    expect(element.querySelector(".winner")?.textContent).toBe("X");
    expect(element.querySelector(".next")?.textContent).toBe("X");
    expect(element.querySelector(".board")?.textContent).toBe("XXXOO----");
  });

  it("restores a machine snapshot without reviving transition hooks", () => {
    type Player = "X" | "O";
    type Cell = Player | "-";

    const storageKey = "angular-ts-machine-tic-tac-toe-test";
    const winningLines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    const findWinner = (board: Cell[]): Player | "" => {
      for (let i = 0, l = winningLines.length; i < l; i++) {
        const [a, b, c] = winningLines[i];
        const mark = board[a];

        if (mark !== "-" && mark === board[b] && mark === board[c]) {
          return mark;
        }
      }

      return "";
    };
    const resolveMoveTarget = ({ data, payload, from }) => {
      const index = payload?.index;

      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= data.board.length ||
        data.board[index] !== "-"
      ) {
        return from;
      }

      const board = [...data.board];

      board[index] = data.nextPlayer;

      const winner = findWinner(board);

      if (winner) return winner === "X" ? "xWon" : "oWon";

      return data.moveCount + 1 === board.length ? "draw" : from;
    };
    let persistedWrites = 0;
    const createGame = () =>
      $machine({
        initial: "playing",
        data: {
          board: ["-", "-", "-", "-", "-", "-", "-", "-", "-"] as Cell[],
          nextPlayer: "X" as Player,
          winner: "" as Player | "",
          moveCount: 0,
          lastError: "",
        },
        states: {
          playing: {
            on: {
              move: {
                to: resolveMoveTarget,
                guard({
                  data,
                  payload,
                }: {
                  data: { board: Cell[] };
                  payload: { index: number };
                }) {
                  const index = payload.index;

                  return (
                    Number.isInteger(index) &&
                    index >= 0 &&
                    index < data.board.length &&
                    data.board[index] === "-"
                  );
                },
                update(context) {
                  const { data, payload } = context;
                  const player = data.nextPlayer;

                  data.board[payload.index] = player;
                  data.moveCount += 1;
                  data.lastError = "";

                  const winner = findWinner(data.board);

                  if (winner) {
                    data.winner = winner;
                    return;
                  }

                  if (data.moveCount === data.board.length) {
                    return;
                  }

                  data.nextPlayer = player === "X" ? "O" : "X";
                },
                denied({ data }) {
                  data.lastError = "invalid_move";
                },
              },
            },
          },
          xWon: {},
          oWon: {},
          draw: {},
        },
        hooks: {
          transition({ machine }) {
            persistedWrites += 1;
            localStorage.setItem(
              storageKey,
              JSON.stringify(machine.snapshot()),
            );
          },
        },
      });

    localStorage.removeItem(storageKey);

    try {
      const game = createGame();

      for (const index of [0, 3, 1, 4, 2]) {
        expect(game.send("move", { index }).ok).toBe(true);
      }

      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");

      expect(persistedWrites).toBe(5);
      expect(saved).toEqual({
        state: "xWon",
        data: {
          board: ["X", "X", "X", "O", "O", "-", "-", "-", "-"],
          nextPlayer: "X",
          winner: "X",
          moveCount: 5,
          lastError: "",
        },
      });

      persistedWrites = 0;

      const restoredGame = createGame();

      restoredGame.restore(saved);

      expect(persistedWrites).toBe(0);
      expect(restoredGame.state).toBe("xWon");
      expect(restoredGame.data.winner).toBe("X");
      expect(restoredGame.data.board.join("")).toBe("XXXOO----");
      expect(restoredGame.can("move")).toBe(false);
      expect(restoredGame.send("move", { index: 5 }).ok).toBe(false);
      expect(persistedWrites).toBe(0);
    } finally {
      localStorage.removeItem(storageKey);
    }
  });

  it("runs a session wizard through static route transitions", async () => {
    const element = $compile(
      '<section><span class="mode">{{ wizard.state }}</span>' +
        '<span class="accepted">{{ wizard.data.acceptedTerms }}</span>' +
        '<span class="error">{{ wizard.data.error }}</span></section>',
    )($rootScope);

    $rootScope.wizard = $machine({
      initial: "profile",
      data: {
        name: "",
        acceptedTerms: false,
        error: "",
      },
      states: {
        profile: {
          on: {
            next: {
              to: "terms",
              guard({ data }) {
                return data.name.trim() !== "";
              },
              denied({ data }) {
                data.error = "name_required";
              },
            },
          },
        },
        terms: {
          on: {
            back: {
              to: "profile",
            },
            accept: {
              update({ data }) {
                data.acceptedTerms = true;
              },
            },
            submit: {
              to: "complete",
              guard({ data }) {
                return data.acceptedTerms;
              },
              denied({ data }) {
                data.error = "terms_required";
              },
            },
          },
        },
        complete: {},
      },
    });

    await wait();

    expect($rootScope.wizard.send("next").ok).toBe(false);
    expect($rootScope.wizard.state).toBe("profile");
    expect($rootScope.wizard.data.error).toBe("name_required");

    $rootScope.wizard.data.name = "Ada";

    expect($rootScope.wizard.send("next").ok).toBe(true);
    expect($rootScope.wizard.state).toBe("terms");
    expect($rootScope.wizard.send("submit").ok).toBe(false);
    expect($rootScope.wizard.data.error).toBe("terms_required");
    expect($rootScope.wizard.send("accept").ok).toBe(true);
    expect($rootScope.wizard.state).toBe("terms");
    expect($rootScope.wizard.send("submit").ok).toBe(true);

    await wait();

    expect($rootScope.wizard.state).toBe("complete");
    expect(element.querySelector(".mode")?.textContent).toBe("complete");
    expect(element.querySelector(".accepted")?.textContent).toBe("true");
    expect(element.querySelector(".error")?.textContent).toBe("terms_required");
  });

  it("supports null-prototype state maps and event entries", () => {
    const states = Object.create(null);
    const setup = Object.create(null);
    const on = Object.create(null);

    on.join = {
      to: "waiting",
      update({ data }: { data: { status: string } }) {
        data.status = "waiting";
      },
    };
    setup.on = on;
    states.setup = setup;
    states.waiting = Object.create(null);

    const machine = $machine({
      initial: "setup",
      data: {
        status: "idle",
      },
      states,
    });

    expect(machine.can("join")).toBe(true);
    expect(machine.send("join").ok).toBe(true);
    expect(machine.state).toBe("waiting");
    expect(machine.data.status).toBe("waiting");
  });

  it("runs named state-tree machines registered through module.machine", () => {
    window.angular = new Angular();
    window.angular
      .module("namedStateMachineApp", ["ng"])
      .machine("sessionMachine", {
        initial: "setup",
        data: {
          status: "idle",
        },
        states: {
          setup: {
            on: {
              join: {
                to: "waiting",
                update({ data }) {
                  data.status = "waiting";
                },
              },
            },
          },
          waiting: {},
        },
      });

    const injector = createInjector(["namedStateMachineApp"]);
    const machine = injector.get("sessionMachine") as ng.Machine<{
      status: string;
    }>;

    expect(machine.send("join").ok).toBe(true);
    expect(machine.state).toBe("waiting");
    expect(machine.data.status).toBe("waiting");
  });

  it("returns distinct send results for invalid events and denied guards", () => {
    const machine = $machine({
      initial: "setup",
      data: {
        allowed: false,
      },
      states: {
        setup: {
          on: {
            join: {
              to: "waiting",
              guard({ data }) {
                return data.allowed;
              },
            },
          },
        },
        waiting: {},
      },
    });

    expect(
      (machine as unknown as { send(type: unknown): unknown }).send(null),
    ).toEqual(
      jasmine.objectContaining({
        ok: false,
        status: "invalid-event",
        type: "",
        from: "setup",
        to: "setup",
      }),
    );
    expect(machine.send("join")).toEqual(
      jasmine.objectContaining({
        ok: false,
        status: "guard-denied",
        type: "join",
        from: "setup",
        to: "setup",
      }),
    );
    expect(machine.state).toBe("setup");
  });

  it("returns structured send results for declarative state transitions", () => {
    const machine = $machine({
      initial: "setup",
      data: {
        roomId: "",
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
            touch: {
              update({ data }) {
                data.roomId = "same";
              },
            },
          },
        },
        waiting: {},
      },
    });

    const touched = machine.send("touch");

    expect(touched).toEqual(
      jasmine.objectContaining({
        ok: true,
        status: "updated",
        type: "touch",
        from: "setup",
        to: "setup",
      }),
    );

    const joined = machine.send("join", { roomId: "abc" });

    expect(joined).toEqual(
      jasmine.objectContaining({
        ok: true,
        status: "transitioned",
        type: "join",
        from: "setup",
        to: "waiting",
      }),
    );
    expect(machine.data.roomId).toBe("abc");
    expect(machine.state).toBe("waiting");
  });

  it("supports the explicit scope overload", () => {
    const machine = $machine($rootScope, {
      initial: "idle",
      data: { count: 0 },
      states: {
        idle: {
          on: {
            increment: {
              update({ data }) {
                data.count += 1;
              },
            },
          },
        },
      },
    });

    expect(machine.send("increment").ok).toBeTrue();
    expect(machine.data.count).toBe(1);
    expect(machine.$handler).toBe($rootScope.$handler);
  });

  it("resolves one immutable target for guards, policy, and updates", () => {
    const calls: string[] = [];
    const machine = $machine({
      initial: "idle",
      data: { count: 0 },
      states: {
        idle: {
          on: {
            increment: {
              to({ data, from }) {
                calls.push(`target:${from}`);

                return data.count === 0 ? "done" : from;
              },
              guard(context) {
                calls.push(`guard:${context.to}`);

                return true;
              },
              update(context) {
                calls.push(`update:${context.to}`);
                context.data.count += 1;
              },
            },
          },
        },
        done: {},
      },
      policy: (context) => {
        calls.push(`policy:${context.to}`);

        return "allow";
      },
    });

    expect(machine.can("increment")).toBeTrue();
    expect(machine.send("increment")).toEqual(
      jasmine.objectContaining({
        ok: true,
        status: "transitioned",
        from: "idle",
        to: "done",
      }),
    );
    expect(calls).toEqual([
      "target:idle",
      "guard:done",
      "policy:done",
      "target:idle",
      "guard:done",
      "policy:done",
      "update:done",
    ]);
  });

  it("rejects invalid resolved transition targets", () => {
    const machine = $machine({
      initial: "idle",
      data: {},
      states: {
        idle: {
          on: {
            start: {
              to: () => "",
            },
          },
        },
      },
    });

    expect(() => machine.can("start")).toThrowError(
      "$machine transition target resolver must return a non-empty state.",
    );
    expect(() => machine.send("start")).toThrowError(
      "$machine transition target resolver must return a non-empty state.",
    );
  });

  it("rejects states that are not declared by the built-in state map", () => {
    expect(() =>
      $machine({
        initial: "missing",
        data: {},
        states: {
          idle: {},
        },
      }),
    ).toThrowError("$machine initial state must exist in states.");

    const staticTarget = $machine({
      initial: "idle",
      data: {},
      states: {
        idle: {
          on: {
            start: {
              to: "missing",
            },
          },
        },
      },
    });
    const dynamicTarget = $machine({
      initial: "idle",
      data: {},
      states: {
        idle: {
          on: {
            start: {
              to: () => "missing",
            },
          },
        },
      },
    });
    const restored = $machine({
      initial: "idle",
      data: {},
      states: {
        idle: {},
      },
    });

    expect(() => staticTarget.send("start")).toThrowError(
      "$machine transition target 'missing' is not a configured state.",
    );
    expect(() => dynamicTarget.can("start")).toThrowError(
      "$machine transition target 'missing' is not a configured state.",
    );
    expect(() => restored.restore({ state: "missing", data: {} })).toThrowError(
      "$machine restore state must exist in states.",
    );
    expect(restored.state).toBe("idle");
  });

  it("runs declarative state transitions with explicit routing", () => {
    const calls: string[] = [];
    const machine = $machine({
      initial: "setup",
      data: {
        roomId: "",
        status: "idle",
      },
      states: {
        setup: {
          on: {
            join: {
              to: "waiting",
              guard({ data, payload, machine: activeMachine }) {
                calls.push(`guard:${activeMachine.state}:${payload.roomId}`);

                return data.status === "idle" && payload.roomId !== "";
              },
              before({ from, to }) {
                calls.push(`before:${from}->${to}`);
              },
              update({ data, payload }) {
                calls.push(`update:${payload.roomId}`);
                data.roomId = payload.roomId;
                data.status = "joining";

                return "ignored";
              },
              after({ machine: activeMachine }) {
                calls.push(`after:${activeMachine.state}`);
              },
            },
          },
        },
        waiting: {},
      },
      hooks: {
        exit: {
          setup({ machine: activeMachine }) {
            calls.push(`exit:${activeMachine.state}`);
          },
        },
        enter: {
          waiting({ machine: activeMachine }) {
            calls.push(`enter:${activeMachine.state}`);
          },
        },
        transition({ from, to }) {
          calls.push(`transition:${from}->${to}`);
        },
      },
    });

    expect(machine.can("join", { roomId: "abc" })).toBe(true);
    expect(calls).toEqual(["guard:setup:abc"]);

    calls.length = 0;

    expect(machine.send("join", { roomId: "abc" }).ok).toBe(true);
    expect(machine.state).toBe("waiting");
    expect(machine.data).toEqual({
      roomId: "abc",
      status: "joining",
    });
    expect(calls).toEqual([
      "guard:setup:abc",
      "before:setup->waiting",
      "update:abc",
      "exit:setup",
      "enter:waiting",
      "after:waiting",
      "transition:setup->waiting",
    ]);
  });

  it("allows declarative transitions with to and no update", () => {
    const machine = $machine({
      initial: "setup",
      data: {},
      states: {
        setup: {
          on: {
            join: {
              to: "waiting",
            },
          },
        },
        waiting: {},
      },
    });

    expect(machine.send("join").ok).toBe(true);
    expect(machine.state).toBe("waiting");
  });

  it("allows declarative same-mode updates without to", () => {
    const machine = $machine({
      initial: "playing",
      data: {
        version: 0,
      },
      states: {
        playing: {
          on: {
            snapshot: {
              update({ data, payload }) {
                data.version = payload.version;
              },
            },
          },
        },
      },
    });

    expect(machine.send("snapshot", { version: 1 }).ok).toBe(true);
    expect(machine.send("snapshot", { version: 2 }).ok).toBe(true);
    expect(machine.state).toBe("playing");
    expect(machine.data.version).toBe(2);
  });

  it("ignores declarative update return values when routing", () => {
    const cases = [
      ["false", false],
      ["undefined", undefined],
      ["empty", ""],
      ["object", { mode: "setup" }],
      ["mode-like string", "setup"],
      ["null", null],
    ];

    for (const [label, value] of cases) {
      const machine = $machine({
        initial: "setup",
        data: {
          label: "",
        },
        states: {
          setup: {
            on: {
              join: {
                to: "waiting",
                update({ data }) {
                  data.label = label;

                  return value;
                },
              },
            },
          },
          waiting: {},
        },
      });

      expect(machine.send("join").ok).withContext(label).toBe(true);
      expect(machine.state).withContext(label).toBe("waiting");
      expect(machine.data.label).withContext(label).toBe(label);
    }
  });

  it("runs declarative denied hooks when guard denies", () => {
    const calls: string[] = [];
    const machine = $machine({
      initial: "setup",
      data: {
        allowed: false,
        error: "",
      },
      states: {
        setup: {
          on: {
            join: {
              to: "waiting",
              guard({ data }) {
                calls.push("guard");

                return data.allowed;
              },
              before() {
                calls.push("before");
              },
              update() {
                calls.push("update");
              },
              after() {
                calls.push("after");
              },
              denied({ data, machine: activeMachine }) {
                calls.push(`denied:${activeMachine.state}`);
                data.error = "not_allowed";
              },
            },
          },
        },
        waiting: {},
      },
      hooks: {
        transition() {
          calls.push("transition");
        },
      },
    });

    expect(machine.can("join")).toBe(false);

    const result = machine.send("join");

    expect(result.ok).toBe(false);
    expect(result.status).toBe("guard-denied");
    expect(machine.state).toBe("setup");
    expect(machine.data.error).toBe("not_allowed");
    expect(calls).toEqual(["guard", "guard", "denied:setup"]);
  });

  it("evaluates can and send with the same declarative guard inputs", () => {
    const contexts: Array<{
      type: string;
      from: string;
      to?: string;
      payload: unknown;
      data: unknown;
      machine: unknown;
    }> = [];
    const machine = $machine({
      initial: "setup",
      data: {
        allowed: true,
      },
      states: {
        setup: {
          on: {
            join: {
              to: "waiting",
              guard(context) {
                contexts.push({
                  type: context.type,
                  from: context.from,
                  to: context.to,
                  payload: context.payload,
                  data: context.data,
                  machine: context.machine,
                });

                return context.data.allowed;
              },
            },
          },
        },
        waiting: {},
      },
    });
    const payload = { roomId: "abc" };

    expect(machine.can("join", payload)).toBe(true);
    expect(machine.send("join", payload)).toEqual(
      jasmine.objectContaining({
        ok: true,
        status: "transitioned",
      }),
    );
    expect(contexts).toEqual([
      jasmine.objectContaining({
        type: "join",
        from: "setup",
        to: "waiting",
        payload,
        data: machine.data,
        machine,
      }),
      jasmine.objectContaining({
        type: "join",
        from: "setup",
        to: "waiting",
        payload,
        data: machine.data,
        machine,
      }),
    ]);
  });

  it("blocks declarative transitions when policy denies without running hooks", () => {
    const before = jasmine.createSpy("before");
    const update = jasmine.createSpy("update");
    const after = jasmine.createSpy("after");
    const denied = jasmine.createSpy("denied");
    const enter = jasmine.createSpy("enter");
    const exit = jasmine.createSpy("exit");
    const transitionHook = jasmine.createSpy("transition");
    const policyDecision = {
      type: "deny" as const,
      reason: "maintenance",
    };
    const policy = jasmine.createSpy("policy").and.returnValue(policyDecision);
    const payload = { roomId: "abc" };
    const machine = $machine({
      id: "session",
      initial: "setup",
      data: {
        roomId: "",
      },
      states: {
        setup: {
          on: {
            join: {
              to: "waiting",
              guard({ payload: message }) {
                return !!message.roomId;
              },
              before,
              update,
              after,
              denied,
            },
          },
        },
        waiting: {},
      },
      hooks: {
        enter: {
          waiting: enter,
        },
        exit: {
          setup: exit,
        },
        transition: transitionHook,
      },
      policy,
      meta: {
        feature: "session",
      },
    });

    expect(machine.can("join", payload)).toBe(false);

    const result = machine.send("join", payload);

    expect(result).toEqual(
      jasmine.objectContaining({
        ok: false,
        status: "policy-denied",
        type: "join",
        from: "setup",
        to: "setup",
        reason: "maintenance",
      }),
    );
    expect(machine.state).toBe("setup");
    expect(machine.data.roomId).toBe("");
    expect(policy).toHaveBeenCalledTimes(2);
    expect(policy.calls.allArgs()).toEqual([
      [
        jasmine.objectContaining({
          operation: "machine.transition",
          machineId: "session",
          type: "join",
          from: "setup",
          to: "waiting",
          payload,
          data: machine.data,
          machine,
          meta: {
            feature: "session",
          },
        }),
      ],
      [
        jasmine.objectContaining({
          operation: "machine.transition",
          machineId: "session",
          type: "join",
          from: "setup",
          to: "waiting",
          payload,
          data: machine.data,
          machine,
          meta: {
            feature: "session",
          },
        }),
      ],
    ]);
    expect(before).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
    expect(denied).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
    expect(enter).not.toHaveBeenCalled();
    expect(transitionHook).not.toHaveBeenCalled();
  });

  it("rejects async machine policy decisions", () => {
    const update = jasmine.createSpy("update");
    const machine = $machine({
      initial: "setup",
      data: {},
      states: {
        setup: {
          on: {
            join: {
              to: "waiting",
              update,
            },
          },
        },
        waiting: {},
      },
      policy: () => Promise.resolve("allow") as never,
    });

    expect(() => machine.send("join")).toThrowError(
      "$machine policy must return a synchronous decision.",
    );
    expect(update).not.toHaveBeenCalled();
    expect(machine.state).toBe("setup");
  });

  it("normalizes string decisions and rejects invalid decisions", () => {
    const createPolicyMachine = (policy) =>
      $machine({
        initial: "idle",
        data: {},
        states: {
          idle: { on: { start: { to: "ready" } } },
          ready: {},
        },
        policy,
      });

    const denied = createPolicyMachine(() => "deny");
    const invalid = [
      createPolicyMachine(() => 42),
      createPolicyMachine(() => null),
      createPolicyMachine(() => ({})),
    ];

    expect(denied.send("start").status).toBe("policy-denied");
    for (const machine of invalid) {
      expect(() => machine.send("start")).toThrowError(
        "Policy must return a decision string or object.",
      );
    }
  });

  it("rejects malformed transition descriptors", () => {
    const malformed = [
      null,
      { to: "" },
      {},
      { to: "ready", update: true },
      { to: "ready", guard: true },
      { to: "ready", before: true },
      { to: "ready", after: true },
      { to: "ready", denied: true },
    ];

    malformed.forEach((transition) => {
      const machine = $machine({
        initial: "idle",
        data: {},
        states: {
          idle: { on: { start: transition } },
          ready: {},
        },
      });

      expect(machine.send("start").status).toBe("missing-transition");
    });
  });

  it("requires a states object", () => {
    expect(() =>
      $machine({
        initial: "idle",
        data: {},
      }),
    ).toThrowError("$machine requires a states object.");
  });

  it("updates templates after declarative denied hooks mutate data", async () => {
    const element = $compile(
      '<section><span class="mode">{{ session.state }}</span>' +
        '<span class="error">{{ session.data.error }}</span></section>',
    )($rootScope);

    $rootScope.session = $machine({
      initial: "setup",
      data: {
        error: "",
      },
      states: {
        setup: {
          on: {
            join: {
              to: "waiting",
              guard() {
                return false;
              },
              denied({ data, payload }) {
                data.error = payload.reason;
              },
            },
          },
        },
        waiting: {},
      },
    });

    await wait();

    expect(element.querySelector(".mode")?.textContent).toBe("setup");
    expect(element.querySelector(".error")?.textContent).toBe("");

    const result = $rootScope.session.send("join", {
      reason: "not_allowed",
    });

    expect(result.status).toBe("guard-denied");
    expect($rootScope.session.state).toBe("setup");
    expect($rootScope.session.data.error).toBe("not_allowed");

    await wait();

    expect(element.querySelector(".mode")?.textContent).toBe("setup");
    expect(element.querySelector(".error")?.textContent).toBe("not_allowed");
  });

  it("keeps declarative update mutations visible when update throws", async () => {
    const error = new Error("update failed");
    const element = $compile(
      '<section><span class="mode">{{ session.state }}</span>' +
        '<span class="status">{{ session.data.status }}</span></section>',
    )($rootScope);

    $rootScope.session = $machine({
      initial: "setup",
      data: {
        status: "idle",
      },
      states: {
        setup: {
          on: {
            join: {
              to: "waiting",
              update({ data }) {
                data.status = "joining";

                throw error;
              },
            },
          },
        },
        waiting: {},
      },
    });

    await wait();

    expect(() => $rootScope.session.send("join")).toThrow(error);
    expect($rootScope.session.state).toBe("setup");
    expect($rootScope.session.data.status).toBe("joining");

    await wait();

    expect(element.querySelector(".mode")?.textContent).toBe("setup");
    expect(element.querySelector(".status")?.textContent).toBe("joining");
  });

  it("does not run declarative hooks for missing transitions", () => {
    const before = jasmine.createSpy("before");
    const update = jasmine.createSpy("update");
    const after = jasmine.createSpy("after");
    const denied = jasmine.createSpy("denied");
    const enter = jasmine.createSpy("enter");
    const exit = jasmine.createSpy("exit");
    const transitionHook = jasmine.createSpy("transition");

    const machine = $machine({
      initial: "setup",
      data: {},
      states: {
        setup: {
          on: {
            join: {
              to: "waiting",
              before,
              update,
              after,
              denied,
            },
          },
        },
        waiting: {},
      },
      hooks: {
        enter: {
          waiting: enter,
        },
        exit: {
          setup: exit,
        },
        transition: transitionHook,
      },
    });

    expect(machine.send("missing")).toEqual(
      jasmine.objectContaining({
        ok: false,
        status: "missing-transition",
      }),
    );
    expect(before).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
    expect(denied).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
    expect(enter).not.toHaveBeenCalled();
    expect(transitionHook).not.toHaveBeenCalled();
  });

  it("does not run hooks for invalid event names", () => {
    const enter = jasmine.createSpy("enter");
    const exit = jasmine.createSpy("exit");
    const transitionHook = jasmine.createSpy("transition");

    const machine = $machine({
      initial: "setup",
      data: {},
      states: {
        setup: {
          on: {
            join: {
              to: "waiting",
            },
          },
        },
        waiting: {},
      },
      hooks: {
        enter: {
          waiting: enter,
        },
        exit: {
          setup: exit,
        },
        transition: transitionHook,
      },
    });

    expect(
      (machine as unknown as { send(type: unknown): unknown }).send(null),
    ).toEqual(
      jasmine.objectContaining({
        ok: false,
        status: "invalid-event",
      }),
    );
    expect(exit).not.toHaveBeenCalled();
    expect(enter).not.toHaveBeenCalled();
    expect(transitionHook).not.toHaveBeenCalled();
  });

  it("lets an injectable workflow-owned gate use the state-tree machine API", () => {
    window.angular = new Angular();
    window.angular
      .module("workflowMachineGateApp", ["ng"])
      .factory("sessionWorkflowMachine", [
        "$machine",
        ($machine: ng.MachineService) =>
          $machine({
            initial: "idle",
            data: {
              token: "",
            },
            states: {
              idle: {
                on: {
                  start: {
                    to: "authenticating",
                  },
                },
              },
              authenticating: {
                on: {
                  authenticated: {
                    to: "ready",
                    update({ data, payload }) {
                      data.token = payload;
                    },
                  },
                },
              },
              ready: {},
            },
          }),
      ]);

    const injector = createInjector(["workflowMachineGateApp"]);
    const machine = injector.get("sessionWorkflowMachine") as ng.Machine<
      { token: string },
      { start: undefined; authenticated: string }
    >;

    expect(machine.state).toBe("idle");
    expect(machine.send("start").ok).toBe(true);
    expect(machine.state).toBe("authenticating");
    expect(machine.send("authenticated", "abc").ok).toBe(true);
    expect(machine.state).toBe("ready");
    expect(machine.data.token).toBe("abc");
  });

  it("defaults data, matches state, and validates restore snapshots", () => {
    const machine = $machine({
      initial: "idle",
      states: { idle: {} },
    });

    expect(machine.data).toEqual({});
    expect(machine.matches("idle")).toBeTrue();
    expect(machine.matches("missing")).toBeFalse();

    for (const snapshot of [null, {}, { state: "" }, { state: "idle" }]) {
      expect(() => machine.restore(snapshot)).toThrow();
    }

    expect(() =>
      $machine({ initial: "", data: {}, states: { idle: {} } }),
    ).toThrowError("$machine requires a non-empty initial state.");
  });
});
