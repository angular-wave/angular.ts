import { createAngular } from "/src/runtime/index.ts";
import {
  ngAttributeAliasDirectives,
  ngBindingDirectives,
  ngElementDirectives,
  ngEventDirectives,
  ngFormDirectives,
  ngTemplateDirectives,
} from "/src/ng.ts";
import { htmlCanvasModule } from "/src/runtime/html-canvas.ts";

const angular = createAngular({
  modules: [htmlCanvasModule],
  directives: [
    ngElementDirectives,
    ngBindingDirectives,
    ngTemplateDirectives,
    ngFormDirectives,
    ngEventDirectives,
    ngAttributeAliasDirectives,
  ],
});
const app = angular.module("cockpitBreachConcept", []);

const runtime = {
  frame: 0,
  THREE: null,
  renderer: null,
  scene: null,
  camera: null,
  shipGroup: null,
  shieldMesh: null,
  engineFlame: null,
  hazardMeshes: new Map(),
  effectSprites: new Map(),
};

app.model("shipModel", () => ({
  htmlCanvasSupported: false,
  running: false,
  gameOver: false,
  score: 0,
  wave: 1,
  time: 0,
  hull: 100,
  shield: 68,
  heat: 22,
  reactorLoad: 100,
  weaponCharge: 100,
  alert: "Stand by for breach simulation.",
  autoVent: true,
  power: {
    engines: 38,
    shields: 42,
    weapons: 48,
  },
  hazards: [],
  effects: [],
  nextHazardId: 1,
  spawnTimer: 0,
}));

