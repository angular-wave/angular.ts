import { isArray } from "../../shared/utils.ts";

/**
 * RFC 6570 Level 4 URI Template expander
 *
 * Supports operators: (none), +, #, ., /, ;, ?, &
 * Supports varspec modifiers: explode (*) and prefix (:len)
 *
 * Usage:
 *   expandUriTemplate("/users/{id}", { id: 10 }) === "/users/10"
 *   expandUriTemplate("/search{?q,lang}", { q: "a b", lang: "en" }) === "/search?q=a%20b&lang=en"
 *   expandUriTemplate("/repos/{owner}/{repo}/issues{?labels*}", { labels: ["bug","ui"] }) === "/repos/x/y/issues?labels=bug&labels=ui"
 *
 */
export function expandUriTemplate(
  template: string,
  vars: Record<string, any> = {},
): string {
  if (typeof template !== "string")
    throw new TypeError("template must be a string");

  return template.replace(/\{([^}]+)\}/g, (_match, expression: string) => {
    return expandExpression(expression, vars);
  });
}

/**
 * Helper: percent-encode a string. If allowReserved true, reserved chars are NOT encoded.
 */
export function pctEncode(str: string, allowReserved: boolean): string {
  // encodeURIComponent, then restore reserved if allowed
  const encoded = encodeURIComponent(String(str));

  if (allowReserved) {
    // Reserved characters per RFC 3986
    return encoded.replace(
      /(%3A|%2F|%3F|%23|%5B|%5D|%40|%21|%24|%26|%27|%28|%29|%2A|%2B|%2C|%3B|%3D)/gi,
      (char: string) => decodeURIComponent(char),
    );
  }

  return encoded;
}

/**
 * Parse and expand a single expression (content between { and }).
 */
