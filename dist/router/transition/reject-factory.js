import { stringify } from '../../shared/strings.js';
import { isInstanceOf, assign } from '../../shared/utils.js';

/**
 * Transition rejection categories used throughout the router pipeline.
 */
const RejectType = {
    _SUPERSEDED: 2,
    _ABORTED: 3,
    _INVALID: 4,
    _IGNORED: 5,
    _ERROR: 6,
};
let id = 0;
/**
 * Normalized representation of a transition failure, abort, ignore, or redirect.
 */
class Rejection {
    constructor(type, message, detail) {
        this.$id = id++;
        this.type = type;
        this.message = message;
        this.detail = detail;
        this.redirected = false;
    }
    static superseded(detail, options) {
        const rejection = new Rejection(RejectType._SUPERSEDED, "The transition has been superseded by a different transition", detail);
        if (options?.redirected) {
            rejection.redirected = true;
        }
        return rejection;
    }
    static redirected(detail) {
        return Rejection.superseded(detail, { redirected: true });
    }
    static invalid(detail) {
        return new Rejection(RejectType._INVALID, "This transition is invalid", detail);
    }
    static ignored(detail) {
        return new Rejection(RejectType._IGNORED, "The transition was ignored", detail);
    }
    static aborted(detail) {
        return new Rejection(RejectType._ABORTED, "The transition has been aborted", detail);
    }
    static errored(detail) {
        return new Rejection(RejectType._ERROR, "The transition errored", detail);
    }
    static normalize(detail) {
        return isInstanceOf(detail, Rejection) ? detail : Rejection.errored(detail);
    }
    toString() {
        const detailString = (data) => data &&
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
    _toPromise() {
        const promise = Promise.reject(this);
        promise.catch(() => 0);
        return assign(promise, {
            _transitionRejection: this,
        });
    }
}

export { RejectType, Rejection };
