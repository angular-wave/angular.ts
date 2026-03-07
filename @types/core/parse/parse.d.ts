import type { FilterService } from "../../filters/interface.ts";
import type { ParseService } from "./interface.ts";
export declare class ParseProvider {
  $get: [string, ($filter: FilterService) => ParseService];
  constructor();
}
