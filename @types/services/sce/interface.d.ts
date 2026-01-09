export interface SCEService {
  HTML: string;
  CSS: string;
  JS: string;
  URL: string;
  RESOURCE_URL: string;
  MEDIA_URL: string;
  getTrusted(type: string, mayBeTrusted: any): any;
  getTrustedCss(value: any): any;
  getTrustedHtml(value: any): any;
  getTrustedResourceUrl(value: any): any;
  getTrustedUrl(value: any): any;
  getTrustedMediaUrl(value: any): any;
  parse(type: string, expression: string): (context: any, locals: any) => any;
  parseAsCss(expression: string): (context: any, locals: any) => any;
  parseAsHtml(expression: string): (context: any, locals: any) => any;
  parseAsResourceUrl(expression: string): (context: any, locals: any) => any;
  parseAsUrl(expression: string): (context: any, locals: any) => any;
  trustAs(type: string, value: any): any;
  trustAsHtml(value: any): any;
  trustAsResourceUrl(value: any): any;
  trustAsUrl(value: any): any;
  isEnabled(): boolean;
  valueOf(value?: any): any;
}
export interface SCEDelegateService {
  getTrusted(type: string, mayBeTrusted: any): any;
  trustAs(type: string, value: any): any;
  valueOf(value?: any): any;
}
