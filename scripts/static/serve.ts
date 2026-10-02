/**
 * Minimal static server for public-assets/ with Workers Static Assets
 * semantics that matter for tests (html_handling "auto-trailing-slash",
 * not_found_handling "404-page"): /x -> x.html or x/index.html; unknown ->
 * nearest 404.html with status 404. Query strings are ignored, like the
 * real asset router. Test/CI tooling only.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".txt": "text/plain", ".xml": "application/xml", ".webp": "image/webp", ".ico": "image/x-icon" };

export function resolveAsset(root: string, urlPath: string): { file: string; status: number } {
  const clean = decodeURIComponent(urlPath.split("?")[0]).replace(/\/+$/, "") || "/";
  const candidates = clean === "/" ? ["index.html"] : [clean.slice(1), `${clean.slice(1)}.html`, `${clean.slice(1)}/index.html`];
  for (const c of candidates) {
    const f = path.join(root, c);
    if (f.startsWith(root) && fs.existsSync(f) && fs.statSync(f).isFile()) return { file: f, status: 200 };
  }
  let dir = path.dirname(path.join(root, clean.slice(1)));
  while (dir.startsWith(root)) {
    const nf = path.join(dir, "404.html");
    if (fs.existsSync(nf)) return { file: nf, status: 404 };
    dir = path.dirname(dir);
  }
  return { file: "", status: 404 };
}

export function startStaticServer(root: string, port = 0): Promise<{ url: string; close: () => void }> {
  const absRoot = path.resolve(root);
  const server = http.createServer((req, res) => {
    const { file, status } = resolveAsset(absRoot, req.url ?? "/");
    if (!file) {
      res.writeHead(404).end("Not Found");
      return;
    }
    res.writeHead(status, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve({ url: `http://127.0.0.1:${(server.address() as { port: number }).port}`, close: () => server.close() })));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = process.argv[2] ?? ".artifact/public-assets";
  const { url } = await startStaticServer(root, Number(process.argv[3] ?? 8799));
  console.log(`serving ${root} at ${url}`);
}
