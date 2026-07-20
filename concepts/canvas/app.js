window.angular
  .module('canvasConcept', [])
  .model('spriteModel', () => ({
    x: 120,
    y: 100,
    color: '#2f80ed',
  }))
  .controller(
    'DemoCtrl',
    class {
      static $inject = ['spriteModel'];

      constructor(spriteModel) {
        this.sprite = spriteModel;
        requestAnimationFrame(() => this.mount());
      }

      mount() {
        const canvas = document.getElementById('canvas-view');
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        const render = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = this.sprite.color;
          ctx.beginPath();
          ctx.arc(Number(this.sprite.x), Number(this.sprite.y), 24, 0, Math.PI * 2);
          ctx.fill();
          requestAnimationFrame(render);
        };

        render();
      }
    },
  );
