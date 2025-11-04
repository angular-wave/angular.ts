// This worker receives messages via postMessage
// and sends back a response after a short delay

self.onmessage = async (event) => {
  const data = event.data;

  // simulate some async work
  await new Promise((resolve) => setTimeout(resolve, 1000));

  let result;

  if (data?.action === "fib") {
    const fib = (n) => (n <= 1 ? n : fib(n - 1) + fib(n - 2));
    result = fib(data.n);
  } else {
    result = { echo: data };
  }

  self.postMessage(result);
};
