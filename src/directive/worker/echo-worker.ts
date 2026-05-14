/**
 * Demo worker used by the worker directive examples/tests.
 *
 * It echoes arbitrary payloads and can also compute Fibonacci values.
 */

self.onmessage = async (event: MessageEvent<unknown>) => {
  const { data } = event;

  // simulate some async work
  await new Promise((resolve) => {
    setTimeout(resolve, 1000);
  });

  let result: unknown;

  /**
   * Computes a Fibonacci number recursively for demo purposes.
   */
  function fib(x: number): number {
    return x <= 1 ? x : fib(x - 1) + fib(x - 2);
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "action" in data &&
    data.action === "fib" &&
    "n" in data &&
    typeof data.n === "number"
  ) {
    result = fib(data.n);
  } else {
    result = { echo: data };
  }

  self.postMessage(result);
};
