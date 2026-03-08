import type { TargetState } from "../state/target-state.ts";
import type { Transition } from "./transition.ts";
/**
 * Transition rejection categories used throughout the router pipeline.
 */
export declare const RejectType: {
  readonly _SUPERSEDED: 2;
  readonly _ABORTED: 3;
  readonly _INVALID: 4;
  readonly _IGNORED: 5;
  readonly _ERROR: 6;
};
export type RejectTypeValue = (typeof RejectType)[keyof typeof RejectType];
export type TransitionRejectionDetail =
  | Transition
  | TargetState
  | Error
  | string
  | unknown;
/**
 * Normalized representation of a transition failure, abort, ignore, or redirect.
 */
export declare class Rejection {
  $id: number;
  type: RejectTypeValue;
  message: string;
  detail: TransitionRejectionDetail;
  redirected: boolean;
  constructor(
    type: RejectTypeValue,
    message: string,
    detail?: TransitionRejectionDetail,
  );
  static superseded(
    detail?: TransitionRejectionDetail,
    options?: {
      redirected?: boolean;
    },
  ): Rejection;
  static redirected(detail?: TransitionRejectionDetail): Rejection;
  static invalid(detail: TransitionRejectionDetail): Rejection;
  static ignored(detail?: TransitionRejectionDetail): Rejection;
  static aborted(detail?: TransitionRejectionDetail): Rejection;
  static errored(detail?: TransitionRejectionDetail): Rejection;
  static normalize(detail: TransitionRejectionDetail): Rejection;
  toString(): string;
  /**
   * Returns a rejected promise tagged with this rejection instance.
   */
  toPromise(): Promise<any> & {
    _transitionRejection: Rejection;
  };
}
