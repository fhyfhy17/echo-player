"use strict";
// Port of sources/catalog.py: Kuwo-backed catalog (search, charts, playlists, lyrics, import,
// roam / daily recommendations) plus the NetEase storefront and the audio waterfall.
// NetEase requests go through NeteaseCloudMusicApi Enhanced (../netease_api).

const pLimit = require("p-limit");
const { httpRequest, HttpError } = require("../net");
const { MEDIA_LIMIT, searchKey } = require("./base");
const { ne: neApi } = require("../netease_api");
const {
  htmlUnescape,
  sleep,
  monotonic,
  poolMap,
  PyRandom,
  globalRandom,
  md5Hex,
  toInt,
  urlencode,
  quote,
  TtlCache,
  getLogger,
} = require("../pyutil");

const logger = getLogger("echo.catalog");

const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" };
const NETEASE_HEADERS = { "User-Agent": "Mozilla/5.0", Referer: "https://music.163.com" };
const QQ_HEADERS = { "User-Agent": "Mozilla/5.0", Referer: "https://y.qq.com/" };
const CACHE_TTL = 20 * 60;
const _cache = new TtlCache(400);
// Kuwo answers 403 when too many searches run at once.
const _kuwoSlots = pLimit(3);

const CHARTS = [
  [16, "热歌榜"],
  [93, "飙升榜"],
  [17, "新歌榜"],
  [182, "粤语榜"],
  [22, "欧美榜"],
  [184, "韩语榜"],
  [26, "经典怀旧榜"],
  [187, "流行趋势榜"],
  [204, "现场音乐榜"],
];
const CHART_IDS = new Set(CHARTS.map(([cid]) => cid));

// Python's \b is Unicode-aware; these helpers keep the same boundaries in JS.
const WB = "(?<![\\p{L}\\p{N}_])";
const WE = "(?![\\p{L}\\p{N}_])";
const w = (word) => `${WB}${word}${WE}`;

const NOISE = new RegExp(
  `${w("dj")}|DJ|remix|mashup|slowed|reverb|nightcore|8d|type\\s*beat|${w("beats?")}|${WB}inst\\.?(?:${WE}|(?<=\\.))|` +
    "karaoke|KTV|慢摇|电音|搞笑|片段|伴奏|伴唱|消音|铃声|抖音|快手|车载|打跳|热舞|广场舞|" +
    "极简主义|氛围旋律|旋律氛围|治愈版|深情版|降调|升调|网友改编|改编|哈基米|原声韵味|环绕|" +
    `滚动的天空|翻自|翻唱|${w("cover")}|女声版|男声版|女生版|男生版|原唱[:：\\s]|` +
    "\\d+(?:\\.\\d+)?\\s*倍?速|\\d\\.\\d\\s*版|(?<!现场)版\\)|\\(.*?版\\)",
  "iu",
);
const HARD_NOISE_RE = new RegExp(
  `${w("dj")}|DJ|remix|mashup|slowed|reverb|nightcore|8d|bootleg|${w("flip")}|type\\s*beat|${w("beats?")}|${WB}inst\\.?(?:${WE}|(?<=\\.))|` +
    "karaoke|KTV|慢摇|电音|搞笑|片段|伴奏|伴唱|消音|铃声|抖音|快手|车载|打跳|热舞|广场舞|" +
    "极简主义|氛围旋律|旋律氛围|治愈版|深情版|氛围版|浴室|战个痛快|降调|升调|网友改编|改编|哈基米|" +
    "原声韵味|环绕|滚动的天空|\\d+(?:\\.\\d+)?\\s*倍?速|\\d\\.\\d\\s*版|DJ劲曲|tabata\\s*mix",
  "iu",
);
const COVER_NOISE_RE = new RegExp(
  `翻自|翻唱|${w("cover")}|${w("tribute")}|女声版|男声版|女生版|男生版|独唱版|童声版|学生版|合唱版|` +
    "R&B版|日语版|日文版|原唱[:：\\s]|好听的翻唱|翻唱集|翻唱系列|听了无语|再次寻找周杰伦|贝瓦儿歌",
  "iu",
);
const INSTRUMENTAL_RE = new RegExp(
  "纯?钢琴|钢琴[版曲屋]?|弦乐|吉他版|萨克斯|小提琴|古筝|笛子|八音盒|" +
    `${WB}(?:piano|acoustic|instrumental)${WE}|纯音乐|轻音乐`,
  "iu",
);
const LIVE_RE = new RegExp(
  "(?<![a-z])live(?![a-z])|现场|演唱會|演唱会|音乐节|巡演|巡回|音乐汇|" +
    "好声音|新歌声|我是歌手|乘风|春晚|年货节|晚会|开幕式|总决赛",
  "iu",
);
const COMPILATION_ALBUM_RE = new RegExp(
  "精选|合辑|合集|热歌|金曲|现场|演唱会|音乐会|新歌声|好声音|我是歌手|乘风|全记录|" +
    "对唱|影视原声|电视剧|ost|tribute|greatest\\s*hits|best\\s*of|summer\\s*vibes",
  "iu",
);
const VERSION_TAG = new RegExp(
  "[(（\\[【].*?[)）\\]】]|[-—–]\\s*(?:《|原唱|live|现场|dj|remix|伴奏|纯音乐|钢琴|弦乐|吉他|翻唱).*$",
  "iu",
);

/** re.sub(pattern, repl, value) for a shared (non-global) RegExp. */
function sub(re, value, replacement = "") {
  const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
  return String(value ?? "").replace(new RegExp(re.source, flags), replacement);
}

const isDigits = (value) => /^\d+$/.test(String(value));

function parseQueryIntent(query) {
  const q = query || "";
  return {
    live: /live|现场|演唱会|音乐节/iu.test(q),
    dj: new RegExp(`${w("dj")}|remix|电音|慢摇|beat|slowed|reverb|mashup`, "iu").test(q),
    inst: /伴奏|纯音乐|轻音乐|钢琴|弦乐|吉他|inst|piano|acoustic|instrumental/iu.test(q),
    cover: /翻唱|翻自|cover|女声|男声/iu.test(q),
  };
}

function baseTitleKey(title) {
  let t = sub(VERSION_TAG, title || "").trim();
  t = t.replace(/(?:原唱[:：\s].*|钢琴版|弦乐版|治愈版|深情版|吉他版|dj版)$/iu, "").trim();
  return searchKey(t) || searchKey(title || "");
}

// --------------------------------------------------------------------------- http

