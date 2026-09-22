# Android Security Model

Angular Native treats the page, Android shell, server, and external apps as
separate trust boundaries.

## Bridge calls

- Every destination creates a random session token.
- A message must use protocol version 1, include the active token, and come from
  the destination's original HTTP or HTTPS origin.
- Messages larger than 256 KiB are rejected before JSON dispatch.
- Targets, methods, components, properties, and property types are allowlisted.
- Failures return structured codes; exceptions do not cross the bridge or crash
  the UI thread.
- Component instances belong to one destination and are disposed with it.

## Android capabilities

- Capability names and methods are advertised before use.
- Permission status is separate from feature availability.
- Permission failures distinguish denial from permanent denial.
- External intents allow only `http`, `https`, `mailto`, `tel`, and `geo`.
- Files cross the boundary as Android content URIs, never filesystem paths.
- The bridge does not persist credentials, tokens, or capability results in
  WebView saved state.

## Application requirements

- Serve production pages over HTTPS.
- Keep authentication in secure, HTTP-only cookies where possible.
- Do not put secrets in native component properties, URLs, logs, or saved state.
- Keep path configuration origins narrow and review every custom intent or
  native element provider.
- Request dangerous permissions only while a visible destination explains why
  the feature needs them.
- Disable WebView debugging in release builds.

Report security issues privately through the repository's security advisory
page rather than a public issue.
