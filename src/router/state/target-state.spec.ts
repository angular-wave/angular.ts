/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { StateObject } from "./state-object.ts";
import { StateRegistryRuntime } from "./state-registry.ts";
import { defined, instance } from "../../shared/test-fixtures.spec.ts";
import { TargetState } from "./target-state.ts";

describe("TargetState", () => {
  let foundDefinition: StateObject;
  let angular: Angular;
  afterEach(() => angular?._composition.destroy());
  function createRegistry() {
    angular = new Angular();
    const injector = angular.bootstrap(document.createElement("div"), []);
    const registry = instance(
      injector.get("$stateRegistry"),
      StateRegistryRuntime,
    );
    registry.register({ name: "found", url: "/found" });
    registry.register({ name: "fromObject" });
    const found = registry._matcher.find("found");
    if (!found) throw new Error("Missing registered fixture state");
    foundDefinition = found;
    return registry;
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
    expect(targetState._state()).toBe(foundDefinition);
    expect(targetState.state()).toBe(foundDefinition.self);
    expect(targetState.exists()).toBeTrue();
    expect(targetState.valid()).toBeTrue();
    expect(targetState.error()).toBeUndefined();
  });

  it("resolves registered state declaration identifiers", () => {
    const registry = createRegistry();
    const declaration = defined(registry.getState("fromObject"));
    const targetState = new TargetState(registry, declaration, {}, {});

    expect(targetState.name()).toBe("fromObject");
    expect(targetState.identifier()).toBe(declaration);
    expect(targetState.exists()).toBeTrue();
  });

  it("reports invalid state errors", () => {
    const targetState = new TargetState(createRegistry(), "missing", {}, {});

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
    // @ts-expect-error Deliberately invalid identifier exercises runtime error formatting.
    const targetState = new TargetState(createRegistry(), 0, {}, {});

    expect(targetState.error()).toBe("No such state '0'");
  });

  it("formats target info", () => {
    const targetState = new TargetState(
      createRegistry(),
      "found",
      {
        a: "one",
      },
      {},
    );

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

    const mergedOptions = targetState.withOptions({ reload: false });
    expect(mergedOptions.options()).toEqual({ inherit: false, reload: false });

    const replacedOptions = targetState.withOptions({ reload: false }, true);
    expect(replacedOptions.options()).toEqual({ reload: false });
  });

  it("retains definition when state does not exist", () => {
    const targetState = new TargetState(createRegistry(), "missing", {}, {});

    expect(targetState._state()).toBeUndefined();
    expect(targetState.state()).toBeUndefined();
  });
});
