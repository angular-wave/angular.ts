import { $injectTokens } from "../../injection-tokens.ts";
import { entries, isDefined, keys, trim } from "../../shared/utils.js";
import type { NgModelOptions } from "../model/interface.ts";

const DEFAULT_REGEXP = /(\s+|^)default(\s+|$)/;

export type ModelOptionsConfig = NgModelOptions & {
  [key: string]: any;
  updateOnDefault?: boolean;
  "*"?: "$inherit";
};

class NgModelOptionsController {
  static $nonscope = true;
  static $inject = [$injectTokens._attrs, $injectTokens._scope];

  _attrs: ng.Attributes;
  _scope: ng.Scope;
  parentCtrl: NgModelOptionsController | null;
  $options: ModelOptions;

  constructor($attrs: ng.Attributes, $scope: ng.Scope) {
    this._attrs = $attrs;
    this._scope = $scope;
    this.parentCtrl = null;
    this.$options = defaultModelOptions;
  }

  $onInit(): void {
    const parentOptions = this.parentCtrl
      ? this.parentCtrl.$options
      : defaultModelOptions;

    const modelOptionsDefinition = this._scope.$eval(
      this._attrs.ngModelOptions as string,
    ) as ModelOptionsConfig;

    this.$options = parentOptions.createChild(modelOptionsDefinition);
  }
}

/**
 * A container for the options set by the `ngModelOptions` directive.
 */
export class ModelOptions {
  static $nonscope = true;

  _options: ModelOptionsConfig;

  constructor(options: ModelOptionsConfig) {
    this._options = options;
  }

  getOption(
    name: string,
  ): string | boolean | number | Record<string, number> | undefined {
    return this._options[name];
  }

  createChild(options: ModelOptionsConfig = {}): ModelOptions {
    let inheritAll = false;
    const mergedOptions = Object.assign({}, options);

    entries(mergedOptions).forEach(([key, option]) => {
      if (option === "$inherit") {
        if (key === "*") {
          inheritAll = true;
        } else {
          mergedOptions[key] = this._options[key];

          if (key === "updateOn") {
            mergedOptions.updateOnDefault = this._options.updateOnDefault;
          }
        }
      } else if (key === "updateOn" && typeof option === "string") {
        mergedOptions.updateOnDefault = false;
        mergedOptions[key] = trim(
          option.replace(DEFAULT_REGEXP, () => {
            mergedOptions.updateOnDefault = true;

            return " ";
          }),
        );
      }
    });

    if (inheritAll) {
      delete mergedOptions["*"];
      defaults(mergedOptions, this._options);
    }

    defaults(mergedOptions, defaultModelOptions._options);

    return new ModelOptions(mergedOptions);
  }
}

export const defaultModelOptions = new ModelOptions({
  updateOn: "",
  updateOnDefault: true,
  debounce: 0,
  getterSetter: false,
  allowInvalid: false,
});

export function ngModelOptionsDirective(): ng.Directive {
  return {
    restrict: "A",
    priority: 10,
    require: { parentCtrl: "?^^ngModelOptions" },
    bindToController: true,
    controller: NgModelOptionsController,
  };
}

// Shallow-copy missing defaults from `src` into `dst`.
function defaults(dst: ModelOptionsConfig, src: Record<string, any>): void {
  keys(src).forEach((key) => {
    if (!isDefined(dst[key])) {
      dst[key] = src[key];
    }
  });
}
