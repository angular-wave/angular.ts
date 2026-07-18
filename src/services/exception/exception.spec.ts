/// <reference types="jasmine" />
import {
  applyExceptionHandlerConfiguration,
  createExceptionHandlerRuntimeState,
  createExceptionHandlerService,
  destroyExceptionHandlerRuntimeState,
} from "./exception.ts";

describe("$exceptionHandler runtime", () => {
  it("rethrows values unchanged by default", () => {
    const state = createExceptionHandlerRuntimeState();
    const handler = createExceptionHandlerService(state);
    const object = { id: 1 };

    expect(() => handler(new Error("fail"))).toThrowError("fail");
    expect(() => handler("primitive")).toThrow("primitive");
    expect(() => handler(42)).toThrow(42);

    try {
      handler(object);
      fail("Expected an exception to be thrown");
    } catch (error) {
      expect(error).toBe(object);
    }

    try {
      handler(null);
      fail("Expected null to be thrown");
    } catch (error) {
      expect(error).toBe(null);
    }

    try {
      handler(undefined);
      fail("Expected undefined to be thrown");
    } catch (error) {
      expect(error).toBe(undefined);
    }
  });

  it("uses the latest configured handler through one stable service", () => {
    const state = createExceptionHandlerRuntimeState();
    const service = createExceptionHandlerService(state);
    const first = new Error("first");
    const second = new Error("second");
    let received: unknown;

    applyExceptionHandlerConfiguration(state, {
      handler(exception): never {
        received = exception;
        throw first;
      },
    });

    expect(() => service("reported")).toThrow(first);
    expect(received).toBe("reported");

    applyExceptionHandlerConfiguration(state, {
      handler(): never {
        throw second;
      },
    });

    expect(createExceptionHandlerService(state)).toBe(service);
    expect(() => service("ignored")).toThrow(second);
  });

  it("keeps the current handler when configuration omits it", () => {
    const state = createExceptionHandlerRuntimeState();
    const configured = new Error("configured");

    applyExceptionHandlerConfiguration(state, {
      handler(): never {
        throw configured;
      },
    });
    applyExceptionHandlerConfiguration(state, {});

    expect(() => state.service("ignored")).toThrow(configured);
  });

  it("disposes idempotently and rejects later use", () => {
    const state = createExceptionHandlerRuntimeState();
    const service = createExceptionHandlerService(state);

    destroyExceptionHandlerRuntimeState(state);
    destroyExceptionHandlerRuntimeState(state);

    expect(() => service("late")).toThrowError(
      "Exception handler runtime has already been disposed.",
    );
    expect(() => createExceptionHandlerService(state)).toThrowError(
      "Exception handler runtime has already been disposed.",
    );
    expect(() => applyExceptionHandlerConfiguration(state, {})).toThrowError(
      "Exception handler runtime has already been disposed.",
    );
  });
});
