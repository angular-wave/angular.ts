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
  /** Returns a Rejection due to transition superseded */
  static superseded(detail: any, options: any): Rejection;
  /** Returns a Rejection due to redirected transition
   * @param {any} detail @returns {Rejection}
   */
  static redirected(detail: any): Rejection;
  /** Returns a Rejection due to invalid transition
   * @param {any} detail @returns {Rejection}
   */
  static invalid(detail: any): Rejection;
  /** Returns a Rejection due to ignored transition
   * @param {any} detail @returns {Rejection}
   */
  static ignored(detail: any): Rejection;
  /** Returns a Rejection due to aborted transition
   * @param {any} detail @returns {Rejection}
   */
  static aborted(detail: any): Rejection;
  /** Returns a Rejection due to aborted transition
   * @param detail
   * @returns {Rejection}
   */
  static errored(detail: any): Rejection;
  /**
   * Returns a Rejection
   *
   * Normalizes a value as a Rejection.
   * If the value is already a Rejection, returns it.
   * Otherwise, wraps and returns the value as a Rejection (Rejection type: ERROR).
   *
   * @returns `detail` if it is already a `Rejection`, else returns an ERROR Rejection.
   */
  static normalize(detail: any): any;
  /**
   * @param {number} type
   * @param {string} message
   * @param {any} detail
   */
  constructor(type: number, message: string, detail: any);
  /** @type {number} */
  $id: number;
  type: number;
  message: string;
  detail: any;
  redirected: boolean;
  /** @returns {string} */
  toString(): string;
  /**
   * @returns {Promise<any> & {_transitionRejection: Rejection}}
   */
  toPromise(): Promise<any> & {
    _transitionRejection: Rejection;
  };
}
