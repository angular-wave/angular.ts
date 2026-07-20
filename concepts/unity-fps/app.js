window.angular
  .module("unityFpsConcept", [])
  .model("unitySessionModel", () => ({
    runtime: "mock",
    status: "loading",
    paused: false,
  }))
  .model("unityPlayerModel", () => ({
    health: 100,
    ammo: 30,
    reserve: 90,
    targetsDestroyed: 0,
  }))
  .model("unitySettingsModel", () => ({
    sensitivity: 1,
  }))
  .model("unityEventLogModel", () => ({
    items: [],
  }))
  .model("unityTelemetryModel", () => ({
    writes: 0,
    lastSnapshotVersion: 0,
    lastKeys: [],
    lastAmmo: 30,
    lastTargetsDestroyed: 0,
  }))
  .service(
    "unityTelemetrySyncTarget",
    class {
      static $inject = ["unityTelemetryModel"];

      constructor(telemetry) {
        this.telemetry = telemetry;
      }

      write(snapshot, change) {
        this.telemetry.writes += 1;
        this.telemetry.lastSnapshotVersion = change.snapshotVersion;
        this.telemetry.lastKeys = change.keys;
        this.telemetry.lastAmmo = snapshot.ammo;
        this.telemetry.lastTargetsDestroyed = snapshot.targetsDestroyed;
      }
    },
  )
  .controller(
    "DemoCtrl",
    class {
      static $inject = [
        "unitySessionModel",
        "unityPlayerModel",
        "unitySettingsModel",
        "unityEventLogModel",
        "unityTelemetryModel",
        "$scope",
      ];

      constructor(
        session,
        player,
        settings,
        eventLog,
        telemetry,
        $scope,
      ) {
        this.session = session;
        this.player = player;
        this.settings = settings;
        this.eventLog = eventLog;
        this.telemetry = telemetry;
        this.unity = null;
        this.destroyRuntime = () => {};
        this.stopPlayerSync = player.$sync([
          "unityTelemetrySyncTarget",
          (sync) => sync,
        ]);

        window.angularTsUnityFps = this.createBridge();
        $scope.$on("$destroy", () => {
          this.stopPlayerSync();
          this.destroyRuntime();
        });
        requestAnimationFrame(() => this.mount());
      }

      togglePaused() {
        this.session.paused = !this.session.paused;
        this.send("SetPaused", this.session.paused ? "true" : "false");
      }

      reload() {
        this.send("Reload");
      }

      shoot() {
        this.send("Shoot");
      }

      updateSensitivity() {
        this.send("SetSensitivity", this.settings.sensitivity);
      }

      heal() {
        this.player.health = 100;
        this.send("Heal");
      }

      fireMock() {
        if (this.session.runtime !== "mock" || this.session.paused) return;

        if (this.player.ammo <= 0) {
          this.log("mock: empty magazine");
          return;
        }

        this.player.ammo -= 1;
        this.player.targetsDestroyed += 1;
        this.log("mock: target destroyed");
      }

      async mount() {
        const loaderUrl = "./Build/unity-fps.loader.js";

        await loadScript(loaderUrl).catch(() => null);

        if (!window.createUnityInstance) {
          this.session.runtime = "mock";
          this.session.status =
            "Unity WebGL build not found; mock bridge active";
          this.log("mock runtime mounted");
          return;
        }

        this.session.runtime = "unity";
        this.session.status = "starting Unity";
        const canvas = document.getElementById("unity-canvas");

        this.unity = await window.createUnityInstance(canvas, {
          dataUrl: "./Build/unity-fps.data",
          frameworkUrl: "./Build/unity-fps.framework.js",
          codeUrl: "./Build/unity-fps.wasm",
          streamingAssetsUrl: "StreamingAssets",
          companyName: "AngularTS",
          productName: "AngularTS Unity FPS Concept",
          productVersion: "0.1.0",
        });
        this.session.status = "ready";
        this.send("SetSensitivity", this.settings.sensitivity);
        this.send("SetPaused", this.session.paused ? "true" : "false");

        this.destroyRuntime = () => {
          this.unity?.Quit?.();
          this.unity = null;
          delete window.angularTsUnityFps;
        };
      }

      send(method, value = "") {
        if (!this.unity) return;

        this.unity.SendMessage("AngularTsBridge", method, String(value));
      }

      createBridge() {
        return {
          ready: () => {
            this.session.status = "ready";
            this.log("unity: ready");
          },
          state: (payload) => {
            const state = parsePayload(payload);

            Object.assign(this.player, {
              health: state.health,
              ammo: state.ammo,
              reserve: state.reserve,
              targetsDestroyed: state.targetsDestroyed,
            });
          },
          event: (payload) => {
            const event = parsePayload(payload);

            this.log(`unity: ${event.type}`);
          },
        };
      }

      log(message) {
        this.eventLog.items = [message, ...this.eventLog.items].slice(0, 8);
      }
    },
  );

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");

    script.onload = resolve;
    script.onerror = reject;
    script.src = url;
    document.head.appendChild(script);
  });
}

function parsePayload(payload) {
  if (typeof payload === "object" && payload !== null) return payload;

  try {
    return JSON.parse(String(payload || "{}"));
  } catch {
    return {};
  }
}
