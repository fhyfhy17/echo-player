"use strict";
// Port of sources/browse.py: artist and album browsing backed by Kuwo's catalog.
//
// Kuwo holds the licensed catalogs for most mainstream Chinese artists, so its
// "hot songs" and album lists reflect the artist's own recordings. Track ids are
// Kuwo rids and play directly through the kuwo source plugin.

const { httpRequest } = require("../net");
const { htmlUnescape, quote, TtlCache, getLogger } = require("../pyutil");
const { MEDIA_LIMIT, searchKey } = require("./base");

const logger = getLogger("echo.browse");

const SEARCH = "http://search.kuwo.cn/r.s?";
const HEADERS = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" };
const CACHE_TTL = 30 * 60;
const _cache = new TtlCache(300);

// ------------------------------------------------------------ python helpers

// Characters matched by Python's str.isspace() / re `\s` (str patterns).
const PY_WS = "\\t-\\r\\x1c-\\x20\\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";
const WS_RUN = new RegExp(`[${PY_WS}]+`, "gu");
const STRIP_RE = new RegExp(`^[${PY_WS}]+|[${PY_WS}]+$`, "gu");

/** str.strip() */
function pyStrip(value) {
  return String(value).replace(STRIP_RE, "");
}

/** Python truthiness for JSON values. */
function pyTruthy(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return Boolean(value);
}

/** str(value or "") */
function pyStr(value) {
  if (!pyTruthy(value)) return "";
  if (value === true) return "True";
  return String(value);
}

/** str(value) for possibly-missing values (None -> "None"). */
function pyStrRaw(value) {
  if (value === null || value === undefined) return "None";
  if (value === true) return "True";
  if (value === false) return "False";
  return String(value);
}

/** str.isdigit() (ASCII digits). */
function isDigit(value) {
  return /^[0-9]+$/u.test(value);
}

/** First code points of a string (Python s[:n]). */
function cpSlice(value, start, end) {
  return Array.from(value).slice(start, end).join("");
}

// ------------------------------------------------------------------- network

const decoder = new TextDecoder("utf-8", { fatal: false, ignoreBOM: true });

async function _get(query) {
  const hit = _cache.get(query);
  if (hit !== undefined) return hit;
  const res = await httpRequest(SEARCH + query, { headers: HEADERS, timeout: 8000, maxBytes: MEDIA_LIMIT * 2 });
  // decode("utf-8", errors="ignore")
  const text = decoder.decode(res.buffer).replace(/\uFFFD/gu, "");
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    // Kuwo returns pseudo-JSON with single quotes.
    data = JSON.parse(text.replaceAll("'", '"'));
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Kuwo browse unavailable");
  }
  _cache.set(query, data, CACHE_TTL);
  return data;
}

// ------------------------------------------------------------------- helpers

function _text(value) {
  return pyStrip(htmlUnescape(pyStr(value)).replaceAll("\xa0", " ").replaceAll("\\u0026", "&"));
}

function _name(value) {
  // Kuwo joins multiple artists with "&" (sometimes escaped as \u0026).
  const raw = htmlUnescape(pyStr(value)).replaceAll("\xa0", " ").replaceAll("\\u0026", "&");
  return raw
    .split("&")
    .map((part) => pyStrip(part))
    .filter((part) => part)
    .join(" / ");
}

