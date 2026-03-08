import type { NgModelOptions } from "../model/interface.ts";
/**
 * @typedef {Object & Record<string, any>} ModelOptionsConfig
 * @property {string} [updateOn] - A string specifying which events the input should be bound to. Multiple events can be set using a space-delimited list. The special event 'default' matches the default events belonging to the control.
 * @property {number|Object.<string, number>} [debounce] - An integer specifying the debounce time in milliseconds. A value of 0 triggers an immediate update. If an object is supplied, custom debounce values can be set for each event.
 * @property {boolean} [allowInvalid] - Indicates whether the model can be set with values that did not validate correctly. Defaults to false, which sets the model to undefined on validation failure.
 * @property {boolean} [getterSetter] - Determines whether to treat functions bound to `ngModel` as getters/setters. Defaults to false.
 * @property {boolean} [updateOnDefault]
 */
export type ModelOptionsConfig = NgModelOptions & {
  [key: string]: any;
  updateOnDefault?: boolean;
  "*"?: "$inherit";
};
/**
 * A container for the options set by the {@link ngModelOptions} directive
 */
export declare class ModelOptions {
  static $nonscope: boolean;
  _options: ModelOptionsConfig;
  constructor(options: ModelOptionsConfig);
  getOption(
    name: string,
  ): string | boolean | number | Record<string, number> | undefined;
  createChild(options?: ModelOptionsConfig): ModelOptions;
}
export declare const defaultModelOptions: ModelOptions;
/**
 * @returns {ng.Directive}
 */
export declare function ngModelOptionsDirective(): ng.Directive;
