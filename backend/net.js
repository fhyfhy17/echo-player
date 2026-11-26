"use strict";
// HTTP client mirroring urllib.request.urlopen semantics used by the Python backend:
//  - follows redirects (up to 5)
//  - throws HttpError (with .code) for status >= 400
//  - enforces a byte limit on buffered bodies
//  - optional streaming mode for audio proxying (Range passthrough)

const http = require("node:http");
const https = require("node:https");
const zlib = require("node:zlib");

class HttpError extends Error {
  constructor(code, url, body = "") {
    super(`HTTP Error ${code}: ${url}`);
    this.name = "HttpError";
    this.code = code;
    this.url = url;
    this.body = body;
  }
}

class NetError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "NetError";
    this.cause = cause;
  }
}

const agents = {
  "http:": new http.Agent({ keepAlive: true, maxSockets: 16 }),
  "https:": new https.Agent({ keepAlive: true, maxSockets: 16 }),
};

function decodeStream(res) {
  const enc = String(res.headers["content-encoding"] || "").toLowerCase();
  if (enc === "gzip" || enc === "x-gzip") return res.pipe(zlib.createGunzip());
  if (enc === "deflate") return res.pipe(zlib.createInflate());
  if (enc === "br") return res.pipe(zlib.createBrotliDecompress());
  return res;
}

/**
 * Low level request. Resolves with the raw IncomingMessage (already redirected).
 * Caller must consume or destroy the response.
 */
function openRequest(url, { method = "GET", headers = {}, body, timeout = 8000, redirects = 5 } = {}) {
  return new Promise((resolve, reject) => {
    let target;
    try {
      target = new URL(url);
    } catch (err) {
      reject(new NetError(`Invalid URL: ${url}`, err));
      return;
    }
    const lib = target.protocol === "https:" ? https : target.protocol === "http:" ? http : null;
    if (!lib) {
      reject(new NetError(`Unsupported protocol: ${target.protocol}`));
      return;
    }
    const payload = body == null ? null : Buffer.isBuffer(body) ? body : Buffer.from(String(body));
    const reqHeaders = { ...headers };
    if (payload && reqHeaders["Content-Length"] == null && reqHeaders["content-length"] == null) {
      reqHeaders["Content-Length"] = String(payload.length);
    }
    const req = lib.request(
      target,
      { method, headers: reqHeaders, agent: agents[target.protocol] },
      (res) => {
        const status = res.statusCode || 0;
        if ([301, 302, 303, 307, 308].includes(status) && res.headers.location && redirects > 0) {
          res.resume();
          const next = new URL(res.headers.location, target).toString();
          const nextMethod = status === 303 || ((status === 301 || status === 302) && method === "POST") ? "GET" : method;
          const nextBody = nextMethod === "GET" ? undefined : body;
          openRequest(next, { method: nextMethod, headers, body: nextBody, timeout, redirects: redirects - 1 })
            .then(resolve, reject);
          return;
        }
        res.finalUrl = target.toString();
        resolve(res);
      },
    );
    req.setTimeout(timeout, () => req.destroy(new NetError(`timed out: ${url}`)));
    req.on("error", (err) => reject(err instanceof NetError ? err : new NetError(err.message, err)));
    if (payload) req.write(payload);
    req.end();
  });
}

/**
 * Buffered request. Returns { status, headers, url, buffer, text() , json() }.
 * Throws HttpError for status >= 400 unless allowErrors is set.
 */
async function httpRequest(url, opts = {}) {
  const { maxBytes = 4 * 1024 * 1024, allowErrors = false, timeout = 8000 } = opts;
  const res = await openRequest(url, opts);
  const stream = decodeStream(res);
  const chunks = [];
  let size = 0;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      stream.destroy(new NetError(`read timed out: ${url}`));
    }, Math.max(timeout * 2, 10000));
    stream.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        stream.destroy(new NetError("Upstream response too large"));
        return;
      }
      chunks.push(chunk);
    });
    stream.on("end", () => {
      clearTimeout(timer);
      resolve();
    });
    stream.on("error", (err) => {
      clearTimeout(timer);
      res.destroy();
      reject(err instanceof NetError ? err : new NetError(err.message, err));
    });
  });
  const buffer = Buffer.concat(chunks);
  const status = res.statusCode || 0;
  const out = {
    status,
    headers: res.headers,
    url: res.finalUrl,
    buffer,
    text: () => buffer.toString("utf8"),
    json: () => JSON.parse(buffer.toString("utf8")),
  };
  if (status >= 400 && !allowErrors) throw new HttpError(status, url, buffer.toString("utf8").slice(0, 500));
  return out;
}

/** Streaming request: resolves with IncomingMessage; throws HttpError for >= 400. */
async function httpStream(url, opts = {}) {
  const res = await openRequest(url, opts);
  const status = res.statusCode || 0;
  if (status >= 400) {
    res.resume();
    throw new HttpError(status, url);
  }
  return res;
}

module.exports = { HttpError, NetError, openRequest, httpRequest, httpStream };
