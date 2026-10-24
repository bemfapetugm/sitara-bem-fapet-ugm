/**
 * SITARA Local API Proxy
 * Untuk pengembangan lokal saja. Tidak untuk deployment produksi.
 * Memerlukan Node.js 18+ (fetch bawaan).
 */
const http = require("http");

const HOST = "127.0.0.1";
const PORT = 3000;
const ALLOWED_ORIGIN = "http://127.0.0.1:5500";
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || "";

  // CORS hanya mengizinkan Live Server lokal yang ditentukan.
  if (origin === ALLOWED_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify({
      success: true,
      message: "SITARA local proxy aktif",
      upstream: "Google Apps Script"
    }));
  }

  if (url.pathname !== "/api/exec" || req.method !== "POST") {
    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify({
      success: false,
      message: "Endpoint tidak ditemukan. Gunakan POST /api/exec."
    }));
  }

  if (origin && origin !== ALLOWED_ORIGIN) {
    res.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify({
      success: false,
      message: "Origin tidak diizinkan oleh proxy lokal."
    }));
  }

  let body = "";
  req.setEncoding("utf8");
  req.on("data", chunk => {
    body += chunk;
    if (body.length > 1024 * 1024) {
      req.destroy();
    }
  });

  req.on("end", async () => {
    try {
      // Validasi bahwa body adalah JSON, tanpa mengubah payload login.
      JSON.parse(body || "{}");

      const upstream = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body,
        redirect: "follow"
      });

      const responseText = await upstream.text();
      res.writeHead(upstream.status, {
        "Content-Type": upstream.headers.get("content-type") || "text/plain; charset=utf-8"
      });
      res.end(responseText);
    } catch (error) {
      console.error("Proxy error:", error);
      if (!res.headersSent) {
        res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
      }
      res.end(JSON.stringify({
        success: false,
        message: "Server perantara gagal menghubungi Google Apps Script.",
        detail: String(error && error.message ? error.message : error)
      }));
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`SITARA proxy aktif: http://${HOST}:${PORT}`);
  console.log(`Health check: http://${HOST}:${PORT}/health`);
  console.log(`Frontend yang diizinkan: ${ALLOWED_ORIGIN}`);
});
