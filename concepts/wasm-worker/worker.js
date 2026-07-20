let increment;
let read;

self.onmessage = async (event) => {
  const message = event.data;

  if (message.type === "init") {
    const instance = await WebAssembly.instantiate(message.module, {
      env: { memory: message.memory },
    });

    increment = instance.exports.increment;
    read = instance.exports.read;
    const sharedValue = increment(0);

    self.postMessage({
      type: "ready",
      sharedMemory: message.memory.buffer instanceof SharedArrayBuffer,
      sharedValue,
    });

    return;
  }

  if (message.type !== "increment" || typeof increment !== "function") return;

  self.postMessage({
    type: "result",
    result: increment(0),
    sharedValue: read(0),
    runId: message.runId,
  });
};
