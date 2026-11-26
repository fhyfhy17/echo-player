"use strict";
// Port of sources/ne.py: NetEase Cloud Music browsing (song search, artist and
// album pages, track lookup).
//
// Only metadata comes from NetEase. Audio is resolved later through the
// Kuwo -> Bilibili waterfall in catalog.resolveAudioWaterfall.
// All music.163.com traffic goes through NeteaseCloudMusicApi Enhanced
// (backend/netease_api.js) instead of hand-written HTTP.

const catalog = require("./catalog");
const { zhFold, casefold, searchKey } = require("./base");
const { ne: neApi } = require("../netease_api");
const { quote, getLogger } = require("../pyutil");

const logger = getLogger("echo.ne");

const API = "https://music.163.com/api";

// ------------------------------------------------------------ python helpers

// Characters matched by Python's re `\s` / str.isspace() for str patterns.
const PY_WS = "\\t-\\r\\x1c-\\x20\\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";
const WS_RUN = new RegExp(`[${PY_WS}]+`, "gu");
const STRIP_RE = new RegExp(`^[${PY_WS}]+|[${PY_WS}]+$`, "gu");

/** str.strip() */
function pyStrip(value) {
  return String(value).replace(STRIP_RE, "");
}

/** str.split() with no separator. */
function pySplit(value) {
  return String(value)
    .split(WS_RUN)
    .filter((part) => part);
}

/** Python truthiness for JSON values. */
function truthy(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return Boolean(value);
}

/** Python `a or b`. */
function or(...values) {
  for (const value of values.slice(0, -1)) if (truthy(value)) return value;
  return values[values.length - 1];
}

/** dict.get(key) or {} */
function objOr(value) {
  return value && typeof value === "object" && !Array.isArray(value) && truthy(value) ? value : {};
}

/** list value or [] */
function listOr(value) {
  return Array.isArray(value) && value.length ? value : [];
}

/** str(value or "") */
function pyStr(value) {
  if (!truthy(value)) return "";
  if (value === true) return "True";
  return String(value);
}

/** int(x) for JSON numbers / numeric strings. */
function pyInt(value) {
  if (value === true) return 1;
  if (value === false || value === null || value === undefined) return 0;
  if (typeof value === "number") return Math.trunc(value);
  const text = pyStrip(String(value));
  if (!/^[+-]?[0-9]+$/u.test(text)) throw new Error(`invalid literal for int(): '${value}'`);
  return Number.parseInt(text, 10);
}

/** float(x) */
function pyFloat(value) {
  if (value === true) return 1;
  if (value === false || value === null || value === undefined) return 0;
  const num = Number(typeof value === "string" ? pyStrip(value) : value);
  if (Number.isNaN(num)) throw new Error(`could not convert string to float: '${value}'`);
  return num;
}

/** len(str) in code points. */
function pyLen(value) {
  let n = 0;
  for (const _ of value) n++;
  return n;
}

/** str[:n] in code points. */
function cpSlice(value, start, end) {
  return Array.from(value).slice(start, end).join("");
}

/** Python str ordering (by code point). */
function cmpStr(a, b) {
  if (a === b) return 0;
  const ia = a[Symbol.iterator]();
  const ib = b[Symbol.iterator]();
  for (;;) {
    const x = ia.next();
    const y = ib.next();
    if (x.done) return y.done ? 0 : -1;
    if (y.done) return 1;
    const cx = x.value.codePointAt(0);
    const cy = y.value.codePointAt(0);
    if (cx !== cy) return cx < cy ? -1 : 1;
  }
}

/** sorted(list_of_str) */
function sortedStr(values) {
  return [...values].sort(cmpStr);
}

/** Python round(x, ndigits): correctly rounded, ties to even. */
function pyRound(x, nd) {
  if (!Number.isFinite(x)) return x;
  const neg = x < 0 || Object.is(x, -0);
  const s = Math.abs(x).toFixed(Math.min(100, nd + 60));
  const [ip, fp = ""] = s.split(".");
  const keep = fp.slice(0, nd);
  const rest = fp.slice(nd);
  let digits = BigInt(ip + keep);
  if (/^50*$/u.test(rest)) {
    if (digits % 2n === 1n) digits += 1n;
  } else if (rest && rest[0] >= "5") {
    digits += 1n;
  }
  let text = digits.toString();
  if (nd > 0) {
    text = text.padStart(nd + 1, "0");
    text = `${text.slice(0, -nd)}.${text.slice(-nd)}`;
  }
  const out = Number(text);
  return neg ? -out : out;
}

/** re.sub(pattern, "", value) for a shared non-global RegExp. */
function subAll(re, value, replacement = "") {
  const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
  return String(value).replace(new RegExp(re.source, flags), replacement);
}

