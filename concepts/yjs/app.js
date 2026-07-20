window.angular
  .module("yjsConcept", [])
  .model("documentModel", () => ({
    status: "loading",
    localText: "AngularTS owns app state. Yjs owns CRDT updates.",
    remoteText: "",
    updateCount: 0,
  }))
  .controller(
    "DemoCtrl",
    class {
      static $inject = ["documentModel", "$scope"];

      constructor(documentModel, $scope) {
        this.document = documentModel;
        this.destroyRuntime = () => {};
        this.stopModelSync = () => {};
        $scope.$on("$destroy", () => this.destroyRuntime());
        requestAnimationFrame(() => this.mount());
      }

      remoteAppend() {
        if (!this.remoteText) return;

        this.remoteText.insert(this.remoteText.length, "\nRemote edit");
      }

      reset() {
        const initialText = "AngularTS owns app state. Yjs owns CRDT updates.";

        this.document.$restore(
          {
            localText: initialText,
            remoteText: initialText,
            updateCount: 0,
          },
          { mode: "merge" },
        );
      }

      async mount() {
        const Y = await import("https://esm.sh/yjs@13.6.27");
        const localDoc = new Y.Doc();
        const remoteDoc = new Y.Doc();
        const localText = localDoc.getText("content");
        const remoteText = remoteDoc.getText("content");
        const syncLocalToRemote = (update, origin) => {
          if (origin === "remote-sync") return;
          Y.applyUpdate(remoteDoc, update, "local-sync");
        };
        const syncRemoteToLocal = (update, origin) => {
          if (origin === "local-sync") return;
          Y.applyUpdate(localDoc, update, "remote-sync");
        };

        this.Y = Y;
        this.localDoc = localDoc;
        this.remoteDoc = remoteDoc;
        this.localText = localText;
        this.remoteText = remoteText;

        localDoc.on("update", syncLocalToRemote);
        remoteDoc.on("update", syncRemoteToLocal);
        this.writeYText(localText, this.document.localText);
        this.stopModelSync = this.document.$sync(
          this.createYjsSyncTarget(localText, remoteText),
        );
        this.document.status = "synced";

        this.destroyRuntime = () => {
          this.stopModelSync();
          localDoc.off("update", syncLocalToRemote);
          remoteDoc.off("update", syncRemoteToLocal);
          localDoc.destroy();
          remoteDoc.destroy();
        };
      }

      writeYText(yText, value) {
        const next = String(value ?? "");

        if (yText.toString() === next) return;

        yText.delete(0, yText.length);
        yText.insert(0, next);
      }

      createYjsSyncTarget(localText, remoteText) {
        return {
          write: (snapshot, change) => {
            if (!change.keys.includes("localText")) return;

            this.writeYText(localText, snapshot.localText);
          },
          receive: (apply) => {
            const project = () => {
              apply(
                {
                  localText: localText.toString(),
                  remoteText: remoteText.toString(),
                  updateCount: this.document.updateCount + 1,
                },
                { mode: "merge" },
              );
            };

            localText.observe(project);
            remoteText.observe(project);
            project();

            return () => {
              localText.unobserve(project);
              remoteText.unobserve(project);
            };
          },
        };
      }
    },
  );
