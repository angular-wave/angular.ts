import * as vscode from "vscode";
import { AngularTsWorkspaceIndex } from "../analyzer/workspaceIndex";
import { collectAngularTsHtmlDiagnostics } from "../templates/diagnostics";
import { collectAngularTsSourceDiagnostics } from "../templates/sourceDiagnostics";

export class AngularTsDiagnosticsProvider implements vscode.Disposable {
  private readonly collection =
    vscode.languages.createDiagnosticCollection("angularTs");
  private readonly disposables: vscode.Disposable[] = [this.collection];

  constructor(private readonly index: AngularTsWorkspaceIndex) {
    this.disposables.push(
      vscode.workspace.onDidOpenTextDocument((document) => this.update(document)),
      vscode.workspace.onDidChangeTextDocument((event) =>
        this.update(event.document),
      ),
      vscode.workspace.onDidCloseTextDocument((document) =>
        this.collection.delete(document.uri),
      ),
      this.index.onDidChange(() => this.updateAll()),
    );

    this.updateAll();
  }

  dispose(): void {
    this.disposables.forEach((disposable) => disposable.dispose());
  }

  private updateAll(): void {
    for (const document of vscode.workspace.textDocuments) {
      this.update(document);
    }
  }

  private update(document: vscode.TextDocument): void {
    if (!isEnabled() || !isSupportedDocument(document.languageId)) {
      this.collection.delete(document.uri);
      return;
    }

    const rawDiagnostics =
      document.languageId === "html"
        ? collectAngularTsHtmlDiagnostics(document.getText(), this.index.getEntries())
        : collectAngularTsSourceDiagnostics(
            document.getText(),
            this.index.getEntries(),
            document.uri.fsPath,
          );

    const diagnostics = rawDiagnostics.map((diagnostic) => {
      const vscodeDiagnostic = new vscode.Diagnostic(
        new vscode.Range(
          document.positionAt(diagnostic.start),
          document.positionAt(diagnostic.end),
        ),
        diagnostic.message,
        diagnostic.severity === "error"
          ? vscode.DiagnosticSeverity.Error
          : vscode.DiagnosticSeverity.Warning,
      );
      vscodeDiagnostic.code = diagnostic.code;
      vscodeDiagnostic.source = "AngularTS";
      return vscodeDiagnostic;
    });

    this.collection.set(document.uri, diagnostics);
  }
}

function isEnabled(): boolean {
  const config = vscode.workspace.getConfiguration("angularTs");
  return config.get<boolean>("enable", true) && config.get<boolean>("diagnostics", true);
}

function isSupportedDocument(languageId: string): boolean {
  return [
    "html",
    "typescript",
    "javascript",
    "typescriptreact",
    "javascriptreact",
  ].includes(languageId);
}
