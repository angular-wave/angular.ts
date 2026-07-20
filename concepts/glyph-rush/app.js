window.angular
  .module('glyphRushConcept', [])
  .model('rushModel', () => ({
    running: false,
    paused: false,
    gameOver: false,
    score: 0,
    combo: 0,
    clicks: 0,
    apm: 0,
    wave: 1,
    integrity: 100,
    elapsed: 0,
    startedAt: 0,
    nextEnemyId: 1,
    spawnTimer: 0,
    message: 'Press Start to defend the page.',
    cards: [
      {
        id: 1,
        title: 'AngularTS Runtime Concepts',
        url: 'angular.ts/concepts/runtime',
        text: 'App-owned models coordinate DOM, canvas, workers, and external runtimes without glue code.',
        health: 100,
      },
      {
        id: 2,
        title: 'Policy Driven Web Apps',
        url: 'angular.ts/policies',
        text: 'Declare navigation, cache, security, and retry behavior as coherent application policy.',
        health: 100,
      },
      {
        id: 3,
        title: 'HTML-in-Canvas Cockpits',
        url: 'angular.ts/html-in-canvas',
        text: 'Real forms and controls can become renderable canvas content when the browser exposes the API.',
        health: 100,
      },
      {
        id: 4,
        title: 'Model Synchronization',
        url: 'angular.ts/models/sync',
        text: 'Game runtimes and network services synchronize through explicit model contracts.',
        health: 100,
      },
    ],
    enemies: [],
    bursts: [],
    ggLetters: [],
  }))
  .controller(
    'GlyphRushCtrl',
    class {
      static $inject = ['rushModel', '$scope'];

      constructor(rushModel, $scope) {
        this.game = rushModel;
        this.lastTick = 0;
        this.animationFrame = 0;

        $scope.$on('$destroy', () => {
          cancelAnimationFrame(this.animationFrame);
        });
      }

      start() {
        if (this.game.running && this.game.paused) {
          this.game.paused = false;
          this.game.message = 'Defense resumed.';
          this.lastTick = performance.now();
          this.animationFrame = requestAnimationFrame((time) =>
            this.tick(time),
          );

          return;
        }

        this.reset();
        this.game.running = true;
        this.game.message = 'Glyphs incoming. Tap them before they eat the page.';
        this.lastTick = performance.now();
        this.animationFrame = requestAnimationFrame((time) => this.tick(time));
      }

      pause() {
        if (!this.game.running || this.game.gameOver) return;

        this.game.paused = !this.game.paused;
        this.game.message = this.game.paused
          ? 'Defense paused.'
          : 'Defense resumed.';

        if (!this.game.paused) {
          this.lastTick = performance.now();
          this.animationFrame = requestAnimationFrame((time) =>
            this.tick(time),
          );
        }
      }

      reset() {
        cancelAnimationFrame(this.animationFrame);
        this.game.running = false;
        this.game.paused = false;
        this.game.gameOver = false;
        this.game.score = 0;
        this.game.combo = 0;
        this.game.clicks = 0;
        this.game.apm = 0;
        this.game.wave = 1;
        this.game.integrity = 100;
        this.game.elapsed = 0;
        this.game.startedAt = performance.now();
        this.game.nextEnemyId = 1;
        this.game.spawnTimer = 0;
        this.game.message = 'Press Start to defend the page.';
        this.game.enemies = [];
        this.game.bursts = [];
        this.game.ggLetters = [];

        for (const card of this.game.cards) {
          card.health = 100;
        }
      }

      hit(enemyId) {
        if (!this.game.running || this.game.paused || this.game.gameOver) {
          return;
        }

        const enemy = this.game.enemies.find((item) => item.id === enemyId);

        if (!enemy) return;

        this.game.clicks += 1;
        this.updateApm();
        enemy.health -= 1;
        this.game.combo += 1;

        if (enemy.health > 0) {
          this.game.score += 5;
          this.game.message = `${enemy.glyph} staggered.`;

          return;
        }

        this.game.score += 25 + Math.min(100, this.game.combo * 3);
        this.game.message = `${enemy.glyph} cleared before it corrupted ${enemy.targetTitle}.`;
        this.game.bursts.push({
          id: `burst-${enemy.id}`,
          x: enemy.x,
          y: enemy.y,
          text: `+${25 + Math.min(100, this.game.combo * 3)}`,
          ttl: 0.55,
        });
        this.game.enemies = this.game.enemies.filter(
          (item) => item.id !== enemyId,
        );
      }

      cardClass(card) {
        if (card.health <= 0) return 'dead';
        if (card.health < 35) return 'danger';
        if (card.health < 70) return 'warning';

        return 'safe';
      }

      tick(time) {
        if (!this.game.running || this.game.paused || this.game.gameOver) {
          return;
        }

        const delta = Math.min(0.05, (time - this.lastTick) / 1000 || 0);

        this.lastTick = time;
        this.game.elapsed += delta;
        this.game.wave = 1 + Math.floor(this.game.elapsed / 18);
        this.game.spawnTimer -= delta;

        if (this.game.spawnTimer <= 0) {
          const color = Math.random() > 0.5 ? 'red' : 'yellow';

          this.spawnEnemy(color);
          this.spawnEnemy(color);
          this.game.spawnTimer = Math.max(0.38, 1.4 - this.game.wave * 0.11);
        }

        this.advanceEnemies(delta);
        this.advanceBursts(delta);
        this.updateIntegrity();

        if (this.game.integrity <= 0) {
          this.endGame();

          return;
        }

        this.animationFrame = requestAnimationFrame((nextTime) =>
          this.tick(nextTime),
        );
      }

      spawnEnemy(color) {
        const liveCards = this.game.cards.filter((card) => card.health > 0);

        if (liveCards.length === 0) {
          this.endGame();

          return;
        }

        const target = liveCards[Math.floor(Math.random() * liveCards.length)];
        const targetPoint = this.cardTargetPoint(target.id);
        const edge = Math.floor(Math.random() * 4);
        const start = this.edgePoint(edge);
        const glyph = 'O';
        const phase = Math.random() * Math.PI * 2;

        this.game.enemies.push({
          id: this.game.nextEnemyId,
          glyph,
          color,
          x: start.x,
          y: start.y,
          targetX: targetPoint.x,
          targetY: targetPoint.y,
          targetId: target.id,
          targetTitle: target.title,
          health: 2,
          speed: 16 + this.game.wave * 2.2 + Math.random() * 7,
          phase,
          strafe: Math.random() > 0.5 ? 1 : -1,
          angle: 0,
          lunge: 0,
          biteTimer: Math.random() * 0.3,
          biteCooldown: 0.25 + Math.random() * 0.18,
          biting: false,
        });
        this.game.nextEnemyId += 1;
      }

      advanceEnemies(delta) {
        for (const enemy of this.game.enemies) {
          const target = this.game.cards.find(
            (card) => card.id === enemy.targetId,
          );

          if (!target || target.health <= 0) {
            const nextTarget = this.game.cards.find((card) => card.health > 0);

            if (!nextTarget) continue;

            this.retargetEnemy(enemy, nextTarget);
          }

          const dx = enemy.targetX - enemy.x;
          const dy = enemy.targetY - enemy.y;
          const distance = Math.max(0.001, Math.hypot(dx, dy));
          const ux = dx / distance;
          const uy = dy / distance;
          const px = -uy;
          const py = ux;

          enemy.angle = (Math.atan2(uy, ux) * 180) / Math.PI + 90;
          enemy.phase += delta * (8 + this.game.wave * 0.7);

          if (distance < 8.5) {
            enemy.biting = true;
            enemy.biteTimer += delta;
            enemy.lunge = Math.max(0, Math.sin(enemy.biteTimer * 24)) * 2.4;
            enemy.x =
              enemy.targetX -
              ux * (4.2 - enemy.lunge) +
              px * Math.sin(enemy.phase * 1.4) * 1.1;
            enemy.y =
              enemy.targetY -
              uy * (4.2 - enemy.lunge) +
              py * Math.sin(enemy.phase * 1.4) * 1.1;
            this.game.combo = 0;

            if (enemy.biteTimer >= enemy.biteCooldown) {
              target.health = Math.max(
                0,
                target.health - (3.4 + this.game.wave * 0.55),
              );
              enemy.biteTimer = 0;
              enemy.biteCooldown = 0.22 + Math.random() * 0.18;
              this.game.bursts.push({
                id: `bite-${enemy.id}-${this.game.elapsed}`,
                x: enemy.x,
                y: enemy.y,
                text: 'tear',
                ttl: 0.28,
              });
            }

            continue;
          }

          const skitter = Math.sin(enemy.phase) * enemy.strafe;
          const surge = 1 + Math.max(0, Math.sin(enemy.phase * 0.5)) * 0.7;
          const avoid = this.enemyAvoidance(enemy);

          enemy.biting = false;
          enemy.lunge = 0;
          enemy.x +=
            (ux * enemy.speed * surge +
              px * skitter * 9 +
              avoid.x * 18) *
            delta;
          enemy.y +=
            (uy * enemy.speed * surge +
              py * skitter * 9 +
              avoid.y * 18) *
            delta;
        }

        this.game.enemies = this.game.enemies.filter((enemy) => {
          const target = this.game.cards.find(
            (card) => card.id === enemy.targetId,
          );

          return target && target.health > 0;
        });
      }

      enemyAvoidance(enemy) {
        let x = 0;
        let y = 0;

        for (const other of this.game.enemies) {
          if (other.id === enemy.id) continue;

          const dx = enemy.x - other.x;
          const dy = enemy.y - other.y;
          const distance = Math.hypot(dx, dy);

          if (distance <= 0 || distance > 5) continue;

          const force = (5 - distance) / 5;
          x += (dx / distance) * force;
          y += (dy / distance) * force;
        }

        return { x, y };
      }

      retargetEnemy(enemy, target) {
        const point = this.cardTargetPoint(target.id);

        enemy.targetId = target.id;
        enemy.targetTitle = target.title;
        enemy.targetX = point.x;
        enemy.targetY = point.y;
      }

      advanceBursts(delta) {
        for (const burst of this.game.bursts) {
          burst.y -= delta * 10;
          burst.ttl -= delta;
        }

        this.game.bursts = this.game.bursts.filter((burst) => burst.ttl > 0);
      }

      updateIntegrity() {
        const total = this.game.cards.reduce(
          (sum, card) => sum + Number(card.health),
          0,
        );

        this.game.integrity = Math.round(total / this.game.cards.length);
        this.updateApm();
      }

      updateApm() {
        const elapsedMinutes = Math.max(
          (performance.now() - this.game.startedAt) / 60000,
          1 / 60000,
        );

        this.game.apm = Math.round(this.game.clicks / elapsedMinutes);
      }

      endGame() {
        this.game.gameOver = true;
        this.game.running = false;
        this.game.paused = false;
        this.game.enemies = [];
        this.game.ggLetters = this.createGGLetters();
        this.game.message = `Page overrun. Final score: ${this.game.score}.`;
      }

      createGGLetters() {
        const shape = this.createGShape();
        const letters = [];
        const spacing = 2.85;

        for (const originX of [22, 55]) {
          for (const [x, y] of shape) {
            const index = letters.length;

            letters.push({
              id: `gg-${index}`,
              glyph: 'O',
              color: index % 2 === 0 ? 'red' : 'yellow',
              x: originX + x * spacing,
              y: 18 + y * spacing,
            });
          }
        }

        return letters;
      }

      createGShape() {
        const points = [];
        const addRange = (y, start, end) => {
          for (let x = start; x <= end; x += 1) {
            points.push([x, y]);
          }
        };

        addRange(0, 4, 6);
        addRange(1, 2, 8);
        addRange(2, 1, 3);
        addRange(3, 0, 1);
        addRange(4, 0, 1);
        addRange(5, 0, 1);
        addRange(6, 0, 1);
        addRange(7, 0, 1);
        addRange(7, 5, 9);
        addRange(8, 0, 1);
        addRange(8, 8, 9);
        addRange(9, 0, 2);
        addRange(9, 8, 9);
        addRange(10, 1, 3);
        addRange(10, 7, 9);
        addRange(11, 2, 8);
        addRange(12, 4, 7);

        return points;
      }

      cardTargetPoint(cardId) {
        const points = {
          1: { x: 45, y: 39 },
          2: { x: 75, y: 53 },
          3: { x: 27, y: 70 },
          4: { x: 76, y: 83 },
        };

        return points[cardId] ?? { x: 50, y: 50 };
      }

      edgePoint(edge) {
        const offset = Math.random() * 100;

        if (edge === 0) return { x: offset, y: -8 };
        if (edge === 1) return { x: 108, y: offset };
        if (edge === 2) return { x: offset, y: 108 };

        return { x: -8, y: offset };
      }
    },
  );
