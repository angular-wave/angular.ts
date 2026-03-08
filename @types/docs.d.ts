/**
 * Public documentation barrel.
 *
 * This module re-exports the runtime and type surfaces that documentation
 * examples, generated API references, and external consumers rely on, without
 * forcing them to know the internal source layout.
 */
export * from "./animations/interface.ts";
export { AnimateRunner } from "./animations/runner/animate-runner.ts";
export { AnchorScrollService } from "./services/anchor-scroll/interface.ts";
export { AnchorScrollProvider } from "./services/anchor-scroll/anchor-scroll.ts";
export * from "./services/http/interface.ts";
export * from "./services/log/interface.ts";
export * from "./services/log/log.ts";
export * from "./services/location/interface.ts";
export * from "./services/location/location.ts";
export * from "./services/pubsub/pubsub.ts";
export * from "./services/template-cache/template-cache.ts";
export { SceProvider, SceDelegateProvider } from "./services/sce/sce.ts";
export { SceService, SceDelegateService } from "./services/sce/interface.ts";
export * from "./index.ts";
export * from "./angular.ts";
export * from "./core/di/internal-injector.ts";
export * from "./core/scope/scope.js";
export * from "./services/cookie/cookie.ts";
export * from "./services/cookie/interface.ts";
export * from "./services/exception/exception.ts";
export * from "./services/exception/interface.ts";
export * from "./core/parse/interface.ts";
export * from "./filters/interface.ts";
export * from "./core/filter/filter.ts";