/** Port of _fetch: cached JSON GET with the Kuwo single-quote pseudo-JSON fallback. */
async function fetchJson(url, headers, ttl = CACHE_TTL, kuwoJson = false) {
  const hit = _cache.get(url);
  if (hit !== undefined) return hit;
  const res = await httpRequest(url, { headers, timeout: 8000, maxBytes: MEDIA_LIMIT * 2 });
  const text = res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    if (!kuwoJson) throw err;
    // Older Kuwo endpoints emit single-quoted pseudo-JSON.
    data = JSON.parse(text.replace(/'/g, '"'));
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Unexpected upstream response");
  _cache.set(url, data, ttl);
  return data;
}

// ---------------------------------------------------------------------- helpers

const _AMP = /\\+u0026|\\+&/g;

function _text(value) {
  return htmlUnescape(String(value || "")).replace(_AMP, "&").replace(/\u00a0/g, " ").trim();
}

function _artists(value) {
  return _text(value)
    .split("&")
    .map((p) => p.trim())
    .filter(Boolean)
    .join(" / ");
}

const _int = toInt;

function _https(url) {
  if (typeof url !== "string" || !url.startsWith("http")) return null;
  const out = url.replace(/^http:\/\/img\d?(\.sycdn|\.kwcdn)?\.kuwo\.cn/, "https://img4.kuwo.cn");
  return out.replace("http://", "https://");
}

function _cover(path, size = 300) {
  if (!path) return null;
  const p = String(path);
  if (p.startsWith("http")) return _https(p.replace(/\/albumcover\/\d+\//g, `/albumcover/${size}/`));
  return `https://img4.kuwo.cn/star/albumcover/${size}/${p.replace(/^\d+\//, "")}`;
}

/** Kuwo artist / album ids, whichever casing the endpoint uses. */
function _ids(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const artistId = String(raw.artistid || raw.ARTISTID || raw.artistId || "").trim();
  const albumId = String(raw.albumid || raw.ALBUMID || raw.albumId || "").trim();
  const out = {};
  if (isDigits(artistId) && artistId !== "0") out.artistId = Number.parseInt(artistId, 10);
  if (isDigits(albumId) && albumId !== "0") out.albumId = Number.parseInt(albumId, 10);
  return out;
}

function track(rid, title, artist, album = "", duration = 0, art = null, raw = null) {
  const id = String(rid || "").replace(/MUSIC_/g, "").trim();
  if (!isDigits(id)) return null;
  return {
    ..._ids(raw),
    id,
    title: _text(title) || "未知歌曲",
    artist: _artists(artist) || "未知歌手",
    album: _text(album),
    duration: _int(duration),
    art: art ?? null,
    source: "kuwo",
    source_name: "酷我",
  };
}

// ----------------------------------------------------------------------- search

async function _kuwoSearchRaw(query, page, rows) {
  const url =
    "http://search.kuwo.cn/r.s?" +
    urlencode({
      all: query,
      ft: "music",
      client: "kt",
      cluster: 1,
      pn: Math.max(page - 1, 0),
      rn: rows,
      rformat: "json",
      encoding: "utf8",
      vipver: "MUSIC_9.1.1.2_BCS39",
    });
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const data = await _kuwoSlots(() => fetchJson(url, UA, 10 * 60, true));
      return (data.abslist || []).filter((s) => s && typeof s === "object" && !Array.isArray(s));
    } catch (err) {
      if (!(err instanceof HttpError) || err.code !== 403 || attempt === 3) throw err;
      await sleep(600 * (attempt + 1));
    }
  }
  return [];
}

/** Kuwo song search returning [[track, meta], ...] and hasMore. */
async function searchScored(query, page = 1, rows = 60) {
  const items = await _kuwoSearchRaw(query, page, rows);
  const intent = parseQueryIntent(query);
  const qkey = searchKey(query);
  const words = query.split(/\s+/).map((x) => searchKey(x)).filter(Boolean);

  const scored = [];
  items.forEach((item, rank) => {
    const t = track(item.MUSICRID, item.SONGNAME, item.ARTIST, item.ALBUM, item.DURATION, _cover(item.web_albumpic_short), item);
    if (!t) return;
    const { title, artist, album } = t;
    if (!intent.dj && (HARD_NOISE_RE.test(title) || HARD_NOISE_RE.test(album))) return;
    if (!intent.inst && /伴奏|伴唱|消音|KTV|Inst\.?/iu.test(title)) return;
    if (t.duration > 0 && t.duration < 55) return;
    if ((title.match(/\+/g) || []).length >= 2) return;

    const bkey = baseTitleKey(title);
    const akey = searchKey(artist);
    const hay = searchKey(title) + akey + searchKey(album);
    if (words.length && !words.every((x) => hay.includes(x))) return;

    const pop = Math.max(0, Math.min(100, _int(item.SCORE100)));
    const isCover = COVER_NOISE_RE.test(title) || COVER_NOISE_RE.test(album);
    const isInst = INSTRUMENTAL_RE.test(title);
    const isLive = LIVE_RE.test(title) || LIVE_RE.test(album);

    let s = pop * 0.22 + Math.max(0, 12 - rank * 0.35);
    if (bkey === qkey || words.some((x) => bkey === x)) s += 28;
    else if (qkey && bkey.startsWith(qkey)) s += 10;
    else if (words.some((x) => bkey.includes(x))) s += 6;
    else s -= 14;
    const firstA = searchKey(artist.split(" / ")[0]);
    if (firstA === qkey || words.some((x) => x === firstA)) s += 20;
    else if (words.some((x) => akey.includes(x))) s += 10;
    if (album && !COMPILATION_ALBUM_RE.test(album)) s += 6;
    else if (!album) s -= 8;
    if (isCover && !intent.cover) s -= 28;
    if (isInst && !intent.inst) s -= 22;
    if (isLive && !intent.live) s -= 16;

    const meta = { pop, rank, coverType: null, is_cover: isCover, is_inst: isInst, is_live: isLive };
    scored.push([s, t, meta]);
  });

  scored.sort((a, b) => b[0] - a[0]);
  const out = [];
  const seen = new Set();
  for (const [, t, meta] of scored) {
    const artistsNorm = t.artist
      .split(" / ")
      .map((a) => searchKey(a))
      .filter(Boolean)
      .sort()
      .join(",");
    const ident = `${baseTitleKey(t.title)}|${artistsNorm}|${meta.is_live ? "1" : "0"}`;
    if (seen.has(ident)) continue;
    seen.add(ident);
    out.push([t, meta]);
  }
  return [out, items.length >= Math.floor(rows / 2)];
}

/** Kuwo song search: ranked by relevance, authenticity and popularity. */
async function search(query, page = 1, rows = 60) {
  const [pairs, hasMore] = await searchScored(query, page, rows);
  return { tracks: pairs.map(([t]) => t), hasMore };
}

// ------------------------------------------------------------------------ match

/** Pick the Kuwo recording that best matches a song from another platform. */
async function match(title, artist, duration = 0) {
  if (!title) return null;
  const mainArtist = (artist || "").split(/\s*\/\s*|、|&|,/u)[0].trim();
  const wantLive = /live|现场/iu.test(title);
  const titleKey = searchKey(sub(VERSION_TAG, title)) || searchKey(title);
  const artistKey = searchKey(mainArtist);

  const score = (item) => {
    const t = track(item.MUSICRID, item.SONGNAME, item.ARTIST, item.ALBUM, item.DURATION, null, item);
    if (!t) return [-99, null];
    let s = 0;
    const candTitle = searchKey(sub(VERSION_TAG, t.title));
    if (candTitle === titleKey) s += 5;
    else if (titleKey && (candTitle.includes(titleKey) || titleKey.includes(candTitle))) s += 2;
    else s -= 4;
    if (artistKey && searchKey(t.artist).includes(artistKey)) s += 4;
    if (/live|现场/iu.test(t.title) !== wantLive) s -= 4;
    if (t.artist.split(" / ").length - 1 >= 3) s -= 3;
    if (NOISE.test(t.title)) s -= 3;
    if (duration && t.duration) {
      const gap = Math.abs(t.duration - duration);
      s += gap <= 3 ? 2 : gap <= 10 ? 0 : -2;
    }
    t.art = _cover(item.web_albumpic_short);
    return [s, t];
  };

  const baseTitle = sub(VERSION_TAG, title).trim() || title;
  let best = [-99, null];
  for (const query of [`${baseTitle} ${mainArtist}`.trim(), baseTitle]) {
    let items;
    try {
      items = await _kuwoSearchRaw(query, 1, 20);
    } catch {
      continue;
    }
    // max() keeps the first of equal scores.
    let cand = [-99, null];
    let first = true;
    for (const item of items) {
      const sc = score(item);
      if (first || sc[0] > cand[0]) {
        cand = sc;
        first = false;
      }
    }
    if (cand[0] > best[0]) best = cand;
    if (best[0] >= 9) break;
  }
  return best[0] >= 6 ? best[1] : null;
}

// ----------------------------------------------------------------------- charts

function charts() {
  return CHARTS.map(([id, name]) => ({ id, name }));
}

async function chart(chartId, page = 1, rows = 100) {
  if (!CHART_IDS.has(chartId)) throw new Error("Unknown chart");
  const name = new Map(CHARTS).get(chartId) || "";
  try {
    // Newer web API: real durations and album covers, but max 30 rows per page.
    const fetchPage = async (n) => {
      const data = await fetchJson(
        "http://wapi.kuwo.cn/api/www/bang/bang/musicList?" + urlencode({ bangId: chartId, pn: n, rn: 30, httpsStatus: 1 }),
        UA,
      );
      return data.data || {};
    };
    const pages = Math.max(1, Math.floor((rows + 29) / 30));
    const bodies = await poolMap(
      Array.from({ length: pages }, (_, i) => page + i),
      pages,
      fetchPage,
    );
    const songs = [];
    const seen = new Set();
    for (const body of bodies) {
      for (const m of body.musicList || []) {
        if (!m || typeof m !== "object" || Array.isArray(m)) continue;
        const t = track(m.rid || m.musicrid, m.name, m.artist, m.album, m.duration, _cover(m.pic || m.albumpic), m);
        if (t && !seen.has(t.id)) {
          seen.add(t.id);
          songs.push(t);
        }
      }
    }
    if (songs.length) {
      return { id: chartId, name, art: _https(bodies[0].img), total: _int(bodies[0].num), tracks: songs.slice(0, rows) };
    }
  } catch (err) {
    logger.info("wapi chart failed, falling back: %s", err);
  }
  const data = await fetchJson(
    "http://kbangserver.kuwo.cn/ksong.s?" +
      urlencode({
        from: "pc",
        fmt: "json",
        pn: Math.max(page - 1, 0),
        rn: rows,
        type: "bang",
        data: "content",
        id: chartId,
        show_copyright_off: 0,
        pcmp4: 1,
        isbang: 1,
      }),
    UA,
    CACHE_TTL,
    true,
  );
  const songs = (data.musiclist || [])
    .filter((m) => m && typeof m === "object" && !Array.isArray(m))
    // "duration" here is not the track length; "song_duration" is.
    .map((m) => track(m.id, m.name, m.artist, m.album, m.song_duration || m.duration, null, m))
    .filter(Boolean);
  return { id: chartId, name, art: _https(data.pic), total: _int(data.num), tracks: songs };
}

// -------------------------------------------------------------------- playlists

async function playlists(page = 1, rows = 30) {
  const url = "http://wapi.kuwo.cn/api/pc/classify/playlist/getRcmPlayList?" + urlencode({ pn: page, rn: rows, order: "hot" });
  const data = await fetchJson(url, UA);
  const out = [];
  for (const p of (data.data || {}).data || []) {
    if (!p || typeof p !== "object" || !isDigits(String(p.id ?? ""))) continue;
    out.push({
      id: p.id,
      name: _text(p.name),
      art: _https(p.img),
      count: _int(p.total),
      plays: _int(p.listencnt),
      creator: _text(p.uname),
    });
  }
  return out;
}

async function playlist(pid, rows = 500) {
  if (!/^\d{1,14}$/.test(String(pid))) throw new Error("Invalid playlist");
  const url =
    "http://nplserver.kuwo.cn/pl.svc?" +
    urlencode({
      op: "getlistinfo",
      pid,
      pn: 0,
      rn: rows,
      encode: "utf8",
      keyset: "pl2012",
      identity: "kuwo",
      pcmp4: 1,
      vipver: "MUSIC_9.0.5.0_W1",
      newver: 1,
    });
  const data = await fetchJson(url, UA);
  const songs = (data.musiclist || [])
    .filter((m) => m && typeof m === "object" && !Array.isArray(m))
    .map((m) => track(m.id, m.name, m.artist, m.album, m.duration, _cover(m.albumpic), m))
    .filter(Boolean);
  return {
    id: pid,
    name: _text(data.title),
    art: _https(data.pic),
    brief: _text(data.info).replace(/\s+/g, " ").slice(0, 300),
    creator: _text(data.uname),
    tracks: songs,
  };
}

// ----------------------------------------------------------------------- lyrics

const _lyricCache = new TtlCache(500);

function _parseLrc(text) {
  const lines = [];
  for (const raw of String(text || "").split(/\r\n|\r|\n/)) {
    const stamps = [...raw.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
    const words = raw.replace(/\[[^\]]*\]/g, "").trim();
    if (!words) continue;
    for (const [, minute, second] of stamps) {
      lines.push({ time: Number.parseInt(minute, 10) * 60 + Number.parseFloat(second), text: words });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}

function _parseKuwoLrclist(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const lines = [];
  for (const line of payload.lrclist || []) {
    if (!line || typeof line !== "object") continue;
    const text = _text(line.lineLyric);
    const time = Number.parseFloat(line.time);
    if (!Number.isFinite(time)) continue;
    if (text) lines.push({ time, text });
  }
  return lines;
}

async function _kuwoLyrics(rid) {
  const openapiUrl = `http://www.kuwo.cn/openapi/v1/www/lyric/getlyric?musicId=${rid}`;
  try {
    const res = await httpRequest(openapiUrl, { headers: { ...UA, Referer: "https://www.kuwo.cn/" }, timeout: 8000, maxBytes: MEDIA_LIMIT });
    const data = JSON.parse(res.text());
    const lines = _parseKuwoLrclist(data && typeof data === "object" ? data.data : null);
    if (lines.length) return lines;
  } catch (err) {
    logger.info("kuwo openapi lyrics failed: %s", err);
  }
  const url = `http://m.kuwo.cn/newh5/singles/songinfoandlrc?musicId=${rid}&httpsStatus=1`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await httpRequest(url, { headers: UA, timeout: 8000, maxBytes: MEDIA_LIMIT });
    const data = JSON.parse(res.text());
    const lines = _parseKuwoLrclist(data && typeof data === "object" ? data.data : null);
    if (lines.length) return lines;
    await sleep(350 * (attempt + 1)); // transient "音乐查询失败"
  }
  return [];
}

function _artistMatches(targetArtist, candidateArtists) {
  if (!targetArtist) return true;
  const targets = targetArtist.split(/[/、,，&]+/u).map((p) => searchKey(p)).filter(Boolean);
  if (!targets.length) return true;
  const cands = candidateArtists.map((n) => searchKey(n)).filter(Boolean);
  return targets.some((t) => cands.some((c) => t === c || (t.length >= 2 && (c.includes(t) || t.includes(c)))));
}

async function _qqLyrics(title, artist) {
  if (!title) return [];
  const query = `${sub(VERSION_TAG, title).trim() || title} ${artist.split(" / ")[0]}`.trim();
  const data = await fetchJson("https://c.y.qq.com/soso/fcgi-bin/client_search_cp?p=1&n=6&format=json&w=" + quote(query), QQ_HEADERS);
  const titleKey = searchKey(sub(VERSION_TAG, title)) || searchKey(title);
  for (const song of ((data.data || {}).song || {}).list || []) {
    const candTitle = searchKey(sub(VERSION_TAG, song.songname || ""));
    if (candTitle !== titleKey) continue;
    const singers = (song.singer || []).map((s) => s.name || "");
    if (!_artistMatches(artist, singers)) continue;
    const mid = song.songmid || "";
    if (!mid) continue;
    const ldata = await fetchJson(
      `https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=${mid}&format=json&nobase64=1`,
      QQ_HEADERS,
    );
    let lines = _parseLrc(ldata.lyric || "");
    if (!lines.length) continue;
    const trans = _parseLrc(ldata.trans || "");
    if (trans.length) lines = require("./ne").mergeTranslation(lines, trans);
    return lines;
  }
  return [];
}

async function _neteaseLyrics(title, artist) {
  const query = `${sub(VERSION_TAG, title).trim() || title} ${artist.split(" / ")[0]}`.trim();
  const found = await neApi.search({ s: query, type: 1, limit: 8, offset: 0 }, CACHE_TTL);
  const titleKey = searchKey(sub(VERSION_TAG, title)) || searchKey(title);
  for (const song of (found.result || {}).songs || []) {
    if (searchKey(sub(VERSION_TAG, song.name || "")) !== titleKey) continue;
    const artists = (song.artists || []).map((a) => a.name || "");
    if (!_artistMatches(artist, artists)) continue;
    const data = await neApi.lyric(song.id, CACHE_TTL);
    const lines = _parseLrc((data.lrc || {}).lyric || "");
    if (lines.length) {
      const trans = _parseLrc((data.tlyric || {}).lyric || "");
      return trans.length ? require("./ne").mergeTranslation(lines, trans) : lines;
    }
  }
  return [];
}

async function _neteaseLyricsById(songId) {
  const data = await neApi.lyric(songId, CACHE_TTL);
  return _parseLrc((data.lrc || {}).lyric || "");
}

async function lyrics(rid, title = "", artist = "") {
  const id = String(rid).replace(/MUSIC_/g, "");
  const isNe = id.startsWith("ne-") && isDigits(id.slice(3));
  const key = isDigits(id) || isNe ? id : `${title}|${artist}`;
  const hit = _lyricCache.get(key);
  if (hit !== undefined) return hit;
  let lines = [];
  try {
    if (isNe) {
      const ne = require("./ne");
      lines = ne.mergeTranslation(...(await ne.lyrics(id.slice(3))));
    } else if (isDigits(id)) {
      lines = await _kuwoLyrics(id);
    }
  } catch (err) {
    logger.info("direct lyrics failed: %s", err);
  }
  if (!lines.length && title) {
    try {
      const ne = require("./ne");
      lines = await ne.lyricsByTitle(title, artist);
      if (!lines.length) lines = await _qqLyrics(title, artist);
      if (!lines.length) lines = await _neteaseLyrics(title, artist);
    } catch (err) {
      logger.info("fallback lyrics failed: %s", err);
    }
  }
  if (lines.length) _lyricCache.set(key, lines, 6 * 60 * 60);
  return lines;
}

// ----------------------------------------------------------------------- import

async function _neteasePlaylist(pid) {
  const data = await neApi.playlistDetail(pid, CACHE_TTL);
  const pl = data.playlist || {};
  const ids = (pl.trackIds || []).filter((t) => t && typeof t === "object" && Number.isInteger(t.id)).map((t) => t.id);
  const songs = [];
  for (let start = 0; start < Math.min(ids.length, 1000); start += 200) {
    const detail = await neApi.songDetail(ids.slice(start, start + 200), CACHE_TTL);
    for (const s of detail.songs || []) {
      const artist = (s.ar || [])
        .filter((a) => a && typeof a === "object")
        .map((a) => a.name ?? "")
        .join(" / ");
      songs.push([s.name || "", artist, Math.floor((s.dt || 0) / 1000)]);
    }
  }
  return [_text(pl.name) || "网易云歌单", songs];
}

async function _qqPlaylist(pid) {
  const url =
    "https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg?type=1&json=1&utf8=1" +
    `&onlysong=0&format=json&disstid=${pid}`;
  const data = await fetchJson(url, QQ_HEADERS);
  const cd = (data.cdlist || [{}])[0] || {};
  const songs = [];
  for (const s of cd.songlist || []) {
    const artist = (s.singer || [])
      .filter((a) => a && typeof a === "object")
      .map((a) => a.name ?? "")
      .join(" / ");
    songs.push([s.songname || "", artist, _int(s.interval)]);
  }
  return [_text(cd.dissname) || "QQ 音乐歌单", songs];
}

/** Return [platform, playlistId] for NetEase, QQ or Kuwo share links. */
function parsePlaylistLink(link) {
  const text = (link || "").trim();
  const found = /https?:\/\/\S+/.exec(text);
  const raw = (found ? found[0] : text).replace("/#/", "/");
  // urllib.parse.urlsplit never fails on scheme-less input; mirror that with a dummy base.
  let parts;
  try {
    parts = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? new URL(raw) : null;
  } catch {
    return null;
  }
  if (!parts) return null;
  const host = parts.host.toLowerCase();
  const first = (name) => parts.searchParams.get(name) || "";
  if (host.includes("163") || host.includes("music.126")) {
    const pid = first("id");
    return isDigits(pid) ? ["netease", pid] : null;
  }
  if (host.includes("qq.com")) {
    let pid = first("id") || first("disstid");
    if (!pid) {
      const m = /\/playlist\/(\d+)/.exec(parts.pathname);
      pid = m ? m[1] : "";
    }
    return isDigits(pid) ? ["qq", pid] : null;
  }
  if (host.includes("kuwo")) {
    const m = /\/playlist(?:_detail)?\/(\d+)/.exec(parts.pathname);
    const pid = m ? m[1] : first("pid");
    return isDigits(pid) ? ["kuwo", pid] : null;
  }
  return null;
}

async function _matchImportedSong(title, artist = "", duration = 0) {
  const t = (title || "").trim();
  const a = (artist || "").trim();
  if (!t) return null;
  const ne = require("./ne");
  try {
    if (a) {
      const hit = await ne.lookup(t, a, Math.trunc(duration || 0));
      if (hit) return hit;
    }
  } catch {
    // fall through
  }
  if (a) {
    const hit = await match(t, a, duration);
    if (hit) return hit;
  }
  const query = a ? `${t} ${a}`.trim() : t;
  try {
    const neHits = (await ne.search(query, 1, 5)).tracks || [];
    if (neHits.length) return neHits[0];
  } catch {
    // fall through
  }
  try {
    const kwHits = (await search(query, 1, 5)).tracks || [];
    if (kwHits.length) return kwHits[0];
  } catch {
    // fall through
  }
  return null;
}

function _collectMatches(entries, matched, label) {
  const found = [];
  const missing = [];
  const seen = new Set();
  entries.forEach((entry, i) => {
    const hit = matched[i];
    const uid = hit ? `${hit.source ?? "kw"}:${hit.id}` : "";
    if (hit && !seen.has(uid)) {
      seen.add(uid);
      found.push(hit);
    } else if (!hit) {
      missing.push(label(entry));
    }
  });
  return [found, missing];
}

async function importPlaylist(link) {
  const parsed = parsePlaylistLink(link);
  if (!parsed) throw new Error("Unsupported playlist link");
  const [platform, pid] = parsed;
  if (platform === "kuwo") {
    const data = await playlist(pid);
    return { name: data.name, tracks: data.tracks, missing: [], total: data.tracks.length };
  }
  if (platform === "netease") {
    const data = await neteasePlaylistDetail(pid, 500);
    return { name: data.name, tracks: data.tracks, missing: [], total: data.tracks.length };
  }
  const [name, all] = await _qqPlaylist(pid);
  const songs = all.filter((s) => s[0]).slice(0, 500);
  const matched = await poolMap(songs, 4, (s) => _matchImportedSong(...s).catch(() => null));
  const [found, missing] = _collectMatches(songs, matched, (s) => (s[1] ? `${s[0]} - ${s[1]}` : s[0]));
  return { name, tracks: found, missing: missing.slice(0, 50), total: songs.length };
}

const _LINE_PREFIX_RE = /^\s*(?:[[(]?\d{1,3}[\]).、\s]+|[•·\-*]+\s+)/u;
const _LINE_DUR_RE = /(?:\s*[[(]?\d{1,2}:\d{2}[\])]?\s*)+$/u;
const _LINE_SPLIT_RE = /\s+(?:-|—|–|\||\/)\s+|\t+/u;

/** Parse lines like '晴天 - 周杰伦' or '1. 七里香 - 周杰伦' into [title, artist]. */
function parsePlaylistText(rawText) {
  const entries = [];
  const seenLines = new Set();
  for (const raw of String(rawText || "").split(/\r\n|\r|\n/)) {
    let line = raw.trim().replace(_LINE_PREFIX_RE, "");
    line = line.replace(_LINE_DUR_RE, "").trim();
    if (!line || line.startsWith("#")) continue;
    const key = searchKey(line);
    if (!key || seenLines.has(key)) continue;
    seenLines.add(key);
    const m = _LINE_SPLIT_RE.exec(line);
    const parts = m ? [line.slice(0, m.index), line.slice(m.index + m[0].length)] : [line];
    if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
      entries.push([parts[0].trim().slice(0, 120), parts[1].trim().slice(0, 120)]);
    } else if (line.includes(" - ")) {
      const idx = line.indexOf(" - ");
      entries.push([line.slice(0, idx).trim().slice(0, 120), line.slice(idx + 3).trim().slice(0, 120)]);
    } else {
      entries.push([line.slice(0, 120), ""]);
    }
    if (entries.length >= 120) break;
  }
  return entries;
}

async function importPlaylistText(rawText, name = "") {
  const entries = parsePlaylistText(rawText);
  if (!entries.length) throw new Error("没有解析到有效的歌曲条目");
  const matched = await poolMap(entries, 4, (s) => _matchImportedSong(s[0], s[1]).catch(() => null));
  const [found, missing] = _collectMatches(entries, matched, ([t, a]) => (a ? `${t} - ${a}` : t));
  const cleanName = (name || "").trim().slice(0, 60) || "文本导入歌单";
  return { name: cleanName, tracks: found, missing: missing.slice(0, 50), total: entries.length };
}

// ----------------------------------------------------------------------- health

/** Quick probe of each upstream so the UI can warn when one breaks. */
async function health() {
  const { manager } = require("./manager");
  const probe = async (fn) => {
    for (let i = 0; i < 2; i++) {
      try {
        const res = await fn();
        if (Array.isArray(res) ? res.length : res) return true;
      } catch (err) {
        logger.info("health probe failed: %s", err);
      }
    }
    return false;
  };
  const kuwo = manager.getSource("kuwo");
  const checks = {
    search: async () => (await search("晴天", 1, 5)).tracks,
    stream: async () => kuwo && (await kuwo.getMediaUrl("228908")),
    charts: async () => (await chart(16, 1, 3)).tracks,
    lyrics: async () => lyrics("228908"),
  };
  const names = Object.keys(checks);
  const results = await Promise.all(names.map((n) => probe(checks[n])));
  return Object.fromEntries(names.map((n, i) => [n, results[i]]));
}

// ------------------------------------------------------------------------ roam
// "漫游": endless recommendations seeded from the listener's own taste.
// Similar-song graph comes from QQ Music; playback is matched to Kuwo.

const QQ_API = "https://u.y.qq.com/cgi-bin/musicu.fcg";
const QQ_JSON_HEADERS = { ...QQ_HEADERS, "Content-Type": "application/json" };

// Scene / mood presets map to Kuwo playlist tags.
const ROAM_SCENES = [
  ["146", "伤感"], ["67", "安静"], ["143", "开心"], ["137", "甜蜜"], ["62", "解压"],
  ["58", "励志"], ["160", "思念"], ["376", "开车"], ["366", "运动"], ["354", "睡眠"],
  ["1876", "学习"], ["386", "工作"], ["375", "旅行"], ["353", "清晨"], ["155", "怀旧"],
  ["2200", "情歌"], ["393", "流行"], ["389", "摇滚"], ["391", "电子"], ["173", "轻音乐"],
  ["127", "古风"],
];
const ROAM_SCENE_IDS = new Set(ROAM_SCENES.map(([sid]) => sid));

async function _qqPost(payload) {
  const body = JSON.stringify({ comm: { ct: 24, cv: 0 }, req: payload });
  const res = await httpRequest(QQ_API, { method: "POST", headers: QQ_JSON_HEADERS, body, timeout: 8000, maxBytes: MEDIA_LIMIT });
  const data = JSON.parse(res.text());
  const req = data.req || {};
  if (req.code !== 0) throw new Error("QQ recommend unavailable");
  return req.data || {};
}

async function _qqSongId(title, artist) {
  const key = `qqid|${title}|${artist}`;
  const hit = _cache.get(key);
  if (hit !== undefined) return hit;
  const query = `${sub(VERSION_TAG, title).trim() || title} ${artist.split(" / ")[0]}`.trim();
  const data = await fetchJson("https://c.y.qq.com/soso/fcgi-bin/client_search_cp?p=1&n=5&format=json&w=" + quote(query), QQ_HEADERS);
  const titleKey = searchKey(sub(VERSION_TAG, title));
  const artistKey = searchKey(artist.split(" / ")[0]);
  let found = null;
  for (const song of ((data.data || {}).song || {}).list || []) {
    const singers = (song.singer || []).map((s) => searchKey(s.name ?? ""));
    if (searchKey(sub(VERSION_TAG, song.songname ?? "")) === titleKey && (!artistKey || singers.includes(artistKey))) {
      found = song.songid ?? null;
      break;
    }
  }
  _cache.set(key, found, 24 * 3600);
  return found;
}

// QQ album covers for similar-song picks, used when the NetEase match fails.
const _qqArt = new TtlCache(2000);

/** Songs that listeners of (title, artist) also play, as [title, artist, seconds]. */
async function similarSongs(title, artist, limit = 20) {
  const key = `sim|${title}|${artist}`;
  const hit = _cache.get(key);
  if (hit !== undefined) return hit;
  const songid = await _qqSongId(title, artist);
  const out = [];
  if (songid) {
    const data = await _qqPost({
      module: "music.recommend.TrackRelationServer",
      method: "GetSimilarSongs",
      param: { songid, num: limit },
    });
    for (const item of data.vecSong || []) {
      const t = (item || {}).track || {};
      const singers = (t.singer || []).map((s) => s.name ?? "").join(" / ");
      if (t.name && singers) {
        out.push([t.name, singers, _int(t.interval)]);
        const albumMid = (t.album || {}).mid;
        if (albumMid) _qqArt.set(`${t.name}|${singers}`, `https://y.gtimg.cn/music/photo_new/T002R300x300M000${albumMid}.jpg`, 24 * 3600);
      }
    }
  }
  _cache.set(key, out, 6 * 3600);
  return out;
}

function roamScenes() {
  return ROAM_SCENES.map(([id, name]) => ({ id, name }));
}

/** Shuffle a few hot Kuwo playlists under a mood/scene tag. */
async function roamScene(sceneId, page = 1) {
  if (!ROAM_SCENE_IDS.has(sceneId)) throw new Error("Unknown scene");
  const data = await fetchJson(
    "http://wapi.kuwo.cn/api/pc/classify/playlist/getTagPlayList?" + urlencode({ pn: page, rn: 12, id: sceneId, order: "hot" }),
    UA,
  );
  const pids = ((data.data || {}).data || []).filter((p) => isDigits(String(p.id ?? ""))).map((p) => p.id);
  globalRandom.shuffle(pids);
  const songs = [];
  const seen = new Set();
  const details = await poolMap(pids.slice(0, 4), 3, (pid) => playlist(pid, 120));
  for (const detail of details) {
    for (const t of detail.tracks) {
      const key = searchKey(t.title) + "|" + searchKey(t.artist);
      if (!seen.has(key) && !NOISE.test(t.title)) {
        seen.add(key);
        songs.push(t);
      }
    }
  }
  globalRandom.shuffle(songs);
  return songs.slice(0, 40);
}

/** Python tuple ordering for (number, string, ...) rows sorted in reverse. */
function compareTuplesDesc(a, b) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) continue;
    if (a[i] == null) return 1;
    if (b[i] == null) return -1;
    return a[i] < b[i] ? 1 : -1;
  }
  return b.length - a.length;
}

