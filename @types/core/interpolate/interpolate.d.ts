import type { ParseService } from "../parse/interface.ts";
import type { InterpolateService } from "./interface.ts";
type SceLike = {
  URL: string;
  MEDIA_URL: string;
  getTrusted(context: string | undefined, value: any): any;
  valueOf(value: any): any;
};
/**
 * Configures Angular interpolation delimiters and produces interpolation
 * functions that evaluate embedded expressions against a scope/context.
 */
export declare class InterpolateProvider {
  /**
   * Start symbol used when parsing interpolation expressions.
   */
  startSymbol: string;
  /**
   * End symbol used when parsing interpolation expressions.
   */
  endSymbol: string;
  $get: [
    string,
    string,
    ($parse: ParseService, $sce: SceLike) => InterpolateService,
  ];
  /**
   * Creates the provider with the default `{{` / `}}` interpolation markers.
   */
  constructor();
}
export {};
