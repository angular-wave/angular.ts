import * as path from "node:path";
import ts from "typescript";

export interface TypeScriptProjectFile {
  fileName: string;
  text: string;
  version?: number;
}

export interface TypeScriptQuickInfo {
  display: string;
  documentation: string;
  start: number;
  end: number;
}

export interface TypeScriptDefinition {
  fileName: string;
  start: number;
  end: number;
}

export interface TypeScriptSignatureHelp {
  signature: string;
  activeParameter: number;
}

export interface TypeScriptStringLiteralUnion {
  values: string[];
}

export interface TypeScriptSemanticDiagnostic {
  message: string;
  start: number;
  end: number;
}

export class TypeScriptProjectService {
  private readonly files = new Map<
    string,
    { fileName: string; text: string; version: number }
  >();

  private readonly service: ts.LanguageService;

  constructor(
    files: TypeScriptProjectFile[] = [],
    compilerOptions: ts.CompilerOptions = {},
    private readonly currentDirectory = process.cwd(),
  ) {
    this.compilerOptions = { ...defaultCompilerOptions(), ...compilerOptions };
    for (const file of files) this.updateFile(file.fileName, file.text, file.version);
    this.service = ts.createLanguageService(this.createHost());
  }

  updateFile(fileName: string, text: string, version?: number): void {
    const normalized = this.normalize(fileName);
    const existing = this.files.get(normalized);
    this.files.set(normalized, {
      fileName: normalized,
      text,
      version: version ?? (existing ? existing.version + 1 : 1),
    });
  }

  quickInfo(fileName: string, offset: number): TypeScriptQuickInfo | undefined {
    const info = this.service.getQuickInfoAtPosition(this.normalize(fileName), offset);
    if (!info) return undefined;

    return {
      display: ts.displayPartsToString(info.displayParts),
      documentation: ts.displayPartsToString(info.documentation),
      start: info.textSpan.start,
      end: info.textSpan.start + info.textSpan.length,
    };
  }

  definitions(fileName: string, offset: number): TypeScriptDefinition[] {
    return (
      this.service.getDefinitionAtPosition(this.normalize(fileName), offset) ?? []
    ).map((definition) => ({
      fileName: this.normalize(definition.fileName),
      start: definition.textSpan.start,
      end: definition.textSpan.start + definition.textSpan.length,
    }));
  }

  completions(fileName: string, offset: number): string[] {
    return (
      this.service.getCompletionsAtPosition(this.normalize(fileName), offset, {})?.entries ??
      []
    ).map((entry) => entry.name);
  }

  semanticDiagnostics(fileName: string): string[] {
    return this.semanticDiagnosticDetails(fileName).map(
      (diagnostic) => diagnostic.message,
    );
  }

  semanticDiagnosticDetails(fileName: string): TypeScriptSemanticDiagnostic[] {
    return this.service
      .getSemanticDiagnostics(this.normalize(fileName))
      .map((diagnostic) => ({
        message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
        start: diagnostic.start ?? 0,
        end: (diagnostic.start ?? 0) + (diagnostic.length ?? 0),
      }));
  }

  signatureHelp(fileName: string, offset: number): TypeScriptSignatureHelp | undefined {
    const help = this.service.getSignatureHelpItems(this.normalize(fileName), offset, {});
    const item = help?.items[help.selectedItemIndex];
    if (!help || !item) return undefined;

    return {
      signature: signatureHelpText(item),
      activeParameter: help.argumentIndex,
    };
  }

  stringLiteralUnion(
    fileName: string,
    offset: number,
  ): TypeScriptStringLiteralUnion | undefined {
    const normalized = this.normalize(fileName);
    const program = this.service.getProgram();
    const source = program?.getSourceFile(normalized);
    if (!program || !source) return undefined;

    const node = findNodeAtOffset(source, offset);
    if (!node) return undefined;

    const type = program.getTypeChecker().getTypeAtLocation(node);
    const values = stringLiteralValues(type);
    if (!values?.length) return undefined;

    return { values: [...new Set(values)] };
  }

  private createHost(): ts.LanguageServiceHost {
    return {
      getCompilationSettings: () => this.compilerOptions,
      getCurrentDirectory: () => this.currentDirectory,
      getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
      getScriptFileNames: () => Array.from(this.files.keys()),
      getScriptVersion: (fileName) =>
        String(this.files.get(this.normalize(fileName))?.version ?? 0),
      getScriptSnapshot: (fileName) => {
        const normalized = this.normalize(fileName);
        const file = this.files.get(normalized);
        if (file) return ts.ScriptSnapshot.fromString(file.text);

        if (!ts.sys.fileExists(normalized)) return undefined;
        return ts.ScriptSnapshot.fromString(ts.sys.readFile(normalized) ?? "");
      },
      fileExists: (fileName) =>
        this.files.has(this.normalize(fileName)) ||
        ts.sys.fileExists(this.normalize(fileName)),
      readFile: (fileName) =>
        this.files.get(this.normalize(fileName))?.text ??
        ts.sys.readFile(this.normalize(fileName)),
      readDirectory: ts.sys.readDirectory,
    };
  }

  private readonly compilerOptions: ts.CompilerOptions;

  private normalize(fileName: string): string {
    return path.resolve(this.currentDirectory, fileName);
  }
}

function findNodeAtOffset(node: ts.Node, offset: number): ts.Node | undefined {
  if (offset < node.getFullStart() || offset > node.getEnd()) return undefined;

  let best: ts.Node | undefined;
  node.forEachChild((child) => {
    const found = findNodeAtOffset(child, offset);
    if (found) best = found;
  });

  return best ?? node;
}

function stringLiteralValues(type: ts.Type): string[] | undefined {
  if (type.isStringLiteral()) return [type.value];

  if (!type.isUnion()) return undefined;

  const values: string[] = [];
  for (const part of type.types) {
    if (part.isStringLiteral()) {
      values.push(part.value);
      continue;
    }

    if (
      part.flags & ts.TypeFlags.Undefined ||
      part.flags & ts.TypeFlags.Null ||
      part.flags & ts.TypeFlags.Void
    ) {
      continue;
    }

    return undefined;
  }

  return values.length ? values : undefined;
}

function defaultCompilerOptions(): ts.CompilerOptions {
  return {
    allowJs: true,
    checkJs: false,
    jsx: ts.JsxEmit.Preserve,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    target: ts.ScriptTarget.ES2022,
  };
}

function signatureHelpText(item: ts.SignatureHelpItem): string {
  const prefix = ts.displayPartsToString(item.prefixDisplayParts);
  const suffix = ts.displayPartsToString(item.suffixDisplayParts);
  const separator = ts.displayPartsToString(item.separatorDisplayParts);
  const parameters = item.parameters.map((parameter) =>
    ts.displayPartsToString(parameter.displayParts),
  );

  return `${prefix}${parameters.join(separator)}${suffix}`;
}
