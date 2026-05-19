import type { AngularTsCatalogEntry, BindingInfo } from "../catalog/types";
import { normalizeLookupName } from "../catalog/names";

export interface BindingOwner {
  entry: AngularTsCatalogEntry;
  bindings: BindingInfo[];
}

export function findBindingOwnersForTag(
  tagName: string,
  attributeNames: string[],
  entries: AngularTsCatalogEntry[],
): BindingOwner[] {
  const owners: BindingOwner[] = [];
  const normalizedTagName = normalizeLookupName(tagName);
  const normalizedAttrs = new Set(attributeNames.map(normalizeLookupName));

  for (const entry of entries) {
    if (!entry.bindings?.length) continue;

    const entryNames = lookupNames(entry);

    if (
      entry.kind === "component" &&
      entry.htmlName &&
      entryNames.has(normalizedTagName)
    ) {
      owners.push({ entry, bindings: entry.bindings });
      continue;
    }

    if (
      entry.kind === "directive" &&
      entry.allowedLocations?.includes("element") &&
      entry.htmlName &&
      entryNames.has(normalizedTagName)
    ) {
      owners.push({ entry, bindings: entry.bindings });
      continue;
    }

    if (
      entry.kind === "directive" &&
      entry.allowedLocations?.includes("attribute") &&
      Array.from(entryNames).some((name) => normalizedAttrs.has(name))
    ) {
      owners.push({ entry, bindings: entry.bindings });
    }
  }

  return owners;
}

export function findBindingForAttribute(
  tagName: string,
  attributeName: string,
  attributeNames: string[],
  entries: AngularTsCatalogEntry[],
): { owner: AngularTsCatalogEntry; binding: BindingInfo } | undefined {
  const normalizedAttributeName = normalizeLookupName(attributeName);
  const owners = findBindingOwnersForTag(tagName, attributeNames, entries);

  for (const owner of owners) {
    const binding = owner.bindings.find(
      (candidate) =>
        normalizeLookupName(candidate.name) === normalizedAttributeName,
    );
    if (binding) return { owner: owner.entry, binding };
  }

  return undefined;
}

function lookupNames(entry: AngularTsCatalogEntry): Set<string> {
  return new Set(
    [entry.name, entry.normalizedName, entry.htmlName, ...entry.aliases]
      .filter((value): value is string => Boolean(value))
      .map(normalizeLookupName),
  );
}
