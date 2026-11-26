"use strict";
// Port of sources/bili.py: Bilibili DASH audio search & stream resolver (no-login fallback audio source).
//
// Python uses http.cookiejar.CookieJar + HTTPCookieProcessor. This module keeps a minimal
// in-memory cookie jar: every response (including redirect hops, which are followed here
// instead of inside net.js so cookies are captured per hop) stores its Set-Cookie values,
// and matching cookies are sent on later requests. bili.py does no WBI signing, so neither does this.

const { openRequest, HttpError, NetError } = require("../net");
const { quote, urlencode } = require("../pyutil");
const { zhFold } = require("./base");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const HEADERS = { "User-Agent": UA, Referer: "https://www.bilibili.com/" };

let cookieReadyAt = 0.0;

const audioCache = new Map(); // key -> [expire_ts, url, mime]
const searchCache = new Map(); // query_key -> [expire_ts, bvid]
const candidatesCache = new Map(); // query_key -> [expire_ts, candidates]

const now = () => Date.now() / 1000;

// Python str.isspace() characters (re \s / str.strip / str.split in str patterns).
const WS = "\\t\\n\\v\\f\\r\\x1c-\\x1f \\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";
const STRIP_RE = new RegExp(`^[${WS}]+|[${WS}]+$`, "gu");
const pyStrip = (s) => s.replace(STRIP_RE, "");

const HTML_TAG_RE = /<[^>]+>/gu;
const BVID_RE = /^BV[0-9A-Za-z]{8,14}$/u;

const NOISE_RE =
  /伴奏|纯音乐版|karaoke|教学|吉他谱|钢琴谱|鼓谱|总谱|演奏版|电吉他|独奏|翻唱|cover|reaction|解说|鬼畜|变速|降调|0\.8x|1\.2x|dj版|串烧|合集|8d|环绕/iu;
const HARD_NOISE_RE = /伴奏|纯音乐版|karaoke|教学|吉他谱|钢琴谱|鼓谱|总谱|reaction|解说|鬼畜|变速|降调|0\.8x|1\.2x|8d|环绕/iu;
const SOFT_TAG_RE = /翻唱|cover|演奏版|电吉他|独奏|dj版|串烧|合集/iu;
const NORM_RE = new RegExp(`[${WS}\\-_·•/\\\\|()（）\\[\\]【】《》<>"'‘’“”,，.。!?！？:：;；~～]+`, "gu");
const BRACKET_RE = new RegExp(`[${WS}]*[(（\\[【][^()（）\\[\\]【】]*[)）\\]】][${WS}]*`, "gu");
const TOKEN_SPLIT_RE = new RegExp(`[${WS}/()（）\\[\\]【】\\-—]+`, "u");
const LIVE_REMIX_RE = /live|现场|remix|dj/iu;
const QUALITY_RE = /hi-?res|无损|flac|官方|mv|原版|音质/iu;
const LIVE_RE = /live|现场|演唱会/iu;
const LIVE_SHORT_RE = /live|现场/iu;

const isDict = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** Python dict.get — raises like AttributeError when obj is not a dict. */
function pyGet(obj, key, fallback = null) {
  if (!isDict(obj)) throw new TypeError(`object has no attribute 'get'`);
  return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : fallback;
}

/** Python str(x) for JSON scalars. */
function pyStr(v) {
  if (v === true) return "True";
  if (v === false) return "False";
  if (v === null || v === undefined) return "None";
  return String(v);
}

/** Python int(x) for JSON values; throws on invalid input (ValueError/TypeError). */
function pyInt(v) {
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new Error("ValueError");
    return Math.trunc(v);
  }
  if (typeof v !== "string") throw new TypeError("int() argument must be a string or a number");
  const text = pyStrip(v);
  if (!/^[+-]?\d+(?:_\d+)*$/u.test(text)) throw new Error("ValueError");
  return Number.parseInt(text.replaceAll("_", ""), 10);
}

function norm(text) {
  return zhFold((text || "").toLowerCase()).replace(NORM_RE, "");
}

