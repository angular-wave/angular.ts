import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const integrationRoot = resolve(dirname(__filename), "..", "..");
const cljsRoot = resolve(integrationRoot, "clojurescript");
const externsPath = resolve(integrationRoot, "externs/angular.js");
const outputPath = resolve(cljsRoot, "src/angular_ts/generated.cljs");
const checkMode = process.argv.includes("--check");
const expectedTypeTagCount = 160;
const expectedStrictWrapperNames = [
  "angular-call",
  "angular-dispatch-event",
  "angular-emit",
  "angular-get-injector",
  "angular-get-scope",
  "angular-register-ng-module",
  "ng-module-animation",
  "ng-module-component",
  "ng-module-config",
  "ng-module-controller",
  "ng-module-decorator",
  "ng-module-directive",
  "ng-module-factory",
  "ng-module-provider",
  "ng-module-run",
  "ng-module-service",
  "ng-module-state",
  "ng-module-topic",
  "ng-module-web-component",
  "pub-sub-service-dispose",
  "pub-sub-service-get-count",
  "pub-sub-service-is-disposed",
  "pub-sub-service-reset",
];

const source = readFileSync(externsPath, "utf8");

function assertExtern(pattern, description) {
  if (!pattern.test(source)) {
    throw new Error(`AngularTS Closure externs are missing ${description}.`);
  }
}

function collectExternTypes() {
  const names = new Set();
  const declarations = [
    /\bng\.([A-Za-z_$][\w$]*)\s*=\s*function\b/g,
    /\bng\.([A-Za-z_$][\w$]*)\s*;/g,
  ];

  for (const pattern of declarations) {
    let match;

    while ((match = pattern.exec(source)) !== null) {
      names.add(match[1]);
    }
  }

  return [...names].sort();
}

function cljsString(value) {
  return JSON.stringify(value);
}

function extractJsDocDescription(jsDoc) {
  return jsDoc
    .replace(/^\/\*\*|\*\/$/g, "")
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, "").trim())
    .filter((line) => line && !line.startsWith("@"))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function collectExternTypeDocs() {
  const docs = new Map();
  const declarations = [
    /(\/\*\*(?:(?!\/\*\*)[\s\S])*?\*\/)\s*ng\.([A-Za-z_$][\w$]*)\s*=\s*function\b/g,
    /(\/\*\*(?:(?!\/\*\*)[\s\S])*?\*\/)\s*ng\.([A-Za-z_$][\w$]*)\s*;/g,
  ];

  for (const pattern of declarations) {
    let match;

    while ((match = pattern.exec(source)) !== null) {
      const [, jsDoc, name] = match;
      const description = extractJsDocDescription(jsDoc);

      if (description) {
        docs.set(name, description);
      }
    }
  }

  return docs;
}

function toKebabCase(name) {
  return name
    .replace(/\$/g, "dollar")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();
}

function cleanClosureType(typeExpression) {
  return typeExpression
    .trim()
    .replace(/=$/, "")
    .replace(/^\?/, "")
    .replace(/^!/, "");
}

function closureTypeToCljsTag(typeExpression) {
  const type = cleanClosureType(typeExpression);

  if (
    !type ||
    type === "*" ||
    type === "?" ||
    type.includes("|") ||
    type.includes("function(")
  ) {
    return "";
  }

  const simpleType = type.replace(/<[\s\S]*$/, "");

  if (/^ng\.[A-Za-z_$][\w$]*$/.test(simpleType)) {
    return `js/${simpleType}`;
  }

  if (["Array", "Map", "Promise", "Set", "Object"].includes(simpleType)) {
    return `js/${simpleType}`;
  }

  if (
    [
      "AbortSignal",
      "Document",
      "Element",
      "Event",
      "EventTarget",
      "HTMLElement",
      "Node",
      "Window",
    ].includes(simpleType)
  ) {
    return `js/${simpleType}`;
  }

  if (["boolean", "number", "string"].includes(simpleType)) {
    return simpleType;
  }

  return "";
}

