/**
 * Quick uniqueness check for makeId() — run: npm run test:makeId
 */
const seen = new Set();
const n = 5000;
for (let i = 0; i < n; i++) {
  const t = Date.now();
  let suf = "";
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    suf = crypto.randomUUID();
  } else {
    suf = `${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 12)}`;
  }
  const id = `${t}_${suf}`;
  if (seen.has(id)) {
    console.error("Collision:", id);
    process.exit(1);
  }
  seen.add(id);
}
console.log(`makeId sanity: ${n} ids, ${seen.size} unique — ok`);
