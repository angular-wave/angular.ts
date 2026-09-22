const GROUP = "io.github.angular-wave";
const PROJECT_URL = "https://github.com/angular-wave/angular.ts";

const requiredDependencies = Object.freeze({
  browser: [
    ["angular-native-navigation", "compile"],
    ["browser", "runtime"],
    ["startup-runtime", "runtime"],
  ],
  core: [],
  credentials: [
    ["angular-native-navigation", "compile"],
    ["credentials", "runtime"],
    ["credentials-play-services-auth", "runtime"],
    ["startup-runtime", "runtime"],
  ],
  "custom-elements-sample": [
    ["angular-native-navigation", "runtime"],
    ["material3", "runtime"],
    ["startup-runtime", "runtime"],
  ],
  maps: [
    ["angular-native-navigation", "compile"],
    ["play-services-maps", "runtime"],
    ["startup-runtime", "runtime"],
  ],
  media: [
    ["angular-native-navigation", "compile"],
    ["media3-exoplayer", "runtime"],
    ["startup-runtime", "runtime"],
  ],
  "native-elements-compiler": [],
  "navigation-fragments": [["angular-native-core", "compile"]],
  paging: [
    ["angular-native-navigation", "compile"],
    ["paging-runtime-ktx", "compile"],
  ],
});

const optionalDependencyPrefixes = [
  "androidx.camera:",
  "androidx.credentials:",
  "androidx.media3:",
  "androidx.paging:",
  "com.google.android.gms:play-services-maps",
];

function fail(artifact, message) {
  throw new Error(`${artifact} POM ${message}.`);
}

function text(block, tag) {
  return block.match(new RegExp(`<${tag}>([^<]+)</${tag}>`, "u"))?.[1]?.trim();
}

function readDependencies(source, artifact) {
  return [...source.matchAll(/<dependency>([\s\S]*?)<\/dependency>/gu)].map(
    ([, block]) => {
      const group = text(block, "groupId");
      const name = text(block, "artifactId");
      if (!group || !name) fail(artifact, "contains an incomplete dependency");
      return {
        coordinate: `${group}:${name}`,
        name,
        scope: text(block, "scope") ?? "compile",
        type: text(block, "type") ?? "jar",
        version: text(block, "version"),
      };
    },
  );
}

/** Validates metadata and dependency boundaries shared by staged and remote Android POMs. */
export function validateAndroidPom(source, { artifact, module, version }) {
  const metadata = [
    [/<name>[^<]+<\/name>/u, "is missing its name"],
    [/<description>[^<]+<\/description>/u, "is missing its description"],
    [new RegExp(`<url>${PROJECT_URL.replace(".", "[.]")}</url>`, "u"), "has an invalid project URL"],
    [/<licenses>[\s\S]*?<name>MIT License<\/name>[\s\S]*?<\/licenses>/u, "is missing the MIT license"],
    [/<developers>[\s\S]*?<id>angular-wave<\/id>[\s\S]*?<\/developers>/u, "is missing its developer"],
    [/<scm>[\s\S]*?github[.]com\/angular-wave\/angular[.]ts[\s\S]*?<\/scm>/u, "is missing its source repository"],
  ];
  for (const [pattern, message] of metadata) {
    if (!pattern.test(source)) fail(artifact, message);
  }

  const dependencies = readDependencies(source, artifact);
  const allowedScopes = new Set(["compile", "import", "runtime"]);
  for (const dependency of dependencies) {
    if (!allowedScopes.has(dependency.scope)) {
      fail(
        artifact,
        `publishes ${dependency.coordinate} with forbidden ${dependency.scope} scope`,
      );
    }
    if (dependency.scope === "import" && dependency.type !== "pom") {
      fail(artifact, `imports non-POM dependency ${dependency.coordinate}`);
    }
    if (
      dependency.coordinate.startsWith(`${GROUP}:angular-native-`) &&
      dependency.version !== version
    ) {
      fail(
        artifact,
        `depends on ${dependency.coordinate}:${dependency.version ?? "unspecified"} instead of ${version}`,
      );
    }
  }

  const required = requiredDependencies[module];
  if (!required) fail(artifact, `has no dependency contract for module ${module}`);
  for (const [name, scope] of required) {
    if (
      !dependencies.some(
        (dependency) => dependency.name === name && dependency.scope === scope,
      )
    ) {
      fail(artifact, `is missing ${name} with ${scope} scope`);
    }
  }

  if (["core", "native-elements-compiler", "navigation-fragments"].includes(module)) {
    for (const dependency of dependencies) {
      if (
        optionalDependencyPrefixes.some((prefix) =>
          dependency.coordinate.startsWith(prefix),
        )
      ) {
        fail(artifact, `leaks optional dependency ${dependency.coordinate}`);
      }
    }
  }
}
