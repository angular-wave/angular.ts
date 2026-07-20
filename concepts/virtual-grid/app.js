const gridRuntimes = new WeakMap();

window.angular
  .module("virtualGridConcept", [])
  .model("gridModel", () => ({
    status: "loading",
    filter: "",
    selectedId: 1,
    selectedName: "Account 001",
    selectedRegion: "North",
    visibleStart: 0,
    visibleCount: 0,
    rows: Array.from({ length: 250 }, (_, index) => ({
      id: index + 1,
      name: `Account ${String(index + 1).padStart(3, "0")}`,
      region: ["North", "South", "East", "West"][index % 4],
      balance: 1200 + index * 37,
    })),
  }))
  .controller(
    "DemoCtrl",
    class {
      static $inject = ["gridModel", "$scope"];

      constructor(gridModel, $scope) {
        this.grid = gridModel;
        this.destroyRuntime = () => {};
        $scope.$on("$destroy", () => this.destroyRuntime());
        requestAnimationFrame(() => this.mount());
      }

      applyFilter() {
        const runtime = gridRuntimes.get(this.grid);

        if (!runtime) return;

        runtime.container.scrollTop = 0;
        this.selectFirstVisibleRow();
        this.renderGrid();
      }

      clearFilter() {
        this.grid.filter = "";
        this.applyFilter();
      }

      selectFirst() {
        this.selectFirstVisibleRow();
        this.renderGrid();
      }

      selectFirstVisibleRow() {
        const rows = this.filteredRows();

        if (!rows.length) {
          this.setSelectedRow(null);
          return;
        }

        this.setSelectedRow(rows[0]);
      }

      setSelectedRow(row) {
        this.grid.selectedId = row ? row.id : null;
        this.grid.selectedName = row ? row.name : "none";
        this.grid.selectedRegion = row ? row.region : "none";
      }

      mount() {
        const container = document.getElementById("grid-runtime");
        const viewport = document.createElement("div");
        const spacer = document.createElement("div");
        const rows = document.createElement("div");
        const rowHeight = 34;

        viewport.className = "grid-viewport";
        spacer.className = "grid-spacer";
        rows.className = "grid-rows";
        viewport.append(spacer, rows);
        container.append(viewport);

        gridRuntimes.set(this.grid, {
          container: viewport,
          rowHeight,
          rows,
          spacer,
        });
        viewport.addEventListener("scroll", () => this.renderGrid());
        this.grid.status = "ready";
        this.renderGrid();

        this.destroyRuntime = () => {
          gridRuntimes.delete(this.grid);
          container.replaceChildren();
        };
      }

      filteredRows() {
        const filter = String(this.grid.filter || "").toLowerCase();

        if (!filter) return this.grid.rows;

        return this.grid.rows.filter(
          (row) =>
            row.name.toLowerCase().includes(filter) ||
            row.region.toLowerCase().includes(filter),
        );
      }

      renderGrid() {
        const runtime = gridRuntimes.get(this.grid);

        if (!runtime) return;

        const filtered = this.filteredRows();
        const viewportHeight = runtime.container.clientHeight || 280;
        const start = Math.max(
          0,
          Math.floor(runtime.container.scrollTop / runtime.rowHeight),
        );
        const count = Math.min(
          filtered.length - start,
          Math.ceil(viewportHeight / runtime.rowHeight) + 2,
        );
        const visible = filtered.slice(start, start + count);

        runtime.spacer.style.height = `${filtered.length * runtime.rowHeight}px`;
        runtime.rows.style.transform = `translateY(${start * runtime.rowHeight}px)`;
        runtime.rows.replaceChildren(
          ...visible.map((row) => this.createRow(row)),
        );
        this.grid.visibleStart = start;
        this.grid.visibleCount = Math.max(0, count);
      }

      createRow(row) {
        const element = document.createElement("button");

        element.type = "button";
        element.className =
          row.id === this.grid.selectedId ? "grid-row selected" : "grid-row";
        element.dataset.rowId = String(row.id);
        element.innerHTML = `
          <span>${row.id}</span>
          <strong>${row.name}</strong>
          <span>${row.region}</span>
          <span>$${row.balance}</span>
        `;
        element.addEventListener("click", () => {
          this.setSelectedRow(row);
          this.renderGrid();
        });

        return element;
      }
    },
  );
