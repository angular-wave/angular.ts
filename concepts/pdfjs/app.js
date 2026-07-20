const pdfRuntimes = new WeakMap();

window.angular
  .module("pdfjsConcept", [])
  .model("documentViewerModel", () => ({
    status: "loading",
    currentPage: 1,
    pageCount: 0,
    scale: 0.9,
    renderCount: 0,
  }))
  .controller(
    "DemoCtrl",
    class {
      static $inject = ["documentViewerModel", "$scope"];

      constructor(documentViewerModel, $scope) {
        this.viewer = documentViewerModel;
        this.destroyRuntime = () => {};
        $scope.$on("$destroy", () => this.destroyRuntime());
        requestAnimationFrame(() => this.mount());
      }

      nextPage() {
        if (this.viewer.currentPage >= this.viewer.pageCount) return;

        this.viewer.currentPage += 1;
        this.render();
      }

      previousPage() {
        if (this.viewer.currentPage <= 1) return;

        this.viewer.currentPage -= 1;
        this.render();
      }

      zoomIn() {
        this.viewer.scale = Math.min(1.8, Number(this.viewer.scale) + 0.1);
        this.render();
      }

      zoomOut() {
        this.viewer.scale = Math.max(0.6, Number(this.viewer.scale) - 0.1);
        this.render();
      }

      async mount() {
        const pdfjsLib = await import(
          "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs"
        );

        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs";

        const task = pdfjsLib.getDocument({
          url: "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf",
        });
        const pdf = await task.promise;

        pdfRuntimes.set(this.viewer, {
          canvas: document.getElementById("pdf-canvas"),
          pdf,
          renderTask: null,
        });
        this.viewer.pageCount = pdf.numPages;
        this.viewer.status = "ready";
        await this.render();

        this.destroyRuntime = () => {
          const runtime = pdfRuntimes.get(this.viewer);

          runtime?.renderTask?.cancel();
          pdf.destroy();
          pdfRuntimes.delete(this.viewer);
        };
      }

      async render() {
        const runtime = pdfRuntimes.get(this.viewer);

        if (!runtime) return;

        runtime.renderTask?.cancel();
        this.viewer.status = "rendering";

        const page = await runtime.pdf.getPage(this.viewer.currentPage);
        const viewport = page.getViewport({ scale: this.viewer.scale });
        const context = runtime.canvas.getContext("2d");

        runtime.canvas.width = viewport.width;
        runtime.canvas.height = viewport.height;
        runtime.renderTask = page.render({
          canvasContext: context,
          viewport,
        });

        try {
          await runtime.renderTask.promise;
          this.viewer.renderCount += 1;
          this.viewer.status = "ready";
        } catch (error) {
          if (error?.name !== "RenderingCancelledException") {
            this.viewer.status = "error";
          }
        }
      }
    },
  );
