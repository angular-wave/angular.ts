import * as vscode from "vscode";
import type { AngularTsCatalogEntry } from "../catalog/types";
import { builtInDirectives } from "../catalog/directives";
import { builtInFilters } from "../catalog/filters";
import { builtInInjectables } from "../catalog/injectables";
import { normalizeLookupName } from "../catalog/names";
import { parseAngularTsRegistrations } from "./registrationParser";

const SOURCE_GLOB = "**/*.{ts,tsx,js,jsx}";
const EXCLUDE_GLOB = "**/{node_modules,dist,.git,out,coverage}/**";

export class AngularTsWorkspaceIndex implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly customEntries = new Map<string, AngularTsCatalogEntry[]>();
  private readonly changeEmitter = new vscode.EventEmitter<void>();

  readonly onDidChange = this.changeEmitter.event;

  constructor() {
    const watcher = vscode.workspace.createFileSystemWatcher(SOURCE_GLOB);
    this.disposables.push(
      watcher,
      watcher.onDidCreate((uri) => void this.indexUri(uri)),
      watcher.onDidChange((uri) => void this.indexUri(uri)),
      watcher.onDidDelete((uri) => {
        this.customEntries.delete(uri.fsPath);
        this.changeEmitter.fire();
      }),
    );
  }

  async rebuild(): Promise<void> {
    this.customEntries.clear();
    const uris = await vscode.workspace.findFiles(SOURCE_GLOB, EXCLUDE_GLOB);
    await Promise.all(uris.map((uri) => this.indexUri(uri)));
    this.changeEmitter.fire();
  }

  getEntries(): AngularTsCatalogEntry[] {
    return [
      ...builtInDirectives,
      ...builtInFilters,
      ...builtInInjectables,
      ...Array.from(this.customEntries.values()).flat(),
    ];
  }

  getFilterEntries(): AngularTsCatalogEntry[] {
    return this.getEntries().filter((entry) => entry.kind === "filter");
  }

  findByKinds(
    name: string,
    kinds: readonly AngularTsCatalogEntry["kind"][],
  ): AngularTsCatalogEntry | undefined {
    const lookup = normalizeLookupName(name);
    return this.getEntries().find((entry) => {
      if (!kinds.includes(entry.kind)) return false;
      if (normalizeLookupName(entry.name) === lookup) return true;
      if (normalizeLookupName(entry.normalizedName) === lookup) return true;
      if (entry.htmlName && normalizeLookupName(entry.htmlName) === lookup) {
        return true;
      }
      return entry.aliases.some((alias) => normalizeLookupName(alias) === lookup);
    });
  }

  getDirectiveLikeEntries(): AngularTsCatalogEntry[] {
    return this.getEntries().filter(
      (entry) => entry.kind === "directive" || entry.kind === "component",
    );
  }

  getInjectableEntries(): AngularTsCatalogEntry[] {
    return this.getEntries().filter((entry) =>
      ["service", "factory", "provider", "constant"].includes(entry.kind),
    );
  }

  findByHtmlOrNormalizedName(name: string): AngularTsCatalogEntry | undefined {
    const lookup = normalizeLookupName(name);

    return this.getEntries().find((entry) => {
      if (entry.normalizedName === lookup) return true;
      if (entry.htmlName && normalizeLookupName(entry.htmlName) === lookup) {
        return true;
      }
      return entry.aliases.some((alias) => normalizeLookupName(alias) === lookup);
    });
  }

  summary(): string {
    const entries = this.getEntries();
    const counts = entries.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.kind] = (acc[entry.kind] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([kind, count]) => `${kind}: ${count}`)
      .join("\n");
  }

  dispose(): void {
    this.disposables.forEach((disposable) => disposable.dispose());
    this.changeEmitter.dispose();
  }

  private async indexUri(uri: vscode.Uri): Promise<void> {
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      const entries = parseAngularTsRegistrations(document.getText(), uri.fsPath);
      if (entries.length) {
        this.customEntries.set(uri.fsPath, entries);
      } else {
        this.customEntries.delete(uri.fsPath);
      }
      this.changeEmitter.fire();
    } catch {
      this.customEntries.delete(uri.fsPath);
    }
  }
}
