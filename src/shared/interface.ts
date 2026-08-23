/** Controls how values embedded in framework error messages are formatted. */
export interface ErrorFormattingConfig {
  /**
   * The max depth for stringifying objects.
   * Setting to a non-positive or non-numeric value removes the max depth limit.
   * Default: 5.
   */
  objectMaxDepth?: number;
}

export type Validator = (value: unknown) => boolean;
