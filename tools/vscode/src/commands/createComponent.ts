import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import {
  generateComponentFiles,
  inferModuleName,
  type ComponentGeneratorOptions,
} from "./componentGenerator";

export async function createAngularTsComponent(): Promise<void> {
  const activeDocument = vscode.window.activeTextEditor?.document;
  const componentName = await vscode.window.showInputBox({
    title: "AngularTS: Create Component",
    prompt: "Component name",
    placeHolder: "userCard",
    validateInput: (value) =>
      value.trim() ? undefined : "Component name is required.",
  });
  if (!componentName) return;

  const inferredModuleName = activeDocument
    ? inferModuleName(activeDocument.getText())
    : undefined;
  const moduleName = await vscode.window.showInputBox({
    title: "AngularTS: Create Component",
    prompt: "AngularTS module name",
    value: inferredModuleName ?? "app",
    validateInput: (value) =>
      value.trim() ? undefined : "Module name is required.",
  });
  if (!moduleName) return;

  const directory = await pickDirectory(activeDocument);
  if (!directory) return;

  const template = await vscode.window.showQuickPick(
    [
      { label: "External template", value: "external" as const },
      { label: "Inline template", value: "inline" as const },
    ],
    { title: "AngularTS template style" },
  );
  if (!template) return;

  const extras = await vscode.window.showQuickPick(
    [
      { label: "CSS file", value: "css" },
      { label: "Test stub", value: "test" },
    ],
    {
      title: "Optional files",
      canPickMany: true,
    },
  );
  if (!extras) return;

  const language = inferLanguage(activeDocument);
  const options: ComponentGeneratorOptions = {
    componentName,
    moduleName,
    directory,
    language,
    template: template.value,
    includeCss: extras.some((item) => item.value === "css"),
    includeTest: extras.some((item) => item.value === "test"),
  };

  const files = generateComponentFiles(options);
  for (const file of files) {
    await fs.mkdir(path.dirname(file.path), { recursive: true });
    await fs.writeFile(file.path, file.content, { flag: "wx" });
  }

  const first = await vscode.workspace.openTextDocument(files[0].path);
  await vscode.window.showTextDocument(first);
}

async function pickDirectory(
  activeDocument: vscode.TextDocument | undefined,
): Promise<string | undefined> {
  const defaultUri = activeDocument
    ? vscode.Uri.file(path.dirname(activeDocument.uri.fsPath))
    : vscode.workspace.workspaceFolders?.[0]?.uri;
  const picked = await vscode.window.showOpenDialog({
    title: "Component destination directory",
    defaultUri,
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
  });

  return picked?.[0]?.fsPath;
}

function inferLanguage(
  activeDocument: vscode.TextDocument | undefined,
): "ts" | "js" {
  if (!activeDocument) return "ts";
  return activeDocument.languageId.includes("javascript") ||
    activeDocument.uri.fsPath.endsWith(".js")
    ? "js"
    : "ts";
}
