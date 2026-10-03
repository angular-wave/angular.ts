SHELL := /usr/bin/env bash

.PHONY: toolchain-check check compile clean

toolchain-check:
	node ../../scripts/check-toolchain.mjs

check:
	node --test entry/src/test/*.test.mjs

compile: toolchain-check
	ohpm install --all
	hvigorw --mode project -p product=default -p buildMode=release assembleHap

clean:
	rm -rf .hvigor build oh_modules entry/build entry/oh_modules
