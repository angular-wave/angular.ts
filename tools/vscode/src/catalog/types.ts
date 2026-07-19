export type AngularTsSymbolKind =
  | "directive"
  | "component"
  | "filter"
  | "controller"
  | "service"
  | "factory"
  | "provider"
  | "constant"
  | "route";

export type AngularTsExpressionKind =
  | "none"
  | "expression"
  | "statement"
  | "model"
  | "repeat"
  | "options"
  | "template-url"
  | "controller"
  | "filter"
  | "json"
  | "string";

export interface SourceLocation {
  file: string;
  line?: number;
  character?: number;
}

export interface BindingInfo {
  name: string;
  mode: "@" | "<" | "=" | "&" | string;
  optional: boolean;
  description?: string;
  source?: SourceLocation;
}

export interface RouteParamInfo {
  name: string;
  optional: boolean;
  valueType?: "string" | "number" | "boolean" | "Date";
  source?: SourceLocation;
}

export interface RouteComponentInfo {
  name: string;
  source?: SourceLocation;
  sourceOffset?: number;
}

export interface RouteResolveInfo {
  name: string;
  value?: string;
  valueStart?: number;
  valueEnd?: number;
  source?: SourceLocation;
  sourceOffset?: number;
}

export interface AngularTsCatalogEntry {
  kind: AngularTsSymbolKind;
  name: string;
  normalizedName: string;
  htmlName?: string;
  aliases: string[];
  description: string;
  restrict?: string;
  allowedLocations?: Array<"attribute" | "element">;
  expressionKind?: AngularTsExpressionKind;
  valueRequired?: boolean;
  example?: string;
  examples?: string[];
  signature?: string;
  requiredCompanionAttributes?: string[];
  conflictingAttributes?: string[];
  bindings?: BindingInfo[];
  routeComponent?: RouteComponentInfo;
  routeLazyBoundary?: boolean;
  routeParams?: RouteParamInfo[];
  routeResolves?: RouteResolveInfo[];
  controller?: string;
  controllerAs?: string;
  template?: string;
  templateUrl?: string;
  require?: string[];
  eventType?: string;
  source?: SourceLocation;
  detail?: string;
}
