export interface ExpressionIdentifier {
  name: string;
  start: number;
  end: number;
  path: string[];
}

const KEYWORDS = new Set([
  "as",
  "by",
  "false",
  "for",
  "in",
  "null",
  "this",
  "track",
  "true",
  "undefined",
]);

export function collectExpressionIdentifiers(
  expression: string,
  expressionStart = 0,
): ExpressionIdentifier[] {
  const identifiers: ExpressionIdentifier[] = [];
  let quote: string | undefined;
  let escaped = false;
  let index = 0;

  while (index < expression.length) {
    const char = expression[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = undefined;
      }
      index++;
      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      index++;
      continue;
    }

    const identifier = readIdentifierPath(expression, index);
    if (!identifier) {
      index++;
      continue;
    }

    if (!KEYWORDS.has(identifier.name)) {
      identifiers.push({
        name: identifier.name,
        path: identifier.path,
        start: expressionStart + identifier.start,
        end: expressionStart + identifier.end,
      });
    }

    index = identifier.end;
  }

  return identifiers;
}

export function expressionIdentifierAt(
  expression: string,
  offset: number,
  expressionStart = 0,
): ExpressionIdentifier | undefined {
  return collectExpressionIdentifiers(expression, expressionStart).find(
    (identifier) => identifier.start <= offset && offset <= identifier.end,
  );
}

function readIdentifierPath(
  expression: string,
  start: number,
): { name: string; path: string[]; start: number; end: number } | undefined {
  const first = readIdentifier(expression, start);
  if (!first) return undefined;

  const path = [first.name];
  let cursor = first.end;

  while (expression[cursor] === ".") {
    const next = readIdentifier(expression, cursor + 1);
    if (!next) break;
    path.push(next.name);
    cursor = next.end;
  }

  return {
    name: first.name,
    path,
    start: first.start,
    end: cursor,
  };
}

function readIdentifier(
  expression: string,
  start: number,
): { name: string; start: number; end: number } | undefined {
  const match = /^[$A-Za-z_][$\w]*/.exec(expression.slice(start));
  if (!match) return undefined;

  return {
    name: match[0],
    start,
    end: start + match[0].length,
  };
}
