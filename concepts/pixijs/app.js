window.angular
  .module('pixiConcept', [])
  .model('spriteModel', () => ({
    x: 210,
    y: 130,
    color: '#2f80ed',
    pulsing: true,
  }))
  .controller(
    'DemoCtrl',
    class {
      static $inject = ['spriteModel', '$scope'];

      constructor(spriteModel, $scope) {
        this.sprite = spriteModel;
        this.destroyRuntime = () => {};
        $scope.$on('$destroy', () => this.destroyRuntime());
        requestAnimationFrame(() => this.mount());
      }

      move(dx, dy) {
        this.sprite.x = Math.max(24, Math.min(396, Number(this.sprite.x) + dx));
        this.sprite.y = Math.max(24, Math.min(236, Number(this.sprite.y) + dy));
      }

      togglePulse() {
        this.sprite.pulsing = !this.sprite.pulsing;
      }

      async mount() {
        const host = document.getElementById('pixi-view');
        const app = new PIXI.Application();

        await app.init({
          width: 420,
          height: 260,
          antialias: true,
          background: '#111827',
        });

        host.appendChild(app.canvas);

        const avatar = new PIXI.Graphics();
        let elapsed = 0;

        app.stage.addChild(avatar);
        app.ticker.add((ticker) => {
          elapsed += ticker.deltaTime;
          const radius = this.sprite.pulsing
            ? 22 + Math.sin(elapsed * 0.12) * 5
            : 24;

          avatar.clear();
          avatar.circle(0, 0, radius);
          avatar.fill(this.sprite.color);
          avatar.x = Number(this.sprite.x);
          avatar.y = Number(this.sprite.y);
        });

        this.destroyRuntime = () => {
          app.destroy(true, { children: true, texture: true });
        };
      }
    },
  );
