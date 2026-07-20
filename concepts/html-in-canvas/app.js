import { createAngular } from "/src/runtime/index.ts";
import {
  ngAttributeAliasDirectives,
  ngBindingDirectives,
  ngElementDirectives,
  ngEventDirectives,
  ngFormDirectives,
  ngTemplateDirectives,
} from "/src/ng.ts";
import { htmlCanvasModule } from "/src/runtime/html-canvas.ts";

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
const app = angular.module("htmlCanvasConcept", []);

app.model("panelModel", () => ({
  shipName: "The Canvas Voyager",
  shield: 75,
  hyperdrive: true,
  stealth: false,
  target: "Europa Gate",
  thrust: 42,
  heat: 18,
  lastCommand: "Systems armed",
  launches: 0,
}));

app.controller(
  "DemoCtrl",
  class {
    static $inject = ["panelModel", "$htmlCanvas"];

    constructor(panelModel, $htmlCanvas) {
      this.panel = panelModel;
      this.supported = $htmlCanvas.supported;
    }

    launch() {
      this.panel.launches += 1;
      this.panel.heat = Math.min(100, this.panel.heat + 17);
      this.panel.lastCommand = `${this.panel.shipName} launched toward ${this.panel.target}`;
    }

    boost() {
      this.panel.thrust = Math.min(100, this.panel.thrust + 12);
      this.panel.heat = Math.min(100, this.panel.heat + 9);
      this.panel.lastCommand = "Impulse boost applied";
    }

    vent() {
      this.panel.heat = Math.max(0, this.panel.heat - 24);
      this.panel.shield = Math.max(0, this.panel.shield - 4);
      this.panel.lastCommand = "Heat vented through shield grid";
    }
  },
);

app.config({
  $htmlCanvas: {
    enabled: "auto",
    throwOnUnsupported: false,
    defaultScheduler: "paint",
    defaultMode: "2d",
  },
});

document.addEventListener("DOMContentLoaded", () => angular.init(document), {
  once: true,
});
