import * as vscode from "vscode";
import { AngularTsWorkspaceIndex } from "./analyzer/workspaceIndex";
import { createAngularTsComponent } from "./commands/createComponent";
import { registerCodeActionsProvider } from "./providers/codeActionsProvider";
import { AngularTsDiagnosticsProvider } from "./providers/diagnosticsProvider";
import { registerDirectiveProviders } from "./providers/directiveProviders";
import { findAngularTsUsages } from "./providers/usageSearch";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const index = new AngularTsWorkspaceIndex();
  context.subscriptions.push(index);

  context.subscriptions.push(...registerDirectiveProviders(context, index));
  context.subscriptions.push(registerCodeActionsProvider(index));
  context.subscriptions.push(new AngularTsDiagnosticsProvider(index));
  registerCommands(context, index);

  await index.rebuild();
}

export function deactivate(): void {
  // Disposables are owned by VS Code through context.subscriptions.
}

function registerCommands(
  context: vscode.ExtensionContext,
  index: AngularTsWorkspaceIndex,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("angularTs.restartLanguageServer", async () => {
      await index.rebuild();
      vscode.window.showInformationMessage("AngularTS index rebuilt.");
    }),
    vscode.commands.registerCommand("angularTs.rebuildIndex", async () => {
      await index.rebuild();
      vscode.window.showInformationMessage("AngularTS index rebuilt.");
    }),
    vscode.commands.registerCommand("angularTs.showIndex", async () => {
      const document = await vscode.workspace.openTextDocument({
        language: "plaintext",
        content: index.summary() || "No AngularTS symbols indexed.",
      });
      await vscode.window.showTextDocument(document, { preview: true });
    }),
    vscode.commands.registerCommand("angularTs.findUsage", async () => {
      await findAngularTsUsages(index);
    }),
    vscode.commands.registerCommand("angularTs.createComponent", async () => {
      await createAngularTsComponent();
    }),
  );
}
