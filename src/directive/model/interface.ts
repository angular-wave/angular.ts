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

/**
 * Configuration for ngModel behavior.
 */
export interface NgModelOptions {
  /** Space-separated event names that trigger updates */
  updateOn?: string;
  /** Delay in milliseconds or event-specific debounce times */
  debounce?: number | Record<string, number>;
  /** Whether to allow invalid values */
  allowInvalid?: boolean;
  /** Enables getter/setter style ngModel */
  getterSetter?: boolean;
  /** Timezone used for Date objects */
  timezone?: string;
  /** Time display format including seconds */
  timeSecondsFormat?: string;
  /** Whether to remove trailing :00 seconds */
  timeStripZeroSeconds?: boolean;
}
