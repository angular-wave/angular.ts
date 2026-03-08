import type { FilterFactory, FilterService } from "../../filters/interface.ts";
import type { Provider } from "../../interface.ts";
export declare class FilterProvider {
  static $inject: "$provide"[];
  _$provide: Provider;
  $get: [string, ($injector: ng.InjectorService) => FilterService];
  constructor($provide: Provider);
  register(name: string, factory: FilterFactory): FilterProvider;
}