function parseDuration(val) {
  if (typeof val === "number" || typeof val === "boolean") return pyInt(val);
  const text = pyStrip(val ? pyStr(val) : "");
  if (!text) return 0;
  const parts = text.split(":");
  try {
    if (parts.length === 2) return pyInt(parts[0]) * 60 + pyInt(parts[1]);
    if (parts.length === 3) return pyInt(parts[0]) * 3600 + pyInt(parts[1]) * 60 + pyInt(parts[2]);
    return pyInt(text);
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Minimal cookie jar (http.cookiejar.CookieJar equivalent for this module)
// ---------------------------------------------------------------------------

const jar = new Map(); // `${domain}|${path}|${name}` -> {name, value, domain, hostOnly, path, secure, expires}

function storeCookies(url, setCookie) {
  if (!setCookie) return;
  const host = url.hostname.toLowerCase();
  for (const line of Array.isArray(setCookie) ? setCookie : [setCookie]) {
    const [pair, ...attrs] = String(line).split(";");
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    let domain = host;
    let hostOnly = true;
    let path = "/";
    let secure = false;
    let expires = null;
    for (const attr of attrs) {
      const i = attr.indexOf("=");
      const k = (i === -1 ? attr : attr.slice(0, i)).trim().toLowerCase();
      const v = i === -1 ? "" : attr.slice(i + 1).trim();
      if (k === "domain" && v) {
        const d = v.replace(/^\./u, "").toLowerCase();
        if (host !== d && !host.endsWith("." + d)) {
          domain = null; // reject cookies for foreign domains
          break;
        }
        domain = d;
        hostOnly = false;
      } else if (k === "path" && v.startsWith("/")) path = v;
      else if (k === "secure") secure = true;
      else if (k === "max-age" && /^-?\d+$/u.test(v)) expires = now() + Number(v);
      else if (k === "expires" && expires === null) {
        const t = Date.parse(v);
        if (!Number.isNaN(t)) expires = t / 1000;
      }
    }
    if (!domain) continue;
    const key = `${domain}|${path}|${name}`;
    if (expires !== null && expires <= now()) jar.delete(key);
    else jar.set(key, { name, value, domain, hostOnly, path, secure, expires });
  }
}

function cookieHeader(url) {
  const host = url.hostname.toLowerCase();
  const reqPath = url.pathname || "/";
  const t = now();
  const out = [];
  for (const [key, c] of jar) {
    if (c.expires !== null && c.expires <= t) {
      jar.delete(key);
      continue;
    }
    if (c.hostOnly ? host !== c.domain : host !== c.domain && !host.endsWith("." + c.domain)) continue;
    if (!reqPath.startsWith(c.path)) continue;
    if (c.secure && url.protocol !== "https:") continue;
    out.push(c);
  }
  out.sort((a, b) => b.path.length - a.path.length);
  return out.map((c) => `${c.name}=${c.value}`).join("; ");
}

/**
 * _opener.open(Request(url, headers)) equivalent: follows redirects itself (urllib limit 10)
 * so each hop's cookies are captured, raises HttpError for >= 400. Resolves the IncomingMessage.
 */
async function jarOpen(url, headers, timeoutMs) {
  let current = url;
  for (let hop = 0; ; hop++) {
    const target = new URL(current);
    const reqHeaders = { ...headers };
    const cookie = cookieHeader(target);
    if (cookie) reqHeaders.Cookie = cookie;
    const res = await openRequest(target.toString(), { headers: reqHeaders, timeout: timeoutMs, redirects: 0 });
    storeCookies(target, res.headers["set-cookie"]);
    const status = res.statusCode || 0;
    if ([301, 302, 303, 307, 308].includes(status) && res.headers.location) {
      res.resume();
      if (hop >= 10) throw new HttpError(status, current);
      current = new URL(res.headers.location, target).toString();
      continue;
    }
    if (status >= 400) {
      res.resume();
      throw new HttpError(status, current);
    }
    res.finalUrl = target.toString();
    return res;
  }
}

function readAll(res) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    res.on("data", (c) => chunks.push(c));
    res.on("end", () => resolve(Buffer.concat(chunks)));
    res.on("error", (err) => reject(err instanceof NetError ? err : new NetError(err.message, err)));
    res.on("aborted", () => reject(new NetError("response aborted")));
  });
}

