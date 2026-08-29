import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const integrationRoot = resolve(dirname(__filename), "..", "..");
const cljsRoot = resolve(integrationRoot, "clojurescript");
const externsPath = resolve(integrationRoot, "externs/angular.js");
const coreFacadePath = resolve(cljsRoot, "src/angular_ts/core.cljs");
const cljsPackagePath = resolve(cljsRoot, "package.json");
const rootPackagePath = resolve(cljsRoot, "..", "..", "..", "package.json");
const outputPath = resolve(cljsRoot, "src/angular_ts/generated.cljs");
const checkMode = process.argv.includes("--check");
const expectedTypeTagCount = 226;
const expectedStrictWrapperCount = 225;
const expectedStrictPropertyReaderCount = 449;
const strictWrapperParamTagOverrides = new Map([
  ["NgModule.machine.config", "js/Object"],
  ["NgModule.workflow.config", "js/Object"],
  ["NgModule.wasm.imports", "js/Object"],
  ["NgModule.wasm.opts", "js/Object"],
  ["NgModule.sse.config", "js/Object"],
  ["NgModule.websocket.protocols", "js/Object"],
  ["NgModule.websocket.config", "js/Object"],
  ["NgModule.webTransport.config", "js/Object"],
  ["Machine.restore.snapshot", "js/Object"],
  ["WasmResource.bind.target", "js/ng.Scope"],
]);
const strictPropertyTagOverrides = new Map([
  ["WasmBinding.target", "js/ng.Scope"],
]);

const source = readFileSync(externsPath, "utf8");
const coreFacadeSource = readFileSync(coreFacadePath, "utf8");

function validateShadowCljsVersion() {
  const cljsPackage = JSON.parse(readFileSync(cljsPackagePath, "utf8"));
  const rootPackage = JSON.parse(readFileSync(rootPackagePath, "utf8"));
  const localVersion = cljsPackage.devDependencies?.["shadow-cljs"];
  const rootVersion = rootPackage.devDependencies?.["shadow-cljs"];

  if (!localVersion || localVersion !== rootVersion) {
    throw new Error(
      "The ClojureScript Shadow CLJS declaration must match the root dev dependency.",
    );
  }
}

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
    .replace(/^\$/, "")
    .replace(/\$/g, "-")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();
}

function prototypeWrapperName(owner, member) {
  return `${toKebabCase(owner)}-${toKebabCase(member)}`;
}

function collectNgModuleMethods() {
  return new Set(
    [...source.matchAll(/^ng\.NgModule\.prototype\.([A-Za-z_$][\w$]*)\s*=\s*function/gm)]
      .map(([, name]) => toKebabCase(name)),
  );
}

