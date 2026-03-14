import { Angular } from "./angular.js";

export const angular = new Angular();
document.addEventListener("DOMContentLoaded", () => angular.init(document), {
  once: true,
});