// threading.Lock equivalent for _ensure_cookies (serialises the warm-up requests).
let cookieLock = Promise.resolve();

async function ensureCookies() {
  if (cookieReadyAt && now() - cookieReadyAt < 3600 * 6) return;
  const run = cookieLock.then(async () => {
    if (cookieReadyAt && now() - cookieReadyAt < 3600 * 6) return;
    try {
      const res = await jarOpen("https://www.bilibili.com/", HEADERS, 8000);
      res.destroy(); // resp.read(1024): only the Set-Cookie headers matter
      cookieReadyAt = now();
    } catch {
      // pass
    }
  });
  cookieLock = run;
  await run;
}

async function getJson(url, timeout = 8) {
  await ensureCookies();
  const res = await jarOpen(url, HEADERS, timeout * 1000);
  const raw = await readAll(res);
  return JSON.parse(new TextDecoder("utf-8").decode(raw));
}

function buildQueries(cleanTitle, primaryArtist) {
  const queries = [primaryArtist ? pyStrip(`${cleanTitle} ${primaryArtist}`) : cleanTitle];
  const stripped = pyStrip(cleanTitle.replace(BRACKET_RE, " "));
  if (stripped && stripped !== cleanTitle && !LIVE_REMIX_RE.test(cleanTitle)) {
    queries.push(primaryArtist ? pyStrip(`${stripped} ${primaryArtist}`) : stripped);
  }
  return [queries, stripped];
}

function searchUrl(keyword) {
  return (
    "https://api.bilibili.com/x/web-interface/search/type?" +
    urlencode({ search_type: "video", keyword, page: 1, page_size: 20 })
  );
}

function resultsOf(data) {
  const results = pyGet(data, "data") || {};
  const list = pyGet(results, "result") || [];
  return Array.isArray(list) ? list : isDict(list) ? Object.keys(list) : typeof list === "string" ? Array.from(list) : [];
}

/** Find the best matching Bilibili video bvid for a song. */
async function searchBvid(title, artist = "", duration = 0) {
  const cleanTitle = pyStrip(title || "");
  const primaryArtist = pyStrip((artist || "").split(" / ")[0]);
  if (!cleanTitle) return null;

  const cacheKey = `${norm(cleanTitle)}|${norm(primaryArtist)}|${duration}`;
  const t0 = now();
  const hit = searchCache.get(cacheKey);
  if (hit && hit[0] > t0) return hit[1];

  const [queries, stripped] = buildQueries(cleanTitle, primaryArtist);

  const tNorm = norm(cleanTitle);
  const sNorm = stripped && stripped !== cleanTitle ? norm(stripped) : "";
  const aNorm = norm(primaryArtist);
  let bestBvid = null;
  let bestScore = -1e9;
  let gotOk = false;

  for (let idx = 0; idx < queries.length; idx++) {
    const keyword = queries[idx];
    if (idx > 0 && bestScore >= 6.0) break;
    let data;
    try {
      data = await getJson(searchUrl(keyword));
    } catch {
      continue;
    }
    if (pyGet(data, "code") === 0) gotOk = true;
    for (const item of resultsOf(data)) {
      const bvid = pyGet(item, "bvid");
      if (!bvid) continue;
      const rawTitle = pyStr(pyGet(item, "title") || "").replace(HTML_TAG_RE, "");
      const rtNorm = norm(rawTitle);
      if (!rtNorm) continue;
      const sec = parseDuration(pyGet(item, "duration"));
      // Skip clips that are obviously too short or full-album compilations.
      if (sec < 40 || sec > 900) continue;
      let score = 0.0;
      if (tNorm && rtNorm.includes(tNorm)) score += 6.0;
      else if (idx > 0 && sNorm && rtNorm.includes(sNorm)) score += 4.5;
      else continue; // Must at least loosely match title.
      if (aNorm && rtNorm.includes(aNorm)) score += 4.0;
      else if (aNorm && norm(pyStr(pyGet(item, "author") || "")).includes(aNorm)) score += 2.5;
      // Prefer studio/Hi-Res/MV uploads, penalize covers/karaoke/compilations.
      if (QUALITY_RE.test(rawTitle)) score += 2.0;
      if (NOISE_RE.test(rawTitle) && !NOISE_RE.test(cleanTitle)) score -= 6.0;
      if (LIVE_RE.test(rawTitle) && !LIVE_SHORT_RE.test(cleanTitle)) score -= 2.5;
      if (duration > 30 && sec > 0) {
        const diff = Math.abs(sec - duration);
        if (diff <= 8) score += 4.0;
        else if (diff <= 20) score += 2.0;
        else if (diff <= 45) score += 0.5;
        else if (diff > 90) score -= 5.0;
      }
      if (score > bestScore) {
        bestScore = score;
        bestBvid = bvid;
      }
    }
  }
  if (bestScore < 4.0) bestBvid = null;

  if (bestBvid !== null) searchCache.set(cacheKey, [t0 + 1800, bestBvid]);
  else if (gotOk) searchCache.set(cacheKey, [t0 + 180, null]);
  return bestBvid;
}

