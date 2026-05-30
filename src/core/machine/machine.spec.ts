// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { createInjector } from "../di/injector.ts";
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
});
