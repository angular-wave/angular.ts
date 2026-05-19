import * as path from "node:path";
import * as vscode from "vscode";
import type { AngularTsCatalogEntry, BindingInfo, SourceLocation } from "../catalog/types";
import { AngularTsWorkspaceIndex } from "../analyzer/workspaceIndex";
import { camelToKebab, normalizeLookupName } from "../catalog/names";
import {
  attributeNameAt,
  filterNameAt,
  getFilterCompletionContext,
  getAttributeCompletionContext,
  getTagCompletionContext,
  getOpenTagContextAt,
  isSupportedTemplateDocument,
} from "../templates/context";
import { findAngularTsReferenceAt } from "../templates/references";
import { findBindingForAttribute, findBindingOwnersForTag } from "../templates/bindings";
import { bindingToMarkdown, completionDetail, entryToMarkdown } from "./markdown";

const PROVIDER_SELECTOR: vscode.DocumentSelector = [
  { language: "html" },
  { language: "typescript" },
  { language: "javascript" },
  { language: "typescriptreact" },
  { language: "javascriptreact" },
];

export function registerDirectiveProviders(
  context: vscode.ExtensionContext,
  index: AngularTsWorkspaceIndex,
): vscode.Disposable[] {
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    PROVIDER_SELECTOR,
    new AngularTsCompletionProvider(index),
    "n",
    "g",
    "-",
    " ",
    "<",
  );

  const hoverProvider = vscode.languages.registerHoverProvider(
    PROVIDER_SELECTOR,
    new AngularTsHoverProvider(index),
  );

  const definitionProvider = vscode.languages.registerDefinitionProvider(
    PROVIDER_SELECTOR,
    new AngularTsDefinitionProvider(context, index),
  );

  return [completionProvider, hoverProvider, definitionProvider];
}

class AngularTsCompletionProvider implements vscode.CompletionItemProvider {
  constructor(private readonly index: AngularTsWorkspaceIndex) {}

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
    if (!isEnabled() || !isSupportedTemplateDocument(document.languageId)) {
      return undefined;
    }

    const textBeforeCursor = document
      .lineAt(position.line)
      .text.slice(0, position.character);
    const filterContext = getFilterCompletionContext(textBeforeCursor);
    if (filterContext) {
      const range = new vscode.Range(
        position.line,
        filterContext.rangeStart,
        position.line,
        position.character,
      );
      return this.index.getFilterEntries().map((entry) =>
        filterCompletionItem(entry, range),
      );
    }

    const tagContext = getTagCompletionContext(textBeforeCursor);
    if (tagContext) {
      const range = new vscode.Range(
        position.line,
        tagContext.rangeStart,
        position.line,
        position.character,
      );
      return this.index
        .getDirectiveLikeEntries()
        .flatMap((entry) => tagCompletionItemsForEntry(entry, range));
    }

    const context = getAttributeCompletionContext(textBeforeCursor);
    if (!context) return undefined;

    const range = new vscode.Range(
      position.line,
      context.rangeStart,
      position.line,
      position.character,
    );

    const items: vscode.CompletionItem[] = [];
    if (context.tagName) {
      for (const owner of findBindingOwnersForTag(
        context.tagName,
        context.attributeNames,
        this.index.getDirectiveLikeEntries(),
      )) {
        items.push(
          ...bindingCompletionItemsForEntry(
            owner.entry,
            owner.bindings,
            context.attributeNames,
            range,
          ),
        );
      }
    }

    items.push(
      ...this.index
        .getDirectiveLikeEntries()
        .flatMap((entry) => completionItemsForEntry(entry, range)),
    );

    return items;
  }
}

class AngularTsHoverProvider implements vscode.HoverProvider {
  constructor(private readonly index: AngularTsWorkspaceIndex) {}

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.Hover> {
    if (!isEnabled() || !isSupportedTemplateDocument(document.languageId)) {
      return undefined;
    }

    const found = targetAtPosition(document, position, this.index);
    if (!found) return undefined;

    return new vscode.Hover(found.markdown, found.range);
  }
}

class AngularTsDefinitionProvider implements vscode.DefinitionProvider {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly index: AngularTsWorkspaceIndex,
  ) {}

  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.Definition> {
    if (!isEnabled() || !isSupportedTemplateDocument(document.languageId)) {
      return undefined;
    }

    const templateUrl = templateUrlAtPosition(document, position);
    if (templateUrl) return templateUrl;

    const reference = findAngularTsReferenceAt(
      document.getText(),
      document.offsetAt(position),
      document.languageId,
    );
    if (reference) {
      const entry = this.index.findByKinds(reference.name, reference.targetKinds);
      if (entry?.source?.file) {
        const uri = resolveSourceUri(this.context, entry.source.file);
        return new vscode.Location(
          uri,
          new vscode.Position(entry.source.line ?? 0, entry.source.character ?? 0),
        );
      }
    }

    const found = targetAtPosition(document, position, this.index);
    if (!found?.source?.file) return undefined;

    const source = found.source;
    const uri = resolveSourceUri(this.context, source.file);
    const targetPosition = new vscode.Position(source.line ?? 0, source.character ?? 0);

    return new vscode.Location(uri, targetPosition);
  }
}

