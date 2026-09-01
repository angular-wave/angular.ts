import type { RuntimeModule } from "../angular-runtime.ts";
import { _storage } from "../injection-tokens.ts";
import { createPersistentProxy } from "../services/storage/storage.ts";

/**
 * Registers persistent store support for custom runtimes.
 *
 * Include this module when using module-level `store(...)` declarations.
 */
export const storageModule: RuntimeModule = (angular) =>
  angular
    .createModule("ng.storage", [])
    .factory(_storage, () => createPersistentProxy);
