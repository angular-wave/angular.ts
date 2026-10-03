import { nativeElements } from "../generated/NativeElementCatalog.ts";

export interface NativeElementPropertyContract {
  readonly name: string;
  readonly type: NativeElementPropertyType;
  readonly nullable?: boolean;
  readonly required?: boolean;
  readonly default?: unknown;
}

export type NativeElementPropertyType =
  | "BOOLEAN"
  | "COLOR"
  | "FLOAT"
  | "INTEGER"
  | "JSON"
  | "STRING"
  | "STRING_LIST";

export interface NativeElementMethodContract {
  readonly name: string;
}

export interface NativeElementEventContract {
  readonly name: string;
  readonly payload?: string;
}

export interface NativeElementContract {
  readonly name: string;
  readonly aliases?: readonly string[];
  readonly properties: readonly NativeElementPropertyContract[];
  readonly methods: readonly NativeElementMethodContract[];
  readonly events: readonly NativeElementEventContract[];
}

interface RegisteredNativeElement {
  readonly contract: NativeElementContract;
  readonly owner: string;
  readonly builtIn: boolean;
}

export class NativeElementContractRegistry {
  private readonly entries = new Map<string, RegisteredNativeElement>();
  private readonly canonicalByAlias = new Map<string, string>();

  constructor() {
    for (const contract of Object.values(nativeElements)) {
      this.add(contract, "core", true);
    }
  }

  register(contract: NativeElementContract, owner: string): () => void {
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/u.test(contract.name)) {
      throw new TypeError("Custom native element names must contain a hyphen");
    }
    if (!owner) throw new TypeError("Native element owner is required");
    this.add(contract, owner, false);
    return () => {
      const entry = this.entries.get(contract.name);
      if (entry?.owner !== owner) return;
      this.entries.delete(contract.name);
      for (const alias of contract.aliases ?? []) this.canonicalByAlias.delete(alias);
    };
  }

  get(name: string): NativeElementContract | undefined {
    const canonical = this.canonicalByAlias.get(name) ?? name;
    return this.entries.get(canonical)?.contract;
  }

  has(name: string): boolean {
    return this.get(name) !== undefined;
  }

  names(): readonly string[] {
    return [...this.entries.keys()];
  }

  removeOwner(owner: string): void {
    for (const [name, entry] of [...this.entries]) {
      if (entry.owner !== owner || entry.builtIn) continue;
      this.entries.delete(name);
      for (const alias of entry.contract.aliases ?? []) {
        this.canonicalByAlias.delete(alias);
      }
    }
  }

  private add(
    contract: NativeElementContract,
    owner: string,
    builtIn: boolean,
  ): void {
    validateContract(contract);
    const names = [contract.name, ...(contract.aliases ?? [])];
    if (new Set(names).size !== names.length) {
      throw new TypeError(`Duplicate native element name: ${contract.name}`);
    }
    for (const name of names) {
      if (this.entries.has(name) || this.canonicalByAlias.has(name)) {
        throw new TypeError(`Duplicate native element name: ${name}`);
      }
    }
    this.entries.set(contract.name, { contract, owner, builtIn });
    for (const alias of contract.aliases ?? []) {
      this.canonicalByAlias.set(alias, contract.name);
    }
  }
}

function validateContract(contract: NativeElementContract): void {
  unique(contract.properties.map((value) => value.name), "property");
  unique(contract.methods.map((value) => value.name), "method");
  unique(contract.events.map((value) => value.name), "event");
  unique(contract.aliases ?? [], "alias");
  const validTypes = new Set([
    "BOOLEAN",
    "COLOR",
    "FLOAT",
    "INTEGER",
    "JSON",
    "STRING",
    "STRING_LIST",
  ]);
  for (const property of contract.properties) {
    if (!validTypes.has(property.type)) {
      throw new TypeError(`Invalid native element property type: ${property.type}`);
    }
  }
}

function unique(values: readonly string[], kind: string): void {
  if (values.some((value) => !/^[A-Za-z][A-Za-z0-9-]*$/u.test(value))) {
    throw new TypeError(`Invalid native element ${kind}`);
  }
  if (new Set(values).size !== values.length) {
    throw new TypeError(`Duplicate native element ${kind}`);
  }
}