function seedWeight(seed) {
  const num = Number(seed.weight || 1.0);
  return Number.isFinite(num) ? Math.max(0.2, Math.min(3.0, num)) : 1.0;
}

function skipTitle(title, artist, seconds) {
  return (
    artist.split(" / ").length - 1 >= 3 ||
    HARD_NOISE_RE.test(title) ||
    COVER_NOISE_RE.test(title) ||
    INSTRUMENTAL_RE.test(title) ||
    LIVE_RE.test(title) ||
    (seconds > 0 && seconds < 80)
  );
}

/**
 * Expand seed songs through the similar-song graph and match each hit to NetEase.
 * mode: "familiar" keeps the seeds' own artists, "explore" prefers new artists, "default" mixes both.
 */
async function roam(seeds, exclude, bannedArtists, mode = "default", { limit = 12, artistWeights = null } = {}) {
  const cleanSeeds = seeds.filter((s) => s.title).slice(0, 8);
  const seedArtists = new Set(cleanSeeds.map((s) => searchKey((s.artist || "").split(" / ")[0])));
  const weightsMap = artistWeights || {};
  const graphs = await poolMap(cleanSeeds, 3, (s) => similarSongs(s.title, s.artist || ""));

  const poolItems = [];
  const seen = new Set();
  cleanSeeds.forEach((seed, i) => {
    const sw = seedWeight(seed);
    graphs[i].forEach(([title, artist, seconds], rank) => {
      const key = searchKey(sub(VERSION_TAG, title)) + "|" + searchKey(artist.split(" / ")[0]);
      const artistKey = searchKey(artist.split(" / ")[0]);
      if (seen.has(key) || exclude.has(key) || bannedArtists.has(artistKey)) return;
      if (skipTitle(title, artist, seconds)) return;
      seen.add(key);
      const familiar = seedArtists.has(artistKey);
      let weight = (1.0 / (1 + rank * 0.15)) * sw;
      if (mode === "familiar") weight *= familiar ? 2.5 : 0.6;
      else if (mode === "explore") weight *= familiar ? 0.25 : 1.6;
      const affinity = weightsMap[artistKey] ?? 0.0;
      if (affinity >= 0) {
        const cap = mode === "explore" ? 1.0 : 2.0;
        const scale = mode === "explore" ? 0.2 : 0.55;
        weight *= 1.0 + Math.min(affinity, cap) * scale;
      } else {
        weight *= Math.max(0.15, 1.0 + affinity * 0.85);
      }
      poolItems.push([weight * globalRandom.uniform(0.6, 1.4), title, artist, seconds, key]);
    });
  });
  poolItems.sort(compareTuplesDesc);
  // Keep artist variety: at most two songs per artist per batch.
  const picked = [];
  const perArtist = new Map();
  for (const [, title, artist, seconds, key] of poolItems) {
    const a = searchKey(artist.split(" / ")[0]);
    if ((perArtist.get(a) || 0) >= 2) continue;
    perArtist.set(a, (perArtist.get(a) || 0) + 1);
    picked.push([title, artist, seconds, key]);
    if (picked.length >= limit * 2) break;
  }

  const matched = await _toNetease(picked);
  const out = [];
  for (let i = 0; i < picked.length; i++) {
    const hit = matched[i];
    const key = picked[i][3];
    if (hit && (LIVE_RE.test(hit.title) || HARD_NOISE_RE.test(hit.title) || COVER_NOISE_RE.test(hit.title))) continue;
    if (hit && !exclude.has(hit.id)) {
      hit.roamKey = key;
      out.push(hit);
    }
    if (out.length >= limit) break;
  }
  return out;
}