function versionTagSub(value) {
  return subAll(catalog.VERSION_TAG, value);
}

// ------------------------------------------------------------------- network

function _ttl(ttl) {
  return ttl === undefined ? 30 * 60 : ttl;
}

async function _cloudsearch(type, limit, offset, s, ttl) {
  return neApi.cloudsearch({ s, type, limit, offset }, _ttl(ttl));
}

// --------------------------------------------------------------------- tracks

function _song(raw) {
  const t = catalog._neteaseTrack(raw);
  if (!t) return null;
  const artists = listOr(or(raw.ar, raw.artists, [])).filter(
    (a) => a && typeof a === "object" && !Array.isArray(a),
  );
  if (artists.length && truthy(artists[0].id)) t.artistId = pyInt(artists[0].id);
  const al = objOr(or(raw.al, raw.album, {}));
  if (truthy(al.id)) t.albumId = pyInt(al.id);
  // NetEase flags covers: 1 = original, 2 = cover version.
  if (raw.originCoverType === 1 || raw.originCoverType === 2) t.coverType = raw.originCoverType;
  return t;
}

const FAN_NOISE_RE = /迷妹|迷弟|解解|粉丝|小号|翻唱|头号粉|想嫁|嫁给/iu;
const LIVE_TITLE_RE = /(?<![a-z])live(?![a-z])|现场|演唱会|音乐节/iu;
// r"伴奏|伴唱|消音|KTV|\bInst\.?" with Python's Unicode-aware \b
const INST_TITLE_RE = /伴奏|伴唱|消音|KTV|(?<![\p{L}\p{N}_])Inst\.?/iu;
const LIVE_WORD_RE = /live|现场/iu;
const CJK_RUN_RE = /[\u4e00-\u9fff]{2,}/u;
const CJK_RE = /[\u4e00-\u9fff]/u;

function _fakeArtist(raw) {
  // Uploaders impersonate stars as "周杰伦." with artist id 0 (alone or alongside another uploader).
  const artists = listOr(or(raw.ar, raw.artists, [])).filter(
    (a) => a && typeof a === "object" && !Array.isArray(a),
  );
  if (!artists.length) return false;
  if (!artists.some((a) => truthy(a.id))) return true;
  for (const a of artists) {
    if (!truthy(a.id)) {
      const name = pyStrip(pyStr(a.name));
      if (name.endsWith(".") || name.endsWith("。") || FAN_NOISE_RE.test(name)) return true;
    }
  }
  return false;
}

async function searchScored(query, page = 1, rows = 50) {
  const offset = (Math.max(page, 1) - 1) * rows;
  const data = await _cloudsearch(1, rows, offset, query, 10 * 60);
  const result = objOr(data.result);
  const rawSongs = listOr(result.songs);
  const intent = catalog.parseQueryIntent(query);
  const out = [];
  const seen = new Set();
  for (let rank = 0; rank < rawSongs.length; rank++) {
    const raw = rawSongs[rank];
    if (_fakeArtist(raw)) continue;
    const t = _song(raw);
    if (!t) continue;
    const { title, artist, album } = t;
    if (!intent.dj && (catalog.HARD_NOISE_RE.test(title) || catalog.HARD_NOISE_RE.test(album))) continue;
    if (!intent.inst && INST_TITLE_RE.test(title)) continue;
    if (t.duration > 0 && t.duration < 55) continue;
    if (title.split("+").length - 1 >= 2) continue;
    const isCover =
      raw.originCoverType === 2 || Boolean(catalog.COVER_NOISE_RE.test(title) || catalog.COVER_NOISE_RE.test(album));
    const isInst = catalog.INSTRUMENTAL_RE.test(title);
    const isLive = catalog.LIVE_RE.test(title) || catalog.LIVE_RE.test(album);
    const artistsNorm = sortedStr(
      artist
        .split(" / ")
        .filter((a) => searchKey(a))
        .map((a) => searchKey(a)),
    ).join(",");
    const ident = `${catalog.baseTitleKey(title)}|${artistsNorm}|${isLive ? "1" : "0"}`;
    if (seen.has(ident)) continue;
    seen.add(ident);
    const meta = {
      pop: Math.max(0.0, Math.min(100.0, pyFloat(or(raw.pop, 0)))),
      mv: pyInt(or(raw.mv, raw.mvid, 0)),
      rank,
      coverType: raw.originCoverType === undefined ? null : raw.originCoverType,
      is_cover: isCover,
      is_inst: isInst,
      is_live: isLive,
    };
    out.push([t, meta]);
  }
  const total = pyInt(or(result.songCount, 0));
  const hasMore = offset + rawSongs.length < total && rawSongs.length > 0;
  return [out, hasMore];
}

async function search(query, page = 1, rows = 50) {
  const [pairs, hasMore] = await searchScored(query, page, rows);
  return { tracks: pairs.map(([t]) => t), hasMore };
}

