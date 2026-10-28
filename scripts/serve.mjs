import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const port = Number(process.env.PORT || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === "/" || url.pathname === "/halloween") {
      response.writeHead(302, { Location: "/halloween/" }).end();
      return;
    }
    if (!url.pathname.startsWith("/halloween/")) {
      response.writeHead(404).end("Not found");
      return;
    }
    const relative = decodeURIComponent(url.pathname.slice("/halloween/".length));
    let file = resolve(root, relative || "index.html");
    if (!file.startsWith(root + sep) || relative.split(/[\\/]/).some((part) => part.startsWith("."))) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    let info = await stat(file);
    if (info.isDirectory()) {
      if (!url.pathname.endsWith("/")) {
        response.writeHead(302, { Location: `${url.pathname}/${url.search}` }).end();
        return;
      }
      file = resolve(file, "index.html");
      info = await stat(file);
    }
    if (!info.isFile()) {
      response.writeHead(404).end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(await readFile(file));
  } catch (error) {
    if (error.code === "ENOENT") response.writeHead(404).end("Not found");
    else {
      console.error(error);
      response.writeHead(500).end("Server error");
    }
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`SAK 013: http://127.0.0.1:${port}/halloween/`);
});
