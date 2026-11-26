"use strict";
// Port of server.py: serves the Echo frontend (dist/) and the /api/* routes on loopback.

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const { HttpError } = require("./net");
const { getLogger } = require("./pyutil");

const logger = getLogger("echo.server");

const DEFAULT_STATIC_DIR = path.resolve(__dirname, "..", "dist");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".flac": "audio/flac",
  ".ogg": "audio/ogg",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

// Lazy-load source modules so a failing plugin does not stop static serving.
const mods = {
  get catalog() {
    return require("./sources/catalog");
  },
  get ne() {
    return require("./sources/ne");
  },
  get browse() {
    return require("./sources/browse");
  },
  get bili() {
    return require("./sources/bili");
  },
  get manager() {
    return require("./sources/manager").manager;
  },
};

/** 32x32 Nocturne coral wave ICO built in memory (port of _build_favicon_ico). */
function buildFaviconIco() {
  const size = 32;
  const bg = [0x15, 0x0f, 0x0f, 0xff];
  const accent = [0x8b, 0x6b, 0xff, 0xff];
  const accentHi = [0xa4, 0x8c, 0xff, 0xff];
  const bars = {
    6: [13, 19], 7: [13, 19],
    10: [9, 23], 11: [9, 23],
    15: [5, 27], 16: [5, 27],
    20: [9, 23], 21: [9, 23],
    24: [13, 19], 25: [13, 19],
  };
  const xor = [];
  const andRows = Buffer.alloc(size * 4);
  const rCorner = 7.0;
  let row = 0;
  for (let y = size - 1; y >= 0; y--) {
    let maskBits = 0;
    for (let x = 0; x < size; x++) {
      const dx = Math.max(0, rCorner - x, x - (size - 1 - rCorner));
      const dy = Math.max(0, rCorner - y, y - (size - 1 - rCorner));
      const inside = dx * dx + dy * dy <= rCorner * rCorner;
      if (!inside) {
        xor.push(0, 0, 0, 0);
        maskBits = (maskBits | (1 << (31 - x))) >>> 0;
      } else {
        const span = bars[x];
        if (span && span[0] <= y && y <= span[1]) xor.push(...(x === 15 || x === 16 ? accentHi : accent));
        else xor.push(...bg);
      }
    }
    andRows.writeUInt32BE(maskBits >>> 0, row * 4);
    row++;
  }
  const xorBuf = Buffer.from(xor);
  const bih = Buffer.alloc(40);
  bih.writeUInt32LE(40, 0);
  bih.writeInt32LE(size, 4);
  bih.writeInt32LE(size * 2, 8);
  bih.writeUInt16LE(1, 12);
  bih.writeUInt16LE(32, 14);
  bih.writeUInt32LE(0, 16);
  bih.writeUInt32LE(xorBuf.length, 20);
  const image = Buffer.concat([bih, xorBuf, andRows]);
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size, 0);
  entry.writeUInt8(size, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(image.length, 8);
  entry.writeUInt32LE(22, 12);
  return Buffer.concat([header, entry, image]);
}

const FAVICON_ICO = buildFaviconIco();

class BadRequest extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function sendJson(res, data, status = 200) {
  if (res.headersSent) {
    res.end();
    return;
  }
  const body = Buffer.from(JSON.stringify(data), "utf8");
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": String(body.length),
  });
  res.end(res.req.method === "HEAD" ? undefined : body);
}

/** parse_qs(...)[name][0].strip() with default. */
function param(params, name, fallback = "") {
  const value = params.get(name);
  return (value == null ? fallback : value).trim();
}

function page(params) {
  const num = Number.parseInt(param(params, "page", "1"), 10);
  if (!Number.isFinite(num) || !/^\s*[+-]?\d+\s*$/.test(param(params, "page", "1"))) return 1;
  return Math.min(Math.max(num, 1), 50);
}

function intParam(params, name, fallback, low, high) {
  const raw = param(params, name, String(fallback));
  if (!/^[+-]?\d+$/.test(raw)) return fallback;
  return Math.min(Math.max(Number.parseInt(raw, 10), low), high);
}

