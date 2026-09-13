import { Angular } from "../src/angular.ts";
import { autoBootstrap } from "../src/auto-bootstrap.ts";

const angular = new Angular();

window.angular = angular;

const entryScript = document.querySelector("script[data-angular-ts-entry]");
const entry = entryScript?.dataset.angularTsEntry;

if (entry) {
  await import(/* @vite-ignore */ new URL(entry, document.baseURI).href);
}

autoBootstrap(angular, document);
