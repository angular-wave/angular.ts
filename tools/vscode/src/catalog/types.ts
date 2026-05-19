export type AngularTsSymbolKind =
  | "directive"
  | "component"
  | "filter"
  | "controller"
  | "service"
  | "factory"
  | "provider"
  | "constant";

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
  bindings?: BindingInfo[];
  source?: SourceLocation;
  detail?: string;
}
