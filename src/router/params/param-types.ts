import {
  assign,
  equals,
  isInstanceOf,
  isNullOrUndefined,
  isString,
  stringify,
} from "../../shared/utils.ts";
import { ParamType } from "./param-type.ts";
import type { ParamTypeDefinition } from "./interface.ts";

type ParamTypeDefinitionRecord = Partial<ParamTypeDefinition> &
  Record<string, unknown>;

type BuiltInParamTypeName =
  | "hash"
  | "string"
  | "query"
  | "path"
  | "int"
  | "bool"
  | "date"
  | "json"
  | "any";

/** @internal */
export type ParamTypeMap = Record<BuiltInParamTypeName, ParamType> &
  Record<string, ParamType | undefined>;

function encodePathPart(match: string): string {
  return match === "~" ? "~~" : "~2F";
}

function decodePathPart(match: string): string {
  return match === "~~" ? "~" : "/";
}

function encodePath(value: unknown): unknown {
  return !isNullOrUndefined(value)
    ? stringify(value).replace(/([~/])/g, encodePathPart)
    : value;
}

function decodePath(value: unknown): unknown {
  return !isNullOrUndefined(value)
    ? stringify(value).replace(/(~~|~2F)/g, decodePathPart)
    : value;
}

function makeDefaultType(
  def: Record<string, unknown>,
): ParamTypeDefinitionRecord {
  const defaultTypeBase = {
    is: (val: unknown) => isInstanceOf(val, String) || isString(val),
    pattern: /.*/,

    equals: (a: unknown, b: unknown) => a === b,
  };

  return assign({}, defaultTypeBase, def);
}

/** @internal */
export function createDefaultParamTypes(): ParamTypeMap {
  const definitions: Record<BuiltInParamTypeName, ParamTypeDefinitionRecord> = {
    string: makeDefaultType({}),
    path: makeDefaultType({
      encode: encodePath,
      decode: decodePath,
      pattern: /[^/]*/,
    }),
    query: makeDefaultType({}),
    hash: makeDefaultType({
      inherit: false,
    }),
    int: makeDefaultType({
      decode: (val: string) => parseInt(val, 10),
      /**
       * @param {unknown} val
       */
      is(val: unknown) {
        return (
          !isNullOrUndefined(val) &&
          (this as unknown as ParamTypeDefinition).decode?.(stringify(val)) ===
            val
        );
      },
      pattern: /-?\d+/,
    }),
    bool: makeDefaultType({
      encode: (val: unknown) => (val ? "1" : "0"),
      decode: (val: string) => parseInt(val, 10) !== 0,
      is: (val: unknown) =>
        isInstanceOf(val, Boolean) || typeof val === "boolean",
      pattern: /[01]/,
    }),
    date: makeDefaultType({
      /**
       * @param {{ getFullYear: () => number; getMonth: () => number; getDate: () => number; }} val
       */
      encode(val: Date) {
        if (!isInstanceOf(val, Date) || isNaN(val.valueOf())) {
          return "";
        }

        return [
          val.getFullYear(),
          `0${val.getMonth() + 1}`.slice(-2),
          `0${val.getDate()}`.slice(-2),
        ].join("-");
      },
      /**
       * @param {unknown} val
       */
      decode(val: unknown) {
        if ((this as unknown as ParamTypeDefinition).is?.(val)) return val;
        const match = (this as { capture: RegExp }).capture.exec(String(val));

        return match
          ? new Date(
              parseInt(match[1], 10),
              parseInt(match[2], 10) - 1,
              parseInt(match[3], 10),
            )
          : undefined;
      },
      is: (val: unknown) => isInstanceOf(val, Date) && !isNaN(val.valueOf()),
      /**
       * @param {Date} left
       * @param {Date} right
       */
      equals(left: unknown, right: unknown) {
        if (!isInstanceOf(left, Date) || !isInstanceOf(right, Date)) {
          return false;
        }

        return (
          left.getFullYear() === right.getFullYear() &&
          left.getMonth() === right.getMonth() &&
          left.getDate() === right.getDate()
        );
      },
      pattern: /[0-9]{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[1-2][0-9]|3[0-1])/,
      capture: /([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])/,
    }),
    json: makeDefaultType({
      encode: (x: unknown) => JSON.stringify(x),
      decode: (x: string) => JSON.parse(x) as unknown,
      is: (val: unknown) => isInstanceOf(val, Object),
      equals,
      pattern: /[^/]*/,
    }),
    // does not encode/decode
    any: makeDefaultType({
      encode: (x: unknown) => x as string,
      decode: (x: string) => x,
      is: () => true,
      equals,
    }),
  };

  return {
    hash: new ParamType(assign({ name: "hash" }, definitions.hash)),
    string: new ParamType(assign({ name: "string" }, definitions.string)),
    query: new ParamType(assign({ name: "query" }, definitions.query)),
    path: new ParamType(assign({ name: "path" }, definitions.path)),
    int: new ParamType(assign({ name: "int" }, definitions.int)),
    bool: new ParamType(assign({ name: "bool" }, definitions.bool)),
    date: new ParamType(assign({ name: "date" }, definitions.date)),
    json: new ParamType(assign({ name: "json" }, definitions.json)),
    any: new ParamType(assign({ name: "any" }, definitions.any)),
  };
}
