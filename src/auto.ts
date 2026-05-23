import { angular } from "./index.ts";

export * from "./index.ts";

document.addEventListener(
  "DOMContentLoaded",
  () => {
    angular.init(document);
  },
  {
    once: true,
  },
);
