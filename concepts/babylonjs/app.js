window.angular
  .module('babylonSharkConcept', [])
  .model('sharkModel', () => ({
    swimming: true,
    speed: 0.03,
    heading: 0,
    depth: 0,
  }))
  .controller(
    'DemoCtrl',
    class {
      static $inject = ['sharkModel'];

      constructor(sharkModel) {
        this.shark = sharkModel;
        requestAnimationFrame(() => this.mount());
      }

      toggleSwim() {
        this.shark.swimming = !this.shark.swimming;
      }

      turn(amount) {
        this.shark.heading += amount;
      }

      dive(amount) {
        this.shark.depth = Math.max(-1.4, Math.min(1.2, this.shark.depth + amount));
      }

      faster() {
        this.shark.speed = Math.min(0.12, this.shark.speed + 0.01);
      }

      slower() {
        this.shark.speed = Math.max(0.0, this.shark.speed - 0.01);
      }

      reset() {
        this.shark.heading = 0;
        this.shark.depth = 0;
      }

      async mount() {
        const canvas = document.getElementById('babylon-view');
        const engine = new BABYLON.Engine(canvas, true);

        engine.setHardwareScalingLevel(1.0 / window.devicePixelRatio);
        engine.displayLoadingUI();

        const scene = new BABYLON.Scene(engine);
        const camera = new BABYLON.ArcRotateCamera(
          'camera1',
          1.0,
          1.3,
          2.0,
          new BABYLON.Vector3(0, 0.5, 0),
          scene,
        );
        const light = new BABYLON.HemisphericLight(
          'light',
          new BABYLON.Vector3(0, 1, 0),
          scene,
        );

        camera.attachControl(canvas, true);
        camera.fov = (27 / 180) * Math.PI;
        camera.minZ = 1;
        camera.maxZ = 120;
        camera.lowerBetaLimit = 0.1;
        camera.upperBetaLimit = 1.5;
        light.intensity = 0.9;

        scene.clearColor.set(0.149, 0.149, 0.149, 1.0);
        scene.environmentTexture = new BABYLON.HDRCubeTexture(
          'https://assets.babylonjs.com/ibl/parking.hdr',
          scene,
          128,
        );

        const sky = createUnderwaterSky(scene);
        const shark = await loadShark(scene);

        frameCamera(camera, shark.meshes);
        sky.scaling.setAll(shark.sceneSize * 4);
        sky.position.y = shark.sceneSize * 2 - 1;
        engine.hideLoadingUI();

        engine.runRenderLoop(() => {
          if (this.shark.swimming) {
            shark.root.position.x += Math.sin(this.shark.heading) * this.shark.speed;
            shark.root.position.z += Math.cos(this.shark.heading) * this.shark.speed;
            shark.animationGroups.forEach((group) => {
              if (!group.isPlaying) group.play(true);
              group.speedRatio = Math.max(0.2, this.shark.speed * 30);
            });
          } else {
            shark.animationGroups.forEach((group) => group.pause());
          }

          shark.root.rotation.y = this.shark.heading;
          shark.root.position.y = this.shark.depth;
          scene.render();
        });

        window.addEventListener('resize', () => engine.resize());
      }
    },
  );

function createUnderwaterSky(scene) {
  const sky = BABYLON.MeshBuilder.CreateBox(
    'sky',
    { size: 1, sideOrientation: BABYLON.Mesh.BACKSIDE },
    scene,
  );
  const material = new BABYLON.BackgroundMaterial('skyMaterial', scene);
  const source = 'https://raw.githubusercontent.com/CedricGuillemet/dump/master/underwater_env3/';
  const files = ['px.png', 'py.png', 'pz.png', 'nx.png', 'ny.png', 'nz.png'].map(
    (file) => `${source}${file}`,
  );

  material.reflectionTexture = BABYLON.CubeTexture.CreateFromImages(files, scene);
  material.reflectionTexture.coordinatesMode = BABYLON.Constants.TEXTURE_SKYBOX_MODE;
  material.enableGroundProjection = true;
  sky.material = material;

  return sky;
}

async function loadShark(scene) {
  const root = new BABYLON.TransformNode('sharkRoot', scene);
  const result = await BABYLON.SceneLoader.ImportMeshAsync(
    '',
    'https://assets.babylonjs.com/meshes/',
    'shark.glb',
    scene,
  );
  const meshes = result.meshes.filter((mesh) => mesh instanceof BABYLON.Mesh);

  meshes.forEach((mesh) => {
    mesh.parent = root;
  });

  const bounds = calculateBounds(meshes);
  const sceneSize = bounds.max.subtract(bounds.min).length();
  const center = bounds.max.subtract(bounds.min).scale(0.5).add(bounds.min);

  root.position.subtractInPlace(center);

  return {
    animationGroups: result.animationGroups,
    meshes,
    root,
    sceneSize,
  };
}

function frameCamera(camera, meshes) {
  const bounds = calculateBounds(meshes);
  const sceneSize = bounds.max.subtract(bounds.min).length();
  const center = bounds.max.subtract(bounds.min).scale(0.5).add(bounds.min);

  if (!isFinite(center.x) || !isFinite(center.y) || !isFinite(center.z)) return;

  camera.minZ = 0.1 * sceneSize;
  camera.maxZ = 45 * sceneSize;
  camera.speed = sceneSize;
  camera.wheelPrecision = 100 / sceneSize;
  camera.panningSensibility = 5000 / sceneSize;
  camera.target = BABYLON.Vector3.Zero();
  camera.radius = 2.0 * sceneSize;
  camera.beta = Math.PI * 0.4;
  camera.upperRadiusLimit = sceneSize * 2;
  camera.lowerRadiusLimit = sceneSize;
}

function calculateBounds(meshes) {
  const bounds = {
    min: new BABYLON.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE),
    max: new BABYLON.Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE),
  };

  meshes.forEach((mesh) => {
    const localBounds = mesh.getHierarchyBoundingVectors(true);

    bounds.min = BABYLON.Vector3.Minimize(bounds.min, localBounds.min);
    bounds.max = BABYLON.Vector3.Maximize(bounds.max, localBounds.max);
  });

  return bounds;
}
