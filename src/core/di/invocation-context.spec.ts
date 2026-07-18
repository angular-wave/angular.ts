import { createServiceDecorationInvocationLocals } from "./invocation-context.ts";

describe("service decoration invocation context", () => {
  it("exposes the original service as the public $delegate local", () => {
    const delegate = { value: 42 };

    expect(createServiceDecorationInvocationLocals(delegate)).toEqual({
      $delegate: delegate,
    });
  });
});
