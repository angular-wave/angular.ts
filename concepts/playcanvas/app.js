window.angular
  .module('playCanvasConcept', [])
  .model('cubeModel', () => ({
    spinning: true,
    speed: 1.2,
    angle: 0,
    color: '#2f80ed',
  }))
  .controller(
    'DemoCtrl',
    class {
      static $inject = ['cubeModel', '$scope'];

      constructor(cubeModel, $scope) {
        this.cube = cubeModel;
        this.destroyRuntime = () => {};
        $scope.$on('$destroy', () => this.destroyRuntime());
        requestAnimationFrame(() => this.mount());
      }

      toggleSpin() {
        this.cube.spinning = !this.cube.spinning;
      }

      faster() {
        this.cube.speed = Math.min(4, Number(this.cube.speed) + 0.2);
      }

      slower() {
        this.cube.speed = Math.max(0, Number(this.cube.speed) - 0.2);
      }

      mount() {
        const canvas = document.getElementById('playcanvas-view');
        const app = new pc.Application(canvas, {
          graphicsDeviceOptions: {
            antialias: true,
          },
        });

        app.setCanvasFillMode(pc.FILLMODE_NONE);
        app.setCanvasResolution(pc.RESOLUTION_AUTO);
        app.start();

        const camera = new pc.Entity('camera');
        const light = new pc.Entity('light');
        const cube = new pc.Entity('cube');
        const material = new pc.StandardMaterial();

        camera.addComponent('camera', {
          clearColor: new pc.Color(0.07, 0.09, 0.13),
        });
        camera.setPosition(0, 0, 4);

        light.addComponent('light', {
          type: 'directional',
          intensity: 1.2,
        });
        light.setEulerAngles(45, 35, 0);

        material.diffuse = hexToColor(this.cube.color);
        material.update();
        cube.addComponent('render', {
          type: 'box',
          material,
        });

        app.root.addChild(camera);
        app.root.addChild(light);
        app.root.addChild(cube);

        app.on('update', (dt) => {
          if (this.cube.spinning) {
            this.cube.angle += Number(this.cube.speed) * dt * 60;
          }

          material.diffuse = hexToColor(this.cube.color);
          material.update();
          cube.setEulerAngles(18, Number(this.cube.angle), 0);
        });

        this.destroyRuntime = () => {
          app.destroy();
        };
      }
    },
  );

function hexToColor(value) {
  const normalized = String(value || '#2f80ed').replace('#', '');
  const red = parseInt(normalized.slice(0, 2), 16) / 255;
  const green = parseInt(normalized.slice(2, 4), 16) / 255;
  const blue = parseInt(normalized.slice(4, 6), 16) / 255;

  return new pc.Color(red, green, blue);
}