/** Fetch curated tracks from NetEase toplists when seeds are sparse or missing. */
async function _neteaseDailyFallback(rng, need) {
  const picks = [];
  const seen = new Set();
  // Prioritize Hot & Original charts over the Soaring chart to avoid amateur uploads.
  const boardIds = [["3778678", "网易云热歌精选"], ["2884035", "网易云原创精选"], ["3779629", "网易云新歌精选"]];
  if (rng.random() < 0.35) boardIds.push(["19723756", "网易云飙升精选"]);
  const candidates = [];
  for (let bIdx = 0; bIdx < boardIds.length; bIdx++) {
    const [pid, reason] = boardIds[bIdx];
    try {
      const data = await neApi.playlistDetail(pid, CACHE_TTL);
      const tracks = (data.playlist || {}).tracks || [];
      tracks.slice(0, 100).forEach((item, pos) => {
        const title = String(item.name || "").trim();
        const rawAr = (item.ar || []).filter((a) => a && typeof a === "object" && a.name);
        if (!rawAr.length || !rawAr.some((a) => a.id)) return;
        const artists = rawAr.map((a) => a.name ?? "").join(" / ");
        const albumName = String((item.al || {}).name || "");
        const seconds = Math.trunc((item.dt || 0) / 1000);
        const pop = Number(item.pop || 0);
        const cov = item.originCoverType;
        if (!title || !artists) return;
        if (seconds && (seconds < 90 || seconds > 450)) return;
        if (cov === 2) return;
        if (
          artists.split(" / ").length - 1 >= 3 ||
          HARD_NOISE_RE.test(title) ||
          COVER_NOISE_RE.test(title) ||
          COVER_NOISE_RE.test(albumName) ||
          INSTRUMENTAL_RE.test(title) ||
          LIVE_RE.test(title) ||
          new RegExp(`${WB}pt\\.?\\s*\\d+${WE}|对唱|游客|demo`, "iu").test(title + " " + artists)
        ) {
          return;
        }
        if (pop && pop < 60) return;
        const key = baseTitleKey(title) + "|" + searchKey(artists.split(" / ")[0]);
        if (seen.has(key)) return;
        seen.add(key);
        const chartWeight = bIdx === 0 ? 1.35 : bIdx === 1 ? 1.1 : 0.9;
        const score = (pop / 100.0 + 0.5) * chartWeight * (1.0 / (1 + pos * 0.015)) * rng.uniform(0.75, 1.25);
        candidates.push([score, title, artists, seconds, reason]);
      });
    } catch {
      continue;
    }
  }
  candidates.sort((a, b) => b[0] - a[0]);
  for (const [, title, artists, seconds, reason] of candidates) {
    picks.push([title, artists, seconds, reason]);
    if (picks.length >= need) break;
  }
  return picks;
}

