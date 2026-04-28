import { stringify } from "../../shared/strings.ts";
import { assign, isInstanceOf } from "../../shared/utils.ts";
import type { TargetState } from "../state/target-state.ts";
import type { Transition } from "./transition.ts";

/**
 * Transition rejection categories used throughout the router pipeline.
 */
export const RejectType = {
  _SUPERSEDED: 2,
  _ABORTED: 3,
  _INVALID: 4,
  _IGNORED: 5,
  _ERROR: 6,
} as const;

export type RejectTypeValue = (typeof RejectType)[keyof typeof RejectType];

export type TransitionRejectionDetail =
  | Transition
  | TargetState
  | Error
  | string
  | unknown;

let id = 0;

/**
 * Normalized representation of a transition failure, abort, ignore, or redirect.
 */
export class Rejection {
  $id: number;
  type: RejectTypeValue;
  message: string;
  detail: TransitionRejectionDetail;
  redirected: boolean;

  constructor(
    type: RejectTypeValue,
    message: string,
    detail?: TransitionRejectionDetail,
  ) {
    this.$id = id++;
    this.type = type;
    this.message = message;
    this.detail = detail;
    this.redirected = false;
  }

  static superseded(
    detail?: TransitionRejectionDetail,
    options?: { redirected?: boolean },
  ): Rejection {
    const rejection = new Rejection(
      RejectType._SUPERSEDED,
      "The transition has been superseded by a different transition",
      detail,
    );

    if (options?.redirected) {
      rejection.redirected = true;
    }

    return rejection;
  }

  static redirected(detail?: TransitionRejectionDetail): Rejection {
    return Rejection.superseded(detail, { redirected: true });
  }

  static invalid(detail: TransitionRejectionDetail): Rejection {
    return new Rejection(
      RejectType._INVALID,
      "This transition is invalid",
      detail,
    );
  }

  static ignored(detail?: TransitionRejectionDetail): Rejection {
    return new Rejection(
      RejectType._IGNORED,
      "The transition was ignored",
      detail,
    );
  }

  static aborted(detail?: TransitionRejectionDetail): Rejection {
    return new Rejection(
      RejectType._ABORTED,
      "The transition has been aborted",
      detail,
    );
  }

  static errored(detail?: TransitionRejectionDetail): Rejection {
    return new Rejection(RejectType._ERROR, "The transition errored", detail);
  }

  static normalize(detail: TransitionRejectionDetail): Rejection {
    return isInstanceOf(detail, Rejection) ? detail : Rejection.errored(detail);
  }

  toString(): string {
    const detailString = (data: TransitionRejectionDetail): string =>
      data &&
      typeof data === "object" &&
      "toString" in data &&
      data.toString !== Object.prototype.toString
        ? String(data.toString())
        : stringify(data);

    return `Transition Rejection($id: ${this.$id} type: ${this.type}, message: ${this.message}, detail: ${detailString(this.detail)})`;
  }

  /**
   * Returns a rejected promise tagged with this rejection instance.
   */
  /** @internal */
  _toPromise(): Promise<any> & { _transitionRejection: Rejection } {
    const promise = Promise.reject(this);

    promise.catch(() => 0);

    return assign(promise, {
      _transitionRejection: this,
    });
  }
}
