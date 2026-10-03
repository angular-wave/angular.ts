# AngularTS MCP Security Model

## Supported Scope

The first production release is a local, read-only project intelligence
server. It supports maintained Node.js 22 and 24 releases on Linux, macOS, and
Windows. The `stdio` transport is stable. Streamable HTTP remains experimental
until its authentication and adversarial suites pass the roadmap gate.

The server does not execute project code, shell commands, package scripts,
templates, generated output, or configuration modules. It does not make
outbound network requests while indexing or answering tools.

## Trust Boundaries

- **MCP client:** controls requests and may provide malformed, oversized, or
  misleading arguments. Client annotations are not authorization.
- **Workspace root:** explicitly granted at startup. Files beneath it remain
  untrusted input.
- **Filesystem:** may contain symlinks, races, permission changes, hostile file
  names, generated trees, and secrets.
- **Project content:** may contain instructions intended to influence a model.
  Source and template text is data, never trusted policy.
- **HTTP caller:** is unauthenticated until bearer-token validation succeeds.
- **Logs:** may leave the process and must not contain source, credentials,
  authorization headers, or paths outside allowed roots.
- **Language service:** parses text but receives no process, network, or
  unrestricted filesystem authority.

## Filesystem Policy

At startup, every root is resolved to a canonical absolute path. The server
rejects nonexistent roots, duplicate roots, relative roots, and filesystem
roots. Every later path is resolved and authorized against those canonical
roots before access.

The server rejects traversal, absolute-path injection, NUL bytes, alternate
separator tricks, URI ambiguity, and symlinks whose canonical destination
escapes an allowed root. Authorization is repeated immediately before a read
so a symlink swap cannot reuse an earlier decision.

The default deny set is defined in `contracts/v1.json` and includes repository
metadata, dependency trees, generated output, coverage, environment files, npm
credentials, SSH data, and common private configuration. User deny patterns
may only reduce access. They cannot re-enable a default denial.

Source locations returned to clients use root-relative paths. Errors never
disclose paths outside configured roots.

## Request And Content Policy

All input and output use closed schemas. Unknown fields are rejected. File
counts, file bytes, traversal depth, result items, response bytes, cache memory,
concurrency, and request duration are bounded by `contracts/v1.json`.

The initial tools are read-only:

- `inspect_project`
- `list_symbols`
- `get_symbol`
- `find_usages`
- `diagnose_template`
- `explain_directive`
- `inspect_route`
- `inspect_dependency`

The server treats comments, strings, documentation, and templates as content.
Instructions found in project files cannot change roots, enable tools, alter
limits, trigger network access, or authorize writes. Results distinguish source
content from server-generated explanations.

Write tools are excluded from the first release. A future write release must
require `--allow-write`, plan-first edit tokens, immediate reauthorization,
conflict checks, atomic writes, and rollback coverage. Host confirmation alone
is not sufficient authorization.

## Transport Policy

In `stdio` mode, stdout is exclusively the MCP protocol channel. Logs and
diagnostics go to stderr. Closed stdin, cancellation, `SIGINT`, and `SIGTERM`
stop work and dispose the project index without partial output.

HTTP is never enabled implicitly. Loopback is the default bind address. Any
non-loopback deployment requires HTTPS, OAuth resource-server metadata, bearer
authentication, issuer and audience checks, token expiry and scope checks,
Host and Origin allowlists, DNS-rebinding protection, body limits, deadlines,
rate limits, bounded sessions, and graceful cleanup. Credentials are never
forwarded to an AngularTS application or another upstream service.

## Threat Review

| Threat | Required control |
| --- | --- |
| Path traversal | Canonical root-relative authorization on every access. |
| Symlink escape or swap | Canonical destination check immediately before access. |
| Secret exfiltration | Default deny set, additive user denies, redacted errors and logs. |
| Prompt injection in source | Treat workspace text as data with no authority over server policy. |
| Resource exhaustion | Hard file, depth, time, memory, result, response, and concurrency limits. |
| DNS rebinding | Protected HTTP adapter plus explicit Host and Origin allowlists. |
| Confused deputy | Authenticate first, authorize roots server-side, never forward caller credentials. |
| Poisoned configuration | Parse data-only configuration; never import or execute workspace config. |
| Protocol corruption | No stdout logging and official SDK transport framing. |
| Cross-client data exposure | Per-request identity and authorization with isolated HTTP sessions. |

## Error And Logging Policy

Public failures use the codes `INVALID_ARGUMENT`, `ROOT_NOT_ALLOWED`,
`PATH_NOT_ALLOWED`, `CONTENT_NOT_ALLOWED`, `NOT_FOUND`, `AMBIGUOUS_SYMBOL`,
`INDEX_NOT_READY`, `RESULT_LIMIT`, `REQUEST_CANCELLED`, `DEADLINE_EXCEEDED`,
`RESOURCE_EXHAUSTED`, and `INTERNAL_ERROR`.

Unexpected exceptions become `INTERNAL_ERROR`. Stack traces are available only
in explicitly enabled local debug logs and are never returned in MCP content.
Logs use server-generated event names, levels, request IDs, durations, counts,
and error codes. Workspace content cannot supply log keys.

## Reporting

Report vulnerabilities privately through the repository's GitHub security
advisory interface. Include the server version, transport, operating system,
reproduction steps, and whether the issue crosses an allowed workspace root.
Do not include real credentials or private source code.