function parseJsDocParams(jsDoc) {
  const params = new Map();
  const paramPattern = /@param[ \t]*\{([^}]+)\}[ \t]+([A-Za-z_$][\w$]*)/g;
  let match;

  while ((match = paramPattern.exec(jsDoc)) !== null) {
    params.set(match[2], closureTypeToCljsTag(match[1]));
  }

  return params;
}

function parseJsDocParamDocs(jsDoc) {
  const params = [];
  const paramPattern =
    /@param[ \t]*\{([^}]+)\}[ \t]+([A-Za-z_$][\w$]*)(?:[ \t]+([^\n]+))?/g;
  let match;

  while ((match = paramPattern.exec(jsDoc)) !== null) {
    params.push({
      type: match[1].trim(),
      name: match[2],
      description: (match[3] || "").trim(),
    });
  }

  return params;
}

function parseJsDocReturnDoc(jsDoc) {
  const match = jsDoc.match(/@return[ \t]*\{([^}]+)\}(?:[ \t]+([^\n]+))?/);

  if (!match) return undefined;

  return {
    type: match[1].trim(),
    description: (match[2] || "").trim(),
  };
}

function parseJsDocReturn(jsDoc) {
  const match = jsDoc.match(/@return[ \t]*\{([^}]+)\}/);

  if (!match) return { tag: "", voidReturn: false };

  const type = cleanClosureType(match[1]);

  return {
    tag: closureTypeToCljsTag(match[1]),
    voidReturn: type === "void",
  };
}

function collectPrototypeMethods(ownerNames) {
  const methods = [];
  const ownerSet = new Set(ownerNames);
  const pattern =
    /(\/\*\*(?:(?!\/\*\*)[\s\S])*?\*\/)\s*ng\.([A-Za-z_$][\w$]*)\.prototype\.([A-Za-z_$][\w$]*)\s*=\s*function\(([^)]*)\)\s*\{\};/g;
  let match;

  while ((match = pattern.exec(source)) !== null) {
    const [, jsDoc, owner, method, rawParams] = match;

    if (!ownerSet.has(owner)) continue;

    const jsDocParams = parseJsDocParams(jsDoc);
    const hasVarArgs = rawParams
      .split(",")
      .map((param) => param.trim())
      .includes("var_args");
    const params = rawParams
      .split(",")
      .map((param) => param.trim())
      .filter(Boolean)
      .filter((param) => param !== "var_args")
      .map((param) => ({
        name: param,
        tag: jsDocParams.get(param) || "",
      }));
    const returnInfo = parseJsDocReturn(jsDoc);

    if (
      hasVarArgs ||
      params.some(({ tag }) => !tag) ||
      (!returnInfo.tag && !returnInfo.voidReturn)
    ) {
      continue;
    }

    methods.push({
      owner,
      method,
      description: extractJsDocDescription(jsDoc),
      paramDocs: parseJsDocParamDocs(jsDoc),
      returnDoc: parseJsDocReturnDoc(jsDoc),
      params,
      receiverTag: `js/ng.${owner}`,
      returnTag: returnInfo.tag,
      wrapperName: `${toKebabCase(owner)}-${toKebabCase(method)}`,
    });
  }

  return methods.sort((left, right) =>
    left.wrapperName.localeCompare(right.wrapperName),
  );
}

function sortedDifference(left, right) {
  const rightSet = new Set(right);

  return left.filter((value) => !rightSet.has(value)).sort();
}

function taggedArg(tag, name) {
  return tag ? `^${tag} ${name}` : name;
}

