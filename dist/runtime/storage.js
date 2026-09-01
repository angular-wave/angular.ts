import { _storage } from '../injection-tokens.js';
import { createPersistentProxy } from '../services/storage/storage.js';

/**
 * Registers persistent store support for custom runtimes.
 *
 * Include this module when using module-level `store(...)` declarations.
 */
const storageModule = (angular) => angular
    .createModule("ng.storage", [])
    .factory(_storage, () => createPersistentProxy);

export { storageModule };