/** Map [title, artist, seconds, ...] to NetEase tracks; audio is resolved on play. */
async function _toNetease(picked) {
  const ne = require("./ne");
  const one = async (p) => {
    let hit = null;
    try {
      hit = await ne.lookup(p[0], p[1], p[2]);
    } catch (err) {
      logger.info("netease lookup failed: %s", err);
    }
    if (hit) return hit;
    // No clean NetEase match: keep the recommendation and resolve audio by title.
    return {
      id: "q" + md5Hex(`${p[0]}|${p[1]}`).slice(0, 12),
      title: p[0],
      artist: p[1],
      album: "",
      duration: p[2],
      art: _qqArt.get(`${p[0]}|${p[1]}`) ?? null,
      source: "netease",
      unresolved: true,
    };
  };
  return poolMap(picked, 8, one);
}

function localIsoDate() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Generate a deterministic daily playlist of up to `limit` tracks. */
async function dailyRecommend(seeds, bannedArtists, { dateStr = "", salt = "", limit = 30, artistWeights = null, skipped = null } = {}) {
  const rng = new PyRandom(`${dateStr || localIsoDate()}:${salt}`);
  const cleanSeeds = seeds.filter((s) => s.title).slice(0, 10);
  const seedArtists = new Set(cleanSeeds.map((s) => searchKey((s.artist || "").split(" / ")[0])));
  const weightsMap = artistWeights || {};
  const skippedKeys = skipped || new Set();
  const poolItems = [];
  const seen = new Set();

  if (cleanSeeds.length) {
    const graphs = await poolMap(cleanSeeds, 3, (s) => similarSongs(s.title, s.artist || "").catch(() => []));
    cleanSeeds.forEach((seed, i) => {
      const seedTitle = String(seed.title || "").trim();
      const sw = seedWeight(seed);
      graphs[i].forEach(([title, artist, seconds], rank) => {
        const key = searchKey(sub(VERSION_TAG, title)) + "|" + searchKey(artist.split(" / ")[0]);
        const artistKey = searchKey(artist.split(" / ")[0]);
        if (seen.has(key) || skippedKeys.has(key) || bannedArtists.has(artistKey)) return;
        if (skipTitle(title, artist, seconds)) return;
        seen.add(key);
        const familiar = seedArtists.has(artistKey);
        const affinity = weightsMap[artistKey] ?? 0.0;
        const affinityFactor = affinity >= 0 ? 1.0 + Math.min(affinity, 2.0) * 0.55 : Math.max(0.15, 1.0 + affinity * 0.85);
        const weight = (1.0 / (1 + rank * 0.14)) * (familiar ? 1.2 : 1.0) * sw * affinityFactor;
        let reason;
        if (affinity >= 0.8 && seedTitle) reason = `偏爱歌手 · 类似《${seedTitle}》`;
        else if (seedTitle) reason = `根据你听过的《${seedTitle}》`;
        else reason = "根据你的口味推荐";
        poolItems.push([weight * rng.uniform(0.65, 1.35), title, artist, seconds, key, reason]);
      });
    });
  }

  poolItems.sort(compareTuplesDesc);
  const picked = [];
  const perArtist = new Map();
  for (const [, title, artist, seconds, , reason] of poolItems) {
    const a = searchKey(artist.split(" / ")[0]);
    if ((perArtist.get(a) || 0) >= 2) continue;
    perArtist.set(a, (perArtist.get(a) || 0) + 1);
    picked.push([title, artist, seconds, reason]);
    if (picked.length >= limit + 12) break;
  }

  // Supplement with NetEase curated toplists if seeds were absent or sparse.
  if (picked.length < limit + 6) {
    const extras = await _neteaseDailyFallback(rng, limit + 12 - picked.length);
    for (const [title, artist, seconds, reason] of extras) {
      const artistKey = searchKey(artist.split(" / ")[0]);
      const key = searchKey(sub(VERSION_TAG, title)) + "|" + artistKey;
      if (seen.has(key) || skippedKeys.has(key) || bannedArtists.has(artistKey)) continue;
      if ((perArtist.get(artistKey) || 0) >= 2) continue;
      seen.add(key);
      perArtist.set(artistKey, (perArtist.get(artistKey) || 0) + 1);
      picked.push([title, artist, seconds, reason]);
      if (picked.length >= limit + 12) break;
    }
  }
  const matched = await _toNetease(picked);

  const out = [];
  const seenIds = new Set();
  for (let i = 0; i < picked.length; i++) {
    const hit = matched[i];
    if (!hit || seenIds.has(hit.id)) continue;
    if (LIVE_RE.test(hit.title) || HARD_NOISE_RE.test(hit.title) || COVER_NOISE_RE.test(hit.title)) continue;
    seenIds.add(hit.id);
    hit.reason = picked[i][3];
    out.push(hit);
    if (out.length >= limit) break;
  }

  // Final safety net: Kuwo hot chart if both similar & NetEase failed.
  if (out.length < 10) {
    try {
      const hot = [...((await chart(CHARTS[0][0], 1)).tracks || [])];
      rng.shuffle(hot);
      for (const t of hot) {
        if (!seenIds.has(t.id) && !NOISE.test(t.title)) {
          seenIds.add(t.id);
          t.reason = "今日热门精选";
          out.push(t);
        }
        if (out.length >= limit) break;
      }
    } catch {
      // ignore
    }
  }
  return out;
}

