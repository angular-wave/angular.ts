import * as path from "node:path";
import * as vscode from "vscode";
import { AngularTsWorkspaceIndex } from "../analyzer/workspaceIndex";
import { directiveAttributeHtmlName, normalizeLookupName } from "../catalog/names";
import { scanHtmlElements } from "../templates/htmlScanner";
import {
  suggestComponentBindingInsertion,
  suggestMissingDiTokensFromInlineArray,
} from "../templates/sourceQuickFixes";

const PROVIDER_SELECTOR: vscode.DocumentSelector = [
  { language: "html" },
  { language: "typescript" },
  { language: "javascript" },
  { language: "typescriptreact" },
  { language: "javascriptreact" },
];

export function registerCodeActionsProvider(
  index: AngularTsWorkspaceIndex,
): vscode.Disposable {
  return vscode.languages.registerCodeActionsProvider(
    PROVIDER_SELECTOR,
    new AngularTsCodeActionsProvider(index),
    {
      providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
    },
  );
}

class AngularTsCodeActionsProvider implements vscode.CodeActionProvider {
  constructor(private readonly index: AngularTsWorkspaceIndex) {}

  async provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range,
    context: vscode.CodeActionContext,
  ): Promise<vscode.CodeAction[]> {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== "AngularTS") continue;
      if (diagnostic.code === "missingTemplateUrl") {
        const action = createMissingTemplateUrlAction(document, diagnostic);
        if (action) actions.push(action);
      }
      if (diagnostic.code === "camelCaseDirectiveAttribute") {
        const action = createCamelCaseDirectiveAttributeAction(document, diagnostic);
        if (action) actions.push(action);
      }
      if (diagnostic.code === "diArityMismatch") {
        const action = createMissingDiTokenAction(document, diagnostic);
        if (action) actions.push(action);
      }
      if (diagnostic.code === "unknownBinding") {
        const action = await createMissingBindingAction(
          document,
          diagnostic,
          this.index,
        );
        if (action) actions.push(action);
      }
    }

    return actions;
  }
}

function createMissingTemplateUrlAction(
  document: vscode.TextDocument,
  diagnostic: vscode.Diagnostic,
): vscode.CodeAction | undefined {
  const templatePath = document.getText(diagnostic.range);
  if (!templatePath || /^[a-z]+:/i.test(templatePath)) return undefined;

  const resolvedPath = path.resolve(path.dirname(document.uri.fsPath), templatePath);
  const targetUri = vscode.Uri.file(resolvedPath);
  const action = new vscode.CodeAction(
    `Create AngularTS template '${templatePath}'`,
    vscode.CodeActionKind.QuickFix,
  );
  const edit = new vscode.WorkspaceEdit();

  edit.createFile(targetUri, { ignoreIfExists: true });
  edit.insert(targetUri, new vscode.Position(0, 0), "<section></section>\n");

  action.edit = edit;
  action.diagnostics = [diagnostic];
  action.isPreferred = true;

  return action;
}

async function createMissingBindingAction(
  document: vscode.TextDocument,
  diagnostic: vscode.Diagnostic,
  index: AngularTsWorkspaceIndex,
): Promise<vscode.CodeAction | undefined> {
  const attributeName = document.getText(diagnostic.range);
  const componentTag = findElementTagForAttributeRange(document, diagnostic.range);
  if (!attributeName || !componentTag) return undefined;

  const component = index.findByKinds(componentTag, ["component"]);
  if (
    !component?.source?.file ||
    component.source.line === undefined ||
    component.source.character === undefined
  ) {
    return undefined;
  }

  const sourceUri = vscode.Uri.file(component.source.file);
  const sourceDocument = await vscode.workspace.openTextDocument(sourceUri);
  const registrationOffset = sourceDocument.offsetAt(
    new vscode.Position(component.source.line, component.source.character),
  );
  const bindingName = normalizeLookupName(attributeName);
  const insertion = suggestComponentBindingInsertion(
    sourceDocument.getText(),
    registrationOffset,
    bindingName,
  );
  if (!insertion) return undefined;

  const action = new vscode.CodeAction(
    `Add binding '${bindingName}' to <${componentTag}>`,
    vscode.CodeActionKind.QuickFix,
  );
  const edit = new vscode.WorkspaceEdit();

  edit.insert(
    sourceUri,
    sourceDocument.positionAt(insertion.insertOffset),
    insertion.insertText,
  );

  action.edit = edit;
  action.diagnostics = [diagnostic];
  action.isPreferred = true;

  return action;
}

function createMissingDiTokenAction(
  document: vscode.TextDocument,
  diagnostic: vscode.Diagnostic,
): vscode.CodeAction | undefined {
  const arrayText = document.getText(diagnostic.range);
  const suggestion = suggestMissingDiTokensFromInlineArray(arrayText);
  if (!suggestion) return undefined;

  const label =
    suggestion.tokenNames.length === 1
      ? `Add missing DI token '${suggestion.tokenNames[0]}'`
      : `Add ${suggestion.tokenNames.length} missing DI tokens`;
  const action = new vscode.CodeAction(label, vscode.CodeActionKind.QuickFix);
  const edit = new vscode.WorkspaceEdit();
  const insertPosition = document.positionAt(
    document.offsetAt(diagnostic.range.start) + suggestion.insertOffset,
  );

  edit.insert(document.uri, insertPosition, suggestion.insertText);

  action.edit = edit;
  action.diagnostics = [diagnostic];
  action.isPreferred = true;

  return action;
}

function findElementTagForAttributeRange(
  document: vscode.TextDocument,
  range: vscode.Range,
): string | undefined {
  const offset = document.offsetAt(range.start);
  const element = scanHtmlElements(document.getText()).find((candidate) =>
    candidate.attributes.some(
      (attribute) => attribute.start <= offset && offset <= attribute.end,
    ),
  );

  return element?.tagName;
}

function createCamelCaseDirectiveAttributeAction(
  document: vscode.TextDocument,
  diagnostic: vscode.Diagnostic,
): vscode.CodeAction | undefined {
  const attributeName = document.getText(diagnostic.range);
  const htmlName = directiveAttributeHtmlName(attributeName);
  if (!attributeName || htmlName === attributeName) return undefined;

  const action = new vscode.CodeAction(
    `Convert AngularTS directive to '${htmlName}'`,
    vscode.CodeActionKind.QuickFix,
  );
  const edit = new vscode.WorkspaceEdit();

  edit.replace(document.uri, diagnostic.range, htmlName);

  action.edit = edit;
  action.diagnostics = [diagnostic];
  action.isPreferred = true;

  return action;
}
