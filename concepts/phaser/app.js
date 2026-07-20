window.angular
  .module('phaserConcept', [])
  .model('playerModel', () => ({
    x: 210,
    y: 130,
    color: 0x2f80ed,
  }))
  .controller(
    'DemoCtrl',
    class {
      static $inject = ['playerModel', '$scope'];

      constructor(playerModel, $scope) {
        this.player = playerModel;
        $scope.player = playerModel;
        $scope.move = (dx, dy) => this.move(dx, dy);
        $scope.toggleColor = () => this.toggleColor();
        requestAnimationFrame(() => this.mount());
      }

      move(dx, dy) {
        this.player.x = Math.max(24, Math.min(396, Number(this.player.x) + dx));
        this.player.y = Math.max(24, Math.min(236, Number(this.player.y) + dy));
      }

      toggleColor() {
        this.player.color =
          Number(this.player.color) === 0x2f80ed ? 0xf97316 : 0x2f80ed;
      }

      mount() {
        const player = this.player;
        const controller = this;

        new Phaser.Game({
          type: Phaser.AUTO,
          parent: 'phaser-view',
          width: 420,
          height: 260,
          backgroundColor: '#111827',
          scene: {
            create() {
              this.avatar = this.add.circle(player.x, player.y, 22, player.color);
              controller.avatar = this.avatar;
            },
            update() {
              this.avatar.setPosition(Number(player.x), Number(player.y));
              this.avatar.setFillStyle(Number(player.color));
            },
          },
        });
      }
    },
  );
