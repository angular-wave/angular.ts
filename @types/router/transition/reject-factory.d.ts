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
  /** Returns a Rejection due to redirected transition */
  static redirected(detail: any): Rejection;
  /** Returns a Rejection due to invalid transition */
  static invalid(detail: any): Rejection;
  /** Returns a Rejection due to ignored transition */
  static ignored(detail: any): Rejection;
  /** Returns a Rejection due to aborted transition */
  static aborted(detail: any): Rejection;
  /** Returns a Rejection due to aborted transition */
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
  constructor(type: any, message: any, detail: any);
  $id: number;
  type: any;
  message: any;
  detail: any;
  redirected: boolean;
  toString(): string;
  toPromise(): any;
}
