# Benchmark results

The benchmark runners write their latest result here. Results are tracked so a
rerun can report changes against the previous committed baseline.

- `make benchmark-parse`: expression lexing, compilation, and evaluation.
- `make benchmark-compile`: template compilation.
- `make benchmark-link`: detached-template linking with deferred scope cleanup
  flushed between samples.
- `make benchmark-router`: registration, navigation, href, and retention.
- `make benchmark-bootstrap`: composition startup and retained heap.
- `make benchmark-wasm`: optional WebAssembly runtime operations.
- `make benchmark-build-size`: minified and gzip composition sizes.
- `make benchmark-npm ARGS="--version <version>"`: same-session comparison
  with a published package.

Performance results are environment-sensitive. Compare runs made with the same
browser, runtime, machine, and benchmark options.
