#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repository = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
]);
createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  const path = resolve(repository, `.${pathname}`);
  if (path !== repository && !path.startsWith(`${repository}${sep}`)) {
    response.writeHead(403).end();
    return;
  }
  try {
    if (!(await stat(path)).isFile()) throw new Error("not a file");
    response.writeHead(200, {
      "content-type": types.get(extname(path)) ?? "application/octet-stream",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    });
    createReadStream(path).pipe(response);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(4173, "127.0.0.1", () => {
  console.log("HarmonyOS proof server: http://127.0.0.1:4173");
});
