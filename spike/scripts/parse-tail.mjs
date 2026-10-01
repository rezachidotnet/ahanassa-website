import fs from "node:fs";
export function parseTail(file) {
  const t = fs.readFileSync(file, "utf8");
  const objs = []; let depth = 0, start = -1, inStr = false, esc = false;
  for (let i = 0; i < t.length; i++) { const c = t[i];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === "\"") inStr = false; continue; }
    if (c === "\"") { inStr = true; continue; }
    if (c === "{") { if (depth === 0) start = i; depth++; } else if (c === "}") { depth--; if (depth === 0) { try { objs.push(JSON.parse(t.slice(start, i + 1))); } catch {} } } }
  return objs;
}
