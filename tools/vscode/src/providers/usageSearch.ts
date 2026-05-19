import * as vscode from "vscode";
import { AngularTsWorkspaceIndex } from "../analyzer/workspaceIndex";
import type { AngularTsCatalogEntry } from "../catalog/types";
import { collectAngularTsUsages } from "../templates/usages";

const SEARCH_GLOB = "**/*.{html,ts,tsx,js,jsx}";
const EXCLUDE_GLOB = "**/{node_modules,dist,.git,out,coverage}/**";

export async function findAngularTsUsages(
  index: AngularTsWorkspaceIndex,
): Promise<void> {
  const target = await pickTarget(index);
  if (!target) return;

  const locations = await collectWorkspaceUsages(target);
  if (!locations.length) {
    vscode.window.showInformationMessage(
      `No AngularTS usages found for ${target.name}.`,
    );
    return;
  }

  await vscode.commands.executeCommand(
    "editor.action.showReferences",
    locations[0].uri,
    locations[0].range.start,
    locations,
  );
}

async function pickTarget(
  index: AngularTsWorkspaceIndex,
): Promise<AngularTsCatalogEntry | undefined> {
  const targets = index
    .getEntries()
    .filter((entry) =>
      [
        "directive",
        "component",
        "filter",
        "controller",
        "service",
        "factory",
        "provider",
        "constant",
      ].includes(entry.kind),
    )
    .filter((entry) => entry.source?.file)
    .sort((left, right) =>
      `${left.kind}:${left.name}`.localeCompare(`${right.kind}:${right.name}`),
    );

  const picked = await vscode.window.showQuickPick(
    targets.map((entry) => ({
      label: entry.name,
      description: entry.kind,
      detail: entry.source?.file,
      entry,
    })),
    { title: "Find AngularTS Usage" },
  );

  return picked?.entry;
}

async function collectWorkspaceUsages(
  target: AngularTsCatalogEntry,
): Promise<vscode.Location[]> {
  const uris = await vscode.workspace.findFiles(SEARCH_GLOB, EXCLUDE_GLOB);
  const locations: vscode.Location[] = [];

  for (const uri of uris) {
    const document = await vscode.workspace.openTextDocument(uri);
    const languageId = languageIdForUri(document);
    const usages = collectAngularTsUsages(
      document.getText(),
      languageId,
      target,
    );

    locations.push(
      ...usages.map(
        (usage) =>
          new vscode.Location(
            uri,
            new vscode.Range(
              document.positionAt(usage.start),
              document.positionAt(usage.end),
            ),
          ),
      ),
    );
  }

  return locations;
}

function languageIdForUri(document: vscode.TextDocument): string {
  if (document.languageId !== "plaintext") return document.languageId;

  const fileName = document.uri.fsPath.toLowerCase();
  if (fileName.endsWith(".html")) return "html";
  if (fileName.endsWith(".tsx")) return "typescriptreact";
  if (fileName.endsWith(".jsx")) return "javascriptreact";
  if (fileName.endsWith(".ts")) return "typescript";
  if (fileName.endsWith(".js")) return "javascript";
  return document.languageId;
}