// ------------------------------------------------------ NetEase storefront & audio waterfall

const NETEASE_CHARTS = [
  [3778678, "热歌榜"],
  [19723756, "飙升榜"],
  [3779629, "新歌榜"],
  [2884035, "原创榜"],
  [180106, "UK 排行榜"],
  [60198, "Billboard 榜"],
  [60131, "Oricon 日语榜"],
  [71385702, "ACG 音乐榜"],
  [991319590, "说唱榜"],
];
const NETEASE_CHART_IDS = new Set(NETEASE_CHARTS.map(([cid]) => cid));
const NETEASE_CHART_NAMES = new Map(NETEASE_CHARTS);

const NETEASE_PLAYLIST_CATS = ["全部", "华语", "欧美", "日语", "粤语", "电子", "民谣", "摇滚", "轻音乐", "影视原声", "怀旧", "治愈"];

const _neKuwoMap = new TtlCache(1000); // track key -> kuwo rid or null

function _neCover(url, size = 300) {
  const u = _https(url);
  if (!u) return null;
  if (!u.includes("?")) return `${u}?param=${size}y${size}`;
  return u;
}

function _neteaseTrack(song) {
  if (!song || typeof song !== "object" || Array.isArray(song)) return null;
  const sid = song.id;
  const title = _text(song.name);
  if (!sid || !title) return null;
  const artists = (song.ar || song.artists || [])
    .filter((a) => a && typeof a === "object" && a.name)
    .map((a) => _text(a.name));
  const al = song.al || song.album || {};
  return {
    id: String(sid),
    title,
    artist: artists.join(" / ") || "未知歌手",
    album: _text(al.name),
    duration: Math.trunc(Math.floor((song.dt || song.duration || 0) / 1000)),
    art: _neCover(al.picUrl, 300),
    source: "netease",
  };
}

