# Pulse

![Pulse design concept](./concept.png)

Pulse is the Angular Native reference application. Its Android module contains
no Kotlin or Java application code. A reusable manifest-configured Angular
Native activity hosts server-driven screens composed from standard native
elements.

Start one Android emulator, then run from the repository root:

```bash
make -C integrations/android sample-social-run
```

The command starts the deterministic Node server on port `4175`, maps that port
to every authorized ADB device, installs the debug APK, and opens Pulse. The
same loopback URL works on Android Emulator and physical devices.

The app demonstrates a paged photo feed, adaptive explore grid, post details,
profiles, activity updates over SSE, optimistic likes, native sharing,
connectivity observation, native file selection, and same-origin multipart
upload through `files.upload`.

`concept.png` is the visual specification for the sample. Pulse uses the same
semantic design-token vocabulary as Angular.css, and Angular Native projects
the resulting computed CSS onto Android views.
