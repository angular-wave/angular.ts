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

  if (entry.signature) {
    markdown.appendMarkdown(`\n\nSignature: \`${entry.signature}\``);
  }

  if (entry.eventType) {
    markdown.appendMarkdown(`\n\nEvent: \`$event: ${entry.eventType}\``);
  }

  if (entry.requiredCompanionAttributes?.length) {
    markdown.appendMarkdown(
      `\n\nRequires: ${entry.requiredCompanionAttributes
        .map((attribute) => `\`${attribute}\``)
        .join(", ")}`,
    );
  }

  if (entry.conflictingAttributes?.length) {
    markdown.appendMarkdown(
      `\n\nConflicts with: ${entry.conflictingAttributes
        .map((attribute) => `\`${attribute}\``)
        .join(", ")}`,
    );
  }

  if (entry.bindings?.length) {
    markdown.appendMarkdown("\n\nBindings:\n");
    for (const binding of entry.bindings) {
      markdown.appendMarkdown(`\n- \`${formatBinding(binding)}\``);
    }
  }

  const details = metadataDetails(entry);
  if (details.length) {
    markdown.appendMarkdown("\n\nDetails:\n");
    for (const detail of details) markdown.appendMarkdown(`\n- ${detail}`);
  }

  const examples = entry.examples?.length ? entry.examples : entry.example ? [entry.example] : [];
  if (examples.length) {
    for (const example of examples) {
      markdown.appendCodeblock(example, "html");
    }
  }

  if (entry.source?.file) {
    markdown.appendMarkdown(`\n\nSource: \`${entry.source.file}\``);
  }

  return markdown;
}

export function completionDetail(entry: AngularTsCatalogEntry): string {
  if (entry.kind === "filter") {
    return entry.signature ? `AngularTS filter: ${entry.signature}` : "AngularTS filter";
  }
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

function metadataDetails(entry: AngularTsCatalogEntry): string[] {
  const details: string[] = [];

  if (entry.controller) details.push(`Controller: \`${entry.controller}\``);
  if (entry.controllerAs) details.push(`Controller alias: \`${entry.controllerAs}\``);
  if (entry.templateUrl) details.push(`Template URL: \`${entry.templateUrl}\``);
  if (entry.template) details.push("Inline template");
  if (entry.eventType) details.push(`Event object: \`$event: ${entry.eventType}\``);
  if (entry.require?.length) {
    details.push(
      `Requires controllers: ${entry.require
        .map((value) => `\`${value}\``)
        .join(", ")}`,
    );
  }

  return details;
}
