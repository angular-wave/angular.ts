import { isObject } from '../../shared/utils.js';

/**
 * Possible values for `data-swap` and realtime protocol `swap` fields.
 */
const SwapMode = {
    /** (default) Replaces the contents inside the element */
    innerHTML: "innerHTML",
    /** Replaces the entire element, including the tag itself */
    outerHTML: "outerHTML",
    /** Inserts plain text (without parsing HTML) */
    textContent: "textContent",
    /** Inserts HTML immediately before the element itself */
    beforebegin: "beforebegin",
    /** Inserts HTML inside the element, before its first child */
    afterbegin: "afterbegin",
    /** Inserts HTML inside the element, after its last child */
    beforeend: "beforeend",
    /** Inserts HTML immediately after the element itself */
    afterend: "afterend",
    /** Removes the element entirely */
    delete: "delete",
    /** Performs no insertion (no-op) */
    none: "none",
};
function isRealtimeProtocolMessage(data) {
    return (isObject(data) && ("html" in data || "target" in data || "swap" in data));
}
function getRealtimeProtocolContent(data) {
    return "html" in data ? data.html : data.data;
}

export { SwapMode, getRealtimeProtocolContent, isRealtimeProtocolMessage };
