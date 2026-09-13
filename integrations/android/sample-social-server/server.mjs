#!/usr/bin/env node

import { createReadStream } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const repository = resolve(directory, "../../..");
const development = process.env.PULSE_DEVELOPMENT === "1";
const angularDistribution = resolve(process.env.ANGULAR_TS_DISTRIBUTION || resolve(repository, "dist"));
const mediaDirectory = resolve(directory, "media");
const TEXT_TYPES = new Set(["text/css", "text/html", "text/javascript"]);
const LIVE_RELOAD_CLIENT = `
let version;
const check = async () => {
  try {
    const next = await fetch("/__reload-version", { cache: "no-store" }).then((response) => response.text());
    if (version !== undefined && next !== version) {
      const destination = new URL(location.href);
      destination.searchParams.set("__reload", next);
      location.replace(destination);
      return;
    }
    version = next;
  } catch {
    // The development server may be restarting.
  } finally {
    setTimeout(check, 750);
  }
};
void check();
`;

const seedPosts = [
  ["temple", "Temple in Transition", "Morning light through Kyoto maples.", "Maya Chen", "Kyoto, Japan", "temple.jpg", "avatar-maya.webp"],
  ["mountain", "Morning Reflections", "Cold air, clear mind, grateful for days like this.", "Noah Kim", "Banff, Canada", "mountain.jpg", "avatar-noah.webp"],
  ["food", "Simple Pleasures", "A table worth slowing down for.", "Sophie Martin", "Provence, France", "food.jpg", "avatar-sophie.webp"],
  ["architecture", "Lines and Light", "Concrete becomes soft when the sun moves across it.", "Daniel Park", "Seoul, South Korea", "architecture.jpg", "avatar-daniel.webp"],
  ["coast", "Edge of the Day", "The last warm light along the water.", "Elena Rossi", "Amalfi, Italy", "coast.jpg", "avatar-elena.webp"],
  ["forest", "A Quiet Path", "No notifications, only rain in the leaves.", "Jamie Wu", "Olympic Peninsula", "forest.jpg", "avatar-jamie.webp"],
  ["market", "Saturday Color", "The market wakes before the rest of the city.", "Priya Shah", "Mumbai, India", "market.jpg", "avatar-priya.webp"],
  ["city", "After the Rain", "Reflections make a second city under our feet.", "Luca Moretti", "Milan, Italy", "city.jpg", "avatar-luca.webp"],
];

function createState() {
  const posts = seedPosts.map(([id, title, caption, name, location, image, avatar], index) => ({
    id,
    title,
    caption,
    description: `${title}, photographed by ${name}`,
    author: { name, handle: name.toLowerCase().replaceAll(" ", "-"), avatar: `/media/${avatar}` },
    location,
    image: `/media/${image}`,
    likes: 126 + index * 37,
    liked: false,
    comments: [
      { author: "Priya Shah", text: "This perspective is beautiful." },
      { author: "Marco Silva", text: "I want to visit this place." },
    ],
  }));
  return {
    posts,
    activity: [
      { id: "activity-1", title: "Jamie liked your photo", detail: "Morning Reflections · 2 minutes ago" },
      { id: "activity-2", title: "Priya started following you", detail: "Photographer · 18 minutes ago" },
      { id: "activity-3", title: "Daniel left a comment", detail: "The light is extraordinary · 1 hour ago" },
    ],
  };
}

