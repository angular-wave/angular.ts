import {
  assign,
  hasCustomToString,
  isArray,
  isDefined,
  isNullOrUndefined,
} from "../../shared/utils.ts";
import type { ParamTypeDefinition } from "./interface.ts";

type ArrayUnaryMethod = "encode" | "decode" | "is" | "$normalize";

type ParamTypeConfig = Partial<ParamTypeDefinition> & Record<string, unknown>;

const emptyParamTypeDefinition: ParamTypeConfig = {};

function valToString(val: unknown): string | undefined {
  if (isNullOrUndefined(val)) {
    return undefined;
  }

  switch (typeof val) {
    case "string":
      return val;
    case "number":
    case "boolean":
    case "bigint":
    case "symbol":
      return String(val);
    case "function":
      return val.toString();
    case "object":
      return hasCustomToString(val as { toString: () => string })
        ? (val as { toString: () => string }).toString()
        : undefined;
    default:
      return undefined;
  }
}

/**
 * An internal class which implements [[ParamTypeDefinition]].
 *
 * Used internally when matching or formatting URLs, or comparing and validating parameter values.
 */
export class ParamType {
  [key: string]: unknown;
  pattern: RegExp;
  inherit: boolean;
  name: string | undefined;

  constructor(def: ParamTypeConfig) {
    this.pattern = /.*/;
    this.inherit = true;
    assign(this, def);
  }
  // consider these four methods to be "abstract methods" that should be overridden

  /**
   * @param {unknown} val
   */
  is(val: unknown): boolean {
    return !!val;
  }

  /**
   * @param {unknown} val
   */
  encode(val: unknown): unknown {
    return valToString(val);
  }

  /**
   * @param {unknown} val
   */
  decode(val: unknown): unknown {
    return valToString(val);
  }

  /**
   * @param {unknown} a
   * @param {unknown} b
   */
  equals(a: unknown, b: unknown): boolean {
    return a === b;
  }

  toString() {
    return `{ParamType:${this.name ?? ""}}`;
  }

  /**
   * Given an encoded string, or a decoded object, returns a decoded object
   * @param {unknown} val
   */
  $normalize(val: unknown): unknown {
    return this.is(val) ? val : this.decode(val);
  }

  /**
   * Wraps an existing custom ParamType as an array of ParamType, depending on 'mode'.
   * e.g.:
   * - urlmatcher pattern "/path?{queryParam[]:int}"
   * - url: "/path?queryParam=1&queryParam=2
   * - $stateParams.queryParam will be [1, 2]
   * if `mode` is "auto", then
   * - url: "/path?queryParam=1 will create $stateParams.queryParam: 1
   * - url: "/path?queryParam=1&queryParam=2 will create $stateParams.queryParam: [1, 2]
   * @param {boolean |'auto'} mode
   */
  $asArray(mode: false): this;
  $asArray(mode: true | "auto"): ArrayParamType;
  $asArray(mode: boolean | "auto"): this | ArrayParamType {
    if (!mode) return this;

    return new ArrayParamType(this, mode);
  }
}

/**
 * Wraps up a `ParamType` object to handle array values.
 * @param {ParamType & Record<string, unknown>} type
 * @param {boolean | 'auto'} mode
 */
class ArrayParamType extends ParamType {
  /** @internal */
  _type: ParamType & Record<string, unknown>;
  /** @internal */
  _arrayMode: boolean | "auto";

  constructor(
    type: ParamType & Record<string, unknown>,
    mode: boolean | "auto",
  ) {
    super(emptyParamTypeDefinition);

    delete (this as Record<string, unknown>).is;
    delete (this as Record<string, unknown>).encode;
    delete (this as Record<string, unknown>).decode;
    delete (this as Record<string, unknown>).equals;

    this._type = type;
    this._arrayMode = mode;
    this.dynamic = type.dynamic;
    this.name = type.name;
    this.pattern = type.pattern;
    this.inherit = type.inherit;
    this.raw = type.raw;
    this.$arrayMode = mode;
  }

  /** @internal */
  _arrayWrap(val: unknown): unknown[] {
    return isArray(val) ? val : isDefined(val) ? [val] : [];
  }

  /** @internal */
  _arrayUnwrap(val: unknown[]): unknown {
    switch (val.length) {
      case 0:
        return undefined;
      case 1:
        return this._arrayMode === "auto" ? val[0] : val;
      default:
        return val;
    }
  }

  /** @internal */
  _mapArray(method: ArrayUnaryMethod, val: unknown, allTruthyMode = false) {
    if (isArray(val) && val.length === 0) return val as unknown[];

    const arr = this._arrayWrap(val);

    const type = this._type;

    if (allTruthyMode) {
      for (let i = 0; i < arr.length; i++) {
        if (!type[method](arr[i])) return false;
      }

      return true;
    }

    const result: unknown[] = [];

    arr.forEach((item) => {
      result.push(type[method](item));
    });

    return this._arrayUnwrap(result);
  }

  encode(val: unknown): unknown {
    return this._mapArray("encode", val);
  }

  decode(val: unknown): unknown {
    return this._mapArray("decode", val);
  }

  $normalize(val: unknown): unknown {
    return this._mapArray("$normalize", val);
  }

  is(val: unknown): boolean {
    return this._mapArray("is", val, true) as boolean;
  }

  equals(val1: unknown, val2: unknown): boolean {
    const left = this._arrayWrap(val1);

    const right = this._arrayWrap(val2);

    if (left.length !== right.length) return false;

    const { _type: type } = this;

    for (let i = 0; i < left.length; i++) {
      if (!type.equals(left[i], right[i])) return false;
    }

    return true;
  }
}
