import { _rootScope } from '../injection-tokens.js';
import { isPromiseLike, isObject } from '../shared/utils.js';

const asyncFilterStates = new WeakMap();
asyncFilter.$inject = [_rootScope];
/** Creates a filter that unwraps promise-like values once they settle. */
function asyncFilter($rootScope) {
    return function asyncFilterFn(input) {
        if (!isPromiseLike(input)) {
            return input;
        }
        if (!isObject(input) && typeof input !== "function") {
            return undefined;
        }
        const promise = input;
        const state = asyncFilterStates.get(promise);
        if (state?._status === "settled") {
            return state._value;
        }
        if (!state) {
            asyncFilterStates.set(promise, {
                _status: "pending",
                _value: undefined,
            });
            Promise.resolve(input).then((value) => {
                settleAsyncValue($rootScope, promise, value);
            }, (reason) => {
                settleAsyncValue($rootScope, promise, reason);
            });
        }
        return undefined;
    };
}
function settleAsyncValue($rootScope, promise, value) {
    asyncFilterStates.set(promise, {
        _status: "settled",
        _value: value,
    });
    const handler = $rootScope.$handler;
    handler._scheduleWatchKeys(["async"]);
}

export { asyncFilter };
