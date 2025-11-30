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
 * @param {string} template
 * @param {Object<string, any>} vars
 * @returns {string}
 */
export function expandUriTemplate(template, vars = {}) {
  if (typeof template !== "string")
    throw new TypeError("template must be a string");

  return template.replace(/\{([^}]+)\}/g, (match, expression) => {
    return expandExpression(expression, vars);
  });
}

/**
 * Helper: percent-encode a string. If allowReserved true, reserved chars are NOT encoded.
 * @param {string} str
 * @param {boolean} allowReserved
 * @returns {string}
 */
export function pctEncode(str, allowReserved) {
  // encodeURIComponent, then restore reserved if allowed
  const encoded = encodeURIComponent(String(str));
  if (allowReserved) {
    // Reserved characters per RFC 3986
    return encoded.replace(
      /(%3A|%2F|%3F|%23|%5B|%5D|%40|%21|%24|%26|%27|%28|%29|%2A|%2B|%2C|%3B|%3D)/gi,
      (m) => decodeURIComponent(m),
    );
  }
  return encoded;
}

/**
 * Parse and expand a single expression (content between { and }).
 * @param {string} expression
 * @param {Object<string, any>} vars
 * @returns {string}
 */
export function expandExpression(expression, vars) {
  // Operator if first char in operator set
  const operator = /^[+#./;?&]/.test(expression) ? expression[0] : "";
  const op = operator;
  const varlist = op ? expression.slice(1) : expression;

  // operator configuration (separator, prefix, named, ifEmpty, allowReserved)
  const OP = {
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
  if (!conf) throw new Error("Unsupported operator: " + op);

  // split varspecs by comma, preserve whitespace trimmed
  const varspecs = varlist
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const expandedParts = [];

  for (const spec of varspecs) {
    // parse varspec: name, explode (*), prefix (:len)
    const m = /^([A-Za-z0-9_.]+)(\*|(?::(\d+)))?$/.exec(spec);
    if (!m) throw new Error("Invalid varspec: " + spec);
    const varname = m[1];
    const explode = m[2] === "*";
    const prefixLength = m[3] ? parseInt(m[3], 10) : undefined;

    const value = vars[varname];

    // undefined or null = skip (no expansion)
    if (value === undefined || value === null) {
      continue;
    }

    // PROCESS arrays
    if (Array.isArray(value)) {
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
              `${pctEncode(varname, conf.allowReserved)}=${pctEncode(item, conf.allowReserved)}`,
            );
          } else {
            expandedParts.push(pctEncode(item, conf.allowReserved));
          }
        }
      } else {
        // join by comma (or operator.sep?) — RFC: simple join with ','
        const joined = value
          .filter((v) => v !== null && v !== undefined)
          .map((v) => pctEncode(v, conf.allowReserved))
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
      const keys = Object.keys(value);
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
        for (const k of keys) {
          const v = value[k];
          if (v === null || v === undefined) continue;
          if (conf.named) {
            expandedParts.push(
              `${pctEncode(k, conf.allowReserved)}=${pctEncode(v, conf.allowReserved)}`,
            );
          } else {
            // unnamed explode => k,v form pairs
            expandedParts.push(
              `${pctEncode(k, conf.allowReserved)}=${pctEncode(v, conf.allowReserved)}`,
            );
          }
        }
      } else {
        // not exploded: join k,v pairs by ','
        const pairs = keys
          .map(
            (k) =>
              `${pctEncode(k, conf.allowReserved)},${pctEncode(value[k], conf.allowReserved)}`,
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