function renderPrototypeWrapper(method) {
  const args = [
    taggedArg(method.receiverTag, "target"),
    ...method.params.map(({ tag, name }) => taggedArg(tag, name)),
  ];
  const callArgs = method.params.map(({ name }) => name).join(" ");
  const returnTag = method.returnTag ? `^${method.returnTag} ` : "";
  let description =
    method.description ||
    `Typed wrapper for ng.${method.owner}.prototype.${method.method}.`;

  if (method.paramDocs.length > 0) {
    description += "\n\nParams:";
    for (const param of method.paramDocs) {
      description += `\n- ${param.name}: {${param.type}}`;
      if (param.description) description += ` ${param.description}`;
    }
  }

  if (method.returnDoc) {
    description += `\n\nReturns: {${method.returnDoc.type}}`;
    if (method.returnDoc.description) {
      description += ` ${method.returnDoc.description}`;
    }
  }

  return `(defn ${method.wrapperName}
  ${cljsString(description)}
  ${returnTag}[${args.join(" ")}]
  (.${method.method} target${callArgs ? ` ${callArgs}` : ""}))`;
}

for (const typeName of [
  "Angular",
  "Directive",
  "Injectable",
  "NgModule",
  "PubSubService",
]) {
  assertExtern(new RegExp(`\\bng\\.${typeName}\\b`), `ng.${typeName}`);
}

assertExtern(/\bangular\.module\s*=\s*function\b/, "angular.module");
assertExtern(
  /\bng\.NgModule\.prototype\.controller\s*=\s*function\b/,
  "ng.NgModule.prototype.controller",
);
assertExtern(
  /\bng\.NgModule\.prototype\.directive\s*=\s*function\b/,
  "ng.NgModule.prototype.directive",
);
assertExtern(
  /\bng\.PubSubService\.prototype\.publish\s*=\s*function\b/,
  "ng.PubSubService.prototype.publish",
);

const typeNames = collectExternTypes();
const typeDocs = collectExternTypeDocs();
const generatedMethods = collectPrototypeMethods([
  "Angular",
  "NgModule",
  "PubSubService",
]);
const generatedWrapperNames = generatedMethods.map(({ wrapperName }) => wrapperName);
const missingTypeDocs = typeNames.filter((name) => !typeDocs.has(name));
const missingExpectedWrappers = sortedDifference(
  expectedStrictWrapperNames,
  generatedWrapperNames,
);
const unexpectedWrappers = sortedDifference(
  generatedWrapperNames,
  expectedStrictWrapperNames,
);

if (typeNames.length !== expectedTypeTagCount) {
  console.error(
    `Expected ${expectedTypeTagCount} ClojureScript AngularTS type tags, ` +
      `found ${typeNames.length}.`,
  );
  console.error("Review the extern surface and update expectedTypeTagCount.");
  process.exit(1);
}

if (missingTypeDocs.length > 0) {
  console.error("Public AngularTS extern types missing preserved documentation:");
  missingTypeDocs.forEach((name) => console.error(`  - ${name}`));
  process.exit(1);
}

if (generatedMethods.some(({ description }) => !description)) {
  console.error("Generated strict wrappers must preserve extern descriptions.");
  process.exit(1);
}

const wrappersMissingParamDocs = generatedMethods.filter((method) => {
  const documented = new Set(method.paramDocs.map(({ name }) => name));

  return method.params.some(({ name }) => !documented.has(name));
});

if (wrappersMissingParamDocs.length > 0) {
  console.error("Generated strict wrappers missing preserved param docs:");
  wrappersMissingParamDocs.forEach(({ wrapperName }) =>
    console.error(`  - ${wrapperName}`),
  );
  process.exit(1);
}

const wrappersMissingReturnDocs = generatedMethods.filter(
  ({ returnDoc }) => !returnDoc,
);

if (wrappersMissingReturnDocs.length > 0) {
  console.error("Generated strict wrappers missing preserved return docs:");
  wrappersMissingReturnDocs.forEach(({ wrapperName }) =>
    console.error(`  - ${wrapperName}`),
  );
  process.exit(1);
}

