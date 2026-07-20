window.angular
  .module('threeConcept', [])
  .model('sceneModel', () => ({
    speed: 0.02,
    color: '#2f80ed',
  }))
  .controller(
    'DemoCtrl',
    class {
      static $inject = ['sceneModel'];

      constructor(sceneModel) {
        this.scene = sceneModel;
        requestAnimationFrame(() => this.mount());
      }

      async mount() {
        const THREE = await import(
          'https://unpkg.com/three@0.164.1/build/three.module.js'
        );
        const canvas = document.getElementById('three-view');
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, canvas.width / canvas.height, 0.1, 100);
        const cube = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshBasicMaterial({ color: this.scene.color }),
        );

        camera.position.z = 3;
        scene.add(cube);

        const render = () => {
          cube.rotation.y += Number(this.scene.speed);
          cube.material.color.set(this.scene.color);
          renderer.render(scene, camera);
          requestAnimationFrame(render);
        };

        render();
      }
    },
  );
