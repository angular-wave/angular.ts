import assert from "node:assert/strict";
import { once } from "node:events";
import { readdir } from "node:fs/promises";
import test from "node:test";

import { createPulseServer } from "./server.mjs";

async function withServer(run) {
  const server = createPulseServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    server.closeAllConnections();
    await once(server, "close");
  }
}

test("serves the Kotlin-free AngularTS native application", () => withServer(async (origin) => {
  const html = await (await fetch(origin)).text();
  const app = await (await fetch(`${origin}/app.js`)).text();
  assert.match(html, /<ng-native-scaffold/u);
  assert.match(html, /<ng-native-image ng-repeat=/u);
  assert.match(html, /<ng-native-text-field[^>]+ng-model=/u);
  assert.doesNotMatch(html, /ng-native-component=/u);
  assert.match(html, /src="\/live-reload\.js"/u);
  assert.match(html, /src="\/app\.js"/u);
  assert.match(app, /class PulseController/u);
  assert.match(app, /static \$inject = \["\$http", "\$native", "\$scope"\]/u);
  assert.match(app, /this\.http\.(?:get|post)\(/u);
  assert.doesNotMatch(app, /\bfetch\(/u);
  assert.doesNotMatch(app, /\bapply\s*=/u);
  assert.doesNotMatch(app, /\brender\s*\(/u);
}));

test("ships no application Kotlin or Java bootstrap", async () => {
  const entries = await readdir(new URL("../sample-social/src/main", import.meta.url), { recursive: true });
  assert.deepEqual(entries.filter((entry) => /\.(?:java|kt)$/u.test(entry)), []);
});

test("paginates and mutates the deterministic feed", () => withServer(async (origin) => {
  const first = await (await fetch(`${origin}/api/feed`)).json();
  const second = await (await fetch(`${origin}/api/feed?cursor=${first.nextCursor}`)).json();
  assert.equal(first.items.length, 4);
  assert.equal(second.items.length, 4);
  assert.equal(first.items[0].author.avatar, `${origin}/media/avatar-maya.webp`);
  assert.ok([...first.items, ...second.items].every((post) => post.author.avatar !== post.image));
  const liked = await (await fetch(`${origin}/api/posts/${first.items[0].id}/like`, { method: "POST" })).json();
  assert.equal(liked.liked, true);
}));

test("serves a dedicated profile avatar", () => withServer(async (origin) => {
  const profile = await (await fetch(`${origin}/api/profiles/elena`)).json();
  assert.equal(profile.avatar, `${origin}/media/avatar-elena.webp`);
  assert.equal((await fetch(profile.avatar)).status, 200);
  assert.notEqual(profile.avatar, profile.posts[0].image);
}));

test("validates login and accepts a multipart upload", () => withServer(async (origin) => {
  const denied = await fetch(`${origin}/api/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "wrong", password: "wrong" }) });
  assert.equal(denied.status, 422);
  const form = new FormData();
  form.set("caption", "From the emulator");
  form.set("file", new Blob(["image-bytes"], { type: "image/jpeg" }), "photo.jpg");
  const unauthorized = await fetch(`${origin}/api/uploads`, { method: "POST", body: form });
  assert.equal(unauthorized.status, 401);
  const uploaded = await fetch(`${origin}/api/uploads`, { method: "POST", headers: { Cookie: "pulse_session=demo" }, body: form });
  assert.equal(uploaded.status, 201);
  const post = await uploaded.json();
  assert.match(post.id, /^upload-/u);
  assert.equal(post.caption, "From the emulator");
  const image = await fetch(post.image);
  assert.equal(image.headers.get("content-type"), "image/jpeg");
  assert.equal(await image.text(), "image-bytes");
}));

test("serves AngularTS modules and rejects missing media", () => withServer(async (origin) => {
  assert.equal((await fetch(`${origin}/angular/angular-ts.esm.js`)).status, 200);
  assert.equal((await fetch(`${origin}/live-reload.js`)).status, 204);
  assert.equal((await fetch(`${origin}/media/missing.jpg`)).status, 404);
}));
