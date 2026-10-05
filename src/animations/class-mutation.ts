import { getDirectiveHostElement } from "../shared/dom.ts";
import { getAnimateForNode, type LazyAnimate } from "./lazy-animate.ts";

export function tokenizeClassString(value: string): string[] {
  const trimmed = value.trim();

  return trimmed ? trimmed.split(/\s+/) : [];
}

export function tokenDifference(str1: string, str2: string): string[] {
  if (str1 === str2) {
    return [];
  }

  const tokens1 = tokenizeClassString(str1);

  if (tokens1.length === 0) {
    return [];
  }

  const excludedTokens = new Set(tokenizeClassString(str2));

  const seenTokens = new Set<string>();

  const difference: string[] = [];

  for (let i = 0; i < tokens1.length; i++) {
    const token = tokens1[i];

    if (!excludedTokens.has(token) && !seenTokens.has(token)) {
      seenTokens.add(token);
      difference.push(token);
    }
  }

  return difference;
}

export function setClass(
  element: Element | Node | null | undefined,
  addClasses: string,
  removeClasses: string,
  getAnimate: LazyAnimate,
): void {
  if (!addClasses && !removeClasses) return;

  const targetElement = getDirectiveHostElement(element);

  if (!targetElement) return;

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

export function addClass(
  element: Element | Node | null | undefined,
  classValue: string,
  getAnimate: LazyAnimate,
): void {
  if (!classValue) return;

  const targetElement = getDirectiveHostElement(element);

  if (!targetElement) return;

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

export function removeClass(
  element: Element | Node | null | undefined,
  classValue: string,
  getAnimate: LazyAnimate,
): void {
  if (!classValue) return;

  const targetElement = getDirectiveHostElement(element);

  if (!targetElement) return;

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

export function updateClass(
  element: Element | Node | null | undefined,
  newClasses: string,
  oldClasses: string,
  getAnimate: LazyAnimate,
): void {
  if (newClasses === oldClasses) return;

  const newTokens = tokenizeClassString(newClasses);
  const oldTokens = tokenizeClassString(oldClasses);
  let toAdd: string[];
  let toRemove: string[];

  if (oldTokens.length === 0) {
    toAdd = newTokens;
    toRemove = [];
  } else if (newTokens.length === 0) {
    toAdd = [];
    toRemove = oldTokens;
  } else {
    const newTokenSet = new Set(newTokens);
    const oldTokenSet = new Set(oldTokens);

    toAdd = [];
    toRemove = [];

    for (const token of newTokenSet) {
      if (!oldTokenSet.has(token)) toAdd.push(token);
    }

    for (const token of oldTokenSet) {
      if (!newTokenSet.has(token)) toRemove.push(token);
    }
  }

  if (toAdd.length === 0 && toRemove.length === 0) return;

  const targetElement = getDirectiveHostElement(element);

  if (!targetElement) return;

  const animate = getAnimateForNode(getAnimate, targetElement);

  if (animate) {
    animate.setClass(targetElement, toAdd.join(" "), toRemove.join(" "));
    return;
  }

  if (toAdd.length) targetElement.classList.add(...toAdd);
  if (toRemove.length) targetElement.classList.remove(...toRemove);
}
