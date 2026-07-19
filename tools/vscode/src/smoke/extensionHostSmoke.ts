import assert from "node:assert/strict";
import * as vscode from "vscode";

type CompletionListLike = {
  items?: vscode.CompletionItem[];
};

export async function run(): Promise<void> {
  const extension = vscode.extensions.all.find(
    (candidate) => candidate.packageJSON?.name === "angular-ts-vscode",
  );
  assert.ok(extension, "AngularTS VS Code extension is available.");

  await extension.activate();
  await vscode.commands.executeCommand("angularTs.rebuildIndex");

  const workspace = vscode.workspace.workspaceFolders?.[0];
  assert.ok(workspace, "Smoke fixture workspace is open.");

  const htmlUri = vscode.Uri.joinPath(workspace.uri, "index.html");
  const document = await vscode.workspace.openTextDocument(htmlUri);
  await vscode.window.showTextDocument(document);

  const routeLabels = await completionLabelsAt(
    document,
    document.getText().indexOf("admin.") + "admin.".length,
  );
  assert.ok(
    routeLabels.includes("admin.profile"),
    "Route-name completion includes indexed route names.",
  );
  assert.ok(
    !routeLabels.includes("reports.**"),
    "Route-name completion excludes lazy route boundaries.",
  );

  const paramLabels = await completionLabelsAt(
    document,
    document.getText().indexOf("{  }") + 3,
  );
  assert.ok(
    paramLabels.includes("userId"),
    "Route-param completion includes required params.",
  );
  assert.ok(
    paramLabels.includes("tab"),
    "Route-param completion includes optional params.",
  );
}

async function completionLabelsAt(
  document: vscode.TextDocument,
  offset: number,
): Promise<string[]> {
  assert.ok(offset >= 0, "Completion marker exists in smoke fixture.");

  const completions = await vscode.commands.executeCommand<
    vscode.CompletionList | CompletionListLike | undefined
  >(
    "vscode.executeCompletionItemProvider",
    document.uri,
    document.positionAt(offset),
  );
  const items = Array.isArray(completions)
    ? completions
    : completions?.items ?? [];

  return items.map((item) =>
    typeof item.label === "string" ? item.label : item.label.label,
  );
}
