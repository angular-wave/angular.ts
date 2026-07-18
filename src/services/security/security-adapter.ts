import type { SceContext } from "../sce/context.ts";

/** @internal */
export const passThroughSecurityAdapter = {
  getTrusted: (_context, value) => value,
  getTrustedMediaUrl: (value) => value,
  valueOf: (value) => value,
} satisfies {
  getTrusted<T>(context: SceContext | undefined, value: T): T;
  getTrustedMediaUrl<T>(value: T): T;
  valueOf<T>(value?: T): T | undefined;
};
