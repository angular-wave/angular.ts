// This worker receives messages via postMessage
// and sends back a response after a short delay

self.onmessage = async (event) => {
  const { data } = event;

  // simulate some async work
  await new Promise((resolve) => setTimeout(resolve, 1000));

  let result;

  if (data?.action === "fib") {
    const fib = /** @param {number} x */ (x) =>
      x <= 1 ? x : fib(x - 1) + fib(x - 2);

    result = fib(data.n);
  } else {
    result = { echo: data };
  }

  self.postMessage(result);
};
