# AngularTS VS Code Extension Release Checklist

Use this checklist before publishing a VSIX or marketplace release.

## Version

- [ ] Update `version` in `tools/vscode/package.json`.
- [ ] Add a matching entry to `tools/vscode/CHANGELOG.md`.
- [ ] Confirm the AngularTS compatibility notes in `tools/vscode/README.md`.

## Verification

- [ ] Run `make check && make lint` from the repository root.
- [ ] Run `make vscode-test` from the repository root.
- [ ] Run `make vscode-smoke` from the repository root.
- [ ] Run `npm run package` from `tools/vscode`.
- [ ] Install the generated `.vsix` into a clean VS Code profile.
- [ ] Open `tools/vscode/test-fixtures/basic-app` in the clean profile.
- [ ] Verify directive completion, hover, go to definition, diagnostics,
      snippets, usage search, and component creation.
- [ ] Capture or refresh marketplace screenshots/GIFs after smoke testing.

## Marketplace Metadata

- [ ] Confirm display name, description, categories, keywords, repository,
      license, and extension kind in `tools/vscode/package.json`.
- [ ] Verify `tools/vscode/media/icon.png` and update
      `tools/vscode/media/icon.svg` if the icon changes.
- [ ] Confirm README limitations are still accurate.

## Publish

- [ ] Package the final VSIX.
- [ ] Publish with the Angular Wave publisher token.
- [ ] Tag the release or record the published VSIX checksum.
