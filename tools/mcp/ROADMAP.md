# AngularTS MCP Server Roadmap

## Goal

Build a production-ready Model Context Protocol server that lets development
tools inspect and understand AngularTS projects without coupling the server to
VS Code or the browser runtime.

The server ships as the independent npm package
`@angular-wave/mcp-server` with the executable `angular-ts-mcp`. Local clients
start it over `stdio`. Remote deployment is optional and uses Streamable HTTP.

Production-ready means:

- a client can discover AngularTS modules, registrations, directives,
  components, filters, routes, injectable tokens, templates, and diagnostics;
- every result is derived from the same analysis engine used by the VS Code
  extension;
- local access is confined to explicitly allowed workspace roots;
- read-only operation is the default and requires no application changes;
- write operations are separately enabled, narrowly scoped, and atomic;
- `stdio` and Streamable HTTP follow the supported MCP protocol revisions;
- malformed, cancelled, oversized, concurrent, and hostile requests fail
  predictably;
- package contents, provenance, documentation, and upgrade behavior are
  verified before publication.

## Protocol Baseline

Use only the official MCP specification and TypeScript SDK as protocol sources:

- [MCP specification](https://modelcontextprotocol.io/specification/2026-07-28)
- [TypeScript SDK server guide](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md)
- [TypeScript SDK protocol migration guide](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/migration/support-2026-07-28.md)

The first release must negotiate both the current `2026-07-28` protocol and
the previous stable `2025-11-25` protocol. Do not hand-roll JSON-RPC framing,
protocol negotiation, schemas, or transport behavior.

Use the modular official SDK packages:

- `@modelcontextprotocol/server` for server primitives and `stdio`;
- `@modelcontextprotocol/node` for the Node Streamable HTTP transport;
- `@modelcontextprotocol/express` only if its protected HTTP app removes more
  security code than it adds;
- Zod 4 for tool input and structured-output schemas.

Pin exact dependency versions in `tools/mcp/package-lock.json`. SDK upgrades
must pass the complete protocol matrix before merging.

## Product Boundary

The MCP server is developer tooling, not part of the AngularTS browser bundle.

- `tools/language-service/` owns editor-neutral project indexing, catalogs,
  template analysis, diagnostics, references, and generation plans.
- `tools/vscode/` adapts the language service to VS Code APIs.
- `tools/mcp/` adapts the language service to MCP resources and tools.
- `src/` remains free of MCP dependencies.
- The VS Code extension and MCP server may be installed independently.
- Neither tool starts or controls the other.

The first release does not connect to a running browser application. Runtime
inspection can be added later through an explicit AngularTS debugging bridge;
it must not expand filesystem or process authority implicitly.

## Initial Public Surface

### Resources

Resources provide stable, cacheable project facts without side effects.

| URI | Purpose |
| --- | --- |
| `angularts://project/summary` | Project roots, configuration, discovered modules, and index status. |
| `angularts://catalog/directives` | Built-in and project directives with names, restrictions, bindings, and source locations. |
| `angularts://catalog/components` | Components, bindings, controllers, templates, and source locations. |
| `angularts://catalog/filters` | Built-in and project filters. |
| `angularts://catalog/injectables` | Built-in and project DI tokens and their definitions. |
| `angularts://catalog/routes` | Route names, parameters, components, resolves, and source locations. |
| `angularts://diagnostics` | Current bounded workspace diagnostics. |

Resource payloads use versioned JSON schemas. Large catalogs support filters
or pagination rather than returning an unbounded workspace snapshot.

### Read-only tools

| Tool | Purpose |
| --- | --- |
| `inspect_project` | Return the project summary and index health. |
| `list_symbols` | List bounded symbols by kind, module, and query. |
| `get_symbol` | Return one exact registration and its public contract. |
| `find_usages` | Find bounded template and source usages of a symbol. |
| `diagnose_template` | Diagnose supplied template text or one allowed workspace file. |
| `explain_directive` | Explain a built-in or project directive and show valid usage. |
| `inspect_route` | Resolve one route and report parameters, component, template, and dependencies. |
| `inspect_dependency` | Explain where an injectable is registered and consumed. |

Every tool has:

- a closed input schema;
- a closed structured-output schema;
- a concise text representation for clients that do not consume structured
  output;
- stable machine-readable error codes;
- explicit result limits and truncation metadata;
- cancellation and deadline handling;
- correct read-only/idempotent annotations.

### Optional write tools

Write tools are not part of the first production gate. Add them only after the
read-only server is released and observed in real clients.

- `plan_component`: return proposed files without writing.
- `create_component`: create a component from a previously returned plan.
- `apply_template_fix`: apply one diagnostic fix identified by a stable edit
  token.

Writes require `--allow-write`, remain inside an allowed root, reject existing
files unless replacement is explicitly requested, write through temporary
files followed by atomic rename, and return an exact change manifest. Tool
annotations and client confirmation are useful UX, but server-side policy is
the authority.

## Security Invariants

- Resolve and canonicalize every workspace root at startup.
- Reject relative roots, nonexistent roots, duplicate roots, and filesystem
  roots unless an explicit unsafe development flag is supplied.
- Resolve every requested path against an allowed root before reading.
- Reject `..` traversal, absolute-path injection, alternate separators, NUL
  bytes, URI ambiguity, and symlinks escaping an allowed root.
- Never read `.git`, `node_modules`, build outputs, coverage, private keys,
  credentials, `.env*`, or user-configured deny patterns.
- Do not execute shell commands, package scripts, generated code, templates,
  TypeScript, or project configuration as code.
- Do not make outbound network requests while indexing or handling tools.
- Bound file size, file count, directory depth, parse time, result count,
  response bytes, concurrent requests, and cache memory.
- Redact secrets, authorization headers, stack traces, and paths outside the
  configured roots from errors and logs.
- Send protocol messages only to `stdout` in `stdio` mode. Send diagnostics
  only to `stderr` or an injected logger.
- Handle `SIGINT`, `SIGTERM`, closed stdin, cancellation, and transport close
  without orphaned work or partial writes.

Streamable HTTP additionally requires:

- explicit `--http`; never listen on a network socket by default;
- `127.0.0.1` as the default bind address;
- Host-header and DNS-rebinding protection;
- strict Origin and CORS allowlists;
- request-body and header limits;
- authentication before MCP request parsing;
- OAuth resource-server metadata and bearer-token validation for non-loopback
  deployments;
- TLS at the process or trusted reverse proxy boundary;
- audience, issuer, expiry, and scope validation;
- bounded sessions, idle expiry, rate limits, and graceful session cleanup;
- no token forwarding to AngularTS projects or unrelated upstream services.

## Service Levels

Measure against the maintained medium fixture after a warm index:

- startup to ready: p95 below 2 seconds;
- incremental re-index after one file change: p95 below 250 ms;
- `get_symbol` and `explain_directive`: p95 below 100 ms;
- bounded workspace search: p95 below 1 second;
- idle resident memory: below 150 MB;
- no unbounded growth after 10,000 mixed requests and file changes;
- cancellation observed within 100 ms for cancellable analysis work.

Record fixture size and machine characteristics with benchmark results. These
budgets are gates, not comparisons with developer laptops.

## Repository Shape

```text
tools/
  language-service/
    package.json
    package-lock.json
    tsconfig.json
    src/
      catalog/
      diagnostics/
      generation/
      index/
      templates/
    test/
      fixtures/
  mcp/
    package.json
    package-lock.json
    tsconfig.json
    README.md
    SECURITY.md
    CHANGELOG.md
    src/
      cli.ts
      config.ts
      server.ts
      errors.ts
      logging.ts
      limits.ts
      resources/
      security/
      tools/
      transports/
    test/
      contract/
      fixtures/
      security/
      smoke/
```

Do not copy the VS Code analyzer into the MCP package. Move editor-neutral code
once, keep its tests with it, and leave only VS Code filesystem/event adapters
inside `tools/vscode`.

## Slice 0: Contract And Threat Model

Status: `[x]`

Files:

- `tools/mcp/ROADMAP.md`
- `tools/mcp/SECURITY.md`
- `tools/mcp/docs/protocol-support.md`
- `tools/mcp/docs/tool-contracts.md`

Tasks:

- [x] Define supported Node versions and operating systems.
- [x] Record protocol revisions, SDK packages, and upgrade policy.
- [x] Freeze resource URIs, tool names, input schemas, output schemas, limits,
      and error codes for the first release.
- [x] Document trust boundaries for clients, workspaces, HTTP callers, project
      files, symlinks, generated files, and logs.
- [x] Decide whether HTTP ships in the first release or remains experimental;
      `stdio` remains mandatory either way.
- [x] State that the first production release is read-only.
- [x] Review the threat model against traversal, exfiltration, prompt content,
      denial of service, DNS rebinding, confused deputy behavior, and poisoned
      workspace files.

Gate:

```sh
make mcp-contract-check
```

Done when every public operation and security boundary has an executable schema
or testable invariant before handler implementation begins.

## Slice 1: Shared Language Service

Status: `[ ]`

Files:

- `tools/language-service/package.json`
- `tools/language-service/tsconfig.json`
- `tools/language-service/src/**`
- `tools/language-service/test/**`
- `tools/vscode/src/**`
- `tools/vscode/package.json`

Tasks:

- [ ] Move catalogs, registration parsing, HTML scanning, expression parsing,
      route analysis, diagnostics, references, usages, and component generation
      planning into `tools/language-service`.
- [ ] Replace direct `vscode` filesystem and document dependencies with small
      interfaces for files, URIs, clocks, cancellation, and change events.
- [ ] Keep VS Code display types, diagnostics conversion, commands, and
      extension lifecycle in `tools/vscode`.
- [ ] Expose one `AngularTsProject` API for initial indexing, incremental
      updates, catalogs, diagnostics, references, and disposal.
- [ ] Preserve all existing VS Code behavior and fixture coverage.
- [ ] Add package-boundary tests that forbid `vscode` imports from the shared
      package and MCP imports from both AngularTS `src/` and the shared package.

Gates:

```sh
make language-service-check
make vscode-test
make vscode-smoke
```

Done when VS Code consumes the extracted package and all existing editor tests
pass without duplicate analyzers.

## Slice 2: Package And Server Foundation

Status: `[ ]`

Files:

- `tools/mcp/package.json`
- `tools/mcp/package-lock.json`
- `tools/mcp/tsconfig.json`
- `tools/mcp/src/cli.ts`
- `tools/mcp/src/config.ts`
- `tools/mcp/src/server.ts`
- `tools/mcp/src/errors.ts`
- `tools/mcp/src/logging.ts`

Tasks:

- [ ] Create the ESM package with strict TypeScript and Node engine constraints.
- [ ] Export the `angular-ts-mcp` executable and no accidental library surface.
- [ ] Build a fresh server instance per negotiated connection.
- [ ] Validate CLI arguments and environment configuration through one closed
      schema.
- [ ] Implement `--root`, repeated roots, `--config`, `--log-level`,
      `--transport`, `--version`, and `--help`.
- [ ] Default to `stdio`, read-only mode, no network, and the current directory
      as the sole root.
- [ ] Normalize internal failures into stable public error codes.
- [ ] Keep logs structured, redactable, injectable, and off `stdout`.
- [ ] Add clean startup, shutdown, disposal, and exit-code behavior.

Gates:

```sh
make mcp-build
make mcp-test
node tools/mcp/dist/cli.js --help
node tools/mcp/dist/cli.js --version
```

## Slice 3: Workspace Isolation And Indexing

Status: `[ ]`

Files:

- `tools/mcp/src/project/**`
- `tools/mcp/src/security/paths.ts`
- `tools/mcp/src/security/content.ts`
- `tools/mcp/src/limits.ts`
- `tools/mcp/test/security/**`

Tasks:

- [ ] Implement canonical root and path authorization before file access.
- [ ] Add default ignore rules plus additive user deny patterns.
- [ ] Index supported HTML, JavaScript, TypeScript, and configuration files
      without evaluating them.
- [ ] Make initial and incremental indexing cancellable and bounded.
- [ ] Deduplicate concurrent index work and invalidate caches deterministically.
- [ ] Return index health, skipped-file counts, truncation, and parse failures
      without leaking excluded content.
- [ ] Test traversal and symlink escapes on Linux, macOS semantics, and Windows
      path forms.
- [ ] Test hostile file names, oversized files, deep trees, cyclic symlinks,
      rapid changes, deletion during reads, and permission failures.

Gate:

```sh
make mcp-security-test
```

## Slice 4: Resources

Status: `[ ]`

Files:

- `tools/mcp/src/resources/index.ts`
- `tools/mcp/src/resources/project.ts`
- `tools/mcp/src/resources/catalog.ts`
- `tools/mcp/src/resources/diagnostics.ts`
- `tools/mcp/test/contract/resources.test.ts`

Tasks:

- [ ] Implement the resource URIs defined in this roadmap.
- [ ] Provide deterministic MIME types and versioned JSON payloads.
- [ ] Sort all unordered data before serialization.
- [ ] Include source locations only as root-relative paths and line/column
      positions.
- [ ] Add pagination or query templates for potentially large catalogs.
- [ ] Publish resource-change notifications only when the negotiated protocol
      and client capabilities support them.
- [ ] Verify schemas, empty projects, malformed projects, multi-root projects,
      cancellation, and truncation.

Gate:

```sh
make mcp-resource-test
```

## Slice 5: Read-only Tools

Status: `[ ]`

Files:

- `tools/mcp/src/tools/index.ts`
- `tools/mcp/src/tools/inspect-project.ts`
- `tools/mcp/src/tools/symbols.ts`
- `tools/mcp/src/tools/usages.ts`
- `tools/mcp/src/tools/diagnostics.ts`
- `tools/mcp/src/tools/directives.ts`
- `tools/mcp/src/tools/routes.ts`
- `tools/mcp/src/tools/dependencies.ts`
- `tools/mcp/test/contract/tools.test.ts`

Tasks:

- [ ] Implement every read-only tool in the frozen contract.
- [ ] Validate inputs before project lookup or filesystem access.
- [ ] Validate structured output before returning it to the SDK.
- [ ] Distinguish invalid input, unauthorized paths, missing symbols, stale
      indexes, truncation, cancellation, deadline, and internal failure.
- [ ] Add deterministic ordering and stable source-location formatting.
- [ ] Ensure tool descriptions tell clients when to use resources instead.
- [ ] Verify annotations, schemas, text fallback, structured output, errors,
      cancellation, result limits, and concurrent calls.

Gate:

```sh
make mcp-tool-test
```

## Slice 6: Local `stdio` Transport

Status: `[ ]`

Files:

- `tools/mcp/src/transports/stdio.ts`
- `tools/mcp/test/contract/stdio.test.ts`
- `tools/mcp/test/smoke/client.mjs`

Tasks:

- [ ] Serve through the SDK connection-pinned `serveStdio` entry.
- [ ] Negotiate the current and previous stable protocol revisions.
- [ ] Spawn the packaged executable from the official SDK client in tests.
- [ ] Prove that stdout contains protocol frames only.
- [ ] Send logs to stderr and test log-level filtering.
- [ ] Cover initialization, discovery, resources, tool calls, malformed
      messages, cancellation, closed stdin, signals, and graceful shutdown.
- [ ] Run scripted smoke clients against the packed npm tarball, not source.
- [ ] Provide tested configuration examples for VS Code, Codex, Claude Code,
      Cursor, and generic command-based MCP hosts.

Gates:

```sh
make mcp-stdio-test
make mcp-smoke
```

## Slice 7: Streamable HTTP

Status: `[ ]`

Do not begin this slice until the read-only `stdio` server passes its production
gate.

Files:

- `tools/mcp/src/transports/http.ts`
- `tools/mcp/src/security/auth.ts`
- `tools/mcp/src/security/http.ts`
- `tools/mcp/test/contract/http.test.ts`
- `tools/mcp/test/security/http.test.ts`

Tasks:

- [ ] Serve one `/mcp` endpoint with the official per-request HTTP handler.
- [ ] Decide and document stateless or stateful operation; default to stateless
      unless a shipped feature requires resumability.
- [ ] Implement Host and Origin validation, DNS-rebinding protection, CORS,
      body limits, request deadlines, concurrency limits, and rate limits.
- [ ] Require authenticated HTTPS for any non-loopback bind.
- [ ] Validate OAuth issuer, audience, signature, expiry, and MCP scopes.
- [ ] Isolate request identity and authorization across concurrent clients.
- [ ] Close sessions and in-flight work during shutdown.
- [ ] Test both protocol revisions, JSON and SSE responses, cancellation,
      reconnect behavior where applicable, invalid sessions, forged headers,
      token failures, and resource exhaustion.

Gates:

```sh
make mcp-http-test
make mcp-security-test
```

## Slice 8: Optional Write Operations

Status: `[ ]`

This slice is post-1.0 unless real usage demonstrates that generation through
MCP is necessary.

Tasks:

- [ ] Add `--allow-write` with an unmistakable startup log and server metadata.
- [ ] Implement plan-first generation with expiring, content-bound edit tokens.
- [ ] Reuse language-service generation plans rather than VS Code commands.
- [ ] Revalidate roots, file hashes, conflicts, and policy immediately before
      writing.
- [ ] Apply multi-file writes transactionally or leave the workspace unchanged.
- [ ] Return created, changed, skipped, and conflicted files.
- [ ] Add crash, cancellation, race, symlink-swap, and rollback tests.

Gate:

```sh
make mcp-write-test
```

## Slice 9: Operations And Performance

Status: `[ ]`

Files:

- `tools/mcp/src/metrics.ts`
- `tools/mcp/test/benchmark/**`
- `tools/mcp/docs/operations.md`

Tasks:

- [ ] Emit structured lifecycle, request, duration, result-size, cancellation,
      cache, and failure events without logging source content by default.
- [ ] Add request correlation IDs that cannot be supplied as arbitrary log
      fields by workspace content.
- [ ] Implement bounded caches with observable hit, eviction, and memory data.
- [ ] Add leak, soak, concurrency, cold-start, warm-index, and incremental-index
      benchmarks.
- [ ] Enforce the service-level budgets in CI on a controlled fixture.
- [ ] Document health checks, shutdown, reverse-proxy requirements, upgrades,
      incident logging, and rollback.

Gates:

```sh
make mcp-benchmark
make mcp-soak-test
```

## Slice 10: Documentation And Client Experience

Status: `[ ]`

Files:

- `tools/mcp/README.md`
- `tools/mcp/SECURITY.md`
- `docs/content/docs/integrations/mcp.md`
- `docs/public-feature-docs.json`
- client configuration fixtures under `tools/mcp/test/fixtures/clients/`

Tasks:

- [ ] Explain installation, local configuration, roots, read-only behavior,
      limits, logs, updates, and removal for a developer who has never used MCP.
- [ ] Provide copyable configurations validated as JSON or TOML where relevant.
- [ ] Explain every resource and tool with one practical AngularTS task.
- [ ] Document why the server is separate from the VS Code extension.
- [ ] Document remote deployment only after HTTP passes its production gate.
- [ ] Keep optional programmatic views and Android APIs out of the introduction;
      expose them through normal project and API discovery.
- [ ] Add troubleshooting for startup, protocol mismatch, missing roots,
      excluded files, large projects, authentication, and client logs.
- [ ] Add a security-reporting path and supported-version policy.
- [ ] Test every command and configuration snippet.

Gates:

```sh
make docs-runtime-api-check
make docs-links-check
make docs-snippets-check
make mcp-docs-test
```

## Slice 11: Packaging, CI, And Release

Status: `[ ]`

Files:

- `Makefile`
- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`
- `RELEASE.md`
- `tools/mcp/package.json`
- `tools/mcp/CHANGELOG.md`

Tasks:

- [ ] Add `ensure-mcp-deps`, `mcp-build`, `mcp-test`, `mcp-contract-check`,
      `mcp-security-test`, `mcp-smoke`, and `mcp-package-check` targets.
- [ ] Include deterministic MCP build, test, and package checks in root
      `make check` and hosted CI.
- [ ] Test the supported Node and operating-system matrix.
- [ ] Run dependency review, license checks, secret scanning, static analysis,
      and a production dependency audit.
- [ ] Verify `npm pack --dry-run` contains only compiled code, schemas,
      documentation, license, and required metadata.
- [ ] Install the tarball in a clean directory and execute the official-client
      smoke suite against its binary.
- [ ] Generate an SBOM and publish with npm provenance through OIDC trusted
      publishing.
- [ ] Keep MCP package versioning explicit. Synchronize with AngularTS releases
      only when shared contracts change; do not publish empty versions.
- [ ] Add immutable post-publication validation from a clean npm consumer.
- [ ] Add release rollback guidance; never overwrite a published npm version.

Gates:

```sh
make mcp-package-check
make check
make test
make release-check
```

## Slice 12: Production Acceptance

Status: `[ ]`

- [ ] All earlier mandatory slices are complete; optional writes may remain
      deferred.
- [ ] No MCP dependency is present in the AngularTS browser runtime.
- [ ] VS Code and MCP use one shared language-service implementation.
- [ ] The packed server passes current and previous protocol revisions over
      `stdio` on every supported platform.
- [ ] If HTTP is advertised as stable, its authentication and adversarial
      security suites pass in hosted CI.
- [ ] Every resource and tool has schema, behavior, cancellation, limit, and
      error tests.
- [ ] Traversal, symlink escape, secret-file, stdout-corruption, denial-of-
      service, and log-redaction tests pass.
- [ ] Benchmarks and soak tests satisfy the recorded budgets.
- [ ] Documentation configurations are executable and tested.
- [ ] The npm tarball installs and runs from a clean consumer.
- [ ] Provenance, SBOM, license, changelog, and security policy are published.
- [ ] A release candidate has been exercised by at least two independent MCP
      hosts before `1.0.0`.

Final commands:

```sh
make mcp-package-check
make check
make test
make coverage-check
```

The roadmap is complete only when every mandatory checkbox is backed by a
passing automated gate or an attached release artifact. Remove this roadmap
after production acceptance and move durable operational guidance into the MCP
README, security policy, and release documentation.

## Execution Order

1. Contract and threat model.
2. Shared language service extraction.
3. Package and server foundation.
4. Workspace isolation and indexing.
5. Resources.
6. Read-only tools.
7. Local `stdio` transport.
8. Operations, performance, and documentation.
9. Packaging, CI, and release.
10. Production acceptance.
11. Streamable HTTP, only when remote deployment is required.
12. Optional writes, only after read-only production usage proves the need.

Do not start with HTTP, browser runtime control, or code mutation. The smallest
production-worthy AngularTS MCP server is a secure, read-only, local project
intelligence server with one shared analyzer and a verified npm package.