if (missingExpectedWrappers.length > 0 || unexpectedWrappers.length > 0) {
  if (missingExpectedWrappers.length > 0) {
    console.error("Missing expected strict ClojureScript wrappers:");
    missingExpectedWrappers.forEach((name) => console.error(`  - ${name}`));
  }

  if (unexpectedWrappers.length > 0) {
    console.error("Unexpected strict ClojureScript wrappers:");
    unexpectedWrappers.forEach((name) => console.error(`  - ${name}`));
  }

  console.error(
    "Update expectedStrictWrapperNames after reviewing the extern signature change.",
  );
  process.exit(1);
}
const output = `;; Generated from ../externs/angular.js by scripts/generate-cljs-types.mjs.
;; Do not edit directly.
(ns angular-ts.generated)

(set! *warn-on-infer* true)

(def public-type-tags
  "AngularTS public Closure extern types available as ClojureScript tags."
  #{${typeNames.map((name) => `"js/ng.${name}"`).join("\n    ")}})

(comment
  (def public-type-docs
    "Source-only documentation preserved from AngularTS Closure externs, keyed by ClojureScript type tag."
    {${typeNames
    .filter((name) => typeDocs.has(name))
    .map((name) => `"js/ng.${name}" ${cljsString(typeDocs.get(name))}`)
    .join("\n     ")}}))

(def strict-wrapper-names
  "Extern methods with fully concrete ClojureScript wrapper signatures."
  #{${generatedWrapperNames.map((name) => `"${name}"`).join("\n    ")}})

(def angular
  "AngularTS global runtime, typed from the generated Closure externs."
  ^js/ng.Angular js/angular)

(defn injectable
  "Create an AngularTS array-annotated injectable."
  ^js/ng.Injectable [^js/Array deps factory]
  (let [annotated (.slice deps)]
    (.push annotated factory)
    annotated))

${generatedMethods.map(renderPrototypeWrapper).join("\n\n")}

(defn pub-sub-service-publish
  "Typed variadic wrapper for ng.PubSubService.prototype.publish."
  (^boolean [^js/ng.PubSubService event-bus ^string topic]
   (.publish event-bus topic))
  (^boolean [^js/ng.PubSubService event-bus ^string topic value]
   (.publish event-bus topic value))
  (^boolean [^js/ng.PubSubService event-bus ^string topic value extra]
   (.publish event-bus topic value extra)))

(defn module
  "Retrieve or create an AngularTS module."
  (^js/ng.NgModule [^string name]
   (.module angular name))
  (^js/ng.NgModule [^string name ^js/Array requires]
   (.module angular name requires)))

(defn controller
  "Strict convenience wrapper for ng.NgModule.prototype.controller."
  ^js/ng.NgModule [^js/ng.NgModule ng-module ^string name ^js/ng.Injectable ctl-fn]
  (ng-module-controller ng-module name ctl-fn))

(defn directive
  "Strict convenience wrapper for ng.NgModule.prototype.directive."
  ^js/ng.NgModule [^js/ng.NgModule ng-module ^string name ^js/ng.DirectiveFactory directive-factory]
  (ng-module-directive ng-module name directive-factory))

(defn publish
  "Strict convenience wrapper for ng.PubSubService.prototype.publish."
  (^boolean [^js/ng.PubSubService event-bus ^string topic]
   (pub-sub-service-publish event-bus topic))
  (^boolean [^js/ng.PubSubService event-bus ^string topic value]
   (pub-sub-service-publish event-bus topic value))
  (^boolean [^js/ng.PubSubService event-bus ^string topic value extra]
   (pub-sub-service-publish event-bus topic value extra)))
`;

if (checkMode) {
  const current = readFileSync(outputPath, "utf8");

  if (current !== output) {
    console.error(
      "ClojureScript generated AngularTS facade is out of date. Run:\n" +
        "  node integrations/closure/clojurescript/scripts/generate-cljs-types.mjs",
    );
    process.exit(1);
  }

  console.log(
    `Validated ${typeNames.length} ClojureScript AngularTS type tags and ` +
      `${generatedMethods.length} typed method wrappers.`,
  );
} else {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, output);
  console.log(
    `Generated ${outputPath} from ${typeNames.length} extern types and ` +
      `${generatedMethods.length} typed method wrappers.`,
  );
}
