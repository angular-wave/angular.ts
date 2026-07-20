window.angular
  .module('excaliburConcept', [])
  .model('playerModel', () => ({
    x: 80,
    y: 130,
    speed: 48,
    color: '#2f80ed',
    running: true,
  }))
  .controller(
    'DemoCtrl',
    class {
      static $inject = ['playerModel', '$scope'];

      constructor(playerModel, $scope) {
        this.player = playerModel;
        this.destroyRuntime = () => {};
        $scope.$on('$destroy', () => this.destroyRuntime());
        requestAnimationFrame(() => this.mount());
      }

      boost() {
        this.player.running = true;
        this.player.speed = Math.min(180, Number(this.player.speed) + 24);
      }

      stop() {
        this.player.running = false;
        this.player.speed = 0;
      }

      async mount() {
        const ex = await import('https://esm.sh/excalibur@0.30.3');
        const game = new ex.Engine({
          width: 420,
          height: 260,
          displayMode: ex.DisplayMode.Fixed,
          backgroundColor: ex.Color.fromHex('#111827'),
          canvasElementId: 'excalibur-canvas',
        });
        const actor = new ex.Actor({
          x: this.player.x,
          y: this.player.y,
          width: 44,
          height: 44,
        });
        let currentColor = this.player.color;

        actor.graphics.use(createPlayerGraphic(ex, currentColor));

        game.add(actor);
        game.currentScene.on('postupdate', (event) => {
          const elapsedMs = Number(event.elapsedMs ?? event.elapsed ?? 16.67);

          if (this.player.running) {
            this.player.x += (Number(this.player.speed) * elapsedMs) / 1000;

            if (this.player.x > 396) {
              this.player.x = 24;
            }
          }

          actor.pos.x = Number(this.player.x);
          actor.pos.y = Number(this.player.y);

          if (this.player.color !== currentColor) {
            currentColor = this.player.color;
            actor.graphics.use(createPlayerGraphic(ex, currentColor));
          }
        });

        await game.start();

        this.destroyRuntime = () => {
          game.stop();
          game.dispose();
        };
      }
    },
  );

function createPlayerGraphic(ex, color) {
  return new ex.Rectangle({
    width: 44,
    height: 44,
    color: ex.Color.fromHex(color),
  });
}
