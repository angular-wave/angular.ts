export interface ModelValidators {
  /**
   * viewValue is any because it can be an object that is called in the view like $viewValue.name:$viewValue.subName
   */
  [index: string]: (modelValue: any, viewValue: any) => boolean;
}
export interface AsyncModelValidators {
  [index: string]: (modelValue: any, viewValue: any) => Promise<any>;
}
export interface ModelParser {
  (value: any): any;
}
export interface ModelFormatter {
  (value: any): any;
}
export interface ModelViewChangeListener {
  (): void;
}
