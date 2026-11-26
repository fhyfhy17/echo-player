"use strict";
// Port of sources/manager.py: plugin manager for discovering, configuring, and querying music sources.
// Python auto-discovers BaseSource subclasses via importlib; here the plugin modules are listed
// explicitly (same set the Python glob finds) and every exported BaseSource subclass is registered.

const { getLogger } = require("../pyutil");
const { BaseSource } = require("./base");

const logger = getLogger("echo.sources");

// Python iterates Path.glob("*.py") (directory order) and inspect.getmembers (alphabetical);
// registration order only affects ties in priority sorting, which do not occur.
const PLUGIN_MODULES = ["kuwo", "netease", "public_catalog", "qq"];

class TimeoutError extends Error {
  constructor() {
    super("");
    this.name = "TimeoutError";
  }
}

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new TimeoutError()), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

class SourceManager {
  constructor() {
    this._sources = new Map();
    this.loadSources();
  }

  /** Register a source plugin instance. */
  register(source) {
    this._sources.set(source.id, source);
  }

  /** Instantiate the source classes exported by each plugin module. */
  loadSources() {
    for (const moduleName of PLUGIN_MODULES) {
      try {
        const mod = require(`./${moduleName}`);
        const classes = Object.entries(mod)
          .filter(([, obj]) => typeof obj === "function" && obj.prototype instanceof BaseSource)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
        for (const [, Cls] of classes) this.register(new Cls());
      } catch (e) {
        logger.warning("Failed to load source plugin %s: %s", moduleName, e);
      }
    }
  }

  getSource(sourceId) {
    return this._sources.get(sourceId) ?? null;
  }

  /** Return metadata for all registered sources sorted by priority. */
  listSources() {
    const sources = [...this._sources.values()].sort((a, b) => a.priority - b.priority);
    return sources.map((s) => ({
      id: s.id,
      name: s.name,
      enabled: s.enabled,
      priority: s.priority,
    }));
  }

  /** Concurrently search across enabled sources and aggregate results. */
  async searchAll(query, { sourceIds = null, limitPerSource = 100, timeout = 8000, page = 1 } = {}) {
    let targets;
    if (sourceIds && sourceIds.length) {
      targets = sourceIds
        .filter((sid) => this._sources.has(sid) && this._sources.get(sid).enabled)
        .map((sid) => this._sources.get(sid));
    } else {
      targets = [...this._sources.values()].filter((s) => s.enabled && s.id === "kuwo");
    }

    if (page > 1) targets = targets.filter((s) => s.supportsPaging || false);
    targets.sort((a, b) => a.priority - b.priority);
    if (!targets.length) return [];

    // Python builds a dict keyed by future: duplicate source ids still yield one future each.
    const futures = targets.map((s) => [
      s,
      Promise.resolve().then(() => (page > 1 ? s.search(query, limitPerSource, { page }) : s.search(query, limitPerSource))),
    ]);
    const aggregated = [];
    // Collect results in priority order
    for (const [source, future] of futures) {
      try {
        const results = await withTimeout(future, timeout);
        if (Array.isArray(results)) aggregated.push(...results);
      } catch (e) {
        logger.warning("Search failed for source %s: %s", source.id, e);
      }
    }
    return aggregated;
  }

  async getMediaUrl(sourceId, trackId, quality = "standard") {
    const source = this.getSource(sourceId);
    if (source && source.enabled) {
      try {
        return await source.getMediaUrl(trackId, quality);
      } catch (e) {
        logger.warning("Failed to resolve media for %s on %s: %s", trackId, sourceId, e);
      }
    }
    return null;
  }

  async getLyric(sourceId, trackId) {
    const source = this.getSource(sourceId);
    if (source && source.enabled) {
      try {
        return await source.getLyric(trackId);
      } catch {
        return null;
      }
    }
    return null;
  }
}

// Global singleton manager instance
const manager = new SourceManager();

module.exports = { SourceManager, manager };
