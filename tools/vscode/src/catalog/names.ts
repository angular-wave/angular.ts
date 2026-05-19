const PREFIX_REGEXP = /^(x[\:\-_]|data[\:\-_])/i;
const SPECIAL_CHARS_REGEXP = /[:\-_]+(.)/g;

export function directiveNormalize(name: string): string {
  return name
    .replace(PREFIX_REGEXP, "")
    .replace(SPECIAL_CHARS_REGEXP, (_match, letter: string, offset: number) =>
      offset ? letter.toUpperCase() : letter,
    );
}

export function camelToKebab(name: string): string {
  return name.replace(/[A-Z]/g, (letter, offset) =>
    `${offset ? "-" : ""}${letter.toLowerCase()}`,
  );
}

export function kebabToCamel(name: string): string {
  return directiveNormalize(name);
}

export function directiveHtmlName(name: string): string {
  return camelToKebab(directiveNormalize(name));
}

export function componentHtmlName(name: string): string {
  return camelToKebab(name);
}

export function directiveAliases(htmlName: string): string[] {
  return [htmlName, `data-${htmlName}`];
}

export function normalizeLookupName(name: string): string {
  return directiveNormalize(name.trim());
}
