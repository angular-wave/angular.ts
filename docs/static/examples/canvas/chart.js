import { canvasModule } from '/src/runtime/canvas.ts';

canvasModule(window.angular);
window.angular
  .createModule('canvasChart', ['ng.canvas'])
  .model('chartModel', () => ({ value: 60 }))
  .controller('ChartController', [
    'chartModel',
    class {
      constructor(model) {
        this.model = model;
        let context;
        this.renderer = {
          $nonscope: true,
          mount: (surface) => {
            context = surface.context;
          },
          render: ({ size }) => {
            context.setTransform(size.pixelRatio, 0, 0, size.pixelRatio, 0, 0);
            context.clearRect(0, 0, size.width, size.height);
            context.fillStyle = '#e8eef4';
            context.fillRect(0, 40, size.width, 80);
            context.fillStyle = '#2f80ed';
            context.fillRect(
              0,
              40,
              (size.width * Number(model.value)) / 100,
              80,
            );
          },
        };
      }
    },
  ]);
