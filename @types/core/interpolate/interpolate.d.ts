import type { ParseService } from "../parse/interface.ts";
import type { InterpolateService } from "./interface.ts";
type SceLike = {
  URL: string;
  MEDIA_URL: string;
  getTrusted(context: string | undefined, value: any): any;
  valueOf(value: any): any;
};
export declare class InterpolateProvider {
  startSymbol: string;
  endSymbol: string;
  $get: [
    string,
    string,
    ($parse: ParseService, $sce: SceLike) => InterpolateService,
  ];
  constructor();
}
export {};
