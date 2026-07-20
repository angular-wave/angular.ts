window.angular
  .module("workerComputeConcept", [])
  .model("computeModel", () => ({
    status: "idle",
    input: 42,
    iterations: 10000,
    runId: 0,
    progress: 0,
    result: 0,
    lastSyncedRun: 0,
  }))
  .controller(
    "DemoCtrl",
    class {
      static $inject = ["computeModel", "$scope"];

      constructor(computeModel, $scope) {
        this.compute = computeModel;
        this.destroyRuntime = () => {};
        this.stopModelSync = () => {};
        $scope.$on("$destroy", () => {
          this.stopModelSync();
          this.destroyRuntime();
        });
        requestAnimationFrame(() => this.mount());
      }

      run() {
        this.compute.status = "queued";
        this.compute.progress = 0;
        this.compute.runId += 1;
      }

      reset() {
        this.compute.$restore(
          {
            status: "idle",
            input: 42,
            iterations: 10000,
            runId: 0,
            progress: 0,
            result: 0,
            lastSyncedRun: 0,
          },
          { mode: "replace" },
        );
      }

      mount() {
        const worker = new Worker("./worker.js");

        this.stopModelSync = this.compute.$sync(
          this.createWorkerSyncTarget(worker),
        );
        this.destroyRuntime = () => worker.terminate();
      }

      createWorkerSyncTarget(worker) {
        worker.onmessage = (event) => {
          const message = event.data;

          if (message.runId !== this.compute.runId) return;

          if (message.type === "progress") {
            this.compute.$restore(
              {
                status: "running",
                progress: message.progress,
              },
              { mode: "merge", origin: "worker-compute" },
            );

            return;
          }

          this.compute.$restore(
            {
              status: "complete",
              progress: message.progress,
              result: message.result,
            },
            { mode: "merge", origin: "worker-compute" },
          );
        };

        return {
          write: (snapshot, change) => {
            if (
              !change.keys.includes("runId") ||
              snapshot.runId === snapshot.lastSyncedRun
            ) {
              return;
            }

            this.compute.lastSyncedRun = snapshot.runId;
            this.compute.status = "running";
            worker.postMessage({
              input: snapshot.input,
              iterations: snapshot.iterations,
              runId: snapshot.runId,
            });
          },
          dispose() {
            worker.onmessage = null;
          },
        };
      }
    },
  );
