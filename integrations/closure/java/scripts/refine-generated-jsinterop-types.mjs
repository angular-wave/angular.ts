import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import {
  parameterDocumentation,
  signatureDocumentation,
} from "../../../shared/typescript-documentation.mjs";

const [, , generatedSourcesDir] = process.argv;

if (!generatedSourcesDir) {
  console.error("Usage: refine-generated-jsinterop-types.mjs <generated-sources-dir>");
  process.exit(1);
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../../../..");
const namespacePath = resolve(repoRoot, "src/namespace.ts");
const generatedPackageDir = resolve(
  generatedSourcesDir,
  "org/angular/ts/ng",
);

const browserTypes = new Map([
  ["AbortSignal", "elemental2.dom.AbortSignal"],
  ["Animation", "elemental2.dom.Animation"],
  ["ArrayBuffer", "elemental2.core.ArrayBuffer"],
  ["ArrayBufferView", "elemental2.core.ArrayBufferView"],
  ["Blob", "elemental2.dom.Blob"],
  ["Cache", "elemental2.dom.Cache"],
  ["CloseEvent", "elemental2.dom.CloseEvent"],
  ["CustomEvent", "elemental2.dom.CustomEvent"],
  ["Document", "elemental2.dom.Document"],
  ["DOMTokenList", "elemental2.dom.DOMTokenList"],
  ["Element", "elemental2.dom.Element"],
  ["Event", "elemental2.dom.Event"],
  ["EventTarget", "elemental2.dom.EventTarget"],
  ["File", "elemental2.dom.File"],
  ["FileList", "elemental2.dom.FileList"],
  ["FormData", "elemental2.dom.FormData"],
  ["Headers", "elemental2.dom.Headers"],
  ["HTMLCanvasElement", "elemental2.dom.HTMLCanvasElement"],
  ["HTMLElement", "elemental2.dom.HTMLElement"],
  ["HTMLDocument", "elemental2.dom.Document"],
  ["HTMLInputElement", "elemental2.dom.HTMLInputElement"],
  ["Int8Array", "elemental2.core.Int8Array"],
  ["Int16Array", "elemental2.core.Int16Array"],
  ["Int32Array", "elemental2.core.Int32Array"],
  ["MessageChannel", "elemental2.dom.MessageChannel"],
  ["MessageEvent", "elemental2.dom.MessageEvent"],
  ["MessagePort", "elemental2.dom.MessagePort"],
  ["Node", "elemental2.dom.Node"],
  ["ReadableStream", "elemental2.dom.ReadableStream"],
  ["RegistrationOptions", "elemental2.dom.RegistrationOptions"],
  ["Request", "elemental2.dom.Request"],
  ["RequestInit", "elemental2.dom.RequestInit"],
  ["Response", "elemental2.dom.Response"],
  ["ServiceWorker", "elemental2.dom.ServiceWorker"],
  ["ServiceWorkerRegistration", "elemental2.dom.ServiceWorkerRegistration"],
  ["URL", "elemental2.dom.URL"],
  ["URLSearchParams", "elemental2.dom.URLSearchParams"],
  ["Uint8Array", "elemental2.core.Uint8Array"],
  ["Uint16Array", "elemental2.core.Uint16Array"],
  ["Uint32Array", "elemental2.core.Uint32Array"],
  ["Float32Array", "elemental2.core.Float32Array"],
  ["Float64Array", "elemental2.core.Float64Array"],
  ["WebSocket", "elemental2.dom.WebSocket"],
  ["Window", "elemental2.dom.Window"],
  ["Worker", "elemental2.dom.Worker"],
  ["WorkerOptions", "elemental2.dom.WorkerOptions"],
]);

const genericBrowserTypeArity = new Map([
  ["CustomEvent", 1],
  ["MessageEvent", 1],
  ["ReadableStream", 1],
]);

const javaReservedWords = new Set([
  "abstract",
  "assert",
  "boolean",
  "break",
  "byte",
  "case",
  "catch",
  "char",
  "class",
  "const",
  "continue",
  "default",
  "do",
  "double",
  "else",
  "enum",
  "extends",
  "final",
  "finally",
  "float",
  "for",
  "goto",
  "if",
  "implements",
  "import",
  "instanceof",
  "int",
  "interface",
  "long",
  "native",
  "new",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "short",
  "static",
  "strictfp",
  "super",
  "switch",
  "synchronized",
  "this",
  "throw",
  "throws",
  "transient",
  "try",
  "void",
  "volatile",
  "while",
]);

function createProgram() {
  const configPath = resolve(repoRoot, "tsconfig.json");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);

  if (config.error) {
    throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
  }

  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, repoRoot);

  return ts.createProgram(parsed.fileNames, parsed.options);
}

