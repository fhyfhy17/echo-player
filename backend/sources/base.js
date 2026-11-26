"use strict";
// Port of sources/base.py: shared text normalisation and upstream helpers.

const { TRAD, SIMP } = require("./zh_table");
const { httpRequest } = require("../net");

const MEDIA_LIMIT = 2 * 1024 * 1024;

// str.maketrans works on code points; Array.from keeps astral characters aligned.
const ZH_MAP = new Map();
{
  const t = Array.from(TRAD);
  const s = Array.from(SIMP);
  if (t.length !== s.length) throw new Error("zh_table length mismatch");
  for (let i = 0; i < t.length; i++) ZH_MAP.set(t[i], s[i]);
}

/** Equivalent of `str.translate(ZH_FOLD)`. */
function zhFold(value) {
  let out = "";
  for (const ch of String(value ?? "")) out += ZH_MAP.get(ch) ?? ch;
  return out;
}

/** Approximation of Python str.casefold(). */
function casefold(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/ς/g, "σ");
}

const ALNUM = /[\p{L}\p{N}]/u;
const keyCache = new Map();

/** Normalize text (NFKC, casefold, Trad/JP->Simp CJK) for consistent matching. */
function searchKey(value) {
  if (!value) return "";
  const raw = String(value);
  const hit = keyCache.get(raw);
  if (hit !== undefined) return hit;
  const normalized = zhFold(casefold(raw.normalize("NFKC")));
  let out = "";
  for (const ch of normalized) if (ALNUM.test(ch)) out += ch;
  if (keyCache.size > 20000) keyCache.clear();
  keyCache.set(raw, out);
  return out;
}

/** Safely fetch and parse upstream JSON within size limits. Returns an object. */
async function upstreamJson(url, { headers = {}, timeout = 8000, method = "GET", body } = {}) {
  const res = await httpRequest(url, { headers, timeout, method, body, maxBytes: MEDIA_LIMIT });
  const result = JSON.parse(res.text());
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new Error("Unexpected upstream response structure");
  }
  return result;
}

/** Base class for music source plugins (sources/base.py BaseSource). */
class BaseSource {
  constructor() {
    this.id = "base";
    this.name = "Base Source";
    this.enabled = true;
    this.priority = 100;
    this.supportsPaging = false;
  }

  // eslint-disable-next-line no-unused-vars
  async search(query, limit = 25, opts = {}) {
    throw new Error("not implemented");
  }

  // eslint-disable-next-line no-unused-vars
  async getMediaUrl(trackId, quality = "standard") {
    throw new Error("not implemented");
  }

  // eslint-disable-next-line no-unused-vars
  async getLyric(trackId) {
    return null;
  }
}

module.exports = { MEDIA_LIMIT, zhFold, casefold, searchKey, upstreamJson, BaseSource };