function collectCoreFacadeFunctions() {
  const matches = [
    ...coreFacadeSource.matchAll(/^\(defn\s+([^\s\[]+)/gm),
  ];
  const functions = new Map();

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const next = matches[index + 1];
    const block = coreFacadeSource.slice(
      match.index,
      next?.index ?? coreFacadeSource.length,
    );

    functions.set(match[1], block);
  }

  return functions;
}

function validateCoreFacade() {
  const ngModuleMethods = collectNgModuleMethods();
  const facadeFunctions = collectCoreFacadeFunctions();
  const facadeHelpers = new Set(["injectable", "module", "publish"]);
  const missing = [...ngModuleMethods]
    .filter((name) => !facadeFunctions.has(name))
    .sort();
  const stale = [...facadeFunctions.keys()]
    .filter((name) => !ngModuleMethods.has(name) && !facadeHelpers.has(name))
    .sort();
  const undocumented = [...facadeFunctions]
    .filter(([, block]) => !/^\(defn\s+[^\s\[]+\s+"[^"]+"/s.test(block))
    .map(([name]) => name)
    .sort();
  const untyped = [...facadeFunctions]
    .filter(
      ([, block]) =>
        !/^\(defn\s+[^\s\[]+\s+"[^"]+"\s+(?:\^[^\s]+\s+\[|\(\^[^\s]+\s+\[)/s.test(
          block,
        ),
    )
    .map(([name]) => name)
    .sort();

  if (!/^\(def\s+\^js\/ng\.Angular\s+angular\s+"[^"]+"/m.test(coreFacadeSource)) {
    throw new Error("angular-ts.core/angular must retain its ng.Angular tag and documentation.");
  }

  if (missing.length || stale.length || undocumented.length || untyped.length) {
    const failures = [
      missing.length && `Missing fluent NgModule wrappers: ${missing.join(", ")}`,
      stale.length && `Stale fluent NgModule wrappers: ${stale.join(", ")}`,
      undocumented.length && `Undocumented fluent facade functions: ${undocumented.join(", ")}`,
      untyped.length && `Untyped fluent facade functions: ${untyped.join(", ")}`,
    ].filter(Boolean);

    throw new Error(failures.join("\n"));
  }

  return {
    functionCount: facadeFunctions.size,
    ngModuleMethodCount: ngModuleMethods.size,
  };
}

function stripOuterParens(value) {
  let type = value.trim();

  while (type.startsWith("(") && type.endsWith(")")) {
    let depth = 0;
    let wrapsWholeExpression = true;

    for (let i = 0; i < type.length; i++) {
      const char = type[i];

      if (char === "(") {
        depth++;
      } else if (char === ")") {
        depth--;
      }

      if (depth === 0 && i < type.length - 1) {
        wrapsWholeExpression = false;
        break;
      }
    }

    if (!wrapsWholeExpression) break;

    type = type.slice(1, -1).trim();
  }

  return type;
}

function cleanClosureType(typeExpression) {
  return stripOuterParens(typeExpression)
    .replace(/=$/, "")
    .replace(/^\?/, "")
    .replace(/^!/, "")
    .trim();
}

function splitTopLevelUnion(typeExpression) {
  const type = stripOuterParens(typeExpression);
  const parts = [];
  let angleDepth = 0;
  let parenDepth = 0;
  let start = 0;

  for (let i = 0; i < type.length; i++) {
    const char = type[i];

    if (char === "<") {
      angleDepth++;
    } else if (char === ">") {
      angleDepth--;
    } else if (char === "(") {
      parenDepth++;
    } else if (char === ")") {
      parenDepth--;
    } else if (char === "|" && angleDepth === 0 && parenDepth === 0) {
      parts.push(type.slice(start, i).trim());
      start = i + 1;
    }
  }

  parts.push(type.slice(start).trim());

  return parts;
}

function closureTypeToCljsTag(typeExpression) {
  const type = cleanClosureType(typeExpression);

  if (
    !type ||
    type === "*" ||
    type === "?"
  ) {
    return "";
  }

  const unionParts = splitTopLevelUnion(type);

  if (unionParts.length > 1) {
    const meaningfulTypes = unionParts
      .map(cleanClosureType)
      .filter((part) => !["null", "undefined", "void"].includes(part));
    const tags = [
      ...new Set(meaningfulTypes.map(closureTypeToCljsTag).filter(Boolean)),
    ];

    return tags.length === 1 && tags.length === meaningfulTypes.length
      ? tags[0]
      : "";
  }

  if (type.startsWith("function(")) {
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

function strictWrapperParamTag(owner, method, param, tag) {
  return (
    tag ||
    strictWrapperParamTagOverrides.get(`${owner}.${method}.${param}`) ||
    ""
  );
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

function parseJsDocType(jsDoc) {
  const match = jsDoc.match(/@type[ \t]*\{([^}]+)\}/);

  if (!match) return undefined;

  return match[1].trim();
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
        tag: strictWrapperParamTag(owner, method, param, jsDocParams.get(param)),
      }));
    const returnInfo = parseJsDocReturn(jsDoc);

    if (params.some(({ tag }) => !tag) || (!returnInfo.tag && !returnInfo.voidReturn)) {
      continue;
    }

    methods.push({
      owner,
      method,
      description: extractJsDocDescription(jsDoc),
      paramDocs: parseJsDocParamDocs(jsDoc),
      returnDoc: parseJsDocReturnDoc(jsDoc),
      params,
      hasVarArgs,
      receiverTag: `js/ng.${owner}`,
      returnTag: returnInfo.tag,
      wrapperName: prototypeWrapperName(owner, method),
    });
  }

  return methods.sort((left, right) =>
    left.wrapperName.localeCompare(right.wrapperName),
  );
}

function collectPrototypeProperties(ownerNames) {
  const properties = [];
  const ownerSet = new Set(ownerNames);
  const pattern =
    /(\/\*\*(?:(?!\/\*\*)[\s\S])*?\*\/)\s*ng\.([A-Za-z_$][\w$]*)\.prototype\.([A-Za-z_$][\w$]*)\s*;/g;
  let match;

  while ((match = pattern.exec(source)) !== null) {
    const [, jsDoc, owner, property] = match;

    if (!ownerSet.has(owner)) continue;

    const typeExpression = parseJsDocType(jsDoc);

    if (!typeExpression) continue;

    const propertyTag =
      closureTypeToCljsTag(typeExpression) ||
      strictPropertyTagOverrides.get(`${owner}.${property}`);

    if (!propertyTag) continue;

    properties.push({
      owner,
      property,
      description: extractJsDocDescription(jsDoc),
      receiverTag: `js/ng.${owner}`,
      propertyTag,
      typeExpression,
      readerName: prototypeWrapperName(owner, property),
    });
  }

  return properties.sort((left, right) =>
    left.readerName.localeCompare(right.readerName),
  );
}

function taggedArg(tag, name) {
  return tag ? `^${tag} ${name}` : name;
}

function renderPrototypeWrapper(method) {
  const receiver = uniqueName(
    "target",
    new Set(method.params.map(({ name }) => name)),
  );
  const args = [
    taggedArg(method.receiverTag, receiver),
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

  if (method.hasVarArgs) {
    const extraArgs = ["value", "extra", "more"];
    const arities = [];

    for (let i = 0; i <= extraArgs.length; i++) {
      const currentExtraArgs = extraArgs.slice(0, i);
      const arityArgs = [...args, ...currentExtraArgs];
      const arityCallArgs = [
        ...method.params.map(({ name }) => name),
        ...currentExtraArgs,
      ].join(" ");

      arities.push(`  (${returnTag}[${arityArgs.join(" ")}]
   (.${method.method} ${receiver}${arityCallArgs ? ` ${arityCallArgs}` : ""}))`);
    }

    return `(defn ${method.wrapperName}
  ${cljsString(description)}
${arities.join("\n")})`;
  }

  return `(defn ${method.wrapperName}
  ${cljsString(description)}
  ${returnTag}[${args.join(" ")}]
  (.${method.method} ${receiver}${callArgs ? ` ${callArgs}` : ""}))`;
}

function uniqueName(preferred, reserved) {
  let candidate = preferred;
  while (reserved.has(candidate)) candidate = `_${candidate}`;
  return candidate;
}

function renderPrototypePropertyReader(property) {
  let description =
    property.description ||
    `Typed reader for ng.${property.owner}.prototype.${property.property}.`;

  description += `\n\nType: {${property.typeExpression}}`;

  return `(defn ${property.readerName}
  ${cljsString(description)}
  ^${property.propertyTag} [^${property.receiverTag} target]
  (.-${property.property} target))`;
}

for (const typeName of [
  "Angular",
  "Directive",
  "EventBusService",
  "Injectable",
  "NgModule",
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
  /\bng\.EventBusService\.prototype\.publish\s*=\s*function\b/,
  "ng.EventBusService.prototype.publish",
);

const typeNames = collectExternTypes();
validateShadowCljsVersion();
const coreFacade = validateCoreFacade();
const typeDocs = collectExternTypeDocs();
const generatedMethods = collectPrototypeMethods(typeNames);
const generatedProperties = collectPrototypeProperties(typeNames);
const generatedWrapperNames = generatedMethods.map(({ wrapperName }) => wrapperName);
const generatedPropertyReaderNames = generatedProperties.map(
  ({ readerName }) => readerName,
);
const generatedFacadeNames = [
  ...generatedWrapperNames,
  ...generatedPropertyReaderNames,
];
const missingTypeDocs = typeNames.filter((name) => !typeDocs.has(name));

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

if (generatedFacadeNames.some((name) => name.includes("dollar"))) {
  console.error("Generated ClojureScript facade names must not encode `$` as `dollar`.");
  process.exit(1);
}

const duplicateFacadeNames = generatedFacadeNames.filter(
  (name, index) => generatedFacadeNames.indexOf(name) !== index,
);

if (duplicateFacadeNames.length > 0) {
  console.error(
    `Generated ClojureScript facade names must be unique: ${[
      ...new Set(duplicateFacadeNames),
    ].join(", ")}`,
  );
  process.exit(1);
}

const wrappersMissingParamDocs = generatedMethods.filter((method) => {
  const documented = new Set(
    method.paramDocs
      .filter(({ description }) => description.length > 0)
      .map(({ name }) => name),
  );

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

if (generatedWrapperNames.length !== expectedStrictWrapperCount) {
  console.error(
    `Expected ${expectedStrictWrapperCount} strict ClojureScript wrappers, ` +
      `found ${generatedWrapperNames.length}.`,
  );
  console.error(
    "Review the generated wrapper set and update expectedStrictWrapperCount.",
  );
  process.exit(1);
}

if (generatedPropertyReaderNames.length !== expectedStrictPropertyReaderCount) {
  console.error(
    `Expected ${expectedStrictPropertyReaderCount} strict ClojureScript ` +
      `property readers, found ${generatedPropertyReaderNames.length}.`,
  );
  console.error(
    "Review the generated property reader set and update expectedStrictPropertyReaderCount.",
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

(def strict-property-reader-names
  "Extern properties with fully concrete ClojureScript reader signatures."
  #{${generatedPropertyReaderNames.map((name) => `"${name}"`).join("\n    ")}})

(def angular
  "AngularTS global runtime, typed from the generated Closure externs."
  ^js/ng.Angular js/angular)

(defn injectable
  "Create an AngularTS array-annotated injectable from a ClojureScript collection."
  ^js/ng.Injectable [deps factory]
  (let [annotated (to-array deps)]
    (.push annotated factory)
    annotated))

${generatedMethods.map(renderPrototypeWrapper).join("\n\n")}

${generatedProperties.map(renderPrototypePropertyReader).join("\n\n")}

(defn module
  "Retrieve or create an AngularTS module."
  (^js/ng.NgModule [^string name]
   (.module angular name))
  (^js/ng.NgModule [^string name requires]
   (.module angular name (to-array requires))))

(defn controller
  "Register an annotated controller or annotate a controller factory from a ClojureScript dependency collection."
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name ^js/ng.Injectable controller-factory]
   (ng-module-controller ng-module name controller-factory))
  (^js/ng.NgModule [^js/ng.NgModule ng-module ^string name deps controller-factory]
   (ng-module-controller ng-module name (injectable deps controller-factory))))

(defn directive
  "Strict convenience wrapper for ng.NgModule.prototype.directive."
  ^js/ng.NgModule [^js/ng.NgModule ng-module ^string name ^js/ng.DirectiveFactory directive-factory]
  (ng-module-directive ng-module name directive-factory))

(defn publish
  "Strict convenience wrapper for ng.EventBusService.prototype.publish."
  (^boolean [^js/ng.EventBusService event-bus ^string topic]
   (event-bus-service-publish event-bus topic))
  (^boolean [^js/ng.EventBusService event-bus ^string topic value]
   (event-bus-service-publish event-bus topic value))
  (^boolean [^js/ng.EventBusService event-bus ^string topic value extra]
   (event-bus-service-publish event-bus topic value extra)))
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
      `${generatedMethods.length} typed method wrappers plus ` +
      `${generatedProperties.length} typed property readers.`,
  );
  console.log(
    `Validated ${coreFacade.functionCount} documented fluent facade functions ` +
      `covering ${coreFacade.ngModuleMethodCount} NgModule methods.`,
  );
} else {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, output);
  console.log(
    `Generated ${outputPath} from ${typeNames.length} extern types and ` +
      `${generatedMethods.length} typed method wrappers plus ` +
      `${generatedProperties.length} typed property readers.`,
  );
  console.log(
    `Validated ${coreFacade.functionCount} documented fluent facade functions ` +
      `covering ${coreFacade.ngModuleMethodCount} NgModule methods.`,
  );
}
