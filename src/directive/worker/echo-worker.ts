/**
 * Demo worker used by the worker directive examples/tests.
 *
 * It echoes arbitrary payloads and can also compute Fibonacci values.
 */

self.onmessage = async (event) => {
  const { data } = event;

  // simulate some async work
  await new Promise((resolve) => setTimeout(resolve, 1000));

  let result;

  if (data?.action === "fib") {
    /**
     * Computes a Fibonacci number recursively for demo purposes.
     */
    function fib(x: number): number {
      return x <= 1 ? x : fib(x - 1) + fib(x - 2);
    }

    result = fib(data.n);
  } else {
    result = { echo: data };
  }

  self.postMessage(result);
};
