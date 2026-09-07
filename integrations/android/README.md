# Angular Native for Android

Angular Native runs server-rendered AngularTS screens inside native Android
navigation. Applications keep their HTML and server behavior, then add native
components only where Android behavior is useful.

This integration is experimental. Its package names and bridge protocol may
change before the first Maven Central release.

## Modules

- `core` provides WebView sessions, bridge messaging, permissions, and networking.
- `navigation-fragments` provides native Android navigation.
- `demo` exercises the complete browser-to-Android integration.

The Gradle build reads its version directly from the root `package.json`.

```sh
make check
make package-check
```

Publication is controlled by the root AngularTS release process.

## Bridge security

Each WebView destination gets a random session token. AngularTS includes that
token in native calls, and Android accepts a call only while the WebView is on
the destination's original HTTP or HTTPS origin. Cross-origin frames and stale
documents cannot invoke native components or navigation.

## Attribution

This implementation began as a port of AngularNative Native for Android. The
original MIT license is preserved in `LICENSE.angularNative`; see
`THIRD_PARTY_NOTICES.md` for source and attribution details.
