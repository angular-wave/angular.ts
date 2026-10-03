# MCP Protocol Support

## Compatibility

The first production package supports:

| Protocol | Status |
| --- | --- |
| `2026-07-28` | Current and required. |
| `2025-11-25` | Previous stable revision and required. |

The official TypeScript SDK performs negotiation and pins one server instance
to each connection. Protocol framing and negotiation are not implemented by
AngularTS.

Supported runtime platforms are maintained Node.js 22 and 24 releases on
Linux, macOS, and Windows.

## Transports

`stdio` is the default and the only stable transport in the first release. The
client starts `angular-ts-mcp`, sends protocol messages over stdin, and receives
protocol messages over stdout. Human-readable diagnostics use stderr only.

Streamable HTTP is experimental. It is enabled only with an explicit transport
option and binds to `127.0.0.1` by default. It cannot be advertised as stable
until authentication, Host and Origin validation, DNS-rebinding protection,
limits, cancellation, and cross-client isolation pass hosted tests.

Legacy standalone SSE is not supported. Custom transports are outside the
first release.

## Capabilities

The first release publishes resources and read-only tools. It does not publish
prompts, sampling, elicitation, tasks, or write tools. Resource subscriptions
are advertised only when implemented and supported by the negotiated protocol.

Resources:

- `angularts://project/summary`
- `angularts://catalog/directives`
- `angularts://catalog/components`
- `angularts://catalog/filters`
- `angularts://catalog/injectables`
- `angularts://catalog/routes`
- `angularts://diagnostics`

Tools:

- `inspect_project`
- `list_symbols`
- `get_symbol`
- `find_usages`
- `diagnose_template`
- `explain_directive`
- `inspect_route`
- `inspect_dependency`

## Upgrade Policy

MCP SDK dependencies are exact-version locked. An upgrade must:

1. Update the protocol table and machine-readable contract when support
   changes.
2. Pass contract tests against current and previous protocol revisions.
3. Pass subprocess `stdio` tests using the packed npm artifact.
4. Pass HTTP tests when HTTP code is present.
5. Document capability or wire-behavior changes in the MCP changelog.

A protocol revision is removed only in a major MCP package release. Security
fixes may disable a transport or capability in a patch release when keeping it
enabled would expose users.

## Lifecycle

Cancellation stops cancellable analysis and suppresses later results. Closed
stdin closes a local connection. `SIGINT` and `SIGTERM` begin graceful shutdown,
reject new work, cancel in-flight work, dispose indexes, and close the SDK
server. HTTP shutdown additionally expires sessions and closes response streams.

Requests use the stable public errors `INVALID_ARGUMENT`, `ROOT_NOT_ALLOWED`,
`PATH_NOT_ALLOWED`, `CONTENT_NOT_ALLOWED`, `NOT_FOUND`, `AMBIGUOUS_SYMBOL`,
`INDEX_NOT_READY`, `RESULT_LIMIT`, `REQUEST_CANCELLED`, `DEADLINE_EXCEEDED`,
`RESOURCE_EXHAUSTED`, and `INTERNAL_ERROR`.
