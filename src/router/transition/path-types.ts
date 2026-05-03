/** @internal */
export interface PathType {
  _name: keyof PathTypes;
  _stateHook: boolean;
}

/** @internal */
export interface PathTypes {
  [key: string]: PathType;

  to: PathType;
  from: PathType;
  exiting: PathType;
  retained: PathType;
  entering: PathType;
}

/** @internal */
export const PATH_TYPES: PathTypes = {
  to: { _name: "to", _stateHook: false },
  from: { _name: "from", _stateHook: false },
  exiting: { _name: "exiting", _stateHook: true },
  retained: { _name: "retained", _stateHook: true },
  entering: { _name: "entering", _stateHook: true },
};
