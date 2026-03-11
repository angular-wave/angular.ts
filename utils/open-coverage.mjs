import { access } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const reportPath = path.join(rootDir, "coverage", "index.html");

try {
  await access(reportPath);
} catch {
  console.error(`[coverage] report not found at ${reportPath}`);
  process.exit(1);
}

console.log(`[coverage] report available at ${reportPath}`);

if (process.env.CI === "true" || process.env.CI === "1") {
  process.exit(0);
}

if (process.platform === "linux") {
  if (!process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
    process.exit(0);
  }
  openWith("xdg-open", [reportPath]);
} else if (process.platform === "darwin") {
  openWith("open", [reportPath]);
} else if (process.platform === "win32") {
  openWith("cmd", ["/c", "start", "", reportPath]);
} else {
  process.exit(0);
}

function openWith(command, args) {
  const child = spawn(command, args, {
    cwd: rootDir,
    stdio: "ignore",
    detached: true,
  });

  child.on("error", (error) => {
    console.error(`[coverage] failed to open report: ${error.message}`);
    process.exit(1);
  });

  child.unref();
}
