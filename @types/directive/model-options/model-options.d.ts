/**
 * @returns {ng.Directive}
 */
export function ngModelOptionsDirective(): ng.Directive;
export const defaultModelOptions: ModelOptions;
export type ModelOptionsConfig = any & Record<string, any>;
/**
 * A container for the options set by the {@link ngModelOptions} directive
 */
declare class ModelOptions {
  static $nonscope: boolean;
  /**
   * @param {ModelOptionsConfig} options
   */
  constructor(options: ModelOptionsConfig);
  /** @type {ModelOptionsConfig} */
  _options: ModelOptionsConfig;
  /**
   * Returns the value of the given option
   * @param {string} name the name of the option to retrieve
   * @returns {string|boolean|number|Object.<string, number>} the value of the option   *
   */
  getOption(name: string):
    | string
    | boolean
    | number
    | {
        [x: string]: number;
      };
  /**
   * @param {ModelOptionsConfig} options a hash of options for the new child that will override the parent's options
   * @return {ModelOptions} a new `ModelOptions` object initialized with the given options.
   */
  createChild(options: ModelOptionsConfig): ModelOptions;
}
export {};
