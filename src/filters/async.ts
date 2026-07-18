import { _rootScope } from "../injection-tokens.ts";
import { isObject, isPromiseLike } from "../shared/utils.ts";

type AsyncFilterState =
  | {
      _status: "pending";
      _value: undefined;
    }
  | {
      _status: "settled";
      _value: unknown;
    };

const asyncFilterStates = new WeakMap<object, AsyncFilterState>();

asyncFilter.$inject = [_rootScope];

/** Creates a filter that unwraps promise-like values once they settle. */
export function asyncFilter($rootScope: ng.Scope) {
  return function asyncFilterFn(input: unknown): unknown {
    if (!isPromiseLike(input)) {
      return input;
    }

    if (!isObject(input) && typeof input !== "function") {
      return undefined;
    }

    const promise = input as PromiseLike<unknown> & object;

    const state = asyncFilterStates.get(promise);

    if (state?._status === "settled") {
      return state._value;
    }

    if (!state) {
      asyncFilterStates.set(promise, {
        _status: "pending",
        _value: undefined,
      });

      void Promise.resolve(input)
        .then((value) => {
          settleAsyncValue($rootScope, promise, value);

          return undefined;
        })
        .catch((reason: unknown) => {
          settleAsyncValue($rootScope, promise, reason);
        });
    }

    return undefined;
  };
}

function settleAsyncValue(
  $rootScope: ng.Scope,
  promise: object,
  value: unknown,
): void {
  asyncFilterStates.set(promise, {
    _status: "settled",
    _value: value,
  });

  const handler = $rootScope.$handler as {
    _scheduleWatchKeys: (watchKeys: string[]) => void;
  };

  handler._scheduleWatchKeys(["async"]);
}
