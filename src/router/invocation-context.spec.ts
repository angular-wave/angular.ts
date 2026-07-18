/// <reference types="jasmine" />
import {
  createRetentionEvictionPolicyInvocationLocals,
  createRetentionPolicyInvocationLocals,
  createTransitionErrorPolicyInvocationLocals,
  createTransitionPolicyInvocationLocals,
} from "./invocation-context.ts";
import type {
  StateDeclaration,
  StateRetentionEvictionContext,
  StateRetentionPolicyContext,
  StateTransitionErrorPolicyContext,
  StateTransitionRetryPolicyContext,
} from "./state/interface.ts";

describe("router invocation contexts", () => {
  const transition = {} as ng.Transition;
  const from = { name: "from" } as StateDeclaration;
  const to = { name: "to" } as StateDeclaration;
  const state = { name: "policy" } as StateDeclaration;

  it("creates transition and error policy locals", () => {
    const retryContext: StateTransitionRetryPolicyContext = {
      operation: "retry",
      transition,
      from,
      to,
      state,
      attempt: 2,
      error: "retry error",
    };
    const errorContext: StateTransitionErrorPolicyContext = {
      operation: "error",
      transition,
      from,
      to,
      state,
      error: "route error",
    };

    expect(createTransitionPolicyInvocationLocals(retryContext)).toEqual({
      context: retryContext,
      $transition$: transition,
      state,
      from,
      to,
    });
    expect(createTransitionErrorPolicyInvocationLocals(errorContext)).toEqual({
      context: errorContext,
      $transition$: transition,
      state,
      from,
      to,
      error: "route error",
    });
  });

  it("creates retention policy locals", () => {
    const retentionContext: StateRetentionPolicyContext = {
      transition,
      state,
      params: { id: 1 },
    };
    const evictionContext: StateRetentionEvictionContext = {
      state,
      key: "policy:1",
      size: 3,
      max: 2,
    };

    expect(createRetentionPolicyInvocationLocals(retentionContext)).toEqual({
      context: retentionContext,
      $transition$: transition,
    });
    expect(
      createRetentionEvictionPolicyInvocationLocals(evictionContext),
    ).toEqual({ context: evictionContext });
  });
});
