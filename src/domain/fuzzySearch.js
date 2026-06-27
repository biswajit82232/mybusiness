/**
 * Fuzzy search helpers (Fuse.js) for global search.
 */
import Fuse from "fuse.js";

const DEFAULT_OPTS = {
  threshold: 0.42,
  ignoreLocation: true,
  minMatchCharLength: 1,
};

/**
 * @template T
 * @param {T[]} items
 * @param {import('fuse.js').FuseOptionKey<T>[]} keys
 * @param {string} query
 * @param {number} [limit]
 */
export function fuseFilter(items, keys, query, limit = 40) {
  const q = String(query || "").trim();
  if (!q || !Array.isArray(items) || !items.length) return [];
  const fuse = new Fuse(items, { ...DEFAULT_OPTS, keys });
  return fuse.search(q, { limit }).map((r) => r.item);
}
