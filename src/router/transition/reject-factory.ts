import { stringify } from "../../shared/strings.ts";
import { assign, isInstanceOf } from "../../shared/utils.ts";

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

export type TransitionRejectionDetail = unknown;

let id = 0;

function detailToString(data: TransitionRejectionDetail): string {
  if (typeof data === "string") {
    return data;
  }

  if (data && typeof data === "object" && "toString" in data) {
    const { toString } = data as { toString?: unknown };

    if (
      typeof toString === "function" &&
      toString !== Object.prototype.toString
    ) {
      return String(Reflect.apply(toString, data, []));
    }
  }

  return stringify(data);
}

/**
 * Normalized representation of a transition failure, abort, ignore, or redirect.
 */
export class Rejection extends Error {
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
    super(message);

    this.name = "Rejection";
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
    return `Transition Rejection($id: ${String(this.$id)} type: ${String(
      this.type,
    )}, message: ${this.message}, detail: ${detailToString(this.detail)})`;
  }

  /**
   * Returns a rejected promise tagged with this rejection instance.
   */
  /** @internal */
  _toPromise(): Promise<never> & { _transitionRejection: Rejection } {
    const promise = Promise.resolve().then<never>(() => {
      throw this;
    });

    promise.catch(() => 0);

    return assign(promise, {
      _transitionRejection: this,
    });
  }
}
