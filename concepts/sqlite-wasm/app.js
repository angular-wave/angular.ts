window.angular
  .module("sqliteConcept", [])
  .model("databaseModel", () => ({
    status: "loading",
    filter: "",
    rows: [],
    selected: null,
    nextTask: 4,
    lastSnapshotVersion: 0,
    lastSnapshotKeys: "",
    snapshotBytes: 0,
  }))
  .controller(
    "DemoCtrl",
    class {
      static $inject = ["databaseModel", "$scope"];

      constructor(databaseModel, $scope) {
        this.database = databaseModel;
        this.destroyRuntime = () => {};
        this.stopModelSync = () => {};
        $scope.$on("$destroy", () => {
          this.stopModelSync();
          this.destroyRuntime();
        });
        requestAnimationFrame(() => this.mount());
      }

      select(row) {
        this.database.selected = row;
      }

      applyFilter() {
        this.refresh();
      }

      addTask() {
        if (!this.db) return;

        const title = `Task ${this.database.nextTask++}`;

        this.db.run("INSERT INTO tasks (title, done) VALUES (?, ?)", [
          title,
          0,
        ]);
        this.refresh();
      }

      exportSnapshot() {
        if (!this.db) return;

        const modelSnapshot = this.database.$snapshot();

        this.db.run(
          "INSERT INTO model_snapshots (version, payload) VALUES (?, ?)",
          [modelSnapshot.lastSnapshotVersion, JSON.stringify(modelSnapshot)],
        );

        this.database.snapshotBytes = this.db.export().byteLength;
      }

      toggleDone() {
        if (!this.db || !this.database.selected) return;

        this.db.run(
          "UPDATE tasks SET done = CASE done WHEN 1 THEN 0 ELSE 1 END WHERE id = ?",
          [this.database.selected.id],
        );
        this.refresh(this.database.selected.id);
      }

      async mount() {
        const SQL = await initSqlJs({
          locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/${file}`,
        });

        this.db = new SQL.Database();
        this.db.run(`
          CREATE TABLE tasks (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            done INTEGER NOT NULL DEFAULT 0
          );
        `);
        this.db.run(`
          CREATE TABLE model_snapshots (
            version INTEGER NOT NULL,
            payload TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);
        this.db.run(
          "INSERT INTO tasks (title, done) VALUES (?, ?), (?, ?), (?, ?)",
          [
            "Wire model to DOM",
            1,
            "Run SQLite in WASM",
            0,
            "Project query results",
            0,
          ],
        );

        this.database.status = "ready";
        this.stopModelSync = this.database.$sync(this.createSqliteSyncTarget());
        this.refresh();

        this.destroyRuntime = () => {
          this.db.close();
          this.db = null;
        };
      }

      createSqliteSyncTarget() {
        return {
          write: (snapshot, change) => {
            if (!this.db || change.keys.includes("lastSnapshotVersion")) {
              return;
            }

            const payload = JSON.stringify(snapshot);

            this.db.run(
              "INSERT INTO model_snapshots (version, payload) VALUES (?, ?)",
              [change.snapshotVersion, payload],
            );

            this.database.$restore(
              {
                lastSnapshotVersion: change.snapshotVersion,
                lastSnapshotKeys: change.keys.join(", "),
                snapshotBytes: this.db.export().byteLength,
              },
              { mode: "merge", origin: "sqlite-sync" },
            );
          },
        };
      }

      refresh(selectedId = this.database.selected?.id) {
        if (!this.db) return;

        const filter = `%${String(this.database.filter || "").toLowerCase()}%`;
        const result = this.db.exec(
          "SELECT id, title, done FROM tasks WHERE lower(title) LIKE ? ORDER BY id",
          [filter],
        );
        const rows =
          result[0]?.values.map(([id, title, done]) => ({
            id,
            title,
            done: Boolean(done),
          })) ?? [];

        this.database.rows = rows;
        this.database.selected =
          rows.find((row) => row.id === selectedId) ?? rows[0] ?? null;
      }
    },
  );
