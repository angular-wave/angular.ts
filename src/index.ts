import { Angular } from "./angular.ts";

export const angular = new Angular();
document.addEventListener("DOMContentLoaded", () => angular.init(document), {
  once: true,
});
