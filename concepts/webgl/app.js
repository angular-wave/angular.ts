window.angular
  .module('webglConcept', [])
  .model('clearModel', () => ({
    red: 0.1,
    green: 0.3,
    blue: 0.7,
  }))
  .controller(
    'DemoCtrl',
    class {
      static $inject = ['clearModel'];

      constructor(clearModel) {
        this.clear = clearModel;
        requestAnimationFrame(() => this.mount());
      }

      mount() {
        const canvas = document.getElementById('webgl-view');
        const gl = canvas.getContext('webgl');

        if (!gl) return;

        const render = () => {
          gl.clearColor(
            Number(this.clear.red),
            Number(this.clear.green),
            Number(this.clear.blue),
            1,
          );
          gl.clear(gl.COLOR_BUFFER_BIT);
          requestAnimationFrame(render);
        };

        render();
      }
    },
  );
