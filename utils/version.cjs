const fs = require("fs");
const path = require("path");

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
  filesToGenerate.forEach(({ outputPath, getContent }) => {
    const content = getContent(version);

    // Ensure the directory exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    fs.writeFileSync(outputPath, content, "utf-8");
    console.log(`✅ Generated: ${outputPath}`);
  });
} catch (error) {
  console.error("❌ Error generating files:", error);
  process.exit(1);
}
