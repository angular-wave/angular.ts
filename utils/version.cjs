const fs = require("fs");
const path = require("path");

const checkOnly = process.argv.includes("--check");

// Path to package.json
const packageJsonPath = path.resolve(__dirname, "../package.json");

// Define files to generate
const filesToGenerate = [
  {
    outputPath: path.resolve(
      __dirname,
      "../docs/layouts/shortcodes/version.html",
    ),
    getContent: (version) => `<p>Version: ${version}</p>\n`,
  },
  {
    outputPath: path.resolve(
      __dirname,
      "../docs/layouts/partials/hooks/head-end.html",
    ),
    getContent: (version) =>
      `<script src="https://cdn.jsdelivr.net/npm/@angular-wave/angular.ts@${version}/dist/angular-ts.umd.js"></script>\n`,
  },
];

try {
  // Read package.json once
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  const version = packageJson.version || "unknown";

  // Generate all files
  let stale = false;

  filesToGenerate.forEach(({ outputPath, getContent }) => {
    const content = getContent(version);

    if (checkOnly) {
      const current = fs.existsSync(outputPath)
        ? fs.readFileSync(outputPath, "utf-8")
        : undefined;

      if (current !== content) {
        stale = true;
        console.error(`Stale generated version file: ${outputPath}`);
      }

      return;
    }

    // Ensure the directory exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    fs.writeFileSync(outputPath, content, "utf-8");
    console.log(`Generated: ${outputPath}`);
  });

  if (stale) {
    process.exit(1);
  }
} catch (error) {
  console.error("Error generating version files:", error);
  process.exit(1);
}
