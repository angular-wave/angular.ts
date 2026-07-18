import type {
  HookResult,
  InternalTransitionOptions,
  TransitionOptions,
} from "./interface.ts";

const publicOptions: TransitionOptions = {
  inherit: true,
  location: "replace",
  reload: false,
};

const internalOptions: InternalTransitionOptions = {
  ...publicOptions,
  source: "ng-state",
  current: () => null,
};

void internalOptions;

// @ts-expect-error public transition options do not expose internal source bookkeeping
const invalidSource: TransitionOptions = { source: "url" };

// @ts-expect-error public transition options do not expose active transition lookup
const invalidCurrent: TransitionOptions = { current: () => null };

// @ts-expect-error public transition options do not expose redirect bookkeeping
const invalidRedirect: TransitionOptions = { redirectedFrom: undefined };

// @ts-expect-error public transition options do not expose built reload state
const invalidReloadState: TransitionOptions = { reloadState: undefined };

const hookResume: HookResult = true;
const hookAbort: HookResult = false;
const hookAsyncResume: HookResult = Promise.resolve(undefined);

// @ts-expect-error hook results must be explicit transition decisions
const invalidHookResult: HookResult = "resume";

void invalidSource;
void invalidCurrent;
void invalidRedirect;
void invalidReloadState;
void hookResume;
void hookAbort;
void hookAsyncResume;
void invalidHookResult;