const json = (response, status, value, headers = {}) => {
  response.writeHead(status, { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8", ...headers });
  response.end(JSON.stringify(value));
};

async function readBody(request, limit = 110 * 1024 * 1024) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > limit) throw new Error("Request body is too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function serveFile(response, path, cache = "no-store") {
  const info = await stat(path);
  const types = { ".css": "text/css", ".html": "text/html", ".js": "text/javascript", ".jpg": "image/jpeg", ".mjs": "text/javascript", ".png": "image/png", ".webp": "image/webp" };
  const type = types[extname(path)] || "application/octet-stream";
  response.writeHead(200, { "Cache-Control": cache, "Content-Length": info.size, "Content-Type": TEXT_TYPES.has(type) ? `${type}; charset=utf-8` : type });
  createReadStream(path).pipe(response);
}

async function newestModification(path) {
  const info = await stat(path);
  if (!info.isDirectory()) return info.mtimeMs;
  const entries = await readdir(path, { withFileTypes: true });
  return Math.max(
    info.mtimeMs,
    ...await Promise.all(entries.map((entry) => newestModification(resolve(path, entry.name)))),
  );
}

async function reloadVersion() {
  return String(Math.max(
    await newestModification(directory),
    await newestModification(angularDistribution),
  ));
}

function multipart(request, body) {
  const contentType = request.headers["content-type"] || "";
  const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/iu)?.slice(1).find(Boolean);
  if (!boundary || boundary.length > 200) throw new Error("A valid multipart boundary is required");
  const marker = Buffer.from(`--${boundary}`);
  const result = { fields: {}, file: null };
  let cursor = body.indexOf(marker);
  while (cursor >= 0) {
    const start = cursor + marker.length;
    if (body.subarray(start, start + 2).equals(Buffer.from("--"))) break;
    const headerStart = start + 2;
    const headerEnd = body.indexOf(Buffer.from("\r\n\r\n"), headerStart);
    if (headerEnd < 0) break;
    const next = body.indexOf(marker, headerEnd + 4);
    if (next < 0) break;
    const headers = body.subarray(headerStart, headerEnd).toString("utf8");
    const disposition = headers.match(/content-disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]*)")?/iu);
    const value = body.subarray(headerEnd + 4, Math.max(headerEnd + 4, next - 2));
    if (disposition?.[2] !== undefined) {
      result.file = { data: Buffer.from(value), name: disposition[2], type: headers.match(/content-type:\s*([^\r\n]+)/iu)?.[1]?.trim() || "application/octet-stream" };
    } else if (disposition?.[1]) {
      result.fields[disposition[1]] = value.toString("utf8");
    }
    cursor = next;
  }
  return result;
}

function publicPost(post, origin) {
  return {
    ...post,
    author: { ...post.author, avatar: post.author.avatar.startsWith("/") ? `${origin}${post.author.avatar}` : post.author.avatar },
    image: post.image.startsWith("/") ? `${origin}${post.image}` : post.image,
  };
}

function safePath(root, relative) {
  const result = resolve(root, relative);
  if (result !== root && !result.startsWith(`${root}${sep}`)) throw new Error("Invalid path");
  return result;
}

