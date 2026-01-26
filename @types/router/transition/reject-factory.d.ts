/**
 * An object for Transition Rejection reasons.
 */
export type RejectType = number;
export namespace RejectType {
  let _SUPERSEDED: number;
  let _ABORTED: number;
  let _INVALID: number;
  let _IGNORED: number;
  let _ERROR: number;
}
export class Rejection {
  /**
   * Returns a Rejection due to transition superseded
   *
   * @param {any} [detail]
   * @param {{ redirected?: boolean } | undefined} [options]
   * @returns {Rejection}
   */
  static superseded(
    detail?: any,
    options?:
      | {
          redirected?: boolean;
        }
      | undefined,
  ): Rejection;
  /**
   * Returns a Rejection due to redirected transition
   *
   * @param {any} [detail]
   * @returns {Rejection}
   */
  static redirected(detail?: any): Rejection;
  /**
   * Returns a Rejection due to invalid transition
   *
   * @param {any} detail
   * @returns {Rejection}
   */
  static invalid(detail: any): Rejection;
  /**
   * Returns a Rejection due to ignored transition
   *
   * @param {any} [detail]
   * @returns {Rejection}
   */
  static ignored(detail?: any): Rejection;
  /**
   * Returns a Rejection due to aborted transition
   *
   * @param {any} [detail]
   * @returns {Rejection}
   */
  static aborted(detail?: any): Rejection;
  /**
   * Returns a Rejection due to errored transition
   *
   * @param {any} [detail]
   * @returns {Rejection}
   */
  static errored(detail?: any): Rejection;
  /**
   * Returns a Rejection
   *
   * Normalizes a value as a Rejection.
   * If the value is already a Rejection, returns it.
   * Otherwise, wraps and returns the value as a Rejection (Rejection type: ERROR).
   *
   * @param {any} detail
   * @returns {Rejection} `detail` if it is already a `Rejection`, else returns an ERROR Rejection.
   */
  static normalize(detail: any): Rejection;
  /**
   * @param {number} type
   * @param {string} message
   * @param {any} [detail]
   */
  constructor(type: number, message: string, detail?: any);
  /** @type {number} */
  $id: number;
  /** @type {number} */
  type: number;
  /** @type {string} */
  message: string;
  /** @type {any} */
  detail: any;
  /** @type {boolean} */
  redirected: boolean;
  /**
   * @returns {string}
   */
  toString(): string;
  /**
   * Returns a rejected Promise annotated with `_transitionRejection` for identification.
   *
   * @returns {Promise<any> & { _transitionRejection: Rejection }}
   */
  toPromise(): Promise<any> & {
    _transitionRejection: Rejection;
  };
}