function tagCompletionItemsForEntry(
  entry: AngularTsCatalogEntry,
  range: vscode.Range,
): vscode.CompletionItem[] {
  if (
    entry.kind === "directive" &&
    !entry.allowedLocations?.includes("element")
  ) {
    return [];
  }

  if (entry.kind !== "component" && entry.kind !== "directive") return [];

  const label = entry.htmlName;
  if (!label) return [];

  const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Class);
  item.range = range;
  item.detail = completionDetail(entry);
  item.documentation = entryToMarkdown(entry);
  item.sortText = entry.kind === "component" ? `0_${label}` : `1_${label}`;
  item.insertText = label;
  return [item];
}

function completionItemsForEntry(
  entry: AngularTsCatalogEntry,
  range: vscode.Range,
): vscode.CompletionItem[] {
  if (entry.kind === "directive" && !entry.allowedLocations?.includes("attribute")) {
    return [];
  }

  const labels = entry.kind === "directive" ? entry.aliases : [entry.htmlName];

  return labels.filter(isDefined).map((label) => {
    const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Property);
    item.range = range;
    item.detail = completionDetail(entry);
    item.documentation = entryToMarkdown(entry);
    item.sortText = entry.kind === "directive" ? `0_${label}` : `1_${label}`;

    if (entry.valueRequired === false || entry.kind === "component") {
      item.insertText = label;
    } else {
      item.insertText = new vscode.SnippetString(`${label}="$1"`);
    }

    return item;
  });
}

function filterCompletionItem(
  entry: AngularTsCatalogEntry,
  range: vscode.Range,
): vscode.CompletionItem {
  const item = new vscode.CompletionItem(entry.name, vscode.CompletionItemKind.Function);
  item.range = range;
  item.detail = completionDetail(entry);
  item.documentation = entryToMarkdown(entry);
  item.sortText = `0_filter_${entry.name}`;
  return item;
}

function bindingCompletionItemsForEntry(
  entry: AngularTsCatalogEntry,
  bindings: BindingInfo[],
  existingAttributeNames: string[],
  range: vscode.Range,
): vscode.CompletionItem[] {
  const existing = new Set(existingAttributeNames.map(normalizeLookupName));

  return bindings
    .map((binding) => ({ binding, label: camelToKebab(binding.name) }))
    .filter(({ label }) => !existing.has(normalizeLookupName(label)))
    .map(({ binding, label }) => {
      const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Property);
      item.range = range;
      item.detail = `AngularTS ${entry.name} binding`;
      item.documentation = bindingToMarkdown(entry, binding);
      item.insertText = new vscode.SnippetString(`${label}="$1"`);
      item.sortText = `0_binding_${label}`;
      return item;
    });
}

function targetAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position,
  index: AngularTsWorkspaceIndex,
):
  | {
      markdown: vscode.MarkdownString;
      range: vscode.Range;
      source?: SourceLocation;
    }
  | undefined {
  const text = document.getText();
  const offset = document.offsetAt(position);
  const filter = filterNameAt(text, offset);
  if (filter) {
    const entry = index
      .getFilterEntries()
      .find((candidate) => normalizeLookupName(candidate.name) === normalizeLookupName(filter.name));
    if (!entry) return undefined;

    return {
      markdown: entryToMarkdown(entry),
      range: new vscode.Range(
        document.positionAt(filter.start),
        document.positionAt(filter.end),
      ),
      source: entry.source,
    };
  }

  const attr = attributeNameAt(text, offset);
  if (!attr) return undefined;

  const entry = index.findByHtmlOrNormalizedName(attr.name);
  const range = new vscode.Range(
    document.positionAt(attr.start),
    document.positionAt(attr.end),
  );

  if (entry) {
    return {
      markdown: entryToMarkdown(entry),
      range,
      source: entry.source,
    };
  }

  const tag = getOpenTagContextAt(text, offset);
  const bindingTarget = tag
    ? findBindingForAttribute(
        tag.tagName,
        attr.name,
        tag.attributeNames,
        index.getDirectiveLikeEntries(),
      )
    : undefined;
  if (!bindingTarget) return undefined;

  return {
    markdown: bindingToMarkdown(bindingTarget.owner, bindingTarget.binding),
    range,
    source: bindingTarget.binding.source,
  };
}

function templateUrlAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position,
): vscode.Location | undefined {
  if (!["typescript", "javascript", "typescriptreact", "javascriptreact"].includes(document.languageId)) {
    return undefined;
  }

  const text = document.getText();
  const offset = document.offsetAt(position);
  const templateUrlRe = /\btemplateUrl\s*:\s*(['"`])([^'"`]+)\1/g;
  let match: RegExpExecArray | null;

  while ((match = templateUrlRe.exec(text))) {
    const valueStart = match.index + match[0].indexOf(match[2]);
    const valueEnd = valueStart + match[2].length;
    if (offset < valueStart || offset > valueEnd) continue;

    const sourcePath = path.resolve(path.dirname(document.uri.fsPath), match[2]);
    return new vscode.Location(vscode.Uri.file(sourcePath), new vscode.Position(0, 0));
  }

  return undefined;
}

function resolveSourceUri(
  context: vscode.ExtensionContext,
  sourceFile: string,
): vscode.Uri {
  if (path.isAbsolute(sourceFile)) return vscode.Uri.file(sourceFile);

  const repoRoot = path.resolve(context.extensionPath, "..", "..");
  return vscode.Uri.file(path.resolve(repoRoot, sourceFile));
}

function isEnabled(): boolean {
  return vscode.workspace
    .getConfiguration("angularTs")
    .get<boolean>("enable", true);
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
