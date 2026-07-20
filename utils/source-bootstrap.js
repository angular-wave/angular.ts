import { angular } from "../src/index.ts";

window.angular = angular;

const entryScript = document.querySelector("script[data-angular-ts-entry]");
const entry = entryScript?.dataset.angularTsEntry;

if (entry) {
  await import(/* @vite-ignore */ new URL(entry, document.baseURI).href);
}

angular.init(document);
