export interface ExpressionSyntaxIssue {
  message: string;
  start: number;
  end: number;
}

const OPEN_TO_CLOSE: Record<string, string> = {
  "(": ")",
  "[": "]",
  "{": "}",
};

const CLOSE_TO_OPEN: Record<string, string> = {
  ")": "(",
  "]": "[",
  "}": "{",
};

export function findExpressionSyntaxIssue(
  expression: string,
): ExpressionSyntaxIssue | undefined {
  if (expression.trim() === "") {
    return {
      message: "Expression is empty.",
      start: 0,
      end: Math.max(1, expression.length),
    };
  }

  const stack: Array<{ char: string; index: number }> = [];
  let quote: string | undefined;
  let quoteStart = -1;
  let escaped = false;

  for (let index = 0; index < expression.length; index++) {
    const char = expression[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = undefined;
        quoteStart = -1;
      }
      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      quoteStart = index;
      continue;
    }

    if (OPEN_TO_CLOSE[char]) {
      stack.push({ char, index });
      continue;
    }

    const expectedOpen = CLOSE_TO_OPEN[char];
    if (!expectedOpen) continue;

    const open = stack.pop();
    if (!open) {
      return {
        message: `Unexpected closing '${char}'.`,
        start: index,
        end: index + 1,
      };
    }

    if (open.char !== expectedOpen) {
      return {
        message: `Expected '${OPEN_TO_CLOSE[open.char]}' before '${char}'.`,
        start: index,
        end: index + 1,
      };
    }
  }

  if (quote) {
    return {
      message: `Unclosed ${quote} string.`,
      start: quoteStart,
      end: quoteStart + 1,
    };
  }

  const open = stack.pop();
  if (open) {
    return {
      message: `Unclosed '${open.char}'.`,
      start: open.index,
      end: open.index + 1,
    };
  }

  return undefined;
}
