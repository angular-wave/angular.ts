window.angular
  .module('konvaConcept', [])
  .model('shapeModel', () => ({
    kind: 'circle',
    x: 320,
    y: 150,
    size: 56,
    color: '#2f80ed',
  }))
  .controller(
    'DemoCtrl',
    class {
      static $inject = ['shapeModel', '$scope'];

      constructor(shapeModel, $scope) {
        this.shape = shapeModel;
        this.destroyRuntime = () => {};
        $scope.$on('$destroy', () => this.destroyRuntime());
        requestAnimationFrame(() => this.mount());
      }

      center() {
        this.shape.x = 320;
        this.shape.y = 150;
      }

      toggleShape() {
        this.shape.kind = this.shape.kind === 'circle' ? 'rect' : 'circle';
      }

      mount() {
        const stage = new Konva.Stage({
          container: 'konva-view',
          width: 640,
          height: 300,
        });
        const layer = new Konva.Layer();
        let node = createShapeNode(this.shape);
        let currentKind = this.shape.kind;
        let frame = 0;

        stage.add(layer);
        layer.add(node);

        const bindNode = (nextNode) => {
          nextNode.on('dragmove', () => {
            this.shape.x = nextNode.x();
            this.shape.y = nextNode.y();
          });
        };

        bindNode(node);

        const render = () => {
          if (this.shape.kind !== currentKind) {
            currentKind = this.shape.kind;
            node.destroy();
            node = createShapeNode(this.shape);
            bindNode(node);
            layer.add(node);
          }

          updateShapeNode(node, this.shape);
          layer.batchDraw();
          frame = requestAnimationFrame(render);
        };

        render();

        this.destroyRuntime = () => {
          cancelAnimationFrame(frame);
          stage.destroy();
        };
      }
    },
  );

function createShapeNode(shape) {
  if (shape.kind === 'rect') {
    return new Konva.Rect({
      draggable: true,
    });
  }

  return new Konva.Circle({
    draggable: true,
  });
}

function updateShapeNode(node, shape) {
  const size = Number(shape.size);

  node.x(Number(shape.x));
  node.y(Number(shape.y));
  node.fill(shape.color);

  if (shape.kind === 'rect') {
    node.width(size);
    node.height(size);
    node.offsetX(size / 2);
    node.offsetY(size / 2);
    return;
  }

  node.radius(size / 2);
}