/** int(float(value or 0)) clamped at >= 0 like the Python duration parsing. */
function durationParam(params) {
  const raw = param(params, "duration", "0") || "0";
  const num = Number(raw);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.trunc(num));
}

function safeFloat(value, fallback, low, high) {
  const num = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  if (!Number.isFinite(num)) return fallback;
  return Math.max(low, Math.min(high, num));
}

function parseArtistWeights(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const weights = {};
  for (const [k, v] of Object.entries(raw).slice(0, 120)) {
    const key = mods.catalog.searchKey(String(k).slice(0, 120));
    if (key) weights[key] = safeFloat(v, 0.0, -0.9, 2.0);
  }
  return weights;
}

function strings(value, limit) {
  return (Array.isArray(value) ? value : []).map((v) => String(v).slice(0, 200)).slice(0, limit);
}

function parseSeeds(body, max) {
  const list = Array.isArray(body.seeds) ? body.seeds : [];
  return list
    .slice(0, max)
    .filter((s) => s && typeof s === "object" && !Array.isArray(s) && s.title)
    .map((s) => ({
      title: String(s.title ?? "").slice(0, 140),
      artist: String(s.artist ?? "").slice(0, 140),
      weight: safeFloat(s.weight, 1.0, 0.2, 3.0),
    }));
}

function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const declared = Number.parseInt(req.headers["content-length"] || "0", 10) || 0;
    if (!(declared > 0 && declared <= maxBytes)) {
      req.resume();
      reject(new BadRequest("Invalid body"));
      return;
    }
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        req.destroy();
        reject(new BadRequest("Invalid body"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      let body;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        reject(new BadRequest("Invalid JSON"));
        return;
      }
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        reject(new BadRequest("Invalid body"));
        return;
      }
      resolve(body);
    });
    req.on("error", reject);
  });
}

// ------------------------------------------------------------------ kuwo / netease

async function handleKuwo(action, params, res) {
  const { catalog } = mods;
  if (action === "search") {
    const query = param(params, "query");
    if (!(query.length >= 1 && query.length <= 140)) return sendJson(res, { error: "Invalid query" }, 400);
    return sendJson(res, await catalog.search(query, page(params)));
  }
  if (action === "charts") return sendJson(res, { charts: await catalog.charts() });
  if (action === "chart") {
    const chartId = param(params, "id");
    if (!/^\d+$/.test(chartId) || !catalog.CHART_IDS.has(Number(chartId))) return sendJson(res, { error: "Invalid chart" }, 400);
    return sendJson(res, await catalog.chart(Number(chartId)));
  }
  if (action === "playlists") return sendJson(res, { playlists: await catalog.playlists(page(params)) });
  if (action === "playlist") {
    const pid = param(params, "id");
    if (!/^\d{1,14}$/.test(pid)) return sendJson(res, { error: "Invalid playlist" }, 400);
    return sendJson(res, await catalog.playlist(pid));
  }
  if (action === "lyrics") {
    const rid = param(params, "id");
    const title = param(params, "title").slice(0, 140);
    const artist = param(params, "artist").slice(0, 140);
    if (!(/^\d+$/.test(rid) || /^ne-\d{1,14}$/.test(rid)) && !title) return sendJson(res, { error: "Invalid track" }, 400);
    return sendJson(res, { lines: await catalog.lyrics(rid, title, artist) });
  }
  if (action === "import") {
    const link = param(params, "link").slice(0, 2048);
    if (!catalog.parsePlaylistLink(link)) return sendJson(res, { error: "只支持网易云、QQ 音乐、酷我的歌单链接" }, 400);
    return sendJson(res, await catalog.importPlaylist(link));
  }
  if (action === "roam-scenes") return sendJson(res, { scenes: await catalog.roamScenes() });
  if (action === "roam-scene") {
    const scene = param(params, "id");
    if (!catalog.ROAM_SCENE_IDS.has(scene)) return sendJson(res, { error: "Invalid scene" }, 400);
    return sendJson(res, { tracks: await catalog.roamScene(scene, page(params)) });
  }
  if (action === "health") return sendJson(res, await catalog.health());
  return sendJson(res, { error: "Not found" }, 404);
}