function neteaseCharts() {
  return NETEASE_CHARTS.map(([id, name]) => ({ id, name }));
}

/** Fetch a NetEase playlist or chart with full track completion (>10 tracks). */
async function neteasePlaylistDetail(pid, maxTracks = 200) {
  const data = await neApi.playlistDetail(pid, 1800);
  const pl = data.playlist || {};
  const rawTracks = pl.tracks || [];
  const trackIds = (pl.trackIds || []).filter((t) => t && typeof t === "object" && Number.isInteger(t.id)).map((t) => t.id);

  let songsRaw = [...rawTracks];
  const targetTotal = trackIds.length ? Math.min(trackIds.length, maxTracks) : rawTracks.length;
  if (trackIds.length && songsRaw.length < targetTotal) {
    // Unauthenticated playlist detail often caps `tracks` at 10; batch-complete via song detail.
    const completed = [];
    const idsToFetch = trackIds.slice(0, maxTracks);
    for (let start = 0; start < idsToFetch.length; start += 200) {
      const detail = await neApi.songDetail(idsToFetch.slice(start, start + 200), 1800);
      completed.push(...(detail.songs || []));
    }
    if (completed.length) songsRaw = completed;
  }

  const tracks = [];
  const seen = new Set();
  for (const s of songsRaw.slice(0, maxTracks)) {
    const item = _neteaseTrack(s);
    if (item && !seen.has(item.id)) {
      seen.add(item.id);
      tracks.push(item);
    }
  }
  return {
    id: String(pid),
    name: _text(pl.name) || "网易云歌单",
    art: _neCover(pl.coverImgUrl, 400),
    brief: _text(pl.description),
    tracks,
  };
}

