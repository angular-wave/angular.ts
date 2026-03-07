import { InjectorService } from "./internal-injector.ts";
import type { Injectable } from "../../interface.ts";
type ModuleLike = string | Function | Injectable<(...args: any[]) => any>;
/**
 *
 * @param {Array<String|Function>} modulesToLoad
 * @param {boolean} [strictDi]
 * @returns {InjectorService}
 */
export declare function createInjector(
  modulesToLoad: ModuleLike[],
  strictDi?: boolean,
): InjectorService;
export {};
