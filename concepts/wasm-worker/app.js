import { angular } from "/dist/angular-ts.esm.js";
import { wasmModule } from "/dist/runtime/wasm.js";

const installedWasmModule = wasmModule(angular);

angular
  .module("wasmWorkerConcept", [installedWasmModule.name])
  .model("wasmWorkerModel", () => ({
    status: "loading",
    result: 0,
    mainResult: 0,
    runId: 0,
    moduleShared: false,
    sharedMemory: false,
    sharedValue: 0,
  }))
  .controller(
    "DemoCtrl",
    class {
      static $inject = ["wasmWorkerModel", "$wasm", "$worker", "$scope"];

      constructor(model, $wasm, $worker, $scope) {
        this.model = model;
        this.memory = new WebAssembly.Memory({
          initial: 1,
          maximum: 1,
          shared: true,
        });
        this.resource = $wasm.load({
          source: "./shared-memory.wasm",
          imports: { env: { memory: this.memory } },
        });
        this.worker = $worker("./worker.js");
        this.stopWorkerError = this.worker.onError(() => {
          this.model.status = "error";
        });
        this.stopWorkerMessages = this.worker.onMessage((message) =>
          this.receive(message),
        );
        this.stopSync = model.$sync({
          write: (snapshot, change) => {
            if (!change.keys.includes("runId") || snapshot.status !== "ready") {
              return;
            }

            this.model.status = "running";
            this.worker.post({
              type: "increment",
              runId: snapshot.runId,
            });
          },
        });

        void this.resource.ready.then(() => {
          this.model.mainResult = this.resource.exports.increment(0);
          this.worker.post({
            type: "init",
            module: this.resource.module,
            memory: this.memory,
          });
        });

        $scope.$on("$destroy", () => {
          this.stopSync();
          this.stopWorkerMessages();
          this.stopWorkerError();
          this.worker.terminate();
          this.resource.dispose();
        });
      }

      run() {
        this.model.runId += 1;
      }

      receive(message) {
        if (message.type === "ready") {
          this.model.$restore(
            {
              status: "ready",
              moduleShared: true,
              sharedMemory: message.sharedMemory,
              sharedValue: message.sharedValue,
            },
            { mode: "merge", origin: "wasm-worker" },
          );

          return;
        }

        if (message.type !== "result" || message.runId !== this.model.runId) {
          return;
        }

        this.model.$restore(
          {
            status: "ready",
            result: message.result,
            sharedValue: message.sharedValue,
          },
          { mode: "merge", origin: "wasm-worker" },
        );
      }
    },
  );

angular.init(document);
