# Android Compatibility

| Surface | Supported baseline |
| --- | --- |
| Android | API 28 and newer |
| Compile SDK | 37 |
| Target SDK | 37 |
| Java toolchain | 17 |
| Gradle wrapper | 9.7.1 |
| Android Gradle plugin | 9.5.0 |
| System WebView | Chromium 120 or newer |
| Bridge protocol | Version 1 |
| AngularTS | Exactly the same package version as the AARs |

CI builds the release AARs against API 37 and runs device checks on API 28 and
the stable API 36 system image. Unit tests use Robolectric, but do not replace
the device jobs.

The build keeps Gradle 9.7.1 because Detekt 2.0.0-alpha.6 uses
`Configuration.setVisible`, which Gradle 9.8 deprecates. AGP 9.5.0 fixes its
own calls to that API, but does not fix Detekt's calls. Gradle warnings remain
fatal; `lint.xml` exempts only the wrapper's newer-version advisory until
Detekt is compatible. All plugin and dependency update checks remain fatal.

The catalog declares a minimum API for every native element. Applications can
query bridge capabilities before showing an Android-only action. Unsupported
features must retain a browser or server-rendered fallback.

The device matrix covers phones at the minimum and stable API, plus tablet and
foldable viewports on the stable image. Instrumentation renders the catalog in
RTL, 1.5x font, dark theme, reduced motion, and normal motion. Applications
must still run acceptance tests with their own content, themes, supported
devices, and accessibility services.