async function handleNetease(action, params, res) {
  const { catalog, ne } = mods;
  if (action === "charts") return sendJson(res, { charts: await catalog.neteaseCharts() });
  if (action === "chart") {
    const chartId = param(params, "id");
    if (!/^\d+$/.test(chartId) || !catalog.NETEASE_CHART_IDS.has(Number(chartId))) {
      return sendJson(res, { error: "Invalid chart" }, 400);
    }
    return sendJson(res, await catalog.neteaseChart(Number(chartId)));
  }
  if (action === "playlists") {
    const cat = param(params, "cat", "全部").slice(0, 20) || "全部";
    const limit = intParam(params, "limit", 30, 1, 50);
    return sendJson(res, await catalog.neteasePlaylists(cat, limit));
  }
  if (action === "playlist") {
    const pid = param(params, "id");
    if (!/^\d{1,14}$/.test(pid)) return sendJson(res, { error: "Invalid playlist" }, 400);
    return sendJson(res, await catalog.neteasePlaylistDetail(pid));
  }
  if (action === "search" || action === "artists") {
    const query = param(params, "query");
    if (!(query.length >= 1 && query.length <= 140)) return sendJson(res, { error: "Invalid query" }, 400);
    if (action === "artists") return sendJson(res, { artists: await ne.mergedArtists(query) });
    return sendJson(res, await ne.mergedSearch(query, page(params)));
  }
  if (action === "artist" || action === "album") {
    const itemId = param(params, "id");
    if (!/^[1-9][0-9]{0,12}$/.test(itemId)) return sendJson(res, { error: "Invalid id" }, 400);
    const fn = action === "artist" ? ne.artistDetail : ne.albumDetail;
    return sendJson(res, await fn(Number(itemId)));
  }
  return sendJson(res, { error: "Not found" }, 404);
}

// ------------------------------------------------------------------ audio