function _exactText(value) {
  if (!value) return "";
  return zhFold(casefold(String(value).normalize("NFKC"))).replace(WS_RUN, "");
}

/** Score a NetEase artist search result against normalized query key. Returns [tier, hasMv, albums] or null. */
function _artistMatchRank(item, qkey, qraw = "") {
  if (!qkey) return null;
  const name = or(item.name, "");
  if (FAN_NOISE_RE.test(name)) return null;
  const nraw = _exactText(name);
  const nkey = searchKey(name);
  const aliases = listOr(or(item.aliases, []))
    .filter((x) => searchKey(x))
    .map((x) => searchKey(x));
  const albums = pyInt(or(item.albumSize, 0));
  const mvs = pyInt(or(item.mvSize, 0));
  const spamAlias = mvs === 0 && aliases.length >= 4;

  let tier;
  if (qraw && nraw === qraw) {
    if (albums >= 5 && mvs > 0) tier = 5;
    else if (albums >= 30) tier = 2;
    else return null;
  } else if (nkey === qkey) {
    if (albums >= 5 && mvs > 0) tier = 4;
    else if (albums >= 30) tier = 1;
    else return null;
  } else if (
    !spamAlias &&
    ((aliases.includes(qkey) && mvs > 0 && albums >= 5) ||
      (pyLen(qkey) >= 2 && (nkey.endsWith(qkey) || nkey.startsWith(qkey)) && pyLen(nkey) - pyLen(qkey) <= 8))
  ) {
    if (albums >= 5 && mvs > 0) tier = 4;
    else if (albums >= 30) tier = 2;
    else return null;
  } else {
    return null;
  }
  return [tier, mvs > 0 ? 1 : 0, albums];
}

function cmpNumTuple(a, b) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return a.length - b.length;
}

async function searchArtists(query, limit = 4) {
  const fetchLimit = Math.max(limit, 8);
  const data = await _cloudsearch(100, fetchLimit, 0, query);
  const qkey = searchKey(query);
  const qraw = _exactText(query);
  const scored = [];
  const artists = listOr(objOr(data.result).artists);
  for (let idx = 0; idx < artists.length; idx++) {
    const a = artists[idx];
    if (!truthy(a.id)) continue;
    const item = {
      id: pyInt(a.id),
      name: catalog._text(a.name),
      art: catalog._neCover(or(a.picUrl, a.img1v1Url), 300),
      albumSize: pyInt(or(a.albumSize, 0)),
      mvSize: pyInt(or(a.mvSize, 0)),
      aliases: listOr(or(a.alias, []))
        .filter((x) => catalog._text(x))
        .map((x) => catalog._text(x)),
      source: "netease",
    };
    const rank = _artistMatchRank(item, qkey, qraw);
    if (rank === null) continue;
    scored.push([rank, -idx, item]);
  }
  // sort(key=(tier, mv, albums, -idx), reverse=True)
  scored.sort((x, y) => -cmpNumTuple([...x[0], x[1]], [...y[0], y[1]]));
  return scored.slice(0, Math.max(0, limit)).map(([, , item]) => item);
}

function _artistKeys(name, aliases = null) {
  const all = [name, ...(aliases || [])];
  const keys = new Set(all.filter((x) => searchKey(x)).map((x) => searchKey(x)));
  // Include stripped prefix/suffix variants like "G.E.M.邓紫棋" -> "邓紫棋"
  for (const x of all) {
    const m = CJK_RUN_RE.exec(x || "");
    if (m) keys.add(searchKey(m[0]));
  }
  return keys;
}

function _songCatalogStats(songs, artistName, aliases = null) {
  if (!songs || !songs.length) {
    return { total: 0, top_n: 0, first_studio: 0, solo_studio: 0, live: 0, top3_bad: 3 };
  }
  const keys = _artistKeys(artistName, aliases);
  const top = songs.slice(0, 20);
  let firstStudio = 0;
  let soloStudio = 0;
  let live = 0;
  let top3Bad = 0;
  top.forEach((song, idx) => {
    const arts = or(song.artist, "")
      .split(" / ")
      .filter((x) => searchKey(x))
      .map((x) => searchKey(x));
    const isFirst = Boolean(arts.length && keys.has(arts[0]));
    const isSolo = Boolean(arts.length && arts.length === 1 && keys.has(arts[0]));
    const isLive = LIVE_TITLE_RE.test(or(song.title, ""));
    if (isLive) live += 1;
    if (isFirst && !isLive) firstStudio += 1;
    if (isSolo && !isLive) soloStudio += 1;
    if (idx < 3 && (!isFirst || isLive)) top3Bad += 1;
  });
  return {
    total: songs.length,
    top_n: top.length,
    first_studio: firstStudio,
    solo_studio: soloStudio,
    live,
    top3_bad: top3Bad,
  };
}