async function neteaseChart(chartId) {
  const detail = await neteasePlaylistDetail(String(chartId), 100);
  detail.id = chartId;
  if (NETEASE_CHART_NAMES.has(chartId)) detail.name = NETEASE_CHART_NAMES.get(chartId);
  return detail;
}

async function neteasePlaylists(cat = "全部", limit = 30) {
  const cleanCat = NETEASE_PLAYLIST_CATS.includes(cat) ? cat : "全部";
  const n = Math.min(Math.max(Math.trunc(limit), 1), 50);
  let raw = (await neApi.highquality({ cat: cleanCat, limit: n }, 1800)).playlists || [];
  if (!raw.length && cleanCat !== "全部") {
    raw = (await neApi.highquality({ cat: "全部", limit: n }, 1800)).playlists || [];
  }
  const playlistsOut = [];
  for (const p of raw) {
    if (!p || typeof p !== "object" || !p.id) continue;
    const creator = p.creator && typeof p.creator === "object" ? p.creator : {};
    playlistsOut.push({
      id: String(p.id),
      name: _text(p.name),
      art: _neCover(p.coverImgUrl, 300),
      count: _int(p.trackCount),
      plays: _int(p.playCount),
      creator: _text(creator.nickname),
      source: "netease",
    });
  }
  return { categories: NETEASE_PLAYLIST_CATS, cat: cleanCat, playlists: playlistsOut };
}

async function _matchKuwoRid(cacheKey, title, artist, duration) {
  const hit = _neKuwoMap.get(cacheKey);
  if (hit !== undefined) return hit;
  let matched = null;
  try {
    const m = await match(title, artist, duration);
    if (m && m.id) matched = String(m.id);
  } catch (err) {
    logger.info("kuwo match failed for %s: %s", title, err);
  }
  _neKuwoMap.set(cacheKey, matched, 3600);
  return matched;
}

const _resolvedCache = new TtlCache(300);

/** Cached wrapper: prefetch probes and the real play request share one lookup. */
async function resolveAudioWaterfall(sourceId, trackId, { title = "", artist = "", duration = 0 } = {}) {
  const key = JSON.stringify([sourceId, trackId, title, artist]);
  const hit = _resolvedCache.get(key);
  if (hit !== undefined) return hit;
  const result = await _resolveAudioWaterfall(sourceId, trackId, title, artist, duration);
  // Kuwo links stay valid for a few minutes; Bilibili ones ~2h.
  if (result) _resolvedCache.set(key, result, 240);
  return result;
}

/**
 * Resolve playable audio across sources: Kuwo direct/match -> Bilibili DASH audio.
 * Returns ["redirect", url, provider, ""], ["bili", streamUrl, mime, bvid] or null.
 */
async function _resolveAudioWaterfall(sourceId, trackId, title = "", artist = "", duration = 0) {
  const bili = require("./bili");
  const { manager } = require("./manager");

  // 1. Direct Kuwo track: try Kuwo first, then Bilibili fallback if title provided.
  if (sourceId === "kuwo") {
    const mediaUrl = await manager.getMediaUrl("kuwo", trackId);
    if (mediaUrl) return ["redirect", mediaUrl, "kuwo", ""];
    if (title) {
      logger.info("kuwo stream missing for %s (%s), trying bilibili fallback", trackId, title);
      const biliRes = await bili.resolveSongAudio(title, artist, duration);
      if (biliRes) return ["bili", biliRes[1], biliRes[2], biliRes[0]];
    }
    return null;
  }

  // 2. NetEase storefront track: lazy Kuwo match -> Bilibili DASH -> NetEase direct.
  if (sourceId === "netease") {
    if (title) {
      const kuwoRid = await _matchKuwoRid(`ne:${trackId}`, title, artist, duration);
      if (kuwoRid) {
        const mediaUrl = await manager.getMediaUrl("kuwo", kuwoRid);
        if (mediaUrl) return ["redirect", mediaUrl, "kuwo", ""];
      }
      logger.info("kuwo match/stream unavailable for ne:%s (%s), trying bilibili", trackId, title);
      const biliRes = await bili.resolveSongAudio(title, artist, duration);
      if (biliRes) return ["bili", biliRes[1], biliRes[2], biliRes[0]];
    }
    if (isDigits(trackId)) {
      const mediaUrl = await manager.getMediaUrl("netease", trackId);
      if (mediaUrl) return ["redirect", mediaUrl, "netease", ""];
    }
    return null;
  }

  // 3. Any other source (public, qq, etc.): direct first, Bilibili fallback if title provided.
  const mediaUrl = await manager.getMediaUrl(sourceId, trackId);
  if (mediaUrl) return ["redirect", mediaUrl, sourceId, ""];
  if (title) {
    const biliRes = await bili.resolveSongAudio(title, artist, duration);
    if (biliRes) return ["bili", biliRes[1], biliRes[2], biliRes[0]];
  }
  return null;
}

module.exports = {
  UA,
  NETEASE_HEADERS,
  QQ_HEADERS,
  CACHE_TTL,
  CHARTS,
  CHART_IDS,
  NOISE,
  HARD_NOISE_RE,
  COVER_NOISE_RE,
  INSTRUMENTAL_RE,
  LIVE_RE,
  COMPILATION_ALBUM_RE,
  VERSION_TAG,
  searchKey,
  sub,
  parseQueryIntent,
  baseTitleKey,
  fetchJson,
  _fetch: fetchJson,
  _text,
  _artists,
  _int,
  _https,
  _cover,
  _ids,
  track,
  _kuwoSearchRaw,
  searchScored,
  search,
  match,
  charts,
  chart,
  playlists,
  playlist,
  _parseLrc,
  _parseKuwoLrclist,
  _kuwoLyrics,
  _artistMatches,
  _qqLyrics,
  _neteaseLyrics,
  _neteaseLyricsById,
  lyrics,
  _neteasePlaylist,
  _qqPlaylist,
  parsePlaylistLink,
  _matchImportedSong,
  importPlaylist,
  parsePlaylistText,
  importPlaylistText,
  health,
  QQ_API,
  ROAM_SCENES,
  ROAM_SCENE_IDS,
  similarSongs,
  roamScenes,
  roamScene,
  roam,
  _neteaseDailyFallback,
  _toNetease,
  dailyRecommend,
  NETEASE_CHARTS,
  NETEASE_CHART_IDS,
  NETEASE_CHART_NAMES,
  NETEASE_PLAYLIST_CATS,
  _neCover,
  _neteaseTrack,
  neteaseCharts,
  neteasePlaylistDetail,
  neteaseChart,
  neteasePlaylists,
  resolveAudioWaterfall,
};
