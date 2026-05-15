import { writeFileSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __filename = fileURLToPath(import.meta.url);
const integrationRoot = resolve(dirname(__filename), "..");
const repoRoot = resolve(integrationRoot, "../..");
const namespacePath = resolve(repoRoot, "src/namespace.ts");
const externsPath = resolve(integrationRoot, "externs/angular.js");

const nativeAliases = new Map([
  ["DocumentService", "!Document"],
  ["RootElementService", "!Element"],
  ["TemplateCacheService", "!Map<string, string>"],
  ["WindowService", "!Window"],
  ["NativeWebTransport", "!WebTransport"],
  ["WebTransportBufferInput", "BufferSource"],
]);

const semanticTypedefs = new Map([
  [
    "AnnotatedFactory",
    "!Array<(string|function(...?): ?|function(new: ?, ...?))>",
  ],
  [
    "AnnotatedDirectiveFactory",
    "!Array<(string|function(...?): (!ng.Directive|function(!ng.Scope, !HTMLElement, !ng.Attributes, ?, (!ng.TranscludeFn|undefined)): void))>",
  ],
  [
    "DirectiveFactory",
    "(!ng.AnnotatedDirectiveFactory|function(...?): (!ng.Directive|function(!ng.Scope, !HTMLElement, !ng.Attributes, ?, (!ng.TranscludeFn|undefined)): void))",
  ],
  [
    "Injectable",
    "(!ng.AnnotatedFactory|function(...?): ?|function(new: ?, ...?))",
  ],
  [
    "HttpPromise",
    "!Promise<!ng.HttpResponse<?>>",
  ],
]);

const memberTypeOverrides = new Map([
  ["Angular.subapps", "!Array<!ng.AngularService>"],
  ["Angular.$t", "!ng.InjectionTokens"],
  ["AngularService.subapps", "!Array<!ng.AngularService>"],
  ["AngularService.$t", "!ng.InjectionTokens"],
  ["Scope.$target", "!Object"],
  ["RootScopeService.$target", "!Object"],
  ["ServiceProvider.$get", "!ng.Injectable"],
]);

const moduleListType = "!Array<(string|!ng.Injectable)>";
const constantValueType = "(!Object|number|string)";
const storeCreatorType = "(!Object|function(...?): ?|function(new: ?, ...?))";
const transitionHookResultType =
  "(!Object|!Promise<(!Object|boolean|undefined)>|boolean|undefined)";
const transitionHookFnType =
  `function(!ng.Transition): ${transitionHookResultType}`;
const transitionStateHookFnType =
  `function(!ng.Transition, !ng.StateDeclaration): ${transitionHookResultType}`;
const transitionStateHookInjectableType =
  `(!Array<(string|function(...?): ${transitionHookResultType})>|${transitionStateHookFnType}|function(...?): ${transitionHookResultType})`;

const parameterTypeOverrides = new Map([
  ["Angular.module.configFn", "!ng.Injectable"],
  ["Angular.bootstrap.modules", moduleListType],
  ["Angular.injector.modules", moduleListType],
  ["AngularService.module.configFn", "!ng.Injectable"],
  ["AngularService.bootstrap.modules", moduleListType],
  ["AngularService.injector.modules", moduleListType],
  ["NgModule.constant.object", constantValueType],
  ["NgModule.config.configFn", "!ng.Injectable"],
  ["NgModule.run.block", "!ng.Injectable"],
  ["NgModule.factory.providerFunction", "!ng.Injectable"],
  ["NgModule.service.serviceFunction", "!ng.Injectable"],
  ["NgModule.provider.providerType", "!ng.Injectable"],
  ["NgModule.decorator.decorFn", "!ng.Injectable"],
  ["NgModule.directive.directiveFactory", "!ng.DirectiveFactory"],
  ["NgModule.animation.animationFactory", "!ng.Injectable"],
  ["NgModule.controller.ctlFn", "!ng.Injectable"],
  ["NgModule.store.ctor", storeCreatorType],
  ["ProvideService.directive.directive", "!ng.DirectiveFactory"],
  ["ProvideService.provider.provider", "(!ng.ServiceProvider|!ng.Injectable|!Object)"],
  ["ProvideService.factory.factoryFn", "!ng.Injectable"],
  ["ProvideService.service.constructor", "!ng.Injectable"],
  ["ProvideService.decorator.fn", "!ng.Injectable"],
  ["NativeService.receive.message", "(string|!Object)"],
  ["TransitionService.onBefore.callback", transitionHookFnType],
  ["TransitionService.onStart.callback", transitionHookFnType],
  ["TransitionService.onEnter.callback", transitionStateHookFnType],
  ["TransitionService.onRetain.callback", transitionStateHookFnType],
  ["TransitionService.onExit.callback", transitionStateHookFnType],
  ["TransitionService.onFinish.callback", transitionHookFnType],
  ["TransitionService.onSuccess.callback", transitionHookFnType],
  ["TransitionService.onError.callback", transitionHookFnType],
  ["Scope.get.property", "(number|string|symbol)"],
  ["Scope.deleteProperty.property", "(number|string|symbol)"],
  ["Scope.$merge.newTarget", "!Object"],
  ["RootScopeService.get.property", "(number|string|symbol)"],
  ["RootScopeService.deleteProperty.property", "(number|string|symbol)"],
  ["RootScopeService.$merge.newTarget", "!Object"],
]);

const memberReturnTypeOverrides = new Map([
  ["HttpService.get", "!Promise<!ng.HttpResponse<T>>"],
  ["HttpService.delete", "!Promise<!ng.HttpResponse<T>>"],
  ["HttpService.head", "!Promise<!ng.HttpResponse<T>>"],
  ["HttpService.post", "!Promise<!ng.HttpResponse<T>>"],
  ["HttpService.put", "!Promise<!ng.HttpResponse<T>>"],
  ["HttpService.patch", "!Promise<!ng.HttpResponse<T>>"],
  ["HttpService.call", "!Promise<!ng.HttpResponse<T>>"],
]);

for (const stateHookName of ["onEnter", "onRetain", "onExit"]) {
  memberTypeOverrides.set(
    `StateDeclaration.${stateHookName}`,
    `(${transitionStateHookInjectableType}|undefined)`,
  );
}

const constructorTypes = new Set([
  "Angular",
  "NgModule",
  "Scope",
  "HttpService",
  "NativeService",
  "PubSubProvider",
  "PubSubService",
]);

let publicAliasNames = new Set();
let publicAliasTemplateNames = new Map();
let activeTemplateNames = new Set();

const sourceTypeAliasNames = new Map([
  ["PubSub", "PubSubService"],
  ["Location", "LocationService"],
  ["Provider", "ProvideService"],
]);

const browserTypeNames = new Set([
  "AbortSignal",
  "Animation",
  "CustomEvent",
  "Document",
  "Element",
  "Event",
  "EventTarget",
  "HTMLElement",
  "HTMLDocument",
  "Keyframe",
  "KeyframeAnimationOptions",
  "Node",
  "Window",
]);

const typeDescriptions = new Map([
  [
    "Angular",
    "AngularTS runtime instance used to create modules, bootstrap DOM trees, create injectors, and recover scopes from native elements.",
  ],
  [
    "NgModule",
    "AngularTS module registration surface for controllers, directives, services, factories, providers, filters, run blocks, and config blocks.",
  ],
  [
    "Scope",
    "Reactive scope object used by AngularTS templates, directives, event propagation, listener registration, and queued change delivery.",
  ],
  [
    "HttpService",
    "Runtime `$http` service contract for full request configs, HTTP verb shortcuts, defaults, and pending request tracking.",
  ],
  [
    "NativeService",
    "Native bridge service used to call host-platform methods, receive replies, subscribe to native events, and access the active adapter.",
  ],
  [
    "PubSubProvider",
    "Provider used during module configuration to register and expose the application-wide AngularTS pub/sub event bus service.",
  ],
  [
    "PubSubService",
    "Topic-based publish/subscribe service for decoupled application events.",
  ],
  [
    "TopicService",
    "Single-topic pub/sub object used to publish values and manage subscriptions.",
  ],
  [
    "AnnotatedFactory",
    "Dependency-annotated injectable array containing dependency token names followed by the factory or constructor function.",
  ],
  [
    "AnnotatedDirectiveFactory",
    "Dependency-annotated directive factory array containing dependency token names followed by a directive factory function.",
  ],
  [
    "DirectiveFactory",
    "Directive registration factory that returns either a directive definition object or a link function.",
  ],
  [
    "EntityClass",
    "Constructor used by REST resources to map raw response data into entity instances.",
  ],
  [
    "Injectable",
    "AngularTS dependency-injectable function or dependency-annotated factory array.",
  ],
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

function findNamespaceTypeAliases(sourceFile) {
  const aliases = [];

  function visit(node) {
    if (
      ts.isModuleDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "ng" &&
      node.body &&
      ts.isModuleBlock(node.body)
    ) {
      for (const statement of node.body.statements) {
        if (ts.isTypeAliasDeclaration(statement)) {
          aliases.push(statement);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return aliases;
}

function isRepoSourceDeclaration(node) {
  const filename = node.getSourceFile().fileName;

  return filename.startsWith(resolve(repoRoot, "src"));
}

function hasPrivateModifier(node) {
  let current = node;

  while (current) {
    if (
      current.modifiers?.some(
        (modifier) =>
          modifier.kind === ts.SyntaxKind.PrivateKeyword ||
          modifier.kind === ts.SyntaxKind.ProtectedKeyword,
      )
    ) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

function isPublicSourceMember(symbol) {
  if (symbol.name.startsWith("_")) return false;

  return (
    symbol.declarations?.some(
      (declaration) =>
        isRepoSourceDeclaration(declaration) && !hasPrivateModifier(declaration),
    ) ?? false
  );
}

function symbolDescription(checker, symbol, fallback) {
  const docs = ts.displayPartsToString(symbol.getDocumentationComment(checker))
    .replace(/\s+/g, " ")
    .trim();

  return docs || fallback;
}

function typeDescription(checker, name, type) {
  if (typeDescriptions.has(name)) return typeDescriptions.get(name);

  const symbol = type.aliasSymbol ?? type.symbol;
  const fallback = `Public AngularTS ${name} contract exposed through the global ng namespace for Closure-annotated applications.`;

  return symbol ? symbolDescription(checker, symbol, fallback) : fallback;
}

function closureType(checker, type) {
  if (type.flags & ts.TypeFlags.Any) return "?";
  if (type.flags & ts.TypeFlags.Unknown) return "?";
  if (type.flags & ts.TypeFlags.Never) return "?";
  if (type.flags & ts.TypeFlags.TypeParameter) {
    const name = closureTemplateName(type.symbol?.getName() ?? "T");

    return activeTemplateNames.has(name) ? name : "?";
  }
  if (type.flags & ts.TypeFlags.StringLike) return "string";
  if (type.flags & ts.TypeFlags.NumberLike) return "number";
  if (type.flags & ts.TypeFlags.BooleanLike) return "boolean";
  if (type.flags & ts.TypeFlags.ESSymbolLike) return "symbol";
  if (type.flags & ts.TypeFlags.BigIntLike) return "bigint";
  if (type.flags & ts.TypeFlags.Void) return "void";
  if (type.flags & ts.TypeFlags.Null) return "null";
  if (type.flags & ts.TypeFlags.Undefined) return "undefined";

  if (type.isUnion()) {
    return unionClosureType(checker, type.types);
  }

  if (type.isIntersection()) {
    const publicPart = type.types
      .map((part) => closureType(checker, part))
      .find((part) => part.startsWith("!ng."));

    return publicPart ?? "!Object";
  }

  if (checker.isArrayType(type) || checker.isTupleType(type)) {
    const elementType = typeArguments(checker, type)[0];

    return `!Array<${elementType ? closureType(checker, elementType) : "?"}>`;
  }

  const symbolName = type.symbol?.getName();

  if (symbolName) {
    const aliasName = sourceTypeAliasNames.get(symbolName) ?? symbolName;

    if (publicAliasNames.has(aliasName)) {
      const templateNames = publicAliasTemplateNames.get(aliasName) ?? [];
      const args = typeArguments(checker, type).map((arg) => closureType(checker, arg));

      if (templateNames.length > 0 && args.length > 0) {
        return `!ng.${aliasName}<${args.join(", ")}>`;
      }

      return `!ng.${aliasName}`;
    }

    if (browserTypeNames.has(symbolName)) {
      return symbolName === "HTMLDocument" ? "!Document" : `!${symbolName}`;
    }
  }

  if (symbolName === "Promise") {
    return `!Promise<${typeArguments(checker, type).map((arg) => closureType(checker, arg))[0] ?? "?"}>`;
  }

  if (symbolName === "Map") {
    const args = typeArguments(checker, type).map((arg) => closureType(checker, arg));

    return `!Map<${args[0] ?? "?"}, ${args[1] ?? "?"}>`;
  }

  if (symbolName === "Element") return "!Element";
  if (symbolName === "Document") return "!Document";
  if (symbolName === "Window") return "!Window";

  const callSignatures = type.getCallSignatures();

  if (callSignatures.length > 0) {
    return closureFunctionType(checker, callSignatures[0]);
  }

  const constructSignatures = type.getConstructSignatures();

  if (constructSignatures.length > 0) {
    return closureConstructType(checker, constructSignatures[0]);
  }

  const stringIndexType = type.getStringIndexType();

  if (stringIndexType) {
    return `!Object<string, ${closureType(checker, stringIndexType)}>`;
  }

  if (type.flags & ts.TypeFlags.Object) return "!Object";

  return "?";
}

function typeArguments(checker, type) {
  if (type.aliasTypeArguments?.length) return type.aliasTypeArguments;

  if (type.objectFlags & ts.ObjectFlags.Reference) {
    return checker.getTypeArguments(type);
  }

  return [];
}

function unionClosureType(checker, types) {
  const parts = [
    ...new Set(
      types
        .map((part) => closureType(checker, part))
        .map((part) => {
          if (part.startsWith("(") && part.endsWith(")")) {
            return part.slice(1, -1);
          }

          return part;
        }),
    ),
  ].sort();

  if (parts.includes("?")) return "?";
  if (parts.length === 1) return parts[0];

  return `(${parts.join("|")})`;
}

function closureFunctionType(checker, signature) {
  const params = closureParameters(checker, signature);
  const returnType = closureType(checker, checker.getReturnTypeOfSignature(signature));
  const paramsType = params
    .map((parameter) =>
      parameter.rest ? `...${parameter.type}` : parameter.type,
    )
    .join(", ");

  return `function(${paramsType}): ${returnType}`;
}

function closureTemplateName(name) {
  return name.replace(/[^\w$]/g, "") || "T";
}

function templateNamesFromSignature(signature) {
  return (
    signature.typeParameters?.map((parameter) =>
      closureTemplateName(parameter.symbol?.getName() ?? "T"),
    ) ?? []
  );
}

function templateNamesFromTypeAlias(alias) {
  return (
    alias.typeParameters?.map((parameter) =>
      closureTemplateName(parameter.name.text),
    ) ?? []
  );
}

function templateDoc(names) {
  return names.length > 0 ? ` * @template ${names.join(", ")}\n` : "";
}

function withActiveTemplateNames(names, callback) {
  if (names.length === 0) return callback();

  const previous = activeTemplateNames;
  activeTemplateNames = new Set([...previous, ...names]);

  try {
    return callback();
  } finally {
    activeTemplateNames = previous;
  }
}

function closureConstructType(checker, signature) {
  const params = closureParameters(checker, signature);
  const instanceType = closureConstructorInstanceType(
    closureType(checker, checker.getReturnTypeOfSignature(signature)),
  );
  const paramsType = params
    .map((parameter) =>
      parameter.rest ? `...${parameter.type}` : parameter.type,
    )
    .join(", ");

  return `function(new: ${instanceType}${paramsType ? `, ${paramsType}` : ""})`;
}

function closureConstructorInstanceType(type) {
  if (type.startsWith("!")) return type.slice(1);
  if (type.startsWith("(")) return "?";

  return type;
}

function parameterName(parameter, index) {
  return /^[A-Za-z_$][\w$]*$/.test(parameter.name)
    ? parameter.name
    : `arg${index}`;
}

function isOptionalSymbol(symbol) {
  return (symbol.flags & ts.SymbolFlags.Optional) !== 0;
}

function isOptionalParameter(symbol, declaration) {
  return (
    isOptionalSymbol(symbol) ||
    !!declaration?.questionToken ||
    !!declaration?.initializer
  );
}

function optionalClosureType(type, optional) {
  if (!optional || type.includes("undefined")) return type;

  if (type.startsWith("(") && type.endsWith(")")) {
    return `(${type.slice(1, -1)}|undefined)`;
  }

  return `(${type}|undefined)`;
}

function memberDescription(checker, typeName, symbol) {
  return symbolDescription(
    checker,
    symbol,
    `Public ${typeName}.${symbol.name} member exposed by the AngularTS namespace contract.`,
  );
}

function memberExtern(checker, typeName, symbol) {
  const declarations = symbol.declarations ?? [];
  const declaration = declarations.find(isRepoSourceDeclaration) ?? declarations[0];
  const type = checker.getTypeOfSymbolAtLocation(symbol, declaration);
  const signatures = type.getCallSignatures();
  const description = memberDescription(checker, typeName, symbol);
  const target = `ng.${typeName}.prototype.${symbol.name}`;
  const memberOverride = memberTypeOverrides.get(`${typeName}.${symbol.name}`);

  if (signatures.length > 0) {
    const signature = signatures[0];
    const templateNames = templateNamesFromSignature(signature);
    const { params, returnType } = withActiveTemplateNames(templateNames, () => ({
      params: closureParameters(checker, signature, declaration, typeName, symbol.name),
      returnType:
        memberReturnTypeOverrides.get(`${typeName}.${symbol.name}`) ??
        closureType(checker, checker.getReturnTypeOfSignature(signature)),
    }));
    const templates = templateDoc(templateNames);
    const paramDocs = params
      .map((parameter) =>
        parameter.rest
          ? ` * @param {...${parameter.type}} ${parameter.name}`
          : ` * @param {${parameter.type}} ${parameter.name}`,
      )
      .join("\n");
    const args = params.map((parameter) => parameter.name).join(", ");

    return `/**\n * ${description}\n${templates}${paramDocs ? `${paramDocs}\n` : ""} * @return {${returnType}}\n */\n${target} = function(${args}) {};`;
  }

  return `/**\n * ${description}\n * @type {${optionalClosureType(memberOverride ?? closureType(checker, type), isOptionalSymbol(symbol))}}\n */\n${target};`;
}

function callExtern(checker, typeName, type) {
  const signature = type.getCallSignatures()[0];
  const templateNames = templateNamesFromSignature(signature);
  const { params, returnType } = withActiveTemplateNames(templateNames, () => ({
    params: closureParameters(checker, signature, signature.declaration),
    returnType:
      memberReturnTypeOverrides.get(`${typeName}.call`) ??
      closureType(checker, checker.getReturnTypeOfSignature(signature)),
  }));
  const templates = templateDoc(templateNames);
  const paramDocs = params
    .map((parameter) =>
      parameter.rest
        ? ` * @param {...${parameter.type}} ${parameter.name}`
        : ` * @param {${parameter.type}} ${parameter.name}`,
    )
    .join("\n");
  const args = params.map((parameter) => parameter.name).join(", ");

  return `/**\n * Invokes the callable ${typeName} contract.\n${templates}${paramDocs ? `${paramDocs}\n` : ""} * @return {${returnType}}\n */\nng.${typeName}.prototype.call = function(${args}) {};`;
}

function closureParameters(
  checker,
  signature,
  fallbackDeclaration = signature.declaration,
  typeName = "",
  memberName = "",
) {
  return signature.parameters.map((parameter, index) => {
    const parameterDeclaration = parameter.valueDeclaration;
    const rest = !!parameterDeclaration?.dotDotDotToken;
    const override = parameterTypeOverrides.get(
      `${typeName}.${memberName}.${parameter.name}`,
    );
    const type = rest
      ? "?"
      : optionalClosureType(
          override ??
            closureType(
              checker,
              checker.getTypeOfSymbolAtLocation(parameter, fallbackDeclaration),
            ),
          isOptionalParameter(parameter, parameterDeclaration),
        );

    return {
      name: rest ? "var_args" : parameterName(parameter, index),
      rest,
      type,
    };
  });
}

function typeExtern(checker, alias) {
  const name = alias.name.text;
  const type = checker.getTypeAtLocation(alias.name);
  const description = typeDescription(checker, name, type);
  const typeTemplateNames = templateNamesFromTypeAlias(alias);
  const props = checker.getPropertiesOfType(type).filter(isPublicSourceMember);
  const calls = type
    .getCallSignatures()
    .filter((signature) => signature.declaration && isRepoSourceDeclaration(signature.declaration));
  const lines = [];

  if (nativeAliases.has(name)) {
    lines.push(`/**\n * ${description}\n * @typedef {${nativeAliases.get(name)}}\n */\nng.${name};`);
    return lines.join("\n\n");
  }

  if (semanticTypedefs.has(name)) {
    lines.push(`/**\n * ${description}\n * @typedef {${semanticTypedefs.get(name)}}\n */\nng.${name};`);
    return lines.join("\n\n");
  }

  if (calls.length > 0 && props.length === 0) {
    const signature = calls[0];
    lines.push(`/**\n * ${description}\n * @typedef {${closureFunctionType(checker, signature)}}\n */\nng.${name};`);
    return lines.join("\n\n");
  }

  const constructs = type
    .getConstructSignatures()
    .filter((signature) => signature.declaration && isRepoSourceDeclaration(signature.declaration));

  if (constructs.length > 0 && props.length === 0) {
    const signature = constructs[0];
    lines.push(`/**\n * ${description}\n * @typedef {${closureConstructType(checker, signature)}}\n */\nng.${name};`);
    return lines.join("\n\n");
  }

  if (props.length === 0 && calls.length === 0) {
    const typeRef = closureType(checker, type);

    if (
      typeRef !== "?" &&
      !typeRef.startsWith("!Object") &&
      typeRef !== `!ng.${name}`
    ) {
      lines.push(`/**\n * ${description}\n * @typedef {${typeRef}}\n */\nng.${name};`);
      return lines.join("\n\n");
    }
  }

  const tag = constructorTypes.has(name) ? "@constructor" : "@record";
  const templates = templateDoc(typeTemplateNames);

  lines.push(`/**\n * ${description}\n${templates} * ${tag}\n */\nng.${name} = function() {};`);

  withActiveTemplateNames(typeTemplateNames, () => {
    for (const prop of props) {
      lines.push(memberExtern(checker, name, prop));
    }

    for (const signature of calls) {
      if (signature.declaration && isRepoSourceDeclaration(signature.declaration)) {
        lines.push(callExtern(checker, name, type));
        break;
      }
    }
  });

  return lines.join("\n\n");
}

function generateExterns() {
  const program = createProgram();
  const checker = program.getTypeChecker();
  const namespaceSource = program.getSourceFile(namespacePath);
  const aliases = findNamespaceTypeAliases(namespaceSource);
  publicAliasNames = new Set(aliases.map((alias) => alias.name.text));
  publicAliasTemplateNames = new Map(
    aliases.map((alias) => [alias.name.text, templateNamesFromTypeAlias(alias)]),
  );
  const typeBlocks = aliases.map((alias) => typeExtern(checker, alias));

  return `/**\n * @externs\n * Public externs for AngularTS [VI]{version}[/VI] applications compiled with Google Closure.\n *\n * Version-pinned to @angular-wave/angular.ts [VI]{version}[/VI]; regenerate\n * this file when updating the public ng namespace.\n *\n * This file is generated from src/namespace.ts by\n * integrations/closure/scripts/generate-externs.mjs. Browser-native aliases\n * reuse Closure Compiler's built-in browser externs instead of duplicating DOM\n * API surfaces under the public ng namespace.\n */\n\n/** @const */\nvar angular = {};\n\n/** @const Closure mirror of AngularTS's public TypeScript ng namespace. */\nvar ng = {};\n\n/**\n * Retrieve or create an AngularTS module.\n * @param {string} name\n * @param {!Array<string>=} requires\n * @return {!ng.NgModule}\n */\nangular.module = function(name, requires) {};\n\n${typeBlocks.join("\n\n")}\n`;
}

const output = generateExterns();

if (process.argv.includes("--check")) {
  const current = readFileSync(externsPath, "utf8");

  if (current !== output) {
    console.error(
      `${relative(repoRoot, externsPath)} is out of date. Run node integrations/closure/scripts/generate-externs.mjs.`,
    );
    process.exit(1);
  }
} else {
  writeFileSync(externsPath, output);
  console.log(`Generated ${relative(repoRoot, externsPath)}`);
}
