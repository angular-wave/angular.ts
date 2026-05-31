// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { createInjector } from "../../core/di/injector.ts";
import { wait } from "../../shared/test-utils.ts";
import type { MachineService } from "./machine.ts";

describe("$machine", () => {
  let $compile: ng.CompileService;
  let $machine: MachineService;
  let $rootScope: ng.RootScopeService;

  beforeEach(() => {
    window.angular = new Angular();

    const injector = createInjector(["ng"]);

    $compile = injector.get("$compile") as ng.CompileService;
    $machine = injector.get("$machine") as MachineService;
    $rootScope = injector.get("$rootScope") as ng.RootScopeService;
  });

  describe("roadmap", () => {
    it("updates templates after restore replaces Map and Set data", async () => {
      const element = $compile(
        '<section><span class="phase">{{ session.data.metadata.get("phase") }}</span>' +
          '<span class="selected">{{ session.data.selected.has("a1") }}</span>' +
          '<span class="size">{{ session.data.selected.size }}</span></section>',
      )($rootScope);

      $rootScope.session = $machine({
        initial: "idle",
        data: {
          metadata: new Map([["phase", "idle"]]),
          selected: new Set<string>(),
        },
        transitions: {},
      });

      await wait();

      expect(element.querySelector(".phase")?.textContent).toBe("idle");
      expect(element.querySelector(".selected")?.textContent).toBe("false");
      expect(element.querySelector(".size")?.textContent).toBe("0");

      $rootScope.session.restore({
        current: "ready",
        data: {
          metadata: new Map([["phase", "ready"]]),
          selected: new Set(["a1"]),
        },
      });

      await wait();

      expect(element.querySelector(".phase")?.textContent).toBe("ready");
      expect(element.querySelector(".selected")?.textContent).toBe("true");
      expect(element.querySelector(".size")?.textContent).toBe("1");
    });

    it("documents transitions that return an unknown mode", () => {
      const machine = $machine({
        initial: "setup",
        data: {},
        transitions: {
          setup: {
            skip() {
              return "unconfigured";
            },
          },
          configured: {
            reset() {
              return "setup";
            },
          },
        },
      });

      expect(machine.can("skip")).toBe(true);
      expect(machine.send("skip")).toBe(true);
      expect(machine.current).toBe("unconfigured");
      expect(machine.matches("unconfigured")).toBe(true);
      expect(machine.can("skip")).toBe(false);
      expect(machine.can("reset")).toBe(false);
      expect(machine.send("reset")).toBe(false);
    });

    it("locks down hook ordering around current mode reads", () => {
      const calls: string[] = [];
      const machine = $machine({
        initial: "setup",
        data: {},
        transitions: {
          setup: {
            join() {
              calls.push(`transition:${machine.current}`);

              return "waiting";
            },
          },
        },
        hooks: {
          exit: {
            setup(context) {
              calls.push(
                `exit:${context.from}:${context.to}:${context.machine.current}`,
              );
            },
          },
          enter: {
            waiting(context) {
              calls.push(
                `enter:${context.from}:${context.to}:${context.machine.current}`,
              );
            },
          },
          transition(context) {
            calls.push(
              `hook:${context.from}:${context.to}:${context.machine.current}`,
            );
          },
        },
      });

      expect(machine.send("join")).toBe(true);
      expect(calls).toEqual([
        "transition:setup",
        "exit:setup:waiting:setup",
        "enter:setup:waiting:waiting",
        "hook:setup:waiting:waiting",
      ]);
    });

    it("documents data ordering when hooks send nested transitions", () => {
      const machine = $machine({
        initial: "setup",
        data: {
          log: [] as string[],
        },
        transitions: {
          setup: {
            join() {
              return "waiting";
            },
          },
          waiting: {
            ready(data) {
              data.log.push("nested-transition");

              return "ready";
            },
          },
        },
        hooks: {
          enter: {
            waiting(context) {
              context.data.log.push("outer-enter-before");
              expect(context.machine.send("ready")).toBe(true);
              context.data.log.push("outer-enter-after");
            },
            ready(context) {
              context.data.log.push("nested-enter");
            },
          },
          transition(context) {
            context.data.log.push(`transition:${context.from}->${context.to}`);
          },
        },
      });

      expect(machine.send("join")).toBe(true);
      expect(machine.current).toBe("ready");
      expect(machine.data.log).toEqual([
        "outer-enter-before",
        "nested-transition",
        "nested-enter",
        "transition:waiting->ready",
        "outer-enter-after",
        "transition:setup->waiting",
      ]);
    });

    it("restores after one of several bound scopes is destroyed", async () => {
      const directiveScopes: ng.Scope[] = [];

      window.angular = new Angular();
      window.angular.module("machineRoadmapRestoreApp", ["ng"]).directive(
        "machinePanel",
        () => ({
          scope: true,
          template:
            '<span class="mode">{{ session.current }}</span>' +
            '<span class="status">{{ session.data.status }}</span>',
          link(scope: ng.Scope) {
            directiveScopes.push(scope);
            scope.session.matches("setup");
          },
        }),
      );

      const injector = createInjector(["machineRoadmapRestoreApp"]);
      const compile = injector.get("$compile") as ng.CompileService;
      const machine = (injector.get("$machine") as MachineService)({
        initial: "setup",
        data: {
          status: "idle",
        },
        transitions: {},
      });
      const rootScope = injector.get("$rootScope") as ng.RootScopeService;

      rootScope.session = machine;

      const element = compile(
        '<section><machine-panel class="first" session="session"></machine-panel>' +
          '<machine-panel class="second" session="session"></machine-panel></section>',
      )(rootScope);

      await wait();

      expect(directiveScopes.length).toBe(2);
      expect(element.querySelector(".first .status")?.textContent).toBe("idle");
      expect(element.querySelector(".second .status")?.textContent).toBe("idle");

      directiveScopes[0].$destroy();

      machine.restore({
        current: "ready",
        data: {
          status: "restored",
        },
      });

      await wait();

      expect(machine.current).toBe("ready");
      expect(machine.data.status).toBe("restored");
      expect(element.querySelector(".second .mode")?.textContent).toBe("ready");
      expect(element.querySelector(".second .status")?.textContent).toBe(
        "restored",
      );
    });

    it("isolates named machine Map and Set data across injectors", () => {
      window.angular = new Angular();
      window.angular.module("namedMachineCollectionApp", ["ng"]).machine(
        "sessionMachine",
        {
          initial: "setup",
          data: {
            metadata: new Map([["phase", "idle"]]),
            selected: new Set(["a1"]),
          },
          transitions: {
            setup: {
              select(data) {
                data.metadata.set("phase", "selected");
                data.selected.add("b2");

                return "ready";
              },
            },
          },
        },
      );

      const firstInjector = createInjector(["namedMachineCollectionApp"]);
      const secondInjector = createInjector(["namedMachineCollectionApp"]);
      const firstMachine = firstInjector.get("sessionMachine") as ng.Machine<{
        metadata: Map<string, string>;
        selected: Set<string>;
      }>;
      const secondMachine = secondInjector.get("sessionMachine") as ng.Machine<{
        metadata: Map<string, string>;
        selected: Set<string>;
      }>;

      expect(firstMachine.data.metadata).not.toBe(secondMachine.data.metadata);
      expect(firstMachine.data.selected).not.toBe(secondMachine.data.selected);

      expect(firstMachine.send("select")).toBe(true);
      expect(firstMachine.current).toBe("ready");
      expect(firstMachine.data.metadata.get("phase")).toBe("selected");
      expect(firstMachine.data.selected.has("b2")).toBe(true);

      expect(secondMachine.current).toBe("setup");
      expect(secondMachine.data.metadata.get("phase")).toBe("idle");
      expect(secondMachine.data.selected.has("a1")).toBe(true);
      expect(secondMachine.data.selected.has("b2")).toBe(false);
    });

    it("round-trips snapshots with cyclic data containing Map and Set values", () => {
      const metadata = new Map<string, unknown>([["phase", "idle"]]);
      const selected = new Set<unknown>(["a1"]);

      metadata.set("self", metadata);
      selected.add(selected);

      const machine = $machine({
        initial: "setup",
        data: {
          metadata,
          selected,
        },
        transitions: {},
      });

      const snapshot = machine.snapshot();

      expect(snapshot.data.metadata).not.toBe(machine.data.metadata);
      expect(snapshot.data.metadata.get("phase")).toBe("idle");
      expect(snapshot.data.metadata.get("self")).toBe(snapshot.data.metadata);
      expect(snapshot.data.selected).not.toBe(machine.data.selected);
      expect(snapshot.data.selected.has("a1")).toBe(true);
      expect(snapshot.data.selected.has(snapshot.data.selected)).toBe(true);

      machine.data.metadata.set("phase", "mutated");
      machine.data.selected.add("b2");

      machine.restore(snapshot);

      expect(machine.data.metadata).not.toBe(snapshot.data.metadata);
      expect(machine.data.metadata.get("phase")).toBe("idle");
      expect(machine.data.metadata.get("self")).toBe(machine.data.metadata);
      expect(machine.data.selected).not.toBe(snapshot.data.selected);
      expect(machine.data.selected.has("a1")).toBe(true);
      expect(machine.data.selected.has("b2")).toBe(false);
      expect(machine.data.selected.has(machine.data.selected)).toBe(true);
    });

    it("keeps partial Map and Set mutations when transitions throw", async () => {
      const error = new Error("transition failed");
      const element = $compile(
        '<section><span class="phase">{{ session.data.metadata.get("phase") }}</span>' +
          '<span class="selected">{{ session.data.selected.has("a1") }}</span>' +
          '<span class="mode">{{ session.current }}</span></section>',
      )($rootScope);

      $rootScope.session = $machine({
        initial: "setup",
        data: {
          metadata: new Map([["phase", "idle"]]),
          selected: new Set<string>(),
        },
        transitions: {
          setup: {
            fail(data) {
              data.metadata.set("phase", "failed");
              data.selected.add("a1");

              throw error;
            },
            recover(data) {
              data.metadata.set("phase", "recovered");

              return "setup";
            },
          },
        },
      });

      await wait();

      expect(() => $rootScope.session.send("fail")).toThrow(error);
      expect($rootScope.session.current).toBe("setup");
      expect($rootScope.session.data.metadata.get("phase")).toBe("failed");
      expect($rootScope.session.data.selected.has("a1")).toBe(true);

      await wait();

      expect(element.querySelector(".phase")?.textContent).toBe("failed");
      expect(element.querySelector(".selected")?.textContent).toBe("true");
      expect(element.querySelector(".mode")?.textContent).toBe("setup");

      expect($rootScope.session.send("recover")).toBe(true);

      await wait();

      expect(element.querySelector(".phase")?.textContent).toBe("recovered");
      expect(element.querySelector(".selected")?.textContent).toBe("true");
    });

    it("keeps partial Map and Set mutations when hooks throw", async () => {
      const error = new Error("hook failed");
      let shouldThrow = true;
      const element = $compile(
        '<section><span class="phase">{{ session.data.metadata.get("phase") }}</span>' +
          '<span class="selected">{{ session.data.selected.has("a1") }}</span>' +
          '<span class="mode">{{ session.current }}</span></section>',
      )($rootScope);

      $rootScope.session = $machine({
        initial: "setup",
        data: {
          metadata: new Map([["phase", "idle"]]),
          selected: new Set<string>(),
        },
        transitions: {
          setup: {
            join() {
              return "waiting";
            },
          },
          waiting: {
            reset(data) {
              data.metadata.set("phase", "reset");

              return "setup";
            },
          },
        },
        hooks: {
          enter: {
            waiting(context) {
              context.data.metadata.set("phase", "entered");
              context.data.selected.add("a1");

              if (shouldThrow) {
                throw error;
              }
            },
          },
        },
      });

      await wait();

      expect(() => $rootScope.session.send("join")).toThrow(error);
      expect($rootScope.session.current).toBe("waiting");
      expect($rootScope.session.data.metadata.get("phase")).toBe("entered");
      expect($rootScope.session.data.selected.has("a1")).toBe(true);

      await wait();

      expect(element.querySelector(".mode")?.textContent).toBe("waiting");
      expect(element.querySelector(".phase")?.textContent).toBe("entered");
      expect(element.querySelector(".selected")?.textContent).toBe("true");

      shouldThrow = false;

      expect($rootScope.session.send("reset")).toBe(true);

      await wait();

      expect(element.querySelector(".mode")?.textContent).toBe("setup");
      expect(element.querySelector(".phase")?.textContent).toBe("reset");
      expect(element.querySelector(".selected")?.textContent).toBe("true");
    });

    it("updates templates when an enter hook throws after a mode change", async () => {
      const error = new Error("enter failed");
      const element = $compile(
        '<section><span class="mode">{{ session.current }}</span>' +
          '<span class="status">{{ session.data.status }}</span></section>',
      )($rootScope);

      $rootScope.session = $machine({
        initial: "setup",
        data: {
          status: "idle",
        },
        transitions: {
          setup: {
            join(data) {
              data.status = "joining";

              return "waiting";
            },
          },
        },
        hooks: {
          enter: {
            waiting(context) {
              context.data.status = "entered";

              throw error;
            },
          },
        },
      });

      await wait();

      expect(() => $rootScope.session.send("join")).toThrow(error);
      expect($rootScope.session.current).toBe("waiting");
      expect($rootScope.session.data.status).toBe("entered");

      await wait();

      expect(element.querySelector(".mode")?.textContent).toBe("waiting");
      expect(element.querySelector(".status")?.textContent).toBe("entered");
    });

    it("updates templates when a transition hook throws after a mode change", async () => {
      const error = new Error("transition hook failed");
      const element = $compile(
        '<section><span class="mode">{{ session.current }}</span>' +
          '<span class="status">{{ session.data.status }}</span></section>',
      )($rootScope);

      $rootScope.session = $machine({
        initial: "setup",
        data: {
          status: "idle",
        },
        transitions: {
          setup: {
            join(data) {
              data.status = "joining";

              return "waiting";
            },
          },
        },
        hooks: {
          transition(context) {
            context.data.status = "transitioned";

            throw error;
          },
        },
      });

      await wait();

      expect(() => $rootScope.session.send("join")).toThrow(error);
      expect($rootScope.session.current).toBe("waiting");
      expect($rootScope.session.data.status).toBe("transitioned");

      await wait();

      expect(element.querySelector(".mode")?.textContent).toBe("waiting");
      expect(element.querySelector(".status")?.textContent).toBe("transitioned");
    });
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
    const element = $compile(
      '<section><span class="mode">{{ game.current }}</span>' +
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
      transitions: {
        playing: {
          move(data, payload: { index: number }) {
            const index = payload.index;

            if (
              !Number.isInteger(index) ||
              index < 0 ||
              index >= data.board.length ||
              data.board[index] !== "-"
            ) {
              data.lastError = "invalid_move";

              return false;
            }

            const player = data.nextPlayer;

            data.board[index] = player;
            data.moveCount += 1;
            data.lastError = "";

            const winner = findWinner(data.board);

            if (winner) {
              data.winner = winner;

              return winner === "X" ? "xWon" : "oWon";
            }

            if (data.moveCount === data.board.length) {
              return "draw";
            }

            data.nextPlayer = player === "X" ? "O" : "X";

            return "playing";
          },
        },
      },
    });

    await wait();

    expect(element.querySelector(".mode")?.textContent).toBe("playing");
    expect(element.querySelector(".board")?.textContent).toBe("---------");

    for (const index of [0, 3, 1, 4, 2]) {
      expect($rootScope.game.send("move", { index })).toBe(true);
    }

    await wait();

    expect($rootScope.game.current).toBe("xWon");
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
    expect($rootScope.game.send("move", { index: 5 })).toBe(false);
    expect(element.querySelector(".mode")?.textContent).toBe("xWon");
    expect(element.querySelector(".winner")?.textContent).toBe("X");
    expect(element.querySelector(".next")?.textContent).toBe("X");
    expect(element.querySelector(".board")?.textContent).toBe("XXXOO----");
  });

  it("persists a tic tac toe state machine with transition hooks", () => {
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
        transitions: {
          playing: {
            move(data, payload: { index: number }) {
              const index = payload.index;

              if (
                !Number.isInteger(index) ||
                index < 0 ||
                index >= data.board.length ||
                data.board[index] !== "-"
              ) {
                data.lastError = "invalid_move";

                return false;
              }

              const player = data.nextPlayer;

              data.board[index] = player;
              data.moveCount += 1;
              data.lastError = "";

              const winner = findWinner(data.board);

              if (winner) {
                data.winner = winner;

                return winner === "X" ? "xWon" : "oWon";
              }

              if (data.moveCount === data.board.length) {
                return "draw";
              }

              data.nextPlayer = player === "X" ? "O" : "X";

              return "playing";
            },
          },
        },
        hooks: {
          transition({ machine }) {
            persistedWrites += 1;
            localStorage.setItem(storageKey, JSON.stringify(machine.snapshot()));
          },
        },
      });

    localStorage.removeItem(storageKey);

    try {
      const game = createGame();

      for (const index of [0, 3, 1, 4, 2]) {
        expect(game.send("move", { index })).toBe(true);
      }

      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");

      expect(persistedWrites).toBe(5);
      expect(saved).toEqual({
        current: "xWon",
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
      expect(restoredGame.current).toBe("xWon");
      expect(restoredGame.data.winner).toBe("X");
      expect(restoredGame.data.board.join("")).toBe("XXXOO----");
      expect(restoredGame.can("move")).toBe(false);
      expect(restoredGame.send("move", { index: 5 })).toBe(false);
      expect(persistedWrites).toBe(0);
    } finally {
      localStorage.removeItem(storageKey);
    }
  });

  it("creates a reactive machine with current mode and data", async () => {
    const element = $compile(
      '<section><span class="mode">{{ session.current }}</span>' +
        '<span class="room">{{ session.data.roomId }}</span></section>',
    )($rootScope);

    $rootScope.session = $machine({
      initial: "setup",
      data: {
        roomId: "",
      },
      transitions: {
        setup: {
          join(data, payload: { roomId: string }) {
            data.roomId = payload.roomId;
            return "waiting";
          },
        },
      },
    });

    await wait();

    expect(element.querySelector(".mode")?.textContent).toBe("setup");
    expect(element.querySelector(".room")?.textContent).toBe("");

    expect($rootScope.session.matches("setup")).toBe(true);
    expect($rootScope.session.can("join")).toBe(true);
    expect($rootScope.session.can("matched")).toBe(false);
    expect($rootScope.session.send("join", { roomId: "abc" })).toBe(true);

    await wait();

    expect(element.querySelector(".mode")?.textContent).toBe("waiting");
    expect(element.querySelector(".room")?.textContent).toBe("abc");
  });

  it("returns false for missing transitions without throwing", () => {
    const machine = $machine({
      initial: "setup",
      data: {},
      transitions: {},
    });

    expect(machine.can("join")).toBe(false);
    expect(machine.send("join")).toBe(false);
    expect(machine.current).toBe("setup");
  });

  it("treats non-function transition entries as missing transitions", () => {
    const machine = $machine({
      initial: "setup",
      data: {
        count: 0,
      },
      transitions: {
        setup: {
          join: "waiting",
        },
      },
    });

    expect(machine.can("join")).toBe(false);
    expect(machine.send("join")).toBe(false);
    expect(machine.current).toBe("setup");
    expect(machine.data.count).toBe(0);
  });

  it("ignores inherited transition modes and entries", () => {
    const inheritedJoin = jasmine.createSpy("join").and.returnValue("waiting");
    const inheritedTransitions = Object.create({
      setup: {
        join: inheritedJoin,
      },
    });

    inheritedTransitions.waiting = Object.create({
      start: jasmine.createSpy("start").and.returnValue("playing"),
    });

    const machine = $machine({
      initial: "setup",
      data: {},
      transitions: inheritedTransitions,
    });

    expect(machine.can("join")).toBe(false);
    expect(machine.send("join")).toBe(false);
    expect(machine.current).toBe("setup");
    expect(inheritedJoin).not.toHaveBeenCalled();

    machine.restore({
      current: "waiting",
      data: {},
    });

    expect(machine.can("start")).toBe(false);
    expect(machine.send("start")).toBe(false);
    expect(machine.current).toBe("waiting");
  });

  it("supports null-prototype transition maps and entries", () => {
    const transitions = Object.create(null);
    const setup = Object.create(null);

    setup.join = (data: { status: string }) => {
      data.status = "waiting";

      return "waiting";
    };
    transitions.setup = setup;

    const machine = $machine({
      initial: "setup",
      data: {
        status: "idle",
      },
      transitions,
    });

    expect(machine.can("join")).toBe(true);
    expect(machine.send("join")).toBe(true);
    expect(machine.current).toBe("waiting");
    expect(machine.data.status).toBe("waiting");
  });

  it("supports null-prototype hook maps", () => {
    const enter = Object.create(null);
    const hooks = Object.create(null);

    enter.waiting = (context: ng.MachineTransitionContext<{
      status: string;
    }>) => {
      context.data.status = "entered";
    };
    hooks.enter = enter;

    const machine = $machine({
      initial: "setup",
      data: {
        status: "idle",
      },
      transitions: {
        setup: {
          join() {
            return "waiting";
          },
        },
      },
      hooks,
    });

    expect(machine.send("join")).toBe(true);
    expect(machine.current).toBe("waiting");
    expect(machine.data.status).toBe("entered");
  });

  it("supports null-prototype machine data at creation time", () => {
    const data = Object.create(null);

    data.count = 0;

    const machine = $machine({
      initial: "idle",
      data,
      transitions: {
        idle: {
          tick(activeData) {
            activeData.count += 1;

            return "idle";
          },
        },
      },
    });

    expect(Object.getPrototypeOf(machine.data)).toBeNull();
    expect(machine.send("tick")).toBe(true);
    expect(machine.data.count).toBe(1);

    const snapshot = machine.snapshot();

    expect(snapshot.data).not.toBe(machine.data);
    expect(snapshot.data.count).toBe(1);
  });

  it("returns false for non-string transition names from JavaScript callers", () => {
    const join = jasmine.createSpy("join").and.returnValue("waiting");
    const symbolTransition = jasmine
      .createSpy("symbolTransition")
      .and.returnValue("waiting");
    const symbolType = Symbol("join");
    const machine = $machine({
      initial: "setup",
      data: {},
      transitions: {
        setup: {
          join,
          [symbolType]: symbolTransition,
        },
      },
    });

    expect(machine.can(undefined)).toBe(false);
    expect(machine.send(undefined)).toBe(false);
    expect(machine.can(symbolType)).toBe(false);
    expect(machine.send(symbolType)).toBe(false);
    expect(machine.current).toBe("setup");
    expect(join).not.toHaveBeenCalled();
    expect(symbolTransition).not.toHaveBeenCalled();
  });

  it("validates machine config shapes", () => {
    expect(() => $machine(undefined)).toThrowError(
      "$machine requires a config object.",
    );
    expect(() =>
      $machine({
        initial: "",
        data: {},
        transitions: {},
      }),
    ).toThrowError("$machine requires a non-empty initial mode.");
    expect(() =>
      $machine({
        initial: "setup",
        data: null,
        transitions: {},
      }),
    ).toThrowError("$machine requires a data object.");
    expect(() =>
      $machine({
        initial: "setup",
        data: {},
        transitions: null,
      }),
    ).toThrowError("$machine requires a transitions object.");
  });

  it("runs without an owning scope before any template observes it", () => {
    const machine = $machine({
      initial: "setup",
      data: {
        error: "",
      },
      transitions: {
        setup: {
          fail(data, reason: string) {
            data.error = reason;
            return false;
          },
        },
      },
    });

    expect(machine.send("fail", "room_unavailable")).toBe(true);
    expect(machine.current).toBe("setup");
    expect(machine.data.error).toBe("room_unavailable");
  });

  it("creates deep snapshots of current mode and data", () => {
    const machine = $machine({
      initial: "setup",
      data: {
        room: {
          id: "",
          players: ["Ada"],
        },
      },
      transitions: {
        setup: {
          join(data, payload: { roomId: string }) {
            data.room.id = payload.roomId;
            data.room.players.push("Grace");
            return "waiting";
          },
        },
      },
    });

    expect(machine.send("join", { roomId: "abc" })).toBe(true);

    const snapshot = machine.snapshot();

    expect(snapshot).toEqual({
      current: "waiting",
      data: {
        room: {
          id: "abc",
          players: ["Ada", "Grace"],
        },
      },
    });
    expect(snapshot.data).not.toBe(machine.data);
    expect(snapshot.data.room).not.toBe(machine.data.room);

    snapshot.current = "setup";
    snapshot.data.room.id = "mutated";
    snapshot.data.room.players.push("Linus");

    expect(machine.current).toBe("waiting");
    expect(machine.data.room.id).toBe("abc");
    expect(machine.data.room.players).toEqual(["Ada", "Grace"]);
  });

  it("snapshots Map and Set data as independent clones", () => {
    const machine = $machine({
      initial: "setup",
      data: {
        metadata: new Map([["phase", "setup"]]),
        selected: new Set(["a1"]),
      },
      transitions: {},
    });

    const snapshot = machine.snapshot();

    expect(snapshot.data.metadata).not.toBe(machine.data.metadata);
    expect(snapshot.data.metadata.get("phase")).toBe("setup");
    expect(snapshot.data.selected).not.toBe(machine.data.selected);
    expect(snapshot.data.selected.has("a1")).toBe(true);

    snapshot.data.metadata.set("phase", "mutated");
    snapshot.data.selected.add("b2");

    expect(machine.data.metadata.get("phase")).toBe("setup");
    expect(machine.data.selected.has("b2")).toBe(false);
  });

  it("snapshots structured-clone compatible Date and typed array data", () => {
    const machine = $machine({
      initial: "ready",
      data: {
        startedAt: new Date("2024-01-02T03:04:05.000Z"),
        bytes: new Uint8Array([1, 2, 3]),
      },
      transitions: {},
    });

    const snapshot = machine.snapshot();

    expect(snapshot.data.startedAt).not.toBe(machine.data.startedAt);
    expect(snapshot.data.startedAt.getTime()).toBe(
      machine.data.startedAt.getTime(),
    );
    expect(snapshot.data.bytes).not.toBe(machine.data.bytes);
    expect(Array.from(snapshot.data.bytes)).toEqual([1, 2, 3]);

    snapshot.data.startedAt.setUTCFullYear(2025);
    snapshot.data.bytes[0] = 9;

    expect(machine.data.startedAt.getUTCFullYear()).toBe(2024);
    expect(Array.from(machine.data.bytes)).toEqual([1, 2, 3]);
  });

  it("surfaces native structuredClone errors for non-cloneable snapshot data", () => {
    const machine = $machine({
      initial: "setup",
      data: {
        value: 1,
        callback() {
          return "not cloneable";
        },
      },
      transitions: {},
    });

    expect(() => machine.snapshot()).toThrow();
  });

  it("snapshots and restores self-referential data without recursion", () => {
    const data: Record<string, unknown> = {
      status: "idle",
    };

    data.self = data;

    const machine = $machine({
      initial: "setup",
      data,
      transitions: {
        setup: {
          join(machineData) {
            machineData.status = "waiting";
            return "waiting";
          },
        },
      },
    });

    expect(machine.send("join")).toBe(true);

    const snapshot = machine.snapshot();

    expect(snapshot.current).toBe("waiting");
    expect(snapshot.data.self).toBe(snapshot.data);

    machine.restore({
      current: "setup",
      data: {
        status: "restored",
        self: data,
      },
    });

    expect(machine.current).toBe("setup");
    expect(machine.data.status).toBe("restored");
    expect(machine.data.self).toBe(machine.data);

    machine.restore(snapshot);

    expect(machine.current).toBe("waiting");
    expect(machine.data.status).toBe("waiting");
    expect(machine.data.self).toBe(machine.data);
  });

  it("can restore from the live data object without changing identity", () => {
    const machine = $machine({
      initial: "setup",
      data: {
        room: {
          status: "idle",
        },
      },
      transitions: {},
    });
    const dataRef = machine.data;
    const roomRef = machine.data.room;

    machine.data.room.status = "ready";
    machine.restore({
      current: "waiting",
      data: machine.data,
    });

    expect(machine.current).toBe("waiting");
    expect(machine.data).toBe(dataRef);
    expect(machine.data.room).toBe(roomRef);
    expect(machine.data.room.status).toBe("ready");
  });

  it("restores null-prototype plain objects in place", () => {
    const room = Object.create(null);

    room.status = "idle";
    room.stale = true;

    const machine = $machine({
      initial: "setup",
      data: {
        room,
      },
      transitions: {},
    });
    const roomRef = machine.data.room;
    const restoredRoom = Object.create(null);

    restoredRoom.status = "ready";

    machine.restore({
      current: "ready",
      data: {
        room: restoredRoom,
      },
    });

    expect(machine.current).toBe("ready");
    expect(machine.data.room).toBe(roomRef);
    expect(machine.data.room.status).toBe("ready");
    expect("stale" in machine.data.room).toBe(false);
  });

  it("restores mode and data in place without running hooks", () => {
    const enter = jasmine.createSpy("enter");
    const exit = jasmine.createSpy("exit");
    const transitionHook = jasmine.createSpy("transition");
    const machine = $machine({
      initial: "setup",
      data: {
        room: {
          id: "",
          status: "idle",
        },
        stale: true,
      },
      transitions: {
        setup: {
          join(data, payload: { roomId: string }) {
            data.room.id = payload.roomId;
            data.room.status = "waiting";
            return "waiting";
          },
        },
      },
      hooks: {
        exit: {
          setup: exit,
        },
        enter: {
          waiting: enter,
        },
        transition: transitionHook,
      },
    });
    const dataRef = machine.data;
    const roomRef = machine.data.room;

    expect(machine.send("join", { roomId: "abc" })).toBe(true);
    expect(enter).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledTimes(1);
    expect(transitionHook).toHaveBeenCalledTimes(1);

    enter.calls.reset();
    exit.calls.reset();
    transitionHook.calls.reset();

    machine.restore({
      current: "setup",
      data: {
        room: {
          id: "restored",
          status: "ready",
        },
      },
    });

    expect(machine.current).toBe("setup");
    expect(machine.data).toBe(dataRef);
    expect(machine.data.room).toBe(roomRef);
    expect(machine.data.room).toEqual({
      id: "restored",
      status: "ready",
    });
    expect("stale" in machine.data).toBe(false);
    expect(enter).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
    expect(transitionHook).not.toHaveBeenCalled();
  });

  it("restores cloned snapshot values for new and non-plain data", () => {
    const machine = $machine({
      initial: "setup",
      data: {
        players: ["Ada"],
      },
      transitions: {},
    });
    const snapshot = {
      current: "waiting",
      data: {
        players: ["Grace", "Linus"],
      },
    };

    machine.restore(snapshot);

    expect(machine.current).toBe("waiting");
    expect(machine.data.players).toEqual(["Grace", "Linus"]);
    expect(machine.data.players).not.toBe(snapshot.data.players);

    snapshot.data.players.push("Margaret");

    expect(machine.data.players).toEqual(["Grace", "Linus"]);
  });

  it("replaces restored non-plain object values instead of merging them", () => {
    const originalDate = new Date("2024-01-01T00:00:00.000Z");
    const originalMap = new Map([["phase", "setup"]]);
    const originalSet = new Set(["setup"]);
    const machine = $machine({
      initial: "setup",
      data: {
        startedAt: originalDate,
        metadata: originalMap,
        selected: originalSet,
      },
      transitions: {},
    });
    const restoredDate = new Date("2024-02-01T00:00:00.000Z");
    const restoredMap = new Map([["phase", "waiting"]]);
    const restoredSet = new Set(["waiting"]);
    const snapshot = {
      current: "waiting",
      data: {
        startedAt: restoredDate,
        metadata: restoredMap,
        selected: restoredSet,
      },
    };

    machine.restore(snapshot);

    expect(machine.current).toBe("waiting");
    expect(machine.data.startedAt).not.toBe(originalDate);
    expect(machine.data.startedAt).not.toBe(restoredDate);
    expect(machine.data.startedAt.getTime()).toBe(restoredDate.getTime());
    expect(machine.data.metadata).not.toBe(originalMap);
    expect(machine.data.metadata).not.toBe(restoredMap);
    expect(machine.data.metadata.get("phase")).toBe("waiting");
    expect(machine.data.selected).not.toBe(originalSet);
    expect(machine.data.selected).not.toBe(restoredSet);
    expect(machine.data.selected.has("waiting")).toBe(true);

    restoredDate.setFullYear(2025);
    restoredMap.set("phase", "mutated");
    restoredSet.add("mutated");

    expect(machine.data.startedAt.getUTCFullYear()).toBe(2024);
    expect(machine.data.metadata.get("phase")).toBe("waiting");
    expect(machine.data.selected.has("mutated")).toBe(false);
  });

  it("replaces restored arrays instead of preserving stale indexes", () => {
    const machine = $machine({
      initial: "setup",
      data: {
        players: ["Ada", "Grace", "Katherine"],
      },
      transitions: {},
    });

    const restoredPlayers = ["Margaret"];

    machine.restore({
      current: "setup",
      data: {
        players: restoredPlayers,
      },
    });

    expect(machine.data.players).toEqual(["Margaret"]);
    expect(machine.data.players.length).toBe(1);
    expect(machine.data.players).not.toBe(restoredPlayers);

    restoredPlayers.push("Barbara");

    expect(machine.data.players).toEqual(["Margaret"]);
  });

  it("replaces restored nested objects with primitive values", () => {
    const machine = $machine({
      initial: "setup",
      data: {
        room: {
          status: "waiting",
          stale: true,
        } as { status: string; stale?: boolean } | null,
      },
      transitions: {},
    });

    machine.restore({
      current: "setup",
      data: {
        room: null,
      },
    });

    expect(machine.data.room).toBeNull();
  });

  it("updates transition availability from the restored mode", () => {
    const machine = $machine({
      initial: "setup",
      data: {},
      transitions: {
        setup: {
          join() {
            return "waiting";
          },
        },
        waiting: {
          start() {
            return "playing";
          },
        },
      },
    });

    machine.restore({
      current: "waiting",
      data: {},
    });

    expect(machine.matches("waiting")).toBe(true);
    expect(machine.can("join")).toBe(false);
    expect(machine.can("start")).toBe(true);
    expect(machine.send("start")).toBe(true);
    expect(machine.matches("playing")).toBe(true);
  });

  it("updates templates after restore", async () => {
    const element = $compile(
      '<section><span class="mode">{{ session.current }}</span>' +
        '<span class="status">{{ session.data.room.status }}</span></section>',
    )($rootScope);

    $rootScope.session = $machine({
      initial: "setup",
      data: {
        room: {
          status: "idle",
        },
      },
      transitions: {},
    });

    await wait();

    expect(element.querySelector(".mode")?.textContent).toBe("setup");
    expect(element.querySelector(".status")?.textContent).toBe("idle");

    $rootScope.session.restore({
      current: "waiting",
      data: {
        room: {
          status: "restored",
        },
      },
    });

    await wait();

    expect(element.querySelector(".mode")?.textContent).toBe("waiting");
    expect(element.querySelector(".status")?.textContent).toBe("restored");
  });

  it("updates templates when restore removes stale data keys", async () => {
    const element = $compile(
      '<section><span class="status">{{ session.data.status }}</span>' +
        '<span class="error">{{ session.data.error }}</span></section>',
    )($rootScope);

    $rootScope.session = $machine({
      initial: "failed",
      data: {
        status: "failed",
        error: "room_unavailable",
      },
      transitions: {},
    });

    await wait();

    expect(element.querySelector(".status")?.textContent).toBe("failed");
    expect(element.querySelector(".error")?.textContent).toBe(
      "room_unavailable",
    );

    $rootScope.session.restore({
      current: "ready",
      data: {
        status: "ready",
      },
    });

    await wait();

    expect(element.querySelector(".status")?.textContent).toBe("ready");
    expect(element.querySelector(".error")?.textContent).toBe("");
  });

  it("updates templates when restore removes stale nested data keys", async () => {
    const element = $compile(
      '<section><span class="status">{{ session.data.room.status }}</span>' +
        '<span class="error">{{ session.data.room.error }}</span></section>',
    )($rootScope);

    $rootScope.session = $machine({
      initial: "failed",
      data: {
        room: {
          status: "failed",
          error: "room_unavailable",
        },
      },
      transitions: {},
    });

    await wait();

    expect(element.querySelector(".status")?.textContent).toBe("failed");
    expect(element.querySelector(".error")?.textContent).toBe(
      "room_unavailable",
    );

    $rootScope.session.restore({
      current: "ready",
      data: {
        room: {
          status: "ready",
        },
      },
    });

    await wait();

    expect(element.querySelector(".status")?.textContent).toBe("ready");
    expect(element.querySelector(".error")?.textContent).toBe("");
  });

  it("runs restore inside the owning scope batch", () => {
    const batchSpy = spyOn($rootScope.$handler, "$batch").and.callThrough();

    $rootScope.session = $machine({
      initial: "setup",
      data: {
        status: "idle",
      },
      transitions: {},
    });

    expect($rootScope.session.matches("setup")).toBe(true);

    $rootScope.session.restore({
      current: "waiting",
      data: {
        status: "restored",
      },
    });

    expect(batchSpy).toHaveBeenCalledTimes(1);
    expect($rootScope.session.current).toBe("waiting");
    expect($rootScope.session.data.status).toBe("restored");
  });

  it("validates restore snapshots", () => {
    const machine = $machine({
      initial: "setup",
      data: {},
      transitions: {},
    });

    expect(() => machine.restore(undefined)).toThrowError(
      "$machine restore requires a snapshot object.",
    );
    expect(() => machine.restore({ current: "", data: {} })).toThrowError(
      "$machine restore requires a non-empty current mode.",
    );
    expect(() =>
      machine.restore({ current: "setup", data: undefined }),
    ).toThrowError("$machine restore requires a data object.");
  });

  it("does not preserve stale keys from inherited snapshot data", () => {
    const inheritedData = Object.create({
      status: "inherited",
      stale: true,
    });

    inheritedData.status = "ready";

    const machine = $machine({
      initial: "setup",
      data: {
        status: "idle",
        stale: true,
      },
      transitions: {},
    });

    machine.restore({
      current: "ready",
      data: inheritedData,
    });

    expect(machine.current).toBe("ready");
    expect(machine.data.status).toBe("ready");
    expect("stale" in machine.data).toBe(false);
  });

  it("restores own __proto__ data keys without changing object prototypes", () => {
    const machine = $machine({
      initial: "setup",
      data: {
        status: "idle",
      },
      transitions: {},
    });
    const snapshot = JSON.parse(
      '{"current":"ready","data":{"status":"ready","__proto__":{"polluted":true}}}',
    );
    const originalPrototype = Reflect.getPrototypeOf(machine.data);

    machine.restore(snapshot);

    expect(machine.current).toBe("ready");
    expect(machine.data.status).toBe("ready");
    expect(Object.prototype.hasOwnProperty.call(machine.data, "__proto__")).toBe(
      true,
    );
    expect(machine.data.__proto__).toEqual({
      polluted: true,
    });
    expect(Reflect.getPrototypeOf(machine.data)).toBe(originalPrototype);
    expect({}.polluted).toBeUndefined();
  });

  it("restores nested own __proto__ data keys without changing object prototypes", () => {
    const machine = $machine({
      initial: "setup",
      data: {
        room: {
          status: "idle",
        },
      },
      transitions: {},
    });
    const snapshot = JSON.parse(
      '{"current":"ready","data":{"room":{"status":"ready","__proto__":{"polluted":true}}}}',
    );
    const dataPrototype = Reflect.getPrototypeOf(machine.data);
    const roomPrototype = Reflect.getPrototypeOf(machine.data.room);

    machine.restore(snapshot);

    expect(machine.current).toBe("ready");
    expect(machine.data.room.status).toBe("ready");
    expect(
      Object.prototype.hasOwnProperty.call(machine.data.room, "__proto__"),
    ).toBe(true);
    expect(machine.data.room.__proto__).toEqual({
      polluted: true,
    });
    expect(Reflect.getPrototypeOf(machine.data)).toBe(dataPrototype);
    expect(Reflect.getPrototypeOf(machine.data.room)).toBe(roomPrototype);
    expect({}.polluted).toBeUndefined();
  });

  it("restores constructor prototype data without polluting object prototypes", () => {
    const machine = $machine({
      initial: "setup",
      data: {
        status: "idle",
      },
      transitions: {},
    });
    const snapshot = {
      current: "ready",
      data: {
        status: "ready",
        constructor: {
          prototype: {
            polluted: true,
          },
        },
      },
    };
    const originalPrototype = Reflect.getPrototypeOf(machine.data);

    machine.restore(snapshot);

    expect(machine.current).toBe("ready");
    expect(machine.data.status).toBe("ready");
    expect(Object.prototype.hasOwnProperty.call(machine.data, "constructor")).toBe(
      true,
    );
    expect(machine.data.constructor).toEqual({
      prototype: {
        polluted: true,
      },
    });
    expect(Reflect.getPrototypeOf(machine.data)).toBe(originalPrototype);
    expect({}.polluted).toBeUndefined();
  });

  it("snapshots own __proto__ data keys without changing object prototypes", () => {
    const data = {
      status: "idle",
    };

    Object.defineProperty(data, "__proto__", {
      value: {
        label: "data",
      },
      enumerable: true,
      configurable: true,
      writable: true,
    });

    const machine = $machine({
      initial: "setup",
      data,
      transitions: {},
    });
    const originalPrototype = Reflect.getPrototypeOf(machine.data);

    const snapshot = machine.snapshot();

    expect(snapshot.current).toBe("setup");
    expect(Object.prototype.hasOwnProperty.call(snapshot.data, "__proto__")).toBe(
      true,
    );
    expect(snapshot.data.__proto__).toEqual({
      label: "data",
    });
    expect(Reflect.getPrototypeOf(machine.data)).toBe(originalPrototype);
  });

  it("restores named machines registered through module.machine", () => {
    window.angular = new Angular();
    window.angular.module("namedMachineSnapshotApp", ["ng"]).machine(
      "sessionMachine",
      {
        initial: "setup",
        data: {
          status: "idle",
        },
        transitions: {
          setup: {
            join(data) {
              data.status = "waiting";
              return "waiting";
            },
          },
        },
      },
    );

    const injector = createInjector(["namedMachineSnapshotApp"]);
    const machine = injector.get("sessionMachine") as ng.Machine<{
      status: string;
    }>;

    expect(machine.send("join")).toBe(true);

    const snapshot = machine.snapshot();

    machine.restore({
      current: "setup",
      data: {
        status: "restored",
      },
    });

    expect(machine.current).toBe("setup");
    expect(machine.data.status).toBe("restored");

    machine.restore(snapshot);

    expect(machine.current).toBe("waiting");
    expect(machine.data.status).toBe("waiting");
  });

  it("returns one named machine instance per injector", () => {
    window.angular = new Angular();
    window.angular.module("namedMachineSingletonApp", ["ng"]).machine(
      "sessionMachine",
      {
        initial: "setup",
        data: {
          status: "idle",
        },
        transitions: {
          setup: {
            join(data) {
              data.status = "waiting";
              return "waiting";
            },
          },
        },
      },
    );

    const injector = createInjector(["namedMachineSingletonApp"]);
    const firstMachine = injector.get("sessionMachine") as ng.Machine<{
      status: string;
    }>;
    const secondMachine = injector.get("sessionMachine") as ng.Machine<{
      status: string;
    }>;

    expect(firstMachine).toBe(secondMachine);
    expect(firstMachine.send("join")).toBe(true);
    expect(secondMachine.current).toBe("waiting");
    expect(secondMachine.data.status).toBe("waiting");
  });

  it("returns separate named machine instances for separate injectors", () => {
    window.angular = new Angular();
    window.angular.module("namedMachineInjectorApp", ["ng"]).machine(
      "sessionMachine",
      {
        initial: "setup",
        data: {
          status: "idle",
        },
        transitions: {
          setup: {
            join(data) {
              data.status = "waiting";
              return "waiting";
            },
          },
        },
      },
    );

    const firstInjector = createInjector(["namedMachineInjectorApp"]);
    const secondInjector = createInjector(["namedMachineInjectorApp"]);
    const firstMachine = firstInjector.get("sessionMachine") as ng.Machine<{
      status: string;
    }>;
    const secondMachine = secondInjector.get("sessionMachine") as ng.Machine<{
      status: string;
    }>;

    expect(firstMachine).not.toBe(secondMachine);
    expect(firstMachine.send("join")).toBe(true);
    expect(firstMachine.current).toBe("waiting");
    expect(firstMachine.data.status).toBe("waiting");
    expect(secondMachine.current).toBe("setup");
    expect(secondMachine.data.status).toBe("idle");
  });

  it("does not mutate the config data object for named machines", () => {
    const configData = {
      room: {
        status: "idle",
        players: ["Ada"],
      },
    };

    window.angular = new Angular();
    window.angular.module("namedMachineConfigDataApp", ["ng"]).machine(
      "sessionMachine",
      {
        initial: "setup",
        data: configData,
        transitions: {
          setup: {
            join(data) {
              data.room.status = "waiting";
              data.room.players.push("Grace");
              return "waiting";
            },
          },
        },
      },
    );

    const injector = createInjector(["namedMachineConfigDataApp"]);
    const machine = injector.get("sessionMachine") as ng.Machine<{
      room: {
        status: string;
        players: string[];
      };
    }>;

    expect(machine.send("join")).toBe(true);
    expect(machine.data.room.status).toBe("waiting");
    expect(machine.data.room.players).toEqual(["Ada", "Grace"]);
    expect(configData).toEqual({
      room: {
        status: "idle",
        players: ["Ada"],
      },
    });
  });

  it("deeply isolates named machine data across separate injectors", () => {
    window.angular = new Angular();
    window.angular.module("namedMachineNestedInjectorApp", ["ng"]).machine(
      "sessionMachine",
      {
        initial: "setup",
        data: {
          room: {
            status: "idle",
            players: ["Ada"],
          },
        },
        transitions: {
          setup: {
            join(data) {
              data.room.status = "waiting";
              data.room.players.push("Grace");
              return "waiting";
            },
          },
        },
      },
    );

    const firstInjector = createInjector(["namedMachineNestedInjectorApp"]);
    const secondInjector = createInjector(["namedMachineNestedInjectorApp"]);
    const firstMachine = firstInjector.get("sessionMachine") as ng.Machine<{
      room: {
        status: string;
        players: string[];
      };
    }>;
    const secondMachine = secondInjector.get("sessionMachine") as ng.Machine<{
      room: {
        status: string;
        players: string[];
      };
    }>;

    expect(firstMachine.send("join")).toBe(true);
    expect(firstMachine.data.room.status).toBe("waiting");
    expect(firstMachine.data.room.players).toEqual(["Ada", "Grace"]);
    expect(secondMachine.data.room.status).toBe("idle");
    expect(secondMachine.data.room.players).toEqual(["Ada"]);
  });

  it("can bind explicitly to a scope", async () => {
    const element = $compile(
      '<section><span class="mode">{{ session.current }}</span>' +
        '<span class="status">{{ session.data.status }}</span></section>',
    )($rootScope);

    $rootScope.session = $machine($rootScope, {
      initial: "setup",
      data: {
        status: "idle",
      },
      transitions: {
        setup: {
          join(data) {
            data.status = "waiting";
            return "waiting";
          },
        },
      },
    });

    expect($rootScope.session.send("join")).toBe(true);

    await wait();

    expect(element.querySelector(".mode")?.textContent).toBe("waiting");
    expect(element.querySelector(".status")?.textContent).toBe("waiting");
  });

  it("keeps raw and scoped machines in sync after scoped transitions", () => {
    const rawMachine = $machine({
      initial: "setup",
      data: {
        status: "idle",
      },
      transitions: {
        setup: {
          join(data) {
            data.status = "waiting";
            return "waiting";
          },
        },
      },
    });

    $rootScope.session = rawMachine;

    const scopedMachine = $rootScope.session as ng.Machine<{
      status: string;
    }>;

    expect(scopedMachine.send("join")).toBe(true);

    expect(rawMachine.current).toBe("waiting");
    expect(rawMachine.data.status).toBe("waiting");
    expect(rawMachine.snapshot()).toEqual({
      current: "waiting",
      data: {
        status: "waiting",
      },
    });
    expect(scopedMachine.snapshot()).toEqual(rawMachine.snapshot());
  });

  it("keeps raw and sibling scoped machines in sync after scoped current assignment", async () => {
    const rawMachine = $machine({
      initial: "setup",
      data: {
        status: "idle",
      },
      transitions: {
        waiting: {
          start(data) {
            data.status = "playing";
            return "playing";
          },
        },
      },
    });
    const firstScope = $rootScope.$new();
    const secondScope = $rootScope.$new();
    const firstElement = $compile(
      '<section><span class="mode">{{ session.current }}</span></section>',
    )(firstScope);
    const secondElement = $compile(
      '<section><span class="mode">{{ session.current }}</span></section>',
    )(secondScope);

    firstScope.session = rawMachine;
    secondScope.session = rawMachine;

    await wait();

    firstScope.session.current = "waiting";

    await wait();

    expect(rawMachine.current).toBe("waiting");
    expect(firstScope.session.matches("waiting")).toBe(true);
    expect(secondScope.session.matches("waiting")).toBe(true);
    expect(firstElement.querySelector(".mode")?.textContent).toBe("waiting");
    expect(secondElement.querySelector(".mode")?.textContent).toBe("waiting");
    expect(rawMachine.can("start")).toBe(true);
    expect(secondScope.session.send("start")).toBe(true);
    expect(rawMachine.current).toBe("playing");
  });

  it("checks transition availability without running the transition", () => {
    const transition = jasmine
      .createSpy("transition")
      .and.returnValue("waiting");

    const machine = $machine({
      initial: "setup",
      data: {},
      transitions: {
        setup: {
          join: transition,
        },
      },
    });

    expect(machine.can("join")).toBe(true);
    expect(transition).not.toHaveBeenCalled();
    expect(machine.current).toBe("setup");
  });

  it("updates can and matches from the current mode", () => {
    const machine = $machine({
      initial: "setup",
      data: {},
      transitions: {
        setup: {
          join() {
            return "waiting";
          },
        },
        waiting: {
          matched() {
            return "playing";
          },
        },
      },
    });

    expect(machine.matches("setup")).toBe(true);
    expect(machine.can("join")).toBe(true);
    expect(machine.can("matched")).toBe(false);

    expect(machine.send("join")).toBe(true);

    expect(machine.matches("setup")).toBe(false);
    expect(machine.matches("waiting")).toBe(true);
    expect(machine.can("join")).toBe(false);
    expect(machine.can("matched")).toBe(true);
  });

  it("fails closed when JavaScript callers assign an invalid current mode", () => {
    const join = jasmine.createSpy("join").and.returnValue("waiting");
    const machine = $machine({
      initial: "setup",
      data: {},
      transitions: {
        setup: {
          join,
        },
      },
    });

    (machine as unknown as { current: unknown }).current = undefined;

    expect(machine.matches("setup")).toBe(false);
    expect(machine.can("join")).toBe(false);
    expect(machine.send("join")).toBe(false);
    expect(join).not.toHaveBeenCalled();

    (machine as unknown as { current: unknown }).current = "";

    expect(machine.can("join")).toBe(false);
    expect(machine.send("join")).toBe(false);
    expect(join).not.toHaveBeenCalled();
  });

  it("treats false and undefined transition results as staying in the current mode", () => {
    const machine = $machine({
      initial: "setup",
      data: {
        count: 0,
      },
      transitions: {
        setup: {
          stayFalse(data) {
            data.count += 1;
            return false;
          },
          stayUndefined(data) {
            data.count += 1;
          },
        },
      },
    });

    expect(machine.send("stayFalse")).toBe(true);
    expect(machine.current).toBe("setup");
    expect(machine.data.count).toBe(1);

    expect(machine.send("stayUndefined")).toBe(true);
    expect(machine.current).toBe("setup");
    expect(machine.data.count).toBe(2);
  });

  it("keeps the original mode when a staying transition mutates machine.current", () => {
    const machine = $machine({
      initial: "setup",
      data: {},
      transitions: {
        setup: {
          stayFalse(_data, _payload, activeMachine) {
            activeMachine.current = "mutated";

            return false;
          },
          stayUndefined(_data, _payload, activeMachine) {
            activeMachine.current = "mutated";
          },
        },
      },
    });

    expect(machine.send("stayFalse")).toBe(true);
    expect(machine.current).toBe("setup");

    expect(machine.send("stayUndefined")).toBe(true);
    expect(machine.current).toBe("setup");
  });

  it("uses the returned mode when a transition also mutates machine.current", () => {
    const machine = $machine({
      initial: "setup",
      data: {},
      transitions: {
        setup: {
          join(_data, _payload, activeMachine) {
            activeMachine.current = "manual";

            return "waiting";
          },
        },
      },
    });

    expect(machine.send("join")).toBe(true);
    expect(machine.current).toBe("waiting");
    expect(machine.matches("manual")).toBe(false);
  });

  it("treats non-string transition results as staying in the current mode", () => {
    const machine = $machine({
      initial: "setup",
      data: {
        count: 0,
      },
      transitions: {
        setup: {
          stayNull(data) {
            data.count += 1;

            return null;
          },
          stayObject(data) {
            data.count += 1;

            return {
              mode: "waiting",
            };
          },
        },
      },
    });

    expect(machine.send("stayNull")).toBe(true);
    expect(machine.current).toBe("setup");
    expect(machine.data.count).toBe(1);

    expect(machine.send("stayObject")).toBe(true);
    expect(machine.current).toBe("setup");
    expect(machine.data.count).toBe(2);
  });

  it("treats empty string transition results as staying in the current mode", () => {
    const transitionHook = jasmine.createSpy("transition");
    const enter = jasmine.createSpy("enter");
    const exit = jasmine.createSpy("exit");
    const machine = $machine({
      initial: "setup",
      data: {
        count: 0,
      },
      transitions: {
        setup: {
          stayEmpty(data) {
            data.count += 1;

            return "";
          },
        },
      },
      hooks: {
        exit: {
          setup: exit,
        },
        enter: {
          setup: enter,
        },
        transition: transitionHook,
      },
    });

    expect(machine.send("stayEmpty")).toBe(true);

    expect(machine.current).toBe("setup");
    expect(machine.data.count).toBe(1);
    expect(exit).not.toHaveBeenCalled();
    expect(enter).not.toHaveBeenCalled();
    expect(transitionHook).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({
        type: "stayEmpty",
        from: "setup",
        to: "setup",
      }),
    );
  });

  it("uses the returned mode when an exit hook mutates machine.current", () => {
    const machine = $machine({
      initial: "setup",
      data: {},
      transitions: {
        setup: {
          join() {
            return "waiting";
          },
        },
      },
      hooks: {
        exit: {
          setup(context) {
            context.machine.current = "manual";
          },
        },
      },
    });

    expect(machine.send("join")).toBe(true);
    expect(machine.current).toBe("waiting");
    expect(machine.matches("manual")).toBe(false);
  });

  it("allows same-mode transitions to run repeatedly for data updates", () => {
    const machine = $machine({
      initial: "playing",
      data: {
        version: 0,
      },
      transitions: {
        playing: {
          snapshot(data, payload: { version: number }) {
            data.version = payload.version;
            return "playing";
          },
        },
      },
    });

    expect(machine.send("snapshot", { version: 1 })).toBe(true);
    expect(machine.send("snapshot", { version: 2 })).toBe(true);
    expect(machine.current).toBe("playing");
    expect(machine.data.version).toBe(2);
  });

  it("runs enter, exit, and transition hooks with transition context", () => {
    const calls: string[] = [];

    const machine = $machine({
      initial: "setup",
      data: {
        roomId: "",
      },
      transitions: {
        setup: {
          join(data, payload: { roomId: string }) {
            data.roomId = payload.roomId;
            return "waiting";
          },
        },
      },
      hooks: {
        exit: {
          setup(context) {
            calls.push(
              `exit:${context.from}->${context.to}:${context.data.roomId}`,
            );
            expect(context.type).toBe("join");
            expect(context.payload).toEqual({ roomId: "abc" });
            expect(context.machine.current).toBe("setup");
          },
        },
        enter: {
          waiting(context) {
            calls.push(
              `enter:${context.from}->${context.to}:${context.data.roomId}`,
            );
            expect(context.machine.current).toBe("waiting");
          },
        },
        transition(context) {
          calls.push(
            `transition:${context.from}->${context.to}:${context.data.roomId}`,
          );
          expect(context.machine.current).toBe("waiting");
        },
      },
    });

    expect(machine.send("join", { roomId: "abc" })).toBe(true);

    expect(calls).toEqual([
      "exit:setup->waiting:abc",
      "enter:setup->waiting:abc",
      "transition:setup->waiting:abc",
    ]);
  });

  it("rethrows transition errors without running hooks and restores batching", () => {
    const error = new Error("transition failed");
    const enter = jasmine.createSpy("enter");
    const exit = jasmine.createSpy("exit");
    const transitionHook = jasmine.createSpy("transition");
    let shouldThrow = true;
    const scope = $rootScope.$new();

    scope.session = $machine({
      initial: "setup",
      data: {
        attempts: 0,
      },
      transitions: {
        setup: {
          join(data) {
            data.attempts += 1;

            if (shouldThrow) {
              throw error;
            }

            return "waiting";
          },
        },
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

    expect(scope.session.matches("setup")).toBe(true);
    expect(() => scope.session.send("join")).toThrow(error);
    expect(scope.session.matches("setup")).toBe(true);
    expect(scope.session.data.attempts).toBe(1);
    expect(exit).not.toHaveBeenCalled();
    expect(enter).not.toHaveBeenCalled();
    expect(transitionHook).not.toHaveBeenCalled();

    shouldThrow = false;

    expect(scope.session.send("join")).toBe(true);
    expect(scope.session.matches("waiting")).toBe(true);
    expect(scope.session.data.attempts).toBe(2);
    expect(exit).toHaveBeenCalledTimes(1);
    expect(enter).toHaveBeenCalledTimes(1);
    expect(transitionHook).toHaveBeenCalledTimes(1);
  });

  it("does not run hooks for missing transitions", () => {
    const enter = jasmine.createSpy("enter");
    const exit = jasmine.createSpy("exit");
    const transitionHook = jasmine.createSpy("transition");

    const machine = $machine({
      initial: "setup",
      data: {},
      transitions: {},
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

    expect(machine.send("join")).toBe(false);
    expect(exit).not.toHaveBeenCalled();
    expect(enter).not.toHaveBeenCalled();
    expect(transitionHook).not.toHaveBeenCalled();
  });

  it("ignores inherited mode and transition hooks", () => {
    const exit = jasmine.createSpy("exit");
    const enter = jasmine.createSpy("enter");
    const transitionHook = jasmine.createSpy("transition");
    const objectPrototype = Object.prototype as Record<string, unknown>;

    objectPrototype.setup = exit;
    objectPrototype.waiting = enter;
    objectPrototype.transition = transitionHook;

    try {
      const machine = $machine({
        initial: "setup",
        data: {},
        transitions: {
          setup: {
            join() {
              return "waiting";
            },
          },
        },
        hooks: {
          exit: {},
          enter: {},
        },
      });

      expect(machine.send("join")).toBe(true);
      expect(machine.current).toBe("waiting");
      expect(exit).not.toHaveBeenCalled();
      expect(enter).not.toHaveBeenCalled();
      expect(transitionHook).not.toHaveBeenCalled();
    } finally {
      delete objectPrototype.setup;
      delete objectPrototype.waiting;
      delete objectPrototype.transition;
    }
  });

  it("passes the raw machine in hook context before scope binding", () => {
    let hookMachine: ng.Machine | undefined;

    const machine = $machine({
      initial: "setup",
      data: {},
      transitions: {
        setup: {
          join() {
            return "waiting";
          },
        },
      },
      hooks: {
        transition(context) {
          hookMachine = context.machine;
        },
      },
    });

    expect(machine.send("join")).toBe(true);
    expect(hookMachine).toBe(machine);
  });

  it("passes the scoped machine proxy in hook context after scope binding", () => {
    let hookMachine: ng.Machine | undefined;
    const rawMachine = $machine({
      initial: "setup",
      data: {},
      transitions: {
        setup: {
          join() {
            return "waiting";
          },
        },
      },
      hooks: {
        transition(context) {
          hookMachine = context.machine;
        },
      },
    });

    $rootScope.session = rawMachine;

    const scopedMachine = $rootScope.session as ng.Machine;

    expect(scopedMachine.send("join")).toBe(true);
    expect(hookMachine).toBe(scopedMachine);
    expect(hookMachine).not.toBe(rawMachine);
  });

  it("passes the scoped machine proxy to transitions after scope binding", () => {
    let transitionMachine: ng.Machine | undefined;
    const rawMachine = $machine({
      initial: "setup",
      data: {},
      transitions: {
        setup: {
          join(_data, _payload, activeMachine) {
            transitionMachine = activeMachine;

            return "waiting";
          },
        },
      },
    });

    $rootScope.session = rawMachine;

    const scopedMachine = $rootScope.session as ng.Machine;

    expect(scopedMachine.send("join")).toBe(true);
    expect(transitionMachine).toBe(scopedMachine);
    expect(transitionMachine).not.toBe(rawMachine);
  });

  it("runs transition hooks for same-mode transitions without enter or exit", () => {
    const calls: string[] = [];

    const machine = $machine({
      initial: "playing",
      data: {
        count: 0,
      },
      transitions: {
        playing: {
          tick(data) {
            data.count += 1;
            return "playing";
          },
        },
      },
      hooks: {
        exit: {
          playing() {
            calls.push("exit");
          },
        },
        enter: {
          playing() {
            calls.push("enter");
          },
        },
        transition(context) {
          calls.push(
            `transition:${context.from}->${context.to}:${context.data.count}`,
          );
        },
      },
    });

    expect(machine.send("tick")).toBe(true);

    expect(calls).toEqual(["transition:playing->playing:1"]);
  });

  it("runs transition hooks for false and undefined transition results without enter or exit", () => {
    const calls: string[] = [];

    const machine = $machine({
      initial: "setup",
      data: {
        count: 0,
      },
      transitions: {
        setup: {
          stayFalse(data) {
            data.count += 1;
            return false;
          },
          stayUndefined(data) {
            data.count += 1;
          },
        },
      },
      hooks: {
        exit: {
          setup() {
            calls.push("exit");
          },
        },
        enter: {
          setup() {
            calls.push("enter");
          },
        },
        transition(context) {
          calls.push(
            `${context.type}:${context.from}->${context.to}:${context.data.count}`,
          );
        },
      },
    });

    expect(machine.send("stayFalse")).toBe(true);
    expect(machine.send("stayUndefined")).toBe(true);

    expect(calls).toEqual([
      "stayFalse:setup->setup:1",
      "stayUndefined:setup->setup:2",
    ]);
  });

  it("allows configs with only one hook kind or no hooks", () => {
    const createConfig = (hooks?: ng.MachineHooks<{ count: number }>) => ({
      initial: "setup",
      data: {
        count: 0,
      },
      transitions: {
        setup: {
          join(data: { count: number }) {
            data.count += 1;
            return "waiting";
          },
        },
      },
      hooks,
    });

    expect(() => $machine(createConfig()).send("join")).not.toThrow();
    expect(() =>
      $machine(
        createConfig({
          enter: {
            waiting(context) {
              context.data.count += 1;
            },
          },
        }),
      ).send("join"),
    ).not.toThrow();
    expect(() =>
      $machine(
        createConfig({
          exit: {
            setup(context) {
              context.data.count += 1;
            },
          },
        }),
      ).send("join"),
    ).not.toThrow();
    expect(() =>
      $machine(
        createConfig({
          transition(context) {
            context.data.count += 1;
          },
        }),
      ).send("join"),
    ).not.toThrow();
  });

  it("updates templates from hook mutations", async () => {
    const element = $compile(
      '<section><span class="mode">{{ session.current }}</span>' +
        '<span class="status">{{ session.data.status }}</span></section>',
    )($rootScope);

    $rootScope.session = $machine({
      initial: "setup",
      data: {
        status: "idle",
      },
      transitions: {
        setup: {
          join() {
            return "waiting";
          },
        },
      },
      hooks: {
        enter: {
          waiting(context) {
            context.data.status = "entered";
          },
        },
      },
    });

    expect($rootScope.session.send("join")).toBe(true);

    await wait();

    expect(element.querySelector(".mode")?.textContent).toBe("waiting");
    expect(element.querySelector(".status")?.textContent).toBe("entered");
  });

  it("updates templates from nested hook data mutations", async () => {
    const element = $compile(
      '<section><span class="status">{{ session.data.room.status }}</span></section>',
    )($rootScope);

    $rootScope.session = $machine({
      initial: "setup",
      data: {
        room: {
          status: "idle",
        },
      },
      transitions: {
        setup: {
          join() {
            return "waiting";
          },
        },
      },
      hooks: {
        enter: {
          waiting(context) {
            context.data.room.status = "waiting";
          },
        },
      },
    });

    expect($rootScope.session.send("join")).toBe(true);

    await wait();

    expect(element.querySelector(".status")?.textContent).toBe("waiting");
  });

  it("runs hook mutations inside the owning scope batch", async () => {
    const batchSpy = spyOn($rootScope.$handler, "$batch").and.callThrough();
    const element = $compile(
      '<section><span class="one">{{ session.data.one }}</span>' +
        '<span class="two">{{ session.data.two }}</span></section>',
    )($rootScope);

    $rootScope.session = $machine({
      initial: "setup",
      data: {
        one: "idle",
        two: "idle",
      },
      transitions: {
        setup: {
          join() {
            return "waiting";
          },
        },
      },
      hooks: {
        enter: {
          waiting(context) {
            context.data.one = "ready";
            context.data.two = "ready";
          },
        },
      },
    });

    expect($rootScope.session.send("join")).toBe(true);
    expect(batchSpy).toHaveBeenCalledTimes(1);

    await wait();

    expect(element.querySelector(".one")?.textContent).toBe("ready");
    expect(element.querySelector(".two")?.textContent).toBe("ready");
  });

  it("allows hooks to send nested transitions inside the same batch", async () => {
    const batchSpy = spyOn($rootScope.$handler, "$batch").and.callThrough();
    const calls: string[] = [];
    const element = $compile(
      '<section><span class="mode">{{ session.current }}</span>' +
        '<span class="status">{{ session.data.status }}</span></section>',
    )($rootScope);

    $rootScope.session = $machine({
      initial: "setup",
      data: {
        status: "idle",
      },
      transitions: {
        setup: {
          join() {
            return "waiting";
          },
        },
        waiting: {
          ready(data) {
            data.status = "ready";
            return "ready";
          },
        },
      },
      hooks: {
        enter: {
          waiting(context) {
            calls.push("enter:waiting");
            expect(context.machine.send("ready")).toBe(true);
          },
          ready() {
            calls.push("enter:ready");
          },
        },
      },
    });

    expect($rootScope.session.send("join")).toBe(true);
    expect($rootScope.session.current).toBe("ready");
    expect(batchSpy).toHaveBeenCalledTimes(2);

    await wait();

    expect(calls).toEqual(["enter:waiting", "enter:ready"]);
    expect(element.querySelector(".mode")?.textContent).toBe("ready");
    expect(element.querySelector(".status")?.textContent).toBe("ready");
  });

  it("rethrows hook errors, keeps prior mutations, and restores batching", () => {
    const phases = ["exit", "enter", "transition"];

    for (let i = 0, l = phases.length; i < l; i++) {
      const phase = phases[i];
      const error = new Error(`${phase} failed`);
      let shouldThrow = true;
      const scope = $rootScope.$new();
      const machine = $machine({
        initial: "setup",
        data: {
          attempts: 0,
          status: "idle",
        },
        transitions: {
          setup: {
            join(data) {
              data.attempts += 1;
              data.status = "joining";
              return "waiting";
            },
          },
          waiting: {
            reset(data) {
              data.status = "idle";
              return "setup";
            },
          },
        },
        hooks: {
          exit: {
            setup() {
              if (phase === "exit" && shouldThrow) {
                throw error;
              }
            },
          },
          enter: {
            waiting(context) {
              context.data.status = "entered";

              if (phase === "enter" && shouldThrow) {
                throw error;
              }
            },
          },
          transition(context) {
            context.data.status = "transitioned";

            if (phase === "transition" && shouldThrow) {
              throw error;
            }
          },
        },
      });

      scope.session = machine;
      expect(scope.session.matches("setup")).toBe(true);

      expect(() => scope.session.send("join")).toThrow(error);
      expect(scope.session.data.attempts).toBe(1);

      shouldThrow = false;

      if (scope.session.matches("waiting")) {
        expect(scope.session.send("reset")).toBe(true);
      }

      expect(scope.session.send("join")).toBe(true);
      expect(scope.session.matches("waiting")).toBe(true);
      expect(scope.session.data.attempts).toBe(2);
    }
  });

  it("validates hook config shapes", () => {
    const createConfig = (hooks: unknown) => ({
      initial: "setup",
      data: {},
      transitions: {},
      hooks,
    });

    expect(() => $machine(createConfig("bad"))).toThrowError(
      "$machine hooks must be an object.",
    );
    expect(() => $machine(createConfig({ enter: "bad" }))).toThrowError(
      "$machine hooks.enter must be an object.",
    );
    expect(() => $machine(createConfig({ exit: "bad" }))).toThrowError(
      "$machine hooks.exit must be an object.",
    );
    expect(() =>
      $machine(createConfig({ enter: { setup: "bad" } })),
    ).toThrowError("$machine hooks.enter entries must be functions.");
    expect(() =>
      $machine(createConfig({ exit: { setup: "bad" } })),
    ).toThrowError("$machine hooks.exit entries must be functions.");
    expect(() =>
      $machine(createConfig({ transition: "bad" })),
    ).toThrowError("$machine hooks.transition must be a function.");
  });

  it("binds lazily when a scope proxy reads the machine", () => {
    const batchSpy = spyOn($rootScope.$handler, "$batch").and.callThrough();
    const machine = $machine({
      initial: "setup",
      data: {},
      transitions: {
        setup: {
          join() {
            return "waiting";
          },
        },
      },
    });

    $rootScope.session = machine;

    expect(batchSpy).not.toHaveBeenCalled();
    expect($rootScope.session.matches("setup")).toBe(true);
    expect(machine.send("join")).toBe(true);
    expect(batchSpy).toHaveBeenCalled();
  });

  it("runs transitions inside the owning scope batch", () => {
    const batchSpy = spyOn($rootScope.$handler, "$batch").and.callThrough();

    $rootScope.session = $machine({
      initial: "setup",
      data: {},
      transitions: {
        setup: {
          join() {
            return "waiting";
          },
        },
      },
    });

    const machine = $rootScope.session as ng.Machine;

    expect(machine.send("join")).toBe(true);
    expect(batchSpy).toHaveBeenCalled();
  });

  it("persists after one owning scope is destroyed and can bind to another scope", async () => {
    const machine = $machine({
      initial: "setup",
      data: {
        roomId: "",
      },
      transitions: {
        setup: {
          join(data, payload: { roomId: string }) {
            data.roomId = payload.roomId;
            return "waiting";
          },
        },
      },
    });

    const firstScope = $rootScope.$new();

    firstScope.session = machine;
    expect(firstScope.session.matches("setup")).toBe(true);

    firstScope.$destroy();

    expect(machine.send("join", { roomId: "abc" })).toBe(true);
    expect(machine.current).toBe("waiting");
    expect(machine.data.roomId).toBe("abc");

    const secondScope = $rootScope.$new();
    const element = $compile(
      '<section><span class="mode">{{ session.current }}</span>' +
        '<span class="room">{{ session.data.roomId }}</span></section>',
    )(secondScope);

    secondScope.session = machine;

    await wait();

    expect(element.querySelector(".mode")?.textContent).toBe("waiting");
    expect(element.querySelector(".room")?.textContent).toBe("abc");
  });

  it("restores through one scoped proxy and updates another scoped proxy", async () => {
    const machine = $machine({
      initial: "setup",
      data: {
        status: "idle",
      },
      transitions: {},
    });
    const firstScope = $rootScope.$new();
    const secondScope = $rootScope.$new();
    const firstElement = $compile(
      '<section><span class="mode">{{ session.current }}</span>' +
        '<span class="status">{{ session.data.status }}</span></section>',
    )(firstScope);
    const secondElement = $compile(
      '<section><span class="mode">{{ session.current }}</span>' +
        '<span class="status">{{ session.data.status }}</span></section>',
    )(secondScope);

    firstScope.session = machine;
    secondScope.session = machine;

    await wait();

    expect(firstElement.querySelector(".status")?.textContent).toBe("idle");
    expect(secondElement.querySelector(".status")?.textContent).toBe("idle");

    firstScope.session.restore({
      current: "ready",
      data: {
        status: "restored",
      },
    });

    await wait();

    expect(machine.current).toBe("ready");
    expect(machine.data.status).toBe("restored");
    expect(firstElement.querySelector(".mode")?.textContent).toBe("ready");
    expect(firstElement.querySelector(".status")?.textContent).toBe(
      "restored",
    );
    expect(secondElement.querySelector(".mode")?.textContent).toBe("ready");
    expect(secondElement.querySelector(".status")?.textContent).toBe(
      "restored",
    );
  });

  it("updates multiple machines observed by the same scope independently", async () => {
    const first = $machine({
      initial: "idle",
      data: {
        count: 0,
      },
      transitions: {
        idle: {
          start(data) {
            data.count += 1;

            return "running";
          },
        },
      },
    });
    const second = $machine({
      initial: "closed",
      data: {
        count: 0,
      },
      transitions: {
        closed: {
          open(data) {
            data.count += 1;

            return "open";
          },
        },
      },
    });

    const scope = $rootScope.$new();
    const element = $compile(
      '<section><span class="first-mode">{{ first.current }}</span>' +
        '<span class="first-count">{{ first.data.count }}</span>' +
        '<span class="second-mode">{{ second.current }}</span>' +
        '<span class="second-count">{{ second.data.count }}</span></section>',
    )(scope);

    scope.first = first;
    scope.second = second;

    await wait();

    expect(element.querySelector(".first-mode")?.textContent).toBe("idle");
    expect(element.querySelector(".first-count")?.textContent).toBe("0");
    expect(element.querySelector(".second-mode")?.textContent).toBe("closed");
    expect(element.querySelector(".second-count")?.textContent).toBe("0");

    expect(scope.first.send("start")).toBe(true);

    await wait();

    expect(element.querySelector(".first-mode")?.textContent).toBe("running");
    expect(element.querySelector(".first-count")?.textContent).toBe("1");
    expect(element.querySelector(".second-mode")?.textContent).toBe("closed");
    expect(element.querySelector(".second-count")?.textContent).toBe("0");

    expect(scope.second.send("open")).toBe(true);

    await wait();

    expect(element.querySelector(".first-mode")?.textContent).toBe("running");
    expect(element.querySelector(".first-count")?.textContent).toBe("1");
    expect(element.querySelector(".second-mode")?.textContent).toBe("open");
    expect(element.querySelector(".second-count")?.textContent).toBe("1");
  });

  it("updates sibling scoped templates when a transition removes a data key", async () => {
    const machine = $machine({
      initial: "failed",
      data: {
        status: "failed",
        error: "room_unavailable",
      },
      transitions: {
        failed: {
          recover(data) {
            data.status = "ready";
            delete data.error;

            return "ready";
          },
        },
      },
    });
    const firstScope = $rootScope.$new();
    const secondScope = $rootScope.$new();
    const firstElement = $compile(
      '<section><span class="status">{{ session.data.status }}</span>' +
        '<span class="error">{{ session.data.error }}</span></section>',
    )(firstScope);
    const secondElement = $compile(
      '<section><span class="status">{{ session.data.status }}</span>' +
        '<span class="error">{{ session.data.error }}</span></section>',
    )(secondScope);

    firstScope.session = machine;
    secondScope.session = machine;

    await wait();

    expect(firstElement.querySelector(".error")?.textContent).toBe(
      "room_unavailable",
    );
    expect(secondElement.querySelector(".error")?.textContent).toBe(
      "room_unavailable",
    );

    expect(firstScope.session.send("recover")).toBe(true);

    await wait();

    expect(machine.current).toBe("ready");
    expect(machine.data.status).toBe("ready");
    expect("error" in machine.data).toBe(false);
    expect(firstElement.querySelector(".status")?.textContent).toBe("ready");
    expect(firstElement.querySelector(".error")?.textContent).toBe("");
    expect(secondElement.querySelector(".status")?.textContent).toBe("ready");
    expect(secondElement.querySelector(".error")?.textContent).toBe("");
  });

  it("updates sibling scoped templates when a transition removes a nested data key", async () => {
    const machine = $machine({
      initial: "failed",
      data: {
        room: {
          status: "failed",
          error: "room_unavailable",
        },
      },
      transitions: {
        failed: {
          recover(data) {
            data.room.status = "ready";
            delete data.room.error;

            return "ready";
          },
        },
      },
    });
    const firstScope = $rootScope.$new();
    const secondScope = $rootScope.$new();
    const firstElement = $compile(
      '<section><span class="status">{{ session.data.room.status }}</span>' +
        '<span class="error">{{ session.data.room.error }}</span></section>',
    )(firstScope);
    const secondElement = $compile(
      '<section><span class="status">{{ session.data.room.status }}</span>' +
        '<span class="error">{{ session.data.room.error }}</span></section>',
    )(secondScope);

    firstScope.session = machine;
    secondScope.session = machine;

    await wait();

    expect(firstElement.querySelector(".error")?.textContent).toBe(
      "room_unavailable",
    );
    expect(secondElement.querySelector(".error")?.textContent).toBe(
      "room_unavailable",
    );

    expect(firstScope.session.send("recover")).toBe(true);

    await wait();

    expect(machine.current).toBe("ready");
    expect(machine.data.room.status).toBe("ready");
    expect("error" in machine.data.room).toBe(false);
    expect(firstElement.querySelector(".status")?.textContent).toBe("ready");
    expect(firstElement.querySelector(".error")?.textContent).toBe("");
    expect(secondElement.querySelector(".status")?.textContent).toBe("ready");
    expect(secondElement.querySelector(".error")?.textContent).toBe("");
  });

  it("updates templates when hooks add new data keys", async () => {
    const element = $compile(
      '<section><span class="ready">{{ session.data.ready }}</span>' +
        '<span class="message">{{ session.data.message }}</span></section>',
    )($rootScope);

    $rootScope.session = $machine({
      initial: "setup",
      data: {},
      transitions: {
        setup: {
          ready() {
            return "ready";
          },
        },
      },
      hooks: {
        enter: {
          ready(context) {
            context.data.ready = true;
            context.data.message = "joined";
          },
        },
      },
    });

    await wait();

    expect(element.querySelector(".ready")?.textContent).toBe("");
    expect(element.querySelector(".message")?.textContent).toBe("");

    expect($rootScope.session.send("ready")).toBe(true);

    await wait();

    expect(element.querySelector(".ready")?.textContent).toBe("true");
    expect(element.querySelector(".message")?.textContent).toBe("joined");
  });

  it("updates templates when transitions mutate Map and Set data", async () => {
    const element = $compile(
      '<section><span class="phase">{{ session.data.metadata.get("phase") }}</span>' +
        '<span class="selected">{{ session.data.selected.has("a1") }}</span>' +
        '<span class="size">{{ session.data.selected.size }}</span></section>',
    )($rootScope);

    $rootScope.session = $machine({
      initial: "idle",
      data: {
        metadata: new Map([["phase", "idle"]]),
        selected: new Set<string>(),
      },
      transitions: {
        idle: {
          select(data) {
            data.metadata.set("phase", "selected");
            data.selected.add("a1");

            return "idle";
          },
        },
      },
    });

    await wait();

    expect(element.querySelector(".phase")?.textContent).toBe("idle");
    expect(element.querySelector(".selected")?.textContent).toBe("false");
    expect(element.querySelector(".size")?.textContent).toBe("0");

    expect($rootScope.session.send("select")).toBe(true);

    await wait();

    expect(element.querySelector(".phase")?.textContent).toBe("selected");
    expect(element.querySelector(".selected")?.textContent).toBe("true");
    expect(element.querySelector(".size")?.textContent).toBe("1");
  });

  it("keeps an explicitly scoped machine usable after that scope is destroyed", () => {
    const firstScope = $rootScope.$new();
    const machine = $machine(firstScope, {
      initial: "setup",
      data: {
        status: "idle",
      },
      transitions: {
        setup: {
          join(data) {
            data.status = "waiting";
            return "waiting";
          },
        },
      },
    });

    firstScope.session = machine;
    expect(firstScope.session.matches("setup")).toBe(true);

    firstScope.$destroy();

    expect(machine.send("join")).toBe(true);
    expect(machine.current).toBe("waiting");
    expect(machine.data.status).toBe("waiting");
  });

  it("keeps an explicitly scoped machine restorable after that scope is destroyed", () => {
    const firstScope = $rootScope.$new();
    const machine = $machine(firstScope, {
      initial: "setup",
      data: {
        status: "idle",
      },
      transitions: {},
    });

    firstScope.session = machine;
    expect(firstScope.session.matches("setup")).toBe(true);

    firstScope.$destroy();

    machine.restore({
      current: "waiting",
      data: {
        status: "restored",
      },
    });

    expect(machine.current).toBe("waiting");
    expect(machine.data.status).toBe("restored");
  });

  it("keeps updating a surviving directive when another directive scope is destroyed", async () => {
    const directiveScopes: ng.Scope[] = [];

    window.angular = new Angular();
    window.angular.module("machineDirectiveApp", ["ng"]).directive(
      "machinePanel",
      () => ({
        scope: true,
        template:
          '<span class="mode">{{ session.current }}</span>' +
          '<span class="count">{{ session.data.count }}</span>',
        link(scope: ng.Scope) {
          directiveScopes.push(scope);
          scope.session.matches("idle");
        },
      }),
    );

    const injector = createInjector(["machineDirectiveApp"]);
    const compile = injector.get("$compile") as ng.CompileService;
    const machine = (injector.get("$machine") as MachineService)({
      initial: "idle",
      data: {
        count: 0,
      },
      transitions: {
        idle: {
          tick(data) {
            data.count += 1;
            return "idle";
          },
        },
      },
    });
    const rootScope = injector.get("$rootScope") as ng.RootScopeService;

    rootScope.session = machine;

    const element = compile(
      '<section><machine-panel class="first" session="session"></machine-panel>' +
        '<machine-panel class="second" session="session"></machine-panel></section>',
    )(rootScope);

    await wait();

    expect(directiveScopes.length).toBe(2);
    expect(element.querySelector(".first .count")?.textContent).toBe("0");
    expect(element.querySelector(".second .count")?.textContent).toBe("0");

    directiveScopes[1].$destroy();

    expect(machine.send("tick")).toBe(true);
    expect(machine.data.count).toBe(1);

    await wait();

    expect(element.querySelector(".first .mode")?.textContent).toBe("idle");
    expect(element.querySelector(".first .count")?.textContent).toBe("1");
  });

  it("restores a shared machine after the active directive scope is destroyed", async () => {
    const directiveScopes: ng.Scope[] = [];

    window.angular = new Angular();
    window.angular.module("machineDirectiveRestoreApp", ["ng"]).directive(
      "machinePanel",
      () => ({
        scope: true,
        template:
          '<span class="mode">{{ session.current }}</span>' +
          '<span class="status">{{ session.data.status }}</span>',
        link(scope: ng.Scope) {
          directiveScopes.push(scope);
          scope.session.matches("idle");
        },
      }),
    );

    const injector = createInjector(["machineDirectiveRestoreApp"]);
    const compile = injector.get("$compile") as ng.CompileService;
    const machine = (injector.get("$machine") as MachineService)({
      initial: "idle",
      data: {
        status: "idle",
      },
      transitions: {},
    });
    const rootScope = injector.get("$rootScope") as ng.RootScopeService;

    rootScope.session = machine;

    const element = compile(
      '<section><machine-panel class="first" session="session"></machine-panel>' +
        '<machine-panel class="second" session="session"></machine-panel></section>',
    )(rootScope);

    await wait();

    expect(directiveScopes.length).toBe(2);
    expect(element.querySelector(".first .status")?.textContent).toBe("idle");
    expect(element.querySelector(".second .status")?.textContent).toBe("idle");

    directiveScopes[1].$destroy();

    machine.restore({
      current: "ready",
      data: {
        status: "restored",
      },
    });

    await wait();

    expect(element.querySelector(".first .mode")?.textContent).toBe("ready");
    expect(element.querySelector(".first .status")?.textContent).toBe(
      "restored",
    );
  });

  it("keeps updating a later directive when an older directive scope is destroyed", async () => {
    const directiveScopes: ng.Scope[] = [];

    window.angular = new Angular();
    window.angular.module("machineDirectiveOlderApp", ["ng"]).directive(
      "machinePanel",
      () => ({
        scope: true,
        template:
          '<span class="mode">{{ session.current }}</span>' +
          '<span class="count">{{ session.data.count }}</span>',
        link(scope: ng.Scope) {
          directiveScopes.push(scope);
          scope.session.matches("idle");
        },
      }),
    );

    const injector = createInjector(["machineDirectiveOlderApp"]);
    const compile = injector.get("$compile") as ng.CompileService;
    const machine = (injector.get("$machine") as MachineService)({
      initial: "idle",
      data: {
        count: 0,
      },
      transitions: {
        idle: {
          tick(data) {
            data.count += 1;
            return "idle";
          },
        },
      },
    });
    const rootScope = injector.get("$rootScope") as ng.RootScopeService;

    rootScope.session = machine;

    const element = compile(
      '<section><machine-panel class="first" session="session"></machine-panel>' +
        '<machine-panel class="second" session="session"></machine-panel></section>',
    )(rootScope);

    await wait();

    expect(directiveScopes.length).toBe(2);

    directiveScopes[0].$destroy();

    expect(machine.send("tick")).toBe(true);

    await wait();

    expect(element.querySelector(".second .mode")?.textContent).toBe("idle");
    expect(element.querySelector(".second .count")?.textContent).toBe("1");
  });

  it("keeps updating isolate directive bindings after a sibling directive scope is destroyed", async () => {
    const directiveScopes: ng.Scope[] = [];
    const directiveScopesByClass: Record<string, ng.Scope> = {};

    window.angular = new Angular();
    window.angular.module("machineDirectiveIsolateApp", ["ng"]).directive(
      "machinePanel",
      () => ({
        scope: {
          session: "=",
        },
        template:
          '<span class="mode">{{ session.current }}</span>' +
          '<span class="count">{{ session.data.count }}</span>',
        link(scope: ng.Scope, element: Element) {
          directiveScopes.push(scope);
          directiveScopesByClass[element.className] = scope;
          scope.session.matches("idle");
        },
      }),
    );

    const injector = createInjector(["machineDirectiveIsolateApp"]);
    const compile = injector.get("$compile") as ng.CompileService;
    const machine = (injector.get("$machine") as MachineService)({
      initial: "idle",
      data: {
        count: 0,
      },
      transitions: {
        idle: {
          tick(data) {
            data.count += 1;
            return "idle";
          },
        },
      },
    });
    const rootScope = injector.get("$rootScope") as ng.RootScopeService;

    rootScope.session = machine;

    const element = compile(
      '<section><machine-panel class="first" session="session"></machine-panel>' +
        '<machine-panel class="second" session="session"></machine-panel></section>',
    )(rootScope);

    await wait();

    expect(directiveScopes.length).toBe(2);
    expect(element.querySelector(".first .count")?.textContent).toBe("0");
    expect(element.querySelector(".second .count")?.textContent).toBe("0");

    directiveScopesByClass.second.$destroy();

    expect(machine.send("tick")).toBe(true);

    await wait();

    expect(element.querySelector(".first .mode")?.textContent).toBe("idle");
    expect(element.querySelector(".first .count")?.textContent).toBe("1");
  });

  it("runs hooks on named machines registered through module.machine", () => {
    const calls: string[] = [];

    window.angular = new Angular();
    window.angular.module("namedMachineHookApp", ["ng"]).machine(
      "sessionMachine",
      {
        initial: "setup",
        data: {
          status: "idle",
        },
        transitions: {
          setup: {
            join() {
              return "waiting";
            },
          },
        },
        hooks: {
          enter: {
            waiting(context) {
              context.data.status = "waiting";
              calls.push(`${context.from}->${context.to}`);
            },
          },
        },
      },
    );

    const injector = createInjector(["namedMachineHookApp"]);
    const machine = injector.get("sessionMachine") as ng.Machine<{
      status: string;
    }>;

    expect(machine.send("join")).toBe(true);

    expect(machine.current).toBe("waiting");
    expect(machine.data.status).toBe("waiting");
    expect(calls).toEqual(["setup->waiting"]);
  });
});