app.controller(
  "CockpitBreachCtrl",
  class {
    static $inject = ["shipModel", "$htmlCanvas", "$scope"];

    constructor(shipModel, $htmlCanvas, $scope) {
      this.ship = shipModel;
      this.ship.htmlCanvasSupported = $htmlCanvas.supported;
      this.lastTime = 0;
      this.shipX = 480;
      this.shipY = 258;

      $scope.$on("$destroy", () => {
        cancelAnimationFrame(runtime.frame);
        this.disposeThree();
      });

      requestAnimationFrame(() => this.mount());
    }

    round(value) {
      return Math.round(Number(value));
    }

    async mount() {
      runtime.THREE =
        await import("https://unpkg.com/three@0.164.1/build/three.module.js");

      const THREE = runtime.THREE;
      const canvas = document.getElementById("breach-world");

      runtime.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        preserveDrawingBuffer: true,
      });
      runtime.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      runtime.renderer.setSize(960, 620, false);

      runtime.scene = new THREE.Scene();
      runtime.scene.background = new THREE.Color(0x020617);
      runtime.camera = new THREE.PerspectiveCamera(52, 960 / 620, 0.1, 100);
      runtime.camera.position.set(0, 3.6, 7.4);
      runtime.camera.lookAt(0, 0, 0);

      const ambient = new THREE.AmbientLight(0x8fb8ff, 0.7);
      const key = new THREE.DirectionalLight(0xffffff, 2.4);
      const rim = new THREE.PointLight(0x22d3ee, 3.2, 12);

      key.position.set(3, 5, 4);
      rim.position.set(-2.4, 1.2, 1.8);
      runtime.scene.add(ambient, key, rim);
      this.createStarfield();
      this.createShip();
      this.renderThree();
    }

    start() {
      cancelAnimationFrame(runtime.frame);
      this.ship.running = true;
      this.ship.gameOver = false;
      this.ship.score = 0;
      this.ship.wave = 1;
      this.ship.time = 0;
      this.ship.hull = 100;
      this.ship.shield = 68;
      this.ship.heat = 22;
      this.ship.weaponCharge = 100;
      this.ship.alert = "Breach wave inbound. Keep the cockpit alive.";
      this.ship.hazards = [];
      this.ship.effects = [];
      this.ship.nextHazardId = 1;
      this.ship.spawnTimer = 0.35;
      this.lastTime = performance.now();
      runtime.frame = requestAnimationFrame((time) => this.tick(time));
    }

    fire() {
      if (!this.ship.running || this.ship.gameOver) return;

      if (this.ship.weaponCharge < 35) {
        this.ship.alert = "Weapon capacitor is still charging.";

        return;
      }

      const target = this.nearestHazard();

      this.ship.weaponCharge = Math.max(0, this.ship.weaponCharge - 35);
      this.ship.heat = Math.min(100, this.ship.heat + 9);

      if (!target) {
        this.ship.alert = "Weapons fired. No target lock.";
        this.addEffect(this.shipX, this.shipY - 80, "#fbbf24", "MISS");

        return;
      }

      this.ship.score += 40 + this.ship.wave * 5;
      this.ship.alert = `Target ${target.label} vaporized.`;
      this.addEffect(target.x, target.y, "#fde68a", "+40");
      this.ship.hazards = this.ship.hazards.filter(
        (hazard) => hazard.id !== target.id,
      );
    }

    vent() {
      if (!this.ship.running || this.ship.gameOver) return;

      this.ship.heat = Math.max(0, this.ship.heat - 26);
      this.ship.shield = Math.max(0, this.ship.shield - 6);
      this.ship.alert = "Heat vented through shield grid.";
    }

    emergencySeal() {
      if (!this.ship.running || this.ship.gameOver) return;

      if (this.ship.heat > 70) {
        this.ship.alert = "Repair drones blocked by thermal load.";

        return;
      }

      this.ship.hull = Math.min(100, this.ship.hull + 12);
      this.ship.heat = Math.min(100, this.ship.heat + 8);
      this.ship.score = Math.max(0, this.ship.score - 15);
      this.ship.alert = "Hull breach sealed. Score diverted to repair drones.";
    }

    tick(time) {
      if (!this.ship.running || this.ship.gameOver) {
        this.renderThree();

        return;
      }

      const delta = Math.min(0.05, (time - this.lastTime) / 1000 || 0);

      this.lastTime = time;
      this.ship.time += delta;
      this.ship.wave = 1 + Math.floor(this.ship.time / 22);
      this.applySystems(delta);
      this.spawnHazards(delta);
      this.advanceHazards(delta);
      this.advanceEffects(delta);
      this.renderThree();

      if (this.ship.hull <= 0 || this.ship.heat >= 100) {
        this.ship.gameOver = true;
        this.ship.running = false;
        this.ship.alert =
          this.ship.hull <= 0
            ? "Hull integrity failed."
            : "Reactor heat exceeded safe limits.";
        this.addEffect(this.shipX, this.shipY, "#ef4444", "BREACH");
        this.renderThree();

        return;
      }

      runtime.frame = requestAnimationFrame((nextTime) => this.tick(nextTime));
    }

    applySystems(delta) {
      const power = this.ship.power;
      const load =
        Number(power.engines) + Number(power.shields) + Number(power.weapons);
      const overdraw = Math.max(0, load - 160);

      this.ship.reactorLoad = load;
      this.ship.heat = Math.max(
        0,
        Math.min(
          100,
          this.ship.heat +
            (overdraw * 0.08 + Number(power.weapons) * 0.015 - 1.4) * delta,
        ),
      );
      this.ship.shield = Math.min(
        100,
        this.ship.shield + (Number(power.shields) * 0.09 - 1.7) * delta,
      );
      this.ship.weaponCharge = Math.min(
        100,
        this.ship.weaponCharge + (18 + Number(power.weapons) * 0.42) * delta,
      );

      if (this.ship.autoVent && this.ship.heat > 78) {
        this.ship.heat = Math.max(0, this.ship.heat - 18 * delta);
        this.ship.shield = Math.max(0, this.ship.shield - 8 * delta);
        this.ship.alert = "Auto-vent policy active.";
      }

      if (overdraw > 0 && Math.floor(this.ship.time * 2) % 4 === 0) {
        this.ship.alert = "Reactor overdraw. Lower total power or vent heat.";
      }
    }

    spawnHazards(delta) {
      this.ship.spawnTimer -= delta;

      if (this.ship.spawnTimer > 0) return;

      const lane = Math.floor(Math.random() * 5);
      const x = 160 + lane * 160 + (Math.random() * 50 - 25);
      const size = 14 + Math.random() * 20 + this.ship.wave * 1.8;

      this.ship.hazards.push({
        id: this.ship.nextHazardId,
        label: `A-${this.ship.nextHazardId}`,
        x,
        y: -30,
        vx: (this.shipX - x) * 0.035,
        vy: 42 + this.ship.wave * 8 + Math.random() * 18,
        size,
        spin: Math.random() * Math.PI,
      });
      this.ship.nextHazardId += 1;
      this.ship.spawnTimer = Math.max(0.42, 1.45 - this.ship.wave * 0.09);
    }

    advanceHazards(delta) {
      const engineDampening = Number(this.ship.power.engines) * 0.012;

      for (const hazard of this.ship.hazards) {
        hazard.x += hazard.vx * delta;
        hazard.y += hazard.vy * (1 - Math.min(0.35, engineDampening)) * delta;
        hazard.spin += delta * 3;
      }

      for (const hazard of this.ship.hazards) {
        const distance = Math.hypot(
          hazard.x - this.shipX,
          hazard.y - this.shipY,
        );

        if (distance > hazard.size + 38) continue;

        this.impact(hazard);
        hazard.destroyed = true;
      }

      this.ship.hazards = this.ship.hazards.filter(
        (hazard) => !hazard.destroyed && hazard.y < 660,
      );
    }

    impact(hazard) {
      const shieldDamage = hazard.size * 0.9;
      const hullDamage = hazard.size * 0.42;

      if (this.ship.shield > 0) {
        const absorbed = Math.min(this.ship.shield, shieldDamage);

        this.ship.shield -= absorbed;
        this.ship.hull = Math.max(
          0,
          this.ship.hull - Math.max(0, hullDamage - absorbed * 0.35),
        );
      } else {
        this.ship.hull = Math.max(0, this.ship.hull - hullDamage);
      }

      this.ship.heat = Math.min(100, this.ship.heat + hazard.size * 0.16);
      this.ship.alert = `${hazard.label} impacted the forward grid.`;
      this.addEffect(hazard.x, hazard.y, "#ef4444", "HIT");
    }

    nearestHazard() {
      let best = null;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (const hazard of this.ship.hazards) {
        const distance = Math.hypot(
          hazard.x - this.shipX,
          hazard.y - this.shipY,
        );

        if (distance < bestDistance) {
          best = hazard;
          bestDistance = distance;
        }
      }

      return bestDistance < 430 ? best : null;
    }

    addEffect(x, y, color, text) {
      this.ship.effects.push({
        id: `${text}-${performance.now()}-${Math.random()}`,
        x,
        y,
        color,
        text,
        ttl: 0.72,
      });
    }

    advanceEffects(delta) {
      for (const effect of this.ship.effects) {
        effect.y -= 26 * delta;
        effect.ttl -= delta;
      }

      this.ship.effects = this.ship.effects.filter((effect) => effect.ttl > 0);
    }

    createStarfield() {
      const THREE = runtime.THREE;
      const positions = [];

      for (let i = 0; i < 900; i += 1) {
        positions.push(
          (Math.random() - 0.5) * 24,
          (Math.random() - 0.5) * 9,
          -Math.random() * 42,
        );
      }

      const geometry = new THREE.BufferGeometry();
      const material = new THREE.PointsMaterial({
        color: 0xcbd5e1,
        size: 0.035,
        transparent: true,
        opacity: 0.88,
      });

      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      runtime.scene.add(new THREE.Points(geometry, material));
    }

    createShip() {
      const THREE = runtime.THREE;

      runtime.shipGroup = new THREE.Group();

      const body = new THREE.Mesh(
        new THREE.ConeGeometry(0.42, 1.25, 4),
        new THREE.MeshStandardMaterial({
          color: 0xdbeafe,
          metalness: 0.55,
          roughness: 0.3,
        }),
      );
      const cockpit = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.55, 4),
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0ea5e9,
          emissiveIntensity: 0.55,
        }),
      );
      const leftWing = new THREE.Mesh(
        new THREE.BoxGeometry(0.78, 0.08, 0.28),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8 }),
      );
      const rightWing = leftWing.clone();

      body.rotation.x = Math.PI / 2;
      cockpit.rotation.x = Math.PI / 2;
      cockpit.position.z = -0.22;
      leftWing.position.set(-0.44, -0.04, 0.16);
      rightWing.position.set(0.44, -0.04, 0.16);
      runtime.shipGroup.add(body, cockpit, leftWing, rightWing);
      runtime.scene.add(runtime.shipGroup);

      runtime.shieldMesh = new THREE.Mesh(
        new THREE.TorusGeometry(1.15, 0.018, 8, 96),
        new THREE.MeshBasicMaterial({
          color: 0x22d3ee,
          transparent: true,
          opacity: 0.42,
        }),
      );
      runtime.shieldMesh.rotation.x = Math.PI / 2;
      runtime.scene.add(runtime.shieldMesh);

      runtime.engineFlame = new THREE.Mesh(
        new THREE.ConeGeometry(0.14, 0.58, 18),
        new THREE.MeshBasicMaterial({
          color: 0xf59e0b,
          transparent: true,
          opacity: 0.78,
        }),
      );
      runtime.engineFlame.rotation.x = -Math.PI / 2;
      runtime.engineFlame.position.z = 0.78;
      runtime.shipGroup.add(runtime.engineFlame);
    }

    renderThree() {
      if (!runtime.renderer || !runtime.scene || !runtime.camera) return;

      this.syncShipMesh();
      this.syncHazardMeshes();
      this.syncEffectSprites();
      runtime.renderer.render(runtime.scene, runtime.camera);
    }

    syncShipMesh() {
      if (!runtime.shipGroup || !runtime.shieldMesh || !runtime.engineFlame) {
        return;
      }

      const heatTilt = (this.ship.heat - 50) / 700;
      const shieldScale = 0.82 + this.ship.shield / 120;

      runtime.shipGroup.rotation.z = Math.sin(this.ship.time * 1.7) * 0.05;
      runtime.shipGroup.rotation.x = heatTilt;
      runtime.shieldMesh.scale.set(shieldScale, shieldScale, shieldScale);
      runtime.shieldMesh.material.opacity = Math.max(
        0.05,
        this.ship.shield / 180,
      );
      runtime.engineFlame.scale.y = 0.65 + Number(this.ship.power.engines) / 95;
      runtime.engineFlame.material.color.set(
        this.ship.heat > 70 ? 0xef4444 : 0xf59e0b,
      );
    }

    syncHazardMeshes() {
      const THREE = runtime.THREE;
      const active = new Set();

      for (const hazard of this.ship.hazards) {
        active.add(hazard.id);

        if (!runtime.hazardMeshes.has(hazard.id)) {
          const mesh = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1, 1),
            new THREE.MeshStandardMaterial({
              color: 0xa16207,
              emissive: 0x451a03,
              metalness: 0.08,
              roughness: 0.82,
            }),
          );

          runtime.scene.add(mesh);
          runtime.hazardMeshes.set(hazard.id, mesh);
        }

        const mesh = runtime.hazardMeshes.get(hazard.id);
        const radius = hazard.size / 34;

        mesh.position.set(this.mapX(hazard.x), 0.05, this.mapZ(hazard.y));
        mesh.rotation.set(hazard.spin * 0.4, hazard.spin, hazard.spin * 0.7);
        mesh.scale.set(radius, radius, radius);
      }

      for (const [id, mesh] of runtime.hazardMeshes) {
        if (active.has(id)) continue;

        runtime.scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
        runtime.hazardMeshes.delete(id);
      }
    }

    syncEffectSprites() {
      const THREE = runtime.THREE;
      const active = new Set();

      for (const effect of this.ship.effects) {
        active.add(effect.id);

        if (!runtime.effectSprites.has(effect.id)) {
          const texture = this.createTextTexture(effect.text, effect.color);
          const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
          });
          const sprite = new THREE.Sprite(material);

          sprite.scale.set(1.1, 0.38, 1);
          runtime.scene.add(sprite);
          runtime.effectSprites.set(effect.id, sprite);
        }

        const sprite = runtime.effectSprites.get(effect.id);

        sprite.position.set(this.mapX(effect.x), 0.82, this.mapZ(effect.y));
        sprite.material.opacity = Math.max(0, effect.ttl / 0.72);
      }

      for (const [id, sprite] of runtime.effectSprites) {
        if (active.has(id)) continue;

        runtime.scene.remove(sprite);
        sprite.material.map.dispose();
        sprite.material.dispose();
        runtime.effectSprites.delete(id);
      }
    }

    createTextTexture(text, color) {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = 256;
      canvas.height = 96;
      context.font = "700 42px system-ui, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = color;
      context.shadowColor = "rgba(0, 0, 0, 0.65)";
      context.shadowBlur = 10;
      context.fillText(text, 128, 48);

      return new runtime.THREE.CanvasTexture(canvas);
    }

    mapX(x) {
      return (x - this.shipX) / 82;
    }

    mapZ(y) {
      return (y - this.shipY) / 72;
    }

    disposeThree() {
      if (!runtime.scene) return;

      for (const mesh of runtime.hazardMeshes.values()) {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }

      for (const sprite of runtime.effectSprites.values()) {
        sprite.material.map.dispose();
        sprite.material.dispose();
      }

      runtime.renderer?.dispose();
      runtime.hazardMeshes.clear();
      runtime.effectSprites.clear();
    }
  },
);

app.config({
  $htmlCanvas: {
    enabled: "auto",
    throwOnUnsupported: false,
    defaultScheduler: "paint",
    defaultMode: "2d",
  },
});

document.addEventListener("DOMContentLoaded", () => angular.init(document), {
  once: true,
});
