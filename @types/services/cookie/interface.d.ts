export interface CookieOptions {
  path?: string;
  domain?: string;
  expires?: Date | string | number;
  secure?: boolean;
  samesite?: "Lax" | "Strict" | "None";
}
export interface CookieStoreOptions {
  serialize?: (value: any) => string;
  deserialize?: (text: string) => any;
  cookie?: CookieOptions;
}
