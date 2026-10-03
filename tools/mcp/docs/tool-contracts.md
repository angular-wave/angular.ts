# MCP Resource And Tool Contracts

`tools/mcp/contracts/v1.json` is the machine-readable source of truth. All
objects reject unknown properties. Results are deterministically ordered and
source locations are root-relative, one-based line and column positions.

## Resources

- `angularts://project/summary` returns roots, modules, index state, indexed and
  skipped file counts, diagnostics, and truncation.
- `angularts://catalog/directives` returns built-in and project directives.
- `angularts://catalog/components` returns project components and bindings.
- `angularts://catalog/filters` returns built-in and project filters.
- `angularts://catalog/injectables` returns built-in and project DI tokens.
- `angularts://catalog/routes` returns declared routes and dependencies.
- `angularts://diagnostics` returns bounded project diagnostics.

Catalog and diagnostic resources use bounded pages. Clients should use tools
when they need filtering or one exact item.

## Tools

### `inspect_project`

Accepts an optional `refresh` boolean. Returns the project summary. Refresh
invalidates analyzable project state but does not bypass roots, deny rules, or
limits.

### `list_symbols`

Accepts optional `kind`, `module`, `query`, `limit`, and opaque `cursor` fields.
Returns symbol summaries and page metadata. The maximum page is 200 entries.

### `get_symbol`

Requires `kind` and `name`; accepts an optional module. Returns one exact
catalog entry. Multiple matches fail with `AMBIGUOUS_SYMBOL` rather than
silently selecting one.

### `find_usages`

Requires `kind` and `name`; accepts `limit` and an opaque `cursor`. Returns
bounded source and template locations with context.

### `diagnose_template`

Accepts exactly one of `path` or `text`. A path must identify an authorized,
non-denied workspace file. Text is analyzed in memory and may not exceed the
file-size limit. Returns bounded diagnostics.

### `explain_directive`

Requires one directive name. Returns its catalog entry, usage summary, and at
most ten examples. Project documentation is labeled as project content rather
than server instruction.

### `inspect_route`

Requires one route name. Returns its URL, component or template, parameters,
dependencies, and declaration location.

### `inspect_dependency`

Requires one injectable name and accepts a result limit. Returns its optional
registration, bounded consumers, and truncation state.

## Symbol Kinds

The v1 contract recognizes `component`, `controller`, `directive`, `factory`,
`filter`, `injectable`, `module`, `provider`, `route`, `service`, and `value`.
Adding or renaming a kind changes the public contract and requires changelog and
compatibility review.

## Limits

The contract allows at most eight roots, 10,000 indexed files, 2 MiB per file,
64 directory levels, 200 result items, 1 MiB per response, eight concurrent
requests, 30 seconds per request, and 128 MiB of cache state.

Limit handling is explicit. A page may report truncation, while work that
cannot produce a meaningful bounded result fails with `RESULT_LIMIT` or
`RESOURCE_EXHAUSTED`.

## Errors

- `INVALID_ARGUMENT`: input fails schema or semantic validation.
- `ROOT_NOT_ALLOWED`: a requested or configured root is not authorized.
- `PATH_NOT_ALLOWED`: a path escapes roots or violates path policy.
- `CONTENT_NOT_ALLOWED`: a file or content category is denied.
- `NOT_FOUND`: the requested project object does not exist.
- `AMBIGUOUS_SYMBOL`: more than one exact project object matches.
- `INDEX_NOT_READY`: the index cannot answer yet and retry may succeed.
- `RESULT_LIMIT`: the requested result cannot fit its public limit.
- `REQUEST_CANCELLED`: the client cancelled work.
- `DEADLINE_EXCEEDED`: the request exceeded its deadline.
- `RESOURCE_EXHAUSTED`: concurrency, memory, or another capacity is exhausted.
- `INTERNAL_ERROR`: an unexpected failure was safely normalized.

Errors include the code and a safe explanation. They do not include stack
traces, secret content, authorization headers, or paths outside allowed roots.

## Evolution

Optional fields may be added in minor releases only when older clients safely
ignore them. Because v1 schemas reject unknown fields, server input additions
must remain optional and require contract tests. Tool removal, renaming, changed
meaning, newly required fields, or removed protocol support requires a major
MCP package release.
