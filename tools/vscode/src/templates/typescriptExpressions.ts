import {
  TypeScriptProjectService,
  type TypeScriptDefinition,
  type TypeScriptQuickInfo,
  type TypeScriptSignatureHelp,
  type TypeScriptStringLiteralUnion,
} from "../analyzer/typescriptProject";

export interface TypeScriptExpressionLocal {
  name: string;
  type: string;
}

export interface TypeScriptExpressionContext {
  declarations?: string;
  locals?: TypeScriptExpressionLocal[];
}

export class TypeScriptExpressionService {
  private readonly expressionStart: number;
  private readonly project: TypeScriptProjectService;
  private readonly fileName: string;
  private readonly expression: string;
  private readonly context: TypeScriptExpressionContext;

  constructor(
    expression: string,
    context: TypeScriptExpressionContext = {},
    fileName = "/angular-ts-expression.ts",
  ) {
    this.fileName = fileName;
    this.expression = expression;
    this.context = context;
    const source = createExpressionSource(expression, context);
    this.expressionStart = source.expressionStart;
    this.project = new TypeScriptProjectService([
      { fileName, text: source.text },
    ]);
  }

  quickInfo(offset: number): TypeScriptQuickInfo | undefined {
    const info = this.project.quickInfo(this.fileName, this.expressionStart + offset);
    if (!info) return undefined;

    return {
      ...info,
      start: info.start - this.expressionStart,
      end: info.end - this.expressionStart,
    };
  }

  definitions(offset: number): TypeScriptDefinition[] {
    return this.project.definitions(this.fileName, this.expressionStart + offset);
  }

  completions(offset: number): string[] {
    return this.project.completions(this.fileName, this.expressionStart + offset);
  }

  signatureHelp(offset: number): TypeScriptSignatureHelp | undefined {
    return this.project.signatureHelp(this.fileName, this.expressionStart + offset);
  }

  stringLiteralUnion(offset = 0): TypeScriptStringLiteralUnion | undefined {
    return this.project.stringLiteralUnion(this.fileName, this.expressionStart + offset);
  }

  isAssignableTo(typeExpression: string): boolean {
    const source = createAssignmentSource(
      this.expression,
      this.context,
      typeExpression,
    );
    const project = new TypeScriptProjectService([
      { fileName: this.fileName, text: source.text },
    ]);
    return !project
      .semanticDiagnosticDetails(this.fileName)
      .some(
        (diagnostic) =>
          diagnostic.start < source.assignmentEnd &&
          diagnostic.end > source.assignmentStart,
      );
  }

  isResolvedValueAssignableTo(typeExpression: string): boolean {
    const source = createResolvedAssignmentSource(
      this.expression,
      this.context,
      typeExpression,
    );
    const project = new TypeScriptProjectService([
      { fileName: this.fileName, text: source.text },
    ]);
    return !project
      .semanticDiagnosticDetails(this.fileName)
      .some(
        (diagnostic) =>
          diagnostic.start < source.assignmentEnd &&
          diagnostic.end > source.assignmentStart,
      );
  }

  canUseType(typeExpression: string): boolean {
    const source = createTypeAvailabilitySource(this.context, typeExpression);
    const project = new TypeScriptProjectService([
      { fileName: this.fileName, text: source.text },
    ]);
    return !project
      .semanticDiagnosticDetails(this.fileName)
      .some(
        (diagnostic) =>
          diagnostic.start < source.typeEnd &&
          diagnostic.end > source.typeStart,
      );
  }
}

function createExpressionSource(
  expression: string,
  context: TypeScriptExpressionContext,
): { text: string; expressionStart: number } {
  const declarations = context.declarations ? `${context.declarations}\n` : "";
  const locals = context.locals ?? [];
  const parameters = locals
    .map((local) => `${local.name}: ${local.type}`)
    .join(", ");
  const helperTypes = `type __AngularTsRepeatItem<T> = T extends readonly (infer Item)[] ? Item : T extends Iterable<infer Item> ? Item : unknown;\n`;
  const prefix = `${declarations}${helperTypes}function __angularTsExpressionScope(${parameters}) {\n  `;
  const suffix = `;\n}\n`;

  return {
    text: `${prefix}${expression}${suffix}`,
    expressionStart: prefix.length,
  };
}

function createAssignmentSource(
  expression: string,
  context: TypeScriptExpressionContext,
  typeExpression: string,
): { text: string; assignmentStart: number; assignmentEnd: number } {
  const declarations = context.declarations ? `${context.declarations}\n` : "";
  const locals = context.locals ?? [];
  const parameters = locals
    .map((local) => `${local.name}: ${local.type}`)
    .join(", ");
  const helperTypes = `type __AngularTsRepeatItem<T> = T extends readonly (infer Item)[] ? Item : T extends Iterable<infer Item> ? Item : unknown;\n`;
  const prefix = `${declarations}${helperTypes}function __angularTsExpressionScope(${parameters}) {\n  `;
  const assignment = `const __angularTsValue: ${typeExpression} = (${expression});`;
  const suffix = `\n}\n`;

  return {
    text: `${prefix}${assignment}${suffix}`,
    assignmentStart: prefix.length,
    assignmentEnd: prefix.length + assignment.length,
  };
}

function createResolvedAssignmentSource(
  expression: string,
  context: TypeScriptExpressionContext,
  typeExpression: string,
): { text: string; assignmentStart: number; assignmentEnd: number } {
  const declarations = context.declarations ? `${context.declarations}\n` : "";
  const locals = context.locals ?? [];
  const parameters = locals
    .map((local) => `${local.name}: ${local.type}`)
    .join(", ");
  const helperTypes = `type __AngularTsRepeatItem<T> = T extends readonly (infer Item)[] ? Item : T extends Iterable<infer Item> ? Item : unknown;\ntype __AngularTsAwaited<T> = T extends PromiseLike<infer Value> ? __AngularTsAwaited<Value> : T;\ntype __AngularTsResolveValue<T> = T extends (...args: any[]) => infer Return ? __AngularTsAwaited<Return> : __AngularTsAwaited<T>;\n`;
  const prefix = `${declarations}${helperTypes}function __angularTsExpressionScope(${parameters}) {\n  const __angularTsResolveSource = (${expression});\n  `;
  const assignment = `const __angularTsValue: ${typeExpression} = null as any as __AngularTsResolveValue<typeof __angularTsResolveSource>;`;
  const suffix = `\n}\n`;

  return {
    text: `${prefix}${assignment}${suffix}`,
    assignmentStart: prefix.length,
    assignmentEnd: prefix.length + assignment.length,
  };
}

function createTypeAvailabilitySource(
  context: TypeScriptExpressionContext,
  typeExpression: string,
): { text: string; typeStart: number; typeEnd: number } {
  const declarations = context.declarations ? `${context.declarations}\n` : "";
  const prefix = `${declarations}type __AngularTsTargetType = `;
  const suffix = `;\n`;

  return {
    text: `${prefix}${typeExpression}${suffix}`,
    typeStart: prefix.length,
    typeEnd: prefix.length + typeExpression.length,
  };
}