function _needsKuwoHotSongs(stats) {
  if (stats.total < 12) return true;
  const n = stats.top_n || 1;
  if (stats.first_studio / n < 0.65) return true;
  if (stats.solo_studio / n < 0.45) return true;
  if (stats.live / n >= 0.45) return true;
  if (stats.top3_bad >= 2 && stats.solo_studio / n < 0.75) return true;
  return false;
}

function _year(publishTime) {
  // datetime.fromtimestamp(ms / 1000).year (local time)
  return String(new Date(publishTime).getFullYear());
}

async function artistDetail(artistId) {
  const data = await neApi.artist(artistId, 30 * 60);
  const info = objOr(data.artist);
  const name = catalog._text(info.name);
  const aliases = listOr(or(info.alias, []))
    .filter((x) => catalog._text(x))
    .map((x) => catalog._text(x));
  const art = catalog._neCover(or(info.picUrl, info.img1v1Url), 400);
  let songs = listOr(data.hotSongs)
    .map((s) => _song(s))
    .filter((t) => t);
  let songsSource = "netease";
  let albums = [];
  try {
    const alData = await neApi.artistAlbums(artistId, 200, 0, 30 * 60);
    for (const al of listOr(alData.hotAlbums)) {
      if (!truthy(al.id)) continue;
      let year = "";
      if (truthy(al.publishTime)) year = _year(al.publishTime);
      albums.push({
        id: pyInt(al.id),
        name: catalog._text(al.name),
        art: catalog._neCover(al.picUrl, 300),
        size: pyInt(or(al.size, 0)),
        year,
      });
    }
  } catch (exc) {
    logger.info("netease artist albums failed: %s", exc);
  }

  const neStats = _songCatalogStats(songs, name, aliases);
  if (name && _needsKuwoHotSongs(neStats)) {
    try {
      const browse = require("./browse");

      const kwHits = await browse.searchArtists(name, 1, aliases);
      if (kwHits.length) {
        const kwSongs = await browse.artistHotSongs(kwHits[0].id);
        if (kwSongs.length) {
          const kwStats = _songCatalogStats(kwSongs, name, [kwHits[0].name, ...aliases]);
          const neQuality = neStats.first_studio * 2 + neStats.solo_studio;
          const kwQuality = kwStats.first_studio * 2 + kwStats.solo_studio;
          if (
            (neStats.total < 12 && kwStats.total >= 12) ||
            (kwStats.first_studio >= 10 && kwQuality >= neQuality + 3)
          ) {
            songs = kwSongs;
            songsSource = "kuwo";
            if (!albums.length) {
              const kwDetail = await browse.artistDetail(kwHits[0].id);
              albums = listOr(kwDetail.albums).map((al) => ({ ...al, source: "kuwo" }));
            }
          }
        }
      }
    } catch (exc) {
      logger.info("kuwo fallback for artist %s failed: %s", artistId, exc);
    }
  }

  const brief = cpSlice(catalog._text(info.briefDesc).replace(WS_RUN, " "), 0, 300);
  return {
    id: artistId,
    name,
    art,
    brief,
    songCount: pyInt(or(info.musicSize, 0)),
    songs,
    songsSource,
    albums,
    source: "netease",
  };
}

async function albumDetail(albumId) {
  const data = await neApi.album(albumId, 30 * 60);
  const al = objOr(data.album);
  const art = catalog._neCover(al.picUrl, 400);
  const songs = [];
  for (const raw of listOr(data.songs)) {
    const t = _song(raw);
    if (t) {
      t.art = t.art || art;
      t.album = t.album || catalog._text(al.name);
      songs.push(t);
    }
  }
  let year = "";
  if (truthy(al.publishTime)) year = _year(al.publishTime);
  const artist = objOr(al.artist);
  const brief = cpSlice(catalog._text(al.description).replace(WS_RUN, " "), 0, 300);
  return {
    id: albumId,
    name: catalog._text(al.name),
    artist: catalog._text(artist.name),
    artistId: truthy(artist.id) ? pyInt(artist.id) : null,
    art,
    year,
    brief,
    songs,
    source: "netease",
  };
}

