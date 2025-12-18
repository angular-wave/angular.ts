export interface SCEService {
  getTrusted(type: string, mayBeTrusted: any): any;
  getTrustedCss(value: any): any;
  getTrustedHtml(value: any): any;
  getTrustedJs(value: any): any;
  getTrustedResourceUrl(value: any): any;
  getTrustedUrl(value: any): any;
  parse(type: string, expression: string): (context: any, locals: any) => any;
  parseAsCss(expression: string): (context: any, locals: any) => any;
  parseAsHtml(expression: string): (context: any, locals: any) => any;
  parseAsJs(expression: string): (context: any, locals: any) => any;
  parseAsResourceUrl(expression: string): (context: any, locals: any) => any;
  parseAsUrl(expression: string): (context: any, locals: any) => any;
  trustAs(type: string, value: any): any;
  trustAsHtml(value: any): any;
  trustAsJs(value: any): any;
  trustAsResourceUrl(value: any): any;
  trustAsUrl(value: any): any;
  isEnabled(): boolean;
}

export interface SCEDelegateService {
  getTrusted(type: string, mayBeTrusted: any): any;
  trustAs(type: string, value: any): any;
  valueOf(value: any): any;
}