function isValidBvid(bvid) {
  if (!bvid) return false;
  if (typeof bvid !== "string") throw new TypeError("object has no attribute 'strip'");
  return BVID_RE.test(pyStrip(bvid));
}

/** Search Bilibili for top ranked video candidates for manual selection. */
async function searchCandidates(title, artist = "", duration = 0, limit = 5) {
  const cleanTitle = pyStrip(title || "");
  const primaryArtist = pyStrip((artist || "").split(" / ")[0]);
  if (!cleanTitle) return [];
  limit = Math.min(Math.max(pyInt(limit || 5), 1), 8);

  const cacheKey = `${norm(cleanTitle)}|${norm(primaryArtist)}|${duration}|${limit}`;
  const t0 = now();
  const hit = candidatesCache.get(cacheKey);
  if (hit && hit[0] > t0) return hit[1].map((item) => ({ ...item }));

  const [queries, stripped] = buildQueries(cleanTitle, primaryArtist);

  const tNorm = norm(cleanTitle);
  const sNorm = stripped && stripped !== cleanTitle ? norm(stripped) : "";
  const aNorm = norm(primaryArtist);
  const titleTokens = cleanTitle
    .split(TOKEN_SPLIT_RE)
    .map((p) => norm(p))
    .filter((tok) => [...tok].length >= 2);
  const titleHasHardNoise = HARD_NOISE_RE.test(cleanTitle);
  const titleHasSoft = SOFT_TAG_RE.test(cleanTitle);
  const titleHasLive = LIVE_RE.test(cleanTitle);

  const seen = new Set();
  const scored = []; // [score, play, dict]
  let gotOk = false;

  for (let idx = 0; idx < queries.length; idx++) {
    const keyword = queries[idx];
    if (idx > 0 && scored.length >= limit && Math.max(0.0, ...scored.map((s) => s[0])) >= 6.0) break;
    let data;
    try {
      data = await getJson(searchUrl(keyword));
    } catch {
      continue;
    }
    if (pyGet(data, "code") === 0) gotOk = true;
    for (const item of resultsOf(data)) {
      const bvid = pyStrip(pyStr(pyGet(item, "bvid") || ""));
      if (!isValidBvid(bvid) || seen.has(bvid)) continue;
      const rawTitle = pyStrip(pyStr(pyGet(item, "title") || "").replace(HTML_TAG_RE, ""));
      const rtNorm = norm(rawTitle);
      if (!rtNorm) continue;
      const sec = parseDuration(pyGet(item, "duration"));
      if (sec < 30 || sec > 1200) continue;
      if (!titleHasHardNoise && HARD_NOISE_RE.test(rawTitle)) continue;

      seen.add(bvid);
      const author = pyStrip(pyStr(pyGet(item, "author") || ""));
      const auNorm = norm(author);
      let score = 0.0;
      if (tNorm && rtNorm.includes(tNorm)) score += 6.0;
      else if (sNorm && rtNorm.includes(sNorm)) score += 4.5;
      else if (
        titleTokens.length &&
        titleTokens.some((tok) => rtNorm.includes(tok)) &&
        (!aNorm || rtNorm.includes(aNorm) || auNorm.includes(aNorm))
      )
        score += 2.0;
      else continue;

      if (aNorm && rtNorm.includes(aNorm)) score += 4.0;
      else if (aNorm && auNorm.includes(aNorm)) score += 2.5;
      if (QUALITY_RE.test(rawTitle)) score += 2.0;

      let tag = "";
      if (!titleHasSoft && SOFT_TAG_RE.test(rawTitle)) {
        score -= 3.5;
        tag = "翻唱/改编";
      } else if (!titleHasLive && LIVE_RE.test(rawTitle)) {
        score -= 1.5;
        tag = "现场";
      }

      if (duration > 30 && sec > 0) {
        const diff = Math.abs(sec - duration);
        if (diff <= 8) score += 4.0;
        else if (diff <= 20) score += 2.0;
        else if (diff <= 45) score += 0.5;
        else if (diff > 90) score -= 4.0;
      }

      if (score < 2.0) continue;
      let play;
      try {
        play = pyInt(pyGet(item, "play") || 0);
      } catch {
        play = 0;
      }
      scored.push([score, play, { bvid, title: rawTitle, author, duration: sec, tag }]);
    }
  }

  // sorted(key=(score, play), reverse=True) is stable for equal keys.
  scored.sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const out = scored.slice(0, limit).map((row) => row[2]);
  if (gotOk || out.length) {
    if (candidatesCache.size > 200) candidatesCache.clear();
    candidatesCache.set(cacheKey, [t0 + (out.length ? 600 : 120), out]);
  }
  return out.map((item) => ({ ...item }));
}

