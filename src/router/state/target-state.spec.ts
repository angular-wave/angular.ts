// @ts-nocheck
/// <reference types="jasmine" />
import { TargetState } from "./target-state.ts";

describe("TargetState", () => {
  const foundDefinition = {
    name: "found",
    self: {
      name: "found",
      url: "/found",
    },
  };

  function createRegistry() {
    return {
      _matcher: {
        find: jasmine.createSpy("find").and.callFake((identifier) => {
          if (identifier === "found") return foundDefinition;

          if (identifier && identifier.name === "fromObject") {
            return { name: "fromObject", self: { name: "fromObject" } };
          }

          return undefined;
        }),
      },
    };
  }

  it("clones params and options", () => {
    const params = { a: 1, b: 2 };
    const options = { location: true };
    const targetState = new TargetState(
      createRegistry(),
      "found",
      params,
      options,
    );

    expect(targetState.params()).toEqual({ a: 1, b: 2 });
    expect(targetState.options()).toEqual({ location: true });

    params.a = 42;
    options.location = false;

    expect(targetState.params()).toEqual({ a: 1, b: 2 });
    expect(targetState.options()).toEqual({ location: true });
  });

  it("returns matched definition metadata", () => {
    const targetState = new TargetState(createRegistry(), "found", {}, {});

    expect(targetState.name()).toBe("found");
    expect(targetState.identifier()).toBe("found");
    expect(targetState.$state()).toBe(foundDefinition);
    expect(targetState.state()).toBe(foundDefinition.self);
    expect(targetState.exists()).toBeTrue();
    expect(targetState.valid()).toBeTrue();
    expect(targetState.error()).toBeUndefined();
  });

  it("resolves object identifiers with name field", () => {
    const targetState = new TargetState(
      createRegistry(),
      { name: "fromObject" },
      {},
    );

    expect(targetState.name()).toBe("fromObject");
    expect(targetState.identifier()).toEqual({ name: "fromObject" });
    expect(targetState.exists()).toBeTrue();
  });

  it("reports invalid state errors", () => {
    const targetState = new TargetState(createRegistry(), "missing", {});

    expect(targetState.exists()).toBeFalse();
    expect(targetState.error()).toBe("No such state 'missing'");
    expect(targetState.valid()).toBeFalse();
  });

  it("reports relative resolution errors", () => {
    const targetState = new TargetState(
      createRegistry(),
      "missing",
      {},
      {
        relative: { name: "baseState" },
      },
    );

    expect(targetState.error()).toBe(
      "Could not resolve 'missing' from state 'baseState'",
    );
  });

  it("stringifies invalid identifiers in error messages", () => {
    const targetState = new TargetState(createRegistry(), 0 as never, {});

    expect(targetState.error()).toBe("No such state '0'");
  });

  it("formats target info", () => {
    const targetState = new TargetState(createRegistry(), "found", {
      a: "one",
    });

    expect(targetState.toString()).toBe('\'found\'{"a":"one"}');
  });

  it("returns copied variants with state/params/options helpers", () => {
    const targetState = new TargetState(
      createRegistry(),
      "found",
      { a: 1, b: 2 },
      {
        inherit: false,
      },
    );

    const changedState = targetState.withState("other");
    expect(changedState.name()).toBe("other");
    expect(changedState.params()).toEqual({ a: 1, b: 2 });
    expect(changedState.options()).toEqual({ inherit: false });
    expect(targetState.name()).toBe("found");

    const mergedParams = targetState.withParams({ b: 3 });
    expect(mergedParams.params()).toEqual({ a: 1, b: 3 });

    const replacedParams = targetState.withParams({ b: 3 }, true);
    expect(replacedParams.params()).toEqual({ b: 3 });

    const mergedOptions = targetState.withOptions({ notify: false });
    expect(mergedOptions.options()).toEqual({ inherit: false, notify: false });

    const replacedOptions = targetState.withOptions({ notify: false }, true);
    expect(replacedOptions.options()).toEqual({ notify: false });
  });

  it("retains definition when state does not exist", () => {
    const targetState = new TargetState(createRegistry(), "missing", {});

    expect(targetState.$state()).toBeUndefined();
    expect(targetState.state()).toBeUndefined();
  });
});