export function expandExpression(
  expression: string,
  vars: Record<string, any>,
): string {
  // Operator if first char in operator set
  const operator = /^[+#./;?&]/.test(expression) ? expression[0] : "";

  const op = operator;

  const varlist = op ? expression.slice(1) : expression;

  // operator configuration (separator, prefix, named, ifEmpty, allowReserved)
  const OP: Record<
    string,
    {
      sep: string;
      prefix: string;
      named: boolean;
      ifEmpty: string;
      allowReserved: boolean;
    }
  > = {
    "": {
      sep: ",",
      prefix: "",
      named: false,
      ifEmpty: "",
      allowReserved: false,
    },
    "+": {
      sep: ",",
      prefix: "",
      named: false,
      ifEmpty: "",
      allowReserved: true,
    },
    "#": {
      sep: ",",
      prefix: "#",
      named: false,
      ifEmpty: "",
      allowReserved: true,
    },
    ".": {
      sep: ".",
      prefix: ".",
      named: false,
      ifEmpty: "",
      allowReserved: false,
    },
    "/": {
      sep: "/",
      prefix: "/",
      named: false,
      ifEmpty: "",
      allowReserved: false,
    },
    ";": {
      sep: ";",
      prefix: ";",
      named: true,
      ifEmpty: "",
      allowReserved: false,
    },
    "?": {
      sep: "&",
      prefix: "?",
      named: true,
      ifEmpty: "=",
      allowReserved: false,
    },
    "&": {
      sep: "&",
      prefix: "&",
      named: true,
      ifEmpty: "=",
      allowReserved: false,
    },
  };

  const conf = OP[op];

  if (!conf) throw new Error(`Unsupported operator: ${op}`);

  // split varspecs by comma, preserve whitespace trimmed
  const varspecs = varlist
    .split(",")
    .map((str: string) => str.trim())
    .filter(Boolean);

  const expandedParts: string[] = [];

  for (const spec of varspecs) {
    // parse varspec: name, explode (*), prefix (:len)
    const varspec = /^([A-Za-z0-9_.]+)(\*|(?::(\d+)))?$/.exec(spec);

    if (!varspec) throw new Error(`Invalid varspec: ${spec}`);
    const varname = varspec[1];

    const explode = varspec[2] === "*";

    const prefixLength = varspec[3] ? parseInt(varspec[3], 10) : undefined;

    const value = vars[varname];

    // undefined or null = skip (no expansion)
    if (value === undefined || value === null) {
      continue;
    }

    // PROCESS arrays
    if (isArray(value)) {
      if (value.length === 0) {
        // empty array: for named operators, emit key with empty ifEmpty, otherwise skip
        if (conf.named) {
          // emit key without value or with = depending on ifEmpty
          if (conf.ifEmpty === "=") {
            expandedParts.push(
              `${pctEncode(varname, conf.allowReserved)}${conf.ifEmpty}`,
            );
          } else {
            expandedParts.push(pctEncode(varname, conf.allowReserved));
          }
        }
        continue;
      }

      if (explode) {
        // each item becomes either 'k=v' (named) or 'v' (unnamed)
        for (const item of value) {
          if (item === null || item === undefined) continue;

          if (conf.named) {
            expandedParts.push(
              `${pctEncode(varname, conf.allowReserved)}=${pctEncode(String(item), conf.allowReserved)}`,
            );
          } else {
            expandedParts.push(pctEncode(String(item), conf.allowReserved));
          }
        }
      } else {
        // join by comma (or operator.sep?) — RFC: simple join with ','
        const joined = value
          .filter((val) => val !== null && val !== undefined)
          .map((val) => pctEncode(String(val), conf.allowReserved))
          .join(",");

        if (conf.named) {
          if (joined === "") {
            expandedParts.push(
              pctEncode(varname, conf.allowReserved) +
                (conf.ifEmpty === "=" ? conf.ifEmpty : ""),
            );
          } else {
            expandedParts.push(
              `${pctEncode(varname, conf.allowReserved)}=${joined}`,
            );
          }
        } else {
          expandedParts.push(joined);
        }
      }
      continue;
    }

    // PROCESS objects (associative arrays)
    if (typeof value === "object") {
      const objectValue = value as Record<string, any>;

      const keys = Object.keys(objectValue);

      if (keys.length === 0) {
        if (conf.named) {
          expandedParts.push(
            pctEncode(varname, conf.allowReserved) +
              (conf.ifEmpty === "=" ? conf.ifEmpty : ""),
          );
        }
        continue;
      }

      if (explode) {
        // each key/value pair becomes k=v (named) or k,v? For explode + named, RFC says 'k=v'
        for (const key of keys) {
          const encVal = objectValue[key];

          if (encVal === null || encVal === undefined) continue;

          if (conf.named) {
            expandedParts.push(
              `${pctEncode(key, conf.allowReserved)}=${pctEncode(encVal, conf.allowReserved)}`,
            );
          } else {
            // unnamed explode => k,encVal form pairs
            expandedParts.push(
              `${pctEncode(key, conf.allowReserved)}=${pctEncode(encVal, conf.allowReserved)}`,
            );
          }
        }
      } else {
        // not exploded: join k,v pairs by ','
        const pairs = keys
          .map(
            (key) =>
              `${pctEncode(key, conf.allowReserved)},${pctEncode(objectValue[key], conf.allowReserved)}`,
          )
          .join(",");

        if (conf.named) {
          if (pairs === "") {
            expandedParts.push(
              pctEncode(varname, conf.allowReserved) +
                (conf.ifEmpty === "=" ? conf.ifEmpty : ""),
            );
          } else {
            expandedParts.push(
              `${pctEncode(varname, conf.allowReserved)}=${pairs}`,
            );
          }
        } else {
          expandedParts.push(pairs);
        }
      }
      continue;
    }

    // PROCESS scalar (string/number/boolean)
    let str = String(value);

    // apply prefix modifier if present
    if (typeof prefixLength === "number") {
      str = str.substring(0, prefixLength);
    }

    // empty string handling
    if (str === "") {
      if (conf.named) {
        // for named operators, emit key or key= depending on ifEmpty
        if (conf.ifEmpty === "=") {
          expandedParts.push(
            `${pctEncode(varname, conf.allowReserved)}${conf.ifEmpty}`,
          );
        } else {
          expandedParts.push(pctEncode(varname, conf.allowReserved));
        }
      } else {
        // unnamed operators: empty string -> nothing (skip)
        if (op === "+" || op === "#") {
          // these allow empty expansions (produce nothing)
          expandedParts.push(pctEncode(str, conf.allowReserved));
        } else {
          // skip adding anything
          expandedParts.push(pctEncode(str, conf.allowReserved));
        }
      }
      continue;
    }

    // default scalar behavior
    if (conf.named) {
      expandedParts.push(
        `${pctEncode(varname, conf.allowReserved)}=${pctEncode(str, conf.allowReserved)}`,
      );
    } else {
      expandedParts.push(pctEncode(str, conf.allowReserved));
    }
  } // end for varspecs

  if (expandedParts.length === 0) return "";

  // join parts with operator separator; prefix if needed
  return conf.prefix + expandedParts.join(conf.sep);
}
