import { getDirectiveHostElement } from '../shared/dom.js';
import { getAnimateForNode } from './lazy-animate.js';

function tokenizeClassString(value) {
    const trimmed = value.trim();
    return trimmed ? trimmed.split(/\s+/) : [];
}
function tokenDifference(str1, str2) {
    if (str1 === str2) {
        return [];
    }
    const tokens1 = tokenizeClassString(str1);
    if (tokens1.length === 0) {
        return [];
    }
    const excludedTokens = new Set(tokenizeClassString(str2));
    const seenTokens = new Set();
    const difference = [];
    for (let i = 0; i < tokens1.length; i++) {
        const token = tokens1[i];
        if (!excludedTokens.has(token) && !seenTokens.has(token)) {
            seenTokens.add(token);
            difference.push(token);
        }
    }
    return difference;
}
function setClass(element, addClasses, removeClasses, getAnimate) {
    if (!addClasses && !removeClasses)
        return;
    const targetElement = getDirectiveHostElement(element);
    if (!targetElement)
        return;
    const animate = getAnimateForNode(getAnimate, targetElement);
    if (animate) {
        animate.setClass(targetElement, addClasses, removeClasses);
        return;
    }
    const toAdd = tokenizeClassString(addClasses);
    const toRemove = tokenizeClassString(removeClasses);
    if (toAdd.length) {
        targetElement.classList.add(...toAdd);
    }
    if (toRemove.length) {
        targetElement.classList.remove(...toRemove);
    }
}
function addClass(element, classValue, getAnimate) {
    if (!classValue)
        return;
    const targetElement = getDirectiveHostElement(element);
    if (!targetElement)
        return;
    const animate = getAnimateForNode(getAnimate, targetElement);
    if (animate) {
        animate.addClass(targetElement, classValue);
        return;
    }
    const tokens = tokenizeClassString(classValue);
    if (tokens.length) {
        targetElement.classList.add(...tokens);
    }
}
function removeClass(element, classValue, getAnimate) {
    if (!classValue)
        return;
    const targetElement = getDirectiveHostElement(element);
    if (!targetElement)
        return;
    const animate = getAnimateForNode(getAnimate, targetElement);
    if (animate) {
        animate.removeClass(targetElement, classValue);
        return;
    }
    const tokens = tokenizeClassString(classValue);
    if (tokens.length) {
        targetElement.classList.remove(...tokens);
    }
}
function updateClass(element, newClasses, oldClasses, getAnimate) {
    if (newClasses === oldClasses)
        return;
    const newTokens = tokenizeClassString(newClasses);
    const oldTokens = tokenizeClassString(oldClasses);
    let toAdd;
    let toRemove;
    if (oldTokens.length === 0) {
        toAdd = newTokens;
        toRemove = [];
    }
    else if (newTokens.length === 0) {
        toAdd = [];
        toRemove = oldTokens;
    }
    else {
        const newTokenSet = new Set(newTokens);
        const oldTokenSet = new Set(oldTokens);
        toAdd = [];
        toRemove = [];
        for (const token of newTokenSet) {
            if (!oldTokenSet.has(token))
                toAdd.push(token);
        }
        for (const token of oldTokenSet) {
            if (!newTokenSet.has(token))
                toRemove.push(token);
        }
    }
    if (toAdd.length === 0 && toRemove.length === 0)
        return;
    const targetElement = getDirectiveHostElement(element);
    if (!targetElement)
        return;
    const animate = getAnimateForNode(getAnimate, targetElement);
    if (animate) {
        animate.setClass(targetElement, toAdd.join(" "), toRemove.join(" "));
        return;
    }
    if (toAdd.length)
        targetElement.classList.add(...toAdd);
    if (toRemove.length)
        targetElement.classList.remove(...toRemove);
}

export { addClass, removeClass, setClass, tokenDifference, tokenizeClassString, updateClass };
