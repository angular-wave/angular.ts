.PHONY: benchmark-parse benchmark-compile benchmark-link

benchmark-parse: ensure-deps
	@node ./utils/benchmarks/run-parse-benchmark.mjs $(ARGS)

benchmark-compile: ensure-deps
	@node ./utils/benchmarks/run-compile-benchmark.mjs $(ARGS)

benchmark-link: ensure-deps
	@node ./utils/benchmarks/run-link-benchmark.mjs $(ARGS)