function findNamespaceAliases(sourceFile) {
  const aliases = [];

  function visit(node) {
    if (
      ts.isModuleDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "ng" &&
      node.body &&
      ts.isModuleBlock(node.body)
    ) {
      aliases.push(
        ...node.body.statements.filter(ts.isTypeAliasDeclaration),
      );
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return aliases;
}

function javaIdentifier(name, fallback) {
  const normalized = name.replace(/[^A-Za-z0-9_$]/g, "_");
  const candidate = /^[A-Za-z_$]/.test(normalized)
    ? normalized
    : `_${normalized}`;

  return javaReservedWords.has(candidate) ? `${candidate}_` : candidate || fallback;
}

function upperFirst(value) {
  return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);
}

function declaredTypeName(declaration) {
  const typeNode = ts.isTypeReferenceNode(declaration)
    ? declaration
    : declaration.type;

  if (
    typeNode &&
    ts.isTypeReferenceNode(typeNode) &&
    ts.isIdentifier(typeNode.typeName)
  ) {
    return typeNode.typeName.text;
  }

  return undefined;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function boxed(type) {
  switch (type) {
    case "boolean":
      return "Boolean";
    case "double":
      return "Double";
    case "void":
      return "Void";
    default:
      return type;
  }
}

function typeArguments(checker, type) {
  if (type.aliasTypeArguments?.length) return type.aliasTypeArguments;
  if (type.objectFlags & ts.ObjectFlags.Reference) {
    return checker.getTypeArguments(type);
  }

  return [];
}

function nonNullableUnion(type) {
  if (!type.isUnion()) return [type];

  return type.types.filter(
    (part) =>
      !(part.flags & ts.TypeFlags.Undefined) &&
      !(part.flags & ts.TypeFlags.Null),
  );
}

const activeJavaTypes = new Set();

function javaType(checker, type, generatedTypes, generic = false) {
  if (activeJavaTypes.has(type)) return "Object";

  activeJavaTypes.add(type);
  try {
    return resolveJavaType(checker, type, generatedTypes, generic);
  } finally {
    activeJavaTypes.delete(type);
  }
}

function resolveJavaType(checker, type, generatedTypes, generic = false) {
  const unionParts = nonNullableUnion(type);

  if (unionParts.length !== 1) {
    const translated = [...new Set(
      unionParts.map((part) => javaType(checker, part, generatedTypes, generic)),
    )];

    return translated.length === 1 ? translated[0] : "Object";
  }

  [type] = unionParts;

  if (
    type.flags & ts.TypeFlags.Any ||
    type.flags & ts.TypeFlags.Unknown ||
    type.flags & ts.TypeFlags.Never
  ) {
    return "Object";
  }
  if (type.flags & ts.TypeFlags.TypeParameter) {
    return javaIdentifier(type.symbol?.getName() ?? "T", "T");
  }
  if (type.flags & ts.TypeFlags.StringLike) return "String";
  if (type.flags & ts.TypeFlags.NumberLike) return generic ? "Double" : "double";
  if (type.flags & ts.TypeFlags.BooleanLike) return generic ? "Boolean" : "boolean";
  if (type.flags & ts.TypeFlags.Void) return generic ? "Void" : "void";

  if (checker.isArrayType(type) || checker.isTupleType(type)) {
    const element = typeArguments(checker, type)[0];
    const elementType = element
      ? boxed(javaType(checker, element, generatedTypes, true))
      : "Object";

    return `elemental2.core.JsArray<${elementType}>`;
  }

  const symbolName = type.aliasSymbol?.getName() ?? type.symbol?.getName();

  if (symbolName === "Promise" || symbolName === "PromiseLike") {
    const value = typeArguments(checker, type)[0];
    const valueType = value
      ? boxed(javaType(checker, value, generatedTypes, true))
      : "Object";
    const promiseType = symbolName === "Promise"
      ? "elemental2.promise.Promise"
      : "elemental2.promise.IThenable";

    return `${promiseType}<${valueType}>`;
  }

  if (symbolName === "Map" || symbolName === "ReadonlyMap") {
    const [key, value] = typeArguments(checker, type);
    const keyType = key
      ? boxed(javaType(checker, key, generatedTypes, true))
      : "Object";
    const valueType = value
      ? boxed(javaType(checker, value, generatedTypes, true))
      : "Object";

    return `elemental2.core.JsMap<${keyType},${valueType}>`;
  }

  if (symbolName === "Set" || symbolName === "ReadonlySet") {
    const value = typeArguments(checker, type)[0];
    const valueType = value
      ? boxed(javaType(checker, value, generatedTypes, true))
      : "Object";

    return `elemental2.core.JsSet<${valueType}>`;
  }

  if (symbolName === "WeakMap") {
    const [key, value] = typeArguments(checker, type);
    const keyType = key
      ? boxed(javaType(checker, key, generatedTypes, true))
      : "Object";
    const valueType = value
      ? boxed(javaType(checker, value, generatedTypes, true))
      : "Object";

    return `elemental2.core.JsWeakMap<${keyType},${valueType}>`;
  }

  if (symbolName === "WeakSet") {
    const value = typeArguments(checker, type)[0];
    const valueType = value
      ? boxed(javaType(checker, value, generatedTypes, true))
      : "Object";

    return `elemental2.core.JsWeakSet<${valueType}>`;
  }

  if (browserTypes.has(symbolName)) {
    const browserType = browserTypes.get(symbolName);
    const arity = genericBrowserTypeArity.get(symbolName) ?? 0;
    const args = typeArguments(checker, type)
      .slice(0, arity)
      .map((argument) => boxed(javaType(checker, argument, generatedTypes, true)));

    while (args.length < arity) args.push("Object");

    return args.length > 0 ? `${browserType}<${args.join(",")}>` : browserType;
  }

  if (symbolName && generatedTypes.has(symbolName)) {
    const parameterCount = generatedTypes.get(symbolName);
    const args = typeArguments(checker, type)
      .slice(0, parameterCount)
      .map((argument) => boxed(javaType(checker, argument, generatedTypes, true)));

    while (args.length < parameterCount) args.push("Object");

    return args.length > 0 ? `${symbolName}<${args.join(",")}>` : symbolName;
  }

  const stringIndexType = type.getStringIndexType();

  if (stringIndexType) {
    return `jsinterop.base.JsPropertyMap<${boxed(
      javaType(checker, stringIndexType, generatedTypes, true),
    )}>`;
  }

  return "Object";
}

function callbackMethod(checker, callbackName, signature, generatedTypes) {
  const parameters = signature.parameters.flatMap((parameter, index) => {
    const declaration = parameter.valueDeclaration ?? signature.declaration;
    const type = checker.getTypeOfSymbolAtLocation(parameter, declaration);
    const rest = !!parameter.valueDeclaration?.dotDotDotToken;
    const restElement = rest && checker.isArrayType(type)
      ? typeArguments(checker, type)[0]
      : undefined;
    if (restElement?.flags & ts.TypeFlags.Never) return [];
    const parameterType = restElement
      ? boxed(javaType(checker, restElement, generatedTypes, true))
      : javaType(checker, type, generatedTypes);
    const parameterName = javaIdentifier(parameter.name, `arg${index}`);

    return [{
      declaration: `${parameterType}${rest ? "..." : ""} ${parameterName}`,
      documentation: parameterDocumentation(checker, parameter),
      name: parameterName,
    }];
  });
  const returnType = javaType(
    checker,
    checker.getReturnTypeOfSignature(signature),
    generatedTypes,
  );

  const documentation = callbackDocumentation(
    checker,
    callbackName,
    signature,
    parameters,
  );

  return `${documentation.join("\n")}\n${returnType} onInvoke(${parameters
    .map((parameter) => parameter.declaration)
    .join(",")});`;
}

function callbackDocumentation(checker, callbackName, signature, parameters) {
  return [
    "/**",
    ` * ${javaDocText(
      signatureDocumentation(
        checker,
        signature,
        `Invokes the ${callbackName} callback.`,
      ),
    )}`,
    ...parameters.map(
      (parameter) =>
        ` * @param ${parameter.name} ${javaDocText(parameter.documentation)}`,
    ),
    " */",
  ];
}

function documentCallbackMethod(checker, callbackName, signature, source) {
  if (!signature || !source.includes("@JsFunction")) return source;

  const method = source.match(/^([^\n]*\bonInvoke\(([^\n]*)\);)$/m);
  if (!method || source.slice(0, method.index).trimEnd().endsWith("*/")) {
    return source;
  }

  const generatedParameters = splitJavaParameters(method[2]).map(
    (declaration, index) => ({
      documentation: signature.parameters[index]
        ? parameterDocumentation(checker, signature.parameters[index])
        : `Value supplied for the arg${index} parameter.`,
      name:
        declaration.match(/([A-Za-z_$][\w$]*)\s*$/)?.[1] ?? `arg${index}`,
    }),
  );
  const documentation = callbackDocumentation(
    checker,
    callbackName,
    signature,
    generatedParameters,
  ).join("\n");

  return source.replace(method[1], `${documentation}\n${method[1]}`);
}

function javaDocText(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("*/", "*&#47;");
}

function nestedCallbackDefinition(
  checker,
  callbackName,
  signature,
  generatedTypes,
  alias,
) {
  const callbackSource = callbackMethod(
    checker,
    callbackName,
    signature,
    generatedTypes,
  );
  const typeParameters = (
    alias.typeParameters?.map(
      (parameter) => `${javaIdentifier(parameter.name.text, "T")} extends Object`,
    ) ?? []
  ).filter((parameter) =>
    new RegExp(`\\b${escapeRegExp(parameter.split(" ")[0])}\\b`).test(
      callbackSource,
    ),
  );
  const template =
    typeParameters.length > 0 ? `<${typeParameters.join(",")}>` : "";

  return [
    "/** TypeScript callback contract for this property. */",
    "@jsinterop.annotations.JsFunction",
    `interface ${callbackName}${template}{`,
    callbackSource,
    "}",
  ].join("\n");
}

function standaloneCallbackDefinition(
  checker,
  callbackName,
  signature,
  generatedTypes,
  alias,
) {
  const typeParameters =
    alias?.typeParameters?.map(
      (parameter) => `${javaIdentifier(parameter.name.text, "T")} extends Object`,
    ) ?? [];
  const template =
    typeParameters.length > 0 ? `<${typeParameters.join(",")}>` : "";

  return [
    "package org.angular.ts.ng;",
    "import jsinterop.annotations.JsFunction;",
    "@JsFunction",
    `public interface ${callbackName}${template}{`,
    callbackMethod(checker, callbackName, signature, generatedTypes),
    "}",
    "",
  ].join("\n");
}

function callbackTypeParameters(alias, signature) {
  const names = [
    ...(alias.typeParameters?.map((parameter) => parameter.name.text) ?? []),
    ...(signature.typeParameters?.map(
      (parameter) => parameter.symbol?.getName() ?? "T",
    ) ?? []),
  ].map((name) => javaIdentifier(name, "T"));

  return [...new Set(names)];
}

function methodCallbackType(
  checker,
  type,
  declaration,
  fallbackName,
  ownerAlias,
  ownerSignature,
  generatedTypes,
  publicAliasNames,
  aliasesByName,
  nestedCallbacks,
  standaloneCallbacks,
) {
  const parts = nonNullableUnion(type);
  if (parts.length !== 1) return undefined;

  const callbackSignature = parts[0].getCallSignatures()[0];
  if (!callbackSignature) return undefined;

  const namedCallback = declaredTypeName(declaration);

  if (namedCallback && publicAliasNames.has(namedCallback)) {
    const callbackAlias = aliasesByName.get(namedCallback);
    const declaredSignature = callbackAlias
      ? checker.getTypeAtLocation(callbackAlias.name).getCallSignatures()[0]
      : callbackSignature;
    const parameterNames =
      callbackAlias?.typeParameters?.map((parameter) => parameter.name.text) ?? [];
    const suppliedArguments = typeArguments(checker, parts[0]).map((argument) =>
      boxed(javaType(checker, argument, generatedTypes, true)),
    );

    while (suppliedArguments.length < parameterNames.length) {
      suppliedArguments.push("Object");
    }

    standaloneCallbacks.set(
      namedCallback,
      standaloneCallbackDefinition(
        checker,
        namedCallback,
        declaredSignature,
        generatedTypes,
        callbackAlias,
      ),
    );

    return parameterNames.length > 0
      ? `${namedCallback}<${suppliedArguments.slice(0, parameterNames.length).join(",")}>`
      : namedCallback;
  }

  const callbackName = namedCallback
    ? javaIdentifier(namedCallback, fallbackName)
    : fallbackName;
  const callbackMethodSource = callbackMethod(
    checker,
    callbackName,
    callbackSignature,
    generatedTypes,
  );
  const parameterNames = callbackTypeParameters(ownerAlias, ownerSignature).filter(
    (name) =>
      new RegExp(`\\b${escapeRegExp(name)}\\b`).test(callbackMethodSource),
  );
  const declarationTemplate =
    parameterNames.length > 0
      ? `<${parameterNames.map((name) => `${name} extends Object`).join(",")}>`
      : "";
  const useTemplate =
    parameterNames.length > 0 ? `<${parameterNames.join(",")}>` : "";

  nestedCallbacks.set(
    callbackName,
    [
      "/** TypeScript callback contract for this method. */",
      "@jsinterop.annotations.JsFunction",
      `interface ${callbackName}${declarationTemplate}{`,
      callbackMethodSource,
      "}",
    ].join("\n"),
  );

  return `${callbackName}${useTemplate}`;
}

function refineProperties(
  checker,
  alias,
  source,
  generatedTypes,
  publicAliasNames,
  aliasesByName,
  standaloneCallbacks,
) {
  const type = checker.getTypeAtLocation(alias.name);
  const callbackDefinitions = [];

  for (const property of checker.getPropertiesOfType(type)) {
    const declaration = property.valueDeclaration ?? property.declarations?.[0];
    if (!declaration) continue;

    const propertyType = checker.getTypeOfSymbolAtLocation(property, declaration);
    const unionParts = nonNullableUnion(propertyType);
    const callSignatures =
      unionParts.length === 1 ? unionParts[0].getCallSignatures() : [];
    const suffix = upperFirst(javaIdentifier(property.name, property.name));
    const parameterName = javaIdentifier(property.name, property.name);
    const escapedSuffix = escapeRegExp(suffix);
    const escapedParameterName = escapeRegExp(parameterName);
    const escapedPropertyName = escapeRegExp(parameterName);
    const getterPattern = new RegExp(
      `\\b[^\\s]+ get${escapedSuffix}\\(\\);`,
    );
    const setterPattern = new RegExp(
      `\\bvoid set${escapedSuffix}\\([^\\s]+ ${escapedParameterName}\\);`,
    );
    const fieldPattern = new RegExp(
      `^(public (?:(?:final|native|static)\\s+)*)([^\\s]+)(\\s+${escapedPropertyName};)$`,
      "m",
    );
    const hasGetter = getterPattern.test(source);
    const hasSetter = setterPattern.test(source);
    const hasField = fieldPattern.test(source);
    let replacementType = "Object";

    if (!hasGetter && !hasSetter && !hasField) continue;

    if (callSignatures.length > 0) {
      const declaredCallbackName =
        declaredTypeName(declaration) ?? unionParts[0].aliasSymbol?.getName();
      const callbackName =
        declaredCallbackName && publicAliasNames.has(declaredCallbackName)
          ? declaredCallbackName
          : `${suffix}Callback`;
      const callbackMethodSource = callbackMethod(
        checker,
        callbackName,
        callSignatures[0],
        generatedTypes,
      );
      const outerTypeArguments = (
        alias.typeParameters?.map((parameter) =>
          javaIdentifier(parameter.name.text, "T"),
        ) ?? []
      ).filter((name) =>
        new RegExp(`\\b${escapeRegExp(name)}\\b`).test(callbackMethodSource),
      );
      replacementType =
        !declaredCallbackName && outerTypeArguments.length > 0
          ? `${callbackName}<${outerTypeArguments.join(",")}>`
          : callbackName;

      if (declaredCallbackName && publicAliasNames.has(declaredCallbackName)) {
        const callbackAlias = aliasesByName.get(callbackName);
        const callbackSignature = callbackAlias
          ? checker.getTypeAtLocation(callbackAlias.name).getCallSignatures()[0]
          : callSignatures[0];
        const parameterNames =
          callbackAlias?.typeParameters?.map((parameter) =>
            javaIdentifier(parameter.name.text, "T"),
          ) ?? [];
        const suppliedArguments = typeArguments(checker, unionParts[0]).map(
          (argument) => boxed(javaType(checker, argument, generatedTypes, true)),
        );

        while (suppliedArguments.length < parameterNames.length) {
          suppliedArguments.push("Object");
        }

        replacementType = parameterNames.length > 0
          ? `${callbackName}<${suppliedArguments.slice(0, parameterNames.length).join(",")}>`
          : callbackName;

        standaloneCallbacks.set(
          callbackName,
          standaloneCallbackDefinition(
            checker,
            callbackName,
            callbackSignature,
            generatedTypes,
            callbackAlias,
          ),
        );
      } else {
        callbackDefinitions.push(
          nestedCallbackDefinition(
            checker,
            callbackName,
            callSignatures[0],
            generatedTypes,
            alias,
          ),
        );
      }
    } else {
      replacementType = javaType(checker, propertyType, generatedTypes);
    }

    if (replacementType === "Object") continue;

    source = source.replace(
      new RegExp(`\\b[^\\s]+ get${escapedSuffix}\\(\\);`, "g"),
      `${replacementType} get${suffix}();`,
    );
    source = source.replace(
      new RegExp(
        `\\bvoid set${escapedSuffix}\\([^\\s]+ ${escapedParameterName}\\);`,
        "g",
      ),
      `void set${suffix}(${replacementType} ${parameterName});`,
    );
    source = source.replace(
      fieldPattern,
      `$1${replacementType}$3`,
    );
  }

  if (callbackDefinitions.length > 0) {
    source = source.replace(
      /(public interface [^{]+\{)/,
      `$1\n${callbackDefinitions.join("\n")}`,
    );
  }

  return source;
}

function splitJavaParameters(parameters) {
  if (parameters.trim() === "") return [];

  const parts = [];
  let start = 0;
  let angleDepth = 0;

  for (let index = 0; index < parameters.length; index += 1) {
    const char = parameters[index];

    if (char === "<") angleDepth += 1;
    if (char === ">") angleDepth -= 1;
    if (char === "," && angleDepth === 0) {
      parts.push(parameters.slice(start, index));
      start = index + 1;
    }
  }

  parts.push(parameters.slice(start));
  return parts;
}

function replaceJavaReturnType(head, replacementType) {
  const trailingWhitespace = head.match(/\s*$/)?.[0] ?? "";
  const declaration = head.slice(0, head.length - trailingWhitespace.length);
  let angleDepth = 0;

  for (let index = declaration.length - 1; index >= 0; index -= 1) {
    const char = declaration[index];

    if (char === ">") angleDepth += 1;
    if (char === "<") angleDepth -= 1;
    if (/\s/.test(char) && angleDepth === 0) {
      return `${declaration.slice(0, index + 1)}${replacementType}${trailingWhitespace}`;
    }
  }

  return `${replacementType}${trailingWhitespace}`;
}

function replaceJavaParameterType(parameterSource, replacementType) {
  const match = parameterSource.match(
    /^(\s*)(.+?)(\.\.\.)?(\s+[A-Za-z_$][\w$]*\s*)$/,
  );

  if (!match) return parameterSource;

  const [, leading, , rest = "", name] = match;
  return `${leading}${replacementType}${rest}${name}`;
}

function isJavaMethodDeclarationHead(head) {
  const declaration = head.trim();

  if (!declaration) return false;
  if (/^(?:return|throw|new|case|yield)\b/.test(declaration)) return false;
  if (/[=?:,(]$/.test(declaration)) return false;

  return true;
}

function refineMethods(
  checker,
  alias,
  source,
  generatedTypes,
  publicAliasNames,
  aliasesByName,
  standaloneCallbacks,
) {
  const type = checker.getTypeAtLocation(alias.name);
  const nestedCallbacks = new Map();

  for (const member of checker.getPropertiesOfType(type)) {
    const declaration = member.valueDeclaration ?? member.declarations?.[0];
    if (!declaration) continue;

    const memberType = checker.getTypeOfSymbolAtLocation(member, declaration);
    const signature = memberType.getCallSignatures()[0];
    if (!signature) continue;

    const methodName = javaIdentifier(member.name, member.name);
    const escapedMethodName = escapeRegExp(methodName);
    const methodPattern = new RegExp(
      `^(\\s*)([^\\n]*?\\s)${escapedMethodName}\\(([^\\n]*)\\)([;{])$`,
      "gm",
    );

    source = source.replace(
      methodPattern,
      (line, indentation, head, parametersSource, terminator) => {
        if (!isJavaMethodDeclarationHead(head)) return line;

        let refinedHead = head;
        const returnTypeSource = checker.getReturnTypeOfSignature(signature);
        const returnDeclaration = signature.declaration?.type ?? declaration;
        const returnCallbackSignature =
          nonNullableUnion(returnTypeSource)[0]?.getCallSignatures()[0];
        const returnType =
          methodCallbackType(
            checker,
            returnTypeSource,
            returnDeclaration,
            returnCallbackSignature?.parameters.length === 0
              ? "Subscription"
              : `${upperFirst(methodName)}ResultCallback`,
            alias,
            signature,
            generatedTypes,
            publicAliasNames,
            aliasesByName,
            nestedCallbacks,
            standaloneCallbacks,
          ) ?? javaType(checker, returnTypeSource, generatedTypes);

        if (returnType !== "Object") {
          refinedHead = replaceJavaReturnType(refinedHead, returnType);
        }

        const parameters = splitJavaParameters(parametersSource);
        const refinedParameters = parameters.map((parameterSource, index) => {
          const parameter = signature.parameters[index];
          if (!parameter) return parameterSource;

          const parameterDeclaration =
            parameter.valueDeclaration ?? signature.declaration;
          const parameterType = checker.getTypeOfSymbolAtLocation(
            parameter,
            parameterDeclaration,
          );
          const rest = !!parameter.valueDeclaration?.dotDotDotToken;
          const restElement = rest && checker.isArrayType(parameterType)
            ? typeArguments(checker, parameterType)[0]
            : undefined;

          const replacementType =
            methodCallbackType(
              checker,
              parameterType,
              parameterDeclaration,
              ["callback", "fn", "listener", "listenerFn"].includes(
                parameter.name,
              )
                ? `${upperFirst(methodName)}${
                    parameter.name === "callback" ? "Callback" : "Listener"
                  }`
                : `${upperFirst(methodName)}${upperFirst(
                    javaIdentifier(parameter.name, `Arg${index}`),
                  )}Callback`,
              alias,
              signature,
              generatedTypes,
              publicAliasNames,
              aliasesByName,
              nestedCallbacks,
              standaloneCallbacks,
            ) ?? javaType(
              checker,
              restElement ?? parameterType,
              generatedTypes,
              rest,
            );

          if (replacementType === "Object") return parameterSource;

          return replaceJavaParameterType(parameterSource, replacementType);
        });

        const methodTypeParameters =
          signature.typeParameters?.map((parameter) =>
            javaIdentifier(parameter.symbol?.getName() ?? "T", "T"),
          ) ?? [];
        const refinedSignatureTypes = `${refinedHead} ${refinedParameters.join(",")}`;

        if (
          methodTypeParameters.length > 0 &&
          !/^(?:(?:public|protected|private|static|final|native)\s+)*</.test(
            refinedHead,
          ) &&
          methodTypeParameters.some((name) =>
            new RegExp(`\\b${escapeRegExp(name)}\\b`).test(refinedSignatureTypes),
          )
        ) {
          const template = `<${methodTypeParameters
            .map((name) => `${name} extends Object`)
            .join(",")}> `;
          refinedHead = refinedHead.replace(
            /^((?:(?:public|protected|private|static|final|native)\s+)*)/,
            `$1${template}`,
          );
        }

        const refined = `${indentation}${refinedHead}${methodName}(${refinedParameters.join(",")})${terminator}`;

        return refined === line ? line : refined;
      },
    );
  }

  if (nestedCallbacks.size > 0) {
    source = source.replace(
      /(public (?:class|interface) [^{]+\{)/,
      `$1\n${[...nestedCallbacks.values()].join("\n")}`,
    );
  }

  return source;
}

const program = createProgram();
const checker = program.getTypeChecker();
const namespaceSource = program.getSourceFile(namespacePath);

if (!namespaceSource) {
  throw new Error(`Missing TypeScript namespace source: ${namespacePath}`);
}

const aliases = findNamespaceAliases(namespaceSource);
const publicAliasNames = new Set(aliases.map((alias) => alias.name.text));
const aliasesByName = new Map(aliases.map((alias) => [alias.name.text, alias]));
const generatedTypes = new Map(
  aliases.flatMap((alias) => {
    const name = alias.name.text;
    const path = resolve(generatedPackageDir, `${name}.java`);

    if (!existsSync(path)) return [];

    const source = readFileSync(path, "utf8");
    const match = source.match(
      new RegExp(`\\b(?:class|interface)\\s+${escapeRegExp(name)}(?:<([^>{}]*)>)?`),
    );
    const parameterCount = match?.[1]
      ? match[1].split(",").length
      : 0;

    return [[name, parameterCount]];
  }),
);
const standaloneCallbacks = new Map();
let refinedProperties = 0;

for (const alias of aliases) {
  const path = resolve(generatedPackageDir, `${alias.name.text}.java`);
  if (!existsSync(path)) continue;

  const source = readFileSync(path, "utf8");
  const signature = checker.getTypeAtLocation(alias.name).getCallSignatures()[0];
  const invoke = source.match(/^[^\n]*\bonInvoke\([^\n]*$/m)?.[0] ?? "";
  const hasRawGeneratedType = [...generatedTypes].some(
    ([name, parameterCount]) =>
      parameterCount > 0 &&
      new RegExp(`\\b${escapeRegExp(name)}\\b(?!\\s*<)`).test(invoke),
  );

  if (!signature || !source.includes("@JsFunction") || !hasRawGeneratedType) {
    continue;
  }

  standaloneCallbacks.set(
    alias.name.text,
    standaloneCallbackDefinition(
      checker,
      alias.name.text,
      signature,
      generatedTypes,
      alias,
    ),
  );
}

for (const alias of aliases) {
  const path = resolve(generatedPackageDir, `${alias.name.text}.java`);
  if (!existsSync(path)) continue;

  const source = readFileSync(path, "utf8");
  const propertyRefined = refineProperties(
    checker,
    alias,
    source,
    generatedTypes,
    publicAliasNames,
    aliasesByName,
    standaloneCallbacks,
  );
  const methodRefined = refineMethods(
    checker,
    alias,
    propertyRefined,
    generatedTypes,
    publicAliasNames,
    aliasesByName,
    standaloneCallbacks,
  );
  const signature = checker.getTypeAtLocation(alias.name).getCallSignatures()[0];
  const refined = documentCallbackMethod(
    checker,
    alias.name.text,
    signature,
    methodRefined,
  );

  if (refined !== source) {
    writeFileSync(path, refined);
    refinedProperties += 1;
  }
}

for (const [name, source] of standaloneCallbacks) {
  writeFileSync(resolve(generatedPackageDir, `${name}.java`), source);
}

console.log(
  `Refined erased JsInterop types in ${refinedProperties} generated Java contracts and generated ${standaloneCallbacks.size} callback contracts.`,
);
