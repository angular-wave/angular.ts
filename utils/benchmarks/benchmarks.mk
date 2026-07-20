.PHONY: benchmark-parse benchmark-compile benchmark-link benchmark-router benchmark-bootstrap benchmark-wasm benchmark-build-size benchmark-npm

benchmark-parse: ensure-deps
	@node ./utils/benchmarks/run-parse-benchmark.mjs $(ARGS)

benchmark-compile: ensure-deps
	@node ./utils/benchmarks/run-compile-benchmark.mjs $(ARGS)

benchmark-link: ensure-deps
	@node ./utils/benchmarks/run-link-benchmark.mjs $(ARGS)

benchmark-router: ensure-deps
	@node ./utils/benchmarks/run-router-benchmark.mjs $(ARGS)

benchmark-bootstrap: ensure-deps
	@node ./utils/benchmarks/run-bootstrap-benchmark.mjs $(ARGS)

benchmark-wasm: ensure-deps
	@node ./utils/benchmarks/run-wasm-benchmark.mjs $(ARGS)

benchmark-build-size: build-ts
	@node ./utils/benchmarks/run-build-size-benchmark.mjs

benchmark-npm: ensure-deps
	@node ./utils/benchmarks/run-npm-package-benchmark.mjs $(ARGS)