/** Find the NetEase song for a (title, artist) pair; used to skip Kuwo matching. */
async function lookup(title, artist = "", duration = 0) {
  const titleKey = searchKey(versionTagSub(title)) || searchKey(title);
  const firstArtist = (artist || "").split(" / ")[0];
  const artistKey = searchKey(firstArtist);
  const query = pyStrip(`${pyStrip(versionTagSub(title)) || title} ${firstArtist}`);
  let data;
  try {
    data = await _cloudsearch(1, 8, 0, query, 6 * 3600);
  } catch (exc) {
    logger.info("netease lookup failed: %s", exc);
    return null;
  }
  const wantLive = LIVE_WORD_RE.test(title);
  let best = null;
  let bestScore = -99;
  for (const raw of listOr(objOr(data.result).songs)) {
    if (_fakeArtist(raw)) continue;
    const t = _song(raw);
    if (!t) continue;
    let s = 0;
    const cand = searchKey(versionTagSub(t.title));
    if (cand === titleKey) s += 5;
    else if (titleKey && (cand.includes(titleKey) || titleKey.includes(cand))) s += 1;
    else continue;
    if (artistKey) {
      if (searchKey(t.artist).includes(artistKey)) s += 4;
      else s -= 4;
    }
    if (LIVE_WORD_RE.test(t.title) !== wantLive) s -= 4;
    if (catalog.NOISE.test(t.title) || catalog.HARD_NOISE_RE.test(t.title) || catalog.COVER_NOISE_RE.test(t.title)) {
      s -= 4;
    }
    if (t.coverType === 2) s -= 4;
    if (duration && t.duration) {
      const gap = Math.abs(t.duration - duration);
      s += gap <= 4 ? 2 : gap <= 12 ? 0 : -2;
    }
    if (s > bestScore) {
      best = t;
      bestScore = s;
    }
  }
  return bestScore >= 7 ? best : null;
}

/** Return [lyric lines, translated lines] for a NetEase song id. */
async function lyrics(songId) {
  const data = await neApi.lyric(songId, 20 * 60); // catalog._fetch default CACHE_TTL
  const lines = catalog._parseLrc(or(objOr(data.lrc).lyric, ""));
  const trans = catalog._parseLrc(or(objOr(data.tlyric).lyric, ""));
  return [lines, trans];
}

function mergeTranslation(lines, trans) {
  if (!lines || !lines.length || !trans || !trans.length) return lines;
  const byTime = new Map();
  for (const t of trans) byTime.set(pyRound(t.time, 1), t.text);
  const out = [];
  for (const line of lines) {
    let tr = byTime.get(pyRound(line.time, 1));
    if (tr === undefined) {
      // tolerate tiny timestamp drift
      for (const delta of [-0.1, 0.1, -0.2, 0.2]) {
        tr = byTime.get(pyRound(line.time + delta, 1));
        if (tr !== undefined) break;
      }
    }
    out.push(tr && tr !== line.text ? { ...line, trans: tr } : line);
  }
  return out;
}

async function lyricsByTitle(title, artist) {
  const hit = await lookup(title, artist);
  if (!hit) return [];
  const [lines, trans] = await lyrics(hit.id);
  return mergeTranslation(lines, trans);
}

/**
 * Fetch QQ Music top search hits as cross-platform canonical authority anchors.
 * Returns [songAnchors, artistAnchors] (Maps): 'base_title|first_artist' -> best
 * rank (0-based), and 'first_artist' -> best rank.
 */
async function _qqAnchors(query) {
  const songAnchors = new Map();
  const artistAnchors = new Map();
  let data;
  try {
    data = await catalog.fetchJson(
      "https://c.y.qq.com/soso/fcgi-bin/client_search_cp?p=1&n=10&format=json&w=" + quote(query),
      catalog.QQ_HEADERS,
      10 * 60,
    );
  } catch {
    return [songAnchors, artistAnchors];
  }

  const intent = catalog.parseQueryIntent(query);
  const list = listOr(objOr(objOr(data.data).song).list);
  for (let rank = 0; rank < list.length; rank++) {
    const s = list[rank];
    const title = pyStrip(pyStr(s.songname));
    const singers = listOr(or(s.singer, []))
      .filter((x) => truthy(x.name))
      .map((x) => pyStrip(pyStr(x.name)));
    const album = pyStrip(pyStr(s.albumname));
    if (!title || !singers.length) continue;
    if (!intent.dj && catalog.HARD_NOISE_RE.test(title)) continue;
    if (!intent.cover && (catalog.COVER_NOISE_RE.test(title) || catalog.COVER_NOISE_RE.test(album))) continue;
    if (!intent.live && (catalog.LIVE_RE.test(title) || catalog.LIVE_RE.test(album))) continue;
    const bkey = catalog.baseTitleKey(title);
    const akey = searchKey(singers[0]);
    if (bkey && akey) {
      const sk = `${bkey}|${akey}`;
      if (!songAnchors.has(sk)) songAnchors.set(sk, rank);
      if (!artistAnchors.has(akey)) artistAnchors.set(akey, rank);
    }
  }
  return [songAnchors, artistAnchors];
}

