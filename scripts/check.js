#!/usr/bin/env node
"use strict";
// Smoke test: start the Node backend on a random port and exercise every API route.
// Usage: npm run check   (needs network access to the upstream music services)

const { startServer } = require("../backend/server");

const results = [];

async function hit(base, path, { method = "GET", body, expect = (s) => s === 200, check } = {}) {
  const started = Date.now();
  let status = 0;
  let note = "";
  try {
    const res = await fetch(base + path, {
      method,
      redirect: "manual",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(45000),
    });
    status = res.status;
    const type = res.headers.get("content-type") || "";
    if (type.includes("json")) {
      const data = await res.json();
      if (check) note = check(data) || "";
    } else {
      note = `${type || "-"} ${res.headers.get("location") ? "-> " + res.headers.get("location").slice(0, 60) : ""}`;
      await res.body?.cancel();
    }
  } catch (err) {
    note = String(err.message || err);
  }
  const ok = expect(status) && !note.startsWith("FAIL");
  results.push({ ok, method, path, status, ms: Date.now() - started, note });
}

const count = (key) => (d) => {
  const list = key.split(".").reduce((o, k) => (o ? o[k] : undefined), d);
  if (!Array.isArray(list)) return `FAIL ${key} missing`;
  return list.length ? `${key}=${list.length}` : `FAIL ${key} empty`;
};

(async () => {
  const { server, url } = await startServer({ port: 0 });
  const base = url.replace(/\/$/, "");
  try {
    await hit(base, "/", { check: undefined });
    await hit(base, "/favicon.ico");
    await hit(base, "/api/sources", { check: count("sources") });
    await hit(base, "/api/kuwo/health", { check: (d) => (typeof d === "object" ? Object.keys(d).join(",") : "FAIL") });
    await hit(base, "/api/kuwo/search?query=" + encodeURIComponent("周杰伦"), { check: count("tracks") });
    await hit(base, "/api/kuwo/charts", { check: count("charts") });
    await hit(base, "/api/kuwo/chart?id=16", { check: count("tracks") });
    await hit(base, "/api/kuwo/playlists", { check: count("playlists") });
    await hit(base, "/api/kuwo/lyrics?id=7149583&title=" + encodeURIComponent("告白气球") + "&artist=" + encodeURIComponent("周杰伦"), {
      check: (d) => (d.lines?.some((l) => /方文山/.test(l.text)) ? `lines=${d.lines.length}` : "FAIL wrong lyrics"),
    });
    await hit(base, "/api/kuwo/roam-scenes", { check: count("scenes") });
    await hit(base, "/api/kuwo/roam-scene?id=146", { check: count("tracks") });
    await hit(base, "/api/netease/charts", { check: count("charts") });
    await hit(base, "/api/netease/chart?id=3778678", { check: count("tracks") });
    await hit(base, "/api/netease/playlists?cat=" + encodeURIComponent("华语") + "&limit=6", { check: count("playlists") });
    await hit(base, "/api/netease/search?query=" + encodeURIComponent("告白气球"), { check: count("tracks") });
    await hit(base, "/api/netease/artists?query=" + encodeURIComponent("周杰伦"), { check: count("artists") });
    await hit(base, "/api/netease/artist?id=6452", { check: count("songs") });
    await hit(base, "/api/netease/album?id=34720827", { check: count("songs") });
    await hit(base, "/api/browse/artists?query=" + encodeURIComponent("周杰伦"), { check: count("artists") });
    await hit(base, "/api/catalog/search?query=" + encodeURIComponent("晴天"), { check: count("tracks") });
    await hit(base, "/api/catalog/bili/candidates?title=" + encodeURIComponent("晴天") + "&artist=" + encodeURIComponent("周杰伦") + "&duration=269", {
      check: count("candidates"),
    });
    await hit(base, "/api/catalog/audio?id=7149583&source=kuwo&probe=1&title=" + encodeURIComponent("告白气球") + "&artist=" + encodeURIComponent("周杰伦") + "&duration=215", {
      check: (d) => (d.source ? `source=${d.source}` : "FAIL no audio"),
    });
    await hit(base, "/api/catalog/audio?id=7149583&source=kuwo&title=" + encodeURIComponent("告白气球") + "&artist=" + encodeURIComponent("周杰伦") + "&duration=215", {
      expect: (s) => s === 302,
    });
    await hit(base, "/api/kuwo/roam", {
      method: "POST",
      body: { seeds: [{ title: "晴天", artist: "周杰伦", weight: 1 }], mode: "default" },
      check: count("tracks"),
    });
    await hit(base, "/api/kuwo/daily", {
      method: "POST",
      body: { seeds: [{ title: "晴天", artist: "周杰伦", weight: 1 }], date: "2026-11-25", salt: "check" },
      check: count("tracks"),
    });
    await hit(base, "/api/kuwo/import", {
      method: "POST",
      body: { text: "周杰伦 - 晴天\n陈奕迅 - 十年", name: "测试" },
      check: count("tracks"),
    });
    // Guards
    await hit(base, "/api/kuwo/search?query=", { expect: (s) => s === 400 });
    await hit(base, "/api/netease/artist?id=abc", { expect: (s) => s === 400 });
    await hit(base, "/api/nope", { expect: (s) => s === 404 });
    await hit(base, "/../package.json", { expect: (s) => s === 404 || s === 403 });
  } finally {
    server.close();
  }

  let failed = 0;
  for (const r of results) {
    if (!r.ok) failed++;
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${String(r.status).padEnd(3)} ${String(r.ms).padStart(6)}ms  ${r.method.padEnd(4)} ${decodeURIComponent(r.path).slice(0, 70).padEnd(70)} ${r.note}`);
  }
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
