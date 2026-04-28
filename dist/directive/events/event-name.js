/**
 * Selects the default DOM event for directive helpers that submit or react to
 * common form elements.
 */
function getEventNameForElement(element) {
    const tag = element.tagName.toLowerCase();
    if (["input", "textarea", "select"].includes(tag)) {
        return "change";
    }
    else if (tag === "form") {
        return "submit";
    }
    return "click";
}

export { getEventNameForElement };
