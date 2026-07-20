import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/AngularTsWasm.cs", import.meta.url), "utf8");

const required = [
  "scope_resolve",
  "scope_get",
  "scope_set",
  "scope_apply",
  "scope_get_binary",
  "scope_set_binary",
  "scope_delete",
  "scope_sync",
  "scope_watch",
  "scope_unwatch",
  "scope_unbind",
  "buffer_ptr",
  "buffer_len",
  "buffer_free",
  "error_code",
  "error_clear",
  "ng_abi_alloc",
  "ng_abi_version",
  "AbiVersion = 3",
  "ng_abi_free",
  "ng_scope_on_bind",
  "ng_scope_on_unbind",
  "ng_scope_on_transaction",
  "public readonly struct Scope",
  "public readonly struct Watch",
  "internal readonly struct ResultBuffer",
  "public static Scope Named(string name)",
  "public readonly record struct ScopeUpdate",
  "JsonSerializer.Serialize",
  "JsonSerializer.Deserialize",
  "using System.Diagnostics.CodeAnalysis;",
  "using System.Runtime.InteropServices.JavaScript;",
  "using System.Runtime.Versioning;",
  "[RequiresUnreferencedCode(",
  "[SupportedOSPlatform(\"browser\")]",
  "[JSImport(\"scope_resolve\", \"angular_ts\")]",
  "[JSImport(\"buffer_free\", \"angular_ts\")]",
  "internal static partial class Host",
  "[JSExport]",
  "NgScopeOnBindJs",
  "NgAbiVersionJs",
  "NgScopeOnUnbindJs",
  "NgScopeOnTransactionJs",
];

const missing = required.filter((fragment) => !source.includes(fragment));

if (missing.length > 0) {
  console.error("C# Wasm facade is missing required ABI fragments:");
  for (const fragment of missing) {
    console.error(`- ${fragment}`);
  }
  process.exit(1);
}

console.log(`C# Wasm facade source check passed for ${required.length} fragments.`);