async function proxyBiliAudio(req, res, streamUrl, mime = "audio/mp4") {
  let upstream;
  try {
    upstream = await mods.bili.openUpstream(streamUrl, req.headers.range || null);
  } catch (err) {
    if (err instanceof HttpError) logger.warning("Bilibili upstream HTTP error %s", err.code);
    else logger.warning("Bilibili upstream error: %s", err);
    return sendJson(res, { error: "Audio stream unavailable" }, 502);
  }
  const status = upstream.statusCode || 200;
  const upstreamCt = String(upstream.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  const headers = {
    "Content-Type": upstreamCt.startsWith("audio/") ? upstreamCt : mime || "audio/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
    "X-Echo-Audio-Source": "bilibili",
  };
  for (const hdr of ["content-length", "content-range"]) {
    if (upstream.headers[hdr]) headers[hdr === "content-length" ? "Content-Length" : "Content-Range"] = upstream.headers[hdr];
  }
  res.writeHead(status, headers);
  if (req.method === "HEAD") {
    upstream.destroy();
    res.end();
    return undefined;
  }
  const stop = () => upstream.destroy();
  res.on("close", stop);
  upstream.on("error", () => res.destroy());
  upstream.pipe(res);
  return undefined;
}

async function handleAudio(pathname, params, req, res) {
  const { catalog, bili } = mods;
  const trackId = param(params, "id");
  if (!trackId) return sendJson(res, { error: "Invalid track" }, 400);

  let sourceId = param(params, "source");
  if (pathname === "/api/catalog/netease/audio") sourceId = "netease";
  else if (!sourceId) {
    if (trackId.startsWith("public-") || trackId.startsWith("anzhiyu-") || trackId.startsWith("glass-")) sourceId = "public";
    else if (trackId.startsWith("MUSIC_") || /^\d+$/.test(trackId)) sourceId = "kuwo";
    else if (trackId.length === 14 && /^[\p{L}\p{N}]+$/u.test(trackId)) sourceId = "qq";
    else sourceId = "public";
  }

  const title = param(params, "title").slice(0, 140);
  const artist = param(params, "artist").slice(0, 140);
  const duration = durationParam(params);
  const forceBili = param(params, "force_bili") === "1" || param(params, "skip") === "kuwo";
  const bvid = param(params, "bvid");

  let resolved;
  if (bvid) {
    if (!bili.isValidBvid(bvid)) return sendJson(res, { error: "Invalid bvid" }, 400);
    const stream = await bili.getAudioStream(bvid);
    resolved = stream ? ["bili", stream[0], stream[1], bvid] : null;
  } else if (forceBili && title) {
    const biliRes = await bili.resolveSongAudio(title, artist, duration);
    resolved = biliRes ? ["bili", biliRes[1], biliRes[2], biliRes[0]] : null;
  } else {
    resolved = await catalog.resolveAudioWaterfall(sourceId, trackId, { title, artist, duration });
  }

  const isProbe = param(params, "probe") === "1";
  if (!resolved) {
    if (isProbe) return sendJson(res, { source: null });
    return sendJson(res, { error: "No audio stream available" }, 404);
  }
  const [kind, targetUrl, meta, resolvedBvid] = resolved;
  if (isProbe) {
    const payload = { source: kind === "bili" ? "bilibili" : meta };
    if (kind === "bili" && resolvedBvid) payload.bvid = resolvedBvid;
    return sendJson(res, payload);
  }
  if (kind === "bili") return proxyBiliAudio(req, res, targetUrl, meta);
  res.writeHead(302, {
    Location: targetUrl,
    "X-Echo-Audio-Source": meta,
    "Cache-Control": "no-store",
    "Content-Length": "0",
  });
  res.end();
  return undefined;
}

// ------------------------------------------------------------------ GET router

async function handleApiGet(url, req, res) {
  const params = url.searchParams;
  const p = url.pathname;
  const { catalog, browse, bili, manager } = mods;

  if (p === "/api/sources" || p === "/api/catalog/sources") return sendJson(res, { sources: manager.listSources() });
  if (p.startsWith("/api/kuwo/")) return handleKuwo(p.slice("/api/kuwo/".length), params, res);
  if (p.startsWith("/api/netease/")) return handleNetease(p.slice("/api/netease/".length), params, res);

  if (p === "/api/browse/artists") {
    const query = param(params, "query");
    if (!(query.length >= 1 && query.length <= 140)) return sendJson(res, { error: "Invalid query" }, 400);
    return sendJson(res, { artists: await browse.searchArtists(query) });
  }
  if (p === "/api/browse/artist" || p === "/api/browse/album") {
    const itemId = param(params, "id");
    if (!/^[1-9][0-9]{0,12}$/.test(itemId)) return sendJson(res, { error: "Invalid id" }, 400);
    const detail = p === "/api/browse/artist" ? await browse.artistDetail(Number(itemId)) : await browse.albumDetail(Number(itemId));
    return sendJson(res, detail);
  }
  if (p === "/api/catalog/bili/candidates") {
    const title = param(params, "title").slice(0, 140);
    if (!title) return sendJson(res, { error: "Invalid title" }, 400);
    const artist = param(params, "artist").slice(0, 140);
    const duration = durationParam(params);
    const limit = intParam(params, "limit", 5, 1, 8);
    return sendJson(res, { candidates: await bili.searchCandidates(title, artist, duration, limit) });
  }

  if (p === "/api/catalog/search" || p === "/api/catalog/public/search" || p === "/api/catalog/netease/search") {
    const query = param(params, "query");
    if (!(query.length >= 1 && query.length <= 140)) return sendJson(res, { error: "Invalid query" }, 400);
    if (p === "/api/catalog/public/search") {
      const tracks = await manager.searchAll(query, { sourceIds: ["public"] });
      return sendJson(res, { tracks, total: tracks.length });
    }
    if (p === "/api/catalog/netease/search") {
      return sendJson(res, { tracks: await manager.searchAll(query, { sourceIds: ["netease"] }) });
    }
    const targetSource = param(params, "source");
    const limitPerSource = intParam(params, "limit", 100, 10, 200);
    const reqPage = intParam(params, "page", 1, 1, 50);
    const sourceIds = targetSource && targetSource !== "all" ? [targetSource] : null;
    const tracks = await manager.searchAll(query, { sourceIds, limitPerSource, page: reqPage });
    return sendJson(res, { tracks });
  }

  if (p === "/api/catalog/audio" || p === "/api/catalog/netease/audio") return handleAudio(p, params, req, res);

  void catalog;
  return sendJson(res, { error: "Not found" }, 404);
}

// ------------------------------------------------------------------ POST router

async function handleApiPost(url, req, res) {
  const { catalog } = mods;
  const p = url.pathname;
  if (!["/api/kuwo/roam", "/api/kuwo/daily", "/api/kuwo/import"].includes(p)) {
    req.resume();
    return sendJson(res, { error: "Not found" }, 404);
  }
  if (!String(req.headers["content-type"] || "").includes("application/json")) {
    req.resume();
    return sendJson(res, { error: "Expected JSON" }, 415);
  }

  if (p === "/api/kuwo/import") {
    const body = await readBody(req, 128 * 1024);
    const link = String(body.link || "").trim().slice(0, 2048);
    const text = String(body.text || "").trim().slice(0, 65536);
    const name = String(body.name || "").trim().slice(0, 60);
    if (link) {
      if (!catalog.parsePlaylistLink(link)) return sendJson(res, { error: "只支持网易云、QQ 音乐、酷我的歌单链接" }, 400);
      const result = await catalog.importPlaylist(link);
      if (name) result.name = name;
      return sendJson(res, result);
    }
    if (text) {
      let result;
      try {
        result = await catalog.importPlaylistText(text, name);
      } catch (err) {
        if (err instanceof HttpError || err?.name === "NetError") throw err;
        return sendJson(res, { error: String(err.message || err) }, 400);
      }
      return sendJson(res, result);
    }
    return sendJson(res, { error: "请提供歌单链接或歌曲文本" }, 400);
  }

  const body = await readBody(req, 64 * 1024);
  if (p === "/api/kuwo/daily") {
    const seeds = parseSeeds(body, 10);
    const banned = new Set(strings(body.bannedArtists, 200).map((a) => catalog.searchKey(a)));
    const artistWeights = parseArtistWeights(body.artistWeights);
    const skipped = new Set(strings(body.skipped, 500));
    const dateStr = String(body.date || "").slice(0, 20);
    const salt = String(body.salt || "").slice(0, 32);
    const tracks = await catalog.dailyRecommend(seeds, banned, { dateStr, salt, artistWeights, skipped });
    return sendJson(res, { tracks });
  }

  // /api/kuwo/roam
  const seeds = parseSeeds(body, 8);
  if (!seeds.length) return sendJson(res, { error: "No seeds" }, 400);
  const mode = ["default", "familiar", "explore"].includes(body.mode) ? body.mode : "default";
  const exclude = new Set([...strings(body.exclude, 2000), ...strings(body.skipped, 500)]);
  const banned = new Set(strings(body.bannedArtists, 200).map((a) => catalog.searchKey(a)));
  const artistWeights = parseArtistWeights(body.artistWeights);
  const tracks = await catalog.roam(seeds, exclude, banned, mode, { artistWeights });
  return sendJson(res, { tracks });
}

// ------------------------------------------------------------------ static files

function serveStatic(url, req, res, staticDir) {
  let rel;
  try {
    rel = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.resolve(staticDir, "." + path.posix.normalize("/" + rel));
  if (file !== staticDir && !file.startsWith(staticDir + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      if (!err && stat.isDirectory()) {
        res.writeHead(301, { Location: url.pathname + "/" }).end();
        return;
      }
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
      return;
    }
    const type = MIME[path.extname(file).toLowerCase()] || "application/octet-stream";
    const headers = {
      "Content-Type": type,
      "Last-Modified": stat.mtime.toUTCString(),
      "Accept-Ranges": "bytes",
    };
    const range = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ""));
    if (range && (range[1] || range[2])) {
      let start = range[1] ? Number(range[1]) : stat.size - Number(range[2]);
      let end = range[1] && range[2] ? Number(range[2]) : stat.size - 1;
      start = Math.max(0, start);
      end = Math.min(end, stat.size - 1);
      if (start > end) {
        res.writeHead(416, { "Content-Range": `bytes */${stat.size}` }).end();
        return;
      }
      res.writeHead(206, { ...headers, "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Content-Length": String(end - start + 1) });
      if (req.method === "HEAD") return void res.end();
      fs.createReadStream(file, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { ...headers, "Content-Length": String(stat.size) });
    if (req.method === "HEAD") return void res.end();
    fs.createReadStream(file).pipe(res);
  });
}

