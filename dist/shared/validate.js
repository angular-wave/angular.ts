import { notNullOrUndefined, isArray, isDefined, isString, isInstanceOf, isNumber } from './utils.js';

const BADARG = "badarg";
const BADARGKEY = "badarg: key";
const BADARGVALUE = "badarg: value";
const reasons = new Map([
    [notNullOrUndefined, "required"],
    [isArray, "notarray"],
    [isDefined, "required"],
    [isString, "notstring"],
]);
function getReason(val, reason) {
    return reason ?? reasons.get(val) ?? "fail";
}
/**
 * Validate a value using a predicate function.
 * Throws if the predicate returns false.
 * IMPORTANT: use this function only for developer errors and not user/data errors.
 */
function validate(fn, arg, name, reason) {
    if (fn(arg)) {
        return arg;
    }
    let serialized;
    try {
        serialized = JSON.stringify(arg);
    }
    catch {
        serialized = String(arg);
    }
    throw new TypeError(`badarg:${getReason(fn, reason)} ${name}=${serialized}`);
}
function validateRequired(arg, name) {
    return validate(notNullOrUndefined, arg, name);
}
function validateArray(arg, name) {
    return validate(isArray, arg, name);
}
function validateIsString(arg, name) {
    return validate(isString, arg, name);
}
function validateIsNumber(arg, name) {
    return validate(isNumber, arg, name);
}
function validateInstanceOf(arg, type, name) {
    return validate((value) => isInstanceOf(value, type), arg, name);
}

export { BADARG, BADARGKEY, BADARGVALUE, validate, validateArray, validateInstanceOf, validateIsNumber, validateIsString, validateRequired };
