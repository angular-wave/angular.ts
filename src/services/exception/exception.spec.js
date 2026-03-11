import { ExceptionHandlerProvider } from "./exception.ts";

describe("ExceptionHandlerProvider", () => {
  let provider;

  beforeEach(() => {
    provider = new ExceptionHandlerProvider();
  });

  it("rethrows Error instances by default", () => {
    const handler = provider.$get();
    const error = new Error("fail");

    expect(() => handler(error)).toThrowError("fail");
  });

  it("rethrows primitive values unchanged", () => {
    const handler = provider.$get();

    expect(() => handler("primitive")).toThrow("primitive");
    expect(() => handler(42)).toThrow(42);
  });

  it("rethrows the same object instance", () => {
    const value = { foo: "bar" };
    const handler = provider.$get();

    try {
      handler(value);
      fail("Expected an exception to be thrown");
    } catch (e) {
      expect(e).toBe(value);
    }
  });

  it("rethrows null and undefined unchanged", () => {
    const handler = provider.$get();

    try {
      handler(null);
      fail("Expected null to be thrown");
    } catch (e) {
      expect(e).toBe(null);
    }

    try {
      handler(undefined);
      fail("Expected undefined to be thrown");
    } catch (e) {
      expect(e).toBe(undefined);
    }
  });

  it("delegates to the configured handler with the same value", () => {
    const value = { id: 1 };
    let received;

    provider.handler = (exception) => {
      received = exception;
      throw exception;
    };

    const handler = provider.$get();

    try {
      handler(value);
      fail("Expected an exception to be thrown");
    } catch (e) {
      expect(e).toBe(value);
    }

    expect(received).toBe(value);
  });

  it("uses the latest handler even if reconfigured after $get()", () => {
    provider.handler = () => {
      throw "first";
    };

    const handler = provider.$get();

    provider.handler = () => {
      throw "second";
    };

    expect(() => handler("ignored")).toThrow("second");
  });

  it("$get returns a function", () => {
    expect(typeof provider.$get()).toBe("function");
  });

  it("$get returns a new wrapper function each time", () => {
    const handler1 = provider.$get();
    const handler2 = provider.$get();

    expect(typeof handler1).toBe("function");
    expect(typeof handler2).toBe("function");
    expect(handler1).not.toBe(handler2);
  });
});
