import "../angular.js";

const entryScript = document.querySelector("script[data-angular-ts-entry]");
const entry = entryScript?.dataset.angularTsEntry;

if (entry) {
  await import(new URL(entry, document.baseURI).href);
}
