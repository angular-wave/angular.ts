/** @internal */
const PATH_TYPES = {
    to: { _name: "to", _stateHook: false },
    from: { _name: "from", _stateHook: false },
    exiting: { _name: "exiting", _stateHook: true },
    retained: { _name: "retained", _stateHook: true },
    entering: { _name: "entering", _stateHook: true },
};

export { PATH_TYPES };
