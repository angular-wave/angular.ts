export interface AngularTsFilterPipe {
  name: string;
  start: number;
  end: number;
}

export function scanAngularTsFilterPipes(
  expression: string,
  expressionStart = 0,
): AngularTsFilterPipe[] {
  const filters: AngularTsFilterPipe[] = [];
  let quote: string | undefined;
  let escaped = false;
  let depth = 0;

  for (let index = 0; index < expression.length; index++) {
    const char = expression[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = undefined;
      }
      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      continue;
    }

    if (char === "(" || char === "[" || char === "{") {
      depth++;
      continue;
    }

    if (char === ")" || char === "]" || char === "}") {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (
      char !== "|" ||
      depth > 0 ||
      expression[index + 1] === "|" ||
      expression[index - 1] === "|"
    ) {
      continue;
    }

    const name = readFilterName(expression, index + 1);
    if (name) filters.push({
      name: name.name,
      start: expressionStart + name.start,
      end: expressionStart + name.end,
    });
  }

  return filters;
}

function readFilterName(
  expression: string,
  offset: number,
): { name: string; start: number; end: number } | undefined {
  let start = offset;
  while (/\s/.test(expression[start] ?? "")) start++;

  const match = /^[A-Za-z_$][\w$]*/.exec(expression.slice(start));
  if (!match) return undefined;

  return {
    name: match[0],
    start,
    end: start + match[0].length,
  };
}