/** Normalise catalog.searchScored output ([pairs, hasMore]) to arrays of [t, meta]. */
function _pairsResult(result) {
  const [pairs, more] = Array.isArray(result) ? result : [result.pairs, result.hasMore];
  return [(pairs || []).map((p) => (Array.isArray(p) ? p : [p.track, p.meta])), Boolean(more)];
}

/**
 * Search NetEase and Kuwo in parallel, anchor against QQ Music authority, and split into
 * a clean primary list plus a collapsible moreTracks list for alternate/long-tail versions.
 */
async function mergedSearch(query, page = 1) {
  const fNe = searchScored(query, page, 50);
  const fKw = catalog.searchScored(query, page, 50);
  const fQq = page === 1 ? _qqAnchors(query) : null;
  // Avoid unhandled rejections while awaiting in order.
  fNe.catch(() => {});
  fKw.catch(() => {});
  if (fQq) fQq.catch(() => {});
  const results = [];
  for (const [fut, name] of [
    [fNe, "netease"],
    [fKw, "kuwo"],
  ]) {
    try {
      results.push(_pairsResult(await fut));
    } catch (exc) {
      logger.info("%s search failed: %s", name, exc);
      results.push([[], false]);
    }
  }
  let qqSongAnchors = new Map();
  let qqArtistAnchors = new Map();
  if (fQq !== null) {
    try {
      [qqSongAnchors, qqArtistAnchors] = await fQq;
    } catch {
      // ignore
    }
  }
  const [[nePairs, neMore], [kwPairs, kwMore]] = results;

  const words = pySplit(query)
    .filter((w) => searchKey(w))
    .map((w) => searchKey(w));
  const qkey = searchKey(query);
  const intent = catalog.parseQueryIntent(query);
  const hasVersionIntent = Object.values(intent).some((v) => v);

  // Detect whether query primarily targets an artist (e.g. "周杰伦", "陈奕迅").
  const allPairs = [...nePairs, ...kwPairs];
  const exactTitleHits = allPairs.filter(([t, m]) => catalog.baseTitleKey(t.title) === qkey && !m.is_cover).length;
  const exactArtistHits = allPairs.filter(([t]) => searchKey(t.artist.split(" / ")[0]) === qkey).length;
  const artistMode = Boolean(qkey && words.length === 1 && exactArtistHits >= 4 && exactTitleHits <= 1);

  function score(t, meta, src) {
    const btitle = catalog.baseTitleKey(t.title);
    const fullTitle = searchKey(t.title);
    const artistParts = t.artist
      .split(" / ")
      .filter((a) => searchKey(a))
      .map((a) => searchKey(a));
    const firstArtist = artistParts.length ? artistParts[0] : "";
    const artistAll = artistParts.join("");
    const album = t.album || "";
    const albumKey = searchKey(album);
    const hay = fullTitle + artistAll + albumKey;
    if (words.length && !words.every((w) => hay.includes(w))) return null;

    const titleOrArtist = fullTitle + artistAll;
    if (words.length && !words.every((w) => titleOrArtist.includes(w))) return null;

    const pop = pyFloat(or(meta.pop, 0.0));
    const mv = pyInt(or(meta.mv, 0));
    const rank = pyInt(or(meta.rank, 0));
    const isCover = Boolean(meta.is_cover);
    const isInst = Boolean(meta.is_inst);
    const isLive = Boolean(meta.is_live);
    const covType = meta.coverType === undefined ? null : meta.coverType;

    // Cross-platform canonical anchor from QQ Music
    const anchorRank = qqSongAnchors.get(`${btitle}|${firstArtist}`);
    let isCanonical = false;
    let s = 0.0;
    if (anchorRank !== undefined && !isCover && !isLive && !isInst && covType !== 2) {
      if (anchorRank === 0 || (anchorRank <= 2 && ((src === "ne" && mv > 0) || (src === "ku" && pop >= 68)))) {
        isCanonical = true;
      }
      s += anchorRank === 0 ? 55.0 : anchorRank <= 2 ? 35.0 : 18.0;
    } else if (qqArtistAnchors.has(firstArtist) && artistMode && !isCover && !isLive) {
      s += 10.0;
    }

    let effPop = src === "ku" ? Math.min(100.0, pop * 1.18) : pop;
    if (isCover && !intent.cover) effPop = Math.min(effPop, 30.0);
    else if (src === "ne" && covType !== 1) effPop = Math.min(effPop, 55.0);
    s += effPop * 0.3 + 10.0 / (1.0 + rank * 0.22);

    let titleMatched = false;
    if (btitle === qkey || (words.length >= 2 && words.some((w) => btitle === w))) {
      s += 32.0;
      titleMatched = true;
    } else if (qkey && btitle.startsWith(qkey)) {
      s += 10.0;
      titleMatched = true;
    } else if (words.some((w) => btitle.includes(w))) {
      s += 6.0;
      titleMatched = true;
    } else if (!artistMode) {
      s -= 24.0;
    }

    if (firstArtist === qkey || (words.length >= 2 && words.some((w) => w === firstArtist))) {
      s += 24.0;
    } else if (words.some((w) => artistAll.includes(w))) {
      s += artistMode || titleMatched ? 10.0 : -14.0;
    }

    if (artistMode) {
      if (firstArtist === qkey && artistParts.length === 1) s += 16.0;
      else if (firstArtist === qkey) s += 4.0;
      else s -= 14.0;
    }

    const hasStudioAlbum = Boolean(album) && !catalog.COMPILATION_ALBUM_RE.test(album);
    if (covType === 1) {
      s += 12.0;
      if (mv > 0) {
        s += 14.0;
        isCanonical = isCanonical || btitle === qkey;
      }
    } else if (src === "ku" && !isCover && !isInst && !isLive && hasStudioAlbum && pop >= 65) {
      s += 13.0;
    } else if (covType === 2 && !intent.cover) {
      s -= 32.0;
    } else if (src === "ne" && (covType === 0 || covType === null)) {
      s -= 12.0;
    }

    if (isCover && !intent.cover) s -= 30.0;
    if (isInst && !intent.inst) s -= 24.0;
    if (isLive && !intent.live) s -= artistMode ? 20.0 : 16.0;

    if (hasStudioAlbum) s += 7.0;
    else if (album) s -= 6.0;
    else s -= 10.0;

    if (artistParts.length >= 3) s -= 10.0;
    if (t.title.includes("+") && !intent.dj) s -= 14.0;

    return [s, isCanonical];
  }

  const scored = [];
  for (const [src, pairs] of [
    ["ne", nePairs],
    ["kw", kwPairs],
  ]) {
    for (const [t, meta] of pairs) {
      const res = score(t, meta, src);
      if (res !== null) {
        const [sc, isCanonical] = res;
        scored.push({ sc, isNe: src === "ne", key: -pyRound(sc, 2), t, meta, src, isCanonical });
      }
    }
  }
  // sort(key=(-round(score, 2), not is_ne)); stable
  scored.sort((x, y) => {
    if (x.key !== y.key) return x.key < y.key ? -1 : 1;
    const nx = x.isNe ? 0 : 1;
    const ny = y.isNe ? 0 : 1;
    return nx - ny;
  });

  const deduped = [];
  const seenExact = new Set();
  const seenStudioArtist = new Set();
  const livePerSong = new Map();
  const coverPerTitle = new Map();
  const studioPerTitle = new Map();

  for (const { sc, t, meta, src, isCanonical } of scored) {
    const btitle = catalog.baseTitleKey(t.title);
    const artistParts = sortedStr(
      t.artist
        .split(" / ")
        .filter((a) => searchKey(a))
        .map((a) => searchKey(a)),
    );
    const firstArtist = searchKey(t.artist.split(" / ")[0]);
    const isLive = Boolean(meta.is_live);
    const isCover = Boolean(meta.is_cover);
    const isInst = Boolean(meta.is_inst);

    const exactKey = `${btitle}|${artistParts.join(",")}|${isLive ? "1" : "0"}`;
    if (seenExact.has(exactKey)) continue;
    seenExact.add(exactKey);

    const songArtistKey = `${btitle}|${firstArtist}`;
    if (!isLive && !isCover && !isInst) {
      if (seenStudioArtist.has(songArtistKey)) continue;
      seenStudioArtist.add(songArtistKey);
      studioPerTitle.set(btitle, (studioPerTitle.get(btitle) || 0) + 1);
    } else if (isLive && !intent.live) {
      if ((livePerSong.get(songArtistKey) || 0) >= 1) continue;
      livePerSong.set(songArtistKey, (livePerSong.get(songArtistKey) || 0) + 1);
    } else if ((isCover || isInst) && !(intent.cover || intent.inst)) {
      const cap = (studioPerTitle.get(btitle) || 0) > 0 ? 2 : 4;
      if ((coverPerTitle.get(btitle) || 0) >= cap) continue;
      coverPerTitle.set(btitle, (coverPerTitle.get(btitle) || 0) + 1);
    }

    deduped.push([sc, t, meta, src, isCanonical]);
  }

  // Split into clean primary tracks and collapsible moreTracks.
  const hasExactPrimary = deduped.some(
    ([, t, m, sSrc, isCan]) =>
      catalog.baseTitleKey(t.title) === qkey &&
      !m.is_cover &&
      !m.is_live &&
      !m.is_inst &&
      (isCan || (m.coverType === 1 && (m.mv === undefined ? 0 : m.mv) > 0) || (sSrc === "ku" && (m.pop === undefined ? 0 : m.pop) >= 65)),
  );

  let primary = [];
  let more = [];

  for (const [, t, meta, src, isCanonical] of deduped) {
    const btitle = catalog.baseTitleKey(t.title);
    const firstArtist = searchKey(t.artist.split(" / ")[0]);
    const isLive = Boolean(meta.is_live);
    const isCover = Boolean(meta.is_cover);
    const isInst = Boolean(meta.is_inst);
    const covType = meta.coverType === undefined ? null : meta.coverType;
    const mv = pyInt(or(meta.mv, 0));
    const pop = pyFloat(or(meta.pop, 0.0));
    const album = t.album || "";
    const hasStudioAlbum = Boolean(album) && !catalog.COMPILATION_ALBUM_RE.test(album);
    const exactTitle = btitle === qkey || (words.length >= 2 && words.some((w) => btitle === w));

    if (artistMode) {
      if (
        firstArtist === qkey &&
        !isLive &&
        !isCover &&
        !isInst &&
        (hasStudioAlbum || pop >= 65) &&
        primary.length < 30
      ) {
        primary.push(t);
      } else if (more.length < 25) {
        more.push(t);
      }
    } else if (hasVersionIntent) {
      if (primary.length < 20) primary.push(t);
      else if (more.length < 25) more.push(t);
    } else if (hasExactPrimary) {
      // Song-focused query: keep only authoritative/verified studio originals in primary!
      const isVerifiedOrig =
        !isLive &&
        !isCover &&
        !isInst &&
        exactTitle &&
        !t.title.includes("+") &&
        (isCanonical ||
          (covType === 1 && (mv > 0 || (hasStudioAlbum && pop >= 82))) ||
          (src === "ku" && hasStudioAlbum && pop >= 68));
      if (isVerifiedOrig && primary.length < 6) primary.push(t);
      else if (more.length < 25) more.push(t);
    } else {
      // Ambiguous / lyric / multi-word query without an obvious single canonical hit
      if (!isLive && !isCover && !isInst && primary.length < 15) primary.push(t);
      else if (more.length < 25) more.push(t);
    }
  }

  if (!primary.length && more.length) {
    primary = more.slice(0, 10);
    more = more.slice(10);
  }

  const allowMorePages = artistMode || (!hasExactPrimary && primary.length >= 15);
  return {
    tracks: primary,
    moreTracks: more,
    hasMore: Boolean(allowMorePages && (neMore || kwMore)),
  };
}

