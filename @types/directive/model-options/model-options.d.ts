import type { NgModelOptions } from "../model/interface.ts";
export type ModelOptionsConfig = NgModelOptions & {
  [key: string]: any;
  updateOnDefault?: boolean;
  "*"?: "$inherit";
};
/**
 * A container for the options set by the `ngModelOptions` directive.
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
export declare function ngModelOptionsDirective(): ng.Directive;
