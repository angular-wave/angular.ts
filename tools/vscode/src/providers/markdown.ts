import * as vscode from "vscode";
import type { AngularTsCatalogEntry, BindingInfo } from "../catalog/types";
import { camelToKebab } from "../catalog/names";

export function entryToMarkdown(entry: AngularTsCatalogEntry): vscode.MarkdownString {
  const markdown = new vscode.MarkdownString(undefined, true);
  markdown.supportHtml = false;

  const label = entry.htmlName ?? entry.name;
  markdown.appendMarkdown(`**${label}**`);

  if (entry.kind !== "directive") {
    markdown.appendMarkdown(`  \nAngularTS ${entry.kind}`);
  }

  markdown.appendMarkdown(`\n\n${entry.description}`);

  if (entry.expressionKind && entry.expressionKind !== "none") {
    markdown.appendMarkdown(`\n\nExpression: \`${entry.expressionKind}\``);
  }

  if (entry.bindings?.length) {
    markdown.appendMarkdown("\n\nBindings:\n");
    for (const binding of entry.bindings) {
      markdown.appendMarkdown(`\n- \`${formatBinding(binding)}\``);
    }
  }

  if (entry.example) {
    markdown.appendCodeblock(entry.example, "html");
  }

  if (entry.source?.file) {
    markdown.appendMarkdown(`\n\nSource: \`${entry.source.file}\``);
  }

  return markdown;
}

export function completionDetail(entry: AngularTsCatalogEntry): string {
  if (entry.kind === "filter") return "AngularTS filter";
  if (entry.kind === "directive") return "AngularTS directive";
  return `AngularTS ${entry.kind}`;
}

export function bindingToMarkdown(
  owner: AngularTsCatalogEntry,
  binding: BindingInfo,
): vscode.MarkdownString {
  const markdown = new vscode.MarkdownString(undefined, true);
  markdown.appendMarkdown(`**${camelToKebab(binding.name)}**`);
  markdown.appendMarkdown(`\n\nAngularTS binding for \`<${owner.htmlName ?? owner.name}>\`.`);
  markdown.appendMarkdown(`\n\nMode: \`${binding.mode}${binding.optional ? "?" : ""}\``);
  if (binding.source?.file) {
    markdown.appendMarkdown(`\n\nSource: \`${binding.source.file}\``);
  }
  return markdown;
}

function formatBinding(binding: BindingInfo): string {
  return `${binding.name}: ${binding.mode}${binding.optional ? "?" : ""}`;
}
