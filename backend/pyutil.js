"use strict";
// Python-compatible helpers shared by the ported modules.
// Heavy lifting is delegated to open-source libraries:
//   - entities   : html.unescape
//   - p-limit    : ThreadPoolExecutor / BoundedSemaphore equivalents
//   - seedrandom : random.Random(seed) equivalent (deterministic, not bit-identical)

const { decodeHTML } = require("entities");
const pLimit = require("p-limit");
const seedrandom = require("seedrandom");
const crypto = require("node:crypto");

/** html.unescape */
function htmlUnescape(value) {
  return decodeHTML(String(value ?? ""));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** time.monotonic() in seconds. */
function monotonic() {
  return Number(process.hrtime.bigint() / 1000000n) / 1000;
}

/** Run fn over items with at most `workers` in flight; preserves order (ThreadPoolExecutor.map). */
async function poolMap(items, workers, fn) {
  const limit = pLimit(Math.max(1, workers | 0));
  return Promise.all(Array.from(items, (item, i) => limit(() => fn(item, i))));
}

/** Like poolMap but a failing task yields `fallback` instead of rejecting. */
async function poolMapSettled(items, workers, fn, fallback = null) {
  return poolMap(items, workers, async (item, i) => {
    try {
      return await fn(item, i);
    } catch {
      return fallback;
    }
  });
}

/** Seeded RNG with the subset of Python's random.Random API the backend uses. */
class PyRandom {
  constructor(seed) {
    this._rng = seed === undefined ? Math.random : seedrandom(String(seed));
  }
  random() {
    return this._rng();
  }
  uniform(a, b) {
    return a + (b - a) * this._rng();
  }
  randint(a, b) {
    return a + Math.floor(this._rng() * (b - a + 1));
  }
  choice(arr) {
    if (!arr.length) throw new Error("Cannot choose from an empty sequence");
    return arr[Math.floor(this._rng() * arr.length)];
  }
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this._rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  sample(arr, k) {
    return this.shuffle([...arr]).slice(0, k);
  }
}

const globalRandom = new PyRandom();

function md5Hex(text) {
  return crypto.createHash("md5").update(String(text)).digest("hex");
}

function sha256Hex(text) {
  return crypto.createHash("sha256").update(String(text)).digest("hex");
}

/** Python int(float(str(value).strip())) with 0 fallback. */
function toInt(value) {
  const num = Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(num) ? Math.trunc(num) : 0;
}

/** URLSearchParams helper matching urllib.parse.urlencode for flat dicts. */
function urlencode(params) {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    usp.append(key, String(value));
  }
  return usp.toString();
}

/** urllib.parse.quote (safe='/'), percent-encodes like Python for UTF-8 text. */
function quote(value, safe = "/") {
  return Array.from(String(value ?? ""))
    .map((ch) => {
      if (/[A-Za-z0-9_.\-~]/.test(ch) || safe.includes(ch)) return ch;
      return encodeURIComponent(ch).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
    })
    .join("");
}

/** Simple TTL cache with the same "clear when full" policy as the Python dict caches. */
class TtlCache {
  constructor(maxEntries = 400) {
    this.maxEntries = maxEntries;
    this.map = new Map();
  }
  get(key) {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (hit.expires <= monotonic()) {
      this.map.delete(key);
      return undefined;
    }
    return hit.value;
  }
  has(key) {
    return this.get(key) !== undefined;
  }
  set(key, value, ttlSeconds) {
    if (this.map.size > this.maxEntries) this.map.clear();
    this.map.set(key, { value, expires: monotonic() + ttlSeconds });
    return value;
  }
  clear() {
    this.map.clear();
  }
}

/** Collapse concurrent identical async calls into one (cache stampede guard). */
function singleFlight() {
  const inflight = new Map();
  return (key, fn) => {
    if (inflight.has(key)) return inflight.get(key);
    const promise = Promise.resolve()
      .then(fn)
      .finally(() => inflight.delete(key));
    inflight.set(key, promise);
    return promise;
  };
}

/** Logger with the same shape as Python logging (info / warning / debug). */
function getLogger(name) {
  const fmt = (level, args) => {
    const [msg, ...rest] = args;
    let i = 0;
    const text = String(msg).replace(/%[sdr]/g, () => {
      const v = rest[i++];
      return v instanceof Error ? v.message : typeof v === "object" ? JSON.stringify(v) : String(v);
    });
    return `${new Date().toISOString()} [${level}] ${name}: ${text}`;
  };
  return {
    info: (...args) => console.log(fmt("INFO", args)),
    warning: (...args) => console.warn(fmt("WARNING", args)),
    warn: (...args) => console.warn(fmt("WARNING", args)),
    debug: (...args) => {
      if (process.env.ECHO_DEBUG) console.log(fmt("DEBUG", args));
    },
    error: (...args) => console.error(fmt("ERROR", args)),
  };
}

module.exports = {
  htmlUnescape,
  sleep,
  monotonic,
  poolMap,
  poolMapSettled,
  PyRandom,
  globalRandom,
  md5Hex,
  sha256Hex,
  toInt,
  urlencode,
  quote,
  TtlCache,
  singleFlight,
  getLogger,
};