// ------------------------------------------------------------------ server

function errorResponse(err, res) {
  if (err instanceof BadRequest) return sendJson(res, { error: err.message }, err.status);
  if (err instanceof HttpError || err?.name === "NeteaseApiError") {
    const code = Number(err.code);
    const status = [403, 404, 429].includes(code) ? code : 502;
    return sendJson(res, { error: "Catalog unavailable" }, status);
  }
  logger.warning("Request error: %s", err?.stack || err);
  return sendJson(res, { error: "Catalog unavailable" }, 502);
}

/**
 * Create the Echo HTTP server.
 * @param {{ staticDir?: string }} options
 */
function createServer({ staticDir = DEFAULT_STATIC_DIR } = {}) {
  const root = path.resolve(staticDir);
  const server = http.createServer((req, res) => {
    let url;
    try {
      url = new URL(req.url, "http://127.0.0.1");
    } catch {
      res.writeHead(400).end();
      return;
    }
    const started = Date.now();
    const isApi = url.pathname.startsWith("/api/");
    if (isApi) {
      res.on("finish", () => {
        logger.info('"%s %s" %s %sms', req.method, url.pathname, res.statusCode, Date.now() - started);
      });
    }

    if (url.pathname === "/favicon.ico" && (req.method === "GET" || req.method === "HEAD")) {
      res.writeHead(200, {
        "Content-Type": "image/x-icon",
        "Cache-Control": "public, max-age=86400",
        "Content-Length": String(FAVICON_ICO.length),
      });
      res.end(req.method === "HEAD" ? undefined : FAVICON_ICO);
      return;
    }

    if (!isApi) {
      if (req.method !== "GET" && req.method !== "HEAD") {
        res.writeHead(405).end();
        return;
      }
      serveStatic(url, req, res, root);
      return;
    }

    // DNS-rebinding guard: only loopback Host headers may call the API.
    const port = server.address()?.port;
    const host = req.headers.host;
    if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) {
      req.resume();
      sendJson(res, { error: "Invalid host" }, 400);
      return;
    }

    let work;
    if (req.method === "GET" || req.method === "HEAD") work = handleApiGet(url, req, res);
    else if (req.method === "POST") work = handleApiPost(url, req, res);
    else {
      req.resume();
      sendJson(res, { error: "Not found" }, 404);
      return;
    }
    Promise.resolve(work).catch((err) => {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      errorResponse(err, res);
    });
  });
  server.keepAliveTimeout = 5000;
  return server;
}

/** Start listening on 127.0.0.1:port (0 = random). Resolves with { server, port, url }. */
function startServer({ port = 8780, staticDir = DEFAULT_STATIC_DIR } = {}) {
  return new Promise((resolve, reject) => {
    const server = createServer({ staticDir });
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      const actual = server.address().port;
      resolve({ server, port: actual, url: `http://127.0.0.1:${actual}/` });
    });
  });
}

module.exports = { createServer, startServer, buildFaviconIco, DEFAULT_STATIC_DIR };
