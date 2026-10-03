import { resolve } from "node:path";

export function entryCopyFilter(entryRoot, path) {
  return (
    !path.startsWith(resolve(entryRoot, "build")) &&
    !path.startsWith(resolve(entryRoot, "oh_modules")) &&
    !path.endsWith("oh-package-lock.json5")
  );
}

export function validateInstalledArtifacts(artifacts, version, installed) {
  for (const artifact of artifacts) {
    const metadata = installed.find(({ name }) => name === artifact.package);
    if (!metadata) throw new Error(`${artifact.package} was not installed from its HAR`);
    if (metadata.version !== version) {
      throw new Error(`${artifact.package} installed version ${metadata.version}`);
    }
    for (const [name, dependencyVersion] of Object.entries(metadata.dependencies ?? {})) {
      if (
        name !== "@angular-wave/angular-native-harmony-core" ||
        dependencyVersion !== version
      ) {
        throw new Error(
          `${artifact.package} contains an unpublished dependency: ${name}@${dependencyVersion}`,
        );
      }
    }
  }
}
