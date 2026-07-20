window.angular
  .module('webgpuConcept', [])
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

      async mount() {
        const status = document.getElementById('webgpu-status');
        const canvas = document.getElementById('webgpu-view');

        if (!navigator.gpu) {
          status.textContent = 'WebGPU is not available in this browser.';
          return;
        }

        const adapter = await navigator.gpu.requestAdapter();

        if (!adapter) {
          status.textContent = 'WebGPU adapter was not available.';
          return;
        }

        const device = await adapter.requestDevice();
        const context = canvas.getContext('webgpu');
        const format = navigator.gpu.getPreferredCanvasFormat();

        if (!context) {
          status.textContent = 'WebGPU canvas context was not available.';
          return;
        }

        context.configure({ device, format });
        status.textContent = 'WebGPU clear color is driven by the app model.';

        const render = () => {
          const encoder = device.createCommandEncoder();
          const view = context.getCurrentTexture().createView();
          const pass = encoder.beginRenderPass({
            colorAttachments: [
              {
                view,
                clearValue: {
                  r: Number(this.clear.red),
                  g: Number(this.clear.green),
                  b: Number(this.clear.blue),
                  a: 1,
                },
                loadOp: 'clear',
                storeOp: 'store',
              },
            ],
          });

          pass.end();
          device.queue.submit([encoder.finish()]);
          requestAnimationFrame(render);
        };

        render();
      }
    },
  );
