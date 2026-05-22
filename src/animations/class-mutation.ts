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

  setClass(
    element,
    tokenDifference(newClasses, oldClasses).join(" "),
    tokenDifference(oldClasses, newClasses).join(" "),
    getAnimate,
  );
}
