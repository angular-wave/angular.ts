self.onmessage = (event) => {
  const { input, iterations, runId } = event.data;
  const steps = Math.max(1, Number(iterations) || 1);
  let value = Number(input) || 0;

  for (let index = 0; index < steps; index += 1) {
    value = (value * 1664525 + 1013904223) % 4294967296;

    if (index === Math.floor(steps / 2)) {
      self.postMessage({
        type: "progress",
        progress: 50,
        runId,
      });
    }
  }

  self.postMessage({
    type: "complete",
    progress: 100,
    result: Math.round(value),
    runId,
  });
};
