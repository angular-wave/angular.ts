/**
 *
 * @param {Array<String|Function>} modulesToLoad
 * @param {boolean} [strictDi]
 * @returns {InjectorService}
 */
export function createInjector(
  modulesToLoad: Array<string | Function>,
  strictDi?: boolean,
): InjectorService;
import { InjectorService } from "./internal-injector.js";