async function mergedArtists(query) {
  const browse = require("./browse");

  const qkey = searchKey(query);
  const qraw = _exactText(query);
  let candidates;
  try {
    candidates = await searchArtists(query, 8);
  } catch {
    candidates = [];
  }

  const picked = [];
  const seenKeys = new Set();
  for (const a of candidates) {
    const rank = _artistMatchRank(a, qkey, qraw);
    if (!rank) continue;
    const nkey = searchKey(a.name || "");
    if (!nkey || seenKeys.has(nkey)) continue;
    seenKeys.add(nkey);
    picked.push([rank, a]);
  }

  // Keep top verified artist, plus a second distinct-name real match (e.g. Tank & Tank吕建忠)
  // when the query itself is short/ambiguous, while avoiding impersonators.
  if (picked.length) {
    const [topRank, topArtist] = picked[0];
    const out = [topArtist];
    for (const [rank, artist] of picked.slice(1)) {
      if (out.length >= 2) break;
      if (
        rank[0] >= 4 &&
        (artist.mvSize === undefined ? 0 : artist.mvSize) > 0 &&
        searchKey(artist.name) !== searchKey(topArtist.name)
      ) {
        // Only include a second match for ASCII short names with a Chinese-suffixed disambiguation (e.g. Tank & Tank吕建忠).
        if (
          topRank[0] < 5 ||
          (/^[\x00-\x7f]*$/u.test(topArtist.name) &&
            searchKey(artist.name).startsWith(searchKey(topArtist.name)) &&
            CJK_RE.test(artist.name))
        ) {
          out.push(artist);
        }
      }
    }
    return out;
  }

  try {
    return (await browse.searchArtists(query)).map((a) => ({ ...a, source: "kuwo" }));
  } catch {
    return [];
  }
}

module.exports = {
  API,
  logger,
  FAN_NOISE_RE,
  LIVE_TITLE_RE,
  get HEADERS() {
    return catalog.NETEASE_HEADERS;
  },
  get NOISE() {
    return catalog.NOISE;
  },
  pyRound,
  _song,
  _fakeArtist,
  searchScored,
  search,
  _exactText,
  _artistMatchRank,
  searchArtists,
  _artistKeys,
  _songCatalogStats,
  _needsKuwoHotSongs,
  artistDetail,
  albumDetail,
  lookup,
  lyrics,
  mergeTranslation,
  lyricsByTitle,
  _qqAnchors,
  mergedSearch,
  mergedArtists,
};
