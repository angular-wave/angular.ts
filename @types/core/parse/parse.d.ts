import type { FilterService } from "../../filters/interface.ts";
import type { ParseService } from "./interface.ts";
/**
 * Provider for the `$parse` service.
 *
 * It compiles expressions once, caches the resulting functions, and
 * optionally decorates them with interceptor logic.
 */
export declare class ParseProvider {
  $get: [string, ($filter: FilterService) => ParseService];
  /**
   * Creates the `$parse` provider and its shared expression cache.
   */
  constructor();
}