function _int(value) {
  // int(str(value).strip()): floats and bools stringify to non-integer text.
  if (typeof value === "number") return Number.isInteger(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const text = pyStrip(value);
  if (!/^[+-]?[0-9]+$/u.test(text)) return 0;
  return Number.parseInt(text, 10);
}

function _albumPic(path, size = 300) {
  if (!pyTruthy(path)) return null;
  path = String(path);
  if (path.startsWith("http")) {
    path = path.replace(/\/albumcover\/[0-9]+\//gu, `/albumcover/${size}/`);
    return path
      .replaceAll("http://", "https://")
      .replaceAll("img1.sycdn.kuwo.cn", "img4.kuwo.cn")
      .replaceAll("img2.sycdn.kuwo.cn", "img4.kuwo.cn")
      .replaceAll("img3.sycdn.kuwo.cn", "img4.kuwo.cn")
      .replaceAll("img4.sycdn.kuwo.cn", "img4.kuwo.cn");
  }
  path = path.replace(/^[0-9]+\//u, "");
  return `https://img4.kuwo.cn/star/albumcover/${size}/${path}`;
}

function _artistPic(path) {
  if (!pyTruthy(path)) return null;
  path = String(path);
  if (path.startsWith("http")) return path.replaceAll("http://", "https://");
  return `https://img4.kuwo.cn/star/starheads/300/${path.replace(/^[0-9]+\//u, "")}`;
}

function _track(item, art = null) {
  const rid = pyStrip(pyStr(pyTruthy(item.musicrid) ? item.musicrid : item.id).replaceAll("MUSIC_", ""));
  if (!isDigit(rid)) return null;
  const out = {
    id: rid,
    title: _text(item.name) || "未知歌曲",
    artist: _name(item.artist) || "未知歌手",
    album: _text(item.album),
    duration: _int(item.duration),
    art: _albumPic(item.web_albumpic_short) || art,
    source: "kuwo",
    source_name: "酷我原声",
  };
  const ids = [
    ["artistId", item.artistid],
    ["albumId", pyTruthy(item.albumid) ? item.albumid : item.albumId],
  ];
  for (const [key, value] of ids) {
    const text = pyStr(value);
    if (isDigit(text) && pyStrRaw(value) !== "0") out[key] = Number.parseInt(text, 10);
  }
  return out;
}

/** Return match score between a Kuwo artist name and target search keys. */
function _artistMatchesKeys(artistName, keys) {
  const parts = artistName
    .split(" / ")
    .map((n) => searchKey(n))
    .filter((k) => k);
  if (!parts.length) return 0;
  const first = parts[0];
  if (keys.has(first)) return 3;
  const firstLen = Array.from(first).length;
  for (const key of keys) {
    const keyLen = Array.from(key).length;
    if (keyLen >= 2 && (first.endsWith(key) || first.startsWith(key)) && firstLen - keyLen <= 8) return 1;
  }
  return 0;
}

/** Kuwo's artist search is unreliable; infer the id from song search hits. */
async function _findArtistId(query, aliases = null) {
  const terms = [query, ...(aliases || [])];
  const keys = new Set(terms.map((q) => searchKey(q)).filter((k) => k));
  if (!keys.size) return null;
  for (let term of terms) {
    term = pyStrip(term || "");
    if (!term) continue;
    const data = await _get(
      `all=${quote(term)}&ft=music&client=kt&cluster=1&pn=0&rn=40` +
        "&rformat=json&encoding=utf8&vipver=MUSIC_9.1.1.2_BCS39",
    );
    const votes = new Map();
    const list = pyTruthy(data.abslist) ? data.abslist : [];
    for (const song of list) {
      if (!song || typeof song !== "object" || Array.isArray(song)) continue;
      const rawId = song.ARTISTID === undefined ? "" : song.ARTISTID;
      if (!isDigit(pyStrRaw(rawId))) continue;
      const score = _artistMatchesKeys(_name(song.ARTIST), keys);
      if (score) {
        const id = Number.parseInt(pyStrRaw(rawId), 10);
        votes.set(id, (votes.get(id) || 0) + score);
      }
    }
    if (votes.size) {
      // Counter.most_common(1): highest count, first inserted on ties.
      let bestId = null;
      let best = -Infinity;
      for (const [id, count] of votes) {
        if (count > best) {
          best = count;
          bestId = id;
        }
      }
      return bestId;
    }
  }
  return null;
}

async function searchArtists(query, limit = 1, aliases = null) {
  const artistId = await _findArtistId(query, aliases);
  if (!artistId) return [];
  const info = await _get(`stype=artistinfo&artistid=${artistId}&rformat=json&encoding=utf8`);
  return [
    {
      id: artistId,
      name: _text(info.name) || query,
      art: _artistPic(pyTruthy(info.hts_pic) ? info.hts_pic : info.pic),
      albumSize: _int(info.albumnum),
      exact: true,
    },
  ].slice(0, Math.max(0, limit));
}

async function artistHotSongs(artistId) {
  const hot = await _get(`stype=artist2music&artistid=${artistId}&pn=0&rn=50&sortby=0&rformat=json&encoding=utf8`);
  return (pyTruthy(hot.musiclist) ? hot.musiclist : []).map((s) => _track(s)).filter((t) => t);
}

async function artistDetail(artistId) {
  const info = await _get(`stype=artistinfo&artistid=${artistId}&rformat=json&encoding=utf8`);
  const hot = await _get(`stype=artist2music&artistid=${artistId}&pn=0&rn=50&sortby=0&rformat=json&encoding=utf8`);
  const songs = (pyTruthy(hot.musiclist) ? hot.musiclist : []).map((s) => _track(s)).filter((t) => t);
  const albums = [];
  let seenPages = 0;
  let page = 0;
  while (seenPages < 4) {
    const data = await _get(
      `stype=albumlist&artistid=${artistId}&sortby=1&pn=${page}&rn=100` + "&rformat=json&encoding=utf8",
    );
    const batch = pyTruthy(data.albumlist) ? data.albumlist : [];
    for (const al of batch) {
      if (!al || typeof al !== "object" || Array.isArray(al)) continue;
      if (!isDigit(pyStrRaw(al.albumid === undefined ? "" : al.albumid))) continue;
      const pub = pyStr(al.pub);
      const year = cpSlice(pub, 0, 4);
      albums.push({
        id: Number.parseInt(String(al.albumid), 10),
        name: _text(al.name),
        art: _albumPic(pyTruthy(al.img) ? al.img : al.pic),
        size: _int(al.musiccnt),
        year: isDigit(year) ? year : "",
      });
    }
    const total = _int(data.total);
    seenPages += 1;
    page += 1;
    if (!batch.length || albums.length >= total) break;
  }
  let brief = _text(info.info);
  brief = cpSlice(brief.replace(WS_RUN, " "), 0, 300);
  return {
    id: artistId,
    name: _text(info.name),
    art: _artistPic(pyTruthy(info.hts_pic) ? info.hts_pic : info.pic),
    brief,
    songCount: _int(info.musicnum),
    songs,
    albums,
  };
}

async function albumDetail(albumId) {
  const data = await _get(`stype=albuminfo&albumid=${albumId}&rformat=json&encoding=utf8`);
  const art = _albumPic(pyTruthy(data.img) ? data.img : data.pic);
  const songs = (pyTruthy(data.musiclist) ? data.musiclist : []).map((s) => _track(s, art)).filter((t) => t);
  for (const song of songs) {
    song.art = art || song.art;
    song.album = song.album || _text(data.name);
  }
  const pub = pyStr(data.pub);
  const year = cpSlice(pub, 0, 4);
  const brief = cpSlice(_text(data.info).replace(WS_RUN, " "), 0, 300);
  const artistIdText = pyStr(data.artistid);
  return {
    id: albumId,
    name: _text(data.name),
    artist: _name(data.artist),
    artistId: isDigit(artistIdText) ? Number.parseInt(artistIdText, 10) : null,
    art,
    year: isDigit(year) ? year : "",
    brief,
    songs,
  };
}

module.exports = {
  SEARCH,
  HEADERS,
  CACHE_TTL,
  logger,
  _get,
  _text,
  _name,
  _int,
  _albumPic,
  _artistPic,
  _track,
  _artistMatchesKeys,
  _findArtistId,
  searchArtists,
  artistHotSongs,
  artistDetail,
  albumDetail,
};
