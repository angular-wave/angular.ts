import { angular } from "../src/auto.ts";

window.angular = angular;

const entryScript = document.querySelector("script[data-angular-ts-entry]");
const entry = entryScript?.dataset.angularTsEntry;

if (entry) {
  await import(new URL(entry, document.baseURI));
}