/** Resolve the highest-bitrate DASH audio stream [url, mime] for a bvid. */
async function getAudioStream(bvid) {
  if (!isValidBvid(bvid)) return null;
  bvid = pyStrip(bvid);
  const t0 = now();
  const hit = audioCache.get(bvid);
  if (hit && hit[0] > t0) return [hit[1], hit[2]];
  try {
    const view = await getJson(`https://api.bilibili.com/x/web-interface/view?bvid=${quote(bvid)}`);
    const cid = pyGet(pyGet(view, "data") || {}, "cid");
    if (!cid) return null;
    const play = await getJson(`https://api.bilibili.com/x/player/playurl?bvid=${quote(bvid)}&cid=${pyStr(cid)}&fnval=16`);
    const audios = pyGet(pyGet(pyGet(play, "data") || {}, "dash") || {}, "audio") || [];
    if (!audios.length) return null;
    let best = null;
    let bestBw = null;
    for (const a of audios) {
      const bw = pyGet(a, "bandwidth", 0);
      if (best === null || bw > bestBw) {
        best = a;
        bestBw = bw;
      }
    }
    const url = best.baseUrl || best.base_url;
    const mime = best.mimeType || best.mime_type || "audio/mp4";
    if (!url) return null;
    // Bilibili signed URLs are typically valid for ~2 hours; cache 45 min.
    audioCache.set(bvid, [t0 + 2700, url, mime]);
    return [url, mime];
  } catch {
    return null;
  }
}

/** Search Bilibili for a song and return [bvid, stream_url, mime]. */
async function resolveSongAudio(title, artist = "", duration = 0) {
  const bvid = await searchBvid(title, artist, duration);
  if (!bvid) return null;
  const stream = await getAudioStream(bvid);
  if (!stream) return null;
  return [bvid, stream[0], stream[1]];
}

/**
 * Open the Bilibili audio stream with required Referer/UA and optional Range.
 * Resolves the upstream IncomingMessage (statusCode, headers) for piping; rejects with
 * HttpError (>= 400) or NetError like urllib's HTTPError / URLError.
 */
async function openUpstream(streamUrl, rangeHeader = null) {
  await ensureCookies();
  const reqHeaders = { ...HEADERS };
  if (rangeHeader) reqHeaders.Range = rangeHeader;
  const res = await jarOpen(streamUrl, reqHeaders, 15000);
  res.status = res.statusCode; // urllib response .status
  return res;
}

module.exports = {
  UA,
  HEADERS,
  isValidBvid,
  searchBvid,
  searchCandidates,
  getAudioStream,
  resolveSongAudio,
  openUpstream,
  // internals kept for parity with bili.py's module namespace
  _norm: norm,
  _parseDuration: parseDuration,
  _ensureCookies: ensureCookies,
  _getJson: getJson,
};
