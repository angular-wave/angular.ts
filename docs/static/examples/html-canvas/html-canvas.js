import { createAngular } from '/src/runtime/index.ts';
import {
  ngAttributeAliasDirectives,
  ngBindingDirectives,
  ngElementDirectives,
  ngEventDirectives,
  ngFormDirectives,
  ngTemplateDirectives,
} from '/src/ng.ts';
import { htmlCanvasModule } from '/src/runtime/html-canvas.ts';

const angular = createAngular({
  modules: [htmlCanvasModule],
  directives: [
    ngElementDirectives,
    ngBindingDirectives,
    ngTemplateDirectives,
    ngFormDirectives,
    ngEventDirectives,
    ngAttributeAliasDirectives,
  ],
});
const app = angular.module('htmlCanvasDemo', []);

app.controller('HtmlCanvasDemoCtrl', [
  '$htmlCanvas',
  class {
    constructor($htmlCanvas) {
      this.supported = $htmlCanvas.supported;
      this.status = this.supported
        ? 'HTML-in-Canvas native runtime is active.'
        : 'HTML-in-Canvas native runtime is unavailable.';
      this.ship = {
        name: 'The Canvas Voyager',
        hyperdrive: true,
        system: 'alpha',
        shield: 75,
      };
    }
  },
]);

app.controller('HtmlCanvasPolicyDemoCtrl', [
  '$htmlCanvas',
  class {
    constructor($htmlCanvas) {
      this.supported = $htmlCanvas.supported;
      this.policy = {
        interaction: 'explicit-approval',
      };
      this.request = {
        approvalCode: '',
      };
      this.status = 'Waiting for policy-approved interaction.';
    }

    approve() {
      if (this.request.approvalCode === 'LAUNCH') {
        this.status = 'Interaction accepted by application policy.';

        return;
      }

      this.status = 'Interaction blocked by application policy.';
    }
  },
]);

app.config({
  $htmlCanvas: {
    enabled: 'auto',
    throwOnUnsupported: false,
    defaultScheduler: 'paint',
    defaultMode: '2d',
    requireFlag: true,
  },
});

document.addEventListener('DOMContentLoaded', () => angular.init(document), {
  once: true,
});
