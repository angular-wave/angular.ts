SHELL := /usr/bin/env bash

.PHONY: toolchain-check check stage-assets compile clean

toolchain-check:
	node ../../scripts/check-toolchain.mjs

check:
	node ../../scripts/generate-samples.mjs --check

stage-assets: check
	rm -rf entry/src/main/resources/rawfile/dist
	mkdir -p entry/src/main/resources/rawfile/dist
	cp -R ../../../../dist/. entry/src/main/resources/rawfile/dist/

compile: toolchain-check stage-assets
	@trap 'rm -rf entry/src/main/resources/rawfile/dist' EXIT; \
		ohpm install --all && \
		hvigorw --mode project -p product=default -p buildMode=release assembleHap

clean:
	rm -rf .hvigor build oh_modules entry/build entry/oh_modules entry/src/main/resources/rawfile/dist