export function createPulseServer() {
  const state = createState();
  const uploads = new Map();
  const clients = new Set();
  const emit = (event, value) => {
    const message = `event: ${event}\ndata: ${JSON.stringify(value)}\n\n`;
    clients.forEach((client) => client.write(message));
  };
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
      if (request.method === "GET" && url.pathname === "/health") return json(response, 200, { service: "pulse", ready: true });
      if (request.method === "GET" && url.pathname === "/api/events") {
        response.writeHead(200, { "Cache-Control": "no-cache", Connection: "keep-alive", "Content-Type": "text/event-stream" });
        response.write("event: ready\ndata: {}\n\n");
        clients.add(response);
        request.on("close", () => clients.delete(response));
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/feed") {
        const offset = Number.parseInt(url.searchParams.get("cursor") || "0", 10) || 0;
        const items = state.posts.slice(offset, offset + 4);
        return json(
          response,
          200,
          { items: items.map((post) => publicPost(post, url.origin)), nextCursor: offset + items.length < state.posts.length ? String(offset + items.length) : null },
          { "Set-Cookie": "pulse_session=demo; HttpOnly; Path=/; SameSite=Lax" },
        );
      }
      if (request.method === "GET" && url.pathname === "/api/activity") return json(response, 200, { items: state.activity });
      const postMatch = url.pathname.match(/^\/api\/posts\/([^/]+)$/u);
      if (request.method === "GET" && postMatch) {
        const post = state.posts.find((item) => item.id === decodeURIComponent(postMatch[1]));
        return post ? json(response, 200, publicPost(post, url.origin)) : json(response, 404, { error: "Post not found" });
      }
      const likeMatch = url.pathname.match(/^\/api\/posts\/([^/]+)\/like$/u);
      if (request.method === "POST" && likeMatch) {
        const post = state.posts.find((item) => item.id === decodeURIComponent(likeMatch[1]));
        if (!post) return json(response, 404, { error: "Post not found" });
        post.liked = !post.liked;
        post.likes += post.liked ? 1 : -1;
        return json(response, 200, { id: post.id, liked: post.liked, likes: post.likes });
      }
      const profileMatch = url.pathname.match(/^\/api\/profiles\/([^/]+)$/u);
      if (request.method === "GET" && profileMatch) {
        const handle = decodeURIComponent(profileMatch[1]);
        return json(response, 200, { handle, name: "Elena Rossi", avatar: `${url.origin}/media/avatar-elena.webp`, bio: "Architecture, food, nature. Everyday moments.", followers: 12400, following: 684, posts: state.posts.slice(0, 5).map((post) => publicPost(post, url.origin)) });
      }
      if (request.method === "POST" && url.pathname === "/api/login") {
        const credentials = JSON.parse((await readBody(request, 64 * 1024)).toString("utf8"));
        if (credentials.email !== "maya@pulse.local") return json(response, 422, { error: "Check your email", errors: { email: "Use maya@pulse.local" } });
        if (credentials.password !== "pulse") return json(response, 422, { error: "Check your password", errors: { password: "Use pulse" } });
        return json(response, 200, { authenticated: true, user: { handle: "maya" } }, { "Set-Cookie": "pulse_session=demo; HttpOnly; Path=/; SameSite=Lax" });
      }
      if (request.method === "POST" && url.pathname === "/api/uploads") {
        if (!(request.headers.cookie || "").split(/;\s*/u).includes("pulse_session=demo")) return json(response, 401, { error: "Sign in before uploading" });
        const upload = multipart(request, await readBody(request));
        if (!upload.file || !["image/jpeg", "image/png", "image/webp"].includes(upload.file.type)) return json(response, 422, { error: "Choose a JPEG, PNG, or WebP image" });
        if (upload.file.data.length > 10 * 1024 * 1024) return json(response, 413, { error: "Image must be 10 MiB or smaller" });
        const id = `upload-${Date.now()}`;
        uploads.set(id, upload.file);
        const post = { ...state.posts[1], id, title: "A New Moment", caption: upload.fields.caption?.trim() || "Shared from Angular Native", image: `/api/uploads/${id}/image`, likes: 0, liked: false, comments: [] };
        state.posts.unshift(post);
        const activity = { id: `activity-${Date.now()}`, title: "Your photo is live", detail: `${post.title} · just now` };
        state.activity.unshift(activity);
        emit("activity", activity);
        return json(response, 201, publicPost(post, url.origin));
      }
      const uploadMatch = url.pathname.match(/^\/api\/uploads\/([^/]+)\/image$/u);
      if (request.method === "GET" && uploadMatch) {
        const upload = uploads.get(decodeURIComponent(uploadMatch[1]));
        if (!upload) return json(response, 404, { error: "Image not found" });
        response.writeHead(200, { "Cache-Control": "no-store", "Content-Length": upload.data.length, "Content-Type": upload.type });
        response.end(upload.data);
        return;
      }
      if (request.method === "GET" && url.pathname === "/live-reload.js") {
        response.writeHead(development ? 200 : 204, { "Cache-Control": "no-store", "Content-Type": "text/javascript; charset=utf-8" });
        response.end(development ? LIVE_RELOAD_CLIENT : undefined);
        return;
      }
      if (request.method === "GET" && url.pathname === "/__reload-version" && development) {
        response.writeHead(200, { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" });
        response.end(await reloadVersion());
        return;
      }
      if (request.method === "GET" && url.pathname.startsWith("/media/")) return await serveFile(response, safePath(mediaDirectory, url.pathname.slice(7)), "public, max-age=3600");
      if (request.method === "GET" && url.pathname.startsWith("/angular/")) {
        const requested = url.pathname.slice(9);
        const modulePath = development && requested === "angular-ts.esm.js" ? "index.js" : requested;
        return await serveFile(response, safePath(angularDistribution, modulePath), "no-cache");
      }
      if (request.method === "GET" && ["/app.js", "/model.mjs", "/styles.css"].includes(url.pathname)) return await serveFile(response, safePath(directory, url.pathname.slice(1)));
      if (request.method === "GET") return await serveFile(response, resolve(directory, "index.html"));
      json(response, 404, { error: "Not found" });
    } catch (error) {
      json(response, error.code === "ENOENT" ? 404 : 500, { error: error.message });
    }
  });
}

async function main() {
  const portIndex = process.argv.indexOf("--port");
  const port = Number.parseInt(portIndex >= 0 ? process.argv[portIndex + 1] : process.env.PORT || "4175", 10);
  const server = createPulseServer();
  server.listen(port, "0.0.0.0", () => console.log(`Pulse server listening on http://localhost:${port}`));
  const close = () => server.close(() => process.exit(0));
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void main();
